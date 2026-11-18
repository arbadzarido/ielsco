// GIF admin reporting: derived from live rows only (roster, assignments, submissions, assessments). Pure functions so the
// admin dashboard (KPIs, tables) and /api/gif/admin/export (CSV) compute exactly the same numbers.
import {
  STATUS_LABEL, combineStatuses, displayStatus, fmtScore, isAwaitingReview, isDone, latestAssessment, progressCounts, submissionFor, toCsv,
  type Assessment, type Assignment, type DisplayStatus, type Submission,
} from "./portal.ts";

export interface RosterRow { delegate_id: string; participant_id: string; full_name: string; email: string; linked: boolean; team_id: string | null; team_number: number | null; team_name: string | null }

export interface DelegateProgress {
  d: RosterRow;
  parts: { a: Assignment; sub: Submission | null; status: DisplayStatus }[];
  byDay: Record<number, DisplayStatus>;
  percent: number;
  done: number;
  total: number;
}

export function delegateProgress(roster: RosterRow[], assignments: Assignment[], subs: Submission[]): DelegateProgress[] {
  const active = assignments.filter((a) => a.is_active);
  const days = Array.from(new Set(active.map((a) => a.day_number))).sort((a, b) => a - b);
  return roster.map((d) => {
    const parts = active
      .filter((a) => a.submission_type === "individual" || d.team_id)
      .map((a) => { const sub = submissionFor(a, subs, d.delegate_id, d.team_id); return { a, sub, status: displayStatus(sub) }; });
    const byDay: Record<number, DisplayStatus> = {};
    for (const n of days) byDay[n] = combineStatuses(parts.filter((p) => p.a.day_number === n).map((p) => p.status));
    const c = progressCounts(parts.map((p) => p.status));
    return { d, parts, byDay, percent: c.percent, done: c.completed, total: c.total };
  });
}

export interface Kpis { delegates: number; completionPercent: number; fullyCompleted: number; pendingAssignments: number; awaitingReview: number; revisionRequired: number }
export function kpis(progress: DelegateProgress[], subs: Submission[]): Kpis {
  const all = progress.flatMap((p) => p.parts);
  const done = all.filter((p) => isDone(p.status)).length;
  return {
    delegates: progress.length,
    completionPercent: all.length ? Math.round((done / all.length) * 100) : 0,
    fullyCompleted: progress.filter((p) => p.total > 0 && p.done === p.total).length,
    pendingAssignments: all.filter((p) => p.status === "not_started" || p.status === "in_progress").length,
    awaitingReview: subs.filter((s) => isAwaitingReview(s.status)).length,
    revisionRequired: subs.filter((s) => s.status === "revision_required").length,
  };
}

export type ReportKind = "statuses" | "individual" | "teams" | "scores" | "pending";
export const REPORTS: { kind: ReportKind; label: string }[] = [
  { kind: "statuses", label: "All delegate assignment statuses" },
  { kind: "individual", label: "Individual completion report" },
  { kind: "teams", label: "Team progress report" },
  { kind: "scores", label: "Assessment scores" },
  { kind: "pending", label: "Pending submissions" },
];

