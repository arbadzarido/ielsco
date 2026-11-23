import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { currentCohort } from "@/lib/cohort";
import { q } from "@/lib/db";
import { paymentsState } from "@/lib/payments/gateway";
import { formatMoney } from "@/lib/pricing";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { ActionForm } from "@/components/ActionForm";
import { invoiceSentAction, cancelInvoiceRequestAction } from "@/app/actions/admin";

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string; gateway?: string }> }) {
  await requireStaff("finance");
  const sp = await searchParams;
  const cohort = await currentCohort();
  const status = ["created", "pending", "paid", "failed", "expired", "cancelled", "refunded", "partially_refunded"].includes(sp.status ?? "") ? sp.status! : null;
  const gateway = ["midtrans", "manual"].includes(sp.gateway ?? "") ? sp.gateway! : null;
  const [txs, refundQueue, outstanding, badSig, invoices] = await Promise.all([
    q<{ id: string; order_id: string; code: string; app_id: string; legal_name: string; kind: string; amount: number; currency: "IDR" | "USD"; gateway: string; status: string; is_duplicate: boolean; created_at: string; paid_at: string | null; receipt_no: string | null }>(
      `select p.id, p.order_id, a.code, a.id as app_id, pt.legal_name, p.kind, p.amount, p.currency, p.gateway, p.status, p.is_duplicate, p.created_at, p.paid_at, p.receipt_no
       from gif.payments p join gif.applications a on a.id = p.application_id join gif.participants pt on pt.id = p.participant_id
       where a.cohort_id = $1 and ($2::text is null or p.status = $2) and ($3::text is null or p.gateway = $3) order by p.created_at desc limit 300`, [cohort.id, status, gateway]),
    q<{ id: string; app_id: string; code: string; amount: number; currency: string; reason: string; created_at: string }>(
      `select r.id, a.id as app_id, a.code, r.amount, r.currency, r.reason, r.created_at from gif.refunds r join gif.payments p on p.id = r.payment_id join gif.applications a on a.id = p.application_id
       where a.cohort_id = $1 and r.status in ('requested', 'failed') order by r.created_at`, [cohort.id]),
    q<{ app_id: string; code: string; legal_name: string; label: string; amount: number; currency: "IDR" | "USD"; due_at: string | null }>(
      `select a.id as app_id, a.code, p.legal_name, o.label, (o.amount - o.paid_amount)::float8 as amount, o.currency, o.due_at from gif.obligations o join gif.applications a on a.id = o.application_id
       join gif.participants p on p.id = o.participant_id where a.cohort_id = $1 and o.status = 'open' and a.status not in ('draft', 'withdrawn') and p.withdrawn_at is null
       order by o.due_at nulls last, a.code limit 300`, [cohort.id]),
    q<{ n: number }>("select count(*)::int as n from gif.payment_events where signature_ok = false and received_at > now() - interval '7 days'"),
    q<{ id: string; app_id: string; code: string; legal_name: string; email: string; label: string; amount: number; currency: "IDR" | "USD"; status: string; invoice_no: string | null; created_at: string; sent_at: string | null }>(
      `select r.id, a.id as app_id, a.code, p.legal_name, p.email, o.label, r.amount::float8 as amount, r.currency, r.status, r.invoice_no, r.created_at, r.sent_at
       from gif.invoice_requests r join gif.applications a on a.id = r.application_id join gif.participants p on p.id = r.participant_id join gif.obligations o on o.id = r.obligation_id
       where a.cohort_id = $1 and r.status in ('invoice_requested', 'invoice_sent') order by r.created_at`, [cohort.id])
      .catch((e: { code?: string }) => { if (e?.code === "42P01") return []; throw e; }),
  ]);
  const s = cohort.settings;
  const pay = paymentsState();
  return (
    <>
      <h1>Payments</h1>
      <p className="muted">Gateway: {pay.ready ? `Midtrans (${pay.env})` : `off — ${pay.reason}`}. Record manual payments and refunds from each applicant&rsquo;s page (audited).</p>
      {(badSig[0]?.n ?? 0) > 0 && <div className="notice warn"><p>{badSig[0].n} notification(s) with an invalid signature were rejected in the last 7 days. If this keeps happening, check GIF_MIDTRANS_SIGNATURE_KEYS.</p></div>}
      <div className="btn-row"><a className="btn btn-secondary btn-sm" href="/api/admin/export?type=payments">Export transactions (CSV)</a><a className="btn btn-secondary btn-sm" href="/api/admin/export?type=obligations">Export obligations (CSV)</a></div>

      <h2 id="invoices">Invoice requests</h2>
      <p className="small muted">International card payments: {s.payments.international_cards !== false ? `on, at USD 1 = ${formatMoney(s.payments.usd_idr_card_rate, "IDR")}` : "off"}. Bank details shown to payers who requested an invoice: {s.payments.invoice_bank_details ? "set" : "not set (payers are told Finance will send them)"}. Both are in Content → Settings → payments.</p>
      {invoices.length === 0 ? <p className="muted">No open invoice requests.</p> : <div className="table-wrap"><table className="t compact" data-testid="invoice-requests">
        <thead><tr><th>Requested</th><th>Application</th><th>Delegate</th><th>Item</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>
        {invoices.map((r) => <tr key={r.id}><td>{fmtDateTime(r.created_at)}</td><td><Link href={`/admin/applicants/${r.app_id}`}>{r.code}</Link></td><td>{r.legal_name}<span className="tiny muted" style={{ display: "block" }}>{r.email}</span></td><td>{r.label}</td>
          <td style={{ whiteSpace: "nowrap" }}>{formatMoney(r.amount, r.currency)}</td><td>{r.status === "invoice_sent" ? `Sent ${fmtDate(r.sent_at)} · ${r.invoice_no}` : "Requested"}</td>
          <td style={{ minWidth: 220 }}>
            <details><summary className="small">{r.status === "invoice_sent" ? "Resend / update" : "Mark invoice sent"}</summary><ActionForm action={invoiceSentAction} submit="Mark sent and email participant"><input type="hidden" name="request_id" value={r.id} />
              <div className="field"><label htmlFor={`inv-${r.id}`}>Invoice number</label><input id={`inv-${r.id}`} name="invoice_no" required minLength={3} maxLength={60} defaultValue={r.invoice_no ?? ""} /></div></ActionForm></details>
            <details><summary className="small">Close request</summary><ActionForm action={cancelInvoiceRequestAction} submit="Close request" danger><input type="hidden" name="request_id" value={r.id} /></ActionForm></details>
            <span className="tiny muted">Record the transfer on the applicant&rsquo;s page once verified.</span>
          </td></tr>)}
      </tbody></table></div>}

      <h2>Refunds to review</h2>
      {refundQueue.length === 0 ? <p className="muted">None. Duplicate payments appear here automatically.</p> : <div className="table-wrap"><table className="t compact"><tbody>
        {refundQueue.map((r) => <tr key={r.id}><td>{fmtDateTime(r.created_at)}</td><td><Link href={`/admin/applicants/${r.app_id}`}>{r.code}</Link></td><td>{formatMoney(r.amount, r.currency as "IDR")}</td><td>{r.reason}</td></tr>)}</tbody></table></div>}

      <h2>Outstanding</h2>
      <p className="small muted">Amounts still to be paid (installments included). Each delegate&rsquo;s fee, verified payments and installments are on their applicant page.</p>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>Application</th><th>Delegate</th><th>Item</th><th>Amount</th><th>Due</th></tr></thead><tbody>
        {outstanding.map((o, i) => <tr key={i}><td><Link href={`/admin/applicants/${o.app_id}`}>{o.code}</Link></td><td>{o.legal_name}</td><td>{o.label}</td><td>{formatMoney(o.amount, o.currency)}</td><td>{fmtDate(o.due_at)}</td></tr>)}
      </tbody></table></div>

      <h2>Transactions</h2>
      <div className="pill-tabs">
        <Link href="/admin/payments" aria-current={!status && !gateway ? "page" : undefined}>All</Link>
        {["pending", "paid", "failed", "expired", "refunded"].map((s) => <Link key={s} href={`/admin/payments?status=${s}`} aria-current={status === s ? "page" : undefined}>{s}</Link>)}
        <Link href="/admin/payments?gateway=manual" aria-current={gateway === "manual" ? "page" : undefined}>manual</Link>
      </div>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>Created</th><th>Order</th><th>Application</th><th>Delegate</th><th>Item</th><th>Amount</th><th>Gateway</th><th>Status</th></tr></thead><tbody>
        {txs.map((t) => <tr key={t.id}><td>{fmtDateTime(t.created_at)}</td><td className="tiny">{t.order_id}</td><td><Link href={`/admin/applicants/${t.app_id}`}>{t.code}</Link></td><td>{t.legal_name}</td><td>{t.kind}</td>
          <td>{formatMoney(t.amount, t.currency)}</td><td>{t.gateway}</td><td>{t.status}{t.is_duplicate && <span className="badge warn"> duplicate</span>}</td></tr>)}
      </tbody></table></div>
    </>
  );
}
