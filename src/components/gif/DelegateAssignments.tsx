"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Bell, CalendarClock, CheckCheck, ClipboardList, MessageSquareText, Users } from "lucide-react";
import { btnLink, btnPrimary, btnSecondary, cardGloss } from "@/components/dashboard/ui";
import { ErrorState, LoadingState } from "@/components/dashboard/PageStates";
import { cn } from "@/lib/utils";
import {
  STATUS_LABEL, combineStatuses, displayStatus, fmtDateTime, fmtScore, latestAssessment, progressCounts, submissionFor,
  type Assessment, type Assignment, type DisplayStatus,
} from "@/lib/gif/portal";
import { ProgressBar, StatusPill, TypeBadge } from "./shared";
import { SubmissionForm } from "./SubmissionForm";
import { useDelegatePortal, type PortalData } from "./useDelegatePortal";

export function DelegateAssignments({ supabase, delegateId, delegateName, day, onOpenDay }: {
  supabase: SupabaseClient;
  delegateId: string;
  delegateName: string;
  day: number | null;
  onOpenDay: (day: number | null) => void;
}) {
  const { state, reload } = useDelegatePortal(supabase, delegateId);
  if (state.s === "loading") return <LoadingState label="Loading your assignments…" />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={reload} />;
  const d = state.data;
  if (day !== null && d.days.some((x) => x.day_number === day)) {
    return <DayDetail supabase={supabase} data={d} day={day} onBack={() => onOpenDay(null)} onChanged={reload} />;
  }
  return <Overview supabase={supabase} data={d} delegateName={delegateName} onOpenDay={onOpenDay} onChanged={reload} />;
}

function partStatus(d: PortalData, a: Assignment): DisplayStatus {
  return displayStatus(submissionFor(a, d.submissions, d.delegateId, d.teamId));
}
// Group parts don't apply to someone without a team (e.g. a test record).
const applies = (d: PortalData, a: Assignment) => a.submission_type === "individual" || !!d.teamId;