export function buildReport(kind: ReportKind, roster: RosterRow[], assignments: Assignment[], subs: Submission[], assessments: Assessment[]): { filename: string; csv: string } {
  const team = roster.filter((r) => r.team_id);
  const progress = delegateProgress(team, assignments, subs);
  const active = assignments.filter((a) => a.is_active).sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order);
  const days = Array.from(new Set(active.map((a) => a.day_number))).sort((a, b) => a - b);
  const stamp = new Date().toISOString().slice(0, 10);
  const who = (s: Submission) => s.team_id ? roster.find((r) => r.team_id === s.team_id)?.team_name ?? "Team" : roster.find((r) => r.delegate_id === s.delegate_id)?.full_name ?? "Delegate";

  if (kind === "statuses") {
    const header = ["Participant ID", "Delegate", "Team", ...active.map((a) => `Day ${a.day_number} · ${a.title} (${a.submission_type})`), "Overall %"];
    const rows = progress.map((p) => [p.d.participant_id, p.d.full_name, p.d.team_name, ...active.map((a) => STATUS_LABEL[p.parts.find((x) => x.a.id === a.id)?.status ?? "not_started"]), p.percent]);
    return { filename: `gif2026-statuses-${stamp}.csv`, csv: toCsv(header, rows) };
  }
  if (kind === "individual") {
    const header = ["Participant ID", "Delegate", "Team", ...days.map((n) => `Day ${n}`), "Completed parts", "Total parts", "Overall %", "Needs revision"];
    const rows = progress.map((p) => [p.d.participant_id, p.d.full_name, p.d.team_name, ...days.map((n) => STATUS_LABEL[p.byDay[n]]), p.done, p.total, p.percent,
      p.parts.filter((x) => x.status === "revision_required").map((x) => `Day ${x.a.day_number} ${x.a.title}`).join("; ")]);
    return { filename: `gif2026-individual-completion-${stamp}.csv`, csv: toCsv(header, rows) };
  }
  if (kind === "teams") {
    const teams = Array.from(new Map(team.map((r) => [r.team_id!, r])).values()).sort((a, b) => (a.team_number ?? 0) - (b.team_number ?? 0));
    const groupParts = active.filter((a) => a.submission_type === "group");
    const header = ["Team", "Members", ...groupParts.map((a) => `Day ${a.day_number} · ${a.title}`), ...groupParts.map((a) => `Day ${a.day_number} score`), "Members' individual completion %"];
    const rows = teams.map((t) => {
      const members = progress.filter((p) => p.d.team_id === t.team_id);
      const ind = members.flatMap((m) => m.parts.filter((x) => x.a.submission_type === "individual"));
      return [t.team_name, members.map((m) => m.d.full_name).join("; "),
        ...groupParts.map((a) => STATUS_LABEL[displayStatus(submissionFor(a, subs, null, t.team_id))]),
        ...groupParts.map((a) => { const s = submissionFor(a, subs, null, t.team_id); const l = s ? latestAssessment(assessments, s.id) : null; return l?.score != null ? fmtScore(l.score, l.max_score) : ""; }),
        ind.length ? Math.round((ind.filter((x) => isDone(x.status)).length / ind.length) * 100) : 0];
    });
    return { filename: `gif2026-team-progress-${stamp}.csv`, csv: toCsv(header, rows) };
  }
  if (kind === "scores") {
    const header = ["Assessed at (UTC)", "Day", "Assignment", "Type", "Delegate / team", "Status", "Score", "Max", "Rubric", "Feedback", "Revision instructions", "Submission version"];
    const rows = [...assessments].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((x) => {
      const s = subs.find((y) => y.id === x.submission_id); const a = assignments.find((y) => y.id === s?.assignment_id);
      return [x.created_at, a?.day_number, a?.title, a?.submission_type, s ? who(s) : "", STATUS_LABEL[x.status], x.score == null ? "" : Number(x.score), x.max_score == null ? "" : Number(x.max_score),
        a ? a.rubric.map((c) => `${c.label}: ${x.rubric_scores?.[c.key] ?? "-"}`).join("; ") : "", x.feedback, x.revision_instructions, x.submission_version];
    });
    return { filename: `gif2026-assessment-scores-${stamp}.csv`, csv: toCsv(header, rows) };
  }
  // pending: every delegate/team part that still needs something (not started, in progress, revision) + submissions awaiting review
  const header = ["Kind", "Day", "Assignment", "Type", "Delegate / team", "Team", "Status", "Submitted at (UTC)"];
  const rows: unknown[][] = [];
  const seenGroup = new Set<string>();
  for (const p of progress) for (const x of p.parts) {
    if (x.status === "approved") continue;
    if (x.a.submission_type === "group") { const k = `${x.a.id}:${p.d.team_id}`; if (seenGroup.has(k)) continue; seenGroup.add(k); }
    const needsReview = x.status === "submitted" || x.status === "under_review";
    rows.push([needsReview ? "Awaiting review" : "Missing / incomplete", x.a.day_number, x.a.title, x.a.submission_type,
      x.a.submission_type === "group" ? p.d.team_name : p.d.full_name, p.d.team_name, STATUS_LABEL[x.status], x.sub?.submitted_at ?? ""]);
  }
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])) || Number(a[1]) - Number(b[1]));
  return { filename: `gif2026-pending-${stamp}.csv`, csv: toCsv(header, rows) };
}
