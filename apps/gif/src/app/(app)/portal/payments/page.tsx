import Link from "next/link";
import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { paymentsState } from "@/lib/payments/gateway";
import { cardAmountIdr, collectionMethod, formatMoney, internationalCardEnabled } from "@/lib/pricing";
import { PAYMENT_CONSENTS } from "@/lib/legal";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { PayFlow, InvoiceButton } from "./buttons";

// Attempt and obligation states, in plain words. "Awaiting payment" = an open attempt that can be continued or cancelled.
const STATUS: Record<string, string> = { open: "Due", paid: "Paid", waived: "Waived", refunded: "Refunded", partially_refunded: "Partly refunded", cancelled: "Cancelled",
  created: "Awaiting payment", pending: "Awaiting payment", cancelling: "Cancelling", failed: "Failed", expired: "Expired" };

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
              // The latest attempt still open at Midtrans for this item (payments are newest first).
              const attempt = payments.find((p) => p.obligation_id === o.id && p.gateway === "midtrans" && ["created", "pending", "cancelling"].includes(p.status)
                && (p.status === "cancelling" || !p.checkout_expires_at || new Date(p.checkout_expires_at).getTime() > Date.now()));
              const pending = attempt?.status === "pending";
              // International items: the card amount is computed here only for display; the server recomputes it at checkout.
              const cardIdr = o.currency === "USD" ? cardAmountIdr(Number(o.amount), s.payments.usd_idr_card_rate) : null;
              const invoice = detail.invoiceRequests.find((r) => r.obligation_id === o.id && ["invoice_requested", "invoice_sent"].includes(r.status));
              const flow = (idrOption: boolean, label: string) => <PayFlow obligationId={o.id} idrOption={idrOption} label={label}
                openOrderId={attempt?.order_id ?? null} openStatus={attempt?.status ?? null} cancelResult={attempt?.cancel_result ?? null} />;
              return (
                <tr key={o.id}>
                  <td>{o.label}</td>
                  {c.isOwner && detail.participants.length > 1 && <td>{name(o.participant_id)}</td>}
                  <td style={{ whiteSpace: "nowrap" }}>{formatMoney(o.amount, o.currency)}</td>
                  <td>{o.due_at ? fmtDate(o.due_at) : "—"}</td>
                  <td><span className={`badge ${o.status === "paid" ? "ok" : o.status === "open" ? "warn" : ""}`}>{o.status === "open" && attempt ? STATUS[attempt.status] : STATUS[o.status] ?? o.status}</span></td>
                  <td style={{ minWidth: 240 }}>
                    {o.status === "open" && (depositOpen ? <span className="small muted">Pay the deposit first.</span>
                      : !consented ? <span className="small muted">Accept the terms first.</span>
                      : method === "midtrans" ? flow(false, pending ? "Continue payment" : "Pay online")
                      : o.currency === "USD" ? (
                        <div className="pay-options" data-testid="intl-options">
                          {method === "midtrans_idr_option" && cardIdr && (
                            <div className="pay-option pay-option-card" data-testid="intl-card">
                              <div className="pay-option-head"><strong>Pay by card</strong><span className="card-brands" aria-label="Mastercard and Visa">Mastercard · Visa</span></div>
                              <dl className="pay-figures">
                                <div><dt>Programme price</dt><dd>{formatMoney(o.amount, "USD")}</dd></div>
                                <div><dt>Card payment</dt><dd className="pay-figure-main">{formatMoney(cardIdr, "IDR")}</dd></div>
                              </dl>
                              <p className="tiny muted" style={{ margin: "0 0 10px" }}>Fixed rate USD 1 = {formatMoney(s.payments.usd_idr_card_rate, "IDR")}. Midtrans charges in IDR; your bank may add its own fees. Card acceptance depends on Midtrans and your bank.</p>
                              {flow(true, attempt ? "Continue card payment" : `Pay ${formatMoney(cardIdr, "IDR")} by card`)}
                            </div>
                          )}
                          <div className="pay-option" data-testid="intl-invoice">
                            <div className="pay-option-head"><strong>Request an invoice</strong><span className="tiny muted">Bank transfer · {formatMoney(o.amount, "USD")}</span></div>
                            <p className="tiny muted" style={{ margin: "4px 0 10px" }}>IELSco Finance emails you an official invoice with the transfer details. A transfer counts once Finance has verified it.</p>
                            {invoice ? <p className="small" role="status" style={{ margin: 0 }}>{invoice.status === "invoice_sent" ? `Invoice ${invoice.invoice_no ?? ""} sent ${fmtDate(invoice.sent_at)}. Check your email.` : `Invoice requested ${fmtDate(invoice.created_at)}. Finance will email your invoice.`}</p>
                              : <InvoiceButton obligationId={o.id} />}
                          </div>
                        </div>
                      )
                      : invoice ? <span className="small">Invoice requested {fmtDate(invoice.created_at)}.</span>
                      : <InvoiceButton obligationId={o.id} />)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
      {!(ready && internationalCardEnabled(s)) && obligations.some((o) => o.currency === "USD" && o.status === "open") && <div className="notice" style={{ marginTop: 16 }}><p>{s.payments.bank_transfer_instructions}</p></div>}
      {/* Finance-approved bank details: only for someone who has requested an invoice, and only once Finance has entered them. */}
      {s.payments.invoice_bank_details && detail.invoiceRequests.some((r) => ["invoice_requested", "invoice_sent"].includes(r.status) && obligations.some((o) => o.id === r.obligation_id)) && (
        <div className="notice" style={{ marginTop: 12 }} data-testid="bank-details"><p><strong>Bank transfer details</strong></p><p style={{ whiteSpace: "pre-line" }}>{s.payments.invoice_bank_details}</p>
          <p className="small muted">Include your application ID ({app.code}) in the transfer reference. Only pay into this account or the one on your invoice.</p></div>
      )}

      <h2>Payment history</h2>
      {payments.length === 0 ? <p className="muted">No payments yet.</p> : (
        <div className="table-wrap"><table className="t compact">
          <thead><tr><th>Date</th><th>Item</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt</th></tr></thead>
          <tbody>{payments.map((p) => (
            <tr key={p.id}>
              <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(p.paid_at ?? p.created_at)}</td>
              <td>{detail.obligations.find((o) => o.id === p.obligation_id)?.label ?? p.kind}{p.is_duplicate && <span className="badge warn" style={{ marginLeft: 6 }}>Duplicate · refund queued</span>}</td>
              <td style={{ whiteSpace: "nowrap" }}>{formatMoney(p.amount, p.currency)}{p.original_amount && p.original_currency === "USD" && <span className="tiny muted" style={{ display: "block" }}>{formatMoney(Number(p.original_amount), "USD")} at {formatMoney(Number(p.fx_rate), "IDR")}/USD</span>}</td>
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
