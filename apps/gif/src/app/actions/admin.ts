"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff, normalizeEmail, type Permission } from "@/lib/auth";
import { one, q, tx } from "@/lib/db";
import { audit } from "@/lib/audit";
import { currentCohort } from "@/lib/cohort";
import { clientIp } from "@/lib/request";
import { isStatus, STATUS_LABEL } from "@/lib/status";
import { recordManualPayment, refundPayment, recomputeNow, PaymentError } from "@/lib/payments/service";
import { saveEvaluation, setOutcome, publishResults } from "@/lib/phases";
import { UserError } from "@/lib/applications";
import { sendEmail, deliverQueued } from "@/lib/email/send";
import { announcementEmail, elcoActivatedEmail, missingInfoEmail } from "@/lib/email/templates";
import { resolveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { signedDownloadUrl } from "@/lib/storage";

export type AdminResult = { ok?: boolean; error?: string; message?: string; url?: string } | null;

async function staff(p: Permission) {
  const a = await requireStaff(p);
  return { a, ip: await clientIp() };
}
const done = (message = "Saved.", path = "/admin"): AdminResult => { revalidatePath(path, "layout"); return { ok: true, message }; };
const fail = (e: unknown): AdminResult => {
  if (e instanceof UserError || e instanceof PaymentError) return { error: e.message };
  throw e;
};

export async function changeStatusAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("status");
  const id = String(fd.get("application_id")), to = String(fd.get("status")), note = String(fd.get("note") ?? "").trim();
  if (!isStatus(to)) return { error: "Unknown status." };
  if (note.length < 3) return { error: "Add a short note explaining the change (audited)." };
  try { await tx(async (db) => {
    const cur = (await db.query<{ status: string }>("select status from gif.applications where id = $1 for update", [id])).rows[0];
    if (!cur) throw new UserError("Not found.");
    await db.query("update gif.applications set status = $2, updated_at = now(), withdrawn_at = case when $2 = 'withdrawn' then now() else withdrawn_at end where id = $1", [id, to]);
    if (to === "withdrawn") {
      await db.query("update gif.participants set withdrawn_at = coalesce(withdrawn_at, now()) where application_id = $1", [id]);
      await db.query("update gif.obligations set status = 'cancelled' where application_id = $1 and status = 'open'", [id]);
    }
    if (to === "confirmed_participant") await db.query("update gif.participants set seat_status = 'confirmed', seat_confirmed_at = coalesce(seat_confirmed_at, now()) where application_id = $1 and withdrawn_at is null", [id]);
    await db.query("insert into gif.status_history (application_id, from_status, to_status, actor, note) values ($1, $2, $3, $4, $5)", [id, cur.status, to, a.email, note]);
    await audit(a.email, "status_changed", "application", id, { from: cur.status, to, note }, ip, db);
  }); } catch (e) { return fail(e); }
  return done(`Status set to ${STATUS_LABEL[to]}.`);
}

export async function addNoteAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a } = await staff("review");
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { error: "Write a note." };
  await q("insert into gif.notes (application_id, author, body) values ($1, $2, $3)", [String(fd.get("application_id")), a.email, body.slice(0, 4000)]);
  return done("Note added.");
}

export async function missingInfoAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("review");
  const id = String(fd.get("application_id")), message = String(fd.get("message") ?? "").trim();
  if (message.length < 10) return { error: "Write the message to the applicant." };
  const p = await one<{ legal_name: string; email: string }>("select legal_name, email from gif.participants where application_id = $1 and role = 'leader'", [id]);
  if (!p) return { error: "Not found." };
  await q("update gif.applications set document_status = 'needs_attention' where id = $1", [id]);
  await sendEmail({ to: p.email, template: "missing_info", ...missingInfoEmail(p.legal_name, message.slice(0, 3000)), applicationId: id });
  await audit(a.email, "missing_info_requested", "application", id, { message: message.slice(0, 500) }, ip);
  return done("Email sent and documents marked as needing attention.");
}

