// Cross-division requests (src/lib/os/requests.ts): the steps each person is offered mirror the database functions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOpen, queueOrder, requestActions, requestStage, sendableTypes } from "../src/lib/os/requests.ts";

const r = (status, extra = {}) => ({ status, approval_status: "not_needed", requester_person_id: "PPL-1", owner_person_id: "PPL-2", ...extra });
const me = (personId, extra = {}) => ({ personId, leadTo: false, leadFrom: false, ...extra });

test("approval: the requesting lead, never the requester", () => {
  const p = r("submitted", { approval_status: "pending" });
  assert.deepEqual(requestActions(p, me("PPL-9", { leadFrom: true })), ["approve"]);
  assert.ok(!requestActions(p, me("PPL-1", { leadFrom: true })).includes("approve"));
  assert.ok(!requestActions(p, me("PPL-9", { leadTo: true })).includes("triage"), "no triage before approval");
});

test("triage: receiving lead once approval is settled", () => {
  assert.ok(requestActions(r("submitted"), me("PPL-9", { leadTo: true })).includes("triage"));
  assert.ok(requestActions(r("submitted", { approval_status: "approved" }), me("PPL-9", { leadTo: true })).includes("triage"));
  assert.ok(!requestActions(r("submitted"), me("PPL-2")).includes("triage"));
});

test("work: owner or receiving lead", () => {
  assert.deepEqual(requestActions(r("accepted"), me("PPL-2")), ["start", "add_task", "deliver"]);
  assert.deepEqual(requestActions(r("in_progress"), me("PPL-9", { leadTo: true })), ["assign", "add_task", "deliver"]);
  assert.deepEqual(requestActions(r("in_progress"), me("PPL-3")), []);
});

test("requester: edit while waiting, accept or send back when delivered, cancel before delivery", () => {
  assert.deepEqual(requestActions(r("info_needed"), me("PPL-1")), ["edit", "cancel"]);
  assert.deepEqual(requestActions(r("delivered"), me("PPL-1")), ["accept", "send_back"]);
  assert.deepEqual(requestActions(r("closed"), me("PPL-1")), []);
  assert.ok(!requestActions(r("delivered"), me("PPL-2")).includes("accept"), "the owner can't accept their own work");
});

test("stage labels and open states", () => {
  assert.equal(requestStage(r("submitted", { approval_status: "pending" })).label, "Waiting for approval");
  assert.equal(requestStage(r("delivered")).tone, "violet");
  assert.ok(isOpen(r("delivered")) && !isOpen(r("cancelled")));
});

test("queue order: open first, then deadline, then priority", () => {
  const rows = [
    { id: "a", status: "closed", due_date: "2026-01-01", priority: "P1 Critical", created_at: "1" },
    { id: "b", status: "submitted", due_date: "2026-02-01", priority: "P3 Normal", created_at: "1" },
    { id: "c", status: "submitted", due_date: "2026-02-01", priority: "P1 Critical", created_at: "2" },
    { id: "d", status: "in_progress", due_date: "2026-01-15", priority: "P4 Low", created_at: "3" },
  ];
  assert.deepEqual(queueOrder(rows).map((x) => x.id), ["d", "c", "b", "a"]);
});

test("routes a person can send", () => {
  const types = [
    { code: "design", from_division_id: "DIV-03", active: true, sort_order: 1 },
    { code: "budget", from_division_id: "DIV-02", active: true, sort_order: 4 },
    { code: "old", from_division_id: "DIV-03", active: false, sort_order: 9 },
  ];
  assert.deepEqual(sendableTypes(types, new Set(["DIV-03"]), false).map((t) => t.code), ["design"]);
  assert.deepEqual(sendableTypes(types, new Set(), true).map((t) => t.code), ["design", "budget"]);
});
