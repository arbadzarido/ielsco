import "server-only";
import { one, q, tx } from "./db";
import { audit } from "./audit";
import { currentCohort } from "./cohort";
import { sendEmail, deliverQueued } from "./email/send";
import { phaseSubmittedEmail, resultEmail } from "./email/templates";
import { validVideoUrl, CRITERIA, scoresSchema } from "./validation";
import type { AppRow } from "./applications";
import { UserError } from "./applications";

// Who may work on which phase, and when (all times WIB; windows from Admin → Settings).
export function phaseWindow(phase: 2 | 3, s: Awaited<ReturnType<typeof currentCohort>>["settings"], now = new Date()) {
  const open = new Date(phase === 2 ? s.dates.phase2_open : s.dates.phase3_open).getTime();
  const close = new Date(phase === 2 ? s.dates.phase2_close : s.dates.phase3_submit_close).getTime();
  const t = now.getTime();
  return { open: t >= open && t <= close, before: t < open, after: t > close, opensAt: new Date(open), closesAt: new Date(close) };
}

export function eligibleFor(phase: 2 | 3, app: Pick<AppRow, "pathway" | "status">): boolean {
  if (phase === 2) return app.pathway === "fully_funded" && ["phase_1_completed", "phase_2_in_progress"].includes(app.status);
  // Mentees skip Phases 1–2 and go straight to Phase 3; Fully Funded applicants need Phase 2 submitted.
  if (app.pathway === "mentoring") return ["phase_1_completed", "phase_3_in_progress"].includes(app.status);
  return app.pathway === "fully_funded" && ["phase_2_submitted", "phase_3_in_progress"].includes(app.status);
}

type Input = { essayText?: string; essayDocId?: string | null; deckDocId?: string | null; videoUrl?: string; videoDocId?: string | null; notes?: string };

export async function savePhase(accountEmail: string, app: AppRow, phase: 2 | 3, input: Input, submit: boolean, ip: string | null) {
  const cohort = await currentCohort();
  const w = phaseWindow(phase, cohort.settings);
  if (!eligibleFor(phase, app)) throw new UserError(`Phase ${phase} is not available for this application.`);
  if (!w.open) throw new UserError(w.before ? `Phase ${phase} opens ${w.opensAt.toUTCString()}.` : `The Phase ${phase} deadline has passed.`);
  const own = async (id: string | null | undefined, kind: string) => {
    if (!id) return null;
    const d = await one("select 1 from gif.documents where id = $1 and application_id = $2 and kind = $3 and status in ('uploaded', 'verified')", [id, app.id, kind]);
    if (!d) throw new UserError("One of the files is missing or still uploading.");
    return id;
  };
  const essayDoc = await own(input.essayDocId, "phase2_essay");
  const deckDoc = await own(input.deckDocId, "phase2_deck");
  const videoDoc = await own(input.videoDocId, "phase3_video");
  const videoUrl = (input.videoUrl ?? "").trim();
  if (videoUrl && !validVideoUrl(videoUrl)) throw new UserError("Use a YouTube (unlisted), Vimeo, Loom or Google Drive link, or upload the file.");
  const essayText = (input.essayText ?? "").trim().slice(0, 20000);
  if (submit) {
    if (phase === 2 && !(essayDoc || essayText.length >= 300)) throw new UserError("Add your project essay (upload a PDF or write at least 300 characters).");
    if (phase === 2 && !deckDoc) throw new UserError("Upload your pitch deck.");
    if (phase === 3 && !(videoUrl || videoDoc)) throw new UserError("Add your video pitch (a link or an upload).");
  }
  await tx(async (db) => {
    const cur = (await db.query<{ submitted_at: string | null }>("select submitted_at from gif.submissions where application_id = $1 and phase = $2 for update", [app.id, phase])).rows[0];
    if (cur?.submitted_at) throw new UserError(`Phase ${phase} has already been submitted.`);
    await db.query(`insert into gif.submissions (application_id, phase, essay_text, essay_doc_id, deck_doc_id, video_url, video_doc_id, notes, submitted_at, updated_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, ${submit ? "now()" : "null"}, now())
      on conflict (application_id, phase) do update set essay_text = excluded.essay_text, essay_doc_id = excluded.essay_doc_id, deck_doc_id = excluded.deck_doc_id,
        video_url = excluded.video_url, video_doc_id = excluded.video_doc_id, notes = excluded.notes, submitted_at = excluded.submitted_at, updated_at = now()`,
      [app.id, phase, essayText || null, essayDoc, deckDoc, videoUrl || null, videoDoc, (input.notes ?? "").slice(0, 2000) || null]);
    const to = submit ? `phase_${phase}_submitted` : `phase_${phase}_in_progress`;
    if (to !== app.status) {
      await db.query("update gif.applications set status = $2, updated_at = now() where id = $1", [app.id, to]);
      await db.query("insert into gif.status_history (application_id, from_status, to_status, actor) values ($1, $2, $3, $4)", [app.id, app.status, to, accountEmail]);
    }
    if (submit) {
      const leader = (await db.query<{ legal_name: string; email: string }>("select legal_name, email from gif.participants where application_id = $1 and role = 'leader'", [app.id])).rows[0];
      await sendEmail({ to: leader.email, template: `phase${phase}_submitted`, ...phaseSubmittedEmail(leader.legal_name, phase, app.code), dedupeKey: `phase${phase}:${app.id}`, applicationId: app.id }, db);
      await audit(accountEmail, `phase${phase}_submitted`, "application", app.id, {}, ip, db);
    }
  });
  await deliverQueued().catch(() => {});
}