export async function reviewDocumentAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("review");
  const id = String(fd.get("document_id")), verdict = String(fd.get("verdict")), note = String(fd.get("note") ?? "").slice(0, 500);
  if (!["verified", "rejected"].includes(verdict)) return { error: "Choose verify or reject." };
  const d = await one<{ application_id: string }>("update gif.documents set status = $2, review_note = $3, reviewed_by = $4, reviewed_at = now() where id = $1 returning application_id", [id, verdict, note || null, a.email]);
  if (!d) return { error: "Not found." };
  const pendingLeft = await one<{ n: number }>("select count(*)::int as n from gif.documents where application_id = $1 and status in ('uploaded', 'rejected')", [d.application_id]);
  if (verdict === "verified" && (pendingLeft?.n ?? 0) === 0) await q("update gif.applications set document_status = 'verified' where id = $1", [d.application_id]);
  await audit(a.email, `document_${verdict}`, "document", id, { note }, ip);
  return done();
}

export async function documentLinkAction(documentId: string): Promise<AdminResult> {
  const { a, ip } = await staff("read");
  const d = await one<{ storage_key: string; application_id: string }>("select storage_key, application_id from gif.documents where id = $1 and status not in ('pending_upload', 'deleted')", [documentId]);
  if (!d) return { error: "Not found." };
  if (a.staffRole === "evaluator" && !(await one("select 1 from gif.evaluator_assignments where application_id = $1 and evaluator_email = $2", [d.application_id, a.email]))) return { error: "Not assigned to you." };
  await audit(a.email, "document_opened", "document", documentId, {}, ip);
  return { ok: true, url: await signedDownloadUrl(d.storage_key, 300) };
}

export async function manualPaymentAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("finance");
  const reference = String(fd.get("reference") ?? "").trim();
  if (reference.length < 3) return { error: "Enter the bank reference or a description of the proof." };
  try {
    await recordManualPayment(a.email, String(fd.get("obligation_id")), Number(fd.get("amount")), String(fd.get("currency")) as "IDR" | "USD", reference.slice(0, 200), ip);
  } catch (e) { return fail(e); }
  return done("Manual payment recorded, receipt issued and applicant emailed.");
}

export async function waiveObligationAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("finance");
  const id = String(fd.get("obligation_id")), reason = String(fd.get("reason") ?? "").trim();
  if (reason.length < 5) return { error: "Give a reason (audited)." };
  const o = await one<{ application_id: string; participant_id: string; kind: string }>("update gif.obligations set status = 'waived', updated_at = now() where id = $1 and status = 'open' returning application_id, participant_id, kind", [id]);
  if (!o) return { error: "Obligation not open." };
  if (o.kind === "elco_pro") await q("update gif.elco_fulfilments set status = 'pending_activation' where obligation_id = $1 and status = 'awaiting_payment'", [id]);
  if (o.kind === "deposit") await q("update gif.participants set seat_status = 'confirmed', seat_confirmed_at = now() where id = $1 and seat_status = 'none'", [o.participant_id]);
  await audit(a.email, "obligation_waived", "obligation", id, { reason }, ip);
  await recomputeNow(o.application_id, a.email);
  return done("Obligation waived.");
}

export async function addObligationAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("finance");
  const pid = String(fd.get("participant_id")), label = String(fd.get("label") ?? "").trim(), amount = Number(fd.get("amount")), currency = String(fd.get("currency"));
  const kind = String(fd.get("kind") ?? "other");
  if (!label || !(amount > 0) || !["IDR", "USD"].includes(currency) || !["full", "balance", "other"].includes(kind)) return { error: "Label, kind, amount and currency are required." };
  const p = await one<{ application_id: string }>("select application_id from gif.participants where id = $1", [pid]);
  if (!p) return { error: "Participant not found." };
  try {
    await q("insert into gif.obligations (application_id, participant_id, kind, label, currency, amount, due_at, created_by) values ($1, $2, $3, $4, $5, $6, $7, $8)",
      [p.application_id, pid, kind, label.slice(0, 120), currency, amount, String(fd.get("due_at") || "") || null, a.email]);
  } catch (e) { if ((e as { code?: string }).code === "23505") return { error: `This delegate already has a live "${kind}" obligation.` }; throw e; }
  await audit(a.email, "obligation_added", "participant", pid, { label, amount, currency, kind }, ip);
  await recomputeNow(p.application_id, a.email);
  return done("Obligation added.");
}

