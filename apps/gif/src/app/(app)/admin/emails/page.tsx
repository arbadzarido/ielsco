import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";

export default async function Emails() {
  await requireStaff("review");
  const rows = await q<{ to_email: string; template: string; subject: string; status: string; error: string | null; attempts: number; created_at: string }>(
    "select to_email, template, subject, status, error, attempts, created_at from gif.email_outbox where template <> 'login_code' order by created_at desc limit 300");
  const configured = !!(process.env.RESEND_API_KEY && process.env.GIF_EMAIL_FROM);
  return (
    <>
      <h1>Emails</h1>
      {!configured && <div className="notice warn"><p>Email sending is not configured (RESEND_API_KEY / GIF_EMAIL_FROM). Messages are recorded as &ldquo;logged&rdquo; but not sent.</p></div>}
      <p className="muted">Latest 300 transactional emails (sign-in codes are hidden). Failed emails are retried by the daily job up to 6 times.</p>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>When</th><th>To</th><th>Template</th><th>Subject</th><th>Status</th></tr></thead><tbody>
        {rows.map((r, i) => <tr key={i}><td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.created_at)}</td><td>{r.to_email}</td><td>{r.template}</td><td>{r.subject}</td><td>{r.status}{r.error ? <div className="tiny error">{r.error}</div> : null}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