// ── Evaluation and selection (admin) ─────────────────────────────────────────────────────────────────────────────────
export async function saveEvaluation(evaluatorEmail: string, applicationId: string, raw: Record<string, unknown>, feedback: string, isAdmin: boolean) {
  const assigned = await one("select 1 from gif.evaluator_assignments where application_id = $1 and evaluator_email = $2", [applicationId, evaluatorEmail]);
  if (!assigned && !isAdmin) throw new UserError("You are not assigned to this application.");
  const parsed = scoresSchema.safeParse(raw);
  if (!parsed.success) throw new UserError("Score every criterion from 1 to 10.");
  const scores = parsed.data as Record<string, number>;
  const total = CRITERIA.reduce((n, c) => n + scores[c.key], 0);
  await q(`insert into gif.evaluations (application_id, evaluator_email, scores, total, feedback) values ($1, $2, $3, $4, $5)
    on conflict (application_id, evaluator_email) do update set scores = excluded.scores, total = excluded.total, feedback = excluded.feedback, submitted_at = now()`,
    [applicationId, evaluatorEmail, JSON.stringify(scores), total, feedback.slice(0, 4000) || null]);
  await audit(evaluatorEmail, "evaluation_saved", "application", applicationId, { total });
}

export async function rankings(cohortId: string) {
  return q<{ id: string; code: string; pathway: string; mode: string; team_name: string | null; leader: string; status: string; outcome: string | null;
    evaluations: number; avg_total: number | null; evaluators: string[] | null }>(
    `select a.id, a.code, a.pathway, a.mode, a.team_name, p.legal_name as leader, a.status, a.outcome,
       (select count(*)::int from gif.evaluations e where e.application_id = a.id) as evaluations,
       (select round(avg(total), 2) from gif.evaluations e where e.application_id = a.id) as avg_total,
       (select array_agg(evaluator_email) from gif.evaluator_assignments x where x.application_id = a.id) as evaluators
     from gif.applications a join gif.participants p on p.application_id = a.id and p.role = 'leader'
     where a.cohort_id = $1 and a.pathway in ('fully_funded', 'mentoring')
       and a.status in ('phase_3_submitted', 'under_evaluation', 'selected_fully_funded', 'selected_partial_funded', 'not_selected')
     order by avg_total desc nulls last, a.submitted_at`, [cohortId]);
}

