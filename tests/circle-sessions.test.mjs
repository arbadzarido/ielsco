// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { CIRCLE_TOPICS, formatSessionWib, isCircleSlot, upcomingSessions } from "../src/lib/circle/sessions.ts";

const wib = (iso) => new Date(iso); // ISO strings below carry an explicit +07:00 offset

test("next sessions are Wednesday 19:00 and Saturday 13:00 WIB, in order", () => {
  // Monday 19 Oct 2026, 10:00 WIB
  const s = upcomingSessions(4, wib("2026-10-19T10:00:00+07:00"));
  assert.deepEqual(s.map((x) => x.id), [
    "2026-10-21T12:00:00.000Z", // Wed 21 Oct 19:00 WIB
    "2026-10-24T06:00:00.000Z", // Sat 24 Oct 13:00 WIB
    "2026-10-28T12:00:00.000Z",
    "2026-10-31T06:00:00.000Z",
  ]);
  assert.deepEqual(s.map((x) => x.slot), ["wed", "sat", "wed", "sat"]);
});

test("timezone edges: the WIB date decides, not the UTC date", () => {
  // Wed 21 Oct 2026 18:59 WIB (11:59 UTC) -> today's session still upcoming
  assert.equal(upcomingSessions(1, wib("2026-10-21T18:59:00+07:00"))[0].id, "2026-10-21T12:00:00.000Z");
  // Wed 19:00 exactly has started -> next is Saturday
  assert.equal(upcomingSessions(1, wib("2026-10-21T19:00:01+07:00"))[0].id, "2026-10-24T06:00:00.000Z");
  // Sat 24 Oct 00:30 WIB is still Friday in UTC (17:30Z) -> Saturday 13:00 WIB the same WIB day
  assert.equal(upcomingSessions(1, wib("2026-10-24T00:30:00+07:00"))[0].id, "2026-10-24T06:00:00.000Z");
  // Grace window keeps a just-started session visible
  assert.equal(upcomingSessions(1, wib("2026-10-21T19:20:00+07:00"), 30)[0].id, "2026-10-21T12:00:00.000Z");
});

test("the result does not depend on the machine timezone", () => {
  const before = process.env.TZ;
  const ids = [];
  for (const tz of ["UTC", "Asia/Jakarta", "America/Los_Angeles", "Pacific/Kiritimati"]) {
    process.env.TZ = tz;
    ids.push(upcomingSessions(3, wib("2026-12-31T20:00:00+07:00")).map((x) => x.id).join());
  }
  process.env.TZ = before;
  assert.equal(new Set(ids).size, 1);
  assert.equal(ids[0].split(",")[0], "2027-01-02T06:00:00.000Z"); // Sat 2 Jan 2027 across the year boundary
});

test("recurrence has no end date", () => {
  const far = upcomingSessions(2, wib("2031-06-01T08:00:00+07:00"));
  assert.equal(far.length, 2);
  for (const x of far) assert.ok(isCircleSlot(x.id));
});

test("topics rotate and don't repeat back to back", () => {
  const s = upcomingSessions(40, wib("2026-10-19T10:00:00+07:00"));
  for (let i = 1; i < s.length; i++) assert.notEqual(s[i].topic.title, s[i - 1].topic.title);
  assert.ok(new Set(s.map((x) => x.topic.title)).size >= Math.min(20, CIRCLE_TOPICS.length));
  // Deterministic: same session, same topic
  assert.equal(upcomingSessions(1, wib("2026-10-19T10:00:00+07:00"))[0].topic.title, s[0].topic.title);
});

test("isCircleSlot matches only the two weekly slots", () => {
  assert.ok(isCircleSlot("2026-10-21T12:00:00.000Z"));
  assert.ok(isCircleSlot("2026-10-24T06:00:00Z"));
  assert.ok(!isCircleSlot("2026-10-21T12:00:01.000Z"));
  assert.ok(!isCircleSlot("2026-10-22T12:00:00.000Z")); // Thursday
  assert.ok(!isCircleSlot("2026-10-24T13:00:00.000Z")); // 13:00 UTC, not WIB
  assert.ok(!isCircleSlot("not a date"));
});

test("display is always in WIB", () => {
  const { day, time } = formatSessionWib(new Date("2026-10-21T12:00:00.000Z"));
  assert.equal(time, "19:00 WIB");
  assert.match(day, /Wednesday/);
});
