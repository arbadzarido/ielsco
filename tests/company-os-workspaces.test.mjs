// Division workspaces (src/lib/os/workspaces.ts): what the sidebar offers in each workspace. The database decides
// access; these checks make sure the menu never lists a section the person can't open.
import { test } from "node:test";
import assert from "node:assert/strict";
import { accessLabel, grantableRoles, workspaceFromPath, workspaceHref, workspaceNav, workspaceSections } from "../src/lib/os/workspaces.ts";

const ws = (code, extra = {}) => ({ division_id: "DIV-00", code, name: code, privacy: "open", access: "edit", roles: [], is_member: true, is_manager: false, is_lead: false, ...extra });

test("no access means an empty sidebar", () => {
  assert.deepEqual(workspaceNav(ws("FIN", { privacy: "restricted", access: "none" })), []);
  assert.deepEqual(workspaceNav(ws("GRO", { access: "none" })), []);
});

test("restricted workspaces have no project or task lists; Finance and Legal have their registers", () => {
  assert.deepEqual(workspaceSections(ws("XYZ", { privacy: "restricted" })), ["overview", "meetings", "documents", "access"]);
  assert.deepEqual(workspaceSections(ws("FIN", { privacy: "restricted" }), { requests: true }), ["overview", "ledger", "budgets", "cashflow", "meetings", "documents", "requests", "setup", "access"]);
  assert.deepEqual(workspaceSections(ws("LEG", { privacy: "restricted" }), { requests: true }), ["overview", "letters", "agreements", "compliance", "meetings", "documents", "requests", "numbering", "access"]);
  assert.deepEqual(workspaceSections(ws("OPS")), ["overview", "projects", "tasks", "meetings", "documents", "access"]);
  assert.deepEqual(workspaceSections(ws("OPS"), { requests: true }), ["overview", "projects", "tasks", "meetings", "documents", "requests", "access"]);
});

test("division modules sit before Members and access", () => {
  const nav = workspaceNav(ws("GRO"));
  assert.deepEqual(nav.map((i) => i.label), ["Overview", "Projects", "Tasks", "Meetings", "Documents", "Campaigns", "Members and access"]);
  assert.equal(nav[0].href, "/os/d/gro");
  assert.equal(nav[1].href, "/os/d/gro?tab=projects");
});

test("Recruitment shows in People only with recruitment access", () => {
  assert.ok(!workspaceNav(ws("PPL")).some((i) => i.label === "Recruitment"));
  assert.ok(workspaceNav(ws("PPL"), { recruitment: true }).some((i) => i.label === "Recruitment"));
  assert.ok(workspaceNav(ws("PPL")).some((i) => i.label === "People"));
});

test("roles a giver may offer mirror the database rule", () => {
  assert.deepEqual(grantableRoles("FIN", { founder: false, lead: false }), []);
  assert.deepEqual(grantableRoles("FIN", { founder: false, lead: true }), ["viewer", "member", "officer"]);
  assert.deepEqual(grantableRoles("FIN", { founder: true, lead: false }), ["viewer", "member", "officer", "approver", "lead"]);
  assert.deepEqual(grantableRoles("LEG", { founder: true, lead: false }), ["viewer", "member", "officer", "signatory", "lead"]);
  assert.deepEqual(grantableRoles("GRO", { founder: true, lead: false }), ["viewer", "member", "officer", "lead"]);
});

test("access labels", () => {
  assert.equal(accessLabel(ws("FIN", { access: "none" })), "No access");
  assert.equal(accessLabel(ws("FIN", { roles: ["viewer", "approver"], is_member: false })), "Approver");
  assert.equal(accessLabel(ws("GRO", { is_lead: true })), "Lead");
  assert.equal(accessLabel(ws("GRO")), "Member");
  assert.equal(accessLabel(ws("GRO", { is_member: false, access: "view" })), "Can view");
});

test("paths and links", () => {
  assert.equal(workspaceFromPath("/os/d/fin"), "FIN");
  assert.equal(workspaceFromPath("/os/d/leg/anything"), "LEG");
  assert.equal(workspaceFromPath("/os/documents"), null);
  assert.equal(workspaceFromPath("/os/d/"), null);
  assert.equal(workspaceHref("LEG", "access"), "/os/d/leg?tab=access");
});