export async function refundAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("finance");
  const reason = String(fd.get("reason") ?? "").trim();
  if (reason.length < 5) return { error: "Give a reason (shown to the payment provider and audited)." };
  if (fd.get("confirm") !== "on") return { error: "Tick the confirmation box." };
  try {
    const r = await refundPayment(a.email, String(fd.get("payment_id")), Number(fd.get("amount")), reason, ip, String(fd.get("refund_id") || "") || undefined);
    return done(r.ok ? "Refund succeeded." : "The payment provider declined the refund. See the audit log for its response.");
  } catch (e) { return fail(e); }
}

export async function elcoActivateAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("finance");
  const id = String(fd.get("fulfilment_id")), ref = String(fd.get("reference") ?? "").trim(), status = String(fd.get("status") ?? "activated");
  if (!["activated", "failed"].includes(status)) return { error: "Unknown status." };
  if (status === "activated" && ref.length < 3) return { error: "Enter the Elco admin reference (e.g. the subscription or grant ID) you verified." };
  const f = await one<{ elco_email: string; months: number; legal_name: string; email: string; application_id: string }>(
    `update gif.elco_fulfilments f set status = $2, elco_reference = $3, activated_by = $4, activated_at = case when $2 = 'activated' then now() else null end, updated_at = now()
     from gif.participants p where f.id = $1 and p.id = f.participant_id and f.status in ('pending_activation', 'failed') returning f.elco_email, f.months, p.legal_name, p.email, p.application_id`,
    [id, status, ref || null, a.email]);
  if (!f) return { error: "Only paid, not-yet-activated subscriptions can be updated." };
  if (status === "activated") await sendEmail({ to: f.email, template: "elco_activated", ...elcoActivatedEmail(f.legal_name, f.elco_email, f.months), dedupeKey: `elco:${id}`, applicationId: f.application_id });
  await audit(a.email, `elco_${status}`, "elco_fulfilment", id, { ref }, ip);
  return done(status === "activated" ? "Marked active; applicant emailed." : "Marked as failed.");
}

export async function cashbackAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("finance");
  const pid = String(fd.get("participant_id")), status = String(fd.get("status")), ref = String(fd.get("reference") ?? "").trim();
  if (!["approved", "paid", "rejected"].includes(status)) return { error: "Unknown status." };
  if (status === "paid" && ref.length < 3) return { error: "Enter the transfer reference." };
  const r = await one("update gif.cashbacks set status = $2, reference = coalesce($3, reference), updated_by = $4, updated_at = now() where participant_id = $1 returning 1", [pid, status, ref || null, a.email]);
  if (!r) return { error: "No cashback for this delegate." };
  await audit(a.email, `cashback_${status}`, "participant", pid, { ref }, ip);
  return done();
}

export async function assignEvaluatorAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("select");
  const id = String(fd.get("application_id")), ev = normalizeEmail(String(fd.get("evaluator") ?? ""));
  if (!ev) return { error: "Choose an evaluator." };
  const st = await one("select 1 from gif.staff where email = $1 and active and role in ('evaluator', 'admin', 'owner')", [ev]);
  if (!st) return { error: "That person is not an active evaluator (add them in Staff)." };
  if (fd.get("remove") === "1") await q("delete from gif.evaluator_assignments where application_id = $1 and evaluator_email = $2", [id, ev]);
  else await q("insert into gif.evaluator_assignments (application_id, evaluator_email, assigned_by) values ($1, $2, $3) on conflict do nothing", [id, ev, a.email]);
  await audit(a.email, fd.get("remove") === "1" ? "evaluator_unassigned" : "evaluator_assigned", "application", id, { evaluator: ev }, ip);
  return done();
}

export async function scoreAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a } = await staff("evaluate");
  try {
    await saveEvaluation(a.email, String(fd.get("application_id")), Object.fromEntries(fd), String(fd.get("feedback") ?? ""), a.staffRole === "owner" || a.staffRole === "admin");
  } catch (e) { return fail(e); }
  return done("Scores saved.");
}

export async function outcomeAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("select");
  const v = String(fd.get("outcome") ?? "");
  try { await setOutcome(a.email, String(fd.get("application_id")), v === "" ? null : (v as "fully_funded" | "partial_funded" | "not_selected"), ip); }
  catch (e) { return fail(e); }
  return done("Outcome saved (not yet published).");
}

