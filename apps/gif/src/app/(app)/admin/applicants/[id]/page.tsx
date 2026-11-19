import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff, can } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { loadApplicationDetail, type AppRow } from "@/lib/applications";
import { STATUSES, STATUS_LABEL, PATHWAY_LABEL } from "@/lib/status";
import { CRITERIA, EDUCATION_LEVELS, UPLOAD_RULES } from "@/lib/validation";
import { formatMoney } from "@/lib/pricing";
import { bytes, countryName, fmtDate, fmtDateTime } from "@/lib/format";
import { ActionForm, DocLink } from "@/components/ActionForm";
import { addNoteAction, addObligationAction, assignEvaluatorAction, cashbackAction, changeStatusAction, documentLinkAction, elcoActivateAction,
  manualPaymentAction, missingInfoAction, refundAction, reviewDocumentAction, waiveObligationAction } from "@/app/actions/admin";

export default async function Applicant({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireStaff("read");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const app = await one<AppRow & { owner_email: string }>("select a.*, acc.email as owner_email from gif.applications a join gif.accounts acc on acc.id = a.owner_account_id where a.id = $1", [id]);
  if (!app) notFound();
  // Evaluators see only the applications assigned to them.
  if (a.staffRole === "evaluator" && !(await one("select 1 from gif.evaluator_assignments where application_id = $1 and evaluator_email = $2", [id, a.email]))) notFound();
  const d = await loadApplicationDetail(id);
  const [notes, evals, assigned, evaluators, refunds, consents] = await Promise.all([
    q<{ author: string; body: string; at: string }>("select author, body, at from gif.notes where application_id = $1 order by at desc", [id]),
    q<{ evaluator_email: string; scores: Record<string, number>; total: number; feedback: string | null; submitted_at: string }>("select evaluator_email, scores, total, feedback, submitted_at from gif.evaluations where application_id = $1", [id]),
    q<{ evaluator_email: string }>("select evaluator_email from gif.evaluator_assignments where application_id = $1", [id]),
    q<{ email: string; name: string | null }>("select email, name from gif.staff where active and role in ('evaluator', 'admin', 'owner') order by email"),
    q<{ id: string; payment_id: string; amount: number; currency: string; reason: string; status: string; method: string; created_at: string }>(
      "select r.id, r.payment_id, r.amount, r.currency, r.reason, r.status, r.method, r.created_at from gif.refunds r join gif.payments p on p.id = r.payment_id where p.application_id = $1 order by r.created_at desc", [id]),
    q<{ category: string; document_version: string; accepted: boolean; at: string; email: string }>(
      "select c.category, c.document_version, c.accepted, c.at, acc.email from gif.consents c join gif.accounts acc on acc.id = c.account_id where c.application_id = $1 or c.participant_id in (select id from gif.participants where application_id = $1) order by c.at desc", [id]),
  ]);
  const role = a.staffRole;
  const pname = (pid: string | null) => d.participants.find((p) => p.id === pid)?.legal_name ?? "—";
  return (
    <>
      <p className="small"><Link href="/admin/applicants">← Applicants</Link></p>
      <div className="eyebrow">{PATHWAY_LABEL[app.pathway]} · {app.mode === "team" ? `Team ${app.team_name}` : "Individual"}</div>
      <h1>{app.code}</h1>
      <p><span className="badge maroon">{STATUS_LABEL[app.status]}</span> <span className="badge">Payment: {app.payment_status}</span> <span className="badge">Documents: {app.document_status}</span>
        {app.outcome && <span className="badge ok">Outcome: {app.outcome}{app.outcome_published_at ? " (published)" : " (draft)"}</span>}</p>
      <p className="small muted">Account {app.owner_email} · created {fmtDateTime(app.created_at)} · submitted {fmtDateTime(app.submitted_at)}</p>

      {app.status === "draft" && <div className="notice"><p>Draft (not submitted). Wizard data is stored as entered and not shown here.</p></div>}

      <h2>People</h2>
      <div className="grid g2">{d.participants.map((p) => (
        <div className="item" key={p.id}>
          <span className="kicker">{p.role}{p.withdrawn_at ? " · withdrawn" : ""}{p.seat_status === "confirmed" ? " · seat confirmed" : ""} · {p.account_id ? "has signed in" : "not signed in yet"}</span>
          <h3>{p.legal_name}</h3>
          <dl className="kv small" style={{ marginTop: 8 }}>
            <dt>Email</dt><dd>{p.email}</dd><dt>WhatsApp</dt><dd>{p.whatsapp}</dd><dt>Nationality</dt><dd>{countryName(p.nationality)} · pays {p.currency}</dd>
            <dt>Residence</dt><dd>{countryName(p.residence_country)}</dd><dt>DOB</dt><dd>{fmtDate(p.date_of_birth)}</dd><dt>Institution</dt><dd>{p.institution}</dd>
            <dt>Level</dt><dd>{EDUCATION_LEVELS[p.education_level as keyof typeof EDUCATION_LEVELS]}</dd><dt>Background</dt><dd>{p.academic_background}</dd><dt>Studies in</dt><dd>{countryName(p.country_of_study)}</dd>
            <dt>Emergency</dt><dd>{p.emergency_name} ({p.emergency_relation}) {p.emergency_phone}</dd>
          </dl>
        </div>
      ))}</div>

      {app.status !== "draft" && <>
        <h2>Application</h2>
        <dl className="kv">
          {app.project_title && <><dt>Project</dt><dd>{app.project_title}</dd></>}
          {app.project_idea && <><dt>Idea</dt><dd style={{ whiteSpace: "pre-wrap" }}>{app.project_idea}</dd></>}
          {app.experience && <><dt>Experience</dt><dd style={{ whiteSpace: "pre-wrap" }}>{app.experience}</dd></>}
          <dt>Motivation</dt><dd style={{ whiteSpace: "pre-wrap" }}>{app.motivation}</dd><dt>Discovery</dt><dd>{app.discovery_source}</dd>
        </dl>
      </>}

      <h2>Submissions</h2>
      {d.submissions.length === 0 ? <p className="muted">None.</p> : d.submissions.map((s) => (
        <div className="item" key={s.phase} style={{ marginBottom: 16 }}><h4>Phase {s.phase} · {s.submitted_at ? `submitted ${fmtDateTime(s.submitted_at)}` : "draft"}</h4>
          {s.essay_text && <details><summary>Essay text</summary><p style={{ whiteSpace: "pre-wrap" }}>{s.essay_text}</p></details>}
          {s.video_url && <p>Video: <a href={s.video_url} rel="noopener noreferrer" target="_blank">{s.video_url}</a></p>}
          {[s.essay_doc_id, s.deck_doc_id, s.video_doc_id].filter(Boolean).map((doc) => <DocLink key={doc!} id={doc!} label={`Open ${d.documents.find((x) => x.id === doc)?.filename ?? "file"}`} action={documentLinkAction} />)}
          {s.notes && <p className="small muted">Notes: {s.notes}</p>}</div>
      ))}

      <h2>Documents</h2>
      {d.documents.length === 0 ? <p className="muted">None.</p> : <div className="table-wrap"><table className="t compact"><thead><tr><th>File</th><th>Type</th><th>Delegate</th><th>Size</th><th>Status</th><th></th></tr></thead><tbody>
        {d.documents.map((doc) => <tr key={doc.id}><td><DocLink id={doc.id} label={doc.filename} action={documentLinkAction} /></td><td>{UPLOAD_RULES[doc.kind]?.label ?? doc.kind}</td><td>{pname(doc.participant_id)}</td><td>{bytes(doc.size_bytes)}</td><td>{doc.status}</td>
          <td>{can(role, "review") && <ActionForm action={reviewDocumentAction} inline submit="Save" className=""><input type="hidden" name="document_id" value={doc.id} /><select name="verdict" defaultValue=""><option value="" disabled>Review…</option><option value="verified">Verify</option><option value="rejected">Reject</option></select><input name="note" placeholder="Note" style={{ maxWidth: 160 }} /></ActionForm>}</td></tr>)}
      </tbody></table></div>}
      {can(role, "review") && <details style={{ marginTop: 12 }}><summary>Request missing information (emails the lead applicant)</summary>
        <ActionForm action={missingInfoAction} submit="Send email"><input type="hidden" name="application_id" value={id} /><textarea name="message" rows={4} placeholder="What do you need from them, and by when?" /></ActionForm></details>}

      <h2>Payments</h2>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>Obligation</th><th>Delegate</th><th>Amount</th><th>Due</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {d.obligations.map((o) => <tr key={o.id}><td>{o.label}</td><td>{pname(o.participant_id)}</td><td>{formatMoney(o.amount, o.currency)}</td><td>{fmtDate(o.due_at)}</td><td>{o.status}</td>
          <td>{o.status === "open" && can(role, "finance") && <>
            <details><summary className="small">Record manual payment</summary><ActionForm action={manualPaymentAction} submit="Record payment"><input type="hidden" name="obligation_id" value={o.id} /><input type="hidden" name="currency" value={o.currency} />
              <label className="field"><span className="label">Amount ({o.currency})</span><input name="amount" type="number" step="any" defaultValue={o.amount} /></label>
              <label className="field"><span className="label">Bank reference / proof</span><input name="reference" required /></label></ActionForm></details>
            <details><summary className="small">Waive</summary><ActionForm action={waiveObligationAction} submit="Waive" danger><input type="hidden" name="obligation_id" value={o.id} /><input name="reason" placeholder="Reason (audited)" /></ActionForm></details></>}</td></tr>)}
      </tbody></table></div>
      {can(role, "finance") && d.participants.length > 0 && <details style={{ marginTop: 12 }}><summary>Add an obligation (e.g. Partial Funded payment)</summary>
        <ActionForm action={addObligationAction} submit="Add obligation">
          <div className="fields-2">
            <label className="field"><span className="label">Delegate</span><select name="participant_id">{d.participants.map((p) => <option key={p.id} value={p.id}>{p.legal_name} ({p.currency})</option>)}</select></label>
            <label className="field"><span className="label">Kind</span><select name="kind"><option value="full">Participant payment (full)</option><option value="balance">Balance</option><option value="other">Other</option></select></label>
            <label className="field"><span className="label">Label</span><input name="label" placeholder="Partial Funded participant payment" /></label>
            <label className="field"><span className="label">Amount</span><input name="amount" type="number" step="any" /></label>
            <label className="field"><span className="label">Currency</span><select name="currency"><option>IDR</option><option>USD</option></select></label>
            <label className="field"><span className="label">Due (optional)</span><input name="due_at" type="date" /></label>
          </div></ActionForm></details>}

      <h3 style={{ marginTop: 24 }}>Transactions</h3>
      {d.payments.length === 0 ? <p className="muted">None.</p> : <div className="table-wrap"><table className="t compact"><thead><tr><th>Date</th><th>Order</th><th>Amount</th><th>Gateway</th><th>Status</th><th>Receipt</th><th></th></tr></thead><tbody>
        {d.payments.map((p) => <tr key={p.id}><td>{fmtDateTime(p.paid_at ?? p.created_at)}</td><td className="tiny">{p.order_id}</td><td>{formatMoney(p.amount, p.currency)}</td><td>{p.gateway}{p.payment_type ? ` · ${p.payment_type}` : ""}{p.manual_reference ? ` · ${p.manual_reference}` : ""}</td>
          <td>{p.status}{p.is_duplicate && <span className="badge warn"> duplicate</span>}</td><td>{p.receipt_no ? <Link href={`/portal/receipts/${p.id}`}>{p.receipt_no}</Link> : "—"}</td>
          <td>{can(role, "finance") && ["paid", "partially_refunded"].includes(p.status) && <details><summary className="small">Refund</summary>
            <ActionForm action={refundAction} submit={p.gateway === "midtrans" ? "Refund via Midtrans" : "Record manual refund"} danger><input type="hidden" name="payment_id" value={p.id} />
              {refunds.find((r) => r.payment_id === p.id && r.status === "requested") && <input type="hidden" name="refund_id" value={refunds.find((r) => r.payment_id === p.id && r.status === "requested")!.id} />}
              <label className="field"><span className="label">Amount ({p.currency})</span><input name="amount" type="number" step="any" defaultValue={p.amount} /></label>
              <label className="field"><span className="label">Reason</span><input name="reason" /></label>
              <label className="check"><input type="checkbox" name="confirm" /> <span>I checked the Refund Policy; this cannot be undone.</span></label></ActionForm></details>}</td></tr>)}
      </tbody></table></div>}
      {refunds.length > 0 && <><h3 style={{ marginTop: 24 }}>Refunds</h3><div className="table-wrap"><table className="t compact"><tbody>{refunds.map((r) => <tr key={r.id}><td>{fmtDateTime(r.created_at)}</td><td>{formatMoney(r.amount, r.currency as "IDR")}</td><td>{r.method}</td><td>{r.status}</td><td>{r.reason}</td></tr>)}</tbody></table></div></>}

      {d.fulfilments.length > 0 && <>
        <h2>Elco Pro fulfilment</h2>
        <p className="small muted">Elco has no partner API for subscriptions yet: activate in Elco&rsquo;s admin, then record the reference here. Applicants are told it is active only after you do.</p>
        <div className="table-wrap"><table className="t compact"><tbody>{d.fulfilments.map((f) => <tr key={f.id}><td>{pname(f.participant_id)}</td><td>{f.elco_email}</td><td>{f.months} months</td><td>{f.status}{f.activated_at ? ` · ${fmtDate(f.activated_at)}` : ""}</td>
          <td>{can(role, "finance") && ["pending_activation", "failed"].includes(f.status) && <ActionForm action={elcoActivateAction} inline submit="Save" className=""><input type="hidden" name="fulfilment_id" value={f.id} />
            <select name="status"><option value="activated">Activated</option><option value="failed">Failed</option></select><input name="reference" placeholder="Elco reference" /></ActionForm>}</td></tr>)}</tbody></table></div>
      </>}

      {d.cashbacks.length > 0 && <>
        <h2>Mentoring cashback</h2>
        <div className="table-wrap"><table className="t compact"><tbody>{d.cashbacks.map((c) => <tr key={c.participant_id}><td>{pname(c.participant_id)}</td><td>{c.outcome}</td><td>{formatMoney(c.amount, c.currency as "IDR")}</td><td>{c.status}</td>
          <td>{can(role, "finance") && <ActionForm action={cashbackAction} inline submit="Update" className=""><input type="hidden" name="participant_id" value={c.participant_id} /><select name="status"><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select><input name="reference" placeholder="Transfer ref." /></ActionForm>}</td></tr>)}</tbody></table></div>
      </>}

      {(app.pathway !== "self_funded") && <>
        <h2>Evaluation</h2>
        <p className="small">Assigned: {assigned.map((x) => x.evaluator_email).join(", ") || "nobody yet"}</p>
        {can(role, "select") && <ActionForm action={assignEvaluatorAction} inline submit="Assign" className=""><input type="hidden" name="application_id" value={id} />
          <select name="evaluator" defaultValue=""><option value="" disabled>Evaluator…</option>{evaluators.map((e) => <option key={e.email} value={e.email}>{e.name ?? e.email}</option>)}</select></ActionForm>}
        {evals.length > 0 && <div className="table-wrap" style={{ marginTop: 12 }}><table className="t compact"><thead><tr><th>Evaluator</th>{CRITERIA.map((c) => <th key={c.key} title={c.label}>{c.label.split(" ")[0]}</th>)}<th>Total</th><th>Feedback</th></tr></thead><tbody>
          {evals.map((e) => <tr key={e.evaluator_email}><td>{e.evaluator_email}</td>{CRITERIA.map((c) => <td key={c.key}>{e.scores[c.key]}</td>)}<td><strong>{e.total}</strong></td><td className="small">{e.feedback}</td></tr>)}</tbody></table></div>}
        {can(role, "evaluate") && <p style={{ marginTop: 8 }}><Link href={`/admin/evaluate/${id}`}>Score this application</Link></p>}
      </>}

      {can(role, "status") && <>
        <h2>Change status</h2>
        <ActionForm action={changeStatusAction} submit="Change status">
          <input type="hidden" name="application_id" value={id} />
          <div className="fields-2"><label className="field"><span className="label">New status</span><select name="status" defaultValue={app.status}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
            <label className="field"><span className="label">Note (required, audited)</span><input name="note" /></label></div>
        </ActionForm>
      </>}

      <h2>Notes</h2>
      {can(role, "review") && <ActionForm action={addNoteAction} submit="Add note"><input type="hidden" name="application_id" value={id} /><textarea name="body" rows={3} /></ActionForm>}
      {notes.map((n, i) => <div key={i} className="item" style={{ marginTop: 12 }}><span className="kicker">{n.author} · {fmtDateTime(n.at)}</span><p style={{ whiteSpace: "pre-wrap" }}>{n.body}</p></div>)}

      <h2>History</h2>
      <div className="table-wrap"><table className="t compact"><tbody>{d.history.map((h, i) => <tr key={i}><td>{fmtDateTime(h.at)}</td><td>{h.from_status ? `${STATUS_LABEL[h.from_status as keyof typeof STATUS_LABEL] ?? h.from_status} → ` : ""}{STATUS_LABEL[h.to_status as keyof typeof STATUS_LABEL] ?? h.to_status}</td><td>{h.actor}</td><td className="small">{h.note}</td></tr>)}</tbody></table></div>
      <h2>Consent records</h2>
      <div className="table-wrap"><table className="t compact"><tbody>{consents.map((c, i) => <tr key={i}><td>{fmtDateTime(c.at)}</td><td>{c.email}</td><td>{c.category}</td><td>{c.accepted ? "accepted" : "declined"}</td><td className="tiny">{c.document_version}</td></tr>)}</tbody></table></div>
    </>
  );
}
