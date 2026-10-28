// Run: npm test   (Node >= 22.6 with type stripping; Node 23.6+ needs no flag)
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { HELP_TOPICS, searchTopics, topicsFor, quickMatchStatus } from "../src/lib/copilot.ts";

const page = (href) => `src/app${href === "/dashboard" ? "/dashboard" : href}/page.tsx`;

test("every help answer links to a page that exists", () => {
  for (const t of HELP_TOPICS) assert.ok(existsSync(page(t.href)), `${t.id} -> ${t.href}`);
});

test("contextual order: the page's own topic first, then its section", () => {
  assert.equal(topicsFor("/dashboard/connect/quick-match", "connect")[0].id, "quickmatch");
  assert.equal(topicsFor("/dashboard/circles/cross-cultural", "discover")[0].id, "circles");
  assert.deepEqual(topicsFor("/dashboard/social", "social").slice(0, 3).map((t) => t.id), ["intro", "messages", "safety"]);
  assert.equal(topicsFor("/dashboard", null)[0].id, "how");
  assert.equal(topicsFor("/dashboard", null).length, HELP_TOPICS.length);
});

test("search finds the right answer and nothing for nonsense", () => {
  assert.equal(searchTopics("where are scholarships")[0].id, "opportunities");
  assert.equal(searchTopics("how do I block someone")[0].id, "safety");
  assert.equal(searchTopics("join a circle")[0].id, "circles");
  assert.equal(searchTopics("videos")[0].id, "pulse");
  assert.deepEqual(searchTopics("zzzz qqqq"), []);
  assert.deepEqual(searchTopics("a"), []);
});

test("Quick Match status is stated honestly", () => {
  assert.match(quickMatchStatus(false), /isn't switched on/);
  assert.match(quickMatchStatus(true), /open now/);
  assert.equal(quickMatchStatus(null), null);
});
