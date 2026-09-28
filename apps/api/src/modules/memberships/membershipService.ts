import { todayLocal } from "../../domain/dates.js";
import { Membership } from "../../domain/membership.js";
import { HttpError } from "../../http/httpError.js";
import { presentMembership } from "../auth/authService.js";
import { MembershipRepository } from "./membershipRepository.js";

const memberships = new MembershipRepository();

async function loadCurrent(userId: number) {
  const record = await memberships.findByUserId(userId);
  if (!record) {
    throw new HttpError(404, "MEMBERSHIP_NOT_FOUND", "No membership exists for this account.");
  }
  const today = todayLocal();
  const current = new Membership(record.status, record.memberType, record.expiryDate);
  const status = current.expireIfLapsed(today);
  if (status !== record.status) {
    await memberships.updateStatus(userId, status);
    record.status = status;
  }
  return { record, today };
}

export async function listPendingMemberships() {
  const records = await memberships.listPending();
  const today = todayLocal();
  return records.map((record) => ({
    ...presentMembership(record, today),
    email: record.email,
    campusIdentifier: record.campusIdentifier,
    firstName: record.firstName,
    lastName: record.lastName,
  }));
}

export async function getMyMembership(userId: number) {
  const { record, today } = await loadCurrent(userId);
  return presentMembership(record, today);
}

export async function activateMembership(userId: number) {
  const { record, today } = await loadCurrent(userId);
  const status = new Membership(record.status, record.memberType, record.expiryDate).activate(today);
  await memberships.updateStatus(userId, status);
  return presentMembership({ ...record, status }, today);
}

export async function freezeMembership(userId: number) {
  const { record, today } = await loadCurrent(userId);
  const status = new Membership(record.status, record.memberType, record.expiryDate).freeze();
  await memberships.updateStatus(userId, status);
  return presentMembership({ ...record, status }, today);
}
