// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
// Notifications Center and Elco-Pass badges are derived from the member's own records, never stored. These tests pin
// the rules: what becomes a notification, what counts towards the badge, and when a badge is earned.
import { test } from "node:test";
import assert from "node:assert/strict";
import { badgeCount, buildNotifications } from "../src/lib/me/notifications.ts";
import { BADGES, badgeStates, buildStamps } from "../src/lib/me/badges.ts";

const NOW = new Date("2026-11-04T03:00:00Z");
const day = (n) => new Date(NOW.getTime() + n * 86_400_000);
const ymd = (d) => d.toISOString().slice(0, 10);

const empty = () => ({
  activities: [], tracked: [], elco: null, circlesJoined: [], connections: 0, incomingIntros: 0, unread: 0, roomsHosted: 0, bookmarks: 0, gaps: [],
});
const activity = (over) => ({ id: "a", kind: "room", title: "Speaking room", start: day(1), allDay: false, timeZone: "Asia/Jakarta", href: "/x", status: "registered", past: false, ...over });
const tracked = (over) => ({ opportunity_id: "o1", status: "saved", personal_deadline: null, updated_at: NOW.toISOString(), created_at: NOW.toISOString(),
  opportunity: { slug: "s", title: "Scholarship X", organizer: "Org", category: "scholarship", deadline: null }, ...over });

test("a new member has no notifications and no badge count", () => {
  const items = buildNotifications(empty(), NOW);
  assert.deepEqual(items, []);
  assert.equal(badgeCount(items), 0);
});

test("intros and unread messages are actionable social notifications", () => {
  const items = buildNotifications({ ...empty(), incomingIntros: 2, unread: 1 }, NOW);
  assert.deepEqual(items.map((n) => n.id), ["intros", "unread"]);
  assert.match(items[0].title, /2 intro requests/);
  assert.match(items[1].title, /1 unread message$/);
  assert.equal(badgeCount(items), 2);
});

test("events: only the next 7 days; tomorrow's is actionable, next week's is not; past and cohorts are skipped", () => {
  const r = { ...empty(), activities: [
    activity({ id: "tomorrow", start: day(1) }),
    activity({ id: "in5", start: day(5) }),
    activity({ id: "in10", start: day(10) }),
    activity({ id: "past", start: day(-2), past: true }),
    activity({ id: "cohort", kind: "circle_cohort", start: day(1) }),
  ] };
  const items = buildNotifications(r, NOW);
  assert.deepEqual(items.map((n) => n.id).sort(), ["activity-in5", "activity-tomorrow"]);
  assert.equal(badgeCount(items), 1);
  assert.match(items.find((n) => n.id === "activity-tomorrow").body, /tomorrow/);
});

test("deadlines: tracked and still open, within 14 days; the member's own deadline wins", () => {
  const r = { ...empty(), tracked: [
    tracked({ opportunity_id: "soon", opportunity: { ...tracked().opportunity, deadline: ymd(day(2)) } }),
    tracked({ opportunity_id: "own", personal_deadline: ymd(day(10)), opportunity: { ...tracked().opportunity, deadline: ymd(day(40)) } }),
    tracked({ opportunity_id: "far", opportunity: { ...tracked().opportunity, deadline: ymd(day(30)) } }),
    tracked({ opportunity_id: "applied", status: "applied", opportunity: { ...tracked().opportunity, deadline: ymd(day(1)) } }),
    tracked({ opportunity_id: "gone", opportunity: { ...tracked().opportunity, deadline: ymd(day(-1)) } }),
  ] };
  const items = buildNotifications(r, NOW);
  assert.deepEqual(items.map((n) => n.id).sort(), ["deadline-own", "deadline-soon"]);
  assert.match(items.find((n) => n.id === "deadline-own").body, /^Your deadline in 10 days/);
  assert.equal(badgeCount(items), 1); // only the one within 3 days
});

