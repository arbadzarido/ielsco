import Link from "next/link";
import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { paymentsState } from "@/lib/payments/gateway";
import { collectionMethod, formatMoney, idrPriceFor } from "@/lib/pricing";
import { PAYMENT_CONSENTS } from "@/lib/legal";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PayButton, InvoiceButton } from "./buttons";

const STATUS: Record<string, string> = { open: "Due", paid: "Paid", waived: "Waived", refunded: "Refunded", partially_refunded: "Partly refunded", cancelled: "Cancelled",
  created: "Started", pending: "Waiting for confirmation", failed: "Failed", expired: "Expired" };

export default async function Payments() {
  const c = await portalContext("/portal/payments");
  const { app, detail, me } = c;
  if (!app || !detail) redirect("/portal");
  const ready = paymentsState().ready;
  const s = c.cohort.settings;
  const consented = PAYMENT_CONSENTS.every((k) => c.consents[k]);
  const obligations = detail.obligations.filter((o) => c.isOwner || o.participant_id === me?.id);
  const payments = detail.payments.filter((p) => c.isOwner || p.participant_id === me?.id);
  const name = (pid: string) => detail.participants.find((p) => p.id === pid)?.legal_name ?? "";
  return (
    <>
      <h1>Payments</h1>
      <p className="muted">Payments count only once verified. Returning from the payment page is not a confirmation; this page updates when the payment provider confirms.</p>
      {!consented && <div className="notice warn"><p>Before paying, accept the Terms, Payment Terms and Refund Policy on your <Link href="/portal/application#terms">application page</Link>.</p></div>}
      {!ready && <div className="notice"><p>Online payment is not switched on yet. You can request an invoice, or come back later; we will email you when online payment opens.</p></div>}

      <h2>Amounts due</h2>
      {obligations.length === 0 ? <p className="muted">Nothing to pay.</p> : (
        <div className="table-wrap"><table className="t">
          <thead><tr><th>Item</th>{c.isOwner && detail.participants.length > 1 && <th>Delegate</th>}<th>Amount</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {obligations.map((o) => {
              const method = collectionMethod(s, o.currency, ready);
              const depositOpen = o.kind === "balance" && detail.obligations.some((d) => d.participant_id === o.participant_id && d.kind === "deposit" && d.status === "open");
              const pending = payments.some((p) => p.obligation_id === o.id && p.status === "pending");
              const idr = idrPriceFor(s, o.kind);
              return (
                <tr key={o.id}>
                  <td>{o.label}</td>
                  {c.isOwner && detail.participants.length > 1 && <td>{name(o.participant_id)}</td>}
                  <td style={{ whiteSpace: "nowrap" }}>{formatMoney(o.amount, o.currency)}</td>
                  <td>{o.due_at ? fmtDate(o.due_at) : "—"}</td>
                  <td><span className={`badge ${o.status === "paid" ? "ok" : o.status === "open" ? "warn" : ""}`}>{pending ? "Waiting for confirmation" : STATUS[o.status] ?? o.status}</span></td>
                  <td style={{ minWidth: 200 }}>
                    {o.status === "open" && (depositOpen ? <span className="small muted">Pay the deposit first.</span>
                      : !consented ? <span className="small muted">Accept the terms first.</span>
                      : method === "midtrans" ? <PayButton obligationId={o.id} label={pending ? "Continue payment" : "Pay online"} />
                      : method === "midtrans_idr_option" ? <div style={{ display: "grid", gap: 8 }}><InvoiceButton obligationId={o.id} /><PayButton obligationId={o.id} idrOption label={`Pay IDR ${idr?.toLocaleString("en-US")} by card instead`} /></div>
                      : <InvoiceButton obligationId={o.id} />)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
      {obligations.some((o) => o.currency === "USD" && o.status === "open") && <div className="notice" style={{ marginTop: 16 }}><p>{s.payments.bank_transfer_instructions}</p></div>}

      <h2>Payment history</h2>
      {payments.length === 0 ? <p className="muted">No payments yet.</p> : (
        <div className="table-wrap"><table className="t compact">
          <thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt</th></tr></thead>
          <tbody>{payments.map((p) => (
            <tr key={p.id}>
              <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(p.paid_at ?? p.created_at)}</td>
              <td>{detail.obligations.find((o) => o.id === p.obligation_id)?.label ?? p.kind}{p.is_duplicate && <span className="badge warn" style={{ marginLeft: 6 }}>Duplicate · refund queued</span>}</td>
              <td style={{ whiteSpace: "nowrap" }}>{formatMoney(p.amount, p.currency)}</td>
              <td>{p.gateway === "manual" ? "Bank transfer (verified)" : p.payment_type ? p.payment_type.replace(/_/g, " ") : "Midtrans"}</td>
              <td>{STATUS[p.status] ?? p.status}</td>
              <td>{p.receipt_no && ["paid", "refunded", "partially_refunded"].includes(p.status) ? <Link href={`/portal/receipts/${p.id}`}>{p.receipt_no}</Link> : "—"}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <p className="small muted" style={{ marginTop: 20 }}>See the <Link href="/payment-terms">Payment Terms</Link> and <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p>
    </>
  );
}
