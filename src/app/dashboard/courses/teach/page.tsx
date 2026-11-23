"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ErrorState, LoadingState, Notice, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { useLocalFormat, useViewerZone } from "@/components/time/TimeZoneProvider";
import { useTutoringRole } from "@/components/tutoring/dashboard/useStaff";
import { zonedLocalToUtc } from "@/lib/tutoring/client";
import { cn } from "@/lib/utils";

type Group = { id: string; product: "collective" | "studio"; name: string; status: string; schedule_text: string | null; starts_on: string | null; meeting_url: string | null; capacity: number; tutor_id: string | null; tutor_name: string | null };
type Session = { id: string; starts_at: string; ends_at: string; topic: string | null; meeting_url: string | null; status: string };
type Student = { student_id: string; student_name: string; paid_until: string };
type Mentor = { user_id: string; display_name: string };
const ATT = ["present", "late", "absent", "excused"] as const;

// Teaching area for IELScourse Collective and Studio groups. Tutors see only their assigned groups (and never payments);
// admins see every group and assign tutors. Every action is a database function that re-checks the caller.
export default function TeachPage() {
  return <DashboardPage>{({ supabase }) => <Teach supabase={supabase} />}</DashboardPage>;
}

function Teach({ supabase }: { supabase: SupabaseClient }) {
  const role = useTutoringRole(supabase);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("course_my_teaching");
    if (error) setErr(/course_my_teaching/.test(error.message) ? "The classroom isn't switched on in this environment yet." : error.message);
    else { setGroups((data ?? []) as Group[]); setSel((s) => s ?? (data?.[0]?.id ?? null)); }
  }, [supabase]);
  useEffect(() => { if (role?.staff) void load(); }, [role, load]);

  if (!role) return <LoadingState />;
  if (!role.staff) return <ErrorState message="This area is for IELScourse tutors and admins." />;
  if (err) return <ErrorState message={err} onRetry={() => { setErr(""); void load(); }} />;
  if (!groups) return <LoadingState />;
  const g = groups.find((x) => x.id === sel);
  return (
    <div className="space-y-5" data-testid="teach-page">
      <PageHeader title="Teach" description="Sessions, attendance, materials and announcements for your Collective and Studio groups." />
      {role.admin && <p className="text-base">Create groups, set capacity and schedules in <Link className="font-semibold underline" href="/dashboard/admin/payments">Admin · Payments &amp; classes</Link>.</p>}
      {groups.length === 0 ? <Notice testId="no-groups">{role.admin ? "No groups yet. Create one first." : "No group is assigned to you yet."}</Notice> : (
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Groups">
          {groups.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} aria-current={sel === x.id}
              className={cn("shrink-0 rounded-full px-4 py-2 text-base font-semibold", sel === x.id ? "bg-[#2F4157] text-white" : "border border-[#E3E7ED] bg-white text-[#2F4157]")}>
              {x.name} <span className="font-normal opacity-75">· {x.product === "studio" ? "Studio" : "Collective"}</span>
            </button>
          ))}
        </nav>
      )}
      {g && <GroupView key={g.id} supabase={supabase} g={g} admin={role.admin} onChange={load} />}
    </div>
  );
}

