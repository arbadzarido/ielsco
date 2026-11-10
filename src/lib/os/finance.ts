// Finance: labels, which steps a person is offered, money formatting and summary arithmetic. Pure (imported by tests
// with the .ts extension). The database functions (os_fin_*) decide what anyone may do; this mirrors those rules so a
// button never leads to a refusal, and it never decides what anyone may read.

export type TrxKind = "expense" | "reimbursement" | "income";
export type TrxStatus = "requested" | "approved" | "verified" | "paid" | "received" | "reconciled" | "rejected" | "cancelled";
export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet" | "teal";

export interface TrxRow {
  id: string; kind: TrxKind; direction: "in" | "out"; company_code: string; division_id: string | null; project_id: string | null;
  category_code: string | null; budget_id: string | null; request_id: string | null; description: string; counterparty: string | null;
  amount: number; txn_date: string; due_date: string | null; status: TrxStatus; requested_by: string; payee_person_id: string | null;
  approved_by: string | null; approved_at: string | null; verified_by: string | null; verified_at: string | null; settled_by: string | null;
  settled_on: string | null; settled_at: string | null; payment_method: string | null; reconciled_by: string | null; reconciled_at: string | null;
  closed_reason: string | null; created_at: string; updated_at: string;
}
/** Every column people outside Finance may read. Account and bank references are not here: they have no grant and
 * Finance reads them with os_fin_payment_details. */
export const TRX_COLUMNS = "id, kind, direction, company_code, division_id, project_id, category_code, budget_id, request_id, description, counterparty, amount, txn_date, due_date, status, requested_by, payee_person_id, approved_by, approved_at, verified_by, verified_at, settled_by, settled_on, settled_at, payment_method, reconciled_by, reconciled_at, closed_reason, created_at, updated_at";

export interface BudgetRow {
  id: string; company_code: string; division_id: string | null; project_id: string | null; category_code: string | null; name: string;
  period_start: string; period_end: string; amount: number; status: "proposed" | "approved" | "closed" | "rejected"; request_id: string | null;
  notes: string | null; created_by: string | null; approved_by: string | null; approved_at: string | null; created_at: string;
}
export const BUDGET_COLUMNS = "id, company_code, division_id, project_id, category_code, name, period_start, period_end, amount, status, request_id, notes, created_by, approved_by, approved_at, created_at";

export interface BudgetSummary { budget_id: string; name: string; company_code: string; division_id: string | null; project_id: string | null; category_code: string | null;
  period_start: string; period_end: string; status: string; budget: number; requested: number; committed: number; actual: number; remaining: number }
export interface CashflowRow { month: string; cash_in: number; cash_out: number; net: number; committed_out: number; expected_in: number; requested_out: number }

export const KIND_LABEL: Record<TrxKind, string> = { expense: "Expense", reimbursement: "Reimbursement", income: "Income" };
export const TRX_STATUS_LABEL: Record<TrxStatus, string> = {
  requested: "Requested", approved: "Approved, not paid", verified: "Verified, not settled", paid: "Paid", received: "Received",
  reconciled: "Reconciled", rejected: "Rejected", cancelled: "Cancelled",
};
export const TRX_STATUS_TONE: Record<TrxStatus, Tone> = {
  requested: "amber", approved: "blue", verified: "violet", paid: "green", received: "green", reconciled: "teal", rejected: "red", cancelled: "neutral",
};
/** Income waits for verification, not approval. */
export function trxStage(t: Pick<TrxRow, "kind" | "status">): { label: string; tone: Tone } {
  if (t.kind === "income" && t.status === "requested") return { label: "Reported, waiting for verification", tone: "amber" };
  if (t.kind === "income" && t.status === "verified") return { label: "Verified, not yet received", tone: "violet" };
  return { label: TRX_STATUS_LABEL[t.status], tone: TRX_STATUS_TONE[t.status] };
}

/** Actual cash: only settled lines. Approved or verified expenses are commitments, requested ones only asks. */
export const isCash = (t: Pick<TrxRow, "status">) => ["paid", "received", "reconciled"].includes(t.status);
export const isCommitted = (t: Pick<TrxRow, "kind" | "status">) => t.kind !== "income" && ["approved", "verified"].includes(t.status);
export const isClosed = (t: Pick<TrxRow, "status">) => ["reconciled", "rejected", "cancelled"].includes(t.status);

