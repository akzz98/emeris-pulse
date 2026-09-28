import { DomainError } from "./domainError.js";

export type BookingStatus = "Booked" | "Waitlisted" | "Cancelled" | "Attended" | "Absent";

export class Booking {
  constructor(readonly status: BookingStatus) {}

  static placeFor(seatsLeft: number): BookingStatus {
    if (seatsLeft > 0) {
      return "Booked";
    }
    return "Waitlisted";
  }

  cancel(): BookingStatus {
    if (this.status !== "Booked" && this.status !== "Waitlisted") {
      throw new DomainError("Only a booked or waitlisted place can be cancelled.");
    }
    return "Cancelled";
  }

  markAttended(): BookingStatus {
    if (this.status !== "Booked") {
      throw new DomainError("Only a booked member can be marked attended.");
    }
    return "Attended";
  }

  markAbsent(): BookingStatus {
    if (this.status !== "Booked") {
      throw new DomainError("Only a booked member can be marked absent.");
    }
    return "Absent";
  }
}
