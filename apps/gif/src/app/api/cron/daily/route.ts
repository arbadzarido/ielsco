import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { q } from "@/lib/db";
import { currentCohort } from "@/lib/cohort";
import { deliverQueued, sendEmail } from "@/lib/email/send";
import { paymentReminderEmail, phaseOpenEmail } from "@/lib/email/templates";
import { syncFromGateway } from "@/lib/payments/service";
import { phaseWindow } from "@/lib/phases";
import { formatMoney } from "@/lib/pricing";
import { fmtDate, fmtRange } from "@/lib/format";
import { autoActivatePending } from "@/lib/elco";

// Daily housekeeping (vercel.json cron, Authorization: Bearer CRON_SECRET). Every step is idempotent (email dedupe keys,
// monotonic payment states), so running it twice is harmless.
export const maxDuration = 60;

function authorised(req: Request) {
  const want = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  return !!want && want.length >= 16 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const out: Record<string, number> = {};
  const cohort = await currentCohort();
  const s = cohort.settings;

  // 0. A cancellation interrupted mid-way (server restart): put the attempt back to what it was; the sync below re-reads it.
  out.unstuck = (await q(`update gif.payments set status = coalesce(cancel_prev_status, 'pending'), cancel_result = 'gateway_error', updated_at = now()
    where status = 'cancelling' and cancel_requested_at < now() - interval '10 minutes' returning id`)).length;
  // 1. Reconcile payments still waiting (missed notifications): re-read status from Midtrans.
  const pending = await q<{ order_id: string }>(`select order_id from gif.payments where gateway = 'midtrans' and status in ('created', 'pending')
    and created_at < now() - interval '10 minutes' and created_at > now() - interval '30 days' order by created_at limit 100`);
  for (const p of pending) await syncFromGateway(p.order_id, "status_check").catch(() => null);
  out.reconciled = pending.length;
  // A checkout nobody opened never reaches Midtrans: close it after a day so the portal doesn't show it as waiting.
  out.expired = (await q("update gif.payments set status = 'expired', updated_at = now() where gateway = 'midtrans' and status = 'created' and created_at < now() - interval '1 day' returning id")).length;

  // 2. Payment reminders: open obligations due within 14 days (or overdue), at most once a week each.
  const due = await q<{ id: string; label: string; amount: number; currency: "IDR" | "USD"; due_at: string; legal_name: string; email: string; application_id: string }>(
    `select o.id, o.label, o.amount, o.currency, o.due_at, p.legal_name, p.email, o.application_id from gif.obligations o
     join gif.participants p on p.id = o.participant_id join gif.applications a on a.id = o.application_id
     where o.status = 'open' and o.due_at is not null and o.due_at < now() + interval '14 days' and a.status <> 'withdrawn' and p.withdrawn_at is null`);
  const week = Math.floor(Date.now() / (7 * 86400000));
  for (const o of due) {
    await sendEmail({ to: o.email, template: o.label.includes("balance") ? "balance_reminder" : "payment_reminder", ...paymentReminderEmail(o.legal_name, o.label, formatMoney(o.amount, o.currency), fmtDate(o.due_at)),
      dedupeKey: `reminder:${o.id}:${week}`, applicationId: o.application_id }).catch(() => null);
  }
  out.reminders = due.length;

  // 3. Phase-opening emails, once per application per phase, on the day the phase opens.
  for (const phase of [2, 3] as const) {
    const w = phaseWindow(phase, s);
    if (!w.open) continue;
    const statuses = phase === 2 ? ["phase_1_completed"] : ["phase_2_submitted", "phase_1_completed"];
    const apps = await q<{ id: string; legal_name: string; email: string; pathway: string; status: string }>(
      `select a.id, p.legal_name, p.email, a.pathway, a.status from gif.applications a join gif.participants p on p.application_id = a.id and p.role = 'leader'
       where a.cohort_id = $1 and a.status = any($2)`, [cohort.id, statuses]);
    for (const a of apps) {
      if (phase === 3 && a.status === "phase_1_completed" && a.pathway !== "mentoring") continue;
      if (phase === 2 && a.pathway !== "fully_funded") continue;
      const window = phase === 2 ? fmtRange("2027-05-11", "2027-05-24") : fmtRange("2027-05-25", "2027-05-27");
      await sendEmail({ to: a.email, template: `phase${phase}_open`, ...phaseOpenEmail(a.legal_name, phase, window), dedupeKey: `phaseopen:${phase}:${a.id}`, applicationId: a.id }).catch(() => null);
    }
  }

  // 3b. Elco Pro: retry automatic activation for paid subscriptions still pending (no-op until the Elco API is configured).
  out.elco = await autoActivatePending().catch(() => 0);

  // 4. Retry queued or failed emails; housekeeping.
  out.emails = await deliverQueued(200);
  await q("delete from gif.sessions where expires_at < now()");
  await q("delete from gif.login_codes where created_at < now() - interval '2 days'");
  await q("delete from gif.rate_limits where window_start < now() - interval '2 days'");
  return NextResponse.json({ ok: true, ...out });
}
