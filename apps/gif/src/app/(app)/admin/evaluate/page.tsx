import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { q } from "@/lib/db";
import { STATUS_LABEL, type Status } from "@/lib/status";

export default async function MyEvaluations() {
  const a = await requireStaff("evaluate");
  const rows = await q<{ id: string; code: string; team_name: string | null; status: string; scored: boolean; total: number | null }>(
    `select ap.id, ap.code, ap.team_name, ap.status, (e.id is not null) as scored, e.total from gif.evaluator_assignments x join gif.applications ap on ap.id = x.application_id
     left join gif.evaluations e on e.application_id = ap.id and e.evaluator_email = x.evaluator_email where x.evaluator_email = $1 order by scored, ap.code`, [a.email]);
  return (
    <>
      <h1>My evaluations</h1>
      <p className="muted">Applications assigned to you. Declare any conflict of interest to the selection lead before scoring.</p>
      {rows.length === 0 ? <p className="muted">Nothing assigned yet.</p> : (
        <div className="table-wrap"><table className="t compact"><thead><tr><th>Application</th><th>Status</th><th>Your score</th><th></th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.id}><td>{r.code}{r.team_name ? ` · ${r.team_name}` : ""}</td><td>{STATUS_LABEL[r.status as Status]}</td><td>{r.scored ? r.total : "—"}</td><td><Link href={`/admin/evaluate/${r.id}`}>{r.scored ? "Review" : "Score"}</Link></td></tr>)}
        </tbody></table></div>
      )}
    </>
  );
}
