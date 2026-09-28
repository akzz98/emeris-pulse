import { ActivityRepository, type ActivityCounts, type RecentActivity } from "./activityRepository.js";

const activity = new ActivityRepository();

export type ActivitySummary = ActivityCounts & {
  recent: RecentActivity[];
};

export async function getMyActivity(userId: number): Promise<ActivitySummary> {
  const [counts, recent] = await Promise.all([
    activity.countsForUser(userId),
    activity.recentForUser(userId),
  ]);
  return { ...counts, recent };
}
