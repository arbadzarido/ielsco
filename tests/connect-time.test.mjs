// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
import { test } from "node:test";
import assert from "node:assert/strict";
import { utcToZoned, zonedToUtc } from "../src/lib/connect/time.ts";

test("zone with a fixed offset (WIB, UTC+7)", () => {
  assert.equal(zonedToUtc("2026-11-07T19:30", "Asia/Jakarta"), "2026-11-07T12:30:00.000Z");
  assert.equal(utcToZoned("2026-11-07T12:30:00.000Z", "Asia/Jakarta"), "2026-11-07T19:30");
});

test("half-hour zone (Yangon, UTC+6:30) and UTC", () => {
  assert.equal(zonedToUtc("2026-11-07T08:00", "Asia/Yangon"), "2026-11-07T01:30:00.000Z");
  assert.equal(zonedToUtc("2026-11-07T08:00", "UTC"), "2026-11-07T08:00:00.000Z");
});

test("daylight saving is applied on the right side of the change", () => {
  // London: GMT until 29 Mar 2026 01:00 UTC, then BST (UTC+1).
  assert.equal(zonedToUtc("2026-03-28T12:00", "Europe/London"), "2026-03-28T12:00:00.000Z");
  assert.equal(zonedToUtc("2026-03-30T12:00", "Europe/London"), "2026-03-30T11:00:00.000Z");
  assert.equal(utcToZoned("2026-03-30T11:00:00.000Z", "Europe/London"), "2026-03-30T12:00");
});

test("round trip and invalid input", () => {
  for (const tz of ["Asia/Manila", "Australia/Sydney", "America/New_York"]) {
    assert.equal(utcToZoned(zonedToUtc("2026-12-31T23:45", tz), tz), "2026-12-31T23:45");
  }
  assert.equal(zonedToUtc("not a date", "Asia/Jakarta"), null);
  assert.equal(zonedToUtc("2026-11-07T19:30", "Mars/Olympus"), null);
});

