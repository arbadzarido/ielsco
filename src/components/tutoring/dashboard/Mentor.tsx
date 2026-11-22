"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useLocalFormat, useViewerZone } from "@/components/time/TimeZoneProvider";
import { ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { idr } from "@/lib/format";
import { formatClock } from "@/lib/time/zone";
import { BOOKING_LABEL, PACKAGE_LABEL, STATUS_LABEL, loadEnrolmentBundle, rpc, zonedLocalToUtc, addHour, type Booking, type Bundle } from "@/lib/tutoring/client";
import { useTutoringRole } from "./useStaff";
import { Notifications } from "./Notifications";

type Row = {
  enrolment_id: string; student_id: string; student_name: string; student_email: string; package_code: "starter" | "growth" | "intensive"; status: keyof typeof STATUS_LABEL;
  sessions_total: number; sessions_completed: number; total_price_idr: number; paid_idr: number; next_label: string | null; next_amount_idr: number | null; next_due: string | null;
  activated_at: string | null; created_at: string; open_requests: number; last_session: string | null; elco_access_status: string; elco_access_expires_at: string | null; invoice_no: string; payment_option: string;
};
const TABS = ["Overview", "Bookings", "Students", "Payments", "Availability"] as const;
type Tab = (typeof TABS)[number];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function MentorDashboard({ supabase }: { supabase: SupabaseClient }) {
  const role = useTutoringRole(supabase);
  const [tab, setTab] = useState<Tab>("Overview");
  const [roster, setRoster] = useState<Row[] | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, b] = await Promise.all([supabase.rpc("tutoring_roster"), supabase.from("tutoring_bookings").select("*").order("starts_at", { ascending: true, nullsFirst: false })]);
    if (r.error) setError(r.error.message); else if (b.error) setError(b.error.message); else { setRoster((r.data ?? []) as Row[]); setBookings((b.data ?? []) as Booking[]); }
  }, [supabase]);
  useEffect(() => { if (role?.staff) void load(); }, [role, load]);

  if (!role) return <LoadingState />;
  if (!role.staff) return <ErrorState message="This area is for IELSco tutoring mentors and admins." />;
  if (error) return <ErrorState message={error} onRetry={() => { setError(""); void load(); }} />;
  if (!roster) return <LoadingState />;
  const name = (id: string) => roster.find((r) => r.student_id === id)?.student_name ?? "Student";

  return (
    <div className="space-y-5" data-testid="mentor-dashboard">
      <PageHeader title="Tutoring management" description="Students, booking requests, calendar, payments and learning records." />
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Tutoring management sections">
        {TABS.filter((t) => t !== "Payments" || role.admin).map((t) => (
          <button key={t} onClick={() => { setTab(t); setOpen(null); }} aria-current={tab === t} className={cn("shrink-0 rounded-full px-4 py-2 text-base font-semibold", tab === t ? "bg-[#2F4157] text-white" : "border border-[#E3E7ED] bg-white text-[#2F4157]")}>
            {t}{t === "Bookings" && bookings.some((b) => b.status === "pending_review") ? ` (${bookings.filter((b) => b.status === "pending_review").length})` : ""}
          </button>
        ))}
      </nav>
      <Notifications supabase={supabase} />
      {tab === "Overview" && <Overview roster={roster} bookings={bookings} name={name} go={setTab} />}
      {tab === "Bookings" && <BookingsTab supabase={supabase} bookings={bookings} name={name} roster={roster} onDone={load} />}
      {tab === "Students" && (open ? <StudentDetail supabase={supabase} row={roster.find((r) => r.enrolment_id === open)!} onBack={() => setOpen(null)} onDone={load} /> : <Students roster={roster} onOpen={setOpen} />)}
      {tab === "Payments" && role.admin && <PaymentsTab supabase={supabase} roster={roster} onDone={load} />}
      {tab === "Availability" && <Availability supabase={supabase} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "warn" }) {
  return <div className={cn(card, "p-4", tone === "warn" && Number(value) > 0 && "border-[#E56668]")}><p className="text-3xl font-extrabold">{value}</p><p className="text-sm text-[#2F4157]/75">{label}</p></div>;
}

