"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, CalendarPlus, Check, Download, Receipt } from "lucide-react";
import { useLocalFormat, useViewerZone } from "@/components/time/TimeZoneProvider";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { idr } from "@/lib/format";
import { allZones, formatClock, zoneOptionLabel } from "@/lib/time/zone";
import { elcoHref } from "@/lib/elco";
import { ledgerSummary } from "@/lib/tutoring/payments";
import { invoiceHtml, receiptHtml } from "@/lib/tutoring/documents";
import {
  BOOKING_LABEL, PACKAGE_LABEL, STATUS_LABEL, addHour, downloadHtml, loadEnrolmentBundle, rpc, toLedger, zonedLocalToUtc,
  type Booking, type Bundle, type Enrolment,
} from "@/lib/tutoring/client";
import { Notifications } from "./Notifications";
import { payOnline, useCourseConfig } from "@/components/ielscourse/checkout";
import { MENTOR_TITLE, generalRequestUrl } from "@/components/tutoring/packages";

const BANK_DETAILS = process.env.NEXT_PUBLIC_TUTORING_BANK_DETAILS || "the IELSco bank account the team sends you on WhatsApp";

export function StudentWorkspace({ supabase, userName }: { supabase: SupabaseClient; userName: string }) {
  const [list, setList] = useState<Enrolment[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from("tutoring_enrolments").select("*").order("created_at", { ascending: false });
    if (e) setError(e.message); else setList((data ?? []) as Enrolment[]);
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => { setError(""); void load(); }} />;
  if (!list) return <LoadingState />;
  const e = list.find((x) => x.status !== "cancelled");
  if (!e) {
    return (
      <>
        <PageHeader title="Private Tutoring" description="Your learning workspace for sessions with your mentor." />
        <EmptyState title="No tutoring package yet" body="After your package is confirmed and your first payment is verified, your workspace opens here." action={<Link href="/products/courses" className={btnPrimary}>See packages</Link>} />
        <p className="mt-4 text-center text-base text-[#2F4157]/70">Already paid? <a className="font-semibold underline" href={generalRequestUrl()} target="_blank" rel="noopener noreferrer">Message the team on WhatsApp</a>.</p>
      </>
    );
  }
  return <Workspace supabase={supabase} e={e} userName={userName} onChange={load} />;
}

