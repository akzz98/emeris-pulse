import assert from "node:assert/strict";
import test from "node:test";
import { Booking } from "./booking.js";
import { DomainError } from "./domainError.js";

test("a full class waitlists the member", () => {
  assert.equal(Booking.placeFor(2), "Booked");
  assert.equal(Booking.placeFor(0), "Waitlisted");
});

test("cancel and attendance follow the booking status", () => {
  assert.equal(new Booking("Booked").cancel(), "Cancelled");
  assert.equal(new Booking("Waitlisted").cancel(), "Cancelled");
  assert.equal(new Booking("Booked").markAttended(), "Attended");
  assert.throws(() => new Booking("Cancelled").cancel(), DomainError);
  assert.throws(() => new Booking("Waitlisted").markAttended(), DomainError);
});
