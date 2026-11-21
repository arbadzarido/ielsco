import "server-only";
import { one, q, tx } from "../db";
import { audit } from "../audit";
import { currentCohort } from "../cohort";
import { sendEmail, deliverQueued } from "../email/send";
import { invoiceRequestedEmail, invoiceRequestFinanceEmail, invoiceSentEmail } from "../email/templates";
import { formatMoney } from "../pricing";
import { PaymentError } from "./service";

// Invoice requests (founder decision 21 Nov 2026): a payer — usually international, paying in USD — asks for an invoice
// and pays by bank transfer to the account Finance designates. Recorded in gif.invoice_requests (one open request per
// item), Finance is emailed, the payer gets an acknowledgement. Finance marks the invoice as sent in Admin → Payments and
// records the transfer there once verified (recordManualPayment), which also closes the request.

export type InvoiceRequestRow = { id: string; obligation_id: string; status: string; amount: number; currency: "IDR" | "USD"; invoice_no: string | null; created_at: string; sent_at: string | null };

export async function requestInvoice(accountId: string, accountEmail: string, applicationId: string, obligationId: string, ip: string | null):
  Promise<{ created: boolean; request: InvoiceRequestRow }> {
  const s = (await currentCohort()).settings;
  const ob = await one<{ id: string; label: string; amount: number; currency: "IDR" | "USD"; legal_name: string; email: string; code: string; participant_id: string; owner_account_id: string; participant_account_id: string | null }>(
    `select o.id, o.label, o.amount, o.currency, p.legal_name, p.email, a.code, o.participant_id, a.owner_account_id, p.account_id as participant_account_id
     from gif.obligations o join gif.participants p on p.id = o.participant_id join gif.applications a on a.id = o.application_id
     where o.id = $1 and o.application_id = $2 and o.status = 'open'`, [obligationId, applicationId]);
  if (!ob || (ob.owner_account_id !== accountId && ob.participant_account_id !== accountId)) throw new PaymentError("Payment item not found.", "not_found");
  if (!(Number(ob.amount) > 0)) throw new PaymentError("This item has no amount to invoice.", "amount");

  const out = await tx(async (db) => {
    // Before migration 20261128 is applied there is no table: keep the earlier behaviour (email Finance and the payer,
    // nothing recorded) instead of failing.
    if (!(await db.query<{ ok: boolean }>("select to_regclass('gif.invoice_requests') is not null as ok")).rows[0]?.ok) {
      const amount = formatMoney(Number(ob.amount), ob.currency);
      const day = new Date().toISOString().slice(0, 10);
      const finance = process.env.GIF_FINANCE_EMAIL || s.contact.email;
      await sendEmail({ to: finance, template: "invoice_request", applicationId, dedupeKey: `invoice:${ob.id}:${day}`,
        ...invoiceRequestFinanceEmail({ name: ob.legal_name, email: ob.email, code: ob.code, item: ob.label, amount, reference: ob.code }) }, db);
      await sendEmail({ to: ob.email, template: "invoice_requested", applicationId, dedupeKey: `invoice:${ob.id}:${day}:payer`,
        ...invoiceRequestedEmail({ name: ob.legal_name, code: ob.code, item: ob.label, amount, bankDetails: s.payments.invoice_bank_details }) }, db);
      await audit(accountEmail, "invoice_requested", "obligation", ob.id, { unrecorded: true }, ip, db);
      return { created: true, request: { id: "", obligation_id: ob.id, status: "invoice_requested", amount: Number(ob.amount), currency: ob.currency, invoice_no: null, created_at: new Date().toISOString(), sent_at: null } };
    }
    // The amount and currency are the obligation's own (USD stays USD); nothing comes from the browser.
    const ins = (await db.query<InvoiceRequestRow>(
      `insert into gif.invoice_requests (obligation_id, application_id, participant_id, requested_by, amount, currency)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (obligation_id) where status in ('invoice_requested', 'invoice_sent') do nothing
       returning id, obligation_id, status, amount::float8 as amount, currency, invoice_no, created_at, sent_at`,
      [ob.id, applicationId, ob.participant_id, accountId, ob.amount, ob.currency])).rows[0];
    if (!ins) {
      const existing = (await db.query<InvoiceRequestRow>(
        `select id, obligation_id, status, amount::float8 as amount, currency, invoice_no, created_at, sent_at from gif.invoice_requests
         where obligation_id = $1 and status in ('invoice_requested', 'invoice_sent')`, [ob.id])).rows[0];
      return { created: false, request: existing };
    }
    const amount = formatMoney(Number(ob.amount), ob.currency);
    const ref = ins.id.slice(0, 8).toUpperCase();
    const finance = process.env.GIF_FINANCE_EMAIL || s.contact.email;
    await sendEmail({ to: finance, template: "invoice_request", applicationId, dedupeKey: `invoice-req:${ins.id}:finance`,
      ...invoiceRequestFinanceEmail({ name: ob.legal_name, email: ob.email, code: ob.code, item: ob.label, amount, reference: ref }) }, db);
    await sendEmail({ to: ob.email, template: "invoice_requested", applicationId, dedupeKey: `invoice-req:${ins.id}:payer`,
      ...invoiceRequestedEmail({ name: ob.legal_name, code: ob.code, item: ob.label, amount, reference: ref, bankDetails: s.payments.invoice_bank_details }) }, db);
    await audit(accountEmail, "invoice_requested", "obligation", ob.id, { request: ins.id, amount: Number(ob.amount), currency: ob.currency }, ip, db);
    return { created: true, request: ins };
  });
  await deliverQueued().catch(() => {});
  return out;
}

