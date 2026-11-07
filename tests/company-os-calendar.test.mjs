// Company OS calendar helpers (src/lib/os/calendar.ts): month grid, multi-day layout, time zones, Google mapping.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fromGoogleEvent, itemDays, itemsOnDay, layoutWeek, monthWeeks, toGoogleEvent, zonedInstant, zonedParts } from "../src/lib/os/calendar.ts";

test("month grid runs Sunday to Saturday in whole weeks", () => {
  const w = monthWeeks(2026, 11); // 1 Nov 2026 is a Sunday
  assert.equal(w[0][0], "2026-11-01");
  assert.equal(w.at(-1)[6], "2026-12-05");
  assert.equal(w.length, 5);
  const oct = monthWeeks(2026, 10); // 1 Oct 2026 is a Thursday
  assert.equal(oct[0][0], "2026-09-27");
  assert.ok(oct.every((wk) => wk.length === 7));
});

test("Jakarta times convert both ways (UTC+7, no DST)", () => {
  assert.equal(zonedInstant("2026-11-10", "14:00"), "2026-11-10T07:00:00.000Z");
  assert.deepEqual(zonedParts("2026-11-10T07:00:00Z"), { date: "2026-11-10", time: "14:00" });
  assert.deepEqual(zonedParts("2026-11-10T18:30:00Z"), { date: "2026-11-11", time: "01:30" });
});

test("other time zones, including across a DST change", () => {
  assert.equal(zonedInstant("2026-07-01", "09:00", "Europe/London"), "2026-07-01T08:00:00.000Z");
  assert.equal(zonedInstant("2026-12-01", "09:00", "Europe/London"), "2026-12-01T09:00:00.000Z");
});

test("days an event covers: all-day ends are exclusive, a timed event ending at midnight stays on its day", () => {
  assert.deepEqual(itemDays(zonedInstant("2026-11-10", "00:00"), zonedInstant("2026-11-13", "00:00"), true), { first: "2026-11-10", last: "2026-11-12", startTime: "" });
  assert.deepEqual(itemDays(zonedInstant("2026-11-10", "22:00"), zonedInstant("2026-11-11", "00:00"), false), { first: "2026-11-10", last: "2026-11-10", startTime: "22:00" });
  assert.deepEqual(itemDays(zonedInstant("2026-11-10", "22:00"), zonedInstant("2026-11-11", "02:00"), false).last, "2026-11-11");
});

test("multi-day items span columns, take lanes, and overflow into +N more", () => {
  const week = monthWeeks(2026, 11)[1]; // 8–14 Nov
  const it = (key, first, last) => ({ key, title: key, first, last, allDay: true, kind: "Event" });
  const items = [it("long", "2026-11-05", "2026-11-10"), it("a", "2026-11-09", "2026-11-09"), it("b", "2026-11-09", "2026-11-11"), it("c", "2026-11-09", "2026-11-09"), it("d", "2026-11-09", "2026-11-09"), it("later", "2026-11-20", "2026-11-21")];
  const { placed, hidden } = layoutWeek(week, items, 3);
  const long = placed.find((p) => p.item.key === "long");
  assert.deepEqual([long.col, long.span, long.continuesBefore, long.lane], [0, 3, true, 0]);
  assert.ok(!placed.some((p) => p.item.key === "later"));
  const lanes = placed.filter((p) => p.col <= 1 && p.col + p.span > 1).map((p) => p.lane);
  assert.equal(new Set(lanes).size, lanes.length, "no two items share a lane on the same day");
  assert.equal(hidden[1], 2, "two items on Monday don't fit in three lanes");
});

test("a day's list puts all-day items first, then by time", () => {
  const list = itemsOnDay("2026-11-10", [
    { key: "t2", title: "b", first: "2026-11-10", last: "2026-11-10", allDay: false, startTime: "15:00", kind: "x" },
    { key: "ad", title: "z", first: "2026-11-09", last: "2026-11-11", allDay: true, kind: "x" },
    { key: "t1", title: "a", first: "2026-11-10", last: "2026-11-10", allDay: false, startTime: "09:00", kind: "x" },
  ]);
  assert.deepEqual(list.map((i) => i.key), ["ad", "t1", "t2"]);
});

test("an OS event becomes a Google event that carries its OS ID (so a second push finds it)", () => {
  const timed = toGoogleEvent({ id: "EV-0007", title: "Growth sync", description: null, starts_at: "2026-11-10T07:00:00.000Z", ends_at: "2026-11-10T08:00:00.000Z", all_day: false, timezone: "Asia/Jakarta", location: "HQ", meeting_url: "https://meet.google.com/x", status: "Scheduled" }, "https://os.ielsco.com/os/calendar?event=EV-0007");
  assert.equal(timed.extendedProperties.private.osEventId, "EV-0007");
  assert.deepEqual(timed.start, { dateTime: "2026-11-10T07:00:00.000Z", timeZone: "Asia/Jakarta" });
  assert.match(timed.description, /meet\.google\.com/);
  const allDay = toGoogleEvent({ id: "EV-0008", title: "Offsite", description: null, starts_at: zonedInstant("2026-11-10", "00:00"), ends_at: zonedInstant("2026-11-12", "00:00"), all_day: true, timezone: "Asia/Jakarta", location: null, meeting_url: null, status: "Scheduled" }, "x");
  assert.deepEqual([allDay.start, allDay.end], [{ date: "2026-11-10" }, { date: "2026-11-12" }]);
});

test("Google events map back to instants", () => {
  assert.deepEqual(fromGoogleEvent({ id: "g", summary: "Call", start: { dateTime: "2026-11-10T14:00:00+07:00" }, end: { dateTime: "2026-11-10T15:00:00+07:00" } }),
    { title: "Call", starts_at: "2026-11-10T07:00:00.000Z", ends_at: "2026-11-10T08:00:00.000Z", all_day: false, location: null });
  assert.equal(fromGoogleEvent({ id: "g", start: { date: "2026-11-10" }, end: { date: "2026-11-11" } }).starts_at, "2026-11-09T17:00:00.000Z");
  assert.equal(fromGoogleEvent({ id: "g" }), null);
});
