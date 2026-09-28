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

// A seat is reserved only while capacity remains. A full class is refused.
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
    if (Booking.placeFor(remaining) !== "Booked") {
      throw new HttpError(409, "CLASS_FULL", "This class is full.");
    }

    if (existing) {
      await classes.setStatus(transaction, existing.id, "Booked");
    } else {
      await classes.insertBooked(transaction, classId, userId);
    }
    await transaction.commit();
    return { classId, status: "Booked" as const, seatsLeft: remaining - 1 };
  } catch (error) {
    await transaction.rollback();
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "ALREADY_BOOKED", "You already have a place in this class.");
    }
    throw error;
  }
}

// Cancelling frees the seat. Only a booked or waitlisted place can be cancelled.
export async function cancelBooking(userId: number, classId: number) {
  const place = await classes.findPlace(classId, userId);
  if (!place) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "You do not have a place in this class.");
  }
  if (place.started) {
    throw new HttpError(409, "CLASS_STARTED", "A place cannot be cancelled after the class has started.");
  }
  const status = new Booking(place.status).cancel();
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    await classes.setStatus(transaction, place.id, status);
    const session = await classes.lockClass(transaction, classId);
    const bookedCount = session ? await classes.countBooked(transaction, classId) : 0;
    await transaction.commit();
    return {
      classId,
      status,
      seatsLeft: session ? seatsLeft(session.capacity, bookedCount) : 0,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
