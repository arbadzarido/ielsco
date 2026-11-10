// Finance and Legal pure helpers (src/lib/os/finance.ts, legal.ts): the buttons offered mirror the database rules,
// money is formatted and parsed in whole rupiah, totals keep requested, committed and actual apart, and number
// previews match os_format_number.
import { test } from "node:test";
import assert from "node:assert/strict";
import { budgetUse, finActions, formatIDR, isCash, ledgerTotals, parseIDR, toCsv, trxStage } from "../src/lib/os/finance.ts";
import { agreementActions, dueBand, formatNumber, formatProblem, letterActions } from "../src/lib/os/legal.ts";

const me = (o = {}) => ({ personId: "P1", founder: false, approver: false, operator: false, ...o });
const trx = (o = {}) => ({ kind: "expense", status: "requested", requested_by: "P2", payee_person_id: null, ...o });

test("approvers approve other people's expenses, never their own or one paying them back", () => {
  assert.deepEqual(finActions(trx(), me({ approver: true })), ["approve", "reject"]);
  assert.deepEqual(finActions(trx({ requested_by: "P1" }), me({ approver: true })), ["edit", "cancel"]);
  assert.deepEqual(finActions(trx({ kind: "reimbursement", payee_person_id: "P1" }), me({ approver: true })), []);
  assert.deepEqual(finActions(trx(), me({ operator: true })), ["cancel"]);
});

test("Finance verifies after approval, pays after verification, reconciles after payment", () => {
  const op = me({ operator: true });
  assert.deepEqual(finActions(trx({ status: "approved" }), op), ["verify", "cancel"]);
  assert.deepEqual(finActions(trx({ status: "verified" }), op), ["pay", "cancel"]);
  assert.deepEqual(finActions(trx({ status: "verified", requested_by: "P1" }), op), ["cancel"]);
  assert.deepEqual(finActions(trx({ status: "paid" }), op), ["reconcile"]);
  assert.deepEqual(finActions(trx({ status: "reconciled" }), op), []);
  assert.deepEqual(finActions(trx({ status: "rejected" }), op), []);
});

test("income is verified (not approved) and received (not paid)", () => {
  const op = me({ operator: true, approver: true });
  assert.deepEqual(finActions(trx({ kind: "income" }), op), ["verify", "cancel"]);
  assert.deepEqual(finActions(trx({ kind: "income", status: "verified" }), op), ["receive", "cancel"]);
  assert.deepEqual(finActions(trx({ kind: "income", requested_by: "P1" }), op), ["edit", "cancel"]);
  assert.deepEqual(finActions(trx({ kind: "income", requested_by: "P1" }), { ...op, founder: true }), ["edit", "verify", "cancel"]);
  assert.equal(trxStage({ kind: "income", status: "requested" }).label, "Reported, waiting for verification");
  assert.equal(trxStage({ kind: "expense", status: "approved" }).label, "Approved, not paid");
});

test("requesters cancel only before verification", () => {
  assert.ok(finActions(trx({ requested_by: "P1", status: "approved" }), me()).includes("cancel"));
  assert.ok(!finActions(trx({ requested_by: "P1", status: "verified" }), me()).includes("cancel"));
});

test("totals keep cash, commitments and asks apart", () => {
  const rows = [
    { kind: "expense", status: "paid", amount: 450000 }, { kind: "expense", status: "reconciled", amount: 50000 },
    { kind: "expense", status: "approved", amount: 200000 }, { kind: "reimbursement", status: "verified", amount: 25000 },
    { kind: "expense", status: "requested", amount: 100000 }, { kind: "expense", status: "rejected", amount: 999 }, { kind: "expense", status: "cancelled", amount: 999 },
    { kind: "income", status: "received", amount: 300000 }, { kind: "income", status: "verified", amount: 70000 }, { kind: "income", status: "requested", amount: 5000 },
  ];
  assert.deepEqual(ledgerTotals(rows), { cashIn: 300000, cashOut: 500000, net: -200000, committedOut: 225000, requestedOut: 100000, expectedIn: 75000 });
  assert.equal(isCash({ status: "approved" }), false);
  assert.deepEqual(budgetUse({ budget: 1000000, committed: 200000, actual: 450000 }), { pct: 65, over: 0 });
  assert.deepEqual(budgetUse({ budget: 100, committed: 50, actual: 80 }), { pct: 100, over: 30 });
});