export async function publishResultsAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("select");
  if (fd.get("confirm") !== "PUBLISH") return { error: "Type PUBLISH to confirm. Applicants are emailed immediately." };
  const n = await publishResults(a.email, ip);
  return done(`Published ${n} result${n === 1 ? "" : "s"}.`);
}

// ── Content ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const Money = z.object({ IDR: z.number().nonnegative(), USD: z.number().nonnegative() });
const iso = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "must be an ISO date-time, e.g. 2027-05-10T23:59:59+07:00");
const settingsSchema = z.object({
  applications_open: z.boolean(),
  pathways_open: z.object({ fully_funded: z.boolean(), mentoring: z.boolean(), self_funded: z.boolean() }),
  dates: z.object(Object.fromEntries(Object.entries(DEFAULT_SETTINGS.dates).map(([k, v]) => [k, typeof v === "number" || k === "deposit_due_days" ? z.number().int().positive().nullable() : v === null ? iso.nullable() : iso]))),
  prices: z.object({ elco_pro_idr: z.number().int().positive(), elco_pro_months: z.number().int().positive(), mentoring_early: Money, mentoring_regular: Money,
    self_funded_total: Money, self_funded_deposit: Money, partial_funded_payable: Money.nullable() }),
  cashback: z.object({ fully_funded: Money, partial_funded: Money }),
  slots: z.object({ fully_funded: z.number().int().nonnegative(), partial_funded: z.number().int().nonnegative(), capacity: z.number().int().positive() }),
  payments: z.object({ allow_idr_for_international: z.boolean(), bank_transfer_instructions: z.string().min(10).max(1000) }),
  universities: z.array(z.object({ name: z.string().min(2), country: z.string().min(2), status: z.enum(["planned", "confirmed"]) })),
  contact: z.object({ email: z.string().email(), whatsapp: z.string().min(5) }),
});

export async function saveSettingsAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("content");
  let json: unknown;
  try { json = JSON.parse(String(fd.get("settings") ?? "")); } catch { return { error: "Settings are not valid JSON." }; }
  const merged = resolveSettings(json);
  const parsed = settingsSchema.safeParse(merged);
  if (!parsed.success) return { error: parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  if (parsed.data.prices.self_funded_deposit.IDR >= parsed.data.prices.self_funded_total.IDR || parsed.data.prices.self_funded_deposit.USD >= parsed.data.prices.self_funded_total.USD) return { error: "The deposit must be smaller than the total." };
  const cohort = await currentCohort();
  const before = cohort.settings;
  await q("update gif.cohorts set settings = $2, capacity = $3, updated_at = now() where id = $1", [cohort.id, JSON.stringify(parsed.data), parsed.data.slots.capacity]);
  await audit(a.email, "settings_saved", "cohort", cohort.id, { before, after: parsed.data }, ip);
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved. Public pages refresh within 5 minutes. Existing obligations keep their amounts." };
}

const contentSchemas = {
  faq: z.array(z.object({ q: z.string().min(3), a: z.string().min(3), group: z.string().min(2) })),
  mentors: z.array(z.object({ name: z.string().min(2), role: z.string().min(2), org: z.string().min(2), photo: z.string().regex(/^\/[\w\-/.]+$/).optional(), bio: z.string().optional() })),
  testimonials: z.array(z.object({ quote: z.string().min(10), name: z.string().min(2), role: z.string().min(2), consent: z.literal(true, { message: "testimonials need the person's recorded consent (consent: true)" }) })),
  photos: z.array(z.object({ src: z.string().regex(/^\/photos\/[\w\-.]+$/), alt: z.string().min(10), caption: z.string(), w: z.number(), h: z.number() })),
};

export async function saveContentAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("content");
  const key = String(fd.get("key")) as keyof typeof contentSchemas;
  if (!(key in contentSchemas)) return { error: "Unknown content." };
  let json: unknown;
  try { json = JSON.parse(String(fd.get("value") ?? "")); } catch { return { error: "Not valid JSON." }; }
  const parsed = contentSchemas[key].safeParse(json);
  if (!parsed.success) return { error: parsed.error.issues.slice(0, 4).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const cohort = await currentCohort();
  await q(`insert into gif.content (cohort_id, key, value, updated_by) values ($1, $2, $3, $4)
    on conflict (cohort_id, key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`, [cohort.id, key, JSON.stringify(parsed.data), a.email]);
  await audit(a.email, "content_saved", "content", key, { items: (parsed.data as unknown[]).length }, ip);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Public pages refresh within 5 minutes." };
}

