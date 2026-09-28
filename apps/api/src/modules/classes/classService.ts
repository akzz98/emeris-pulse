import sql from "mssql";
import { Booking } from "../../domain/booking.js";
import { getPool, isUniqueViolation } from "../../db/pool.js";
import { HttpError } from "../../http/httpError.js";
import { getMyMembership } from "../memberships/membershipService.js";
import { ClassRepository } from "./classRepository.js";

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
  const roster = await classes.rosterForInstructor(instructorId);
  return roster;
}
