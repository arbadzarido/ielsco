// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBenefitEvent } from "../src/lib/integrations/elco-benefits.ts";

const U = (n) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
const base = { event_id: U(1), grant_id: U(2), elco_user_id: U(3), link_id: null, version: 1793770000000000, tier: "starter", source: "purchase",
  status: "active", starts_at: "2026-11-04T00:00:00Z", ends_at: "2026-12-04T00:00:00Z", benefits: { speaking_club_per_month: 12, mentoring_per_month: 0 }, order_ref: "ELCO-1" };

test("a valid Starter event passes with its quotas", () => {
  const r = validateBenefitEvent(base);
  assert.equal(r.ok, true);
  assert.equal(r.event.speaking_club_per_month, 12);
  assert.equal(r.event.mentoring_per_month, 0);
});

test("Pro: unlimited Speaking Club is null, 4 mentoring", () => {
  const r = validateBenefitEvent({ ...base, tier: "pro", benefits: { speaking_club_per_month: null, mentoring_per_month: 4 } });
  assert.equal(r.ok && r.event.speaking_club_per_month, null);
  assert.equal(r.ok && r.event.mentoring_per_month, 4);
});

test("bad input is refused with a reason", () => {
  for (const [patch, code] of [[{ event_id: "x" }, "invalid_ids"], [{ tier: "plus" }, "invalid_tier"], [{ status: "paused" }, "invalid_status"],
    [{ ends_at: "2026-11-01T00:00:00Z" }, "invalid_dates"], [{ version: 0 }, "invalid_version"], [{ link_id: "nope" }, "invalid_link_id"],
    [{ benefits: { mentoring_per_month: 99 } }, "invalid_benefits"], [{ source: "gift" }, "invalid_source"], [{ order_ref: "x".repeat(81) }, "invalid_order_ref"]]) {
    const r = validateBenefitEvent({ ...base, ...patch });
    assert.equal(r.ok, false, JSON.stringify(patch));
    assert.equal(r.error, code);
  }
  assert.deepEqual(validateBenefitEvent(null), { ok: false, error: "invalid_request" });
});

test("no email field is ever read", () => {
  const r = validateBenefitEvent({ ...base, email: "someone@example.test" });
  assert.equal(r.ok && "email" in r.event, false);
});

test("exam grants carry modes; learning grants carry none", () => {
  const ok = validateBenefitEvent({ ...base, tier: "exam", modes: ["toefl", "ielts", "toeic"], benefits: {} });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.ok && ok.event.modes, ["toefl", "ielts", "toeic"]);
  assert.equal(validateBenefitEvent({ ...base, tier: "exam", modes: [] }).error, "invalid_modes");
  assert.equal(validateBenefitEvent({ ...base, tier: "exam", modes: ["gre"] }).error, "invalid_modes");
  assert.equal(validateBenefitEvent({ ...base, tier: "starter", modes: ["toefl"] }).error, "invalid_modes");
});
