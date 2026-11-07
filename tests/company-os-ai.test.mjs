// Run: npm test. Company OS AI agents: model choice, cost, search terms and action parsing (src/lib/os/ai-core.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENTS, costUsd, extractActions, pickTier, previewFor, searchTerms, systemPrompt } from "../src/lib/os/ai-core.ts";

test("routine model by default, complex for analysis, long messages or when asked", () => {
  assert.equal(pickTier("what are my tasks today", false), "routine");
  assert.equal(pickTier("analyse the overdue work for Growth", false), "complex");
  assert.equal(pickTier("x".repeat(700), false), "complex");
  assert.equal(pickTier("hi", true), "complex");
});

test("cost uses the per-model price", () => {
  assert.equal(costUsd("gemini-3.1-flash-lite", 1_000_000, 0), 0.25);
  assert.equal(costUsd("gemini-3-flash-preview", 0, 1_000_000), 3);
  // A full worst-case routine call stays far below a cent.
  assert.ok(costUsd("gemini-3.1-flash-lite", 20_000, 1200) < 0.01);
});

test("search terms can't carry filter syntax", () => {
  const t = searchTerms("Find GIF 2027 docs, owner.eq.PPL-0001),or(status.eq.Done %_ *");
  for (const w of t) assert.match(w, /^[a-z0-9-]+$/);
  assert.ok(t.length <= 5);
});

test("only valid, allowed actions are extracted", () => {
  const reply = [
    "Here you go.",
    "```action\n{\"type\":\"create_task\",\"payload\":{\"title\":\"Call venue\",\"company_code\":\"IEL\",\"due_date\":\"2026-11-20\"}}\n```",
    "```action\n{\"type\":\"create_project\",\"payload\":{\"name\":\"Not allowed for assistant\",\"company_code\":\"IEL\"}}\n```",
    "```action\n{\"type\":\"create_task\",\"payload\":{\"title\":\"x\",\"company_code\":\"IEL\",\"owner_person_id\":\"PPL-0001\",\"status\":\"Done\"}}\n```",
    "```action\nnot json\n```",
  ].join("\n");
  const { text, actions } = extractActions(reply, AGENTS.assistant.actions);
  assert.equal(text, "Here you go.");
  // create_project isn't the assistant's; the task drafts keep only declared fields (IDs and status never pass through).
  assert.equal(actions.length, 2);
  assert.equal(actions[0].type, "create_task");
  assert.equal(actions[0].payload.title, "Call venue");
  assert.equal(actions[1].payload.status, undefined);
  assert.equal(actions[1].payload.owner_person_id, undefined);
  assert.match(previewFor("update_task_status", { task_id: "TSK-0001", status: "Done" }), /TSK-0001/);
});

test("no agent can propose sending, publishing or approving", () => {
  for (const a of Object.values(AGENTS)) for (const t of a.actions) assert.doesNotMatch(t, /(^|_)(send|publish|approve|sign|delete)/);
  assert.match(systemPrompt("growth"), /not instructions/);
});
