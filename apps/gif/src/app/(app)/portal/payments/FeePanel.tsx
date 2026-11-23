"use client";
import { useMemo, useState } from "react";
import { InvoiceButton, PayFlow } from "./buttons";

// Flexible deposit and installments (founder decision 22 Nov 2026). The payer chooses how much to pay now (IDR): at least
// the minimum (IDR 2,500,000; USD-priced fees: its USD equivalent at the fixed rate), at most the remaining balance, or
// the whole balance. The server repeats every check and converts once; this panel only previews the numbers.
export type FeePanelProps = {
  obligationId: string; label: string; delegate?: string | null; currency: "IDR" | "USD";
  total: number; paid: number; remaining: number; minIdr: number; maxIdr: number; minNative: number; rate: number | null;
  firstPayment: boolean; earlyBird: { price: string } | null; dueLabel: string | null; firstDueLabel: string | null;
  card: boolean; invoice: boolean; openAttempt: { orderId: string; status: string; cancelResult: string | null; amountIdr: number } | null;
  invoiceStatus: string | null;
};

const idr = (n: number) => `IDR ${Math.round(n).toLocaleString("en-US")}`;
const usd = (n: number) => `USD ${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const money = (n: number, c: "IDR" | "USD") => (c === "IDR" ? idr(n) : usd(n));

export function FeePanel(p: FeePanelProps) {
  const [raw, setRaw] = useState(String(p.minIdr));
  const amountIdr = Number(raw.replace(/[^\d]/g, "")) || 0;
  const v = useMemo(() => {
    if (!amountIdr) return { ok: false, msg: "Enter an amount." };
    if (amountIdr < p.minIdr) return { ok: false, msg: `The minimum is ${idr(p.minIdr)}${p.currency === "USD" ? ` (${usd(p.minNative)})` : ""}.` };
    if (amountIdr > p.maxIdr) return { ok: false, msg: `That is more than your remaining balance of ${idr(p.maxIdr)}.` };
    const full = amountIdr === p.maxIdr;
    const counts = p.currency === "IDR" ? amountIdr : full ? p.remaining : Math.min(Math.round((amountIdr / p.rate!) * 100) / 100, p.remaining);
    return { ok: true, msg: "", counts, after: Math.max(0, Math.round((p.remaining - counts) * 100) / 100), full };
  }, [amountIdr, p]);

  const set = (n: number) => setRaw(String(n));
  const heading = p.firstPayment ? "Choose your deposit amount" : "Pay towards your balance";
  return (
    <section className="fee-panel" data-testid="fee-panel" aria-labelledby={`fee-${p.obligationId}`}>
      <div className="fee-head">
        <div>
          <h3 id={`fee-${p.obligationId}`} style={{ margin: 0 }}>{heading}</h3>
          <p className="small muted" style={{ margin: "4px 0 0" }}>{p.label}{p.delegate ? ` · ${p.delegate}` : ""}</p>
        </div>
        {p.earlyBird && <span className="badge ok" data-testid="early-bird">Early-bird price · {p.earlyBird.price}</span>}
      </div>
      <p className="small" style={{ margin: "10px 0 14px" }}>
        {p.firstPayment
          ? <>Secure your GIF 2027 registration with a deposit of at least <strong>{idr(p.minIdr)}</strong>{p.currency === "USD" && p.rate ? <> ({usd(p.minNative)} at USD 1 = {idr(p.rate)})</> : null}. You can choose to pay more upfront depending on your preference.</>
          : <>Pay any amount from <strong>{idr(p.minIdr)}</strong> up to your remaining balance, in as many payments as you like{p.dueLabel ? ` before ${p.dueLabel}` : ""}.</>}
        {p.firstPayment && p.firstDueLabel ? <span className="muted"> Your first payment is due by {p.firstDueLabel}.</span> : null}
      </p>

      <dl className="fee-figures">
        <div><dt>Programme fee</dt><dd>{money(p.total, p.currency)}</dd></div>
        <div><dt>Verified payments</dt><dd>{money(p.paid, p.currency)}</dd></div>
        <div><dt>Remaining balance</dt><dd className="fee-strong">{money(p.remaining, p.currency)}{p.currency === "USD" ? <span className="tiny muted" style={{ display: "block" }}>{idr(p.maxIdr)} by card</span> : null}</dd></div>
      </dl>

      {p.openAttempt ? (
        <div className="fee-pay">
          <p className="small" style={{ margin: "0 0 8px" }}>A payment of <strong>{idr(p.openAttempt.amountIdr)}</strong> is in progress. Continue it, or cancel it to choose a different amount.</p>
          <PayFlow obligationId={p.obligationId} idrOption={p.currency === "USD"} label="Pay" amountIdr={p.openAttempt.amountIdr}
            openOrderId={p.openAttempt.orderId} openStatus={p.openAttempt.status} cancelResult={p.openAttempt.cancelResult} />
        </div>
      ) : (
        <div className="fee-pay">
          <label className="field" htmlFor={`amt-${p.obligationId}`} style={{ marginBottom: 6 }}>
            <span className="label">Amount to pay now (IDR)</span>
            <input id={`amt-${p.obligationId}`} inputMode="numeric" autoComplete="off" value={Number(raw.replace(/[^\d]/g, "") || 0).toLocaleString("en-US")}
              onChange={(e) => setRaw(e.target.value)} aria-invalid={!v.ok} aria-describedby={`amt-help-${p.obligationId}`} data-testid="fee-amount" />
          </label>
          <div className="btn-row" style={{ margin: "0 0 8px" }}>
            {p.minIdr < p.maxIdr && <button type="button" className="chip-btn" onClick={() => set(p.minIdr)}>Minimum · {idr(p.minIdr)}</button>}
            <button type="button" className="chip-btn" onClick={() => set(p.maxIdr)} data-testid="fee-full">Full balance · {idr(p.maxIdr)}</button>
          </div>
          <p id={`amt-help-${p.obligationId}`} className={`small ${v.ok ? "" : "error"}`} style={{ margin: "0 0 12px" }} aria-live="polite">
            {v.ok
              ? <>{p.currency === "USD" ? <>Counts as <strong>{usd(v.counts!)}</strong> at USD 1 = {idr(p.rate!)}. </> : null}Balance after this payment: <strong data-testid="fee-after">{money(v.after!, p.currency)}</strong>{v.full ? " (fully paid)" : ""}</>
              : v.msg}
          </p>
          <div className="pay-options">
            {p.card && (
              <div className="pay-option pay-option-card">
                <div className="pay-option-head"><strong>{p.currency === "USD" ? "Pay by card" : "Pay online"}</strong><span className="card-brands">{p.currency === "USD" ? "Mastercard · Visa" : "Midtrans"}</span></div>
                <PayFlow obligationId={p.obligationId} idrOption={p.currency === "USD"} amountIdr={v.ok ? amountIdr : undefined} disabled={!v.ok}
                  label={v.ok ? `Pay ${idr(amountIdr)}${p.currency === "USD" ? " by card" : ""}` : "Pay"} />
              </div>
            )}
            {p.invoice && (
              <div className="pay-option">
                <div className="pay-option-head"><strong>Request an invoice</strong><span className="tiny muted">Bank transfer</span></div>
                {p.invoiceStatus ? <p className="small" role="status" style={{ margin: "6px 0 0" }}>{p.invoiceStatus}</p>
                  : <InvoiceButton obligationId={p.obligationId} amountIdr={v.ok ? amountIdr : undefined} disabled={!v.ok} />}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
