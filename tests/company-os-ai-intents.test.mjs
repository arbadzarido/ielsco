// Company OS AI intents (src/lib/os/ai-intents.ts): turning words into real records without inventing anything.
import { test } from "node:test";
import assert from "node:assert/strict";
import { dateContext, draftsOf, intentPreview, resolveIntent, resolvePeople } from "../src/lib/os/ai-intents.ts";

const person = (id, full_name, companies, extra = {}) => ({ id, full_name, short_name: null, org_role: "member", status: "active", companies, divisions: [], ...extra });
const dir = {
  me: "PPL-0002", today: "2026-11-07", myCompanies: ["IEL"],
  people: [
    person("PPL-0002", "Arbadza Rido", ["HQ", "IEL", "ELC"], { org_role: "founder" }),
    person("PPL-0003", "Farrel Pratama", ["IEL"], { divisions: ["DIV-03"] }),
    person("PPL-0004", "Nadia Putri", ["IEL"], { divisions: ["DIV-03"] }),
    person("PPL-0005", "Nadia Safitri", ["IEL"], { divisions: ["DIV-04"] }),
    person("PPL-0006", "Budi Elco", ["ELC"]),
    person("PPL-0007", "Gita Guest", ["IEL"], { org_role: "guest" }),
  ],
  divisions: [{ id: "DIV-03", code: "GRO", name: "Growth" }, { id: "DIV-04", code: "CRE", name: "Creative" }],
  projects: [
    { id: "PRJ-0001", name: "Mojo Launch", company_code: "IEL", division_id: "DIV-03", status: "Active" },
    { id: "PRJ-0002", name: "Website Refresh", company_code: "IEL", division_id: "DIV-04", status: "Active" },
    { id: "PRJ-0003", name: "Website Refresh Phase 2", company_code: "IEL", division_id: null, status: "Proposed" },
  ],
  workstreams: [{ code: "WS1", name: "Product & Launch", company_code: "HQ" }, { code: "WS2", name: "Community", company_code: "HQ" }],
  milestones: [{ id: "TL-001", title: "Mojo beta", company_code: "HQ" }],
  tasks: [{ id: "TSK-0010", title: "Design poster", company_code: "IEL", project_id: null, status: "Ready" }],
};

test("a unique first name resolves to that person's real ID", () => {
  const [t] = resolveIntent("create_task", draftsOf("create_task", { title: "Write brief", assignees: ["Farrel"], due_date: "2026-11-13" }), dir);
  assert.deepEqual(t.issues, []);
  assert.equal(t.insert.owner_person_id, "PPL-0003");
  assert.deepEqual(t.insert.assignees, ["PPL-0003"]);
  assert.equal(t.insert.company_code, "IEL"); // the person's only company
  assert.ok(t.fields.some((f) => f.label === "Deadline" && f.value === "Fri 2026-11-13"));
});

test("an ambiguous name lists every match and blocks creation", () => {
  const [t] = resolveIntent("create_task", draftsOf("create_task", { title: "Poster", assignees: ["Nadia"] }), dir);
  assert.equal(t.insert, null);
  assert.equal(t.issues[0].kind, "ambiguous");
  assert.deepEqual(t.issues[0].choices.map((c) => c.value), ["PPL-0004", "PPL-0005"]);
  // Choosing replaces the name with the ID; resolving again is clean.
  const [again] = resolveIntent("create_task", draftsOf("create_task", { ...t.draft, assignees: ["PPL-0005"] }), dir);
  assert.deepEqual(again.issues, []);
  assert.equal(again.insert.owner_person_id, "PPL-0005");
});

