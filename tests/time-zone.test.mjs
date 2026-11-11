// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_ZONE, dualDeadline, formatDateTime, formatDeadline, isValidZone, offsetMinutes, sameClock, zoneLabel, zoneOptionLabel } from "../src/lib/time/zone.ts";
import { formatSession, formatSessionWib } from "../src/lib/circle/sessions.ts";

const CLOSE = "2026-11-29T23:59:59+07:00"; // careers applications close 29 Nov 2026 23:59 WIB

test("the official careers deadline reads 23:59 WIB in Jakarta", () => {
  assert.equal(SOURCE_ZONE, "Asia/Jakarta");
  assert.equal(formatDeadline(CLOSE, "Asia/Jakarta"), "29 November 2026, 23:59 WIB");
});

test("the same instant in other zones keeps the official text and adds the local one", () => {
  const berlin = dualDeadline(CLOSE, "Europe/Berlin");
  assert.equal(berlin.official, "29 November 2026, 23:59 WIB");
  assert.equal(berlin.local, "29 November 2026, 17:59 GMT+1");
  const ny = dualDeadline(CLOSE, "America/New_York");
  assert.equal(ny.local, "29 November 2026, 11:59 EST");
  const tokyo = dualDeadline(CLOSE, "Asia/Tokyo");
  assert.equal(tokyo.local, "30 November 2026, 01:59 GMT+9");
  // Same clock as WIB (e.g. Bangkok): no second, duplicate line.
  assert.equal(dualDeadline(CLOSE, "Asia/Bangkok").local, null);
});

test("Indonesian zones use their own abbreviations; others are always labelled", () => {
  assert.equal(zoneLabel("Asia/Jakarta"), "WIB");
  assert.equal(zoneLabel("Asia/Makassar"), "WITA");
  assert.equal(zoneLabel("Asia/Jayapura"), "WIT");
  assert.equal(zoneLabel("UTC"), "UTC");
  assert.match(formatDateTime("2026-11-11T12:00:00Z", "Asia/Singapore"), /^Wed 11 Nov · 20:00 GMT\+8$/);
});

test("offsets follow daylight saving", () => {
  assert.equal(offsetMinutes("Asia/Jakarta", "2026-07-01T00:00:00Z"), 420);
  assert.equal(offsetMinutes("Europe/London", "2026-07-01T00:00:00Z"), 60);
  assert.equal(offsetMinutes("Europe/London", "2026-12-01T00:00:00Z"), 0);
  assert.equal(offsetMinutes("Asia/Kolkata", "2026-12-01T00:00:00Z"), 330);
  assert.ok(sameClock("Asia/Jakarta", "Asia/Bangkok"));
  assert.ok(!sameClock("Asia/Jakarta", "Asia/Singapore"));
});

test("zone validation accepts IANA names and rejects legacy abbreviations", () => {
  assert.ok(isValidZone("America/Argentina/Buenos_Aires"));
  assert.ok(isValidZone("UTC"));
  assert.ok(!isValidZone("WIB"));
  assert.ok(!isValidZone("Not/AZone"));
  assert.ok(!isValidZone(null));
  assert.equal(zoneOptionLabel("Asia/Jakarta", "2026-11-11T00:00:00Z"), "Asia/Jakarta (WIB, UTC+07:00)");
  assert.equal(zoneOptionLabel("Asia/Kolkata", "2026-11-11T00:00:00Z"), "Asia/Kolkata (UTC+05:30)");
});

test("Circle sessions show in the viewer's zone with a label; the WIB helper is unchanged", () => {
  const wed = new Date("2026-11-11T19:00:00+07:00");
  assert.deepEqual(formatSessionWib(wed), { day: "Wednesday 11 November", time: "19:00 WIB" });
  assert.deepEqual(formatSession(wed, "Europe/Berlin"), { day: "Wednesday 11 November", time: "13:00 GMT+1" });
  assert.deepEqual(formatSession(wed, "Pacific/Auckland"), { day: "Thursday 12 November", time: "01:00 GMT+13" });
});
