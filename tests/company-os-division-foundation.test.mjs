// Division foundation: which minutes steps a person is offered, and the meetings section in every workspace.
import test from "node:test";
import assert from "node:assert/strict";
import { meetingSteps } from "../src/lib/os/meetings.ts";
import { workspaceSections } from "../src/lib/os/workspaces.ts";

const m = (o = {}) => ({ status: "Held", reviewer_person_id: null, created_by: "A", notes: "Long enough minutes.", ...o });
const who = (o = {}) => ({ personId: "A", editor: true, lead: false, founder: false, ...o });

test("the author sends minutes for review only once they are written", () => {
  assert.deepEqual(meetingSteps(m(), who()), ["submit"]);
  assert.deepEqual(meetingSteps(m({ notes: "short" }), who()), []);
  assert.deepEqual(meetingSteps(m({ status: "Scheduled" }), who()), ["hold"]);
});
test("the author never approves their own minutes, even as lead", () => {
  assert.deepEqual(meetingSteps(m({ status: "In review" }), who({ lead: true })), []);
});
test("the division lead approves when no reviewer is named", () => {
  assert.deepEqual(meetingSteps(m({ status: "In review" }), who({ personId: "B", editor: false, lead: true })), ["approve", "return"]);
});
test("a named reviewer approves, and the lead then does not", () => {
  assert.deepEqual(meetingSteps(m({ status: "In review", reviewer_person_id: "R" }), who({ personId: "R", editor: false })), ["approve", "return"]);
  assert.deepEqual(meetingSteps(m({ status: "In review", reviewer_person_id: "R" }), who({ personId: "B", lead: true })), []);
});
test("a founder may approve minutes they wrote", () => {
  assert.deepEqual(meetingSteps(m({ status: "In review" }), who({ lead: true, founder: true })), ["approve", "return"]);
});
test("approved minutes can only be reopened by the approver", () => {
  assert.deepEqual(meetingSteps(m({ status: "Approved" }), who()), []);
  assert.deepEqual(meetingSteps(m({ status: "Approved" }), who({ personId: "B", lead: true })), ["reopen"]);
});
test("every workspace has a meetings section", () => {
  for (const ws of [{ privacy: "open", code: "GRO" }, { privacy: "restricted", code: "FIN" }, { privacy: "restricted", code: "LEG" }, { privacy: "restricted", code: "X" }]) {
    assert.ok(workspaceSections(ws, { requests: true }).includes("meetings"), ws.code);
  }
});
