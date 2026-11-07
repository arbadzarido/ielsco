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
