import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { currentCohort } from "@/lib/cohort";
import { rankings } from "@/lib/phases";
import { q } from "@/lib/db";
import { STATUS_LABEL, type Status } from "@/lib/status";
import { ActionForm } from "@/components/ActionForm";
import { assignEvaluatorAction, outcomeAction, publishResultsAction } from "@/app/actions/admin";

export default async function Selection() {
  await requireStaff("select");
  const cohort = await currentCohort();
  const rows = await rankings(cohort.id);
  const evaluators = await q<{ email: string; name: string | null }>("select email, name from gif.staff where active and role in ('evaluator', 'admin', 'owner') order by email");
  const ff = rows.filter((r) => r.outcome === "fully_funded").length, pf = rows.filter((r) => r.outcome === "partial_funded").length;
  const unpublished = rows.filter((r) => r.outcome && !["selected_fully_funded", "selected_partial_funded", "not_selected"].includes(r.status)).length;
  const s = cohort.settings;
  return (
    <>
      <h1>Selection</h1>
      <p className="muted">Phase 3 entries (Fully Funded applicants and mentees), ranked by average evaluator total (7 criteria × 10 = 70 maximum).</p>
      <dl className="kpis" style={{ margin: "16px 0" }}>
        <div><dt>Entries</dt><dd>{rows.length}</dd></div>
        <div><dt>Fully Funded assigned</dt><dd>{ff} / {s.slots.fully_funded}</dd></div>
        <div><dt>Partial Funded assigned</dt><dd>{pf} / {s.slots.partial_funded}</dd></div>
        <div><dt>Decided, unpublished</dt><dd>{unpublished}</dd></div>
      </dl>
      <div className="table-wrap"><table className="t compact">
        <thead><tr><th>#</th><th>Application</th><th>Lead</th><th>Evaluations</th><th>Avg total</th><th>Evaluators</th><th>Outcome</th><th>Status</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={r.id}>
            <td>{i + 1}</td>
            <td><Link href={`/admin/applicants/${r.id}`}>{r.code}</Link>{r.team_name ? ` · ${r.team_name}` : ""}<div className="tiny muted">{r.pathway === "mentoring" ? "mentee" : "fully funded"}</div></td>
            <td>{r.leader}</td><td>{r.evaluations}</td><td><strong>{r.avg_total ?? "—"}</strong></td>
            <td className="small">{(r.evaluators ?? []).join(", ") || "—"}
              <ActionForm action={assignEvaluatorAction} inline submit="+" className=""><input type="hidden" name="application_id" value={r.id} />
                <select name="evaluator" defaultValue="" style={{ minHeight: 34, fontSize: 13 }}><option value="" disabled>Assign…</option>{evaluators.map((e) => <option key={e.email} value={e.email}>{e.name ?? e.email}</option>)}</select></ActionForm></td>
            <td>{["selected_fully_funded", "selected_partial_funded", "not_selected"].includes(r.status) ? r.outcome : (
              <ActionForm action={outcomeAction} inline submit="Set" className=""><input type="hidden" name="application_id" value={r.id} />
                <select name="outcome" defaultValue={r.outcome ?? ""} style={{ minHeight: 34, fontSize: 13 }}><option value="">Undecided</option><option value="fully_funded">Fully Funded</option><option value="partial_funded">Partial Funded</option><option value="not_selected">Not Selected</option></select></ActionForm>)}</td>
            <td className="small">{STATUS_LABEL[r.status as Status]}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <h2>Publish results</h2>
      <p className="small muted">Publishing sets every decided application to its result, creates mentee cashbacks (pending verification) and emails every delegate. Undecided entries are left as they are; decide them first.</p>
      <ActionForm action={publishResultsAction} submit="Publish results" danger>
        <label className="field" style={{ maxWidth: 320 }}><span className="label">Type PUBLISH to confirm</span><input name="confirm" autoComplete="off" /></label>
      </ActionForm>
    </>
  );
}
