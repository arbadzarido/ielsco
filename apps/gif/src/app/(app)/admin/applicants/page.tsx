import Link from "next/link";
import { requireStaff, can } from "@/lib/auth";
import { currentCohort } from "@/lib/cohort";
import { listApplicants } from "@/lib/admin";
import { STATUSES, STATUS_LABEL, PATHWAY_LABEL, type Status } from "@/lib/status";
import { countryName, fmtDate } from "@/lib/format";

export default async function Applicants({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const a = await requireStaff("read");
  const sp = await searchParams;
  const cohort = await currentCohort();
  const f = { q: sp.q?.slice(0, 80), pathway: sp.pathway, status: sp.status, country: sp.country, mode: sp.mode, payment: sp.payment };
  const rows = await listApplicants(cohort.id, f, 200, a.staffRole === "evaluator" ? a.email : undefined);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <>
      <h1>Applicants</h1>
      <form className="toolbar" method="get">
        <label className="field"><span className="label">Search</span><input type="search" name="q" defaultValue={f.q} placeholder="Name, email, ID, institution, team" /></label>
        <label className="field"><span className="label">Pathway</span><select name="pathway" defaultValue={f.pathway ?? ""}><option value="">All</option>{Object.entries(PATHWAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field"><span className="label">Status</span><select name="status" defaultValue={f.status ?? ""}><option value="">All</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
        <label className="field"><span className="label">Payment</span><select name="payment" defaultValue={f.payment ?? ""}><option value="">All</option>{["none", "due", "pending", "partially_paid", "paid", "refunded"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></label>
        <label className="field"><span className="label">Type</span><select name="mode" defaultValue={f.mode ?? ""}><option value="">All</option><option value="individual">Individual</option><option value="team">Team</option></select></label>
        <label className="field" style={{ minWidth: 90 }}><span className="label">Nationality</span><input name="country" defaultValue={f.country} maxLength={2} placeholder="ID" /></label>
        <button className="btn btn-primary btn-sm">Filter</button>
        {can(a.staffRole, "export") && <a className="btn btn-secondary btn-sm" href={`/api/admin/export?type=applicants${qs ? `&${qs}` : ""}`}>Export CSV</a>}
      </form>
      <p className="small muted">{rows.length} shown{rows.length === 200 ? " (first 200; refine the filter)" : ""}.</p>
      <div className="table-wrap"><table className="t compact">
        <thead><tr><th>ID</th><th>Lead applicant</th><th>Pathway</th><th>Type</th><th>Status</th><th>Payment</th><th>Nationality</th><th>Submitted</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td><Link href={`/admin/applicants/${r.id}`}>{r.code}</Link></td>
            <td>{r.leader ?? <span className="muted">(draft) {r.email}</span>}</td>
            <td>{PATHWAY_LABEL[r.pathway as keyof typeof PATHWAY_LABEL]}</td>
            <td>{r.mode === "team" ? `Team ${r.team_name ?? ""} (${r.people})` : "Individual"}</td>
            <td>{STATUS_LABEL[r.status as Status]}</td>
            <td>{r.payment_status.replace("_", " ")}</td>
            <td>{countryName(r.nationality)}</td>
            <td>{fmtDate(r.submitted_at)}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
