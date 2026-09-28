import { ReportsRepository } from "./reportsRepository.js";

const reports = new ReportsRepository();

function rate(filled: number, capacity: number): number {
  if (capacity <= 0) {
    return 0;
  }
  return Math.round((filled / capacity) * 100);
}

function hoursDown(openSince: string | null): number | null {
  if (!openSince) {
    return null;
  }
  const opened = new Date(openSince).getTime();
  if (Number.isNaN(opened)) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - opened) / (60 * 60 * 1000)));
}

export async function classFillReport() {
  const classes = await reports.classFill();
  const filled = classes.reduce((sum, item) => sum + item.filled, 0);
  const seats = classes.reduce((sum, item) => sum + item.capacity, 0);
  return {
    filled,
    seats,
    fillRate: rate(filled, seats),
    classes: classes.map((item) => ({ ...item, fillRate: rate(item.filled, item.capacity) })),
  };
}

export async function equipmentDowntimeReport() {
  const machines = await reports.equipmentDowntime();
  const listed = machines.map((item) => ({
    ...item,
    hoursDown: item.status === "OutOfService" ? hoursDown(item.openSince) : null,
  }));
  return {
    total: listed.length,
    outOfService: listed.filter((item) => item.status === "OutOfService").length,
    machines: listed,
  };
}

export async function wellnessParticipationReport() {
  const report = await reports.wellnessParticipation();
  const enrolments = report.challenges.reduce((sum, item) => sum + item.participants, 0);
  return {
    people: report.people,
    enrolments,
    challenges: report.challenges,
  };
}
