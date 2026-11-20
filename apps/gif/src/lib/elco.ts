import "server-only";
import { createHash, createHmac } from "node:crypto";
import { one, q } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./email/send";
import { elcoActivatedEmail } from "./email/templates";

// Elco Pro fulfilment, hybrid (founder decision 20 Nov 2026), docs/gif-platform/ELCO-GRANT-API.md:
// - Automatic: when ELCO_GRANT_URL and IELSCO_TO_ELCO_SECRET are set, GIF asks Elco's server-to-server grant endpoint
//   (POST /api/integrations/ielsco/grants) to grant N months of Pro to the delegate's Elco email, signed with the existing
//   IELSco→Elco v1 HMAC scheme. Only fulfilments whose Elco Pro obligation is verified paid (status pending_activation) are
//   sent; a payment attempt or an open Snap popup never is. Idempotent on `reference` = gif:<obligation id>, so a retry or
//   a duplicate call returns the same grant and never grants twice.
// - Every call is recorded in gif.elco_grant_attempts (reference, HTTP status, outcome; never the secret). Failures are
//   retried with backoff (1 min, 5 min, 30 min, 2 h, then every 12 h) by the payment hook and the daily cron.
// - Manual: Finance can still activate in Elco's admin and record the reference in GIF at any time; that stays the
//   fallback when the endpoint isn't configured or keeps failing. Applicants are told "active" only after one succeeds.

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const BACKOFF_MIN = [1, 5, 30, 120, 720];

function signed(secret: string, method: string, pathWithQuery: string, body: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  const canonical = ["v1", ts, method, pathWithQuery, sha(body)].join("\n");
  return { "X-IELS-Timestamp": ts, "X-IELS-Signature": `v1=${createHmac("sha256", secret).update(canonical, "utf8").digest("hex")}` };
}

export function elcoApiConfigured(): boolean {
  const secret = (process.env.IELSCO_TO_ELCO_SECRET ?? "").split(",")[0]?.trim() ?? "";
  return !!process.env.ELCO_GRANT_URL && secret.length >= 32;
}

type Outcome = "granted" | "pending_signup" | "refused" | "error" | "unreachable";

async function record(fulfilmentId: string, reference: string, httpStatus: number | null, outcome: Outcome, grantId: string | null, detail: string | null) {
  await q(`insert into gif.elco_grant_attempts (fulfilment_id, reference, http_status, outcome, grant_id, detail) values ($1, $2, $3, $4, $5, $6)`,
    [fulfilmentId, reference, httpStatus, outcome, grantId, detail?.slice(0, 200) ?? null]);
}

// Try to activate one paid fulfilment through the Elco API. Returns true when Elco confirmed the grant (or reserved it for
// the email's sign-up). Safe to call repeatedly and concurrently: the final update only applies once.
export async function tryAutoActivate(fulfilmentId: string, opts: { force?: boolean } = {}): Promise<boolean> {
  if (!elcoApiConfigured()) return false;
  const f = await one<{ id: string; obligation_id: string; elco_email: string; months: number; status: string; legal_name: string; email: string;
    application_id: string; ob_status: string; grant_attempts: number; due: boolean }>(
    `select f.id, f.obligation_id, f.elco_email, f.months, f.status, p.legal_name, p.email, p.application_id, o.status as ob_status, f.grant_attempts,
       (f.next_attempt_at is null or f.next_attempt_at <= now()) as due
     from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id join gif.obligations o on o.id = f.obligation_id where f.id = $1`, [fulfilmentId]);
  // Only verified payments (or a waiver) unlock a grant.
  if (!f || f.status !== "pending_activation" || !["paid", "waived"].includes(f.ob_status)) return false;
  if (!f.due && !opts.force) return false;
  const reference = `gif:${f.obligation_id}`;
  const url = new URL(process.env.ELCO_GRANT_URL!);
  const body = JSON.stringify({ email: f.elco_email, plan: "pro", months: f.months, reference, source: "gif-summer-2027" });
  const secret = process.env.IELSCO_TO_ELCO_SECRET!.split(",")[0].trim();
  const backoff = async (note: string) => {
    const n = f.grant_attempts + 1;
    await q(`update gif.elco_fulfilments set grant_attempts = $2, next_attempt_at = now() + make_interval(mins => $3), notes = $4, updated_at = now()
      where id = $1 and status = 'pending_activation'`, [f.id, n, BACKOFF_MIN[Math.min(n - 1, BACKOFF_MIN.length - 1)], `${note} (automatic retry scheduled; Finance can activate manually)`]);
  };
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "IELSco-GIF/1.0", ...signed(secret, "POST", url.pathname + url.search, body) },
      body, signal: AbortSignal.timeout(10_000), redirect: "error" });
  } catch (e) {
    await record(f.id, reference, null, "unreachable", null, (e as Error).name);
    await backoff(`Elco API unreachable: ${(e as Error).name}`);
    return false;
  }
  const out = (await res.json().catch(() => ({}))) as { grant_id?: string; status?: string; code?: string; message?: string };
  if (res.ok && out.grant_id && (out.status === "granted" || out.status === "pending_signup")) {
    await record(f.id, reference, res.status, out.status, out.grant_id, null);
    const note = out.status === "pending_signup" ? `Reserved on Elco for ${f.elco_email}: it starts when that email signs up on Elco.` : null;
    const upd = await one(`update gif.elco_fulfilments set status = 'activated', elco_reference = $2, activated_by = 'elco-api', activated_at = now(),
      notes = $3, next_attempt_at = null, updated_at = now() where id = $1 and status = 'pending_activation' returning id`, [f.id, out.grant_id, note]);
    if (!upd) return true; // a parallel call or Finance got there first; the grant is idempotent on Elco's side
    await sendEmail({ to: f.email, template: "elco_activated", ...elcoActivatedEmail(f.legal_name, f.elco_email, f.months), dedupeKey: `elco:${f.id}`, applicationId: f.application_id });
    await audit("elco-api", "elco_activated", "elco_fulfilment", f.id, { grant: out.grant_id, status: out.status });
    return true;
  }
  const reason = String(out.code ?? out.status ?? "error").slice(0, 60);
  // 4xx = Elco refused this request (bad email, not configured, unauthorised): retrying the same request won't help quickly,
  // but a config fix might, so it still retries on the slow schedule. 5xx/other = temporary.
  await record(f.id, reference, res.status, res.status >= 400 && res.status < 500 ? "refused" : "error", null, reason);
  await backoff(`Elco API ${res.status}: ${reason}`);
  return false;
}

// Every paid, not-yet-active fulfilment for an application (right after a payment commits) or for the cohort (cron).
export async function autoActivatePending(applicationId?: string, opts: { force?: boolean } = {}): Promise<number> {
  if (!elcoApiConfigured()) return 0;
  const rows = await q<{ id: string }>(
    `select f.id from gif.elco_fulfilments f join gif.participants p on p.id = f.participant_id
     where f.status = 'pending_activation' and ($1::uuid is null or p.application_id = $1)
       and ($2 or f.next_attempt_at is null or f.next_attempt_at <= now()) limit 200`, [applicationId ?? null, !!opts.force]);
  let n = 0;
  for (const r of rows) if (await tryAutoActivate(r.id, opts)) n++;
  return n;
}
