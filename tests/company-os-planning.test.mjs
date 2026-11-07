// Company OS planning logic: recurring series (src/lib/os/recurrence.ts), invitation groups (groups.ts) and conflict
// detection (conflicts.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { describeRule, expandSeries, googleInstanceId, googleRecurrence, presetOf, presetRule, ruleProblem, shiftRule, splitRules } from "../src/lib/os/recurrence.ts";
import { groupDiff, groupLabel, inRole, resolveInvitations } from "../src/lib/os/groups.ts";
import { busyBlocks, findConflicts, linkWarnings, rescheduleReasons } from "../src/lib/os/conflicts.ts";

// Monday 16 Nov 2026, 10:00-11:00 Jakarta (UTC+7).
const MON = { id: "EV-0001", starts_at: "2026-11-16T03:00:00.000Z", ends_at: "2026-11-16T04:00:00.000Z", all_day: false, timezone: "Asia/Jakarta" };
const starts = (os) => os.map((o) => o.starts_at);

test("a weekly series expands only inside the window, at the same local time", () => {
  const e = { ...MON, recurrence: { freq: "weekly", byweekday: ["MO"] } };
  const o = expandSeries(e, [], "2026-11-20T00:00:00Z", "2026-12-08T00:00:00Z");
  assert.deepEqual(starts(o), ["2026-11-23T03:00:00.000Z", "2026-11-30T03:00:00.000Z", "2026-12-07T03:00:00.000Z"]);
  assert.deepEqual(o.map((x) => x.index), [1, 2, 3]);
  assert.equal(o[0].key, "EV-0001@2026-11-23T03:00:00.000Z");
});

test("until and count end a series; count counts cancelled occurrences too (as in Google)", () => {
  const until = expandSeries({ ...MON, recurrence: { freq: "weekly", until: "2026-11-30" } }, [], "2026-11-01T00:00:00Z", "2027-01-01T00:00:00Z");
  assert.equal(until.length, 3);
  const cancelled = [{ occurrence_start: "2026-11-23T03:00:00.000Z", cancelled: true }];
  const count = expandSeries({ ...MON, recurrence: { freq: "weekly", count: 3 } }, cancelled, "2026-11-01T00:00:00Z", "2027-01-01T00:00:00Z");
  assert.deepEqual(starts(count), ["2026-11-16T03:00:00.000Z", "2026-11-30T03:00:00.000Z"]);
  assert.equal(expandSeries({ ...MON, recurrence: { freq: "weekly", count: 3 } }, cancelled, "2026-11-01T00:00:00Z", "2027-01-01T00:00:00Z", { includeCancelled: true }).length, 3);
});

test("every weekday, every 2 weeks on two days, monthly and yearly", () => {
  const wd = expandSeries({ ...MON, recurrence: presetRule("weekdays", "2026-11-16") }, [], "2026-11-16T00:00:00Z", "2026-11-23T00:00:00Z");
  assert.equal(wd.length, 5);
  // Every 2 weeks on Mon and Wed: weeks start on Monday.
  const bi = expandSeries({ ...MON, recurrence: { freq: "weekly", interval: 2, byweekday: ["MO", "WE"] } }, [], "2026-11-16T00:00:00Z", "2026-12-04T00:00:00Z");
  assert.deepEqual(bi.map((o) => o.starts_at.slice(0, 10)), ["2026-11-16", "2026-11-18", "2026-11-30", "2026-12-02"]);
  // Monthly on the 31st skips months without one.
  const m31 = { ...MON, starts_at: "2027-01-31T03:00:00.000Z", ends_at: "2027-01-31T04:00:00.000Z", recurrence: { freq: "monthly" } };
  assert.deepEqual(expandSeries(m31, [], "2027-01-01T00:00:00Z", "2027-06-01T00:00:00Z").map((o) => o.starts_at.slice(0, 10)), ["2027-01-31", "2027-03-31", "2027-05-31"]);
  const y = expandSeries({ ...MON, recurrence: { freq: "yearly" } }, [], "2026-01-01T00:00:00Z", "2029-01-01T00:00:00Z");
  assert.equal(y.length, 3);
});

test("a moved occurrence keeps its identity and can move into the window from outside it", () => {
  const e = { ...MON, recurrence: { freq: "weekly" } };
  const moved = [{ occurrence_start: "2026-11-30T03:00:00.000Z", cancelled: false, starts_at: "2026-11-27T03:00:00.000Z", ends_at: "2026-11-27T04:00:00.000Z", title: "Moved" }];
  const o = expandSeries(e, moved, "2026-11-25T00:00:00Z", "2026-11-29T00:00:00Z");
  assert.equal(o.length, 1);
  assert.equal(o[0].occurrence_start, "2026-11-30T03:00:00.000Z");
  assert.equal(o[0].starts_at, "2026-11-27T03:00:00.000Z");
  assert.equal(o[0].exception.title, "Moved");
});