function Workspace({ supabase, e, userName, onChange }: { supabase: SupabaseClient; e: Enrolment; userName: string; onChange: () => void }) {
  const fmt = useLocalFormat();
  const [b, setB] = useState<Bundle | null>(null);
  const [mentor, setMentor] = useState("your mentor");
  const [unlocked, setUnlocked] = useState(0);
  const [err, setErr] = useState("");
  const [booking, setBooking] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [bundle, m, u] = await Promise.all([
        loadEnrolmentBundle(supabase, e.id),
        supabase.from("tutoring_mentors").select("display_name").eq("user_id", e.mentor_id).maybeSingle(),
        rpc(supabase, "tutoring_sessions_unlocked", { p_enrolment: e.id }),
      ]);
      setB(bundle); setMentor((m.data as { display_name?: string } | null)?.display_name ?? "your mentor"); setUnlocked(Number(u ?? 0)); onChange();
    } catch (x) { setErr(x instanceof Error ? x.message : "Could not load"); }
  }, [supabase, e.id, e.mentor_id, onChange]);
  useEffect(() => { void reload(); }, [reload]);

  const ledger = useMemo(() => (b?.invoice ? toLedger(e, b.invoice.invoice_no, b.instalments, b.payments) : null), [b, e]);
  if (err) return <ErrorState message={err} onRetry={() => { setErr(""); void reload(); }} />;
  if (!b || !ledger) return <LoadingState />;

  const sum = ledgerSummary(ledger);
  const open = b.bookings.filter((x) => ["pending_review", "alternative_proposed", "confirmed"].includes(x.status));
  const next = open.filter((x) => x.status === "confirmed" && x.starts_at && new Date(x.starts_at) > new Date()).sort((a, c) => +new Date(a.starts_at!) - +new Date(c.starts_at!))[0];
  const proposal = open.find((x) => x.status === "alternative_proposed");
  const remaining = e.sessions_total - e.sessions_completed;
  const canRequest = e.status === "active" && e.sessions_completed + open.length < unlocked;
  const active = e.status === "active" || e.status === "payment_review";

  // One clear next action.
  let action: { text: string; cta?: React.ReactNode };
  if (e.status === "pending_payment") action = { text: `Your invoice ${ledger.invoiceNo} is ready. Pay ${idr(sum.nextPayment?.amountIdr ?? 0)} online below. Your workspace unlocks as soon as Midtrans confirms the payment.` };
  else if (e.status === "payment_review") action = { text: "A payment is overdue and your account is under review. Please contact the team so we can sort it out and keep your sessions going.", cta: <a className={btnSecondary} href={generalRequestUrl()} target="_blank" rel="noopener noreferrer">Message the team</a> };
  else if (proposal) action = { text: "Your mentor proposed a different time. Accept it or ask for another.", cta: <AcceptButton supabase={supabase} b={proposal} onDone={reload} /> };
  else if (!b.goals) action = { text: "Tell us your goals so your mentor can build your plan before the first session.", cta: <button className={btnPrimary} onClick={() => setGoalsOpen(true)}>Complete onboarding</button> };
  else if (open.some((x) => x.status === "pending_review")) action = { text: "Your request is with your mentor. You will be notified here when a time is confirmed or another is suggested.", cta: canRequest ? <button className={btnSecondary} onClick={() => setBooking(true)}>Propose more times</button> : undefined };
  else if (canRequest) action = { text: next ? "Need another session? Propose times that suit you." : "Propose times for your next session.", cta: <button className={btnPrimary} onClick={() => setBooking(true)} data-testid="book-session"><CalendarPlus size={18} aria-hidden="true" /> Book a session</button> };
  else if (e.status === "completed") action = { text: "You have completed your package. Well done. Want to continue?", cta: <Link className={btnPrimary} href="/products/courses">See packages</Link> };
  else action = { text: sum.nextPayment ? `Your next sessions open after ${sum.nextPayment.label.toLowerCase()} (${idr(sum.nextPayment.amountIdr)}) is verified.` : "Your requests are with your mentor." };

  return (
    <div className="space-y-6" data-testid="student-workspace">
      <PageHeader title={`Welcome, ${userName}`} description={`${PACKAGE_LABEL[e.package_code]} package with ${mentor}. ${b.goals?.objective ? `Goal: ${b.goals.objective}` : ""}`} />

      <section className={cn(card, "p-5 sm:p-6")} aria-label="Next step">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#577E90]">What to do next</p>
        <p className="mt-2 text-lg font-semibold text-[#1A2534]" data-testid="next-action">{action.text}</p>
        {action.cta && <div className="mt-4">{action.cta}</div>}
        <div className="mt-5 grid gap-3 border-t border-[#E3E7ED] pt-4 sm:grid-cols-2">
          <div><p className="text-sm text-[#2F4157]/70">Next session</p><p className="text-base font-semibold" data-testid="next-session">{next?.starts_at ? fmt.dateTime(next.starts_at) : "Nothing scheduled yet"}</p></div>
          <div><p className="text-sm text-[#2F4157]/70">Status</p><p className="text-base font-semibold">{STATUS_LABEL[e.status]}</p></div>
        </div>
      </section>

      {booking && <BookSheet supabase={supabase} e={e} onClose={() => setBooking(false)} onDone={() => { setBooking(false); void reload(); }} />}
      {goalsOpen && <GoalsForm supabase={supabase} e={e} onClose={() => setGoalsOpen(false)} onDone={() => { setGoalsOpen(false); void reload(); }} />}

      <section className={cn(card, "p-5 sm:p-6")} aria-label="My package">
        <h2 className="text-xl font-bold">My package</h2>
        <p className="mt-3 text-2xl font-extrabold" data-testid="sessions-summary">{e.sessions_total} sessions purchased · {e.sessions_completed} completed · {remaining} remaining</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#EEF2F7]" role="progressbar" aria-valuenow={e.sessions_completed} aria-valuemax={e.sessions_total} aria-label="Sessions completed">
          <div className="h-full rounded-full bg-[#2F4157]" style={{ width: `${(e.sessions_completed / e.sessions_total) * 100}%` }} />
        </div>
        <dl className="mt-5 grid gap-4 text-base sm:grid-cols-2">
          <div><dt className="text-sm text-[#2F4157]/70">Package</dt><dd className="font-semibold">{PACKAGE_LABEL[e.package_code]} ({e.payment_option === "full" ? "paid in full" : "deposit arrangement"})</dd></div>
          <div><dt className="text-sm text-[#2F4157]/70">Activated</dt><dd className="font-semibold">{e.activated_at ? fmt.date(e.activated_at) : "After your first payment is verified"}</dd></div>
          <div><dt className="text-sm text-[#2F4157]/70">Sessions you can book now</dt><dd className="font-semibold">{Math.max(0, unlocked - e.sessions_completed - open.length)}</dd></div>
          <div><dt className="text-sm text-[#2F4157]/70">IELS Circle</dt><dd className="font-semibold">{e.circle_access ? "Included" : "Starts after activation"}</dd></div>
        </dl>
      </section>

      <section className={cn(card, "p-5 sm:p-6")} aria-label="Elco AI">
        <h2 className="text-xl font-bold">Elco AI</h2>
        {e.elco_access_status === "granted" ? (
          <p className="mt-2 text-base">Active{e.elco_access_expires_at ? <> until <strong>{fmt.date(e.elco_access_expires_at)}</strong></> : null}.</p>
        ) : e.elco_access_status === "expired" ? <p className="mt-2 text-base">Your included month has ended. You can continue on Elco&apos;s pricing page.</p>
          : <p className="mt-2 text-base">{active ? "Your team is activating your included month of Elco AI. We will update this when it is ready." : "Activated after your first payment is verified."}</p>}
        <a className={cn(btnSecondary, "mt-4")} href={elcoHref("tutoring-dashboard")} target="_blank" rel="noopener noreferrer">Open Elco AI <ArrowUpRight size={16} aria-hidden="true" /></a>
      </section>

      <Notifications supabase={supabase} />
      <Roadmap b={b} />
      <Bookings b={b} supabase={supabase} onDone={reload} />
      <Sessions b={b} />
      <Payments e={e} b={b} ledger={ledger} name={userName} />
      <p className="pb-6 text-sm text-[#2F4157]/60">{MENTOR_TITLE.length ? `Your mentor: Arbadza Rido — ${MENTOR_TITLE}.` : ""} Requested times are not confirmed until your mentor confirms them. To reschedule or cancel, use the buttons on the session. Please give at least 24 hours&apos; notice.</p>
    </div>
  );
}