export async function announcementAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("content");
  const title = String(fd.get("title") ?? "").trim(), body = String(fd.get("body") ?? "").trim(), audience = String(fd.get("audience") ?? "all");
  if (title.length < 3 || body.length < 10) return { error: "Title and message are required." };
  if (!["all", "fully_funded", "mentoring", "self_funded", "selected", "confirmed"].includes(audience)) return { error: "Unknown audience." };
  const cohort = await currentCohort();
  const publish = fd.get("publish") === "on";
  const row = await one<{ id: string }>("insert into gif.announcements (cohort_id, title, body, audience, published_at, created_by) values ($1, $2, $3, $4, $5, $6) returning id",
    [cohort.id, title.slice(0, 160), body.slice(0, 8000), audience, publish ? new Date().toISOString() : null, a.email]);
  let sent = 0;
  if (publish && fd.get("email") === "on") {
    const cond = audience === "all" ? "true" : audience === "selected" ? "a.status in ('selected_fully_funded', 'selected_partial_funded', 'confirmed_participant') and a.outcome in ('fully_funded', 'partial_funded')"
      : audience === "confirmed" ? "p.seat_status = 'confirmed'" : "a.pathway = $2";
    const people = await q<{ legal_name: string; email: string; application_id: string }>(
      `select p.legal_name, p.email, p.application_id from gif.participants p join gif.applications a on a.id = p.application_id
       where a.cohort_id = $1 and a.status not in ('draft', 'withdrawn') and p.withdrawn_at is null and ${cond}`, audience === "all" || audience === "selected" || audience === "confirmed" ? [cohort.id] : [cohort.id, audience]);
    await tx(async (db) => {
      for (const p of people) await sendEmail({ to: p.email, template: "announcement", ...announcementEmail(p.legal_name, title, body), dedupeKey: `ann:${row!.id}:${p.email}`, applicationId: p.application_id }, db);
    });
    sent = people.length;
    deliverQueued(500).catch(() => {});
  }
  await audit(a.email, "announcement_created", "announcement", row!.id, { audience, publish, emailed: sent }, ip);
  return done(publish ? `Published${sent ? ` and queued ${sent} emails` : ""}.` : "Saved as draft.");
}

export async function publishAnnouncementAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("content");
  const id = String(fd.get("id"));
  await q("update gif.announcements set published_at = case when published_at is null then now() else null end where id = $1", [id]);
  await audit(a.email, "announcement_toggled", "announcement", id, {}, ip);
  return done();
}

export async function staffAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("staff");
  const email = normalizeEmail(String(fd.get("email") ?? "")), role = String(fd.get("role") ?? ""), active = fd.get("active") !== "off";
  if (!email) return { error: "Enter an email." };
  if (!["owner", "admin", "finance", "evaluator", "viewer"].includes(role)) return { error: "Choose a role." };
  if (email === a.email && (role !== "owner" || !active)) return { error: "You can't remove your own owner access." };
  await q(`insert into gif.staff (email, role, name, active, created_by) values ($1, $2, $3, $4, $5)
    on conflict (email) do update set role = excluded.role, name = coalesce(excluded.name, gif.staff.name), active = excluded.active`,
    [email, role, String(fd.get("name") ?? "").trim() || null, active, a.email]);
  await audit(a.email, "staff_saved", "staff", email, { role, active }, ip);
  return done("Staff saved.");
}

export async function sponsorshipStatusAction(_: AdminResult, fd: FormData): Promise<AdminResult> {
  const { a, ip } = await staff("review");
  const id = String(fd.get("id")), status = String(fd.get("status"));
  if (!["new", "in_progress", "documents_sent", "closed"].includes(status)) return { error: "Unknown status." };
  await q("update gif.sponsorship_requests set status = $2 where id = $1", [id, status]);
  await audit(a.email, "sponsorship_status", "sponsorship_request", id, { status }, ip);
  return done();
}
