import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { countryName, fmtDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/pricing";
import { ActionForm } from "@/components/ActionForm";
import { sponsorshipStatusAction } from "@/app/actions/admin";

export default async function Sponsorship() {
  await requireStaff("review");
  const rows = await q<{ id: string; name: string; email: string; whatsapp: string; institution: string; country: string; applicant_type: string; amount: number | null; currency: "IDR" | "USD" | null; sponsorship_type: string; notes: string | null; status: string; created_at: string }>(
    "select * from gif.sponsorship_requests order by created_at desc limit 300");
  return (
    <>
      <h1>Sponsorship requests</h1>
      <p className="muted">Documentation support only. Never promise sponsorship.</p>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>When</th><th>Requester</th><th>Institution</th><th>Seeking</th><th>Notes</th><th>Status</th></tr></thead><tbody>
        {rows.map((r) => <tr key={r.id}><td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.created_at)}</td><td>{r.name}<div className="tiny">{r.email} · {r.whatsapp}</div></td><td>{r.institution}<div className="tiny">{countryName(r.country)} · {r.applicant_type}</div></td>
          <td>{r.sponsorship_type}{r.amount ? <div className="tiny">{formatMoney(r.amount, r.currency ?? "IDR")}</div> : null}</td><td className="small">{r.notes}</td>
          <td><ActionForm action={sponsorshipStatusAction} inline submit="Set" className=""><input type="hidden" name="id" value={r.id} /><select name="status" defaultValue={r.status}><option value="new">New</option><option value="in_progress">In progress</option><option value="documents_sent">Documents sent</option><option value="closed">Closed</option></select></ActionForm></td></tr>)}
      </tbody></table></div>
    </>
  );
}