// Set (unpublished) outcomes. Slots are counted in applications, which is how the 10 + 10 places are awarded.
export async function setOutcome(adminEmail: string, applicationId: string, outcome: "fully_funded" | "partial_funded" | "not_selected" | null, ip: string | null) {
  const cohort = await currentCohort();
  await tx(async (db) => {
    const app = (await db.query<{ status: string; outcome_published_at: string | null }>("select status, outcome_published_at from gif.applications where id = $1 for update", [applicationId])).rows[0];
    if (!app) throw new UserError("Application not found.");
    if (app.outcome_published_at) throw new UserError("Results for this application are already published.");
    if (outcome && outcome !== "not_selected") {
      const n = (await db.query<{ n: number }>("select count(*)::int as n from gif.applications where cohort_id = $1 and outcome = $2 and id <> $3", [cohort.id, outcome, applicationId])).rows[0].n;
      const cap = outcome === "fully_funded" ? cohort.settings.slots.fully_funded : cohort.settings.slots.partial_funded;
      if (n >= cap) throw new UserError(`All ${cap} ${outcome === "fully_funded" ? "Fully Funded" : "Partial Funded"} places are already assigned.`);
    }
    await db.query("update gif.applications set outcome = $2, status = case when status = 'phase_3_submitted' then 'under_evaluation' else status end, updated_at = now() where id = $1", [applicationId, outcome]);
    await audit(adminEmail, "outcome_set", "application", applicationId, { outcome }, ip, db);
  });
}

// Publish every decided outcome: statuses, mentee cashbacks (pending verification) and result emails. Idempotent.
export async function publishResults(adminEmail: string, ip: string | null) {
  const cohort = await currentCohort();
  const s = cohort.settings;
  const n = await tx(async (db) => {
    const apps = (await db.query<{ id: string; outcome: "fully_funded" | "partial_funded" | "not_selected"; status: string; pathway: string }>(
      "select id, outcome, status, pathway from gif.applications where cohort_id = $1 and outcome is not null and outcome_published_at is null and status <> 'withdrawn' for update", [cohort.id])).rows;
    for (const a of apps) {
      const to = a.outcome === "fully_funded" ? "selected_fully_funded" : a.outcome === "partial_funded" ? "selected_partial_funded" : "not_selected";
      await db.query("update gif.applications set status = $2, outcome_published_at = now(), updated_at = now() where id = $1", [a.id, to]);
      await db.query("insert into gif.status_history (application_id, from_status, to_status, actor, note) values ($1, $2, $3, $4, 'results published')", [a.id, a.status, to, adminEmail]);
      const ps = (await db.query<{ id: string; legal_name: string; email: string; currency: "IDR" | "USD" }>("select id, legal_name, email, currency from gif.participants where application_id = $1 and withdrawn_at is null", [a.id])).rows;
      for (const p of ps) {
        if (a.pathway === "mentoring" && a.outcome !== "not_selected") {
          const cb = s.cashback[a.outcome][p.currency];
          await db.query(`insert into gif.cashbacks (participant_id, outcome, currency, amount) values ($1, $2, $3, $4) on conflict (participant_id) do nothing`, [p.id, a.outcome, p.currency, cb]);
        }
        await sendEmail({ to: p.email, template: "result", ...resultEmail(p.legal_name, a.outcome, { covers: s.awards.fully_funded_covers, notIncluded: s.awards.not_included, contribution: s.prices.partial_funded_payable ? (p.currency === "IDR" ? `IDR ${s.prices.partial_funded_payable.IDR.toLocaleString("en-US")}` : `USD ${s.prices.partial_funded_payable.USD}`) : undefined, depositDays: s.dates.deposit_due_days ?? 7, balanceDue: "30 June 2027" }), dedupeKey: `result:${a.id}:${p.email}`, applicationId: a.id }, db);
      }
    }
    await audit(adminEmail, "results_published", "cohort", cohort.id, { count: apps.length }, ip, db);
    return apps.length;
  });
  await deliverQueued().catch(() => {});
  return n;
}