function Roadmap({ b }: { b: Bundle }) {
  return (
    <section className={cn(card, "p-5 sm:p-6")} aria-label="My learning roadmap">
      <h2 className="text-xl font-bold">My learning roadmap</h2>
      {b.goals && (
        <dl className="mt-3 grid gap-3 text-base sm:grid-cols-2">
          {([["Goal", b.goals.objective], ["Target", b.goals.target], ["Current level", b.goals.current_level], ["Deadline", b.goals.target_date], ["Focus", b.goals.preferred_focus], ["Difficulties", b.goals.difficulties]] as [string, string | null][])
            .filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="text-sm text-[#2F4157]/70">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
        </dl>
      )}
      {b.stages.length === 0 ? <p className="mt-4 text-base text-[#2F4157]/75">{b.goals ? "Your mentor is preparing your personal roadmap." : "Complete onboarding and your mentor will build a roadmap around your goals."}</p> : (
        <ol className="mt-4 space-y-3">
          {b.stages.map((s) => (
            <li key={s.id} className="flex gap-3">
              <span className={cn("mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", s.status === "done" ? "bg-[#2D7A58] text-white" : s.status === "current" ? "bg-[#2F4157] text-white" : "bg-[#EEF2F7] text-[#2F4157]")}>{s.status === "done" ? <Check size={14} aria-hidden="true" /> : s.position + 1}</span>
              <div><p className="font-semibold">{s.title}{s.status === "current" && <span className={cn(tag, "ml-2")}>Now</span>}</p>{s.note && <p className="text-base text-[#2F4157]/75">{s.note}</p>}</div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Bookings({ b, supabase, onDone }: { b: Bundle; supabase: SupabaseClient; onDone: () => void }) {
  const fmt = useLocalFormat();
  const [msg, setMsg] = useState("");
  const live = b.bookings.filter((x) => ["pending_review", "alternative_proposed", "confirmed"].includes(x.status));
  const cancel = async (x: Booking) => {
    const reason = window.prompt("Why are you cancelling or rescheduling? (required)");
    if (!reason) return;
    try { await rpc(supabase, "tutoring_cancel_booking", { p_booking: x.id, p_reason: reason, p_no_show: false }); onDone(); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); }
  };
  return (
    <section className={cn(card, "p-5 sm:p-6")} aria-label="Upcoming and requested sessions">
      <h2 className="text-xl font-bold">Upcoming and requested sessions</h2>
      {msg && <p role="alert" className="mt-2 text-base text-[#B3373A]">{msg}</p>}
      {live.length === 0 ? <p className="mt-3 text-base text-[#2F4157]/75">No sessions requested yet.</p> : (
        <ul className="mt-3 divide-y divide-[#E3E7ED]">
          {live.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`booking-${x.status}`}>
              <div>
                <p className="font-semibold">{x.status === "confirmed" && x.starts_at ? fmt.dateTime(x.starts_at) : x.status === "alternative_proposed" && x.alternative_slots[0] ? `Proposed: ${fmt.dateTime(x.alternative_slots[0].start)}` : `${x.requested_slots.length} time${x.requested_slots.length === 1 ? "" : "s"} proposed`}</p>
                <p className="text-sm text-[#2F4157]/70">{BOOKING_LABEL[x.status]}{x.decision_note ? ` · ${x.decision_note}` : ""}{x.focus ? ` · ${x.focus}` : ""}</p>
              </div>
              <div className="flex gap-2">
                {x.status === "alternative_proposed" && <AcceptButton supabase={supabase} b={x} onDone={onDone} />}
                <button className={btnSecondary} onClick={() => cancel(x)}>{x.status === "confirmed" ? "Reschedule or cancel" : "Withdraw"}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AcceptButton({ supabase, b, onDone }: { supabase: SupabaseClient; b: Booking; onDone: () => void }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  return (<>
    <button className={btnPrimary} disabled={busy} data-testid="accept-alternative" onClick={async () => { setBusy(true); try { await rpc(supabase, "tutoring_accept_alternative", { p_booking: b.id }); onDone(); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); setBusy(false); } }}>Accept proposed time</button>
    {err && <span role="alert" className="text-sm text-[#B3373A]">{err}</span>}
  </>);
}

function Sessions({ b }: { b: Bundle }) {
  const fmt = useLocalFormat();
  const done = b.bookings.filter((x) => x.status === "completed").sort((a, c) => +new Date(c.starts_at!) - +new Date(a.starts_at!));
  return (
    <section className={cn(card, "p-5 sm:p-6")} aria-label="Session history">
      <h2 className="text-xl font-bold">Session history</h2>
      {done.length === 0 ? <p className="mt-3 text-base text-[#2F4157]/75">Your feedback and homework appear here after each session.</p> : (
        <ul className="mt-3 space-y-5">
          {done.map((x) => {
            const r = b.records.find((y) => y.booking_id === x.id);
            return (
              <li key={x.id} className="border-t border-[#E3E7ED] pt-4 first:border-0 first:pt-0" data-testid="session-record">
                <p className="font-semibold">{x.starts_at ? fmt.date(x.starts_at) : ""} · {r?.topic}</p>
                {r && (<dl className="mt-2 space-y-1.5 text-base">
                  {r.skills.length > 0 && <div><dt className="inline font-semibold">Skills practised: </dt><dd className="inline">{r.skills.join(", ")}</dd></div>}
                  {r.strengths && <div><dt className="inline font-semibold">Strengths: </dt><dd className="inline">{r.strengths}</dd></div>}
                  {r.improvements && <div><dt className="inline font-semibold">To improve: </dt><dd className="inline">{r.improvements}</dd></div>}
                  {r.feedback && <div><dt className="inline font-semibold">Feedback: </dt><dd className="inline">{r.feedback}</dd></div>}
                  {r.homework && <div><dt className="inline font-semibold">Homework: </dt><dd className="inline">{r.homework}</dd></div>}
                  {r.next_focus && <div><dt className="inline font-semibold">Next focus: </dt><dd className="inline">{r.next_focus}</dd></div>}
                </dl>)}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Payments({ e, b, ledger, name }: { e: Enrolment; b: Bundle; ledger: ReturnType<typeof toLedger>; name: string }) {
  const fmt = useLocalFormat();
  const sum = ledgerSummary(ledger);
  const nextDue = [...b.instalments].sort((x, y) => x.seq - y.seq).find((i) => i.status !== "verified");
  return (
    <section className={cn(card, "p-5 sm:p-6")} aria-label="Payments and invoices" data-testid="payments">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Payments &amp; invoices</h2>
        <button className={btnSecondary} onClick={() => downloadHtml(`${ledger.invoiceNo}.html`, invoiceHtml(ledger, { name }, { name: PACKAGE_LABEL[e.package_code], sessions: e.sessions_total, includes: ["1 month of Elco AI", "IELS Circle access", "personalised feedback and learning plan"] }, new Date().toISOString().slice(0, 10), BANK_DETAILS))}>
          <Download size={16} aria-hidden="true" /> Invoice {ledger.invoiceNo}
        </button>
      </div>
      <p className="mt-3 text-base">Total {idr(sum.totalIdr)} · Paid <strong>{idr(sum.totalPaidIdr)}</strong> · Outstanding <strong data-testid="outstanding">{idr(sum.remainingIdr)}</strong></p>
      <ul className="mt-3 divide-y divide-[#E3E7ED]">
        {b.instalments.map((i) => {
          const pay = b.payments.find((p) => p.instalment_id === i.id);
          const rc = pay && b.receipts.find((r) => r.payment_id === pay.id);
          return (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div><p className="font-semibold">{i.kind === "full" ? "Full payment" : i.kind === "deposit" ? "Deposit" : i.kind === "instalment_1" ? "Instalment 1" : "Instalment 2"} · {idr(Number(i.amount_idr))}</p>
                <p className="text-sm text-[#2F4157]/70">{i.status === "verified" ? `Paid and verified ${fmt.date(i.verified_at!)}` : `${i.trigger_text}${i.due_date ? ` (by ${fmt.date(i.due_date)})` : ""}`}</p></div>
              {rc ? <button className={btnSecondary} onClick={() => downloadHtml(`${rc.receipt_no}.html`, receiptHtml(ledger, ledger.payments.find((p) => p.milestone === i.kind)!, rc.receipt_no, { name }))}><Receipt size={16} aria-hidden="true" /> {rc.receipt_no}</button>
                : nextDue?.id === i.id ? <PayInstalment instalmentId={i.id} amount={Number(i.amount_idr)} needsAgreement={!e.agreement_confirmed_at} /> : <span className={tag}>Due</span>}
            </li>
          );
        })}
      </ul>
      {sum.nextPayment && <p className="mt-3 text-base">Next payment: <strong>{sum.nextPayment.label}, {idr(sum.nextPayment.amountIdr)}</strong>, {sum.nextPayment.trigger.toLowerCase()}{sum.nextPayment.dueDate ? ` (by ${fmt.date(sum.nextPayment.dueDate)})` : ""}. Pay online with Midtrans (bank transfer, QRIS, e-wallet or card): it is confirmed automatically and your receipt appears here.</p>}
    </section>
  );
}

function GoalsForm({ supabase, e, onClose, onDone }: { supabase: SupabaseClient; e: Enrolment; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ level: "", objective: "", target: "", difficulties: "", date: "", focus: "", context: "" });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: ev.target.value });
  return (
    <form className={cn(card, "space-y-4 p-5 sm:p-6")} data-testid="goals-form" onSubmit={async (ev) => {
      ev.preventDefault(); setBusy(true); setErr("");
      try { await rpc(supabase, "tutoring_submit_goals", { p_enrolment: e.id, p_level: f.level || null, p_objective: f.objective, p_target: f.target || null, p_difficulties: f.difficulties || null, p_target_date: f.date || null, p_focus: f.focus || null, p_context: f.context || null }); onDone(); }
      catch (x) { setErr(x instanceof Error ? x.message : "Failed"); setBusy(false); }
    }}>
      <h2 className="text-xl font-bold">Tell your mentor about your goals</h2>
      <div><label className={labelClass} htmlFor="g-obj">Main learning objective</label><input id="g-obj" required className={inputClass} value={f.objective} onChange={set("objective")} placeholder="e.g. IELTS Academic 7.0, LPDP interview, speak confidently at work" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={labelClass} htmlFor="g-target">Specific target</label><select id="g-target" className={inputClass} value={f.target} onChange={set("target")}><option value="">Choose…</option>{["IELTS", "TOEFL ITP", "TOEIC", "Scholarship", "Career / work abroad", "Speaking", "Grammar", "Academic writing", "Other"].map((o) => <option key={o}>{o}</option>)}</select></div>
        <div><label className={labelClass} htmlFor="g-level">Current English level (if known)</label><input id="g-level" className={inputClass} value={f.level} onChange={set("level")} placeholder="e.g. IELTS 5.5, B1, not sure" /></div>
        <div><label className={labelClass} htmlFor="g-date">Target date or deadline</label><input id="g-date" type="date" className={inputClass} value={f.date} onChange={set("date")} /></div>
        <div><label className={labelClass} htmlFor="g-focus">Preferred learning focus</label><input id="g-focus" className={inputClass} value={f.focus} onChange={set("focus")} placeholder="e.g. writing first" /></div>
      </div>
      <div><label className={labelClass} htmlFor="g-diff">Current difficulties</label><textarea id="g-diff" rows={2} className={inputClass} value={f.difficulties} onChange={set("difficulties")} /></div>
      <div><label className={labelClass} htmlFor="g-ctx">Anything else we should know?</label><textarea id="g-ctx" rows={2} className={inputClass} value={f.context} onChange={set("context")} /></div>
      {err && <p role="alert" className="text-base text-[#B3373A]">{err}</p>}
      <div className="flex gap-3"><button className={btnPrimary} disabled={busy}>Save goals</button><button type="button" className={btnSecondary} onClick={onClose}>Cancel</button></div>
    </form>
  );
}

function BookSheet({ supabase, e, onClose, onDone }: { supabase: SupabaseClient; e: Enrolment; onClose: () => void; onDone: () => void }) {
  const viewer = useViewerZone();
  const [zone, setZone] = useState(viewer);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [focus, setFocus] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const zones = useMemo(() => allZones(), []);

  useEffect(() => {
    const from = new Date().toISOString().slice(0, 10), to = new Date(Date.now() + 21 * 864e5).toISOString().slice(0, 10);
    rpc(supabase, "tutoring_open_slots", { p_mentor: e.mentor_id, p_from: from, p_to: to }).then((d) => setSlots(((d ?? []) as { starts_at: string }[]).map((r) => r.starts_at))).catch((x) => { setErr(x.message); setSlots([]); });
  }, [supabase, e.mentor_id]);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of slots ?? []) { const k = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(new Date(s)); m.set(k, [...(m.get(k) ?? []), s]); }
    return [...m.entries()];
  }, [slots, zone]);
  const toggle = (s: string) => setPicked((p) => p.includes(s) ? p.filter((x) => x !== s) : p.length >= 3 ? p : [...p, s]);
  const all = [...picked, ...(manual ? [zonedLocalToUtc(manual, zone)] : [])];

  return (
    <form className={cn(card, "space-y-4 p-5 sm:p-6")} data-testid="book-form" onSubmit={async (ev) => {
      ev.preventDefault(); if (!all.length) { setErr("Choose at least one time."); return; }
      setBusy(true); setErr("");
      try { await rpc(supabase, "tutoring_request_booking", { p_enrolment: e.id, p_slots: all.map((s) => ({ start: s, end: addHour(s) })), p_timezone: zone, p_focus: focus || null }); onDone(); }
      catch (x) { setErr(x instanceof Error ? x.message : "Failed"); setBusy(false); }
    }}>
      <h2 className="text-xl font-bold">Book a session</h2>
      <p className="text-base text-[#2F4157]/75">Choose up to 3 times that suit you. Sessions are 60 minutes. Your mentor confirms one, or suggests another time. A requested time is not confirmed until then.</p>
      <div><label className={labelClass} htmlFor="b-zone">Your timezone</label>
        <select id="b-zone" className={inputClass} value={zone} onChange={(x) => { setZone(x.target.value); }}>{zones.map((z) => <option key={z} value={z}>{zoneOptionLabel(z)}</option>)}</select></div>
      {slots === null ? <LoadingState label="Finding times…" /> : byDay.length === 0 ? <p className="text-base">No open times in the next 3 weeks. Propose your own time below and your mentor will respond.</p> : (
        <div className="space-y-3">
          {byDay.map(([day, list]) => (
            <div key={day}><p className="text-sm font-semibold text-[#577E90]">{day}</p>
              <div className="mt-1 flex flex-wrap gap-2">{list.map((s) => (
                <button type="button" key={s} onClick={() => toggle(s)} aria-pressed={picked.includes(s)} data-testid="slot"
                  className={cn("rounded-full border px-4 py-2 text-base font-semibold", picked.includes(s) ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157]")}>{formatClock(s, zone)}</button>
              ))}</div></div>
          ))}
        </div>
      )}
      <div><label className={labelClass} htmlFor="b-manual">Or propose another time (optional)</label><input id="b-manual" type="datetime-local" className={inputClass} value={manual} onChange={(x) => setManual(x.target.value)} /></div>
      <div><label className={labelClass} htmlFor="b-focus">What do you want to focus on? (optional)</label><textarea id="b-focus" rows={2} className={inputClass} value={focus} onChange={(x) => setFocus(x.target.value)} /></div>
      {err && <p role="alert" className="text-base text-[#B3373A]">{err}</p>}
      <div className="flex gap-3"><button className={btnPrimary} disabled={busy} data-testid="submit-booking">Send request{all.length ? ` (${all.length})` : ""}</button><button type="button" className={btnSecondary} onClick={onClose}>Cancel</button></div>
    </form>
  );
}

// Online payment of the next due instalment (Midtrans production). Hidden, with the old bank-transfer note kept, while
// online checkout is closed. The amount comes from the instalment in the database, not from this button.
function PayInstalment({ instalmentId, amount, needsAgreement }: { instalmentId: string; amount: number; needsAgreement: boolean }) {
  const { cfg } = useCourseConfig();
  const [agreed, setAgreed] = useState(!needsAgreement);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!cfg?.checkout.enabled) return <span className={tag} title={`Pay by bank transfer to ${BANK_DETAILS} and send the proof on WhatsApp`}>Due</span>;
  return (
    <span className="flex flex-col items-end gap-1" data-testid="pay-online">
      {needsAgreement && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={agreed} onChange={(ev) => setAgreed(ev.target.checked)} /> I agree to the payment schedule</label>}
      <button className={btnPrimary} disabled={!agreed || busy} onClick={async () => {
        setBusy(true); setErr("");
        try { await payOnline({ product: "one", instalment_id: instalmentId, agreed }); } catch (x) { setErr(x instanceof Error ? x.message : "Couldn't start the payment."); setBusy(false); }
      }}>{busy ? "Opening payment…" : `Pay ${idr(amount)} online`}</button>
      {err && <span role="alert" className="text-sm text-[#B42318]">{err}</span>}
    </span>
  );
}
