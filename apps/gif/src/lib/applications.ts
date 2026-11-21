import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { one, q, tx } from "./db";
import { audit } from "./audit";
import { currentCohort } from "./cohort";
import { sendEmail, deliverQueued } from "./email/send";
import { applicationSubmittedEmail, guardianConsentEmail, teamInviteEmail } from "./email/templates";
import { pathwayOpen, type Pathway } from "./settings";
import { currencyFor, plannedObligations, partialFundedObligations, formatMoney } from "./pricing";
import { applicationSchema, firstErrors, isMinor, normalizePhone, type ApplicationInput } from "./validation";
import { LEGAL_VERSION, requiredConsents, type ConsentCategory } from "./legal";
import { PATHWAY_LABEL, type Status } from "./status";
import { recompute } from "./payments/service";
import { recordServerEvent } from "./analytics";

export type AppRow = {
  id: string; code: string; cohort_id: string; owner_account_id: string; pathway: Pathway; mode: "individual" | "team"; team_name: string | null;
  status: Status; payment_status: string; document_status: string; outcome: string | null; outcome_published_at: string | null; offer_accepted_at: string | null;
  project_title: string | null; project_idea: string | null; experience: string | null; motivation: string | null; discovery_source: string | null;
  draft: Record<string, unknown>; submitted_at: string | null; created_at: string; updated_at: string;
};
export type ParticipantRow = { id: string; application_id: string; account_id: string | null; role: "leader" | "member"; email: string; legal_name: string; whatsapp: string;
  nationality: string; residence_country: string; date_of_birth: string; institution: string; education_level: string; academic_background: string;
  country_of_study: string; emergency_name: string; emergency_relation: string; emergency_phone: string; currency: "IDR" | "USD"; seat_status: string; withdrawn_at: string | null;
  guardian_name: string | null; guardian_email: string | null; guardian_consent_at: string | null; guardian_consent_method: string | null;
  instagram: string | null; social_tasks: Record<string, { status: "submitted" | "verified" | "not_found"; at: string; by?: string; note?: string }> };
export type ObligationRow = { id: string; participant_id: string; kind: string; label: string; currency: "IDR" | "USD"; amount: number; due_at: string | null; status: string; paid_at: string | null };
export type PaymentRow = { id: string; obligation_id: string; participant_id: string; kind: string; gateway: string; order_id: string; amount: number; currency: "IDR" | "USD";
  status: string; payment_type: string | null; receipt_no: string | null; paid_at: string | null; created_at: string; is_duplicate: boolean; manual_reference: string | null;
  cancel_result?: string | null; checkout_expires_at?: string | null; original_amount?: number | null; original_currency?: string | null; fx_rate?: number | null };

// The application an account belongs to in the current cohort: as its owner (leader) or as an invited member.
export async function applicationForAccount(accountId: string): Promise<{ app: AppRow; isOwner: boolean; me: ParticipantRow | null } | null> {
  const cohort = await currentCohort();
  const owned = await one<AppRow>("select * from gif.applications where cohort_id = $1 and owner_account_id = $2 and status <> 'withdrawn' order by created_at desc limit 1", [cohort.id, accountId]);
  if (owned) {
    const me = await one<ParticipantRow>("select * from gif.participants where application_id = $1 and role = 'leader'", [owned.id]);
    return { app: owned, isOwner: true, me };
  }
  const member = await one<ParticipantRow>(
    `select p.* from gif.participants p join gif.applications a on a.id = p.application_id
     where p.account_id = $1 and a.cohort_id = $2 and p.withdrawn_at is null and a.status <> 'withdrawn' limit 1`, [accountId, cohort.id]);
  if (!member) return null;
  const app = await one<AppRow>("select * from gif.applications where id = $1", [member.application_id]);
  return app ? { app, isOwner: false, me: member } : null;
}