function Overview({ roster, bookings, name, go }: { roster: Row[]; bookings: Booking[]; name: (id: string) => string; go: (t: Tab) => void }) {
  const fmt = useLocalFormat();
  const now = Date.now();
  const upcoming = bookings.filter((b) => b.status === "confirmed" && b.starts_at && new Date(b.starts_at).getTime() > now);
  const pending = bookings.filter((b) => b.status === "pending_review");
  const active = roster.filter((r) => r.status === "active" || r.status === "payment_review");
  const owing = roster.filter((r) => r.status !== "cancelled" && Number(r.paid_idr) < Number(r.total_price_idr));
  const recent = roster.filter((r) => r.last_session).sort((a, b) => +new Date(b.last_session!) - +new Date(a.last_session!)).slice(0, 5);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active students" value={active.length} />
        <Stat label="New (last 14 days)" value={roster.filter((r) => now - new Date(r.created_at).getTime() < 14 * 864e5).length} />
        <Stat label="Upcoming sessions" value={upcoming.length} />
        <Stat label="Pending booking requests" value={pending.length} tone="warn" />
        <Stat label="Completed sessions" value={roster.reduce((s, r) => s + r.sessions_completed, 0)} />
        <Stat label="Students with sessions left" value={active.filter((r) => r.sessions_completed < r.sessions_total).length} />
        <Stat label="Outstanding payments" value={owing.length} tone="warn" />
        <Stat label="Under payment review" value={roster.filter((r) => r.status === "payment_review").length} tone="warn" />
      </div>
      <section className={cn(card, "p-5")}><h2 className="text-lg font-bold">Needs your attention</h2>
        {pending.length === 0 && owing.length === 0 ? <p className="mt-2 text-base">Nothing waiting.</p> : (
          <ul className="mt-2 space-y-2 text-base">
            {pending.slice(0, 5).map((b) => <li key={b.id}><button className="underline" onClick={() => go("Bookings")}>{name(b.student_id)} requested a session</button></li>)}
            {owing.slice(0, 5).map((r) => <li key={r.enrolment_id}>{r.student_name}: {idr(Number(r.total_price_idr) - Number(r.paid_idr))} outstanding{r.next_label ? `, next ${r.next_label.replace("_", " ")}` : ""}{r.next_due ? ` by ${fmt.date(r.next_due)}` : ""}</li>)}
          </ul>)}
      </section>
      <section className={cn(card, "p-5")}><h2 className="text-lg font-bold">Upcoming sessions</h2>
        {upcoming.length === 0 ? <p className="mt-2 text-base">No confirmed sessions.</p> : <ul className="mt-2 space-y-1 text-base">{upcoming.slice(0, 6).map((b) => <li key={b.id}><strong>{fmt.dateTime(b.starts_at!)}</strong> · {name(b.student_id)}</li>)}</ul>}
      </section>
      <section className={cn(card, "p-5")}><h2 className="text-lg font-bold">Recent learning progress</h2>
        {recent.length === 0 ? <p className="mt-2 text-base">No completed sessions yet.</p> : <ul className="mt-2 space-y-1 text-base">{recent.map((r) => <li key={r.enrolment_id}>{r.student_name}: {r.sessions_completed} of {r.sessions_total} done, last session {fmt.date(r.last_session!)}</li>)}</ul>}
      </section>
    </div>
  );
}

