// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextStepFor } from "../src/lib/elco-next.ts";
const elcoNextStep = (s) => nextStepFor(s, "https://www.elcoai.com");

const S = (o) => ({ linked: true, active: false, exams: [], ...o });

test("IELSco offers the one Elco step that fits, always an Elco app route", () => {
  assert.equal(elcoNextStep(S({ linked: false })).id, "connect");
  assert.match(elcoNextStep(S({ linked: false })).href, /\/connect\/ielsco$/);
  assert.equal(elcoNextStep(S({})).id, "plans");
  assert.equal(elcoNextStep(S({ active: true, tier: "starter" })).id, "pro");
  assert.equal(elcoNextStep(S({ active: true, tier: "pro" })).id, "exams");
  assert.equal(elcoNextStep(S({ active: true, tier: "pro", exams: [{ modes: ["ielts"], ends_at: "x", source: "purchase" }] })).href.endsWith("/exam/ielts"), true);
  assert.equal(elcoNextStep(S({ exams: [{ modes: ["toefl"], ends_at: "x", source: "purchase" }] })).id, "exam");
  for (const s of [S({}), S({ active: true, tier: "starter" }), S({ active: true, tier: "pro" })]) assert.doesNotMatch(elcoNextStep(s).href, /\?ref=|elcoai\.com\/?(\?|$)/);
  assert.equal(elcoNextStep(null), null);
});
