import assert from "node:assert/strict";
import test from "node:test";
import { participationStreak } from "./streak.js";

const today = "2026-09-28";

test("no visits or classes is a zero streak", () => {
  assert.equal(participationStreak([], today), 0);
});

test("a visit today starts a one-day streak", () => {
  assert.equal(participationStreak(["2026-09-28"], today), 1);
});

test("yesterday still counts while today is open", () => {
  assert.equal(participationStreak(["2026-09-27"], today), 1);
});

test("consecutive days add up, and a gap stops the count", () => {
  assert.equal(participationStreak(["2026-09-26", "2026-09-27", "2026-09-28"], today), 3);
  assert.equal(participationStreak(["2026-09-25", "2026-09-27", "2026-09-28"], today), 2);
});

test("a day before yesterday does not keep the streak", () => {
  assert.equal(participationStreak(["2026-09-26"], today), 0);
});

test("a future class does not extend the streak", () => {
  assert.equal(participationStreak(["2026-09-29"], today), 0);
});