test("all-day and one-off events", () => {
  const ad = { id: "EV-2", starts_at: "2026-11-15T17:00:00.000Z", ends_at: "2026-11-16T17:00:00.000Z", all_day: true, timezone: "Asia/Jakarta", recurrence: { freq: "daily", count: 3 } };
  assert.deepEqual(starts(expandSeries(ad, [], "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z")), ["2026-11-15T17:00:00.000Z", "2026-11-16T17:00:00.000Z", "2026-11-17T17:00:00.000Z"]);
  assert.equal(expandSeries({ ...MON, recurrence: null }, [], "2026-11-01T00:00:00Z", "2026-12-01T00:00:00Z").length, 1);
  assert.equal(expandSeries({ ...MON, recurrence: null }, [], "2026-12-01T00:00:00Z", "2026-12-02T00:00:00Z").length, 0);
});

test("presets, descriptions and rule checks", () => {
  assert.equal(presetOf(presetRule("biweekly", "2026-11-16"), "2026-11-16"), "biweekly");
  assert.equal(presetOf({ freq: "weekly", byweekday: ["MO"], until: "2026-12-31" }, "2026-11-16"), "weekly");
  assert.equal(presetOf({ freq: "weekly", interval: 3 }, "2026-11-16"), "custom");
  assert.equal(describeRule({ freq: "weekly", byweekday: ["MO"], until: "2026-12-28" }), "Every Monday until 28 Dec 2026");
  assert.equal(describeRule(presetRule("weekdays", "2026-11-16")), "Every weekday");
  assert.equal(describeRule({ freq: "weekly", interval: 2, byweekday: ["WE", "MO"], count: 4 }), "Every 2 weeks on Mon, Wed, 4 times");
  assert.equal(ruleProblem({ freq: "weekly", until: "2026-12-01", count: 2 }), "End on a date or after a number of times, not both.");
  assert.equal(ruleProblem({ freq: "daily", byweekday: ["MO"] }), "Pick at least one weekday.");
  assert.equal(ruleProblem({ freq: "weekly", byweekday: ["MO"] }), null);
});

test("splitting a series: the old one ends the day before, a count carries over", () => {
  const e = { ...MON, recurrence: { freq: "weekly", count: 6 } };
  const s = splitRules(e, "2026-11-30T03:00:00.000Z");
  assert.equal(s.untilForOld, "2026-11-29");
  assert.equal(s.ruleForNew.count, 4);
  assert.deepEqual(shiftRule({ freq: "weekly", byweekday: ["MO", "TH"] }, 1).byweekday, ["TU", "FR"]);
  assert.deepEqual(shiftRule({ freq: "weekly", byweekday: ["SU"] }, -1).byweekday, ["SA"]);
});

test("Google recurrence lines and instance IDs", () => {
  const e = { ...MON, recurrence: { freq: "weekly", interval: 2, byweekday: ["MO"], until: "2026-12-28" } };
  const lines = googleRecurrence(e, [{ occurrence_start: "2026-11-30T03:00:00.000Z", cancelled: true }]);
  assert.equal(lines[0], "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO;UNTIL=20261228T165959Z");
  assert.equal(lines[1], "EXDATE;TZID=Asia/Jakarta:20261130T100000");
  assert.equal(googleInstanceId("abc", "2026-11-30T03:00:00.000Z", false), "abc_20261130T030000Z");
  assert.equal(googleInstanceId("abc", "2026-11-29T17:00:00.000Z", true), "abc_20261130");
});

// ── Groups
const P = (id, name, role, companies, divisions = [], managed = []) => ({ person_id: id, full_name: name, short_name: null, org_role: role, companies, divisions, managed_divisions: managed });
const PEOPLE = [
  P("PPL-1", "Arbadza", "founder", ["IEL", "ELC"]),
  P("PPL-2", "Nadia", "manager", ["IEL"], ["DIV-03"], ["DIV-03"]),
  P("PPL-3", "Farrel", "member", ["IEL"], ["DIV-04"]),
  P("PPL-4", "Sari", "member", ["ELC"], ["DIV-03"]),
  P("PPL-5", "Budi", "member", ["IEL", "ELC"], ["DIV-04"], ["DIV-04"]),
];
const div = (id) => ({ "DIV-03": "Growth", "DIV-04": "Creative" })[id] ?? id;

