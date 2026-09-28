import jwt from "jsonwebtoken";
import { HttpError } from "../../http/httpError.js";
import { getMyMembership } from "../memberships/membershipService.js";
import { AccessPassRepository, newPassId } from "./accessPassRepository.js";

const passes = new AccessPassRepository();

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
