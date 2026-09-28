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

export async function classFillReport(page: number, pageSize: number) {
  const report = await reports.classFill(page, pageSize);
  return {
    page,
    pageSize,
    total: report.total,
    filled: report.filled,
    seats: report.seats,
    fillRate: rate(report.filled, report.seats),
    classes: report.classes.map((item) => ({ ...item, fillRate: rate(item.filled, item.capacity) })),
  };
}

export async function equipmentDowntimeReport(page: number, pageSize: number) {
  const report = await reports.equipmentDowntime(page, pageSize);
  return {
    page,
    pageSize,
    total: report.total,
    outOfService: report.outOfService,
    machines: report.machines.map((item) => ({
      ...item,
      hoursDown: hoursDown(item.openSince),
    })),
  };
}

export async function wellnessParticipationReport(page: number, pageSize: number) {
  const report = await reports.wellnessParticipation(page, pageSize);
  return {
    page,
    pageSize,
    total: report.total,
    people: report.people,
    enrolments: report.enrolments,
    challenges: report.challenges,
  };
}
