// Client-side data layer for the Private Tutoring dashboards. Reads go through Supabase RLS (students see only their own
// rows); every write is an RPC defined in supabase/migrations/20261201000000_tutoring_platform.sql.
import type { SupabaseClient } from "@supabase/supabase-js";
import { offsetMinutes } from "@/lib/time/zone";
import type { Ledger, Milestone, MilestoneKind } from "./payments";

export type Enrolment = {
  id: string; student_id: string; mentor_id: string; package_code: "starter" | "growth" | "intensive"; sessions_total: number; sessions_completed: number;
  total_price_idr: number; payment_option: "full" | "deposit"; status: "pending_payment" | "active" | "payment_review" | "completed" | "cancelled";
  activated_at: string | null; elco_access_status: "not_granted" | "granted" | "expired"; elco_access_expires_at: string | null; circle_access: boolean;
  exam_deadline: string | null; created_at: string;
};
export type Instalment = { id: string; enrolment_id: string; seq: number; kind: MilestoneKind; pct: number; amount_idr: number; trigger_text: string; due_date: string | null; status: "due" | "verified"; verified_at: string | null };
export type Payment = { id: string; enrolment_id: string; instalment_id: string; amount_idr: number; method: string; reference: string | null; verified_at: string };
export type Receipt = { id: string; payment_id: string; invoice_id: string; receipt_no: string; issued_at: string };
export type Invoice = { id: string; enrolment_id: string; invoice_no: string; total_idr: number; issued_at: string };
export type BookingStatus = "pending_review" | "alternative_proposed" | "confirmed" | "completed" | "cancelled" | "no_show";
export type Slot = { start: string; end: string };
export type Booking = {
  id: string; enrolment_id: string; student_id: string; mentor_id: string; status: BookingStatus; requested_slots: Slot[]; alternative_slots: Slot[];
  student_timezone: string; focus: string | null; starts_at: string | null; ends_at: string | null; decision_note: string | null; cancel_reason: string | null; created_at: string;
};
export type SessionRecord = { booking_id: string; duration_min: number; topic: string; skills: string[]; strengths: string | null; improvements: string | null; feedback: string | null; homework: string | null; next_focus: string | null; recorded_at: string };
export type Goals = { enrolment_id: string; current_level: string | null; objective: string | null; target: string | null; difficulties: string | null; target_date: string | null; preferred_focus: string | null; context: string | null };
export type Stage = { id: string; position: number; title: string; note: string | null; status: "upcoming" | "current" | "done" };
export type Notice = { id: string; kind: string; body: string; created_at: string; read_at: string | null };

export const BOOKING_LABEL: Record<BookingStatus, string> = {
  pending_review: "Pending review", alternative_proposed: "Alternative proposed", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled", no_show: "No-show",
};
export const PACKAGE_LABEL = { starter: "Starter", growth: "Growth", intensive: "Intensive" } as const;
export const STATUS_LABEL: Record<Enrolment["status"], string> = {
  pending_payment: "Waiting for first payment", active: "Active", payment_review: "Payment under review", completed: "Completed", cancelled: "Cancelled",
};

/** "2026-12-02T09:00" typed in `zone` -> UTC ISO string. */
export function zonedLocalToUtc(local: string, zone: string): string {
  const asUtc = new Date(local + ":00Z").getTime();
  let t = asUtc - offsetMinutes(zone, asUtc) * 60000;
  t = asUtc - offsetMinutes(zone, t) * 60000; // second pass settles DST edges
  return new Date(t).toISOString();
}

export const addHour = (iso: string) => new Date(new Date(iso).getTime() + 3600e3).toISOString();

