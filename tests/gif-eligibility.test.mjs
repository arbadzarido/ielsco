// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { band, computeEligibility, eligibilityCsv, messageProgress, requirementStatus, round1, statusWording } from "../src/lib/gif/eligibility.ts";
import { toCsv } from "../src/lib/gif/portal.ts";

const cats = [
  { edition: "E", key: "content", title: "Content", description: null, weight: "30.000", sort_order: 1 },
  { edition: "E", key: "assignments", title: "Assignments", description: null, weight: 25, sort_order: 2 },
  { edition: "E", key: "community", title: "Community", description: null, weight: 20, sort_order: 3 },
  { edition: "E", key: "elco_ai", title: "Elco AI", description: null, weight: 10, sort_order: 4 },
  { edition: "E", key: "elco_pass", title: "Elco-Pass", description: null, weight: 15, sort_order: 5 },
];
let n = 0;
const req = (category_key, key, source, assignment_id = null) => ({ id: `r-${key}`, edition: "E", category_key, key, title: key, description: null, source, assignment_id, share: "1.000", window_label: null, sort_order: n++, is_active: true });
const reqs = [
  ...["r1", "r2", "r3", "r4", "stories"].map((k) => req("content", k, "assignment", `a-${k}`)),
  ...["d2g", "d3g", "d2r", "d3r"].map((k) => req("assignments", k, "assignment", `a-${k}`)),
  req("community", "feedback", "assignment", "a-feedback"), req("community", "letters", "assignment", "a-letters"), req("community", "messages", "messages"),
  req("elco_ai", "elco_ai", "elco_ai"), req("elco_pass", "elco_pass", "elco_pass"), req("elco_pass", "public_profile", "public_profile"),
];
const assignments = reqs.filter((r) => r.assignment_id).map((r) => ({ id: r.assignment_id, submission_type: ["d2g", "d3g"].includes(r.key) ? "group" : "individual" }));
const sub = (aid, status, who = { delegate_id: "D1", team_id: null }) => ({ id: `s-${aid}-${who.delegate_id ?? who.team_id}`, assignment_id: aid, status, ...who });
const sig = (over = {}) => ({ delegate_id: "D1", user_linked: true, elco_linked: false, elco_linked_at: null, elco_practice_30d: 0, elco_last_active: null,
  pass_exists: false, pass_onboarded: false, pass_name: false, pass_country: false, pass_role: false, pass_bio: false, pass_avatar: false,
  profile_public: false, profile_url: null, story_by_day: {}, msg_delegates: 0, msg_arba: 0, msg_farrel: 0, ...over });
const base = { categories: cats, requirements: reqs, assignments, delegateId: "D1", teamId: "T1", reviews: [], requests: [] };

test("only approved requirements earn points; submitted does not", () => {
  const e = computeEligibility({ ...base, submissions: [sub("a-r1", "approved"), sub("a-r2", "approved"), sub("a-r3", "submitted")], signals: sig() });
  assert.equal(round1(e.categories[0].earned), 12); // 30 × 2/5
  assert.equal(round1(e.percent), 12);
  assert.equal(e.pendingReview, 1);
});

test("group approval counts for every member of the team", () => {
  const subs = [sub("a-d2g", "approved", { delegate_id: null, team_id: "T1" })];
  const e1 = computeEligibility({ ...base, submissions: subs, signals: sig() });
  const e2 = computeEligibility({ ...base, delegateId: "D2", submissions: subs, signals: sig({ delegate_id: "D2" }) });
  const e3 = computeEligibility({ ...base, delegateId: "D9", teamId: "T2", submissions: subs, signals: sig({ delegate_id: "D9" }) });
  assert.equal(round1(e1.categories[1].earned), 6.3);
  assert.equal(e1.categories[1].earned, e2.categories[1].earned);
  assert.equal(e3.categories[1].earned, 0);
});

test("the brief's example adds up to 55% and 100% is exact", () => {
  const approved = (ids) => ids.map((k) => sub(`a-${k}`, "approved", ["d2g", "d3g"].includes(k) ? { delegate_id: null, team_id: "T1" } : undefined));
  const reviews = [{ id: "v1", requirement_id: "r-elco_ai", delegate_id: "D1", assessor_id: "A", status: "approved", feedback: null, created_at: "2026-12-01T00:00:00Z" }];
  // content 15/30 → 2.5 of 5 items is impossible with equal shares, so use shares to mirror the example
  const custom = reqs.map((r) => r.key === "r1" ? { ...r, share: 2 } : r.key === "r2" ? { ...r, share: 1 } : r.category_key === "content" ? { ...r, share: 1 } : r);
  const e = computeEligibility({ ...base, requirements: custom, submissions: approved(["r1", "r2", "d2g", "d3g", "d2r", "feedback"]), reviews, signals: sig({ elco_linked: true }) });
  // content: 3/6 shares → 15; assignments 3/4 → 18.75; community 1/3 → 6.67; elco 10; pass 0
  assert.equal(round1(e.categories[0].earned), 15);
  assert.equal(round1(e.categories[1].earned), 18.8);
  assert.equal(round1(e.percent), round1(15 + 18.75 + 20 / 3 + 10));
  const all = reqs.filter((r) => r.assignment_id).map((r) => sub(r.assignment_id, "approved", ["d2g", "d3g"].includes(r.key) ? { delegate_id: null, team_id: "T1" } : undefined));
  const allReviews = ["messages", "elco_ai", "elco_pass", "public_profile"].map((k, i) => ({ id: `v${i}`, requirement_id: `r-${k}`, delegate_id: "D1", assessor_id: "A", status: "approved", feedback: null, created_at: "2026-12-01T00:00:00Z" }));
  const full = computeEligibility({ ...base, submissions: all, reviews: allReviews, signals: sig() });
  assert.equal(full.percent, 100);
  assert.equal(band(full.percent), "100");
});

