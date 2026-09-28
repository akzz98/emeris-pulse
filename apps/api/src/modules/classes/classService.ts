import sql from "mssql";
import { Booking } from "../../domain/booking.js";
import { getPool, isUniqueViolation } from "../../db/pool.js";
import { HttpError } from "../../http/httpError.js";
import { getMyMembership } from "../memberships/membershipService.js";
import { ClassRepository } from "./classRepository.js";
import type { AttendanceInput, PublishClassInput } from "./classSchemas.js";

const classes = new ClassRepository();

function seatsLeft(capacity: number, bookedCount: number): number {
  return Math.max(0, capacity - bookedCount);
}

export async function getTimetable(userId: number) {
  const items = await classes.upcoming(userId);
  return {
    classes: items.map((item) => ({
      ...item,
      seatsLeft: seatsLeft(item.capacity, item.bookedCount),
    })),
  };
}

async function requireActiveMember(userId: number): Promise<void> {
  const membership = await getMyMembership(userId);
  if (!membership.canEnter) {
    throw new HttpError(403, "MEMBERSHIP_INACTIVE", "An active membership is required to book a class.");
  }
}

// A free seat is booked. A full class waitlists the member so they can take a later cancellation.
export async function bookClass(userId: number, classId: number) {
  await requireActiveMember(userId);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await classes.lockClass(transaction, classId);
    if (!session) {
      throw new HttpError(404, "CLASS_NOT_FOUND", "That class does not exist.");
    }
    if (session.status !== "Scheduled") {
      throw new HttpError(409, "CLASS_NOT_OPEN", "This class is not open for booking.");
    }
    if (session.started) {
      throw new HttpError(409, "CLASS_STARTED", "This class has already started.");
    }

    const existing = await classes.lockPlace(transaction, classId, userId);
    if (existing?.status === "Booked") {
      throw new HttpError(409, "ALREADY_BOOKED", "You already have a place in this class.");
    }
    if (existing?.status === "Waitlisted") {
      throw new HttpError(409, "ALREADY_WAITLISTED", "You are already on the waitlist for this class.");
    }
    if (existing && existing.status !== "Cancelled") {
      throw new HttpError(409, "PLACE_CLOSED", "This place can no longer be booked.");
    }

    const bookedCount = await classes.countBooked(transaction, classId);
    const remaining = seatsLeft(session.capacity, bookedCount);
    const status = Booking.placeFor(remaining);
    if (status !== "Booked" && status !== "Waitlisted") {
      throw new HttpError(409, "CLASS_FULL", "This class is full.");
    }

    if (existing) {
      await classes.setStatus(transaction, existing.id, status);
    } else {
      await classes.insertPlace(transaction, classId, userId, status);
    }
    await transaction.commit();
    return {
      classId,
      status,
      seatsLeft: status === "Booked" ? remaining - 1 : remaining,
    };
  } catch (error) {
    await transaction.rollback();
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "ALREADY_BOOKED", "You already have a place in this class.");
    }
    throw error;
  }
}

// Cancelling a booked place gives that seat to the next waitlisted member in the same transaction.
export async function cancelBooking(userId: number, classId: number) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await classes.lockClass(transaction, classId);
    if (!session) {
      throw new HttpError(404, "CLASS_NOT_FOUND", "That class does not exist.");
    }
    if (session.started) {
      throw new HttpError(409, "CLASS_STARTED", "A place cannot be cancelled after the class has started.");
    }
    const place = await classes.lockPlace(transaction, classId, userId);
    if (!place) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "You do not have a place in this class.");
    }
    const status = new Booking(place.status).cancel();
    await classes.setStatus(transaction, place.id, status);

    let promoted: { firstName: string; lastName: string } | null = null;
    if (place.status === "Booked") {
      const next = await classes.nextWaitlisted(transaction, classId);
      if (next) {
        await classes.setStatus(transaction, next.id, "Booked");
        promoted = { firstName: next.firstName, lastName: next.lastName };
      }
    }

    const bookedCount = await classes.countBooked(transaction, classId);
    await transaction.commit();
    return {
      classId,
      status,
      seatsLeft: seatsLeft(session.capacity, bookedCount),
      promoted,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getRoster(instructorId: number) {
  return classes.rosterForInstructor(instructorId);
}

function wallClock(value: string): string {
  return value.length === 16 ? `${value}:00` : value;
}

function requireOwnClass(instructorId: number, ownerId: number): void {
  if (instructorId !== ownerId) {
    throw new HttpError(403, "CLASS_FORBIDDEN", "This class is assigned to another instructor.");
  }
}

// Attendance is recorded only after the class has started, and only from a booked place.
export async function recordAttendance(instructorId: number, classId: number, input: AttendanceInput) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await classes.lockClass(transaction, classId);
    if (!session) {
      throw new HttpError(404, "CLASS_NOT_FOUND", "That class does not exist.");
    }
    requireOwnClass(instructorId, session.instructorId);
    if (session.status !== "Scheduled") {
      throw new HttpError(409, "CLASS_NOT_OPEN", "Attendance can only be recorded for a scheduled class.");
    }
    if (!session.started) {
      throw new HttpError(409, "CLASS_NOT_STARTED", "Attendance can be recorded once the class has started.");
    }
    const place = await classes.lockPlace(transaction, classId, input.userId);
    if (!place) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "That member does not have a place in this class.");
    }
    const booking = new Booking(place.status);
    const status = input.mark === "Attended" ? booking.markAttended() : booking.markAbsent();
    await classes.setStatus(transaction, place.id, status);
    await transaction.commit();
    return { classId, userId: input.userId, status };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function getAttendance(instructorId: number) {
  return { classes: await classes.attendanceForInstructor(instructorId) };
}

