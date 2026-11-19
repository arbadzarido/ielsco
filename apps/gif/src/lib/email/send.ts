import "server-only";
import { one, q, type Db } from "../db";

// Every email is written to gif.email_outbox first (audit trail, retries, dedupe), then sent through Resend when
// RESEND_API_KEY and GIF_EMAIL_FROM are set. Without them the row is kept with status "logged" (local/test runs).
export type Mail = { to: string; template: string; subject: string; html: string; text: string; dedupeKey?: string; applicationId?: string | null };

export async function sendEmail(m: Mail, db?: Db): Promise<{ id: string | null; status: string }> {
  const sql = `insert into gif.email_outbox (dedupe_key, to_email, template, subject, html, text_body, application_id)
               values ($1, $2, $3, $4, $5, $6, $7) on conflict (dedupe_key) do nothing returning id`;
  const params = [m.dedupeKey ?? null, m.to, m.template, m.subject, m.html, m.text, m.applicationId ?? null];
  const row = db ? (await db.query<{ id: string }>(sql, params)).rows[0] : await one<{ id: string }>(sql, params);
  if (!row) return { id: null, status: "duplicate" };
  // Inside a transaction the row isn't committed yet: the caller delivers after commit (deliverQueued / cron).
  if (db) return { id: row.id, status: "queued" };
  return { id: row.id, status: await deliver(row.id) };
}

export async function deliver(id: string): Promise<string> {
  const m = await one<{ to_email: string; subject: string; html: string; text_body: string }>(
    `update gif.email_outbox set attempts = attempts + 1
     where id = $1 and status in ('queued', 'failed') and attempts < 6 returning to_email, subject, html, text_body`, [id]);
  if (!m) return "skipped";
  const key = process.env.RESEND_API_KEY, from = process.env.GIF_EMAIL_FROM;
  if (!key || !from) {
    await q("update gif.email_outbox set status = 'logged' where id = $1", [id]);
    return "logged";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `gif-${id}` },
      body: JSON.stringify({ from, to: [m.to_email], subject: m.subject, html: m.html, text: m.text_body,
        reply_to: process.env.GIF_EMAIL_REPLY_TO || "hello@ielsco.com" }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string };
    if (!res.ok) throw new Error(`Resend ${res.status}: ${body.name ?? "error"}`);
    await q("update gif.email_outbox set status = 'sent', provider_id = $2, sent_at = now(), error = null where id = $1", [id, body.id ?? null]);
    return "sent";
  } catch (e) {
    await q("update gif.email_outbox set status = 'failed', error = $2 where id = $1", [id, (e as Error).message.slice(0, 300)]);
    return "failed";
  }
}

export async function deliverQueued(limit = 50): Promise<number> {
  const rows = await q<{ id: string }>(
    "select id from gif.email_outbox where status in ('queued', 'failed') and attempts < 6 order by created_at limit $1", [limit]);
  for (const r of rows) await deliver(r.id);
  return rows.length;
}