export async function loadApplicationDetail(applicationId: string) {
  const [participants, obligations, payments, documents, submissions, history, fulfilments, cashbacks, invoiceRequests] = await Promise.all([
    q<ParticipantRow>("select * from gif.participants where application_id = $1 order by role, created_at", [applicationId]),
    q<ObligationRow>("select * from gif.obligations where application_id = $1 and status <> 'cancelled' order by created_at", [applicationId]),
    q<PaymentRow>("select * from gif.payments where application_id = $1 order by created_at desc", [applicationId]),
    q<{ id: string; kind: string; filename: string; mime: string; size_bytes: number; status: string; participant_id: string | null; created_at: string; review_note: string | null }>(
      "select id, kind, filename, mime, size_bytes, status, participant_id, created_at, review_note from gif.documents where application_id = $1 and status not in ('pending_upload', 'deleted') order by created_at desc", [applicationId]),
    q<{ phase: number; essay_text: string | null; essay_doc_id: string | null; deck_doc_id: string | null; video_url: string | null; video_doc_id: string | null; notes: string | null; submitted_at: string | null }>(
      "select phase, essay_text, essay_doc_id, deck_doc_id, video_url, video_doc_id, notes, submitted_at from gif.submissions where application_id = $1", [applicationId]),
    q<{ from_status: string | null; to_status: string; actor: string; note: string | null; at: string }>("select from_status, to_status, actor, note, at from gif.status_history where application_id = $1 order by at", [applicationId]),
    q<{ id: string; participant_id: string; elco_email: string; status: string; months: number; activated_at: string | null; activated_by: string | null; notes: string | null }>(
      "select f.id, f.participant_id, f.elco_email, f.status, f.months, f.activated_at, f.activated_by, f.notes from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id where p.application_id = $1", [applicationId]),
    q<{ participant_id: string; outcome: string; currency: string; amount: number; status: string }>(
      "select c.participant_id, c.outcome, c.currency, c.amount, c.status from gif.cashbacks c join gif.participants p on p.id = c.participant_id where p.application_id = $1", [applicationId]),
    q<{ id: string; obligation_id: string; participant_id: string; status: string; amount: number; currency: "IDR" | "USD"; invoice_no: string | null; created_at: string; sent_at: string | null }>(
      "select id, obligation_id, participant_id, status, amount::float8 as amount, currency, invoice_no, created_at, sent_at from gif.invoice_requests where application_id = $1 order by created_at desc", [applicationId])
      // Until migration 20261128 is applied the table doesn't exist: show no requests rather than breaking the portal.
      .catch((e: { code?: string }) => { if (e?.code === "42P01") return []; throw e; }),
  ]);
  return { participants, obligations, payments, documents, submissions, history, fulfilments, cashbacks, invoiceRequests };
}