/** Build the payments Ledger (src/lib/tutoring/payments.ts) from stored rows so invoices and receipts reuse one renderer. */
export function toLedger(e: Enrolment, invoiceNo: string, ins: Instalment[], pays: Payment[]): Ledger {
  const sorted = [...ins].sort((a, b) => a.seq - b.seq);
  const schedule: Milestone[] = sorted.map((i) => ({
    kind: i.kind, label: i.kind === "full" ? "Full payment" : i.kind === "deposit" ? "Deposit" : i.kind === "instalment_1" ? "Instalment 1" : "Instalment 2 (final)",
    pct: i.pct, amountIdr: Number(i.amount_idr), trigger: i.trigger_text,
    unlocksSessions: i.kind === "deposit" ? 2 : i.kind === "instalment_1" ? e.sessions_total - 2 : e.sessions_total, dueDate: i.due_date,
  }));
  const kindOf = new Map(sorted.map((i) => [i.id, i.kind]));
  return {
    invoiceNo, sessions: e.sessions_total, totalIdr: Number(e.total_price_idr), option: e.payment_option, schedule,
    payments: pays.map((p) => ({ milestone: kindOf.get(p.instalment_id)!, amountIdr: Number(p.amount_idr), verifiedAt: p.verified_at, method: "Bank transfer", reference: p.reference ?? undefined })),
    completedSessions: e.sessions_completed, cancelled: e.status === "cancelled",
  };
}

export function downloadHtml(filename: string, html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function loadEnrolmentBundle(supabase: SupabaseClient, enrolmentId: string) {
  const [ins, pays, rcpts, inv, bks, goals, stages, recs] = await Promise.all([
    supabase.from("tutoring_instalments").select("*").eq("enrolment_id", enrolmentId).order("seq"),
    supabase.from("tutoring_payments").select("*").eq("enrolment_id", enrolmentId),
    supabase.from("tutoring_receipts").select("*"),
    supabase.from("tutoring_invoices").select("*").eq("enrolment_id", enrolmentId).maybeSingle(),
    supabase.from("tutoring_bookings").select("*").eq("enrolment_id", enrolmentId).order("created_at", { ascending: false }),
    supabase.from("tutoring_goals").select("*").eq("enrolment_id", enrolmentId).maybeSingle(),
    supabase.from("tutoring_roadmap_stages").select("id, position, title, note, status").eq("enrolment_id", enrolmentId).order("position"),
    supabase.from("tutoring_session_records").select("*"),
  ]);
  const err = [ins, pays, rcpts, inv, bks, goals, stages, recs].find((r) => r.error)?.error;
  if (err) throw new Error(err.message);
  const payIds = new Set((pays.data ?? []).map((p: Payment) => p.id));
  return {
    instalments: (ins.data ?? []) as Instalment[], payments: (pays.data ?? []) as Payment[],
    receipts: ((rcpts.data ?? []) as Receipt[]).filter((r) => payIds.has(r.payment_id)),
    invoice: (inv.data ?? null) as Invoice | null, bookings: (bks.data ?? []) as Booking[], goals: (goals.data ?? null) as Goals | null,
    stages: (stages.data ?? []) as Stage[], records: ((recs.data ?? []) as SessionRecord[]),
  };
}
export type Bundle = Awaited<ReturnType<typeof loadEnrolmentBundle>>;

/** RPC wrapper: throws a readable message. */
export async function rpc(supabase: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendly(error.message));
  return data;
}
const FRIENDLY: [RegExp, string][] = [
  [/no_double_booking|conflicting key|exclusion/i, "That time overlaps another confirmed session."], [/blocked_time/, "That time is blocked in the mentor's calendar."],
  [/no_sessions_available/, "No more sessions can be requested yet. The next payment may need to be verified, or you have requests waiting."],
  [/not_active/, "Your package is not active for new bookings. Check your payment status."], [/agreement_required/, "Record the customer's agreement to the payment schedule first."],
  [/earlier_instalment_outstanding/, "An earlier payment is still outstanding."], [/reason_required/, "A reason is required."], [/forbidden/, "You do not have permission for that."],
  [/slots_required/, "Choose between 1 and 5 time slots."], [/not_confirmed/, "Only a confirmed session can be completed."],
];
export function friendly(msg: string) { return FRIENDLY.find(([re]) => re.test(msg))?.[1] ?? msg; }
