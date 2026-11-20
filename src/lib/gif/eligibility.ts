// GIF Summer 2027 Fully Funded eligibility: framework-free scoring shared by the delegate tracker, the admin dashboard
// and the CSV export. Only APPROVED requirements earn points. Weights and shares come from the database.
import { displayStatus, submissionFor, type Assignment, type DisplayStatus, type Submission } from "./portal.ts";

export type Source = "assignment" | "messages" | "elco_ai" | "elco_pass" | "public_profile";
export interface Category { edition: string; key: string; title: string; description: string | null; weight: number | string; sort_order: number }
export interface Requirement {
  id: string; edition: string; category_key: string; key: string; title: string; description: string | null; source: Source;
  assignment_id: string | null; share: number | string; window_label: string | null; sort_order: number; is_active: boolean;
}
export interface Review { id: string; requirement_id: string; delegate_id: string; assessor_id: string; status: "under_review" | "approved" | "revision_required"; feedback: string | null; created_at: string }
export interface VerificationRequest { id: string; requirement_id: string; delegate_id: string; url: string | null; note: string | null; created_at: string }
export interface Signals {
  delegate_id: string; user_linked: boolean;
  elco_linked: boolean; elco_linked_at: string | null; elco_practice_30d: number; elco_last_active: string | null;
  pass_exists: boolean; pass_onboarded: boolean; pass_name: boolean; pass_country: boolean; pass_role: boolean; pass_bio: boolean; pass_avatar: boolean;
  profile_public: boolean; profile_url: string | null; story_by_day: Record<string, number>;
  msg_delegates: number; msg_arba: number; msg_farrel: number;
}

export const MESSAGE_TARGET = { delegates: 3, arba: 1, farrel: 1 } as const;
export const SCHOLARSHIP_NOTE =
  "Your progress reflects your completion of the GIF Summer 2027 Fully Funded eligibility requirements. Final scholarship allocation is subject to IELSco's review and confirmation.";

export function messageProgress(s: Pick<Signals, "msg_delegates" | "msg_arba" | "msg_farrel"> | null) {
  const d = Math.min(s?.msg_delegates ?? 0, MESSAGE_TARGET.delegates), a = Math.min(s?.msg_arba ?? 0, 1), f = Math.min(s?.msg_farrel ?? 0, 1);
  return { delegates: d, arba: a, farrel: f, counted: d + a + f, target: 5, complete: d + a + f === 5, any: (s?.msg_delegates ?? 0) + (s?.msg_arba ?? 0) + (s?.msg_farrel ?? 0) > 0 };
}
export const passChecks = (s: Signals | null) => [
  { key: "pass_exists", label: "Elco-Pass created", ok: !!s?.pass_exists },
  { key: "pass_onboarded", label: "Onboarding completed", ok: !!s?.pass_onboarded },
  { key: "pass_name", label: "Display name", ok: !!s?.pass_name },
  { key: "pass_country", label: "Country", ok: !!s?.pass_country },
  { key: "pass_role", label: "Current role / status", ok: !!s?.pass_role },
];
export const passComplete = (s: Signals | null) => passChecks(s).every((c) => c.ok);
export const profileComplete = (s: Signals | null) => passComplete(s) && !!s?.profile_public;

// Auto-detected condition for review-based requirements: [met, partially started]
export function autoCondition(source: Source, s: Signals | null): [boolean, boolean] {
  if (source === "messages") { const m = messageProgress(s); return [m.complete, m.any]; }
  if (source === "elco_ai") return [!!s?.elco_linked, false];
  if (source === "elco_pass") return [passComplete(s), !!s?.pass_exists];
  if (source === "public_profile") return [profileComplete(s), !!s?.profile_public || !!s?.pass_exists];
  return [false, false];
}

export interface RequirementState {
  r: Requirement;
  status: DisplayStatus;
  verified: boolean;
  points: number;      // earned (approved only)
  maxPoints: number;   // share of the category weight
  submission: Submission | null;
  review: Review | null;
  request: VerificationRequest | null;
  conditionMet: boolean;
}

export function requirementStatus(r: Requirement, ctx: { assignments: Assignment[]; submissions: Submission[]; delegateId: string; teamId: string | null; reviews: Review[]; requests: VerificationRequest[]; signals: Signals | null }) {
  if (r.source === "assignment") {
    const a = ctx.assignments.find((x) => x.id === r.assignment_id);
    const sub = a ? submissionFor(a, ctx.submissions, ctx.delegateId, ctx.teamId) : null;
    return { status: displayStatus(sub), submission: sub, review: null, request: null, conditionMet: sub?.status === "approved" };
  }
  const review = latest(ctx.reviews.filter((x) => x.requirement_id === r.id && x.delegate_id === ctx.delegateId));
  const request = latest(ctx.requests.filter((x) => x.requirement_id === r.id && x.delegate_id === ctx.delegateId));
  const [met, started] = autoCondition(r.source, ctx.signals);
  let status: DisplayStatus;
  if (review && (!request || request.created_at <= review.created_at)) status = review.status;
  else if (met) status = "submitted";
  else if (started || request) status = "in_progress";
  else status = "not_started";
  return { status, submission: null, review, request, conditionMet: met };
}

