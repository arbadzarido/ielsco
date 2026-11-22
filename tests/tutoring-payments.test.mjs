// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSchedule, ledgerSummary, canScheduleSession, depositAllowed } from "../src/lib/tutoring/payments.ts";
import { invoiceHtml, receiptHtml, receiptModel } from "../src/lib/tutoring/documents.ts";

const total = 599000;
const mk = (payments = [], extra = {}) => ({ invoiceNo: "TUT-2026-0001", sessions: 8, totalIdr: total, option: "deposit", schedule: buildSchedule({ totalIdr: total, sessions: 8, option: "deposit", ...extra }), payments, completedSessions: 0 });
const pay = (milestone, amountIdr, verifiedAt = "2026-11-25") => ({ milestone, amountIdr, verifiedAt });

test("deposit only for packages above 4 sessions", () => {
  assert.equal(depositAllowed(2), false); assert.equal(depositAllowed(4), false); assert.equal(depositAllowed(8), true);
  assert.throws(() => buildSchedule({ totalIdr: 329000, sessions: 4, option: "deposit" }), /deposit_not_available/);
  assert.equal(buildSchedule({ totalIdr: 329000, sessions: 4, option: "full" }).length, 1);
});

test("50/25/25 schedule adds up to the total price (no discount)", () => {
  const s = buildSchedule({ totalIdr: total, sessions: 8, option: "deposit" });
  assert.deepEqual(s.map((m) => m.amountIdr), [299500, 149750, 149750]);
  assert.equal(s.reduce((a, m) => a + m.amountIdr, 0), total);
  const odd = buildSchedule({ totalIdr: 599001, sessions: 8, option: "deposit" });
  assert.equal(odd.reduce((a, m) => a + m.amountIdr, 0), 599001);
});

test("deadline moves the final due date earlier", () => {
  const s = buildSchedule({ totalIdr: total, sessions: 8, option: "deposit", finalTwoStart: "2026-12-20", deadline: "2026-12-10" });
  assert.equal(s[2].dueDate, "2026-12-10");
});

test("nothing is active or schedulable before the deposit is verified", () => {
  const l = mk([{ milestone: "deposit", amountIdr: 299500, verifiedAt: null }]);
  const s = ledgerSummary(l);
  assert.equal(s.status, "awaiting_payment"); assert.equal(s.benefitsActive, false); assert.equal(s.totalPaidIdr, 0);
  assert.equal(canScheduleSession(l, 1).ok, false);
});

test("milestones gate sessions: 2 after deposit, 6 after instalment 1, all after instalment 2", () => {
  const a = mk([pay("deposit", 299500)]);
  assert.equal(ledgerSummary(a).sessionsUnlocked, 2); assert.equal(canScheduleSession(a, 2).ok, true); assert.equal(canScheduleSession(a, 3).ok, false);
  const b = mk([pay("deposit", 299500), pay("instalment_1", 149750)]);
  assert.equal(canScheduleSession(b, 6).ok, true); assert.equal(canScheduleSession(b, 7).ok, false);
  const c = mk([pay("deposit", 299500), pay("instalment_1", 149750), pay("instalment_2", 149750)]);
  const s = ledgerSummary(c);
  assert.equal(s.status, "paid_in_full"); assert.equal(s.remainingIdr, 0); assert.equal(canScheduleSession(c, 8).ok, true);
});

test("tracking record reports remaining, next payment and overdue", () => {
  const l = mk([pay("deposit", 299500)], { finalTwoStart: "2026-12-20" });
  const s = ledgerSummary(l, "2026-11-30");
  assert.equal(s.remainingIdr, 299500); assert.equal(s.currentMilestone, "instalment_1"); assert.equal(s.nextPayment.amountIdr, 149750);
  const late = ledgerSummary(mk([pay("deposit", 299500), pay("instalment_1", 149750)], { finalTwoStart: "2026-12-20" }), "2026-12-21");
  assert.equal(late.status, "overdue");
});

test("invoice shows plan and milestones; receipt references the invoice and is only for verified payments", () => {
  const l = mk([pay("deposit", 299500)]);
  const html = invoiceHtml(l, { name: "Sari" }, { name: "Intensive", sessions: 8, includes: ["1 month of Elco AI", "IELS Circle access"] }, "2026-11-25", "BANK");
  for (const t of ["TUT-2026-0001", "Deposit (50%)", "Instalment 1 (25%)", "Outstanding balance", "not a discount"]) assert.ok(html.includes(t), t);
  const r = receiptModel(l, l.payments[0], "RCP-0001");
  assert.equal(r.invoiceNo, "TUT-2026-0001"); assert.equal(r.remainingIdr, 299500);
  assert.ok(receiptHtml(l, l.payments[0], "RCP-0001", { name: "Sari" }).includes("For invoice TUT-2026-0001"));
  assert.throws(() => receiptModel(l, { milestone: "deposit", amountIdr: 1, verifiedAt: null }, "X"), /verified/);
});
