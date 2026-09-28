import assert from "node:assert/strict";
import type { Server } from "node:http";
import test from "node:test";
import { createApp } from "../app.js";

const enabled = process.env.RUN_API_TESTS === "1";

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

async function withServer(run: (base: string) => Promise<void>): Promise<void> {
  const app = createApp();
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("The test server did not bind a port.");
  }
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("login, membership, and a class booking run against SQL", { skip: !enabled }, async () => {
  await withServer(async (base) => {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);

    const loginResponse = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "student@emeris.test", password: "Pulse123!" }),
    });
    const login = await readJson(loginResponse);
    assert.equal(loginResponse.status, 200);
    const accessToken = login.accessToken;
    assert.equal(typeof accessToken, "string");

    const membershipResponse = await fetch(`${base}/memberships/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const membership = await readJson(membershipResponse);
    assert.equal(membershipResponse.status, 200);
    assert.equal(membership.status, "Active");

    const staffLogin = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "staff@emeris.test", password: "Pulse123!" }),
    });
    const staff = await readJson(staffLogin);
    assert.equal(staffLogin.status, 200);

    const timetableResponse = await fetch(`${base}/classes/timetable`, {
      headers: { Authorization: `Bearer ${staff.accessToken}` },
    });
    const timetable = await readJson(timetableResponse);
    assert.equal(timetableResponse.status, 200);
    const classes = timetable.classes as Array<{ id: number; title: string; seatsLeft: number }>;
    const yoga = classes.find((item) => item.title === "Lunch Yoga");
    assert.ok(yoga);
    assert.ok(yoga.seatsLeft > 0);

    const booking = await fetch(`${base}/classes/${yoga.id}/bookings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${staff.accessToken}` },
    });
    const place = await readJson(booking);
    assert.equal(booking.status, 201);
    assert.equal(place.status, "Booked");
  });
});
