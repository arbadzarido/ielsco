// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { distance, suggest } from "../src/lib/didYouMean.ts";
import { TIPS, pickTip, tipContextFor } from "../src/lib/loadingTips.ts";
import { classifyError } from "../src/lib/errorKind.ts";

test("distance counts a swapped pair as one edit", () => {
  assert.equal(distance("scholrship", "scholarship"), 1);
  assert.equal(distance("form", "from"), 1);
  assert.equal(distance("same", "same"), 0);
});

test("suggests the intended word for a typo, from the page's own terms", () => {
  const terms = ["Chevening Scholarship", "Global Impact Fellowship", "Erasmus exchange", "Summer internship"];
  assert.ok(suggest("scholrship", terms).includes("scholarship"));
  assert.ok(suggest("fellowhsip", terms).includes("fellowship"));
  assert.equal(suggest("japan scholrship", terms)[0], "japan scholarship");
});

test("no suggestion when the query already matches, is unrelated or is too short", () => {
  const terms = ["Chevening Scholarship", "Erasmus exchange"];
  assert.deepEqual(suggest("scholarship", terms), []);
  assert.deepEqual(suggest("zzzzzz", terms), []);
  assert.deepEqual(suggest("sc", terms), []);
});

test("tips exist for every context, never repeat back to back, and routes map to contexts", () => {
  for (const k of Object.keys(TIPS)) assert.ok(TIPS[k].length > 2, k);
  const a = pickTip("opportunities", () => 0), b = pickTip("opportunities", () => 0);
  assert.notEqual(a, b);
  assert.equal(tipContextFor("/opportunities/chevening"), "opportunities");
  assert.equal(tipContextFor("/dashboard/discover/opportunities"), "opportunities");
  assert.equal(tipContextFor("/dashboard/connect/discover"), "community");
  assert.equal(tipContextFor("/dashboard/events/ielsco"), "events");
  assert.equal(tipContextFor("/about"), "general");
});

test("errors are told apart: offline and fetch failures are network, 401 is session, 404 is not_found, the rest is server", () => {
  assert.equal(classifyError(new TypeError("Failed to fetch"), true), "network");
  assert.equal(classifyError(new Error("anything"), false), "network");
  assert.equal(classifyError({ status: 401 }, true), "session");
  assert.equal(classifyError({ message: "JWT expired" }, true), "session");
  assert.equal(classifyError({ status: 404 }, true), "not_found");
  assert.equal(classifyError({ status: 403 }, true), "unavailable");
  assert.equal(classifyError({ status: 500, message: "boom" }, true), "server");
  assert.equal(classifyError(null, true), "server");
});
