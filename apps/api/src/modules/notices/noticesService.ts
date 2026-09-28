import { HttpError } from "../../http/httpError.js";
import type { BroadcastInput, ClosureInput } from "./noticesSchemas.js";
import { NoticesRepository } from "./noticesRepository.js";

const notices = new NoticesRepository();

export async function listMyNotices(userId: number) {
  return { notices: await notices.listForUser(userId) };
}

function realDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dayLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function closureBody(input: ClosureInput): string {
  const when =
    input.startsOn === input.endsOn
      ? `on ${dayLabel(input.startsOn)}`
      : `from ${dayLabel(input.startsOn)} to ${dayLabel(input.endsOn)}`;
  return `The gym is closed ${when}. ${input.reason}`;
}

// Only members with a class on a closed day are told. Everyone else is a broadcast, which is a separate action.
export async function announceClosure(input: ClosureInput) {
  if (!realDate(input.startsOn) || !realDate(input.endsOn)) {
    throw new HttpError(400, "CLOSURE_DATES", "Enter a real start date and end date.");
  }
  if (input.endsOn < input.startsOn) {
    throw new HttpError(400, "CLOSURE_DATES", "The end date must be on or after the start date.");
  }
  const notified = await notices.notifyClassMembers(input.startsOn, input.endsOn, "Gym closure", closureBody(input));
  return { notified };
}

// Every account in the chosen roles is told, including an inactive membership. Other roles are left out.
export async function broadcastNotice(input: BroadcastInput) {
  const roles = [...new Set(input.roles)];
  const notified = await notices.notifyRoles(roles, input.title, input.message);
  return { notified };
}