test("rupiah: Indonesian grouping, whole numbers only", () => {
  assert.equal(formatIDR(1500000), "Rp 1.500.000");
  assert.equal(formatIDR(-150000), "−Rp 150.000");
  assert.equal(formatIDR(0), "Rp 0");
  for (const [t, want] of [["1.500.000", 1500000], ["Rp 1,500,000", 1500000], ["1500000", 1500000], ["0", null], ["1.5", null], ["12,50", null], ["abc", null], ["", null], ["-5", null]]) {
    assert.equal(parseIDR(t), want, t);
  }
});

test("CSV quoting defuses spreadsheet formulas", () => {
  assert.equal(toCsv(["a", "b"], [["=SUM(A1)", 'x "y", z'], [null, 5]]), 'a,b\n"=SUM(A1)","x ""y"", z"\n,5');
});

test("number preview matches the database format, IEL/SK/LEG/XI/2026/007", () => {
  const f = "{company}/{type}/{division}/{month_roman}/{year}/{seq:3}";
  assert.equal(formatNumber(f, { company: "IEL", type: "SK", division: "LEG", date: "2026-11-10", seq: 7 }), "IEL/SK/LEG/XI/2026/007");
  assert.equal(formatNumber("{type}-{yy}{month}-{seq:4} {seq}", { company: "IEL", type: "PKS", division: null, date: "2026-03-05", seq: 12345 }), "PKS-2603-12345 12345");
  assert.equal(formatNumber("{company}/{seq}", { company: "ELC", type: "X", division: null, date: "2026-01-31", seq: 1 }), "ELC/1");
});

test("format checks mirror os_number_rule_save", () => {
  assert.equal(formatProblem("{company}/{type}/{year}/{seq:3}", "yearly"), null);
  assert.match(formatProblem("{company}/{type}/{year}", "yearly"), /needs \{seq\}/);
  assert.match(formatProblem("{company}/{nope}/{year}/{seq}", "yearly"), /Unknown token/);
  assert.match(formatProblem("{company}/{type}/{seq:3}", "yearly"), /yearly sequence/);
  assert.match(formatProblem("{company}/{year}/{seq:3}", "monthly"), /monthly sequence/);
  assert.equal(formatProblem("{company}/{type}/{seq:4}", "never"), null);
});

test("letters: Legal drafts, a signer who didn't draft it approves, signers void", () => {
  const legal = { personId: "P1", operator: true, signer: false }, signer = { personId: "P9", operator: true, signer: true };
  assert.deepEqual(letterActions({ status: "draft", created_by: "P1", direction: "outgoing" }, legal), ["edit", "submit"]);
  assert.deepEqual(letterActions({ status: "in_review", created_by: "P1", direction: "outgoing" }, legal), []);
  assert.deepEqual(letterActions({ status: "in_review", created_by: "P1", direction: "outgoing" }, signer), ["approve", "return"]);
  assert.deepEqual(letterActions({ status: "in_review", created_by: "P9", direction: "outgoing" }, signer), []);
  assert.deepEqual(letterActions({ status: "issued", created_by: "P1", direction: "outgoing" }, signer), ["archive", "void"]);
  assert.deepEqual(letterActions({ status: "void", created_by: "P1", direction: "outgoing" }, signer), []);
  assert.deepEqual(agreementActions({ status: "active", created_by: "P1" }, legal), ["edit", "terminate", "expire"]);
});

test("reminder bands: 60, 30, 7 days and overdue", () => {
  const t = "2026-11-10";
  assert.equal(dueBand("2027-02-01", t), null);
  assert.equal(dueBand("2026-12-30", t), "60");
  assert.equal(dueBand("2026-12-01", t), "30");
  assert.equal(dueBand("2026-11-17", t), "7");
  assert.equal(dueBand("2026-11-10", t), "7");
  assert.equal(dueBand("2026-11-09", t), "overdue");
});
