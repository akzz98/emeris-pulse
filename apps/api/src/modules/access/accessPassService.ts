import jwt from "jsonwebtoken";
import { HttpError } from "../../http/httpError.js";
import { getMyMembership } from "../memberships/membershipService.js";
import type { RedeemPassInput } from "./accessPassSchemas.js";
import { AccessEventRepository } from "./accessEventRepository.js";
import { AccessPassRepository, newPassId } from "./accessPassRepository.js";

const passes = new AccessPassRepository();
const events = new AccessEventRepository();

// Short enough that a screenshot of the code cannot be reused later in the day.
const passTtlSeconds = 60;

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
  await passes.insert(userId, jti, expiresAt);

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