function Overview({ supabase, data: d, delegateName, onOpenDay, onChanged }: {
  supabase: SupabaseClient; data: PortalData; delegateName: string; onOpenDay: (n: number) => void; onChanged: () => void;
}) {
  const parts = d.assignments.filter((a) => applies(d, a));
  const counts = progressCounts(parts.map((a) => partStatus(d, a)));
  const teamName = d.team[0]?.team_name;
  const first = delegateName.split(" ")[0] || delegateName;

  return (
    <div className="space-y-6" data-testid="gif-assignments-overview">
      <section className={cn(cardGloss, "overflow-hidden")}>
        <div className="space-y-5 p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl" data-testid="gif-welcome">Welcome back, {first}!</h2>
              <p className="mt-1.5 max-w-xl text-[16px] text-[#2F4157]/70">Your GIF journey continues. Track your assignments, share your experiences, and keep building your story.</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-[#EAEFF5] px-4 py-3 md:text-right">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#2F4157]/60">Assignment progress</p>
              <p className="text-3xl font-bold text-[#2F4157]" data-testid="gif-progress-percent">{counts.percent}%</p>
            </div>
          </div>
          <ProgressBar percent={counts.percent} label="Assignment progress" />
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5" data-testid="gif-progress-counts">
            {([
              ["Total", counts.total], ["Completed", counts.completed], ["Pending", counts.pending],
              ["Awaiting review", counts.awaitingReview], ["Needs revision", counts.revision],
            ] as const).map(([label, n]) => (
              <div key={label} className={cn("rounded-xl border border-[#E3E7ED] bg-white px-3 py-2.5", label === "Needs revision" && n > 0 && "border-[#B4383A]/30 bg-[#FDEDED]")}>
                <dt className="text-[12px] font-semibold text-[#2F4157]/60">{label}</dt>
                <dd className="text-xl font-bold">{n}</dd>
              </div>
            ))}
          </dl>
          {teamName ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-[#E3E7ED] pt-4 text-[15px]" data-testid="gif-team">
              <span className="inline-flex items-center gap-1.5 font-semibold"><Users size={16} aria-hidden="true" /> {teamName}</span>
              {d.team.map((m) => <span key={m.delegate_id} className="rounded-full bg-[#F1F4F8] px-2.5 py-1 text-[14px]">{m.full_name}{m.is_me ? " (you)" : ""}</span>)}
            </div>
          ) : (
            <p className="border-t border-[#E3E7ED] pt-4 text-[14px] text-[#2F4157]/60">You are not assigned to a GIF 2026 team, so only individual work is shown.</p>
          )}
        </div>
      </section>

      <Notifications supabase={supabase} data={d} onChanged={onChanged} onOpenDay={onOpenDay} />

      <section className="space-y-3" aria-labelledby="gif-days-heading">
        <h2 id="gif-days-heading" className="text-xl font-bold md:text-2xl">Your assignments</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {d.days.map((day) => {
            const ps = d.assignments.filter((a) => a.day_number === day.day_number && applies(d, a));
            const statuses = ps.map((a) => partStatus(d, a));
            const overall = combineStatuses(statuses);
            const due = ps.map((a) => a.due_at).filter(Boolean).sort()[0] ?? null;
            const lastAssess = ps.map((a) => submissionFor(a, d.submissions, d.delegateId, d.teamId)).filter(Boolean)
              .map((s) => latestAssessment(d.assessments, s!.id)).filter((x): x is Assessment => !!x).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
            return (
              <article key={day.day_number} className={cn(cardGloss, "flex flex-col p-5")} data-testid={`gif-day-card-${day.day_number}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-bold uppercase tracking-wider text-[#577E90]">Day {day.day_number}</p>
                  <StatusPill status={overall} testId={`gif-day-status-${day.day_number}`} />
                </div>
                <h3 className="mt-1 text-lg font-bold leading-snug">{day.title}</h3>
                {day.theme && <p className="text-[14px] italic text-[#2F4157]/70">“{day.theme}”</p>}
                {day.summary && <p className="mt-2 text-[15px] text-[#2F4157]/75">{day.summary}</p>}
                <ul className="mt-4 space-y-2">
                  {ps.map((a, i) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F7F8FA] px-3 py-2">
                      <span className="flex min-w-0 items-center gap-2 text-[14px] font-medium"><TypeBadge type={a.submission_type} /> <span className="truncate">{a.title}</span></span>
                      <StatusPill status={statuses[i]} />
                    </li>
                  ))}
                  {!ps.length && <li className="text-[14px] text-[#2F4157]/60">No tasks published yet.</li>}
                </ul>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#2F4157]/65">
                  <span className="inline-flex items-center gap-1"><CalendarClock size={14} aria-hidden="true" /> {due ? `Due ${fmtDateTime(due)}` : "No deadline set"}</span>
                  {lastAssess && <span className="inline-flex items-center gap-1"><MessageSquareText size={14} aria-hidden="true" /> Assessment: {STATUS_LABEL[lastAssess.status]}</span>}
                </div>
                <div className="mt-auto pt-4">
                  <button type="button" onClick={() => onOpenDay(day.day_number)} className={cn(overall === "revision_required" || overall === "not_started" || overall === "in_progress" ? btnPrimary : btnSecondary, "w-full")}
                    data-testid={`gif-open-day-${day.day_number}`}>
                    {overall === "not_started" ? "Start" : overall === "revision_required" ? "Revise" : overall === "in_progress" ? "Continue" : "View"} Day {day.day_number} <ArrowRight size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Notifications({ supabase, data: d, onChanged, onOpenDay }: { supabase: SupabaseClient; data: PortalData; onChanged: () => void; onOpenDay: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const unread = d.notifications.filter((n) => !n.read_at);
  const shown = open ? d.notifications : d.notifications.slice(0, 3);
  if (!d.notifications.length) return null;
  const dayOf = (submissionId: string | null) => {
    const s = d.submissions.find((x) => x.id === submissionId);
    return s ? d.assignments.find((a) => a.id === s.assignment_id)?.day_number ?? null : null;
  };
  const markRead = async () => {
    await supabase.from("gif_notifications").update({ read_at: new Date().toISOString() }).in("id", unread.map((n) => n.id));
    onChanged();
  };
  return (
    <section className={cn(cardGloss, "p-5")} aria-labelledby="gif-notif-heading" data-testid="gif-notifications">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="gif-notif-heading" className="flex items-center gap-2 text-lg font-bold"><Bell size={18} aria-hidden="true" /> Updates {unread.length > 0 && <span className="rounded-full bg-[#B4383A] px-2 py-0.5 text-[12px] text-white">{unread.length} new</span>}</h2>
        {unread.length > 0 && <button type="button" className={btnLink} onClick={() => void markRead()}><CheckCheck size={16} /> Mark all read</button>}
      </div>
      <ul className="space-y-2">
        {shown.map((n) => {
          const day = dayOf(n.submission_id);
          return (
            <li key={n.id} className={cn("flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px]", n.read_at ? "bg-[#F7F8FA]" : "bg-[#EAEFF5] font-medium")}>
              <span>{n.message} <span className="block text-[12px] font-normal text-[#2F4157]/55">{fmtDateTime(n.created_at)}</span></span>
              {day && <button type="button" className={cn(btnLink, "shrink-0 text-[14px]")} onClick={() => onOpenDay(day)}>Open</button>}
            </li>
          );
        })}
      </ul>
      {d.notifications.length > 3 && <button type="button" className={cn(btnLink, "mt-2 text-[14px]")} onClick={() => setOpen((v) => !v)}>{open ? "Show less" : `Show all ${d.notifications.length}`}</button>}
    </section>
  );
}

function DayDetail({ supabase, data: d, day, onBack, onChanged }: { supabase: SupabaseClient; data: PortalData; day: number; onBack: () => void; onChanged: () => Promise<void> }) {
  const info = d.days.find((x) => x.day_number === day)!;
  const parts = useMemo(() => d.assignments.filter((a) => a.day_number === day), [d.assignments, day]);
  return (
    <div className="space-y-6" data-testid={`gif-day-detail-${day}`}>
      <button type="button" onClick={onBack} className={btnLink}><ArrowLeft size={16} /> All assignments</button>
      <header>
        <p className="text-[13px] font-bold uppercase tracking-wider text-[#577E90]">Day {day}</p>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{info.title}</h2>
        {info.theme && <p className="mt-1 text-[16px] italic text-[#2F4157]/70">“{info.theme}”</p>}
        {info.summary && <p className="mt-2 max-w-2xl text-[16px] text-[#2F4157]/75">{info.summary}</p>}
      </header>
      {parts.map((a) => <Part key={a.id} supabase={supabase} data={d} a={a} onChanged={onChanged} />)}
    </div>
  );
}

function Part({ supabase, data: d, a, onChanged }: { supabase: SupabaseClient; data: PortalData; a: Assignment; onChanged: () => Promise<void> }) {
  const sub = submissionFor(a, d.submissions, d.delegateId, d.teamId);
  const history = sub ? d.assessments.filter((x) => x.submission_id === sub.id) : [];
  const latest = history[0] ?? null;
  const files = sub ? d.files.filter((f) => f.submission_id === sub.id) : [];
  const submitter = sub?.submitted_by_delegate_id ? d.team.find((m) => m.delegate_id === sub.submitted_by_delegate_id)?.full_name : null;
  return (
    <section className={cn(cardGloss, "overflow-hidden")} data-testid={`gif-part-${a.slug}`}>
      <div className="space-y-4 border-b border-[#E3E7ED] p-5 md:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={a.submission_type} />
          <StatusPill status={displayStatus(sub)} testId={`gif-part-status-${a.slug}`} />
          {a.due_at && <span className="inline-flex items-center gap-1 text-[13px] text-[#2F4157]/65"><CalendarClock size={14} aria-hidden="true" /> Due {fmtDateTime(a.due_at)}</span>}
        </div>
        <h3 className="text-xl font-bold">{a.title}</h3>
        {a.purpose && <p className="text-[15px] font-medium text-[#2F4157]/85"><span className="font-semibold">Purpose: </span>{a.purpose}</p>}
        {a.instructions && <p className="whitespace-pre-line text-[15px] leading-relaxed text-[#2F4157]/80">{a.instructions}</p>}
        {a.deliverables.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-[14px] font-semibold"><ClipboardList size={15} aria-hidden="true" /> Required deliverables</p>
            <ul className="list-disc space-y-1 pl-5 text-[15px] text-[#2F4157]/80">{a.deliverables.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        {a.submission_format && <p className="text-[14px] text-[#2F4157]/70"><span className="font-semibold">Format: </span>{a.submission_format}</p>}
        {sub?.submitted_at && (
          <p className="rounded-xl bg-[#E8F3EE] px-3 py-2 text-[14px] text-[#2E6B4F]" data-testid="gif-submission-confirmation">
            Submitted {fmtDateTime(sub.submitted_at)}{submitter ? ` by ${submitter}` : ""}{sub.version > 1 ? ` · version ${sub.version}` : ""}
          </p>
        )}
      </div>

      {latest && (latest.feedback || latest.revision_instructions || latest.status !== "under_review") && (
        <div className={cn("space-y-2 border-b border-[#E3E7ED] p-5 md:px-7", latest.status === "revision_required" ? "bg-[#FDEDED]/60" : latest.status === "approved" ? "bg-[#E8F3EE]/60" : "bg-[#F7F8FA]")} data-testid="gif-feedback">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold">Arba&apos;s assessment</p>
            <StatusPill status={latest.status} />
            {latest.score !== null && latest.max_score ? <span className="text-[14px] font-semibold">Score {fmtScore(latest.score, latest.max_score)}</span> : null}
            <span className="text-[12px] text-[#2F4157]/55">{fmtDateTime(latest.created_at)}</span>
          </div>
          {latest.feedback && <p className="whitespace-pre-line text-[15px]">{latest.feedback}</p>}
          {latest.revision_instructions && <p className="whitespace-pre-line text-[15px]"><span className="font-semibold">What to revise: </span>{latest.revision_instructions}</p>}
          {Object.keys(latest.rubric_scores ?? {}).length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {a.rubric.filter((c) => latest.rubric_scores[c.key] !== undefined).map((c) => (
                <li key={c.key} className="rounded-full bg-white px-2.5 py-1 text-[13px]">{c.label}: <strong>{latest.rubric_scores[c.key]}/5</strong></li>
              ))}
            </ul>
          )}
          {history.length > 1 && (
            <details className="pt-1 text-[14px]">
              <summary className="cursor-pointer font-semibold text-[#577E90]">Earlier feedback ({history.length - 1})</summary>
              <ul className="mt-2 space-y-2">
                {history.slice(1).map((h) => (
                  <li key={h.id} className="rounded-xl bg-white p-3">
                    <span className="font-semibold">{STATUS_LABEL[h.status]}</span> · {fmtDateTime(h.created_at)} · version {h.submission_version}
                    {h.feedback && <p className="mt-1 whitespace-pre-line">{h.feedback}</p>}
                    {h.revision_instructions && <p className="mt-1 whitespace-pre-line">Revise: {h.revision_instructions}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="p-5 md:p-7">
        <SubmissionForm key={a.id} supabase={supabase} assignment={a} submission={sub} files={files}
          team={d.team} delegateId={d.delegateId} teamId={d.teamId} onChanged={onChanged} />
      </div>
    </section>
  );
}