test("muted categories don't count towards the badge", () => {
  const items = buildNotifications({ ...empty(), incomingIntros: 1, activities: [activity({ start: day(0.5) })] }, NOW);
  assert.equal(badgeCount(items), 2);
  assert.equal(badgeCount(items, new Set(["social"])), 1);
});

test("Elco nudge only for a linked account idle for a week, never actionable", () => {
  const linked = (last) => ({ linked: true, linked_at: null, level_estimate: null, focus_skills: [], practice_count_30d: 0, last_active_at: last, generated_at: null });
  assert.equal(buildNotifications({ ...empty(), elco: linked(day(-2).toISOString()) }, NOW).length, 0);
  const idle = buildNotifications({ ...empty(), elco: linked(day(-9).toISOString()) }, NOW);
  assert.equal(idle[0].id, "elco-idle");
  assert.equal(badgeCount(idle), 0);
  assert.equal(buildNotifications({ ...empty(), elco: { ...linked(day(-9).toISOString()), linked: false } }, NOW).length, 0);
});

test("badges: none for a new member; Elco-based badges are unmeasurable until linked", () => {
  const states = badgeStates(empty());
  assert.equal(states.length, BADGES.length);
  assert.ok(states.every((s) => !s.earned));
  assert.equal(states.find((s) => s.def.id === "consistency-star").value, null);
});

test("badges are earned exactly at their targets, from real records", () => {
  const circle = (i) => activity({ id: `c${i}`, kind: "circle_session", status: "checked_in", start: day(-i), past: true });
  const r = {
    ...empty(),
    activities: [circle(1), circle(2), circle(3), circle(4),
      activity({ id: "e1", kind: "ielsco_event", status: "attended", past: true, start: day(-20) }),
      activity({ id: "e2", kind: "ielsco_event", status: "registered", past: true, start: day(-21) }), // registered, not attended: doesn't count
      activity({ id: "r1", kind: "room", past: true, start: day(-22) })],
    tracked: [tracked({ status: "applied" })],
    connections: 4, roomsHosted: 1, bookmarks: 10,
    elco: { linked: true, linked_at: null, level_estimate: null, focus_skills: [], practice_count_30d: 12, last_active_at: null, generated_at: null },
  };
  const earned = Object.fromEntries(badgeStates(r).map((s) => [s.def.id, s.earned]));
  assert.deepEqual(earned, {
    "first-voice": true, "circle-regular": true, "consistency-star": true, "fearless-speaker": true, "word-collector": true,
    "rising-star": true, "community-builder": false, "global-connector": false,
  });
});

test("stamps exist only for real, past records and carry the same rules as the badges", () => {
  assert.deepEqual(buildStamps(empty()), []);
  const r = { ...empty(),
    activities: [
      activity({ id: "circle-old", kind: "circle_session", status: "checked_in", start: day(-9), past: true }),
      activity({ id: "circle-next", kind: "circle_session", start: day(2), past: false }),
      activity({ id: "ev-attended", kind: "ielsco_event", status: "attended", start: day(-5), past: true }),
      activity({ id: "ev-noshow", kind: "ielsco_event", status: "registered", start: day(-6), past: true }),
      activity({ id: "cohort", kind: "circle_cohort", start: day(-30), past: true }),
      activity({ id: "room-hosted", kind: "room", status: "hosting", start: day(-1), past: true }),
    ],
    tracked: [tracked({ opportunity_id: "s", status: "saved" }), tracked({ opportunity_id: "a", status: "applied" })],
    elco: { linked: true, linked_at: day(-20).toISOString(), level_estimate: null, focus_skills: [], practice_count_30d: 0, last_active_at: null, generated_at: null } };
  const stamps = buildStamps(r);
  assert.deepEqual(stamps.map((s) => s.id).sort(), ["circle-old", "elco-linked", "ev-attended", "room-hosted", "tracker-a"]);
  assert.equal(stamps.find((s) => s.id === "room-hosted").label, "Hosted");
  assert.equal(buildStamps({ ...r, elco: { ...r.elco, linked_at: null } }).some((s) => s.group === "elco"), false);
});
