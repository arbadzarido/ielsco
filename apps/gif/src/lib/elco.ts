import "server-only";
import { createHash, createHmac } from "node:crypto";
import { one, q } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./email/send";
import { elcoActivatedEmail } from "./email/templates";

// Elco Pro fulfilment, hybrid (founder decision 20 Nov 2026):
// - Automatic: when ELCO_GRANT_URL and IELSCO_TO_ELCO_SECRET are set, GIF asks Elco to grant N months of Pro to the
//   delegate's email, signed with the existing IELSco→Elco v1 HMAC scheme (src/lib/integrations/signature.ts in the
//   main app, backend/integration_ielsco.py in Elco). The endpoint does not exist in Elco yet; the contract is in
//   docs/gif-platform/ELCO-GRANT-API.md. Idempotent on `reference` (the GIF obligation id).
// - Manual: otherwise (or when the call fails), the fulfilment stays "pending_activation" and Finance activates it in
//   Elco's admin and records the reference in GIF. Applicants are told "active" only after one of the two succeeds.

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

function signed(secret: string, method: string, pathWithQuery: string, body: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  const canonical = ["v1", ts, method, pathWithQuery, sha(body)].join("\n");
  return { "X-IELS-Timestamp": ts, "X-IELS-Signature": `v1=${createHmac("sha256", secret).update(canonical, "utf8").digest("hex")}` };
}

export function elcoApiConfigured(): boolean {
  const secret = (process.env.IELSCO_TO_ELCO_SECRET ?? "").split(",")[0]?.trim() ?? "";
  return !!process.env.ELCO_GRANT_URL && secret.length >= 32;
}

// Try to activate one paid fulfilment through the Elco API. Returns true when Elco confirmed the grant.
export async function tryAutoActivate(fulfilmentId: string): Promise<boolean> {
  if (!elcoApiConfigured()) return false;
  const f = await one<{ id: string; obligation_id: string; elco_email: string; months: number; status: string; legal_name: string; email: string; application_id: string }>(
    `select f.id, f.obligation_id, f.elco_email, f.months, f.status, p.legal_name, p.email, p.application_id
     from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id where f.id = $1`, [fulfilmentId]);
  if (!f || f.status !== "pending_activation") return false;
  const url = new URL(process.env.ELCO_GRANT_URL!);
  const body = JSON.stringify({ email: f.elco_email, plan: "pro", months: f.months, reference: `gif:${f.obligation_id}`, source: "gif-summer-2027" });
  const secret = process.env.IELSCO_TO_ELCO_SECRET!.split(",")[0].trim();
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...signed(secret, "POST", url.pathname + url.search, body) }, body, signal: AbortSignal.timeout(10_000) });
    const out = (await res.json().catch(() => ({}))) as { grant_id?: string; status?: string };
    if (!res.ok || !out.grant_id) {
      await q("update gif.elco_fulfilments set notes = $2, updated_at = now() where id = $1", [f.id, `Elco API ${res.status}: ${String(out.status ?? "error").slice(0, 80)} (manual activation needed)`]);
      return false;
    }
    const upd = await one(`update gif.elco_fulfilments set status = 'activated', elco_reference = $2, activated_by = 'elco-api', activated_at = now(), updated_at = now()
      where id = $1 and status = 'pending_activation' returning id`, [f.id, out.grant_id]);
    if (!upd) return false;
    await sendEmail({ to: f.email, template: "elco_activated", ...elcoActivatedEmail(f.legal_name, f.elco_email, f.months), dedupeKey: `elco:${f.id}`, applicationId: f.application_id });
    await audit("elco-api", "elco_activated", "elco_fulfilment", f.id, { grant: out.grant_id });
    return true;
  } catch (e) {
    await q("update gif.elco_fulfilments set notes = $2, updated_at = now() where id = $1", [f.id, `Elco API unreachable: ${(e as Error).name} (manual activation needed)`]);
    return false;
  }
}

// Every paid, not-yet-active fulfilment for an application (after a payment commits) or for the cohort (cron).
export async function autoActivatePending(applicationId?: string): Promise<number> {
  if (!elcoApiConfigured()) return 0;
  const rows = await q<{ id: string }>(
    `select f.id from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id
     where f.status = 'pending_activation' and ($1::uuid is null or p.application_id = $1) limit 200`, [applicationId ?? null]);
  let n = 0;
  for (const r of rows) if (await tryAutoActivate(r.id)) n++;
  return n;
}
