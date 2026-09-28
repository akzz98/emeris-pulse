import sql from "mssql";
import { getPool, isUniqueViolation } from "../../db/pool.js";
import { HttpError } from "../../http/httpError.js";
import { getMyMembership } from "../memberships/membershipService.js";
import { WellnessRepository } from "./wellnessRepository.js";

const wellness = new WellnessRepository();

async function requireActiveMember(userId: number): Promise<void> {
  const membership = await getMyMembership(userId);
  if (!membership.canEnter) {
    throw new HttpError(403, "MEMBERSHIP_INACTIVE", "An active membership is required to join a challenge.");
  }
}

export async function listChallenges(userId: number) {
  return { challenges: await wellness.listOpen(userId) };
}

// A member can join once, and only while the challenge dates include today.
export async function joinChallenge(userId: number, challengeId: number) {
  await requireActiveMember(userId);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const challenge = await wellness.lockChallenge(transaction, challengeId);
    if (!challenge) {
      throw new HttpError(404, "CHALLENGE_NOT_FOUND", "That challenge does not exist.");
    }
    if (!challenge.openNow) {
      throw new HttpError(409, "CHALLENGE_CLOSED", "This challenge is not open.");
    }
    if (await wellness.alreadyJoined(transaction, challengeId, userId)) {
      throw new HttpError(409, "ALREADY_JOINED", "You have already joined this challenge.");
    }
    await wellness.insertEnrolment(transaction, challengeId, userId);
    await transaction.commit();
    return { challengeId, title: challenge.title, joined: true };
  } catch (error) {
    await transaction.rollback();
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "ALREADY_JOINED", "You have already joined this challenge.");
    }
    throw error;
  }
}
