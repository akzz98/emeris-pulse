import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "./domainError.js";
import { MaintenanceTicket } from "./maintenance.js";

test("a report opens a ticket", () => {
  assert.equal(MaintenanceTicket.report(), "Open");
});

test("a ticket moves from open to in progress to closed", () => {
  assert.equal(new MaintenanceTicket("Open").start(), "InProgress");
  assert.equal(new MaintenanceTicket("InProgress").close(), "Closed");
  assert.equal(new MaintenanceTicket("Open").close(), "Closed");
});

test("a closed ticket cannot be started or closed again", () => {
  assert.throws(() => new MaintenanceTicket("Closed").start(), DomainError);
  assert.throws(() => new MaintenanceTicket("Closed").close(), DomainError);
  assert.throws(() => new MaintenanceTicket("InProgress").start(), DomainError);
});