test("roles come from the registry: founders, managers (incl. division managers), associates", () => {
  assert.deepEqual(PEOPLE.filter((p) => inRole(p, "c_level")).map((p) => p.person_id), ["PPL-1"]);
  assert.deepEqual(PEOPLE.filter((p) => inRole(p, "managers")).map((p) => p.person_id), ["PPL-2", "PPL-5"]);
  assert.deepEqual(PEOPLE.filter((p) => inRole(p, "associates")).map((p) => p.person_id), ["PPL-3", "PPL-4"]);
  assert.equal(inRole(P("PPL-9", "G", "guest", ["IEL"]), "all"), false);
});

test("combinations, labels, dedupe and people already invited", () => {
  assert.equal(groupLabel({ role: "associates", company: "IEL" }), "All Associates in IELSco");
  assert.equal(groupLabel({ role: "managers", division: "DIV-03" }, div), "Managers in Growth");
  assert.equal(groupLabel({ division: "DIV-04" }, div), "Creative");
  const r = resolveInvitations(PEOPLE, [{ role: "managers", company: "IEL" }, { division: "DIV-04", company: "IEL" }], ["PPL-1"], ["PPL-2"], div);
  assert.deepEqual(r.invitees.map((i) => `${i.person_id}:${i.via}`), ["PPL-5:Managers in IELSco", "PPL-3:Creative, IELSco", "PPL-1:null"]);
  assert.deepEqual(r.alreadyInvited.map((i) => i.person_id), ["PPL-2"]);
  assert.deepEqual(r.duplicates.map((d) => `${d.person_id}:${d.groups.length}`), ["PPL-5:2"]);
  assert.deepEqual(resolveInvitations(PEOPLE, [{ role: "c_level", division: "DIV-07" }], []).empty, ["C-Level in DIV-07"]);
});

test("a group re-applied to an event shows who joined and who left; nothing changes by itself", () => {
  const current = [{ person_id: "PPL-2", via_group: "Managers in IELSco" }, { person_id: "PPL-7", via_group: "Managers in IELSco" }];
  const d = groupDiff(PEOPLE, { role: "managers", company: "IEL" }, current);
  assert.deepEqual(d.joined, ["PPL-5"]);
  assert.deepEqual(d.left, ["PPL-7"]);
});

// ── Conflicts
test("busy series are expanded; clashes ignore all-day items and the event itself", () => {
  const rows = [
    { person_id: "PPL-2", source: "event", ref_id: "EV-9", title: "Growth weekly", starts_at: MON.starts_at, ends_at: MON.ends_at, all_day: false, timezone: "Asia/Jakarta", recurrence: { freq: "weekly" }, exceptions: [] },
    { person_id: "PPL-3", source: "event", ref_id: null, title: "Busy", starts_at: "2026-11-23T03:30:00.000Z", ends_at: "2026-11-23T05:00:00.000Z", all_day: false, timezone: null, recurrence: null, exceptions: null },
    { person_id: "PPL-3", source: "event", ref_id: "EV-8", title: "Offsite", starts_at: "2026-11-22T17:00:00.000Z", ends_at: "2026-11-23T17:00:00.000Z", all_day: true, timezone: null, recurrence: null, exceptions: null },
    { person_id: "PPL-5", source: "task", ref_id: "TSK-1", title: "Edit video", starts_at: "2026-11-23T04:00:00.000Z", ends_at: "2026-11-23T06:00:00.000Z", all_day: false, timezone: null, recurrence: null, exceptions: null },
  ];
  const blocks = busyBlocks(rows, "2026-11-23T00:00:00Z", "2026-11-24T00:00:00Z");
  assert.equal(blocks.length, 4);
  const names = new Map([["PPL-2", "Nadia"], ["PPL-3", "Farrel"], ["PPL-5", "Budi"]]);
  const c = findConflicts({ starts_at: "2026-11-23T03:00:00.000Z", ends_at: "2026-11-23T04:00:00.000Z", all_day: false }, blocks, names);
  assert.deepEqual(c.map((x) => `${x.name}:${x.title}`), ["Nadia:Growth weekly", "Farrel:Busy"]);
  const editingSelf = findConflicts({ starts_at: "2026-11-23T03:00:00.000Z", ends_at: "2026-11-23T04:00:00.000Z", all_day: false, ignore: "EV-9" }, blocks, names);
  assert.deepEqual(editingSelf.map((x) => x.name), ["Farrel"]);
  assert.equal(findConflicts({ starts_at: "2026-11-23T03:00:00.000Z", ends_at: "2026-11-23T04:00:00.000Z", all_day: true }, blocks, names).length, 0);
});

