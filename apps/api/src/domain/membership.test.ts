import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "./domainError.js";
import { Membership } from "./membership.js";

const today = "2026-09-28";

test("student and staff terms differ", () => {
  assert.equal(Membership.termDays("Student"), 120);
  assert.equal(Membership.termDays("Staff"), 365);
});

test("only an active current membership can enter", () => {
  assert.equal(new Membership("Active", "Student", "2026-12-01").canEnter(today), true);
  assert.equal(new Membership("Pending", "Student", "2026-12-01").canEnter(today), false);
  assert.equal(new Membership("Frozen", "Student", "2026-12-01").canEnter(today), false);
  assert.equal(new Membership("Expired", "Student", "2026-12-01").canEnter(today), false);
  assert.equal(new Membership("Active", "Staff", "2026-09-27").canEnter(today), false);
});

test("activate moves pending or frozen memberships to active", () => {
  assert.equal(new Membership("Pending", "Student", "2026-12-01").activate(today), "Active");
  assert.equal(new Membership("Frozen", "Staff", "2026-12-01").activate(today), "Active");
});

test("activate rejects the wrong status and a lapsed term", () => {
  assert.throws(() => new Membership("Active", "Student", "2026-12-01").activate(today), DomainError);
  assert.throws(() => new Membership("Pending", "Student", "2026-01-01").activate(today), DomainError);
});

test("freeze only applies to an active membership", () => {
  assert.equal(new Membership("Active", "Student", "2026-12-01").freeze(), "Frozen");
  assert.throws(() => new Membership("Pending", "Student", "2026-12-01").freeze(), DomainError);
});

test("a lapsed active membership becomes expired", () => {
  assert.equal(new Membership("Active", "Student", "2026-09-01").expireIfLapsed(today), "Expired");
  assert.equal(new Membership("Frozen", "Student", "2026-09-01").expireIfLapsed(today), "Frozen");
});
