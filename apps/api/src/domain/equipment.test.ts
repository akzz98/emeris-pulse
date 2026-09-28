import assert from "node:assert/strict";
import test from "node:test";
import { DomainError } from "./domainError.js";
import { Equipment } from "./equipment.js";

test("available equipment can be taken out of service", () => {
  assert.equal(new Equipment("Available").takeOutOfService(), "OutOfService");
});

test("equipment already out of service cannot be taken out again", () => {
  assert.throws(() => new Equipment("OutOfService").takeOutOfService(), DomainError);
});
