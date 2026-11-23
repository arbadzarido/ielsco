"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, BookOpen, CalendarClock, Megaphone, MessageSquareText } from "lucide-react";
import { useLocalFormat } from "@/components/time/TimeZoneProvider";

type Session = { id: string; starts_at: string; ends_at: string; topic: string | null; meeting_url: string | null; status: string };
type Material = { id: string; title: string; url: string; note: string | null };
type Announcement = { id: string; title: string; body: string; created_at: string };
type Attendance = { session_id: string; status: string };
type Note = { id: string; note: string; created_at: string };

// What a paying Collective/Studio student sees for their group: upcoming sessions, announcements, materials, own attendance
// and own progress notes. Everything is read through RLS (members of the group only; attendance and notes are per student).
export function ClassroomPanel({ supabase, cohortId }: { supabase: SupabaseClient; cohortId: string }) {
  const fmt = useLocalFormat();
  const [d, setD] = useState<{ sessions: Session[]; materials: Material[]; news: Announcement[]; att: Attendance[]; notes: Note[] } | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const [s, m, a, at, n] = await Promise.all([
        supabase.from("course_class_sessions").select("id, starts_at, ends_at, topic, meeting_url, status").eq("cohort_id", cohortId).order("starts_at"),
        supabase.from("course_materials").select("id, title, url, note").eq("cohort_id", cohortId).order("created_at", { ascending: false }),
        supabase.from("course_announcements").select("id, title, body, created_at").eq("cohort_id", cohortId).order("created_at", { ascending: false }).limit(3),
        supabase.from("course_attendance").select("session_id, status"),
        supabase.from("course_progress_notes").select("id, note, created_at").eq("cohort_id", cohortId).order("created_at", { ascending: false }).limit(3),
      ]);
      if (!live) return;
      // Before the classroom migration exists, these reads fail: show nothing rather than an error.
      if (s.error) { setD({ sessions: [], materials: [], news: [], att: [], notes: [] }); return; }
      setD({ sessions: (s.data ?? []) as Session[], materials: (m.data ?? []) as Material[], news: (a.data ?? []) as Announcement[], att: (at.data ?? []) as Attendance[], notes: (n.data ?? []) as Note[] });
    })();
    return () => { live = false; };
  }, [supabase, cohortId]);

  if (!d) return null;
  const now = Date.now();
  const upcoming = d.sessions.filter((s) => s.status !== "cancelled" && new Date(s.ends_at).getTime() > now).slice(0, 3);
  const past = d.sessions.filter((s) => s.status === "held" && new Date(s.ends_at).getTime() <= now);
  const attended = past.filter((s) => d.att.some((a) => a.session_id === s.id && (a.status === "present" || a.status === "late"))).length;
  if (!d.sessions.length && !d.materials.length && !d.news.length && !d.notes.length)
    return <p className="mt-3 text-sm text-[#2F4157]/70">Your tutor will post the session dates, materials and announcements here.</p>;

  return (
    <div className="mt-4 space-y-4 border-t border-[#E3E7ED] pt-4 text-base" data-testid="classroom-panel">
      {upcoming.length > 0 && (
        <div><p className="flex items-center gap-2 font-semibold"><CalendarClock size={16} aria-hidden="true" /> Upcoming sessions</p>
          <ul className="mt-1 space-y-1">{upcoming.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2"><span>{fmt.dateTime(s.starts_at)}{s.topic ? ` · ${s.topic}` : ""}</span>
              {s.meeting_url && <a className="text-sm font-semibold underline" href={s.meeting_url} target="_blank" rel="noopener noreferrer">Link <ArrowUpRight size={12} className="inline" aria-hidden="true" /></a>}</li>))}</ul></div>
      )}
      {past.length > 0 && <p className="text-sm text-[#2F4157]/80">Attendance: {attended} of {past.length} sessions held so far.</p>}
      {d.news.length > 0 && (
        <div><p className="flex items-center gap-2 font-semibold"><Megaphone size={16} aria-hidden="true" /> Announcements</p>
          <ul className="mt-1 space-y-2">{d.news.map((a) => <li key={a.id}><p className="font-medium">{a.title} <span className="text-sm font-normal text-[#2F4157]/60">· {fmt.date(a.created_at)}</span></p><p className="text-sm text-[#2F4157]/80">{a.body}</p></li>)}</ul></div>
      )}
      {d.materials.length > 0 && (
        <div><p className="flex items-center gap-2 font-semibold"><BookOpen size={16} aria-hidden="true" /> Learning materials</p>
          <ul className="mt-1 space-y-1">{d.materials.map((m) => <li key={m.id}><a className="underline" href={m.url} target="_blank" rel="noopener noreferrer">{m.title}</a>{m.note ? <span className="text-sm text-[#2F4157]/70"> · {m.note}</span> : null}</li>)}</ul></div>
      )}
      {d.notes.length > 0 && (
        <div><p className="flex items-center gap-2 font-semibold"><MessageSquareText size={16} aria-hidden="true" /> Feedback from your tutor</p>
          <ul className="mt-1 space-y-1">{d.notes.map((n) => <li key={n.id} className="text-sm"><span className="text-[#2F4157]/60">{fmt.date(n.created_at)}</span> {n.note}</li>)}</ul></div>
      )}
    </div>
  );
}