// ── Bookings: pending requests, week calendar, completion ───────────────────────────────────────────────────────────
function BookingsTab({ supabase, bookings, name, roster, onDone }: { supabase: SupabaseClient; bookings: Booking[]; name: (id: string) => string; roster: Row[]; onDone: () => void }) {
  const [weekStart, setWeekStart] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; });
  const zone = useViewerZone();
  const fmt = useLocalFormat();
  const [msg, setMsg] = useState("");
  const [completing, setCompleting] = useState<Booking | null>(null);
  const run = async (fn: () => Promise<unknown>) => { setMsg(""); try { await fn(); onDone(); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } };

  const pending = bookings.filter((b) => b.status === "pending_review" || b.status === "alternative_proposed");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const rosterOf = (id: string) => roster.find((r) => r.enrolment_id === id);

  return (
    <div className="space-y-5">
      {msg && <p role="alert" className="rounded-xl bg-[#FDECEC] px-4 py-3 text-base text-[#B3373A]">{msg}</p>}
      <section className={cn(card, "p-5")} aria-label="Booking requests"><h2 className="text-lg font-bold">Booking requests</h2>
        {pending.length === 0 ? <p className="mt-2 text-base">No open requests.</p> : (
          <ul className="mt-3 divide-y divide-[#E3E7ED]">
            {pending.map((b) => {
              const r = rosterOf(b.enrolment_id);
              return (
                <li key={b.id} className="space-y-2 py-4" data-testid="pending-request">
                  <p className="font-semibold">{name(b.student_id)} <span className={tag}>{BOOKING_LABEL[b.status]}</span></p>
                  <p className="text-sm text-[#2F4157]/75">{r ? `${PACKAGE_LABEL[r.package_code]} · ${r.sessions_completed}/${r.sessions_total} done · paid ${idr(Number(r.paid_idr))} of ${idr(Number(r.total_price_idr))}${r.status === "payment_review" ? " · PAYMENT UNDER REVIEW" : ""}` : ""} · their zone {b.student_timezone}{b.focus ? ` · focus: ${b.focus}` : ""}</p>
                  {b.status === "pending_review" ? (<>
                    <div className="flex flex-wrap gap-2">{b.requested_slots.map((s) => (
                      <button key={s.start} className={btnPrimary} data-testid="confirm-slot" onClick={() => run(() => rpc(supabase, "tutoring_decide_booking", { p_booking: b.id, p_action: "confirm", p_start: s.start, p_end: s.end, p_note: null }))}>Confirm {fmt.dateTime(s.start)}</button>))}</div>
                    <DecisionExtras supabase={supabase} b={b} run={run} />
                  </>) : <p className="text-base">Waiting for the student to accept {b.alternative_slots[0] ? fmt.dateTime(b.alternative_slots[0].start) : "your proposal"}.</p>}
                </li>
              );
            })}
          </ul>)}
      </section>

      <section className={cn(card, "p-5")} aria-label="Calendar">
        <div className="flex items-center justify-between gap-2"><h2 className="text-lg font-bold">Week of {fmt.date(weekStart)}</h2>
          <div className="flex gap-2"><button className={btnSecondary} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}>Previous</button><button className={btnSecondary} onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}>Next</button></div></div>
        <div className="mt-3 grid gap-2 lg:grid-cols-7">
          {days.map((d) => {
            const list = confirmed.filter((b) => b.starts_at && new Date(b.starts_at).toDateString() === d.toDateString());
            return (<div key={d.toISOString()} className="rounded-xl border border-[#E3E7ED] p-2"><p className="text-sm font-semibold">{DAYS[d.getDay()].slice(0, 3)} {d.getDate()}</p>
              {list.length === 0 ? <p className="text-xs text-[#2F4157]/50">Free</p> : list.map((b) => (
                <button key={b.id} className="mt-1 block w-full rounded-lg bg-[#EEF2F7] p-2 text-left text-sm" onClick={() => setCompleting(b)} data-testid="calendar-session"><strong>{formatClock(b.starts_at!, zone)}</strong><br />{name(b.student_id)}</button>))}</div>);
          })}
        </div>
      </section>

      {completing && <CompleteForm supabase={supabase} b={completing} who={name(completing.student_id)} onClose={() => setCompleting(null)} onDone={() => { setCompleting(null); onDone(); }} />}
    </div>
  );
}

function DecisionExtras({ supabase, b, run }: { supabase: SupabaseClient; b: Booking; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [alt, setAlt] = useState(""); const [note, setNote] = useState(""); const zone = useViewerZone();
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
      <input aria-label="Alternative time" type="datetime-local" className={inputClass} value={alt} onChange={(e) => setAlt(e.target.value)} />
      <button className={btnSecondary} disabled={!alt} onClick={() => run(() => { const s = zonedLocalToUtc(alt, zone); return rpc(supabase, "tutoring_decide_booking", { p_booking: b.id, p_action: "propose", p_start: s, p_end: addHour(s), p_note: note || null }); })}>Propose this time</button>
      <input aria-label="Reason or note" className={inputClass} placeholder="Note to student (required to decline)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className={btnSecondary} onClick={() => run(() => rpc(supabase, "tutoring_decide_booking", { p_booking: b.id, p_action: "reject", p_start: null, p_end: null, p_note: note }))}>Decline</button>
    </div>
  );
}

