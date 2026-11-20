import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { one, q, tx } from "./db";
import { audit } from "./audit";
import { currentCohort } from "./cohort";
import { sendEmail } from "./email/send";
import { guardianConsentEmail } from "./email/templates";
import { LEGAL_VERSION } from "./legal";
import { overLimit } from "./ratelimit";
import { isMinor } from "./validation";

// Applicants under 18 on the first programme day take part only with a parent's or legal guardian's written consent
// (founder decision 20 Nov 2026). The guardian confirms through a single-use emailed link (typed full name, time, IP), or
// staff record a signed paper form. Payments for that delegate stay closed until consent is recorded.

const sha = (t: string) => createHash("sha256").update(t).digest("hex");

export type GuardianView = { participantId: string; applicant: string; guardian: string; relation: string; code: string; pathway: string; consentedAt: string | null };

export async function guardianByToken(token: string): Promise<GuardianView | null> {
  if (!/^[A-Za-z0-9_-]{30,60}$/.test(token)) return null;
  const r = await one<{ id: string; legal_name: string; guardian_name: string; guardian_relation: string; code: string; pathway: string; guardian_consent_at: string | null }>(
    `select p.id, p.legal_name, p.guardian_name, p.guardian_relation, a.code, a.pathway, p.guardian_consent_at from gif.participants p
     join gif.applications a on a.id = p.application_id
     where p.guardian_token_hash = $1 and p.guardian_token_expires_at > now() and p.withdrawn_at is null`, [sha(token)]);
  return r ? { participantId: r.id, applicant: r.legal_name, guardian: r.guardian_name, relation: r.guardian_relation, code: r.code, pathway: r.pathway, consentedAt: r.guardian_consent_at } : null;
}

export async function recordGuardianConsent(token: string, input: { name: string; relation: string; media: boolean | null }, meta: { ip: string | null; userAgent: string | null }) {
  const g = await guardianByToken(token);
  if (!g) return { ok: false as const, error: "This link has expired or was already used. Ask the applicant to send a new one from their portal." };
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) return { ok: false as const, error: "Type your full name as your signature." };
  await tx(async (db) => {
    const p = (await db.query<{ guardian_email: string; application_id: string }>(
      `update gif.participants set guardian_consent_at = now(), guardian_consent_name = $2, guardian_consent_method = 'online', guardian_consent_ip = $3,
         guardian_relation = coalesce(nullif($4, ''), guardian_relation), guardian_token_hash = null, updated_at = now()
       where id = $1 and guardian_consent_at is null returning guardian_email, application_id`, [g.participantId, name, meta.ip, input.relation.trim().slice(0, 60)])).rows[0];
    if (!p) return;
    for (const [cat, accepted] of [["guardian", true], ...(input.media === null ? [] : [["guardian_media", input.media]])] as [string, boolean][]) {
      await db.query(`insert into gif.consents (account_id, actor_email, participant_id, application_id, category, document_version, accepted, ip, user_agent)
        values (null, $1, $2, $3, $4, $5, $6, $7, $8)`, [p.guardian_email, g.participantId, p.application_id, cat, LEGAL_VERSION, accepted, meta.ip, meta.userAgent]);
    }
    await audit(`guardian:${p.guardian_email}`, "guardian_consent_given", "participant", g.participantId, { method: "online", name }, meta.ip, db);
  });
  return { ok: true as const };
}

export async function resendGuardianLink(accountId: string, participantId: string) {
  const p = await one<{ id: string; legal_name: string; guardian_name: string | null; guardian_email: string | null; guardian_consent_at: string | null; date_of_birth: string; application_id: string; owner: string; acct: string | null }>(
    `select p.id, p.legal_name, p.guardian_name, p.guardian_email, p.guardian_consent_at, p.date_of_birth, p.application_id, a.owner_account_id as owner, p.account_id as acct
     from gif.participants p join gif.applications a on a.id = p.application_id where p.id = $1`, [participantId]);
  if (!p || (p.owner !== accountId && p.acct !== accountId)) return { ok: false as const, error: "Not found." };
  if (!isMinor(p.date_of_birth) || p.guardian_consent_at) return { ok: false as const, error: "No guardian consent is needed." };
  if (!p.guardian_email || !p.guardian_name) return { ok: false as const, error: "No guardian details on file. Contact hello@ielsco.com." };
  if (await overLimit(`guardian-resend:${participantId}`, 3, 86400)) return { ok: false as const, error: "You can resend the link up to 3 times a day." };
  const token = randomBytes(32).toString("base64url");
  const cohort = await currentCohort();
  await q("update gif.participants set guardian_token_hash = $2, guardian_token_expires_at = $3 where id = $1", [p.id, sha(token), cohort.settings.dates.programme_start]);
  await sendEmail({ to: p.guardian_email, template: "guardian_consent", ...guardianConsentEmail(p.guardian_name, p.legal_name, token), applicationId: p.application_id });
  return { ok: true as const };
}

export async function recordSignedGuardianForm(staffEmail: string, participantId: string, guardianName: string, reference: string, ip: string | null) {
  if (guardianName.trim().length < 2 || reference.trim().length < 3) return { ok: false as const, error: "Enter the guardian's name and where the signed form is stored." };
  const p = await one<{ application_id: string; guardian_email: string | null }>(
    `update gif.participants set guardian_consent_at = now(), guardian_consent_name = $2, guardian_consent_method = 'signed_form', guardian_token_hash = null, updated_at = now()
     where id = $1 and guardian_consent_at is null returning application_id, guardian_email`, [participantId, guardianName.trim()]);
  if (!p) return { ok: false as const, error: "Consent is already recorded (or the delegate was not found)." };
  await q(`insert into gif.consents (account_id, actor_email, participant_id, application_id, category, document_version, accepted, ip)
    values (null, $1, $2, $3, 'guardian', $4, true, $5)`, [p.guardian_email ?? staffEmail, participantId, p.application_id, `${LEGAL_VERSION} (signed form: ${reference.trim().slice(0, 120)})`, ip]);
  await audit(staffEmail, "guardian_consent_recorded", "participant", participantId, { method: "signed_form", reference: reference.trim().slice(0, 120) }, ip);
  return { ok: true as const };
}

// Payments for a delegate under 18 stay closed until a guardian has consented.
export function guardianBlocks(p: { date_of_birth: string; guardian_consent_at: string | null }): boolean {
  return isMinor(p.date_of_birth) && !p.guardian_consent_at;
}
