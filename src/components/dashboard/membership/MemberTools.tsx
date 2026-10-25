"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CalendarClock, ExternalLink, Loader2, MessageCircle, PauseCircle, UserPlus, FileText } from "lucide-react";
import { btnPrimary, btnSecondary, cardGloss, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { dateTimeWib, dateWib } from "@/lib/format";
import { track } from "@/lib/analytics";
import { FEEDBACK_WINDOW_DAYS } from "@/data/membership";

// Member tools. Every action goes through a database function that checks the membership itself
// (supabase/migrations/20261026000000_membership_platform.sql), so these components only present the result.

const friendly = (msg: string) =>
  /members_only/.test(msg) ? "This is for active members."
    : /limit_reached/.test(msg) ? `You've used your review for this ${FEEDBACK_WINDOW_DAYS}-day period. You can request the next one after it ends.`
    : /full/.test(msg) ? "This session is full."
    : /not open/.test(msg) ? "Registration for this session is closed."
    : /check constraint/.test(msg) ? "Please check the link: it must start with https://"
    : "Something went wrong. Please try again.";

function Section({ icon: Icon, title, children, testId }: { icon: typeof FileText; title: string; children: React.ReactNode; testId: string }) {
  return (
    <section className={cn(cardGloss, "p-6")} data-testid={testId}>
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#1A2534]"><Icon size={20} className="text-[#577E90]" aria-hidden="true" />{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CommunityLinks({ supabase }: { supabase: SupabaseClient }) {
  const [links, setLinks] = useState<{ key: string; label: string; description: string | null; url: string }[] | null>(null);
  useEffect(() => {
    supabase.from("member_links").select("key, label, description, url").order("sort").then(({ data }) => setLinks(data ?? []));
  }, [supabase]);
  return (
    <Section icon={MessageCircle} title="Member group" testId="member-links">
      {links === null ? <p className="text-base text-[#2F4157]/60">Loading…</p>
        : links.length === 0 ? <p className="text-base text-[#2F4157]/70">The invite link will appear here as soon as the team opens the group.</p>
        : (
          <ul className="space-y-3">
            {links.map((l) => (
              <li key={l.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-[#1A2534]">{l.label}</p>{l.description && <p className="text-sm text-[#2F4157]/70">{l.description}</p>}</div>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Open <ExternalLink size={16} aria-hidden="true" /></a>
              </li>
            ))}
          </ul>
        )}
      <p className="mt-4 text-sm text-[#2F4157]/60">Please don&apos;t share the link. Access ends when your membership ends.</p>
    </Section>
  );
}

type Session = { id: string; title: string; description: string | null; kind: string; starts_at: string; duration_min: number; host_name: string | null; members_only: boolean; seats_left: number | null; registered: boolean };

export function MemberSessions({ supabase, isMember }: { supabase: SupabaseClient; isMember: boolean }) {
  const [rows, setRows] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => supabase.rpc("list_member_sessions", { p_limit: 10 }).then(({ data }) => setRows((data as Session[]) ?? [])), [supabase]);
  useEffect(() => { load(); }, [load]);

  async function register(id: string) {
    setBusy(id); setMsg(null);
    const { error } = await supabase.rpc("register_member_session", { p_session: id });
    if (error) setMsg(friendly(error.message)); else { track("member_session_registered", { session: id }); await load(); }
    setBusy(null);
  }
  async function join(id: string) {
    const { data } = await supabase.rpc("member_session_join_url", { p_session: id });
    if (data) window.open(data as string, "_blank", "noopener,noreferrer");
    else setMsg("The join link isn't available yet. It's added before the session starts.");
  }

  return (
    <Section icon={CalendarClock} title="Member sessions" testId="member-sessions">
      {rows === null ? <p className="text-base text-[#2F4157]/60">Loading…</p>
        : rows.length === 0 ? <p className="text-base text-[#2F4157]/70">No sessions are scheduled yet. New ones are published here at least two weeks ahead.</p>
        : (
          <ul className="divide-y divide-[#E3E7ED]">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1A2534]">{s.title}</p>
                  <p className="text-sm text-[#2F4157]/70">{dateTimeWib(s.starts_at)} · {s.duration_min} min{s.host_name ? ` · with ${s.host_name}` : ""}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {s.members_only && <span className={tag}>Members</span>}
                    {s.seats_left !== null && <span className={tag}>{s.seats_left} seats left</span>}
                  </div>
                </div>
                {s.registered
                  ? <button type="button" onClick={() => join(s.id)} className={btnPrimary}>Join link</button>
                  : <button type="button" onClick={() => register(s.id)} disabled={busy === s.id || (s.members_only && !isMember) || s.seats_left === 0} className={btnSecondary}>
                      {busy === s.id && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} {s.members_only && !isMember ? "Members only" : "Register"}
                    </button>}
              </li>
            ))}
          </ul>
        )}
      {msg && <p className="mt-4 rounded-xl bg-[#F7F8FA] px-4 py-3 text-sm text-[#2F4157]" role="status">{msg}</p>}
    </Section>
  );
}

type Feedback = { id: string; doc_type: string; doc_url: string; target: string | null; status: string; reviewer_note: string | null; created_at: string; returned_at: string | null };
const DOC = { cv: "CV", motivation_letter: "Motivation letter", essay: "Scholarship essay", interview_answers: "Interview answers" } as Record<string, string>;