export async function getAttendanceTrends(instructorId: number) {
  const rows = await classes.trendsForInstructor(instructorId);
  return {
    classes: rows.map((row) => {
      const marked = row.attended + row.absent;
      return {
        ...row,
        attendanceRate: marked === 0 ? 0 : Math.round((row.attended / marked) * 100),
      };
    }),
  };
}

export async function getInstructorClasses(instructorId: number) {
  return { classes: await classes.scheduledForInstructor(instructorId) };
}

// Booked and waitlisted members are told in the same transaction, so a cancel is not saved without the notice.
export async function cancelClass(instructorId: number, classId: number) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await classes.lockClass(transaction, classId);
    if (!session) {
      throw new HttpError(404, "CLASS_NOT_FOUND", "That class does not exist.");
    }
    requireOwnClass(instructorId, session.instructorId);
    if (session.status !== "Scheduled") {
      throw new HttpError(409, "CLASS_NOT_OPEN", "This class is already cancelled.");
    }
    if (session.ended) {
      throw new HttpError(409, "CLASS_ENDED", "A class cannot be cancelled after it has ended.");
    }
    await classes.setClassStatus(transaction, classId, "Cancelled");
    const userIds = await classes.peopleToNotify(transaction, classId);
    const body = `${session.title} at ${session.location} will not run.`;
    for (const userId of userIds) {
      await classes.insertNotification(transaction, userId, "Class cancelled", body);
    }
    await transaction.commit();
    return { classId, status: "Cancelled" as const, notified: userIds.length };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function listManagedClasses() {
  return { classes: await classes.listManaged(), instructors: await classes.listInstructors() };
}

async function requireInstructor(email: string): Promise<number> {
  const instructor = await classes.findInstructorByEmail(email.toLowerCase());
  if (!instructor) {
    throw new HttpError(404, "INSTRUCTOR_NOT_FOUND", "No instructor was found with that email.");
  }
  return instructor.id;
}

function requireTimeOrder(startsAt: string, endsAt: string): void {
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new HttpError(400, "VALIDATION_ERROR", "The class must end after it starts.");
  }
}

export async function publishClass(input: PublishClassInput) {
  const startsAt = wallClock(input.startsAt);
  const endsAt = wallClock(input.endsAt);
  requireTimeOrder(startsAt, endsAt);
  const instructorId = await requireInstructor(input.instructorEmail);
  const id = await classes.insertClass({
    title: input.title,
    instructorId,
    startsAt,
    endsAt,
    capacity: input.capacity,
    location: input.location,
  });
  return { id, status: "Scheduled" as const };
}

// Capacity cannot fall below the number of places already booked.
export async function updateClass(classId: number, input: PublishClassInput) {
  const startsAt = wallClock(input.startsAt);
  const endsAt = wallClock(input.endsAt);
  requireTimeOrder(startsAt, endsAt);
  const instructorId = await requireInstructor(input.instructorEmail);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const session = await classes.lockClass(transaction, classId);
    if (!session) {
      throw new HttpError(404, "CLASS_NOT_FOUND", "That class does not exist.");
    }
    if (session.status !== "Scheduled") {
      throw new HttpError(409, "CLASS_NOT_OPEN", "Only a scheduled class can be edited.");
    }
    const bookedCount = await classes.countBooked(transaction, classId);
    if (input.capacity < bookedCount) {
      throw new HttpError(
        409,
        "CAPACITY_TOO_SMALL",
        "Capacity cannot be lower than the number of booked places.",
      );
    }
    await classes.updateClass(transaction, classId, {
      title: input.title,
      instructorId,
      startsAt,
      endsAt,
      capacity: input.capacity,
      location: input.location,
    });
    await transaction.commit();
    return { id: classId, capacity: input.capacity };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