async function newCode(prefix: string): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 5; i++) {
    const bytes = randomBytes(6);
    const code = `${prefix}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
    if (!(await one("select 1 from gif.applications where code = $1", [code]))) return code;
  }
  throw new Error("Could not allocate an application code");
}

// Create or update the draft. The wizard state is stored as-is (validated only on submit) so people can stop any time.
export async function saveDraft(accountId: string, draft: Record<string, unknown>): Promise<{ code: string }> {
  const cohort = await currentCohort();
  const json = JSON.stringify(draft);
  if (json.length > 60_000) throw new Error("Draft too large");
  const existing = await one<{ id: string; code: string; status: string }>(
    "select id, code, status from gif.applications where cohort_id = $1 and owner_account_id = $2 and status <> 'withdrawn'", [cohort.id, accountId]);
  const pathway = ["fully_funded", "mentoring", "self_funded"].includes(String(draft.pathway)) ? String(draft.pathway) : "fully_funded";
  const mode = draft.mode === "team" ? "team" : "individual";
  if (existing) {
    if (existing.status !== "draft") throw new Error("This application has been submitted and can no longer be edited here.");
    await q("update gif.applications set draft = $2, pathway = $3, mode = $4, updated_at = now() where id = $1", [existing.id, json, pathway, mode]);
    return { code: existing.code };
  }
  const code = await newCode(cohort.code_prefix);
  await q("insert into gif.applications (code, cohort_id, owner_account_id, pathway, mode, draft) values ($1, $2, $3, $4, $5, $6)",
    [code, cohort.id, accountId, pathway, mode, json]);
  await recordServerEvent("application_started", { pathway });
  return { code };
}

export type SubmitResult = { ok: true; code: string } | { ok: false; errors: Record<string, string> };

export async function submitApplication(account: { id: string; email: string }, raw: unknown, consents: Partial<Record<ConsentCategory, boolean>>,
  meta: { ip: string | null; userAgent: string | null }): Promise<SubmitResult> {
  const cohort = await currentCohort();
  const s = cohort.settings;
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: firstErrors(parsed.error) };
  const a: ApplicationInput = parsed.data;
  if (a.leader.email !== account.email) return { ok: false, errors: { "leader.email": `Use the email you signed in with (${account.email}).` } };
  const open = pathwayOpen(s, a.pathway);
  if (!open.open) return { ok: false, errors: { pathway: open.reason! } };
  const missing = requiredConsents(a.pathway).filter((c) => !consents[c]);
  if (missing.length) return { ok: false, errors: { consents: "Please read and accept each required document to continue." } };

  const people = [a.leader, ...a.members];
  if (a.pathway === "self_funded") {
    const seats = await one<{ n: number }>("select count(*)::int as n from gif.participants where cohort_id = $1 and seat_status = 'confirmed'", [cohort.id]);
    if ((seats?.n ?? 0) + people.length > s.slots.capacity) return { ok: false, errors: { pathway: "There are not enough Self-Funded seats left for your team. Contact us about the waiting list." } };
  }
  const taken = await q<{ email: string }>(
    `select p.email from gif.participants p join gif.applications ap on ap.id = p.application_id
     where p.cohort_id = $1 and p.withdrawn_at is null and p.email = any($2) and ap.owner_account_id <> $3`, [cohort.id, people.map((p) => p.email), account.id]);
  if (taken.length) return { ok: false, errors: { members: `Already in another GIF Summer 2027 application: ${taken.map((t) => t.email).join(", ")}. Each person can be in one application only.` } };

  try {
    const code = await tx(async (db) => {
      let app = (await db.query<{ id: string; code: string; status: string }>(
        "select id, code, status from gif.applications where cohort_id = $1 and owner_account_id = $2 and status <> 'withdrawn' for update", [cohort.id, account.id])).rows[0];
      if (app && app.status !== "draft") throw new UserError("You have already submitted an application. Open your portal to see it.");
      if (!app) {
        const c = await newCode(cohort.code_prefix);
        app = (await db.query<{ id: string; code: string; status: string }>(
          "insert into gif.applications (code, cohort_id, owner_account_id, pathway, mode) values ($1, $2, $3, $4, $5) returning id, code, status",
          [c, cohort.id, account.id, a.pathway, a.mode])).rows[0];
      }
      await db.query(`update gif.applications set pathway = $2, mode = $3, team_name = $4, project_title = $5, project_idea = $6, experience = $7,
        motivation = $8, discovery_source = $9, status = 'submitted', submitted_at = now(), draft = '{}'::jsonb, updated_at = now(),
        document_status = 'pending' where id = $1`,
        [app.id, a.pathway, a.mode, a.mode === "team" ? a.team_name : null, a.project_title || null, a.project_idea || null, a.experience || null, a.motivation, a.discovery_source]);
      await db.query("insert into gif.status_history (application_id, from_status, to_status, actor) values ($1, 'draft', 'submitted', $2)", [app.id, account.email]);
      for (const [i, p] of people.entries()) {
        const leader = i === 0;
        const pid = (await db.query<{ id: string }>(`insert into gif.participants (application_id, cohort_id, account_id, role, email, legal_name, whatsapp, nationality, residence_country,
            date_of_birth, institution, education_level, academic_background, country_of_study, emergency_name, emergency_relation, emergency_phone, currency)
          values ($1, $2, (select id from gif.accounts where email = $5), $3, $5, $4, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) returning id`,
          [app.id, cohort.id, leader ? "leader" : "member", p.legal_name, p.email, p.whatsapp, p.nationality, p.residence_country, p.date_of_birth, p.institution,
            p.education_level, p.academic_background, p.country_of_study, p.emergency_name, p.emergency_relation, p.emergency_phone, currencyFor(p.nationality)])).rows[0].id;
        if (isMinor(p.date_of_birth)) {
          const token = randomBytes(32).toString("base64url");
          await db.query(`update gif.participants set guardian_name = $2, guardian_relation = $3, guardian_email = $4, guardian_phone = $5,
            guardian_token_hash = $6, guardian_token_expires_at = $7 where id = $1`,
            [pid, p.guardian_name, p.guardian_relation, p.guardian_email, normalizePhone(p.guardian_phone), createHash("sha256").update(token).digest("hex"), s.dates.programme_start]);
          await sendEmail({ to: p.guardian_email, template: "guardian_consent", ...guardianConsentEmail(p.guardian_name, p.legal_name, token),
            dedupeKey: `guardian:${pid}:1`, applicationId: app.id }, db);
        }
        for (const ob of plannedObligations(s, a.pathway, p.nationality)) {
          const oid = (await db.query<{ id: string }>(`insert into gif.obligations (application_id, participant_id, kind, label, currency, amount, due_at, created_by)
            values ($1, $2, $3, $4, $5, $6, $7, 'system') returning id`, [app.id, pid, ob.kind, ob.label, ob.currency, ob.amount, ob.dueAt])).rows[0].id;
          if (ob.kind === "elco_pro") {
            await db.query("insert into gif.elco_fulfilments (participant_id, obligation_id, elco_email, months) values ($1, $2, $3, $4)", [pid, oid, p.email, s.prices.elco_pro_months]);
          }
        }
      }
      for (const cat of [...requiredConsents(a.pathway), ...(consents.media !== undefined ? ["media" as const] : [])]) {
        await db.query(`insert into gif.consents (account_id, participant_id, application_id, category, document_version, accepted, ip, user_agent)
          values ($1, (select id from gif.participants where application_id = $2 and role = 'leader'), $2, $3, $4, $5, $6, $7)`,
          [account.id, app.id, cat, LEGAL_VERSION, cat === "media" ? !!consents.media : true, meta.ip, meta.userAgent]);
      }
      await recompute(db, app.id, "system");
      const obs = (await db.query<{ label: string; amount: number; currency: "IDR" | "USD" }>("select o.label, o.amount, o.currency from gif.obligations o join gif.participants p on p.id = o.participant_id where o.application_id = $1 and p.role = 'leader'", [app.id])).rows;
      const next = a.pathway === "fully_funded" ? `Next: activate Phase 1 by paying for Elco Pro (${obs.map((o) => formatMoney(o.amount, o.currency)).join(", ")}) in your portal.`
        : a.pathway === "mentoring" ? `Next: pay the mentoring fee (${obs.map((o) => formatMoney(o.amount, o.currency)).join(", ")}) in your portal to enrol.`
        : `Next: pay the deposit (${obs.filter((o) => o.label.includes("deposit")).map((o) => formatMoney(o.amount, o.currency)).join(", ")}). Your seat is confirmed when the deposit is verified.`;
      await sendEmail({ to: account.email, template: "application_submitted", ...applicationSubmittedEmail(a.leader.legal_name, app.code, PATHWAY_LABEL[a.pathway], next),
        dedupeKey: `submitted:${app.id}`, applicationId: app.id }, db);
      for (const m of a.members) {
        await sendEmail({ to: m.email, template: "team_invite", ...teamInviteEmail(m.legal_name, a.leader.legal_name, a.team_name, app.code),
          dedupeKey: `invite:${app.id}:${m.email}`, applicationId: app.id }, db);
      }
      await audit(account.email, "application_submitted", "application", app.id, { pathway: a.pathway, mode: a.mode, people: people.length }, meta.ip, db);
      return app.code;
    });
    await deliverQueued().catch(() => {});
    await recordServerEvent("application_completed", { pathway: a.pathway, mode: a.mode });
    return { ok: true, code };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, errors: { _: e.message } };
    if ((e as { code?: string }).code === "23505") return { ok: false, errors: { _: "Someone in this application already has an active GIF Summer 2027 application." } };
    throw e;
  }
}

export class UserError extends Error {}

export async function recordConsents(accountId: string, applicationId: string | null, participantId: string | null, cats: Partial<Record<ConsentCategory, boolean>>, meta: { ip: string | null; userAgent: string | null }) {
  for (const [cat, accepted] of Object.entries(cats)) {
    await q(`insert into gif.consents (account_id, participant_id, application_id, category, document_version, accepted, ip, user_agent) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [accountId, participantId, applicationId, cat, LEGAL_VERSION, !!accepted, meta.ip, meta.userAgent]);
  }
}