export function FeedbackRequests({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [rows, setRows] = useState<Feedback[] | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => supabase.from("feedback_requests").select("id, doc_type, doc_url, target, status, reviewer_note, created_at, returned_at").eq("user_id", userId).order("created_at", { ascending: false })
    .then(({ data }) => setRows((data as Feedback[]) ?? [])), [supabase, userId]);
  useEffect(() => { load(); }, [load]);
  const recent = rows?.find((r) => r.status !== "cancelled" && Date.now() - Date.parse(r.created_at) < FEEDBACK_WINDOW_DAYS * 864e5);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSending(true); setMsg(null);
    const { error } = await supabase.rpc("request_feedback", {
      p_doc_type: f.get("doc_type"), p_doc_url: String(f.get("doc_url") ?? "").trim(), p_target: f.get("target") ?? "", p_notes: f.get("notes") ?? "",
    });
    setSending(false);
    if (error) { setMsg(friendly(error.message)); return; }
    track("feedback_requested", { doc_type: String(f.get("doc_type")) });
    setMsg("Sent. We'll reply here, usually within 7 days.");
    load();
  }

  return (
    <Section icon={FileText} title="Feedback on an application document" testId="member-feedback">
      {recent ? (
        <p className="text-base text-[#2F4157]/80">
          Your current review: <strong>{DOC[recent.doc_type]}</strong>{recent.target ? ` for ${recent.target}` : ""}, sent {dateWib(recent.created_at)}.
          Your next review is available from {dateWib(new Date(Date.parse(recent.created_at) + FEEDBACK_WINDOW_DAYS * 864e5))}.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className={labelClass}>Document</span>
              <select name="doc_type" required defaultValue="" className={inputClass}>
                <option value="" disabled>Choose one</option>
                {Object.entries(DOC).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block"><span className={labelClass}>What it&apos;s for</span><input name="target" maxLength={200} placeholder="e.g. Chevening 2027" className={inputClass} /></label>
          </div>
          <label className="block"><span className={labelClass}>Google Doc link (shared so anyone with the link can comment)</span>
            <input name="doc_url" type="url" required pattern="https://.*" maxLength={500} placeholder="https://docs.google.com/…" className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Anything we should focus on? (optional)</span><textarea name="notes" maxLength={1500} rows={3} className={inputClass} /></label>
          <button type="submit" disabled={sending} className={btnPrimary}>{sending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Request feedback</button>
        </form>
      )}
      {msg && <p className="mt-4 rounded-xl bg-[#F7F8FA] px-4 py-3 text-sm text-[#2F4157]" role="status">{msg}</p>}
      {rows && rows.length > 0 && (
        <ul className="mt-6 space-y-3 border-t border-[#E3E7ED] pt-5">
          {rows.map((r) => (
            <li key={r.id} className="text-sm">
              <p className="font-semibold text-[#1A2534]">{DOC[r.doc_type]}{r.target ? ` · ${r.target}` : ""} <span className={cn(tag, "ml-1")}>{r.status === "returned" ? "Returned" : r.status === "in_review" ? "In review" : r.status === "cancelled" ? "Cancelled" : "Waiting"}</span></p>
              {r.reviewer_note && <p className="mt-2 whitespace-pre-line rounded-xl bg-[#F7F8FA] p-3 text-[#2F4157]/85">{r.reviewer_note}</p>}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

type Buddy = { status: "waiting" | "matched" | "paused"; preferences: string | null; match_note: string | null; matched_at: string | null };

export function BuddyMatching({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [row, setRow] = useState<Buddy | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => supabase.from("buddy_requests").select("status, preferences, match_note, matched_at").eq("user_id", userId).maybeSingle()
    .then(({ data }) => setRow((data as Buddy) ?? null)), [supabase, userId]);
  useEffect(() => { load(); }, [load]);

  async function request(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("request_buddy", { p_preferences: String(new FormData(e.currentTarget).get("preferences") ?? "") });
    setBusy(false);
    if (error) setMsg(friendly(error.message)); else { track("buddy_requested"); load(); }
  }
  async function pause() {
    setBusy(true);
    await supabase.rpc("pause_buddy");
    setBusy(false); load();
  }

  return (
    <Section icon={UserPlus} title="Study buddy" testId="member-buddy">
      {row === undefined ? <p className="text-base text-[#2F4157]/60">Loading…</p>
        : row && row.status === "matched" ? (
          <div className="space-y-3">
            <span className={tag}>Matched{row.matched_at ? ` on ${dateWib(row.matched_at)}` : ""}</span>
            {row.match_note && <p className="whitespace-pre-line rounded-xl bg-[#F7F8FA] p-4 text-base text-[#2F4157]">{row.match_note}</p>}
          </div>
        ) : row && row.status === "waiting" ? (
          <div className="space-y-3">
            <p className="text-base text-[#2F4157]/80">You&apos;re in the queue. We match in rounds and will tell you here, with an introduction, once we find someone with a similar goal.</p>
            {row.preferences && <p className="text-sm text-[#2F4157]/65">Your note: {row.preferences}</p>}
            <button type="button" onClick={pause} disabled={busy} className={btnSecondary}><PauseCircle size={16} aria-hidden="true" /> Pause matching</button>
          </div>
        ) : (
          <form onSubmit={request} className="space-y-4">
            <p className="text-base text-[#2F4157]/80">A buddy is another member with a similar goal, to keep each other on track. It&apos;s peer support, not mentoring.</p>
            <label className="block"><span className={labelClass}>Your goal and what you&apos;d like in a buddy</span>
              <textarea name="preferences" maxLength={600} rows={3} placeholder="e.g. Applying for a master's in Japan in 2027; happy to meet online weekly" className={inputClass} /></label>
            <button type="submit" disabled={busy} className={btnPrimary}>{row?.status === "paused" ? "Resume matching" : "Find me a buddy"}</button>
          </form>
        )}
      {msg && <p className="mt-4 rounded-xl bg-[#F7F8FA] px-4 py-3 text-sm text-[#2F4157]" role="status">{msg}</p>}
    </Section>
  );
}
