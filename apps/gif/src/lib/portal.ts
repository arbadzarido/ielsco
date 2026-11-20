import "server-only";
import { cache } from "react";
import { requireAccount, type Account } from "./auth";
import { applicationForAccount, consentState, loadApplicationDetail, type AppRow, type ParticipantRow } from "./applications";
import { currentCohort, type Cohort } from "./cohort";
import { eligibleFor, phaseWindow } from "./phases";
import { requiredConsents } from "./legal";
import { formatMoney } from "./pricing";
import { fmtDate } from "./format";
import { tasksFor, tasksSummary } from "./tasks";
import { guardianBlocks } from "./guardian";

export type PortalCtx = {
  account: Account; cohort: Cohort;
  app: AppRow | null; isOwner: boolean; me: ParticipantRow | null;
  detail: Awaited<ReturnType<typeof loadApplicationDetail>> | null;
  consents: Record<string, boolean>;
};

export const portalContext = cache(async (path = "/portal"): Promise<PortalCtx> => {
  const account = await requireAccount(path);
  const cohort = await currentCohort();
  const found = await applicationForAccount(account.id);
  const consents = await consentState(account.id);
  if (!found) return { account, cohort, app: null, isOwner: false, me: null, detail: null, consents };
  const detail = await loadApplicationDetail(found.app.id);
  return { account, cohort, app: found.app, isOwner: found.isOwner, me: found.me, detail, consents };
});

export type Action = { label: string; href: string; detail?: string; tone?: "warn" | "info" };

// What this person must do next, most urgent first.
export function requiredActions(c: PortalCtx): Action[] {
  const out: Action[] = [];
  const { app, detail, me } = c;
  if (!app || !detail) return [{ label: "Start your application", href: "/apply" }];
  if (app.status === "draft") return [{ label: "Finish and submit your application", href: "/apply", detail: "Your draft is saved." }];
  if (app.status === "withdrawn") return [];
  for (const p of detail.participants.filter((x) => !x.withdrawn_at && (c.isOwner || x.id === me?.id))) {
    if (guardianBlocks(p)) out.push({ label: `Waiting for parent or guardian consent${c.isOwner && detail.participants.length > 1 ? `: ${p.legal_name}` : ""}`, href: "/portal#guardian", detail: `We emailed ${p.guardian_email ?? "the guardian"}. Payments open once they consent.`, tone: "warn" });
  }
  const missing = requiredConsents(app.pathway).filter((k) => !c.consents[k]);
  if (missing.length) out.push({ label: "Accept the programme terms", href: "/portal/application#terms", detail: "Required before payments.", tone: "warn" });
  const mine = detail.obligations.filter((o) => o.status === "open" && (c.isOwner || o.participant_id === me?.id));
  for (const o of mine) {
    const who = detail.participants.find((p) => p.id === o.participant_id);
    const blockedByDeposit = o.kind === "balance" && detail.obligations.some((d) => d.participant_id === o.participant_id && d.kind === "deposit" && d.status === "open");
    if (blockedByDeposit) continue;
    out.push({ label: `Pay: ${o.label}`, href: "/portal/payments", detail: `${formatMoney(o.amount, o.currency)}${who && c.isOwner && detail.participants.length > 1 ? ` · ${who.legal_name}` : ""}${o.due_at ? ` · due ${fmtDate(o.due_at)}` : ""}` });
  }
  const s = c.cohort.settings;
  if (app.pathway === "fully_funded" && me && tasksFor(s).length) {
    const t = tasksSummary(s, me.social_tasks);
    if (t.verified < t.total) out.push({ label: t.todo + t.notFound > 0 ? "Do the Phase 1 social media tasks" : "Phase 1 tasks: waiting for verification", href: "/portal/tasks",
      detail: `${t.verified} of ${t.total} verified${t.notFound ? `, ${t.notFound} not found: please check and resubmit` : ""}`, tone: t.todo + t.notFound > 0 ? "warn" : "info" });
  }
  for (const phase of [2, 3] as const) {
    if (!eligibleFor(phase, app)) continue;
    const w = phaseWindow(phase, s);
    if (w.open) out.push({ label: phase === 2 ? "Submit your Phase 2 essay and pitch deck" : "Record and submit your Phase 3 video presentation", href: `/portal/phase-${phase}`, detail: `Closes ${fmtDate(w.closesAt, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false })} WIB`, tone: "warn" });
    else if (w.before) out.push({ label: `Prepare for Phase ${phase}`, href: `/portal/phase-${phase}`, detail: `Opens ${fmtDate(w.opensAt, { day: "numeric", month: "long", year: "numeric" })}`, tone: "info" });
  }
  if (["selected_fully_funded", "selected_partial_funded"].includes(app.status) && !app.offer_accepted_at && c.isOwner) out.push({ label: "Accept your offer", href: "/portal/results", tone: "warn" });
  if (app.document_status === "needs_attention") out.push({ label: "Upload the documents we asked for", href: "/portal/documents", tone: "warn" });
  if (app.status === "confirmed_participant") out.push({ label: "Complete participant preparation", href: "/portal/onboarding", detail: "Passport, insurance, travel and orientation." });
  return out;
}

export function nextDeadlines(c: PortalCtx): { label: string; at: string }[] {
  const s = c.cohort.settings.dates;
  const p = c.app?.pathway;
  const list: { label: string; at: string }[] = [];
  if (p === "fully_funded" || !p) list.push({ label: "Phase 1 closes", at: s.phase1_close });
  if (p === "mentoring") list.push({ label: "First mentoring session", at: s.mentoring_start }, { label: "Last mentoring session", at: s.mentoring_end });
  if (p === "fully_funded") list.push({ label: "Phase 2 opens", at: s.phase2_open }, { label: "Phase 2 closes", at: s.phase2_close });
  if (p !== "self_funded") list.push({ label: "Phase 3 opens", at: s.phase3_open }, { label: "Phase 3 video deadline", at: s.phase3_submit_close }, { label: "Results", at: s.results });
  if (p === "self_funded" && s.balance_due) list.push({ label: "Balance due", at: s.balance_due });
  list.push({ label: "Participant preparation starts", at: s.preparation_start }, { label: "Programme starts", at: s.programme_start });
  return list.filter((x) => new Date(x.at).getTime() > Date.now());
}