export type FinAction = "edit" | "approve" | "reject" | "verify" | "pay" | "receive" | "reconcile" | "cancel";
export interface FinMe { personId: string; founder: boolean; approver: boolean; operator: boolean }

/** Steps offered to the viewer, mirroring os_fin_act and os_fin_update. */
export function finActions(t: Pick<TrxRow, "kind" | "status" | "requested_by" | "payee_person_id">, me: FinMe): FinAction[] {
  const out: FinAction[] = [];
  const mine = t.requested_by === me.personId;
  const involved = mine || t.payee_person_id === me.personId;
  const income = t.kind === "income";
  if (mine && t.status === "requested") out.push("edit");
  if (!income && t.status === "requested" && me.approver && !involved) out.push("approve", "reject");
  if (me.operator && ((income && t.status === "requested") || (!income && t.status === "approved")) && (!mine || (income && me.founder))) out.push("verify");
  if (me.operator && t.status === "verified") {
    if (income) out.push("receive");
    else if (!involved) out.push("pay");
  }
  if (me.operator && ["paid", "received"].includes(t.status)) out.push("reconcile");
  if ((mine && ["requested", "approved"].includes(t.status)) || (me.operator && ["requested", "approved", "verified"].includes(t.status))) out.push("cancel");
  return out;
}

export const ACTION_LABEL: Record<FinAction, string> = {
  edit: "Edit", approve: "Approve", reject: "Reject", verify: "Verify", pay: "Record payment", receive: "Record receipt", reconcile: "Reconcile", cancel: "Cancel",
};
export const PAYMENT_METHODS = [
  { value: "transfer", label: "Bank transfer" }, { value: "cash", label: "Cash" }, { value: "e_wallet", label: "E-wallet" }, { value: "card", label: "Card" }, { value: "other", label: "Other" },
];
export const EVENT_LABEL: Record<string, string> = {
  submitted: "submitted it", updated: "edited it", approve: "approved it", reject: "rejected it", verify: "verified it", pay: "recorded the payment",
  receive: "recorded the receipt", reconcile: "reconciled it", cancel: "cancelled it", proposed: "proposed it", close: "closed it",
  drafted: "drafted it", submit: "sent it for approval", issued: "approved and numbered it", returned: "returned it", voided: "voided it",
  registered: "registered it", archived: "archived it", terminate: "terminated it", expire: "marked it expired", created: "created it", changed: "changed it",
  done: "marked it done", waived: "waived it", return: "returned it",
};

/** Whole rupiah, Indonesian grouping: 1500000 -> "Rp 1.500.000". Negative numbers keep their sign. */
export function formatIDR(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return "Rp 0";
  const s = Math.abs(Math.trunc(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${v < 0 ? "−" : ""}Rp ${s}`;
}
/** What a person types ("1.500.000", "Rp 1,500,000", "1500000") to whole rupiah, or null. Decimals are refused. */
export function parseIDR(text: string): number | null {
  const t = text.replace(/rp/i, "").replace(/\s/g, "");
  if (!/^\d{1,3}([.,]\d{3})*$|^\d+$/.test(t)) return null;
  const n = Number(t.replace(/[.,]/g, ""));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Ledger totals for a list a person can see, by the same rules as the database summaries. */
export function ledgerTotals(rows: Pick<TrxRow, "kind" | "status" | "amount">[]) {
  const sum = (f: (t: Pick<TrxRow, "kind" | "status" | "amount">) => boolean) => rows.filter(f).reduce((a, t) => a + Number(t.amount), 0);
  const cashIn = sum((t) => t.kind === "income" && isCash(t));
  const cashOut = sum((t) => t.kind !== "income" && isCash(t));
  return {
    cashIn, cashOut, net: cashIn - cashOut,
    committedOut: sum(isCommitted),
    requestedOut: sum((t) => t.kind !== "income" && t.status === "requested"),
    expectedIn: sum((t) => t.kind === "income" && ["requested", "verified"].includes(t.status)),
  };
}

/** Share of a budget used (committed + actual), for a bar; capped at 100 with the overspend reported apart. */
export function budgetUse(b: Pick<BudgetSummary, "budget" | "committed" | "actual">): { pct: number; over: number } {
  const used = Number(b.committed) + Number(b.actual);
  const budget = Number(b.budget);
  return { pct: budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0, over: Math.max(0, used - budget) };
}

/** Rows as CSV text for a report download: quoted where needed, a header row first. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const q = (v: string | number | null | undefined) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [header, ...rows].map((r) => r.map(q).join(",")).join("\n");
}