// Finance: the invoice has been sent to the payer (by email, from Finance's own tools). Optionally notifies the payer.
export async function markInvoiceSent(staffEmail: string, requestId: string, invoiceNo: string, ip: string | null) {
  const s = (await currentCohort()).settings;
  const r = await tx(async (db) => {
    const row = (await db.query<{ id: string; status: string; application_id: string; amount: number; currency: "IDR" | "USD"; label: string; legal_name: string; email: string; code: string }>(
      `select r.id, r.status, r.application_id, r.amount::float8 as amount, r.currency, o.label, p.legal_name, p.email, a.code
       from gif.invoice_requests r join gif.obligations o on o.id = r.obligation_id join gif.participants p on p.id = r.participant_id
       join gif.applications a on a.id = r.application_id where r.id = $1 for update of r`, [requestId])).rows[0];
    if (!row) throw new PaymentError("Invoice request not found.", "not_found");
    if (row.status !== "invoice_requested" && row.status !== "invoice_sent") throw new PaymentError("This request is already closed.", "closed");
    await db.query("update gif.invoice_requests set status = 'invoice_sent', invoice_no = $2, sent_at = now(), handled_by = $3, updated_at = now() where id = $1", [requestId, invoiceNo, staffEmail]);
    await sendEmail({ to: row.email, template: "invoice_sent", applicationId: row.application_id, dedupeKey: `invoice-sent:${requestId}:${invoiceNo}`,
      ...invoiceSentEmail({ name: row.legal_name, code: row.code, item: row.label, amount: formatMoney(row.amount, row.currency), invoiceNo, bankDetails: s.payments.invoice_bank_details }) }, db);
    await audit(staffEmail, "invoice_sent", "invoice_request", requestId, { invoiceNo }, ip, db);
    return row;
  });
  await deliverQueued().catch(() => {});
  return r;
}

export async function cancelInvoiceRequest(staffEmail: string, requestId: string, ip: string | null) {
  const n = await q("update gif.invoice_requests set status = 'cancelled', handled_by = $2, updated_at = now() where id = $1 and status in ('invoice_requested', 'invoice_sent') returning id", [requestId, staffEmail]);
  if (!n.length) throw new PaymentError("This request is already closed.", "closed");
  await audit(staffEmail, "invoice_request_cancelled", "invoice_request", requestId, {}, ip);
}
