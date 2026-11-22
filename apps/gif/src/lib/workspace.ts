import "server-only";
import { one } from "./db";
import { findAccountForIelscoUser, type Account, type IelscoUser, type StaffRole } from "./auth";
import { contextForAccount, requiredActions, nextDeadlines } from "./portal";
import { currentCohort } from "./cohort";
import { pathwayOpen, pathwayOpensAt, type Pathway } from "./settings";
import { progressSteps, STATUS_LABEL, PATHWAY_LABEL, type Step } from "./status";
import { publishedAnnouncements } from "./cms";
import { tasksComplete, tasksFor } from "./tasks";

// The participant's whole GIF journey as plain JSON, for the GIF workspace inside the IELSco dashboard
// (/api/integrations/ielsco/workspace). It reuses the portal's own logic (requiredActions, nextDeadlines, progressSteps,
// announcements), so the IELSco dashboard and gif.ielsco.com always agree. Links are GIF paths; IELSco opens them
// through single sign-on. Partial Funded is a result of the Fully Funded selection, not a registration pathway.

const PATHWAYS: Pathway[] = ["fully_funded", "mentoring", "self_funded"];
const PAID_STATUSES = ["phase_1_completed", "phase_2_in_progress", "phase_2_submitted", "phase_3_in_progress", "phase_3_submitted", "under_evaluation", "confirmed_participant"];

export type Workspace = {
  cohort: { id: string; name: string; startsOn: string; endsOn: string; destinations: string[] };
  pathways: { pathway: Pathway; label: string; open: boolean; opensAt: string; reason: string | null }[];
  account: { linked: boolean; staffRole: StaffRole | null } | null;
  application: null | {
    code: string; pathway: Pathway; pathwayLabel: string; status: string; statusLabel: string; mode: "individual" | "team";
    teamName: string | null; isOwner: boolean; submittedAt: string | null; outcome: string | null;
  };
  steps: Step[];
  actions: { label: string; href: string; detail?: string; tone?: "warn" | "info" }[];
  deadlines: { label: string; at: string }[];
  obligations: { label: string; kind: string; amount: number; currency: "IDR" | "USD"; status: string; dueAt: string | null; paidAt: string | null; paidAmount: number; remaining: number }[];
  payments: { kind: string; amount: number; currency: "IDR" | "USD"; status: string; createdAt: string; paidAt: string | null; receiptNo: string | null }[];
  documents: { kind: string; filename: string; status: string; createdAt: string }[];
  submissions: { phase: number; submittedAt: string | null }[];
  elco: { status: string; activatedAt: string | null }[];
  announcements: { id: string; title: string; body: string; publishedAt: string }[];
};

export async function workspaceFor(user: IelscoUser, now = new Date()): Promise<Workspace> {
  const cohort = await currentCohort();
  const s = cohort.settings;
  const base: Workspace = {
    cohort: { id: cohort.id, name: cohort.name, startsOn: s.dates.programme_start, endsOn: s.dates.programme_end, destinations: ["Singapore", "Malaysia", "Thailand"] },
    pathways: PATHWAYS.map((p) => { const o = pathwayOpen(s, p, now); return { pathway: p, label: PATHWAY_LABEL[p], open: o.open, opensAt: pathwayOpensAt(s, p), reason: o.open ? null : o.reason ?? null }; }),
    account: null, application: null, steps: [], actions: [{ label: "Start your application", href: "/apply" }],
    deadlines: [], obligations: [], payments: [], documents: [], submissions: [], elco: [], announcements: [],
  };
  const found = await findAccountForIelscoUser(user);
  if (!found) {
    base.announcements = (await publishedAnnouncements(["all"])).map((a) => ({ id: a.id, title: a.title, body: a.body, publishedAt: a.published_at }));
    return base;
  }
  const staff = await one<{ role: StaffRole; name: string | null }>("select role, name from gif.staff where email = $1 and active", [found.email]);
  const account: Account = { id: found.id, email: found.email, staffRole: staff?.role ?? null, staffName: staff?.name ?? null, ielscoLinked: found.linked };
  const c = await contextForAccount(account);
  base.account = { linked: found.linked, staffRole: account.staffRole };
  base.actions = requiredActions(c);
  base.deadlines = nextDeadlines(c);
  const { app, detail, me } = c;
  if (!app || !detail) {
    base.announcements = (await publishedAnnouncements(["all"])).map((a) => ({ id: a.id, title: a.title, body: a.body, publishedAt: a.published_at }));
    return base;
  }
  const mine = <T extends { participant_id: string | null }>(rows: T[]) => rows.filter((r) => c.isOwner || r.participant_id === me?.id || r.participant_id === null);
  const paidMine = detail.obligations.filter((o) => (c.isOwner || o.participant_id === me?.id) && ["elco_pro", "mentoring", "deposit"].includes(o.kind));
  const paid = paidMine.length > 0 && paidMine.every((o) => o.status === "paid" || o.status === "waived");
  const tasks = { required: tasksFor(s).length > 0, done: detail.participants.filter((p) => !p.withdrawn_at && (c.isOwner || p.id === me?.id)).every((p) => tasksComplete(s, p.social_tasks)) };
  const published = app.outcome_published_at ? app.outcome : null;
  base.application = {
    code: app.code, pathway: app.pathway, pathwayLabel: PATHWAY_LABEL[app.pathway], status: app.status, statusLabel: STATUS_LABEL[app.status],
    mode: app.mode, teamName: app.team_name, isOwner: c.isOwner, submittedAt: app.submitted_at, outcome: published,
  };
  base.steps = progressSteps(app.pathway, app.status, paid || PAID_STATUSES.includes(app.status), tasks);
  base.obligations = mine(detail.obligations).map((o) => {
    const paidAmount = o.status === "paid" || o.status === "waived" ? Number(o.amount) : Number(o.paid_amount ?? 0);
    return { label: o.label, kind: o.kind, amount: Number(o.amount), currency: o.currency, status: o.status, dueAt: o.due_at, paidAt: o.paid_at,
      paidAmount, remaining: Math.max(0, Math.round((Number(o.amount) - paidAmount) * 100) / 100) };
  });
  base.payments = mine(detail.payments).filter((p) => !p.is_duplicate || p.status === "paid").slice(0, 20)
    .map((p) => ({ kind: p.kind, amount: p.amount, currency: p.currency, status: p.status, createdAt: p.created_at, paidAt: p.paid_at, receiptNo: p.receipt_no }));
  base.documents = mine(detail.documents).map((d) => ({ kind: d.kind, filename: d.filename, status: d.status, createdAt: d.created_at }));
  base.submissions = detail.submissions.map((x) => ({ phase: x.phase, submittedAt: x.submitted_at }));
  base.elco = detail.fulfilments.filter((f) => c.isOwner || f.participant_id === me?.id).map((f) => ({ status: f.status, activatedAt: f.activated_at }));
  const audience = ["all", app.pathway, ...(published && published !== "not_selected" ? ["selected"] : []), ...(app.status === "confirmed_participant" ? ["confirmed"] : [])];
  base.announcements = (await publishedAnnouncements(audience)).map((a) => ({ id: a.id, title: a.title, body: a.body, publishedAt: a.published_at }));
  return base;
}
