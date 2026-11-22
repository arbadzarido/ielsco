// Invoice and receipt documents for Private Tutoring, including deposit + instalment plans.
// One invoice per package; one receipt per VERIFIED payment, always referencing the invoice number.
import { ledgerSummary, type Ledger, type PaymentRecord, type PaymentStatus } from "./payments.ts";

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  awaiting_payment: "Awaiting initial payment", active_balance_due: "Active, balance due", overdue: "Overdue", paid_in_full: "Paid in full", cancelled: "Cancelled",
};

export interface Party { name: string; contact?: string }
export interface PackageInfo { name: string; sessions: number; includes: string[] }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const money = (n: number) => `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;

/** Invoice rows: total, deposit/instalments with milestones and due dates, paid-to-date and outstanding. */
export function invoiceModel(l: Ledger, customer: Party, pkg: PackageInfo, issuedOn: string) {
  const s = ledgerSummary(l, issuedOn);
  const rows = l.schedule.map((m) => {
    const paid = l.payments.filter((p) => p.verifiedAt && p.milestone === m.kind).reduce((a, p) => a + p.amountIdr, 0);
    return { label: `${m.label} (${m.pct}%)`, milestone: m.trigger, due: m.dueDate ?? "As per milestone", amountIdr: m.amountIdr, status: paid >= m.amountIdr ? "Paid" : "Due" };
  });
  return { invoiceNo: l.invoiceNo, issuedOn, customer, pkg, totalIdr: l.totalIdr, rows, paidIdr: s.totalPaidIdr, outstandingIdr: s.remainingIdr, status: STATUS_LABEL[s.status], plan: l.option === "full" ? "Full payment" : "Deposit + instalments" };
}

export function invoiceHtml(l: Ledger, customer: Party, pkg: PackageInfo, issuedOn: string, bankDetails: string) {
  const m = invoiceModel(l, customer, pkg, issuedOn);
  const rows = m.rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(r.milestone)}</td><td>${esc(r.due)}</td><td class="r">${money(r.amountIdr)}</td><td>${r.status}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Invoice ${esc(m.invoiceNo)}</title><style>${CSS}</style><body>
<h1>Invoice</h1><p class="mut">IELSco Private Tutoring · No. ${esc(m.invoiceNo)} · Issued ${esc(m.issuedOn)}</p>
<p><b>${esc(customer.name)}</b>${customer.contact ? ` · ${esc(customer.contact)}` : ""}</p>
<p>${esc(pkg.name)} package: ${pkg.sessions} private sessions with Arbadza Rido, ${esc(pkg.includes.join(", "))}.</p>
<p>Payment arrangement: <b>${m.plan}</b>. Total package price: <b>${money(m.totalIdr)}</b>.</p>
<table><tr><th>Payment</th><th>Milestone</th><th>Due</th><th class="r">Amount</th><th>Status</th></tr>${rows}</table>
<p>Paid to date: <b>${money(m.paidIdr)}</b> · Outstanding balance: <b>${money(m.outstandingIdr)}</b> · Payment status: <b>${esc(m.status)}</b></p>
<p class="mut">Pay by bank transfer to: ${esc(bankDetails)}. Send proof of transfer on WhatsApp with the invoice number. Each payment is confirmed with a separate receipt after verification.</p>
<p class="mut">A deposit secures your package and schedule; it is part of the total price, not a discount. Sessions and Elco AI access start once your first payment is verified. Later sessions are scheduled after each instalment is verified.</p></body></html>`;
}

export function receiptModel(l: Ledger, payment: PaymentRecord, receiptNo: string) {
  if (!payment.verifiedAt) throw new Error("A receipt is only issued for a verified payment.");
  const upTo = { ...l, payments: l.payments.filter((p) => p.verifiedAt && p.verifiedAt <= payment.verifiedAt!) };
  const s = ledgerSummary(upTo, payment.verifiedAt.slice(0, 10));
  return { receiptNo, invoiceNo: l.invoiceNo, paidOn: payment.verifiedAt.slice(0, 10), milestone: l.schedule.find((m) => m.kind === payment.milestone)?.label ?? payment.milestone,
    amountIdr: payment.amountIdr, method: payment.method ?? "Bank transfer", reference: payment.reference ?? "", totalPaidIdr: s.totalPaidIdr, remainingIdr: s.remainingIdr, status: STATUS_LABEL[s.status], next: s.nextPayment };
}

export function receiptHtml(l: Ledger, payment: PaymentRecord, receiptNo: string, customer: Party) {
  const r = receiptModel(l, payment, receiptNo);
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Receipt ${esc(r.receiptNo)}</title><style>${CSS}</style><body>
<h1>Payment receipt</h1><p class="mut">IELSco Private Tutoring · Receipt ${esc(r.receiptNo)} · For invoice ${esc(r.invoiceNo)}</p>
<p>Received from <b>${esc(customer.name)}</b> on ${esc(r.paidOn)} via ${esc(r.method)}${r.reference ? ` (ref. ${esc(r.reference)})` : ""}.</p>
<table><tr><th>Milestone</th><th class="r">Amount received</th></tr><tr><td>${esc(r.milestone)}</td><td class="r">${money(r.amountIdr)}</td></tr></table>
<p>Total paid to date: <b>${money(r.totalPaidIdr)}</b> · Remaining balance: <b>${money(r.remainingIdr)}</b> · Status: <b>${esc(r.status)}</b></p>
${r.next ? `<p>Next payment: <b>${esc(r.next.label)}, ${money(r.next.amountIdr)}</b>, ${esc(r.next.trigger.toLowerCase())}${r.next.dueDate ? ` (by ${esc(r.next.dueDate)})` : ""}.</p>` : "<p>This invoice is paid in full. Thank you.</p>"}</body></html>`;
}

const CSS = "body{font:15px/1.5 system-ui,sans-serif;color:#1A2534;max-width:720px;margin:32px auto;padding:0 16px}h1{margin:0}.mut{color:#577E90;font-size:13px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border-bottom:1px solid #E6E9EE;padding:8px;text-align:left;font-size:14px}.r{text-align:right}";