test("milestone and deadline warnings, and when a reschedule needs confirming", () => {
  const w = linkWarnings("2026-12-05", { milestone: { id: "TL-012", title: "GIF launch", due_date: "2026-12-01", is_major: true, status: "In progress" }, taskDue: [{ id: "TSK-1", title: "Poster", due_date: "2026-12-10" }] });
  assert.deepEqual(w, ["This is after major milestone TL-012 “GIF launch”, due 2026-12-01."]);
  assert.deepEqual(rescheduleReasons({ attendees: 2, inGoogle: false, majorMilestone: false, conflicts: 0, warnings: 0, recurring: false }), []);
  assert.equal(rescheduleReasons({ attendees: 8, inGoogle: true, majorMilestone: true, conflicts: 1, warnings: 0, recurring: false }).length, 4);
});

// ── Time grid layout and moving events ────────────────────────────────────────────────────────────────────────────
import { layoutDay, minutesToTime } from "../src/lib/os/calendar.ts";
import { moveEvent } from "../src/lib/os/event-moves.ts";

test("time grid: overlapping blocks share columns, separate clusters reset", () => {
  const l = layoutDay([{ key: "a", start: 600, end: 660 }, { key: "b", start: 630, end: 690 }, { key: "c", start: 660, end: 720 }, { key: "d", start: 800, end: 860 }]);
  assert.deepEqual(l.get("a"), { col: 0, cols: 2 });
  assert.deepEqual(l.get("b"), { col: 1, cols: 2 });
  assert.deepEqual(l.get("c"), { col: 0, cols: 2 }); // reuses a's column once a ended
  assert.deepEqual(l.get("d"), { col: 0, cols: 1 });
  assert.equal(minutesToTime(607), "10:00");
  assert.equal(minutesToTime(-30), "00:00");
  assert.equal(minutesToTime(2000), "23:45");
});

// A stand-in Supabase client that records what moveEvent writes.
function fakeDb() {
  const calls = [];
  const q = (table) => {
    const c = { table, ops: [] };
    calls.push(c);
    const api = {
      update(v) { c.ops.push(["update", v]); return api; }, upsert(v, o) { c.ops.push(["upsert", v, o]); return api; }, insert(v) { c.ops.push(["insert", v]); return api; },
      delete() { c.ops.push(["delete"]); return api; }, select() { return api; }, eq(k, v) { c.ops.push(["eq", k, v]); return api; },
      maybeSingle: async () => ({ data: { id: "x", event_id: "x" }, error: null }), then: (r) => r({ data: [], error: null }),
    };
    return api;
  };
  return { calls, from: q, rpc: async (fn, args) => { calls.push({ rpc: fn, args }); return { data: "EV-0099", error: null }; } };
}

test("moving: a one-off event updates the row; nothing linked is touched", async () => {
  const db = fakeDb();
  const r = await moveEvent(db, { ...MON, recurrence: null }, null, "all", { starts_at: "2026-11-17T03:00:00.000Z", ends_at: "2026-11-17T04:00:00.000Z" });
  assert.equal(r.ok, true);
  assert.deepEqual(db.calls.map((c) => c.table ?? c.rpc), ["os_events"]);
  assert.deepEqual(db.calls[0].ops[0], ["update", { starts_at: "2026-11-17T03:00:00.000Z", ends_at: "2026-11-17T04:00:00.000Z" }]);
});

test("moving: one occurrence writes an exception; this-and-following splits; the whole series shifts its weekday", async () => {
  const ev = { ...MON, recurrence: { freq: "weekly", byweekday: ["MO"] } };
  const occ = { occurrence_start: "2026-11-23T03:00:00.000Z", starts_at: "2026-11-23T03:00:00.000Z", ends_at: "2026-11-23T04:00:00.000Z" };
  const tue = { starts_at: "2026-11-24T03:00:00.000Z", ends_at: "2026-11-24T04:00:00.000Z" };
  let db = fakeDb();
  await moveEvent(db, ev, occ, "this", tue);
  assert.equal(db.calls[0].table, "os_event_exceptions");
  assert.deepEqual(db.calls[0].ops[0][1], { event_id: "EV-0001", occurrence_start: occ.occurrence_start, ...tue });
  db = fakeDb();
  const f = await moveEvent(db, ev, occ, "following", tue);
  assert.deepEqual(f.changed, ["EV-0001", "EV-0099"]);
  assert.equal(db.calls[0].rpc, "os_split_series");
  assert.equal(db.calls[0].args.p_until, "2026-11-22");
  assert.deepEqual(db.calls[0].args.p.recurrence.byweekday, ["TU"]);
  db = fakeDb();
  await moveEvent(db, ev, occ, "all", tue);
  const upd = db.calls[0].ops[0][1];
  assert.equal(upd.starts_at, "2026-11-17T03:00:00.000Z"); // the series start moves by one day too
  assert.deepEqual(upd.recurrence.byweekday, ["TU"]);
});
