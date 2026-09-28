function previousDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// Consecutive days with a visit or a class. Today still counts if yesterday was the latest day.
export function participationStreak(days: string[], today: string): number {
  const participated = new Set(days.filter((day) => day <= today));
  const start = participated.has(today) ? today : previousDay(today);
  let count = 0;
  let cursor = start;
  while (participated.has(cursor)) {
    count += 1;
    cursor = previousDay(cursor);
  }
  return count;
}