function latest<T extends { created_at: string }>(list: T[]): T | null {
  return list.reduce<T | null>((best, x) => (!best || x.created_at > best.created_at ? x : best), null);
}

export interface CategoryState { c: Category; weight: number; earned: number; percent: number; items: RequirementState[]; pending: number }
export interface Eligibility { categories: CategoryState[]; percent: number; earned: number; totalWeight: number; pendingReview: number; incomplete: number; revision: number; approved: number; total: number }

// Overall % = Σ category earned / Σ category weight × 100. Category earned = weight × approved shares / all shares.
// Computed with plain fractions and rounded only for display (round1), so 100% is exact when everything is approved.
export function computeEligibility(input: {
  categories: Category[]; requirements: Requirement[]; assignments: Assignment[]; submissions: Submission[];
  delegateId: string; teamId: string | null; reviews: Review[]; requests: VerificationRequest[]; signals: Signals | null;
}): Eligibility {
  const reqs = input.requirements.filter((r) => r.is_active);
  const cats = [...input.categories].sort((a, b) => a.sort_order - b.sort_order).map((c) => {
    const weight = Number(c.weight) || 0;
    const list = reqs.filter((r) => r.category_key === c.key).sort((a, b) => a.sort_order - b.sort_order);
    const shares = list.reduce((s, r) => s + (Number(r.share) || 0), 0);
    const items: RequirementState[] = list.map((r) => {
      const st = requirementStatus(r, input);
      const maxPoints = shares ? (weight * (Number(r.share) || 0)) / shares : 0;
      const verified = st.status === "approved";
      return { r, ...st, verified, points: verified ? maxPoints : 0, maxPoints };
    });
    const approvedShares = list.filter((_, i) => items[i].verified).reduce((s, r) => s + (Number(r.share) || 0), 0);
    const earned = shares ? (weight * approvedShares) / shares : 0;
    return { c, weight, earned, percent: shares && weight ? (approvedShares / shares) * 100 : 0, items,
      pending: items.filter((i) => i.status === "submitted" || i.status === "under_review").length };
  });
  const totalWeight = cats.reduce((s, c) => s + c.weight, 0);
  const earned = cats.reduce((s, c) => s + c.earned, 0);
  const all = cats.flatMap((c) => c.items);
  return {
    categories: cats, earned, totalWeight,
    percent: totalWeight ? (earned / totalWeight) * 100 : 0,
    pendingReview: all.filter((i) => i.status === "submitted" || i.status === "under_review").length,
    incomplete: all.filter((i) => i.status === "not_started" || i.status === "in_progress").length,
    revision: all.filter((i) => i.status === "revision_required").length,
    approved: all.filter((i) => i.verified).length,
    total: all.length,
  };
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const fmtPct = (n: number) => `${round1(n)}%`;
export const fmtPts = (n: number) => String(round1(n));

// Status wording per requirement type (Elco AI uses its own vocabulary from the brief).
export function statusWording(source: Source, status: DisplayStatus, conditionMet: boolean): string {
  if (source === "elco_ai") {
    if (status === "approved") return "Verified";
    if (status === "revision_required") return "Revision required";
    if (status === "under_review" || status === "submitted") return "Account linked · verification pending";
    return "Account not linked yet";
  }
  if (source === "elco_pass" || source === "public_profile") {
    if (status === "approved") return "Verified";
    if (status === "revision_required") return "Revision required";
    if (status === "submitted" || status === "under_review") return "Submitted for verification";
    return conditionMet ? "Submitted for verification" : "Not started";
  }
  return "";
}

export type EligibilityBand = "100" | "75" | "50" | "below";
export const band = (pct: number): EligibilityBand => (round1(pct) >= 100 ? "100" : pct >= 75 ? "75" : pct >= 50 ? "50" : "below");

// CSV: one row per team delegate with each category and every requirement's status.
export function eligibilityCsv(
  roster: { delegate_id: string; participant_id: string; full_name: string; team_id: string | null; team_name: string | null }[],
  input: Omit<Parameters<typeof computeEligibility>[0], "delegateId" | "teamId" | "signals"> & { signals: Signals[] },
  toCsv: (h: string[], rows: unknown[][]) => string,
) {
  const team = roster.filter((r) => r.team_id);
  const results = team.map((r) => ({ r, e: computeEligibility({ ...input, delegateId: r.delegate_id, teamId: r.team_id, signals: input.signals.find((s) => s.delegate_id === r.delegate_id) ?? null }) }));
  const cats = results[0]?.e.categories ?? [];
  const header = ["Participant ID", "Delegate", "Team", "Overall % (verified)", ...cats.map((c) => `${c.c.title} (/${round1(c.weight)})`),
    ...cats.flatMap((c) => c.items.map((i) => i.r.title)), "Awaiting review", "Revision required", "Incomplete"];
  const rows = results.map(({ r, e }) => [r.participant_id, r.full_name, r.team_name, round1(e.percent), ...e.categories.map((c) => round1(c.earned)),
    ...e.categories.flatMap((c) => c.items.map((i) => i.status.replace("_", " "))), e.pendingReview, e.revision, e.incomplete]);
  return toCsv(header, rows);
}