export async function consentState(accountId: string): Promise<Record<string, boolean>> {
  const rows = await q<{ category: string; accepted: boolean }>(
    "select distinct on (category) category, accepted from gif.consents where account_id = $1 and document_version = $2 order by category, at desc", [accountId, LEGAL_VERSION]);
  return Object.fromEntries(rows.map((r) => [r.category, r.accepted]));
}

export async function withdrawApplication(account: { id: string; email: string }, reason: string, ip: string | null) {
  await tx(async (db) => {
    const app = (await db.query<{ id: string; status: string }>("select id, status from gif.applications where owner_account_id = $1 and status <> 'withdrawn' for update", [account.id])).rows[0];
    if (!app) throw new UserError("No active application.");
    await db.query("update gif.applications set status = 'withdrawn', withdrawn_at = now(), updated_at = now() where id = $1", [app.id]);
    await db.query("update gif.participants set withdrawn_at = now(), seat_status = case when seat_status = 'confirmed' then 'withdrawn' else seat_status end where application_id = $1", [app.id]);
    await db.query("update gif.obligations set status = 'cancelled', updated_at = now() where application_id = $1 and status = 'open'", [app.id]);
    await db.query("insert into gif.status_history (application_id, from_status, to_status, actor, note) values ($1, $2, 'withdrawn', $3, $4)", [app.id, app.status, account.email, reason.slice(0, 500)]);
    await audit(account.email, "application_withdrawn", "application", app.id, { reason: reason.slice(0, 500) }, ip, db);
  });
}

