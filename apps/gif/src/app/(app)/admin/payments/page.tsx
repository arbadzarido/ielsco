import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { currentCohort } from "@/lib/cohort";
import { q } from "@/lib/db";
import { paymentsState } from "@/lib/payments/gateway";
import { formatMoney } from "@/lib/pricing";
import { fmtDate, fmtDateTime } from "@/lib/format";

export default async function AdminPayments({ searchParams }: { searchParams: Promise<{ status?: string; gateway?: string }> }) {
  await requireStaff("finance");
  const sp = await searchParams;
  const cohort = await currentCohort();
  const status = ["created", "pending", "paid", "failed", "expired", "cancelled", "refunded", "partially_refunded"].includes(sp.status ?? "") ? sp.status! : null;
  const gateway = ["midtrans", "manual"].includes(sp.gateway ?? "") ? sp.gateway! : null;
  const [txs, refundQueue, outstanding, badSig] = await Promise.all([
    q<{ id: string; order_id: string; code: string; app_id: string; legal_name: string; kind: string; amount: number; currency: "IDR" | "USD"; gateway: string; status: string; is_duplicate: boolean; created_at: string; paid_at: string | null; receipt_no: string | null }>(
      `select p.id, p.order_id, a.code, a.id as app_id, pt.legal_name, p.kind, p.amount, p.currency, p.gateway, p.status, p.is_duplicate, p.created_at, p.paid_at, p.receipt_no
       from gif.payments p join gif.applications a on a.id = p.application_id join gif.participants pt on pt.id = p.participant_id
       where a.cohort_id = $1 and ($2::text is null or p.status = $2) and ($3::text is null or p.gateway = $3) order by p.created_at desc limit 300`, [cohort.id, status, gateway]),
    q<{ id: string; app_id: string; code: string; amount: number; currency: string; reason: string; created_at: string }>(
      `select r.id, a.id as app_id, a.code, r.amount, r.currency, r.reason, r.created_at from gif.refunds r join gif.payments p on p.id = r.payment_id join gif.applications a on a.id = p.application_id
       where a.cohort_id = $1 and r.status in ('requested', 'failed') order by r.created_at`, [cohort.id]),
    q<{ app_id: string; code: string; legal_name: string; label: string; amount: number; currency: "IDR" | "USD"; due_at: string | null }>(
      `select a.id as app_id, a.code, p.legal_name, o.label, o.amount, o.currency, o.due_at from gif.obligations o join gif.applications a on a.id = o.application_id
       join gif.participants p on p.id = o.participant_id where a.cohort_id = $1 and o.status = 'open' and a.status not in ('draft', 'withdrawn') and p.withdrawn_at is null
       order by o.due_at nulls last, a.code limit 300`, [cohort.id]),
    q<{ n: number }>("select count(*)::int as n from gif.payment_events where signature_ok = false and received_at > now() - interval '7 days'"),
  ]);
  const pay = paymentsState();
  return (
    <>
      <h1>Payments</h1>
      <p className="muted">Gateway: {pay.ready ? `Midtrans (${pay.env})` : `off — ${pay.reason}`}. Record manual payments and refunds from each applicant&rsquo;s page (audited).</p>
      {(badSig[0]?.n ?? 0) > 0 && <div className="notice warn"><p>{badSig[0].n} notification(s) with an invalid signature were rejected in the last 7 days. If this keeps happening, check GIF_MIDTRANS_SIGNATURE_KEYS.</p></div>}
      <div className="btn-row"><a className="btn btn-secondary btn-sm" href="/api/admin/export?type=payments">Export transactions (CSV)</a><a className="btn btn-secondary btn-sm" href="/api/admin/export?type=obligations">Export obligations (CSV)</a></div>

      <h2>Refunds to review</h2>
      {refundQueue.length === 0 ? <p className="muted">None. Duplicate payments appear here automatically.</p> : <div className="table-wrap"><table className="t compact"><tbody>
        {refundQueue.map((r) => <tr key={r.id}><td>{fmtDateTime(r.created_at)}</td><td><Link href={`/admin/applicants/${r.app_id}`}>{r.code}</Link></td><td>{formatMoney(r.amount, r.currency as "IDR")}</td><td>{r.reason}</td></tr>)}</tbody></table></div>}

      <h2>Outstanding</h2>
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