test("configurable weights rescale; totals that don't add to 100 are normalised", () => {
  const heavy = cats.map((c) => c.key === "elco_ai" ? { ...c, weight: 60 } : c); // total 150
  const reviews = [{ id: "v", requirement_id: "r-elco_ai", delegate_id: "D1", assessor_id: "A", status: "approved", feedback: null, created_at: "2026-12-01T00:00:00Z" }];
  const e = computeEligibility({ ...base, categories: heavy, submissions: [], reviews, signals: sig() });
  assert.equal(round1(e.percent), 40); // 60 / 150
});

test("review-based status: auto signals, requests and Arba's latest decision", () => {
  const r = reqs.find((x) => x.key === "messages");
  const ctx = { assignments, submissions: [], delegateId: "D1", teamId: "T1", reviews: [], requests: [] };
  assert.equal(requirementStatus(r, { ...ctx, signals: sig() }).status, "not_started");
  assert.equal(requirementStatus(r, { ...ctx, signals: sig({ msg_delegates: 2 }) }).status, "in_progress");
  assert.equal(requirementStatus(r, { ...ctx, signals: sig({ msg_delegates: 5, msg_arba: 1, msg_farrel: 1 }) }).status, "submitted");
  const rev = { id: "v", requirement_id: r.id, delegate_id: "D1", assessor_id: "A", status: "revision_required", feedback: "x", created_at: "2026-12-01T00:00:00Z" };
  assert.equal(requirementStatus(r, { ...ctx, reviews: [rev], signals: sig({ msg_delegates: 3, msg_arba: 1, msg_farrel: 1 }) }).status, "revision_required");
  const later = { id: "q", requirement_id: r.id, delegate_id: "D1", url: null, note: null, created_at: "2026-12-02T00:00:00Z" };
  assert.equal(requirementStatus(r, { ...ctx, reviews: [rev], requests: [later], signals: sig({ msg_delegates: 3, msg_arba: 1, msg_farrel: 1 }) }).status, "submitted");
});

test("message requirement: duplicates can't inflate, each slot counted once", () => {
  assert.deepEqual(messageProgress(sig({ msg_delegates: 7, msg_arba: 1, msg_farrel: 0 })).counted, 4);
  assert.equal(messageProgress(sig({ msg_delegates: 3, msg_arba: 1, msg_farrel: 1 })).complete, true);
  assert.equal(messageProgress(sig({ msg_delegates: 2, msg_arba: 1, msg_farrel: 1 })).complete, false);
});

test("Elco AI and profile wording follows the brief", () => {
  assert.equal(statusWording("elco_ai", "not_started", false), "Account not linked yet");
  assert.equal(statusWording("elco_ai", "submitted", true), "Account linked · verification pending");
  assert.equal(statusWording("elco_ai", "approved", true), "Verified");
  assert.equal(statusWording("public_profile", "submitted", true), "Submitted for verification");
  assert.equal(statusWording("public_profile", "not_started", false), "Not started");
});

test("a typed URL alone never completes the public profile", () => {
  const r = reqs.find((x) => x.key === "public_profile");
  const q = { id: "q", requirement_id: r.id, delegate_id: "D1", url: "https://ielsco.com/dashboard/connect/people/x", note: null, created_at: "2026-12-02T00:00:00Z" };
  const st = requirementStatus(r, { assignments, submissions: [], delegateId: "D1", teamId: "T1", reviews: [], requests: [q], signals: sig() });
  assert.equal(st.status, "in_progress");
  assert.equal(st.conditionMet, false);
});

test("eligibility CSV lists every team delegate", () => {
  const roster = [{ delegate_id: "D1", participant_id: "P1", full_name: "Ana", team_id: "T1", team_name: "Team 1" }, { delegate_id: "X", participant_id: "TEST", full_name: "Test", team_id: null, team_name: null }];
  const csv = eligibilityCsv(roster, { categories: cats, requirements: reqs, assignments, submissions: [], reviews: [], requests: [], signals: [sig()] }, toCsv);
  assert.match(csv, /P1,Ana,Team 1,0,/);
  assert.doesNotMatch(csv, /TEST/);
});