function CompleteForm({ supabase, b, who, onClose, onDone }: { supabase: SupabaseClient; b: Booking; who: string; onClose: () => void; onDone: () => void }) {
  const fmt = useLocalFormat();
  const [f, setF] = useState({ duration: "60", topic: "", skills: "", strengths: "", improvements: "", feedback: "", homework: "", next: "", reason: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const act = async (fn: () => Promise<unknown>) => { setErr(""); try { await fn(); onDone(); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); } };
  return (
    <form className={cn(card, "space-y-3 p-5")} data-testid="complete-form" onSubmit={(e) => { e.preventDefault(); void act(() => rpc(supabase, "tutoring_complete_session", { p_booking: b.id, p_duration: Number(f.duration), p_topic: f.topic, p_skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean), p_strengths: f.strengths || null, p_improvements: f.improvements || null, p_feedback: f.feedback || null, p_homework: f.homework || null, p_next_focus: f.next || null })); }}>
      <h2 className="text-lg font-bold">Session with {who}, {fmt.dateTime(b.starts_at!)}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={labelClass} htmlFor="c-topic">Main topic</label><input id="c-topic" required className={inputClass} value={f.topic} onChange={set("topic")} /></div>
        <div><label className={labelClass} htmlFor="c-dur">Duration (minutes)</label><input id="c-dur" type="number" min={10} max={240} required className={inputClass} value={f.duration} onChange={set("duration")} /></div>
      </div>
      <div><label className={labelClass} htmlFor="c-skills">Skills practised (comma separated)</label><input id="c-skills" className={inputClass} value={f.skills} onChange={set("skills")} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={labelClass} htmlFor="c-str">Strengths observed</label><textarea id="c-str" rows={2} className={inputClass} value={f.strengths} onChange={set("strengths")} /></div>
        <div><label className={labelClass} htmlFor="c-imp">Areas for improvement</label><textarea id="c-imp" rows={2} className={inputClass} value={f.improvements} onChange={set("improvements")} /></div>
      </div>
      <div><label className={labelClass} htmlFor="c-fb">Feedback for the student</label><textarea id="c-fb" rows={2} className={inputClass} value={f.feedback} onChange={set("feedback")} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={labelClass} htmlFor="c-hw">Homework / practice</label><input id="c-hw" className={inputClass} value={f.homework} onChange={set("homework")} /></div>
        <div><label className={labelClass} htmlFor="c-next">Recommended next focus</label><input id="c-next" className={inputClass} value={f.next} onChange={set("next")} /></div>
      </div>
      {err && <p role="alert" className="text-base text-[#B3373A]">{err}</p>}
      <p className="text-sm text-[#2F4157]/70">Marking complete deducts one session from the student&apos;s balance and publishes this feedback to them.</p>
      <div className="flex flex-wrap items-end gap-2">
        <button className={btnPrimary}>Mark completed</button>
        <input aria-label="Reason" className={cn(inputClass, "max-w-xs")} placeholder="Reason (to cancel or mark no-show)" value={f.reason} onChange={set("reason")} />
        <button type="button" className={btnSecondary} onClick={() => act(() => rpc(supabase, "tutoring_cancel_booking", { p_booking: b.id, p_reason: f.reason, p_no_show: false }))}>Cancel session</button>
        <button type="button" className={btnSecondary} onClick={() => act(() => rpc(supabase, "tutoring_cancel_booking", { p_booking: b.id, p_reason: f.reason, p_no_show: true }))}>No-show</button>
        <button type="button" className={btnSecondary} onClick={onClose}>Close</button>
      </div>
    </form>
  );
}

