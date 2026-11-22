// Private Tutoring payment rules: full payment, or deposit + instalments for packages of MORE than 4 sessions.
// Pure functions only (no database, no server-only imports) so the website, invoices, receipts and the tests share one
// source of truth. Approved by the founder on 22 Nov 2026.
//
// Rules encoded here:
//  - 2 and 4 session packages: full payment upfront only.
//  - More than 4 sessions: Option B = 50% deposit, 25% after the 2nd completed session, 25% before the final two sessions
//    (or before the exam/application deadline, whichever comes first).
//  - A deposit secures the package and schedule. It is never a discount: the total price is the same either way.
//  - Package benefits (sessions, Elco AI month) are not activated until the initial payment is verified.
//  - The next sessions are not scheduled until the outstanding instalment is verified.

export const DEPOSIT_MIN_SESSIONS_EXCLUSIVE = 4; // deposit only when sessions > 4
export const DEPOSIT_PCT = 50;
export const INSTALMENT_PCT = 25;

export type PaymentOption = "full" | "deposit";
export type MilestoneKind = "full" | "deposit" | "instalment_1" | "instalment_2";
export type PaymentStatus = "awaiting_payment" | "active_balance_due" | "overdue" | "paid_in_full" | "cancelled";

export interface Milestone {
  kind: MilestoneKind;
  label: string;
  pct: number;
  amountIdr: number;
  /** Plain-language trigger shown to the customer before registration. */
  trigger: string;
  /** Sessions that may be scheduled and held once this milestone is verified (cumulative). */
  unlocksSessions: number;
  dueDate: string | null; // ISO date when known
}

export const depositAllowed = (sessions: number) => sessions > DEPOSIT_MIN_SESSIONS_EXCLUSIVE;

export interface ScheduleInput {
  totalIdr: number;
  sessions: number;
  option: PaymentOption;
  /** Exam or application deadline (ISO date), if the customer has one. */
  deadline?: string | null;
  /** Date the second-last session is planned (ISO date), if scheduled. Used to compute the final due date. */
  finalTwoStart?: string | null;
  /** Date the second session is planned or completed (ISO date), for instalment 1. */
  afterSecondSession?: string | null;
}

const earlier = (a?: string | null, b?: string | null) => (a && b ? (a < b ? a : b) : a ?? b ?? null);

export function buildSchedule(i: ScheduleInput): Milestone[] {
  if (!Number.isInteger(i.totalIdr) || i.totalIdr <= 0) throw new Error("total must be a positive whole rupiah amount");
  if (i.option === "deposit" && !depositAllowed(i.sessions)) throw new Error("deposit_not_available");
  if (i.option === "full") {
    return [{ kind: "full", label: "Full payment", pct: 100, amountIdr: i.totalIdr, trigger: "Before your first session is scheduled", unlocksSessions: i.sessions, dueDate: null }];
  }
  const deposit = Math.round((i.totalIdr * DEPOSIT_PCT) / 100);
  const first = Math.round((i.totalIdr * INSTALMENT_PCT) / 100);
  const second = i.totalIdr - deposit - first; // absorbs any rounding so the parts always add up to the total
  return [
    { kind: "deposit", label: "Deposit", pct: DEPOSIT_PCT, amountIdr: deposit, trigger: "Before your first session is scheduled", unlocksSessions: 2, dueDate: null },
    { kind: "instalment_1", label: "Instalment 1", pct: INSTALMENT_PCT, amountIdr: first, trigger: "After your 2nd completed session, before the 3rd", unlocksSessions: i.sessions - 2, dueDate: i.afterSecondSession ?? null },
    { kind: "instalment_2", label: "Instalment 2 (final)", pct: INSTALMENT_PCT, amountIdr: second,
      trigger: i.deadline ? "Before your final two sessions, or before your exam/application deadline, whichever comes first" : "Before your final two sessions",
      unlocksSessions: i.sessions, dueDate: earlier(i.finalTwoStart, i.deadline) },
  ];
}

export interface PaymentRecord { milestone: MilestoneKind; amountIdr: number; verifiedAt: string | null; method?: string; reference?: string }

export interface Ledger {
  invoiceNo: string;
  sessions: number;
  totalIdr: number;
  option: PaymentOption;
  schedule: Milestone[];
  payments: PaymentRecord[]; // only verified ones count
  completedSessions: number;
  cancelled?: boolean;
}

export function ledgerSummary(l: Ledger, today = new Date().toISOString().slice(0, 10)) {
  const verified = l.payments.filter((p) => p.verifiedAt);
  const paidFor = (k: MilestoneKind) => verified.filter((p) => p.milestone === k).reduce((s, p) => s + p.amountIdr, 0);
  const settled = (m: Milestone) => paidFor(m.kind) >= m.amountIdr;
  const totalPaid = verified.reduce((s, p) => s + p.amountIdr, 0);
  const remaining = Math.max(0, l.totalIdr - totalPaid);
  const next = l.schedule.find((m) => !settled(m)) ?? null;
  const unlocked = [...l.schedule].reverse().find(settled)?.unlocksSessions ?? 0;
  const initialPaid = settled(l.schedule[0]);
  const overdue = !!next && !!next.dueDate && next.dueDate < today && next.kind !== l.schedule[0].kind;
  const status: PaymentStatus = l.cancelled ? "cancelled" : remaining === 0 ? "paid_in_full" : !initialPaid ? "awaiting_payment" : overdue ? "overdue" : "active_balance_due";
  return {
    totalIdr: l.totalIdr, totalPaidIdr: totalPaid, remainingIdr: remaining, status,
    currentMilestone: next ? next.kind : "complete" as const,
    nextPayment: next ? { kind: next.kind, label: next.label, amountIdr: next.amountIdr - paidFor(next.kind), dueDate: next.dueDate, trigger: next.trigger } : null,
    completedSessions: l.completedSessions,
    /** How many sessions may be scheduled/held given verified payments. */
    sessionsUnlocked: Math.min(l.sessions, unlocked),
    /** Sessions, the Elco AI month and Circle access start only after the initial payment is verified. */
    benefitsActive: initialPaid && !l.cancelled,
  };
}

/** May this session number (1-based) be scheduled or held? Blocks the next milestone until the instalment is verified. */
export function canScheduleSession(l: Ledger, sessionNo: number) {
  const s = ledgerSummary(l);
  if (!s.benefitsActive) return { ok: false, reason: "The initial payment has not been verified yet." };
  if (sessionNo > s.sessionsUnlocked) return { ok: false, reason: `Session ${sessionNo} can be scheduled after the ${s.nextPayment?.label.toLowerCase() ?? "next payment"} is verified.` };
  return { ok: true as const, reason: "" };
}
