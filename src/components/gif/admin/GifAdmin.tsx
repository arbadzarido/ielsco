"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AlertTriangle, ArrowLeft, ArrowRight, Download, FileClock, Inbox, LayoutGrid, Search, Settings2, Users } from "lucide-react";
import { ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnLink, btnSecondary, card, cardGloss, focusRing, inputClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import {
  ALL_DISPLAY_STATUSES, STATUS_LABEL, combineStatuses, displayStatus, fmtDateTime, fmtScore, latestAssessment, retentionInfo, submissionFor,
  type Assessment, type Assignment, type DisplayStatus, type ProgrammeDay, type Submission, type SubmissionFile,
} from "@/lib/gif/portal";
import { REPORTS, delegateProgress, kpis, type RosterRow } from "@/lib/gif/report";
import { ProgressBar, StatusPill, TypeBadge } from "../shared";
import { SubmissionReview } from "./SubmissionReview";
import { AssignmentEditor } from "./AssignmentEditor";

export interface AdminData {
  roster: RosterRow[];
  days: ProgrammeDay[];
  assignments: Assignment[];
  submissions: Submission[];
  files: SubmissionFile[];
  assessments: Assessment[];
  runs: { id: number; started_at: string; finished_at: string | null; scanned: number; deleted: number; failed: number; orphans_deleted: number }[];
}
type Tab = "overview" | "teams" | "inbox" | "retention" | "assignments";
type View = { kind: "tab" } | { kind: "submission"; id: string } | { kind: "delegate"; id: string };

export function GifAdmin({ supabase, user }: { supabase: SupabaseClient; user: User }) {
  const [state, setState] = useState<{ s: "loading" } | { s: "error"; message: string } | { s: "ready"; data: AdminData }>({ s: "loading" });
  const [tab, setTab] = useState<Tab>("overview");
  const [view, setView] = useState<View>({ kind: "tab" });

  const load = useCallback(async () => {
    try {
      const [roster, days, assignments, submissions, files, assessments, runs] = await Promise.all([
        supabase.rpc("gif_admin_roster"),
        supabase.from("gif_programme_days").select("*").order("day_number"),
        supabase.from("gif_assignments").select("*").order("day_number").order("sort_order"),
        supabase.from("gif_submissions").select("*"),
        supabase.from("gif_submission_files").select("*").order("uploaded_at"),
        supabase.from("gif_assessments").select("*").order("created_at", { ascending: false }),
        supabase.from("gif_retention_runs").select("id, started_at, finished_at, scanned, deleted, failed, orphans_deleted").order("started_at", { ascending: false }).limit(5),
      ]);
      const err = roster.error || days.error || assignments.error || submissions.error || files.error || assessments.error || runs.error;
      if (err) throw err;
      setState({ s: "ready", data: {
        roster: (roster.data ?? []) as RosterRow[], days: (days.data ?? []) as ProgrammeDay[], assignments: (assignments.data ?? []) as Assignment[],
        submissions: (submissions.data ?? []) as Submission[], files: (files.data ?? []) as SubmissionFile[],
        assessments: (assessments.data ?? []) as Assessment[], runs: (runs.data ?? []) as AdminData["runs"],
      } });
    } catch (e) {
      setState({ s: "error", message: (e as { message?: string })?.message || "Couldn't load the dashboard." });
    }
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  // ?submission=<id> deep link (e.g. from the inbox) and back-button support
  useEffect(() => {
    const read = () => {
      const q = new URLSearchParams(window.location.search);
      const sid = q.get("submission"), did = q.get("delegate"), t = q.get("tab") as Tab | null;
      if (t && ["overview", "teams", "inbox", "retention", "assignments"].includes(t)) setTab(t);
      setView(sid ? { kind: "submission", id: sid } : did ? { kind: "delegate", id: did } : { kind: "tab" });
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);
  const nav = (next: View, t: Tab = tab) => {
    setView(next); setTab(t);
    const q = new URLSearchParams();
    if (t !== "overview") q.set("tab", t);
    if (next.kind === "submission") q.set("submission", next.id);
    if (next.kind === "delegate") q.set("delegate", next.id);
    window.history.pushState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    window.scrollTo({ top: 0 });
  };

  if (state.s === "loading") return <LoadingState label="Loading assessment dashboard…" />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={load} />;
  const d = state.data;

  if (view.kind === "submission") {
    const sub = d.submissions.find((s) => s.id === view.id);
    return (
      <Shell>
        <button type="button" className={btnLink} onClick={() => window.history.length > 1 ? window.history.back() : nav({ kind: "tab" })}><ArrowLeft size={16} /> Back</button>
        {sub ? <SubmissionReview supabase={supabase} user={user} data={d} submission={sub} onSaved={load} />
          : <p className="mt-6 text-lg">This submission wasn&apos;t found.</p>}
      </Shell>
    );
  }
  if (view.kind === "delegate") {
    return (
      <Shell>
        <button type="button" className={btnLink} onClick={() => nav({ kind: "tab" })}><ArrowLeft size={16} /> All delegates</button>
        <DelegateProfile data={d} delegateId={view.id} open={(id) => nav({ kind: "submission", id })} />
      </Shell>
    );
  }

  const tabs: { t: Tab; label: string; icon: typeof Inbox; badge?: number }[] = [
    { t: "overview", label: "Delegates", icon: LayoutGrid },
    { t: "teams", label: "Teams", icon: Users },
    { t: "inbox", label: "Assessment inbox", icon: Inbox, badge: d.submissions.filter((s) => s.status === "submitted" || s.status === "under_review").length },
    { t: "retention", label: "Story proofs", icon: FileClock },
    { t: "assignments", label: "Assignments", icon: Settings2 },
  ];
  return (
    <Shell>
      <PageHeader title="GIF 2026 Assessment Dashboard" description="Track every delegate and team across Day 1–4, review submissions, give feedback and export reports.">
        <ExportMenu />
      </PageHeader>
      <Kpis data={d} />
      <div className="my-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#E3E7ED] bg-white p-1" role="tablist" aria-label="Admin sections">
        {tabs.map(({ t, label, icon: Icon, badge }) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => nav({ kind: "tab" }, t)} data-testid={`gif-admin-tab-${t}`}
            className={cn("inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold", focusRing, tab === t ? "bg-[#2F4157] text-white" : "text-[#2F4157] hover:bg-[#F7F8FA]")}>
            <Icon size={16} aria-hidden="true" /> {label}
            {!!badge && <span className={cn("rounded-full px-2 text-[12px]", tab === t ? "bg-white/20" : "bg-[#FDEDED] text-[#B4383A]")}>{badge}</span>}
          </button>
        ))}
      </div>
      {tab === "overview" && <Tracking data={d} openDelegate={(id) => nav({ kind: "delegate", id })} />}
      {tab === "teams" && <Teams data={d} open={(id) => nav({ kind: "submission", id })} />}
      {tab === "inbox" && <InboxView data={d} open={(id) => nav({ kind: "submission", id })} />}
      {tab === "retention" && <Retention data={d} open={(id) => nav({ kind: "submission", id })} />}
      {tab === "assignments" && <AssignmentEditor supabase={supabase} data={d} onSaved={load} />}
    </Shell>
  );
}

const Shell = ({ children }: { children: React.ReactNode }) => <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10" data-testid="gif-admin">{children}</div>;

function ExportMenu() {
  return (
    <details className="relative">
      <summary className={cn(btnSecondary, "cursor-pointer list-none")} data-testid="gif-export-menu"><Download size={18} /> Export CSV</summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-[#E3E7ED] bg-white p-2 shadow-[0_16px_40px_rgba(47,65,87,0.14)]">
        {REPORTS.map((r) => (
          <a key={r.kind} href={`/api/gif/admin/export?report=${r.kind}`} className={cn("block rounded-xl px-3 py-2.5 text-[15px] hover:bg-[#F7F8FA]", focusRing)} data-testid={`gif-export-${r.kind}`}>{r.label}</a>
        ))}
      </div>
    </details>
  );
}

function teamRoster(d: AdminData) { return d.roster.filter((r) => r.team_id); }

function Kpis({ data: d }: { data: AdminData }) {
  const k = kpis(delegateProgress(teamRoster(d), d.assignments, d.submissions), d.submissions);
  const items: [string, string | number, string?][] = [
    ["Total delegates", k.delegates], ["Overall completion", `${k.completionPercent}%`], ["Fully completed", k.fullyCompleted, "All parts submitted"],
    ["Pending assignments", k.pendingAssignments, "Not started or in progress"], ["Awaiting review", k.awaitingReview], ["Revision required", k.revisionRequired],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" data-testid="gif-kpis">
      {items.map(([label, value, hint]) => (
        <div key={label} className={cn(cardGloss, "p-4")}>
          <dt className="text-[13px] font-semibold text-[#2F4157]/65">{label}</dt>
          <dd className="mt-1 text-2xl font-bold">{value}</dd>
          {hint && <p className="text-[12px] text-[#2F4157]/50">{hint}</p>}
        </div>
      ))}
    </dl>
  );
}

function Tracking({ data: d, openDelegate }: { data: AdminData; openDelegate: (id: string) => void }) {
  const [q, setQ] = useState(""); const [team, setTeam] = useState("all"); const [dayF, setDayF] = useState("all"); const [statusF, setStatusF] = useState("all");
  const [sort, setSort] = useState<"team" | "asc" | "desc" | "name">("team");
  const progress = useMemo(() => delegateProgress(teamRoster(d), d.assignments, d.submissions), [d]);
  const days = d.days.map((x) => x.day_number);
  const teams = Array.from(new Map(teamRoster(d).map((r) => [r.team_id!, r.team_name!])).entries());
  let rows = progress.filter((p) => p.d.full_name.toLowerCase().includes(q.toLowerCase().trim()) && (team === "all" || p.d.team_id === team));
  if (statusF !== "all") rows = rows.filter((p) => (dayF === "all" ? Object.values(p.byDay) : [p.byDay[Number(dayF)]]).includes(statusF as DisplayStatus));
  rows = [...rows].sort((a, b) => sort === "asc" ? a.percent - b.percent : sort === "desc" ? b.percent - a.percent : sort === "name" ? a.d.full_name.localeCompare(b.d.full_name) : (a.d.team_number ?? 0) - (b.d.team_number ?? 0) || a.d.full_name.localeCompare(b.d.full_name));
  const sel = cn(inputClass, "py-2.5 text-base");
  return (
    <section className="space-y-4" data-testid="gif-tracking">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(200px,1fr)_auto_auto_auto_auto]">
        <label className="relative col-span-2 lg:col-span-1">
          <span className="sr-only">Search delegates</span>
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2F4157]/40" aria-hidden="true" />
          <input className={cn(sel, "pl-10")} placeholder="Search by delegate name" value={q} onChange={(e) => setQ(e.target.value)} data-testid="gif-search" />
        </label>
        <select className={sel} value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Filter by team" data-testid="gif-filter-team">
          <option value="all">All teams</option>{teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select className={sel} value={dayF} onChange={(e) => setDayF(e.target.value)} aria-label="Filter by day">
          <option value="all">Any day</option>{days.map((n) => <option key={n} value={n}>Day {n}</option>)}
        </select>
        <select className={sel} value={statusF} onChange={(e) => setStatusF(e.target.value)} aria-label="Filter by status" data-testid="gif-filter-status">
          <option value="all">Any status</option>{ALL_DISPLAY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select className={sel} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
          <option value="team">Sort: team</option><option value="asc">Completion ↑ (least first)</option><option value="desc">Completion ↓</option><option value="name">Name A–Z</option>
        </select>
      </div>
      <div className={cn(card, "overflow-x-auto")}>
        <table className="w-full min-w-[760px] text-left text-[15px]">
          <thead className="border-b border-[#E3E7ED] bg-[#F7F8FA] text-[13px] uppercase tracking-wide text-[#2F4157]/60">
            <tr><th className="px-4 py-3">Delegate</th><th className="px-3 py-3">Team</th>{days.map((n) => <th key={n} className="px-3 py-3">Day {n}</th>)}<th className="px-4 py-3">Overall</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.d.delegate_id} className="cursor-pointer border-b border-[#E3E7ED] last:border-0 hover:bg-[#F7F8FA]" onClick={() => openDelegate(p.d.delegate_id)} data-testid="gif-tracking-row">
                <td className="px-4 py-3"><button type="button" className={cn("text-left font-semibold hover:underline", focusRing)} onClick={(e) => { e.stopPropagation(); openDelegate(p.d.delegate_id); }}>{p.d.full_name}</button>
                  {!p.d.linked && <span className="block text-[12px] text-[#8A5A00]">Hasn&apos;t signed in yet</span>}</td>
                <td className="px-3 py-3 whitespace-nowrap">{p.d.team_name}</td>
                {days.map((n) => <td key={n} className="px-3 py-3"><StatusPill status={p.byDay[n] ?? "not_started"} /></td>)}
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-20"><ProgressBar percent={p.percent} label={`${p.d.full_name} completion`} /></div><span className="font-semibold">{p.percent}%</span></div></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={days.length + 3} className="px-4 py-8 text-center text-[#2F4157]/60">No delegates match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DelegateProfile({ data: d, delegateId, open }: { data: AdminData; delegateId: string; open: (submissionId: string) => void }) {
  const r = d.roster.find((x) => x.delegate_id === delegateId);
  if (!r) return <p className="mt-6">Delegate not found.</p>;
  const [p] = delegateProgress([r], d.assignments, d.submissions);
  return (
    <div className="mt-4 space-y-5" data-testid="gif-delegate-profile">
      <header className={cn(cardGloss, "p-5")}>
        <h1 className="text-2xl font-bold">{r.full_name}</h1>
        <p className="text-[15px] text-[#2F4157]/70">{r.participant_id} · {r.team_name ?? "No team"} · {r.linked ? "Account linked" : "Hasn't signed in yet"}</p>
        <div className="mt-3 flex items-center gap-3"><div className="flex-1"><ProgressBar percent={p.percent} /></div><span className="font-bold">{p.done}/{p.total} · {p.percent}%</span></div>
      </header>
      {d.days.map((day) => (
        <section key={day.day_number} className={cn(card, "p-4")}>
          <h2 className="mb-2 font-bold">Day {day.day_number} · {day.title}</h2>
          <ul className="space-y-2">
            {p.parts.filter((x) => x.a.day_number === day.day_number).map((x) => {
              const l = x.sub ? latestAssessment(d.assessments, x.sub.id) : null;
              return (
                <li key={x.a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F7F8FA] px-3 py-2.5">
                  <span className="flex items-center gap-2"><TypeBadge type={x.a.submission_type} /> <span className="font-medium">{x.a.title}</span></span>
                  <span className="flex items-center gap-2">
                    {l?.score != null && <span className="text-[14px] font-semibold">{fmtScore(l.score, l.max_score)}</span>}
                    <StatusPill status={x.status} />
                    {x.sub && <button type="button" className={btnLink} onClick={() => open(x.sub!.id)}>Open <ArrowRight size={15} /></button>}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Teams({ data: d, open }: { data: AdminData; open: (id: string) => void }) {
  const progress = delegateProgress(teamRoster(d), d.assignments, d.submissions);
  const teams = Array.from(new Map(teamRoster(d).map((r) => [r.team_id!, r])).values()).sort((a, b) => (a.team_number ?? 0) - (b.team_number ?? 0));
  const groupParts = d.assignments.filter((a) => a.is_active && a.submission_type === "group");
  const highlight = (a: Assignment, s: Submission | null) => {
    if (!s) return null;
    const r = s.responses as Record<string, string>;
    if (a.day_number === 2) return r.sdg4_category ? `${r.sdg4_category}${r.problem_statement ? ` — ${r.problem_statement.slice(0, 120)}` : ""}` : null;
    if (a.day_number === 3) return [r.prototype_link && "Prototype ✓", r.pitch_link && "Pitch ✓", r.proposed_solution?.slice(0, 90)].filter(Boolean).join(" · ") || null;
    if (a.day_number === 4) return r.summer_2027_direction?.slice(0, 120) ?? r.team_reflection?.slice(0, 120) ?? null;
    return r.concept?.slice(0, 120) ?? r.group_name ?? null;
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="gif-teams">
      {teams.map((t) => {
        const members = progress.filter((p) => p.d.team_id === t.team_id);
        const groupStatuses = groupParts.map((a) => displayStatus(submissionFor(a, d.submissions, null, t.team_id)));
        const ind = members.flatMap((m) => m.parts.filter((x) => x.a.submission_type === "individual"));
        const indPct = ind.length ? Math.round((ind.filter((x) => ["submitted", "under_review", "approved"].includes(x.status)).length / ind.length) * 100) : 0;
        const scores = groupParts.map((a) => { const s = submissionFor(a, d.submissions, null, t.team_id); return s ? latestAssessment(d.assessments, s.id) : null; }).filter((x) => x?.score != null);
        return (
          <article key={t.team_id} className={cn(cardGloss, "space-y-4 p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-xl font-bold">{t.team_name}</h2><p className="text-[14px] text-[#2F4157]/70">{members.map((m) => m.d.full_name).join(" · ")}</p></div>
              <StatusPill status={combineStatuses(groupStatuses)} />
            </div>
            <ul className="space-y-2">
              {groupParts.map((a, i) => {
                const s = submissionFor(a, d.submissions, null, t.team_id); const h = highlight(a, s);
                return (
                  <li key={a.id} className="rounded-xl bg-[#F7F8FA] px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Day {a.day_number} · {a.title}</span>
                      <span className="flex items-center gap-2"><StatusPill status={groupStatuses[i]} />{s && <button type="button" className={btnLink} onClick={() => open(s.id)}>Open</button>}</span>
                    </div>
                    {h && <p className="mt-1 line-clamp-2 text-[13px] text-[#2F4157]/70">{h}</p>}
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[#E3E7ED] pt-3 text-[14px]">
              <span>Individual work: <strong>{indPct}%</strong></span>
              <span>Group parts done: <strong>{groupStatuses.filter((s) => ["submitted", "under_review", "approved"].includes(s)).length}/{groupParts.length}</strong></span>
              <span>Scores: <strong>{scores.length ? scores.map((x) => fmtScore(x!.score, x!.max_score)).join(", ") : "—"}</strong></span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function who(d: AdminData, s: Submission) {
  return s.team_id ? d.roster.find((r) => r.team_id === s.team_id)?.team_name ?? "Team" : d.roster.find((r) => r.delegate_id === s.delegate_id)?.full_name ?? "Delegate";
}

function InboxView({ data: d, open }: { data: AdminData; open: (id: string) => void }) {
  const [show, setShow] = useState<"pending" | "revision" | "approved">("pending");
  const list = d.submissions
    .filter((s) => show === "pending" ? s.status === "submitted" || s.status === "under_review" : show === "revision" ? s.status === "revision_required" : s.status === "approved")
    .sort((a, b) => (a.submitted_at ?? a.updated_at).localeCompare(b.submitted_at ?? b.updated_at));
  return (
    <section className="space-y-3" data-testid="gif-inbox">
      <div className="flex flex-wrap gap-2">
        {([["pending", "Awaiting review (oldest first)"], ["revision", "Revision requested"], ["approved", "Approved"]] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)} className={cn("rounded-full border px-4 py-2 text-[14px] font-semibold", focusRing, show === k ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white")}>{l}</button>
        ))}
      </div>
      {!list.length && <p className={cn(card, "p-8 text-center text-[#2F4157]/60")}>Nothing here right now.</p>}
      <ul className="space-y-2">
        {list.map((s) => {
          const a = d.assignments.find((x) => x.id === s.assignment_id)!;
          const expiring = d.files.filter((f) => f.submission_id === s.id && retentionInfo(f)?.state === "warning").length;
          return (
            <li key={s.id}>
              <button type="button" onClick={() => open(s.id)} className={cn(card, focusRing, "flex w-full flex-col gap-2 p-4 text-left hover:border-[#577E90] sm:flex-row sm:items-center sm:justify-between")} data-testid="gif-inbox-item">
                <span className="min-w-0">
                  <span className="block font-semibold">{who(d, s)} · Day {a.day_number}</span>
                  <span className="flex flex-wrap items-center gap-2 text-[14px] text-[#2F4157]/70"><TypeBadge type={a.submission_type} /> {a.title} {s.version > 1 && <span>· v{s.version}</span>}</span>
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-2 text-[13px]">
                  {expiring > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF3E3] px-2 py-1 font-semibold text-[#8A5A00]"><AlertTriangle size={13} /> {expiring} screenshot{expiring > 1 ? "s" : ""} expiring</span>}
                  <span className="text-[#2F4157]/60">{fmtDateTime(s.submitted_at)}</span>
                  <StatusPill status={s.status} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Retention({ data: d, open }: { data: AdminData; open: (id: string) => void }) {
  const proofs = d.files.filter((f) => f.kind === "story_proof").sort((a, b) => (a.expires_at ?? "").localeCompare(b.expires_at ?? ""));
  const live = proofs.filter((f) => !f.deleted_at);
  const warn = live.filter((f) => retentionInfo(f)?.state === "warning" || retentionInfo(f)?.state === "expired");
  return (
    <section className="space-y-4" data-testid="gif-retention">
      <p className={cn(card, "p-4 text-[15px] text-[#2F4157]/80")}>
        Instagram Story screenshots are deleted from storage 7 days after upload by a daily cleanup job (00:15 UTC). Review them before they expire; retention is never extended.
        The submission, its status and assessments stay.
      </p>
      {warn.length > 0 && (
        <p className="flex items-center gap-2 rounded-2xl border border-[#8A5A00]/25 bg-[#FDF3E3] p-4 text-[15px] font-semibold text-[#8A5A00]" data-testid="gif-retention-warning">
          <AlertTriangle size={18} /> {warn.length} screenshot{warn.length > 1 ? "s" : ""} expire within 48 hours.
        </p>
      )}
      <div className={cn(card, "overflow-x-auto")}>
        <table className="w-full min-w-[640px] text-left text-[15px]">
          <thead className="border-b border-[#E3E7ED] bg-[#F7F8FA] text-[13px] uppercase tracking-wide text-[#2F4157]/60">
            <tr><th className="px-4 py-3">Delegate</th><th className="px-3 py-3">Day</th><th className="px-3 py-3">Uploaded</th><th className="px-3 py-3">Expires</th><th className="px-3 py-3">Status</th><th className="px-3 py-3" /></tr>
          </thead>
          <tbody>
            {proofs.map((f) => {
              const s = d.submissions.find((x) => x.id === f.submission_id);
              const r = retentionInfo(f);
              return (
                <tr key={f.id} className="border-b border-[#E3E7ED] last:border-0">
                  <td className="px-4 py-3">{s ? who(d, s) : "—"}</td>
                  <td className="px-3 py-3">{f.story_day ?? "—"}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{fmtDateTime(f.uploaded_at)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{fmtDateTime(f.expires_at)}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[13px] font-semibold", r?.state === "deleted" ? "bg-[#F1F4F8]" : r?.state === "warning" || r?.state === "expired" ? "bg-[#FDF3E3] text-[#8A5A00]" : f.retention_status === "deletion_failed" ? "bg-[#FDEDED] text-[#B4383A]" : "bg-[#E8F3EE] text-[#2E6B4F]")}>
                      {f.retention_status === "deletion_failed" ? "Deletion failed (retrying)" : r?.state === "deleted" ? `Deleted ${fmtDateTime(f.deleted_at)}` : r?.state === "expired" ? "Expired" : r?.state === "warning" ? `${r.hoursLeft} h left` : `${Math.floor((r?.hoursLeft ?? 0) / 24)} days left`}
                    </span>
                  </td>
                  <td className="px-3 py-3">{s && <button type="button" className={btnLink} onClick={() => open(s.id)}>Review</button>}</td>
                </tr>
              );
            })}
            {!proofs.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#2F4157]/60">No Story screenshots uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="mb-2 font-bold">Recent cleanup runs</h3>
        {d.runs.length ? (
          <ul className="space-y-1 text-[14px]">
            {d.runs.map((r) => <li key={r.id}>{fmtDateTime(r.started_at)} · scanned {r.scanned} · deleted {r.deleted} · failed {r.failed}{r.orphans_deleted ? ` · orphans ${r.orphans_deleted}` : ""}</li>)}
          </ul>
        ) : <p className="text-[14px] text-[#2F4157]/60">No runs recorded yet.</p>}
      </div>
    </section>
  );
}