export async function acceptOffer(account: { id: string; email: string }, ip: string | null) {
  const cohort = await currentCohort();
  await tx(async (db) => {
    const app = (await db.query<{ id: string; status: string }>(
      "select id, status from gif.applications where owner_account_id = $1 and status in ('selected_fully_funded', 'selected_partial_funded') and outcome_published_at is not null for update", [account.id])).rows[0];
    if (!app) throw new UserError("There is no offer to accept.");
    await db.query("update gif.applications set offer_accepted_at = coalesce(offer_accepted_at, now()) where id = $1", [app.id]);
    if (app.status === "selected_partial_funded") {
      // Partial Funded contribution (USD 699 / IDR 10,999,000) follows the same rule as every seat: a deposit within
      // deposit_due_days of accepting secures the seat; the rest is due by the balance deadline (30 June 2027).
      for (const ob of partialFundedObligations(cohort.settings)) {
        const ps = (await db.query<{ id: string; currency: "IDR" | "USD" }>("select id, currency from gif.participants where application_id = $1 and withdrawn_at is null", [app.id])).rows;
        for (const p of ps) {
          if (!(ob.amount[p.currency] > 0)) continue;
          await db.query(`insert into gif.obligations (application_id, participant_id, kind, label, currency, amount, due_at, created_by)
            values ($1, $2, $3, $4, $5, $6, $7, 'system') on conflict do nothing`, [app.id, p.id, ob.kind, ob.label, p.currency, ob.amount[p.currency], ob.dueAt]);
        }
      }
    }
    await audit(account.email, "offer_accepted", "application", app.id, {}, ip, db);
    // Fully Funded: confirmed on acceptance. Partial Funded: confirmed once its deposit is verified (recompute).
    await recompute(db, app.id, account.email);
  });
  await deliverQueued().catch(() => {});
}
