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

export async function register(input: RegisterInput) {
  const today = todayLocal();
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await users.insert(
      {
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
        campusIdentifier: input.campusIdentifier.trim(),
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
      throw new HttpError(
        409,
        "ALREADY_REGISTERED",
        "That email or campus identifier is already registered.",
      );
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

