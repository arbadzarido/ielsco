// HQ structure, task table filters/grouping and division workspace sections (src/lib/os/org.ts, workspaces.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEPARTMENTS, DIVISIONS, departmentOfDivision, filterTasks, groupTasks, monthKey, monthLabel, partnerCategoryLabel } from "../src/lib/os/org.ts";
import { HQ_DIVISIONS, workspaceSections } from "../src/lib/os/workspaces.ts";

const T = (id, o = {}) => ({ id, title: `Task ${id}`, status: "Backlog", priority: "P3 Normal", owner_person_id: "PPL-0001", due_date: null, division_id: null, department: null, project_id: null, company_code: "IEL", ...o });
const ctx = { me: "PPL-0001", assignees: new Map([["T4", ["PPL-0001"]]]), today: "2026-11-26", soon: "2026-12-10" };

test("two departments, six divisions, each in exactly one department", () => {
  assert.deepEqual(DEPARTMENTS.map((d) => d.key), ["operations", "growth"]);
  assert.equal(DIVISIONS.length, 6);
  for (const d of DEPARTMENTS) for (const c of d.divisions) assert.equal(DIVISIONS.find((x) => x.code === c).department, d.key);
  assert.equal(departmentOfDivision("DIV-06"), "operations");
  assert.equal(departmentOfDivision("DIV-10"), "growth");
  assert.equal(departmentOfDivision("DIV-01"), null, "Community is retired");
  assert.equal(DIVISIONS.find((d) => d.id === "DIV-06").name, "Business");
});

test("views: mine, overdue, upcoming, needs cleanup", () => {
  const rows = [T("T1", { due_date: "2026-11-20" }), T("T2", { due_date: "2026-12-01", status: "Ready" }), T("T3", { owner_person_id: "PPL-0002", status: "Done", due_date: "2026-11-01" }),
    T("T4", { owner_person_id: "PPL-0003", due_date: "2027-01-05", status: "In Progress" }), T("T5", { owner_person_id: "PPL-0002", due_date: "2026-11-10", status: "Ready" })];
  assert.deepEqual(filterTasks(rows, {}, "mine", ctx).map((t) => t.id), ["T1", "T2", "T4"]);
  assert.deepEqual(filterTasks(rows, {}, "overdue", ctx).map((t) => t.id), ["T1", "T5"]);
  assert.deepEqual(filterTasks(rows, {}, "upcoming", ctx).map((t) => t.id), ["T2"]);
  assert.deepEqual(filterTasks(rows, {}, "stale", ctx).map((t) => t.id), ["T1"]);
  assert.deepEqual(filterTasks(rows, {}, "all", ctx).map((t) => t.id), ["T1", "T2", "T4", "T5"], "done hidden by default");
  assert.deepEqual(filterTasks(rows, { showDone: true }, "all", ctx).length, 5);
  assert.deepEqual(filterTasks(rows, { status: "Done" }, "all", ctx).map((t) => t.id), ["T3"], "a status filter shows that status even if closed");
});

test("filters: project, department (derived from division), division, month, PIC", () => {
  const rows = [T("A", { project_id: "PRJ-0033", division_id: "DIV-02", due_date: "2026-12-05" }), T("B", { department: "growth" }), T("C", { division_id: "DIV-10", due_date: "2027-01-03" }), T("D", { owner_person_id: null })];
  assert.deepEqual(filterTasks(rows, { project: "PRJ-0033" }, "all", ctx).map((t) => t.id), ["A"]);
  assert.deepEqual(filterTasks(rows, { project: "none" }, "all", ctx).map((t) => t.id), ["B", "C", "D"]);
  assert.deepEqual(filterTasks(rows, { department: "growth" }, "all", ctx).map((t) => t.id), ["B", "C"]);
  assert.deepEqual(filterTasks(rows, { department: "operations" }, "all", ctx).map((t) => t.id), ["A"]);
  assert.deepEqual(filterTasks(rows, { division: "DIV-10" }, "all", ctx).map((t) => t.id), ["C"]);
  assert.deepEqual(filterTasks(rows, { month: "2026-12" }, "all", ctx).map((t) => t.id), ["A"]);
  assert.deepEqual(filterTasks(rows, { month: "none" }, "all", ctx).map((t) => t.id), ["B", "D"]);
  assert.deepEqual(filterTasks(rows, { owner: "none" }, "all", ctx).map((t) => t.id), ["D"]);
});

test("grouping: months in date order, statuses by urgency, none last", () => {
  const rows = [T("A", { due_date: "2027-01-02" }), T("B", { due_date: "2026-12-30" }), T("C"), T("D", { due_date: "2026-12-01", status: "Blocked" })];
  assert.deepEqual(groupTasks(rows, "month", (k) => k).map((g) => g.key), ["2026-12", "2027-01", "none"]);
  assert.deepEqual(groupTasks(rows, "status", (k) => k).map((g) => g.key), ["Blocked", "Backlog"]);
  assert.deepEqual(groupTasks(rows, "none", (k) => k).map((g) => g.rows.length), [4]);
  assert.equal(monthKey("2026-12-31"), "2026-12");
  assert.equal(monthLabel("2027-03"), "March 2027");
  assert.equal(monthLabel("none"), "No deadline");
});

test("partner categories", () => {
  assert.equal(partnerCategoryLabel("recruitment"), "Recruitment Partnership");
  assert.equal(partnerCategoryLabel(null), "Uncategorised");
});

test("HQ divisions get Workflow and Guide tabs; Finance, Legal and others don't", () => {
  for (const code of HQ_DIVISIONS) {
    const s = workspaceSections({ code, privacy: "open" });
    assert.deepEqual(s.slice(0, 3), ["overview", "workflow", "guide"], code);
    assert.ok(s.includes("tasks") && s.includes("metrics") && s.at(-1) === "access");
  }
  assert.ok(!workspaceSections({ code: "FIN", privacy: "restricted" }).includes("workflow"));
  assert.ok(!workspaceSections({ code: "XYZ", privacy: "open" }).includes("guide"));
});
