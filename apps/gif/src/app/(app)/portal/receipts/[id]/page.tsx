import Image from "next/image";
import { notFound } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { one } from "@/lib/db";
import { formatMoney } from "@/lib/pricing";
import { fmtDateTime } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

export default async function Receipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const a = await requireAccount();
  const r = await one<{ receipt_no: string; order_id: string; amount: number; currency: "IDR" | "USD"; original_amount: number | null; original_currency: string | null; fx_rate: number | null; paid_at: string; gateway: string; payment_type: string | null;
    status: string; label: string; legal_name: string; email: string; code: string; owner: string; pacct: string | null; manual_reference: string | null }>(
    `select p.receipt_no, p.order_id, p.amount, p.currency, (to_jsonb(p)->>'original_amount')::numeric as original_amount, to_jsonb(p)->>'original_currency' as original_currency, (to_jsonb(p)->>'fx_rate')::numeric as fx_rate, p.paid_at, p.gateway, p.payment_type, p.status, o.label, pt.legal_name, pt.email, a.code,
       a.owner_account_id as owner, pt.account_id as pacct, p.manual_reference
     from gif.payments p join gif.obligations o on o.id = p.obligation_id join gif.participants pt on pt.id = p.participant_id join gif.applications a on a.id = p.application_id
     where p.id = $1 and p.receipt_no is not null`, [id]);
  const staff = !!a.staffRole;
  if (!r || (!staff && r.owner !== a.id && r.pacct !== a.id)) notFound();
  return (
    <div style={{ maxWidth: 720 }}>
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div><Image src="/brand/iels-navy.png" alt="IELSco" width={120} height={31} /><p className="small muted" style={{ marginTop: 10 }}>PT English Space Berkah Indonesia<br />Villa Regency 2 Blok AB 4 No. 8, Pasar Kemis, Tangerang 15560, Indonesia<br />NIB 0905260045155 · hello@ielsco.com</p></div>
          <div style={{ textAlign: "right" }}><h1 style={{ fontSize: 34 }}>Receipt</h1><p className="small">{r.receipt_no}</p></div>
        </div>
        <dl className="kv" style={{ marginTop: 24 }}>
          <dt>Received from</dt><dd>{r.legal_name} ({r.email})</dd>
          <dt>Application</dt><dd>{r.code} · GIF Summer 2027</dd>
          <dt>Item</dt><dd>{r.label}</dd>
          <dt>Amount</dt><dd><strong>{formatMoney(r.amount, r.currency)}</strong></dd>
          {r.original_amount && r.original_currency === "USD" && r.fx_rate && <><dt>Programme price</dt><dd>{formatMoney(Number(r.original_amount), "USD")} · paid by card at the fixed rate USD 1 = {formatMoney(Number(r.fx_rate), "IDR")}</dd></>}
          <dt>Paid</dt><dd>{fmtDateTime(r.paid_at)}</dd>
          <dt>Method</dt><dd>{r.gateway === "manual" ? `Bank transfer verified by IELSco finance${r.manual_reference ? ` (ref. ${r.manual_reference})` : ""}` : `Midtrans${r.payment_type ? ` · ${r.payment_type.replace(/_/g, " ")}` : ""}`}</dd>
          <dt>Payment reference</dt><dd>{r.order_id}</dd>
          {r.status !== "paid" && <><dt>Status</dt><dd>{r.status.replace(/_/g, " ")}</dd></>}
        </dl>
        <p className="tiny muted" style={{ marginTop: 20 }}>This receipt confirms a verified payment. Refunds, if any, are governed by the GIF Refund &amp; Cancellation Policy.</p>
      </div>
      <div className="btn-row no-print" style={{ marginTop: 16 }}><PrintButton /></div>
    </div>
  );
}