test("unknown people are never invented, and guests or other companies' people can't be assigned", () => {
  const r = resolvePeople(["Zelda", "Gita Guest", "Budi"], dir, "IEL", "assignees");
  assert.deepEqual(r.ids, []);
  assert.deepEqual(r.issues.map((i) => i.kind), ["not_found", "invalid", "invalid"]);
  assert.match(r.issues[2].message, /doesn't work in IELSco/);
  assert.ok(r.issues[0].choices.every((c) => c.value !== "PPL-0006" && c.value !== "PPL-0007"));
});

test("project names resolve, inherit the company and division, and ambiguity asks", () => {
  const [t] = resolveIntent("create_task", draftsOf("create_task", { title: "QA build", project: "Mojo" }), dir);
  assert.deepEqual(t.issues, []);
  assert.equal(t.insert.project_id, "PRJ-0001");
  assert.equal(t.insert.division_id, "DIV-03");
  const [w] = resolveIntent("create_task", draftsOf("create_task", { title: "x", project: "Website" }), dir);
  assert.equal(w.issues[0].kind, "ambiguous");
  const [n] = resolveIntent("create_task", draftsOf("create_task", { title: "x", project: "Nonexistent thing" }), dir);
  assert.equal(n.issues[0].kind, "not_found");
});

test("a division by name; an unclear deadline or company becomes a question", () => {
  const [t] = resolveIntent("create_task", draftsOf("create_task", { title: "Reels", division: "Creative division", unclear: ["due_date"] }), dir);
  assert.equal(t.draft.division, "DIV-04");
  assert.equal(t.issues.length, 1);
  assert.equal(t.issues[0].field, "due_date");
  const founder = { ...dir, me: "PPL-0002", myCompanies: ["HQ", "IEL", "ELC"] };
  const [c] = resolveIntent("create_task", draftsOf("create_task", { title: "Something" }), founder);
  assert.equal(c.issues[0].field, "company");
  assert.equal(c.issues[0].choices.length, 3);
  const [x] = resolveIntent("create_task", draftsOf("create_task", { title: "Something", company: "Elco" }), dir);
  assert.equal(x.issues[0].kind, "invalid"); // this person doesn't work in Elco
});

test("a batch of tasks is listed in full and each is resolved", () => {
  const drafts = draftsOf("create_tasks", { tasks: [{ title: "A", division: "Growth" }, { title: "B", division: "Growth" }, { title: "C", division: "Growth", assignees: ["Nadia"] }] });
  const items = resolveIntent("create_tasks", drafts, dir);
  assert.equal(items.length, 3);
  assert.equal(items.filter((i) => i.issues.length).length, 1);
  assert.match(intentPreview("create_tasks", items), /Create 3 tasks \(needs your input\)/);
  assert.equal(draftsOf("create_tasks", { tasks: Array.from({ length: 11 }, (_, i) => ({ title: `T${i}` })) }), null);
});

test("a duplicate open task is flagged", () => {
  const [t] = resolveIntent("create_task", draftsOf("create_task", { title: "design poster" }), dir);
  assert.ok(t.warnings.some((w) => w.includes("TSK-0010")));
});

test("a meeting at 2 PM Jakarta time, inviting the Growth division", () => {
  const [e] = resolveIntent("create_event", draftsOf("create_event", { title: "Growth weekly", date: "2026-11-10", start_time: "14:00", division: "Growth", invite_division: true }), dir);
  assert.deepEqual(e.issues, []);
  assert.equal(e.insert.starts_at, "2026-11-10T07:00:00.000Z");
  assert.equal(e.insert.ends_at, "2026-11-10T08:00:00.000Z");
  assert.deepEqual(e.insert.attendees.sort(), ["PPL-0003", "PPL-0004"]);
  assert.equal(e.insert.category, "Meeting");
  const [noTime] = resolveIntent("create_event", draftsOf("create_event", { title: "Sync", date: "2026-11-10" }), dir);
  assert.equal(noTime.issues[0].field, "start_time");
  const [allDay] = resolveIntent("create_event", draftsOf("create_event", { title: "Expo", date: "2026-11-10", end_date: "2026-11-12", all_day: true, category: "Event" }), dir);
  assert.equal(allDay.insert.starts_at, "2026-11-09T17:00:00.000Z");
  assert.equal(allDay.insert.ends_at, "2026-11-12T17:00:00.000Z"); // exclusive: midnight after the last day
});

test("a milestone needs a workstream; one is matched by name", () => {
  const [m] = resolveIntent("create_timeline_item", draftsOf("create_timeline_item", { title: "Mojo public launch", due_date: "2026-11-12", project: "Mojo" }), dir);
  assert.equal(m.issues[0].field, "workstream");
  assert.equal(m.issues[0].choices.length, 2);
  const [ok] = resolveIntent("create_timeline_item", draftsOf("create_timeline_item", { title: "Mojo public launch", due_date: "2026-11-12", project: "Mojo", workstream: "product" }), dir);
  assert.deepEqual(ok.issues, []);
  assert.equal(ok.insert.workstream_code, "WS1");
  assert.equal(ok.insert.linked_refs, "PRJ-0001");
});

test("assigning an existing task by its title", () => {
  const [a] = resolveIntent("assign_task", draftsOf("assign_task", { task: "Design poster", assignees: ["Farrel"] }), dir);
  assert.deepEqual(a.insert, { task_id: "TSK-0010", assignees: ["PPL-0003"], replace: false });
});

test("drafts reject bad dates, times and non-https links", () => {
  assert.equal(draftsOf("create_task", { title: "x", due_date: "Friday" }), null);
  assert.equal(draftsOf("create_event", { title: "x", date: "2026-11-10", start_time: "2pm" }), null);
  assert.equal(draftsOf("create_event", { title: "x", date: "2026-11-10", meeting_url: "http://meet.example" }), null);
});

test("the model gets today and the next two weeks with weekdays", () => {
  const c = dateContext("2026-11-07");
  assert.match(c, /Today is Saturday 2026-11-07/);
  assert.match(c, /2026-11-10 Tuesday/);
  assert.match(c, /2026-11-21 Saturday/);
});

// ── Planning: the assistant examples from the brief ───────────────────────────────────────────────────────────────
// 2026-11-07 is a Saturday. Times are Asia/Jakarta (UTC+7).
const MGR = (id, name, extra = {}) => person(id, name, ["IEL"], { org_role: "manager", ...extra });
const pdir = {
  ...dir,
  people: [...dir.people, MGR("PPL-0008", "Maya Manager", { divisions: ["DIV-03"] }), MGR("PPL-0009", "Rudi Lead", { divisions: ["DIV-04"], managed: ["DIV-04"] }),
    person("PPL-0010", "Eko Elco Manager", ["ELC"], { org_role: "manager" }), MGR("PPL-0011", "Former Manager", { status: "inactive" })],
  campaigns: [{ id: "CMP-0001", name: "January Intake", company_code: "IEL", project_id: null, timeline_item_id: null, status: "Planned" }],
  partnerships: [{ id: "OPP-0001", organisation: "British Council", company_code: "IEL" }],
  events: [
    { id: "EV-0001", title: "GIF preparation meeting", company_code: "IEL", category: "Meeting", starts_at: "2026-11-12T03:00:00.000Z", ends_at: "2026-11-12T04:00:00.000Z", all_day: false, timezone: "Asia/Jakarta", recurrence: null, exceptions: [], status: "Scheduled" },
    { id: "EV-0002", title: "Monthly company review", company_code: "IEL", category: "Meeting", starts_at: "2026-11-30T02:00:00.000Z", ends_at: "2026-11-30T03:00:00.000Z", all_day: false, timezone: "Asia/Jakarta", recurrence: { freq: "monthly" }, exceptions: [], status: "Scheduled" },
    { id: "EV-0003", title: "Partnership signing event", company_code: "IEL", category: "Partnership", starts_at: "2026-11-20T02:00:00.000Z", ends_at: "2026-11-20T05:00:00.000Z", all_day: false, timezone: "Asia/Jakarta", recurrence: null, exceptions: [], status: "Scheduled" },
    { id: "EV-0004", title: "Growth weekly", company_code: "IEL", category: "Meeting", starts_at: "2026-11-09T03:00:00.000Z", ends_at: "2026-11-09T04:00:00.000Z", all_day: false, timezone: "Asia/Jakarta", recurrence: { freq: "weekly", byweekday: ["MO"] }, exceptions: [], status: "Scheduled" },
  ],
};
const one = (type, payload) => resolveIntent(type, draftsOf(type, payload), pdir)[0];

test("example 1: a weekly Growth meeting every Monday at 10 AM is one repeating event", () => {
  const e = one("create_event", { title: "Growth weekly sync", date: "2026-11-09", start_time: "10:00", end_time: "11:00", division: "Growth", invite_division: true, repeat: "weekly" });
  assert.deepEqual(e.issues, []);
  assert.deepEqual(e.insert.recurrence, { freq: "weekly", byweekday: ["MO"] });
  assert.equal(e.insert.starts_at, "2026-11-09T03:00:00.000Z");
  assert.ok(e.fields.some((f) => f.label === "Repeats" && /Monday/.test(f.value)));
});

test("example 2: creating a campaign resolves its owner and checks the dates", () => {
  const c = one("create_campaign", { name: "Ramadan Promo", start_date: "2027-02-01", end_date: "2027-03-15", owner: "Farrel" });
  assert.deepEqual(c.issues, []);
  assert.equal(c.insert.owner_person_id, "PPL-0003");
  assert.equal(c.insert.company_code, "IEL");
  const bad = one("create_campaign", { name: "Backwards", start_date: "2027-03-01", end_date: "2027-02-01" });
  assert.equal(bad.insert, null);
});

test("example 3: a campaign launch on 10 January linked to the campaign and a timeline milestone", () => {
  const e = one("create_event", { title: "January Intake launch", category: "Campaign", date: "2027-01-10", all_day: true, campaign: "January Intake", milestone: "Mojo beta" });
  assert.deepEqual(e.issues, []);
  assert.equal(e.insert.campaign_id, "CMP-0001");
  assert.equal(e.insert.timeline_item_id, "TL-001");
  assert.equal(e.insert.recurrence, null);
});

test("example 4: content slots every weekday become separate content items, not tasks", () => {
  const c = one("create_content_items", { title: "Daily English tip", channel: "Instagram", from: "2026-11-09", to: "2026-11-15", pattern: "weekdays", time: "18:00", creator: "Farrel", reviewer: "Maya" });
  assert.deepEqual(c.issues, []);
  assert.equal(c.kind, "content");
  assert.equal(c.insert.items.length, 5);
  assert.deepEqual(c.insert.items.map((i) => i.planned_publish_date), ["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13"]);
  assert.equal(c.insert.items[0].publish_at, "2026-11-09T11:00:00.000Z");
  assert.equal(c.insert.items[0].reviewer_person_id, "PPL-0008");
  const tooMany = one("create_content_items", { title: "Tip", from: "2026-11-09", to: "2027-01-30", pattern: "daily" });
  assert.equal(tooMany.insert, null);
});

test("example 5: move the GIF preparation meeting from Thursday to Friday keeps its time and touches nothing else", () => {
  const m = one("move_event", { event: "GIF preparation", from_date: "2026-11-12", to_date: "2026-11-13" });
  assert.deepEqual(m.issues, []);
  assert.equal(m.insert.event_id, "EV-0001");
  assert.equal(m.insert.starts_at, "2026-11-13T03:00:00.000Z");
  assert.equal(m.insert.ends_at, "2026-11-13T04:00:00.000Z");
  assert.ok(m.fields.some((f) => /not changed/.test(f.value)));
  const wrongDay = one("move_event", { event: "GIF preparation", from_date: "2026-11-11", to_date: "2026-11-13" });
  assert.equal(wrongDay.insert, null);
});

test("moving a repeating meeting asks which occurrences, then splits or moves only what was chosen", () => {
  const ask = one("move_event", { event: "Growth weekly", from_date: "2026-11-16", to_date: "2026-11-17" });
  assert.equal(ask.insert, null);
  assert.equal(ask.issues[0].field, "scope");
  const m = one("move_event", { event: "Growth weekly", from_date: "2026-11-16", to_date: "2026-11-17", scope: "this" });
  assert.deepEqual(m.issues, []);
  assert.equal(m.insert.occurrence_start, "2026-11-16T03:00:00.000Z");
  assert.equal(m.insert.starts_at, "2026-11-17T03:00:00.000Z");
});

test("example 7: three preparation tasks linked to the upcoming partnership event", () => {
  const items = resolveIntent("create_tasks", draftsOf("create_tasks", { tasks: ["Book venue", "Print MoU", "Brief speakers"].map((title) => ({ title, event: "partnership event", due_date: "2026-11-18" })) }), pdir);
  assert.equal(items.length, 3);
  for (const t of items) { assert.deepEqual(t.issues, []); assert.equal(t.insert.event_id, "EV-0003"); }
});

test("example 8: invite all IELSco managers to the monthly company review, from the registry only", () => {
  const i = one("invite_to_event", { event: "monthly company review", groups: ["all IELSco managers"] });
  assert.deepEqual(i.issues, []);
  const ids = i.insert.attendees.map((a) => a.person_id).sort();
  // Active IELSco managers (by role or by managing a division); not the Elco manager, not the inactive one, not guests.
  assert.deepEqual(ids, ["PPL-0008", "PPL-0009"]);
  assert.ok(i.insert.attendees.every((a) => a.via_group === "Managers in IELSco"));
  const nobody = one("invite_to_event", { event: "monthly company review", groups: ["the moon team"] });
  assert.equal(nobody.insert, null);
});

test("event groups: C-Level and a division; an unknown group is a question, never a guess", () => {
  const e = one("create_event", { title: "Strategy", date: "2026-11-10", start_time: "09:00", invite_groups: ["C-Level", "Creative"] });
  assert.deepEqual(e.issues, []);
  assert.deepEqual(e.insert.attendees.map((a) => (typeof a === "string" ? a : a.person_id)).sort(), ["PPL-0002", "PPL-0005", "PPL-0009"]);
  assert.deepEqual(e.draft.attendees, []); // stored draft keeps groups, not their members
});
