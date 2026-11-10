// Division metrics helpers and the workspace's Metrics section.
import test from "node:test";
import assert from "node:assert/strict";
import { currentPeriod, metricValue, parseMetricValue } from "../src/lib/os/metrics.ts";
import { workspaceSections } from "../src/lib/os/workspaces.ts";

test("a weekly metric is logged for the ISO week, ending Sunday", () => {
  assert.deepEqual(currentPeriod("Weekly", "2026-11-10"), { label: "2026-W46", end: "2026-11-15" });
  assert.deepEqual(currentPeriod("weekly", "2026-11-15"), { label: "2026-W46", end: "2026-11-15" });
  assert.deepEqual(currentPeriod("Weekly", "2026-11-16"), { label: "2026-W47", end: "2026-11-22" });
});
test("the ISO week belongs to the year of its Thursday", () => {
  assert.deepEqual(currentPeriod("Weekly", "2027-01-01"), { label: "2026-W53", end: "2027-01-03" });
  assert.deepEqual(currentPeriod("Weekly", "2024-12-30"), { label: "2025-W01", end: "2025-01-05" });
});
test("monthly, quarterly and yearly periods end on their last day", () => {
  assert.deepEqual(currentPeriod("Monthly", "2026-11-10"), { label: "2026-11", end: "2026-11-30" });
  assert.deepEqual(currentPeriod("Monthly", "2028-02-10"), { label: "2028-02", end: "2028-02-29" });
  assert.deepEqual(currentPeriod("Quarterly", "2026-11-10"), { label: "2026-Q4", end: "2026-12-31" });
  assert.deepEqual(currentPeriod("Quarterly", "2027-02-01"), { label: "2027-Q1", end: "2027-03-31" });
  assert.deepEqual(currentPeriod("Annual", "2026-11-10"), { label: "2026", end: "2026-12-31" });
});
test("an unknown or empty reporting period falls back to the month", () => {
  assert.deepEqual(currentPeriod(null, "2026-11-10"), { label: "2026-11", end: "2026-11-30" });
  assert.deepEqual(currentPeriod("Per event", "2026-12-31"), { label: "2026-12", end: "2026-12-31" });
});
test("an empty or malformed value is never a number", () => {
  assert.equal(parseMetricValue(""), null);
  assert.equal(parseMetricValue("  "), null);
  assert.equal(parseMetricValue("twelve"), null);
  assert.equal(parseMetricValue("1e3"), null);
  assert.equal(parseMetricValue("0"), 0);
  assert.equal(parseMetricValue(" 12,5 "), 12.5);
  assert.equal(parseMetricValue("-3"), -3);
});
test("values show a percent sign only for percentages", () => {
  assert.equal(metricValue(45, "%"), "45%");
  assert.equal(metricValue(12, "count"), "12");
  assert.equal(metricValue(7, null), "7");
});
test("open workspaces have a Metrics section; Finance, Legal and other restricted ones don't", () => {
  const ws = (code, privacy = "open") => ({ code, privacy });
  assert.ok(workspaceSections(ws("GRO")).includes("metrics"));
  assert.ok(!workspaceSections(ws("FIN", "restricted")).includes("metrics"));
  assert.ok(!workspaceSections(ws("LEG", "restricted")).includes("metrics"));
  assert.ok(!workspaceSections(ws("XYZ", "restricted")).includes("metrics"));
});
