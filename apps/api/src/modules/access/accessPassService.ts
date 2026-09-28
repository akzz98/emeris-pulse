import jwt from "jsonwebtoken";
import { HttpError } from "../../http/httpError.js";
import { getMyMembership } from "../memberships/membershipService.js";
import { UserRepository } from "../users/userRepository.js";
import type { AccessLogQuery, RedeemPassInput, TemporaryPassInput } from "./accessPassSchemas.js";
import { AccessEventRepository } from "./accessEventRepository.js";
import { AccessPassRepository, newPassId } from "./accessPassRepository.js";

const passes = new AccessPassRepository();
const events = new AccessEventRepository();
const users = new UserRepository();

// The member's own QR expires quickly because it stays on their phone.
const passTtlSeconds = 60;
// A desk pass lasts long enough to reach the door after a lost phone, and it is still single-use.
const temporaryPassTtlSeconds = 15 * 60;

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 16) {
    throw new HttpError(503, "AUTH_NOT_CONFIGURED", "JWT secret is not configured.");
  }
  return value;
}

export async function issueStandardPass(userId: number) {
  const membership = await getMyMembership(userId);
  if (!membership.canEnter) {
    throw new HttpError(
      403,
      "MEMBERSHIP_INACTIVE",
      "Your membership must be active before a pass can be issued.",
    );
  }

  const jti = newPassId();
  const expiresAt = new Date(Date.now() + passTtlSeconds * 1000);
  await passes.insert(userId, jti, expiresAt, "Standard");

  // Same signed pass for students and staff. The jti is stored so a later scan can reject a replay.
  const token = jwt.sign(
    { sub: String(userId), purpose: "access", kind: "Standard" },
    secret(),
    { expiresIn: passTtlSeconds, jwtid: jti },
  );

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    expiresIn: passTtlSeconds,
    kind: "Standard" as const,
  };
}

function readPassToken(token: string): { userId: number; jti: string } {
  try {
    const payload = jwt.verify(token, secret());
    if (
      typeof payload === "string" ||
      payload.purpose !== "access" ||
      typeof payload.jti !== "string" ||
      typeof payload.sub !== "string"
    ) {
      throw new HttpError(401, "PASS_INVALID", "This pass is not valid.");
    }
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId)) {
      throw new HttpError(401, "PASS_INVALID", "This pass is not valid.");
    }
    return { userId, jti: payload.jti };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new HttpError(401, "PASS_EXPIRED", "This pass has expired.");
    }
    throw new HttpError(401, "PASS_INVALID", "This pass is not valid.");
  }
}

export async function redeemPass(input: RedeemPassInput) {
  const claim = readPassToken(input.token);
  // Pending, frozen, and expired memberships cannot enter, even with a signed code that has not been used.
  const membership = await getMyMembership(claim.userId);
  if (!membership.canEnter) {
    const pass = await passes.findByJti(claim.jti);
    await events.insert({
      userId: claim.userId,
      passId: pass?.id ?? null,
      result: "Refused",
      reason: "Membership is not active.",
    });
    throw new HttpError(403, "ENTRY_REFUSED", "Entry is refused because this membership is not active.");
  }

  const passId = await passes.consumeOnce(claim.jti, claim.userId);
  if (passId) {
    // Granted and refused scans are both stored so the access log has a row for this door check.
    await events.insert({ userId: claim.userId, passId, result: "Granted", reason: null });
    return { result: "Granted" as const };
  }

  const existing = await passes.findByJti(claim.jti);
  if (existing?.usedAt && existing.userId === claim.userId) {
    await events.insert({
      userId: claim.userId,
      passId: existing.id,
      result: "Refused",
      reason: "Pass already used.",
    });
    throw new HttpError(409, "PASS_ALREADY_USED", "This pass has already been used.");
  }
  throw new HttpError(401, "PASS_INVALID", "This pass is not valid.");
}

// Lost phone does not bypass a frozen or pending membership. The desk still needs canEnter.
export async function issueTemporaryPass(input: TemporaryPassInput) {
  const user = await users.findByEmail(input.email.toLowerCase());
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "No member was found with that email.");
  }
  const membership = await getMyMembership(user.id);
  if (!membership.canEnter) {
    throw new HttpError(
      403,
      "MEMBERSHIP_INACTIVE",
      "A temporary pass can only be issued for an active membership.",
    );
  }

  const jti = newPassId();
  const expiresAt = new Date(Date.now() + temporaryPassTtlSeconds * 1000);
  await passes.insert(user.id, jti, expiresAt, "Temporary");
  const token = jwt.sign(
    { sub: String(user.id), purpose: "access", kind: "Temporary" },
    secret(),
    { expiresIn: temporaryPassTtlSeconds, jwtid: jti },
  );

  return {
    token,
    expiresAt: expiresAt.toISOString(),
    expiresIn: temporaryPassTtlSeconds,
    kind: "Temporary" as const,
    member: { firstName: user.firstName, lastName: user.lastName, email: user.email },
  };
}

// Peak hours are the campus hours with the most granted visits. A tie keeps every matching hour.
export async function getUtilisation() {
  const usage = await events.utilisation();
  const busiest = Math.max(...usage.hours.map((hour) => hour.visits));
  return {
    visitsToday: usage.visitsToday,
    visitsThisWeek: usage.visitsThisWeek,
    peakHours: busiest === 0 ? [] : usage.hours.filter((hour) => hour.visits === busiest).map((hour) => hour.hour),
    hours: usage.hours.filter((hour) => hour.visits > 0),
  };
}

// A typical campus visit. After this, the member is no longer counted as on the floor.
const occupancyWindowMinutes = 90;

export async function getOccupancy() {
  const members = await events.occupants(occupancyWindowMinutes);
  return { windowMinutes: occupancyWindowMinutes, onFloor: members.length, members };
}

export async function listAccessLog(query: AccessLogQuery) {
  const page = await events.page(query.page, query.pageSize);
  return { page: query.page, pageSize: query.pageSize, ...page };
}
