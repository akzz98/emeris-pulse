import assert from "node:assert/strict";
import test from "node:test";
import { Booking } from "./booking.js";
import { DomainError } from "./domainError.js";

test("a full class waitlists the member", () => {
  assert.equal(Booking.placeFor(2), "Booked");
  assert.equal(Booking.placeFor(0), "Waitlisted");
});

test("cancelling a booked place promotes the next waitlisted member", () => {
  assert.equal(Booking.promoteAfterCancel("Booked", true), "Booked");
  assert.equal(Booking.promoteAfterCancel("Booked", false), null);
  assert.equal(Booking.promoteAfterCancel("Waitlisted", true), null);
});

test("cancel and attendance follow the booking status", () => {
  assert.equal(new Booking("Booked").cancel(), "Cancelled");
  assert.equal(new Booking("Waitlisted").cancel(), "Cancelled");
  assert.equal(new Booking("Booked").markAttended(), "Attended");
  assert.equal(new Booking("Booked").markAbsent(), "Absent");
  assert.throws(() => new Booking("Cancelled").cancel(), DomainError);
  assert.throws(() => new Booking("Waitlisted").markAttended(), DomainError);
  assert.throws(() => new Booking("Attended").markAbsent(), DomainError);
});
