import { participationStreak } from "../../domain/streak.js";
import { MembershipRepository } from "../memberships/membershipRepository.js";
import { ActivityRepository, type ActivityCounts, type RecentActivity } from "./activityRepository.js";

const activity = new ActivityRepository();
const memberships = new MembershipRepository();

export type WorkdayPrompt = {
  kind: "class" | "challenge";
  title: string;
  message: string;
};

export type ActivitySummary = ActivityCounts & {
  streak: number;
  recent: RecentActivity[];
  prompts: WorkdayPrompt[];
};

function formatClassWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Staff memberships get class and challenge suggestions that fit a working day. Students do not.
async function workdayPrompts(userId: number, visits: number): Promise<WorkdayPrompt[]> {
  const membership = await memberships.findByUserId(userId);
  if (!membership || membership.memberType !== "Staff") {
    return [];
  }
  const [classes, challenges] = await Promise.all([
    activity.upcomingWorkdayClasses(userId),
    activity.openChallenges(userId),
  ]);
  const prompts: WorkdayPrompt[] = classes.map((item) => ({
    kind: "class",
    title: item.title,
    message: item.booked
      ? `Booked for ${formatClassWhen(item.startsAt)} in ${item.location}. It sits inside a working day.`
      : `Open on ${formatClassWhen(item.startsAt)} in ${item.location}. A class in these hours fits a working day.`,
  }));
  const challenge = challenges[0];
  if (challenge) {
    prompts.push({
      kind: "challenge",
      title: challenge.title,
      message: challenge.joined
        ? `You have joined. Gym visits so far: ${visits}. A visit during the workday keeps this challenge moving.`
        : "This challenge is running. It gives a workday goal alongside classes.",
    });
  }
  return prompts;
}

export async function getMyActivity(userId: number): Promise<ActivitySummary> {
  const [counts, recent, participation] = await Promise.all([
    activity.countsForUser(userId),
    activity.recentForUser(userId),
    activity.participationDays(userId),
  ]);
  const prompts = await workdayPrompts(userId, counts.visits);
  return {
    ...counts,
    streak: participationStreak(participation.days, participation.today),
    recent,
    prompts,
  };
}