// ── Students ────────────────────────────────────────────────────────────────────────────────────────────────────────
function Students({ roster, onOpen }: { roster: Row[]; onOpen: (id: string) => void }) {
  const [q, setQ] = useState("");
  const rows = roster.filter((r) => `${r.student_name} ${r.student_email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <section className={cn(card, "p-5")} aria-label="Students">
      <input aria-label="Search students" className={inputClass} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-3 divide-y divide-[#E3E7ED]">
        {rows.map((r) => (
          <li key={r.enrolment_id}><button className="flex w-full flex-wrap items-center justify-between gap-2 py-3 text-left" onClick={() => onOpen(r.enrolment_id)} data-testid="student-row">
            <span><span className="block font-semibold">{r.student_name}</span><span className="text-sm text-[#2F4157]/70">{PACKAGE_LABEL[r.package_code]} · {r.sessions_completed}/{r.sessions_total} done · {STATUS_LABEL[r.status]}</span></span>
            <span className="text-sm">{Number(r.paid_idr) < Number(r.total_price_idr) ? <span className={tag}>Owes {idr(Number(r.total_price_idr) - Number(r.paid_idr))}</span> : <span className={tag}>Paid</span>}{r.open_requests > 0 && <span className={cn(tag, "ml-2")}>{r.open_requests} request</span>}</span>
          </button></li>))}
        {rows.length === 0 && <li className="py-3 text-base">No students yet.</li>}
      </ul>
    </section>
  );
}

function StudentDetail({ supabase, row, onBack, onDone }: { supabase: SupabaseClient; row: Row; onBack: () => void; onDone: () => void }) {
  const fmt = useLocalFormat();
  const [b, setB] = useState<Bundle | null>(null);
  const [notes, setNotes] = useState<{ id: string; body: string; created_at: string }[]>([]);
  const [note, setNote] = useState(""); const [stages, setStages] = useState<{ title: string; note: string; status: string }[]>([]); const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [bundle, n] = await Promise.all([loadEnrolmentBundle(supabase, row.enrolment_id), supabase.from("tutoring_mentor_notes").select("id, body, created_at").eq("enrolment_id", row.enrolment_id).order("created_at", { ascending: false })]);
    setB(bundle); setNotes((n.data ?? []) as typeof notes); setStages(bundle.stages.map((s) => ({ title: s.title, note: s.note ?? "", status: s.status })));
  }, [supabase, row.enrolment_id]);
  useEffect(() => { void load(); }, [load]);
  const run = async (fn: () => Promise<unknown>) => { setMsg(""); try { await fn(); await load(); onDone(); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } };
  if (!b) return <LoadingState />;
  const done = b.bookings.filter((x) => x.status === "completed");
  return (
    <div className="space-y-4" data-testid="student-detail">
      <button className={btnSecondary} onClick={onBack}>Back to students</button>
      <section className={cn(card, "p-5")}><h2 className="text-xl font-bold">{row.student_name}</h2><p className="text-base text-[#2F4157]/75">{row.student_email}</p>
        <p className="mt-2 text-base">{PACKAGE_LABEL[row.package_code]} · {row.sessions_completed} of {row.sessions_total} completed · {STATUS_LABEL[row.status]} · paid {idr(Number(row.paid_idr))} of {idr(Number(row.total_price_idr))}{row.next_label ? ` · next: ${row.next_label.replace("_", " ")} ${idr(Number(row.next_amount_idr))}${row.next_due ? ` by ${fmt.date(row.next_due)}` : ""}` : ""}</p>
        <p className="text-base">Engagement: {row.last_session ? `last session ${fmt.date(row.last_session)}` : "no completed session yet"}{row.open_requests ? `, ${row.open_requests} open request` : ""}</p></section>
      <section className={cn(card, "p-5")}><h3 className="text-lg font-bold">Goals</h3>
        {b.goals ? <dl className="mt-2 space-y-1 text-base">{Object.entries({ Objective: b.goals.objective, Target: b.goals.target, Level: b.goals.current_level, Deadline: b.goals.target_date, Focus: b.goals.preferred_focus, Difficulties: b.goals.difficulties, Context: b.goals.context }).filter(([, v]) => v).map(([k, v]) => <div key={k}><dt className="inline font-semibold">{k}: </dt><dd className="inline">{String(v)}</dd></div>)}</dl> : <p className="mt-2 text-base">The student has not completed onboarding yet.</p>}</section>
      <section className={cn(card, "space-y-3 p-5")}><h3 className="text-lg font-bold">Learning roadmap</h3>
        {stages.map((s, i) => (<div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input aria-label={`Stage ${i + 1} title`} className={inputClass} value={s.title} onChange={(e) => setStages(stages.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
          <input aria-label={`Stage ${i + 1} note`} className={inputClass} placeholder="Note" value={s.note} onChange={(e) => setStages(stages.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} />
          <select aria-label={`Stage ${i + 1} status`} className={inputClass} value={s.status} onChange={(e) => setStages(stages.map((x, j) => j === i ? { ...x, status: e.target.value } : x))}><option value="upcoming">Upcoming</option><option value="current">Current</option><option value="done">Done</option></select>
          <button className={btnSecondary} onClick={() => setStages(stages.filter((_, j) => j !== i))}>Remove</button></div>))}
        <div className="flex gap-2"><button className={btnSecondary} onClick={() => setStages([...stages, { title: "", note: "", status: "upcoming" }])}>Add stage</button>
          <button className={btnPrimary} onClick={() => run(() => rpc(supabase, "tutoring_set_roadmap", { p_enrolment: row.enrolment_id, p_stages: stages.filter((s) => s.title.trim()) }))}>Save roadmap</button></div></section>
      <section className={cn(card, "p-5")}><h3 className="text-lg font-bold">Mentor notes (private)</h3>
        <div className="mt-2 flex gap-2"><input aria-label="New note" className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} /><button className={btnPrimary} disabled={!note.trim()} onClick={() => run(async () => { await rpc(supabase, "tutoring_add_note", { p_enrolment: row.enrolment_id, p_body: note }); setNote(""); })}>Add</button></div>
        <ul className="mt-3 space-y-2 text-base">{notes.map((n) => <li key={n.id}><span className="text-sm text-[#2F4157]/60">{fmt.date(n.created_at)}</span> {n.body}</li>)}</ul></section>
      <section className={cn(card, "p-5")}><h3 className="text-lg font-bold">Session history</h3>
        {done.length === 0 ? <p className="mt-2 text-base">None yet.</p> : <ul className="mt-2 space-y-2 text-base">{done.map((x) => { const r = b.records.find((y) => y.booking_id === x.id); return <li key={x.id}><strong>{x.starts_at ? fmt.date(x.starts_at) : ""}</strong> · {r?.topic}{r?.next_focus ? ` · next: ${r.next_focus}` : ""}</li>; })}</ul>}</section>
      {msg && <p role="alert" className="text-base text-[#B3373A]">{msg}</p>}
    </div>
  );
}

// ── Payments (admin only): create enrolment, record agreement, verify payments, Elco access ─────────────────────────
function PaymentsTab({ supabase, roster, onDone }: { supabase: SupabaseClient; roster: Row[]; onDone: () => void }) {
  const fmt = useLocalFormat();
  const [f, setF] = useState({ email: "", pkg: "growth", option: "full", deadline: "", finalTwo: "" });
  const [msg, setMsg] = useState(""); const [ins, setIns] = useState<Record<string, Bundle["instalments"]>>({});
  const run = async (fn: () => Promise<unknown>, ok?: string) => { setMsg(""); try { await fn(); if (ok) setMsg(ok); onDone(); await loadIns(); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } };
  const loadIns = useCallback(async () => {
    const { data } = await supabase.from("tutoring_instalments").select("*").order("seq");
    const m: Record<string, Bundle["instalments"]> = {}; for (const i of (data ?? []) as Bundle["instalments"]) (m[i.enrolment_id] ||= []).push(i); setIns(m);
  }, [supabase]);
  useEffect(() => { void loadIns(); }, [loadIns, roster]);
  const eligible = useMemo(() => Number({ starter: 2, growth: 4, intensive: 8 }[f.pkg as "starter"]) > 4, [f.pkg]);
  return (
    <div className="space-y-5">
      <form className={cn(card, "space-y-3 p-5")} data-testid="create-enrolment" onSubmit={(e) => { e.preventDefault(); void run(async () => {
        const sid = await rpc(supabase, "tutoring_find_student", { p_email: f.email }); if (!sid) throw new Error("No verified IELSco account with that email. Ask the student to sign up first.");
        const me = (await supabase.auth.getUser()).data.user!.id;
        await rpc(supabase, "tutoring_create_enrolment", { p_student: sid, p_mentor: me, p_package: f.pkg, p_option: f.option, p_exam_deadline: f.deadline || null, p_final_two_start: f.finalTwo || null });
      }, "Enrolment and invoice created. Record the agreement, then verify payment when it arrives."); }}>
        <h2 className="text-lg font-bold">New enrolment and invoice</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelClass} htmlFor="p-email">Student account email</label><input id="p-email" type="email" required className={inputClass} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className={labelClass} htmlFor="p-pkg">Package</label><select id="p-pkg" className={inputClass} value={f.pkg} onChange={(e) => setF({ ...f, pkg: e.target.value, option: e.target.value === "intensive" ? f.option : "full" })}><option value="starter">Starter (2) Rp179,000</option><option value="growth">Growth (4) Rp329,000</option><option value="intensive">Intensive (8) Rp599,000</option></select></div>
          <div><label className={labelClass} htmlFor="p-opt">Payment</label><select id="p-opt" className={inputClass} value={f.option} onChange={(e) => setF({ ...f, option: e.target.value })}><option value="full">Full payment</option>{eligible && <option value="deposit">Deposit + instalments (50/25/25)</option>}</select></div>
          <div><label className={labelClass} htmlFor="p-dl">Exam/application deadline</label><input id="p-dl" type="date" className={inputClass} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>
        </div>
        <button className={btnPrimary}>Create invoice</button>
      </form>
      {msg && <p role="status" className="text-base font-semibold">{msg}</p>}
      <div className="flex"><button className={btnSecondary} onClick={() => run(async () => { const n = await rpc(supabase, "tutoring_flag_overdue", {}); setMsg(`${n} account(s) flagged for review.`); })}>Flag overdue accounts for review</button></div>
      <ul className="space-y-3">
        {roster.map((r) => (
          <li key={r.enrolment_id} className={cn(card, "p-5")} data-testid="payment-row">
            <p className="font-semibold">{r.student_name} · {r.invoice_no} · {PACKAGE_LABEL[r.package_code]} <span className={tag}>{STATUS_LABEL[r.status]}</span></p>
            <p className="text-sm text-[#2F4157]/75">Total {idr(Number(r.total_price_idr))} · Paid {idr(Number(r.paid_idr))} · Outstanding {idr(Number(r.total_price_idr) - Number(r.paid_idr))}</p>
            <ul className="mt-2 divide-y divide-[#E3E7ED]">{(ins[r.enrolment_id] ?? []).map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-base"><span>{i.kind.replace("_", " ")} · {idr(Number(i.amount_idr))} · {i.status === "verified" ? `verified ${fmt.date(i.verified_at!)}` : i.trigger_text}</span>
                {i.status === "due" && <button className={btnPrimary} data-testid="verify-payment" onClick={() => { const ref = window.prompt("Transfer reference (optional)") ?? ""; void run(() => rpc(supabase, "tutoring_verify_payment", { p_instalment: i.id, p_reference: ref || null, p_method: "bank_transfer" }), "Payment verified, receipt issued."); }}>Verify payment received</button>}</li>))}</ul>
            <div className="mt-2 flex flex-wrap gap-2">
              {r.status === "pending_payment" && <button className={btnSecondary} onClick={() => run(() => rpc(supabase, "tutoring_record_agreement", { p_enrolment: r.enrolment_id }), "Agreement recorded.")}>Record customer agreement</button>}
              {r.status !== "pending_payment" && r.elco_access_status !== "granted" && <button className={btnSecondary} onClick={() => { const d = window.prompt("Elco AI access expiry date (YYYY-MM-DD). Only after the month is really granted on Elco."); if (d) void run(() => rpc(supabase, "tutoring_set_elco_access", { p_enrolment: r.enrolment_id, p_status: "granted", p_expires: `${d}T23:59:00+07:00` }), "Elco access recorded."); }}>Record Elco AI granted</button>}
            </div>
          </li>))}
      </ul>
    </div>
  );
}

// ── Availability ────────────────────────────────────────────────────────────────────────────────────────────────────
function Availability({ supabase }: { supabase: SupabaseClient }) {
  const fmt = useLocalFormat();
  const [w, setW] = useState<{ weekday: number; start: string; end: string }[] | null>(null);
  const [blocks, setBlocks] = useState<{ id: string; during: string; reason: string | null }[]>([]);
  const [bl, setBl] = useState({ start: "", end: "", reason: "" }); const [msg, setMsg] = useState(""); const zone = useViewerZone();
  const load = useCallback(async () => {
    const me = (await supabase.auth.getUser()).data.user!.id;
    const [a, k] = await Promise.all([supabase.from("tutoring_availability").select("weekday, start_time, end_time").eq("mentor_id", me).order("weekday"), supabase.from("tutoring_blocks").select("id, during, reason").eq("mentor_id", me)]);
    setW(((a.data ?? []) as { weekday: number; start_time: string; end_time: string }[]).map((x) => ({ weekday: x.weekday, start: x.start_time.slice(0, 5), end: x.end_time.slice(0, 5) }))); setBlocks((k.data ?? []) as typeof blocks);
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);
  const save = async () => { setMsg(""); try { await rpc(supabase, "tutoring_set_availability", { p_windows: w }); setMsg("Availability saved."); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } };
  if (!w) return <LoadingState />;
  return (
    <div className="space-y-5">
      <section className={cn(card, "space-y-3 p-5")}><h2 className="text-lg font-bold">Weekly availability</h2><p className="text-sm text-[#2F4157]/70">Times are in your mentor timezone (Asia/Jakarta). Students are only offered free hours inside these windows.</p>
        {w.map((x, i) => (<div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
          <select aria-label="Day" className={inputClass} value={x.weekday} onChange={(e) => setW(w.map((y, j) => j === i ? { ...y, weekday: Number(e.target.value) } : y))}>{DAYS.map((d, n) => <option key={d} value={n}>{d}</option>)}</select>
          <input aria-label="From" type="time" className={inputClass} value={x.start} onChange={(e) => setW(w.map((y, j) => j === i ? { ...y, start: e.target.value } : y))} />
          <input aria-label="To" type="time" className={inputClass} value={x.end} onChange={(e) => setW(w.map((y, j) => j === i ? { ...y, end: e.target.value } : y))} />
          <button className={btnSecondary} onClick={() => setW(w.filter((_, j) => j !== i))}>Remove</button></div>))}
        <div className="flex gap-2"><button className={btnSecondary} onClick={() => setW([...w, { weekday: 1, start: "09:00", end: "12:00" }])}>Add window</button><button className={btnPrimary} onClick={save} data-testid="save-availability">Save availability</button></div>
        {msg && <p role="status" className="text-base font-semibold">{msg}</p>}</section>
      <section className={cn(card, "space-y-3 p-5")}><h2 className="text-lg font-bold">Block time off</h2>
        <div className="grid gap-2 sm:grid-cols-3"><input aria-label="Block from" type="datetime-local" className={inputClass} value={bl.start} onChange={(e) => setBl({ ...bl, start: e.target.value })} /><input aria-label="Block to" type="datetime-local" className={inputClass} value={bl.end} onChange={(e) => setBl({ ...bl, end: e.target.value })} /><input aria-label="Reason" className={inputClass} placeholder="Reason" value={bl.reason} onChange={(e) => setBl({ ...bl, reason: e.target.value })} /></div>
        <button className={btnPrimary} disabled={!bl.start || !bl.end} onClick={async () => { try { await rpc(supabase, "tutoring_add_block", { p_start: zonedLocalToUtc(bl.start, zone), p_end: zonedLocalToUtc(bl.end, zone), p_reason: bl.reason || null }); setBl({ start: "", end: "", reason: "" }); void load(); } catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } }}>Block this time</button>
        <ul className="text-base">{blocks.map((b) => <li key={b.id}>{b.during.replace(/[\[\]()"]/g, "").split(",").map((t) => fmt.dateTime(t)).join(" to ")}{b.reason ? ` · ${b.reason}` : ""}</li>)}</ul></section>
    </div>
  );
}