function GroupView({ supabase, g, admin, onChange }: { supabase: SupabaseClient; g: Group; admin: boolean; onChange: () => void }) {
  const fmt = useLocalFormat();
  const zone = useViewerZone();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [roster, setRoster] = useState<Student[]>([]);
  const [att, setAtt] = useState<Record<string, string>>({});
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ when: "", minutes: g.product === "studio" ? "75" : "60", topic: "", url: "" });
  const [mat, setMat] = useState({ title: "", url: "" });
  const [news, setNews] = useState({ title: "", body: "" });
  const [note, setNote] = useState({ student: "", text: "" });

  const load = useCallback(async () => {
    const [s, r, a, m] = await Promise.all([
      supabase.from("course_class_sessions").select("id, starts_at, ends_at, topic, meeting_url, status").eq("cohort_id", g.id).order("starts_at", { ascending: false }),
      supabase.rpc("course_roster", { p_cohort: g.id }),
      supabase.from("course_attendance").select("session_id, student_id, status"),
      admin ? supabase.from("tutoring_mentors").select("user_id, display_name").eq("is_active", true) : Promise.resolve({ data: [] }),
    ]);
    setSessions((s.data ?? []) as Session[]); setRoster((r.data ?? []) as Student[]);
    setAtt(Object.fromEntries(((a.data ?? []) as { session_id: string; student_id: string; status: string }[]).map((x) => [`${x.session_id}:${x.student_id}`, x.status])));
    setMentors((m.data ?? []) as Mentor[]);
  }, [supabase, g.id, admin]);
  useEffect(() => { void load(); }, [load]);
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setMsg(""); const { error } = await fn();
    if (error) setMsg(/not_enrolled/.test(error.message) ? "That student has no paid month covering this session." : /check/.test(error.message) ? "Links must start with https://" : error.message);
    else { setMsg(ok); void load(); }
  };

  return (
    <div className="space-y-5">
      <section className={cn(card, "p-5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">{g.name}</h2><p className="text-base text-[#2F4157]/80">{g.schedule_text ?? "No schedule set"}{g.starts_on ? ` · from ${fmt.date(g.starts_on)}` : ""}</p>
            <p className="text-sm text-[#2F4157]/70">{roster.length} of {g.capacity} students · Tutor: {g.tutor_name ?? "not assigned"}</p></div>
          <span className={tag}>{g.status}</span>
        </div>
        {admin && (
          <label className="mt-4 block max-w-sm"><span className={labelClass}>Assigned tutor</span>
            <select className={inputClass} value={g.tutor_id ?? ""} onChange={(e) => run(() => supabase.rpc("course_admin_set_tutor", { p_cohort: g.id, p_tutor: e.target.value || null }), "Tutor updated.").then(onChange)}>
              <option value="">Not assigned</option>{mentors.map((m) => <option key={m.user_id} value={m.user_id}>{m.display_name}</option>)}
            </select></label>
        )}
        {msg && <p role="status" className="mt-3 text-base font-semibold">{msg}</p>}
      </section>

      <section className={cn(card, "p-5")} aria-label="Sessions">
        <h3 className="text-lg font-bold">Sessions</h3>
        <form className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_0.6fr_1fr_1fr_auto] sm:items-end" onSubmit={(e) => {
          e.preventDefault(); if (!f.when) return;
          const s = zonedLocalToUtc(f.when, zone), en = new Date(new Date(s).getTime() + Number(f.minutes) * 60000).toISOString();
          void run(() => supabase.rpc("course_save_session", { p_id: null, p_cohort: g.id, p_starts: s, p_ends: en, p_topic: f.topic, p_url: f.url || g.meeting_url || "", p_status: "scheduled" }), "Session added.");
          setF({ ...f, when: "", topic: "" });
        }}>
          <label><span className={labelClass}>Date and time</span><input required type="datetime-local" className={inputClass} value={f.when} onChange={(e) => setF({ ...f, when: e.target.value })} /></label>
          <label><span className={labelClass}>Minutes</span><input type="number" min={15} max={240} className={inputClass} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></label>
          <label><span className={labelClass}>Topic</span><input className={inputClass} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} /></label>
          <label><span className={labelClass}>Meeting link (optional)</span><input className={inputClass} placeholder={g.meeting_url ?? "https://"} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></label>
          <button className={btnPrimary} type="submit">Add</button>
        </form>
        <ul className="mt-4 divide-y divide-[#E3E7ED]">
          {sessions.map((s) => (
            <li key={s.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{fmt.dateTime(s.starts_at)}{s.topic ? ` · ${s.topic}` : ""} <span className={tag}>{s.status}</span></p>
                <div className="flex gap-2">
                  <button className={btnSecondary} onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Close" : "Attendance"}</button>
                  {s.status === "scheduled" && <button className={btnSecondary} onClick={() => run(() => supabase.rpc("course_save_session", { p_id: s.id, p_cohort: g.id, p_starts: s.starts_at, p_ends: s.ends_at, p_topic: s.topic ?? "", p_url: s.meeting_url ?? "", p_status: "cancelled" }), "Session cancelled.")}>Cancel</button>}
                </div>
              </div>
              {open === s.id && (roster.length === 0 ? <p className="mt-2 text-base">No paid students in this group yet.</p> : (
                <ul className="mt-3 space-y-2" data-testid="attendance-list">
                  {roster.map((r) => (
                    <li key={r.student_id} className="flex flex-wrap items-center justify-between gap-2"><span>{r.student_name}</span>
                      <span className="flex flex-wrap gap-1">{ATT.map((a) => (
                        <button key={a} onClick={() => run(() => supabase.rpc("course_record_attendance", { p_session: s.id, p_student: r.student_id, p_status: a, p_note: "" }), "Attendance saved.")}
                          className={cn("rounded-full border px-3 py-1 text-sm font-semibold capitalize", att[`${s.id}:${r.student_id}`] === a ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED]")}>{a}</button>))}</span>
                    </li>))}
                </ul>))}
            </li>
          ))}
          {sessions.length === 0 && <li className="py-3 text-base text-[#2F4157]/70">No sessions yet.</li>}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={cn(card, "p-5")} aria-label="Materials">
          <h3 className="text-lg font-bold">Learning materials</h3>
          <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => supabase.rpc("course_add_material", { p_cohort: g.id, p_title: mat.title, p_url: mat.url, p_note: "" }), "Material shared."); setMat({ title: "", url: "" }); }}>
            <input required aria-label="Material title" className={inputClass} placeholder="Title" value={mat.title} onChange={(e) => setMat({ ...mat, title: e.target.value })} />
            <input required aria-label="Material link" className={inputClass} placeholder="https://… (Google Drive, Docs, YouTube)" value={mat.url} onChange={(e) => setMat({ ...mat, url: e.target.value })} />
            <button className={btnPrimary} type="submit">Share with the group</button>
          </form>
        </section>
        <section className={cn(card, "p-5")} aria-label="Announcement">
          <h3 className="text-lg font-bold">Announcement</h3>
          <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => supabase.rpc("course_post_announcement", { p_cohort: g.id, p_title: news.title, p_body: news.body }), "Announcement posted and members notified."); setNews({ title: "", body: "" }); }}>
            <input required aria-label="Announcement title" className={inputClass} placeholder="Title" value={news.title} onChange={(e) => setNews({ ...news, title: e.target.value })} />
            <textarea required aria-label="Announcement text" rows={3} className={inputClass} value={news.body} onChange={(e) => setNews({ ...news, body: e.target.value })} />
            <button className={btnPrimary} type="submit">Post to the group</button>
          </form>
        </section>
      </div>

      <section className={cn(card, "p-5")} aria-label="Progress feedback">
        <h3 className="text-lg font-bold">Progress feedback for a student</h3>
        <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); void run(() => supabase.rpc("course_add_progress_note", { p_cohort: g.id, p_student: note.student, p_note: note.text }), "Feedback saved; the student sees it in My Courses."); setNote({ ...note, text: "" }); }}>
          <select required aria-label="Student" className={inputClass} value={note.student} onChange={(e) => setNote({ ...note, student: e.target.value })}><option value="">Choose a student</option>{roster.map((r) => <option key={r.student_id} value={r.student_id}>{r.student_name}</option>)}</select>
          <input required aria-label="Feedback" className={inputClass} placeholder="Strengths, what to work on next" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} />
          <button className={btnPrimary} type="submit">Save</button>
        </form>
      </section>
    </div>
  );
}
