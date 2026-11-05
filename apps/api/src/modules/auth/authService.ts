import bcrypt from "bcrypt";
import sql from "mssql";
import { addDays, todayLocal } from "../../domain/dates.js";
import { Membership } from "../../domain/membership.js";
import { getPool, isUniqueViolation } from "../../db/pool.js";
import { signAccessToken } from "../../http/authenticate.js";
import { HttpError } from "../../http/httpError.js";
import {
  MembershipRepository,
  type MembershipRecord,
} from "../memberships/membershipRepository.js";
import { UserRepository, type UserRecord } from "../users/userRepository.js";
import {
  hashRefreshToken,
  newRefreshToken,
  RefreshTokenRepository,
} from "./refreshTokenRepository.js";
import type { LoginInput, RefreshInput, RegisterInput } from "./authSchemas.js";

const users = new UserRepository();
const memberships = new MembershipRepository();
const refreshTokens = new RefreshTokenRepository();

// A session is a 15-minute access JWT plus a refresh token. Only the hash of the refresh token is stored.
// Presenting that token revokes the row and issues a new pair, so a stolen copy cannot be reused after a refresh.


function publicUser(user: UserRecord) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    campusIdentifier: user.campusIdentifier,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
  };
}

export function presentMembership(record: MembershipRecord, today = todayLocal()) {
  const membership = new Membership(record.status, record.memberType, record.expiryDate);
  return {
    id: record.id,
    userId: record.userId,
    status: record.status,
    memberType: record.memberType,
    startDate: record.startDate,
    expiryDate: record.expiryDate,
    termDays: Membership.termDays(record.memberType),
    canEnter: membership.canEnter(today),
  };
}

async function issueSession(user: UserRecord) {
  const refreshToken = newRefreshToken();
  await refreshTokens.insert(user.id, hashRefreshToken(refreshToken));
  const membership = await memberships.findByUserId(user.id);
  return {
    accessToken: signAccessToken({ id: user.id, role: user.role, email: user.email }),
    refreshToken,
    expiresIn: 15 * 60,
    user: publicUser(user),
    membership: membership ? presentMembership(membership) : null,
  };
}

function alreadyRegistered(fieldErrors: Record<string, string[]>): HttpError {
  const message = fieldErrors.email?.[0] ?? fieldErrors.campusIdentifier?.[0] ?? "That account is already registered.";
  return new HttpError(409, "ALREADY_REGISTERED", message, { fieldErrors });
}

// SQL Server names the unique index in the error. That tells the form which of the two fields collided.
function duplicateField(error: unknown): "email" | "campusIdentifier" | null {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("UQ_Users_Email")) {
    return "email";
  }
  if (message.includes("UQ_Users_CampusIdentifier")) {
    return "campusIdentifier";
  }
  return null;
}

export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const campusIdentifier = input.campusIdentifier.trim();
  const fieldErrors: Record<string, string[]> = {};
  if (await users.findByEmail(email)) {
    fieldErrors.email = ["That email is already registered."];
  }
  if (await users.findByCampusIdentifier(campusIdentifier)) {
    fieldErrors.campusIdentifier = ["That campus identifier is already registered."];
  }
  if (Object.keys(fieldErrors).length > 0) {
    throw alreadyRegistered(fieldErrors);
  }

  const today = todayLocal();
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await users.insert(
      {
        email,
        passwordHash,
        role: input.role,
        campusIdentifier,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
      },
      tx,
    );
    await memberships.insert(
      {
        userId: user.id,
        memberType: input.role,
        status: "Pending",
        startDate: today,
        expiryDate: addDays(today, Membership.termDays(input.role)),
      },
      tx,
    );
    await tx.commit();
    return issueSession(user);
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    if (isUniqueViolation(error)) {
      const field = duplicateField(error);
      if (field === "email") {
        throw alreadyRegistered({ email: ["That email is already registered."] });
      }
      if (field === "campusIdentifier") {
        throw alreadyRegistered({ campusIdentifier: ["That campus identifier is already registered."] });
      }
      throw alreadyRegistered({
        email: ["That email is already registered."],
        campusIdentifier: ["That campus identifier is already registered."],
      });
    }
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await users.findByEmail(input.email.toLowerCase());
  const matches = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !matches) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }
  return issueSession(user);
}

export async function refresh(input: RefreshInput) {
  const existing = await refreshTokens.findActive(hashRefreshToken(input.refreshToken));
  if (!existing) {
    throw new HttpError(401, "UNAUTHENTICATED", "Sign in is required.");
  }
  const user = await users.findById(existing.userId);
  if (!user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Sign in is required.");
  }
  await refreshTokens.revoke(existing.id);
  return issueSession(user);
}

// Sign-out drops the refresh token for this browser. The access JWT expires on its own within 15 minutes.
export async function logout(input: RefreshInput) {
  const existing = await refreshTokens.findActive(hashRefreshToken(input.refreshToken));
  if (existing) {
    await refreshTokens.revoke(existing.id);
  }
}

