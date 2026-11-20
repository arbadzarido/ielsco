"use client";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { payAction, resumePaymentAction, cancelPaymentAction, checkPaymentAction, requestInvoiceAction, type ActionResult, type CheckoutResult } from "@/app/actions/portal";

// Snap JS popup with a safe fallback to the Snap redirect page. The popup's own callbacks are never trusted as payment
// results: success/pending go to the return page, which re-reads the status from Midtrans on the server. Closing the popup
// cancels nothing; it shows the attempt's real state with "Continue payment" and "Cancel & change payment method".

type Snap = { pay: (token: string, o: Record<string, (r?: unknown) => void>) => void; hide?: () => void };
declare global { interface Window { snap?: Snap } }

function loadSnap(src: string, clientKey: string): Promise<Snap> {
  if (window.snap && document.querySelector(`script[data-gif-snap="${src}"]`)) return Promise.resolve(window.snap);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.async = true;
    s.setAttribute("data-client-key", clientKey);
    s.setAttribute("data-gif-snap", src);
    s.onload = () => (window.snap ? resolve(window.snap) : reject(new Error("snap_unavailable")));
    s.onerror = () => reject(new Error("snap_unavailable"));
    document.body.appendChild(s);
    setTimeout(() => reject(new Error("snap_timeout")), 15_000);
  });
}

type View = { kind: "idle" } | { kind: "busy"; text: string } | { kind: "open"; orderId: string; status: string; note?: string; tone?: string }
  | { kind: "cancelling"; orderId: string } | { kind: "choose"; note: string; tone?: string } | { kind: "not_cancellable"; orderId: string; note: string }
  | { kind: "paid"; note: string } | { kind: "error"; orderId?: string; note: string };

const WHATSAPP = "https://wa.me/6288297253491";

export function PayFlow({ obligationId, label, idrOption, openOrderId, openStatus, cancelResult }: {
  obligationId: string; label: string; idrOption?: boolean; openOrderId?: string | null; openStatus?: string | null; cancelResult?: string | null }) {
  const router = useRouter();
  const initial: View = openOrderId && openStatus === "cancelling" ? { kind: "cancelling", orderId: openOrderId }
    : openOrderId && openStatus && cancelResult === "not_cancellable" ? { kind: "not_cancellable", orderId: openOrderId, note: "The payment provider didn't allow cancelling your previous payment." }
    : openOrderId && openStatus ? { kind: "open", orderId: openOrderId, status: openStatus } : { kind: "idle" };
  const [view, setView] = useState<View>(initial);
  const busy = useRef(false);

  const refresh = useCallback(async (orderId: string, note?: string) => {
    const r = await checkPaymentAction(orderId).catch(() => ({ status: "unknown" } as Awaited<ReturnType<typeof checkPaymentAction>>));
    if (r.status === "paid") { setView({ kind: "paid", note: "Payment completed. Thank you!" }); router.refresh(); return; }
    if (r.status === "cancelling") { setView({ kind: "cancelling", orderId }); return; }
    if (["created", "pending"].includes(r.status) && r.cancelResult === "not_cancellable") {
      setView({ kind: "not_cancellable", orderId, note: "The payment provider didn't allow cancelling your previous payment." }); return;
    }
    if (["created", "pending"].includes(r.status)) { setView({ kind: "open", orderId, status: r.status, note }); return; }
    const closed: Record<string, string> = { cancelled: "Your previous payment was cancelled.", expired: "Your previous payment expired.", failed: "Your previous payment failed. Nothing was charged for it." };
    setView({ kind: "choose", note: closed[r.status] ?? "Choose a payment method to continue." });
    router.refresh();
  }, [router]);

  // While a cancellation is being confirmed, poll until it settles.
  useEffect(() => {
    if (view.kind !== "cancelling") return;
    const t = setInterval(() => refresh(view.orderId), 3000);
    return () => clearInterval(t);
  }, [view, refresh]);

  const open = useCallback(async (r: CheckoutResult) => {
    if (!r || r.error || !r.orderId) { setView({ kind: "error", note: r?.error ?? "The payment page could not be opened. Please try again." }); return; }
    const orderId = r.orderId;
    const toReturn = () => router.push(`/portal/payments/return?order_id=${encodeURIComponent(orderId)}`);
    if (r.token && r.snap) {
      try {
        const snap = await loadSnap(r.snap.scriptUrl, r.snap.clientKey);
        setView({ kind: "busy", text: "Payment window open…" });
        snap.pay(r.token, {
          onSuccess: toReturn, onPending: toReturn,
          onError: () => refresh(orderId, "The payment didn't go through. You can try again or choose another method."),
          onClose: () => refresh(orderId, "You closed the payment window before finishing. Nothing has been cancelled."),
        });
        return;
      } catch { /* popup unavailable (blocked script, old browser): use the Snap page instead */ }
    }
    if (r.redirectUrl) window.location.href = r.redirectUrl;
    else setView({ kind: "error", orderId, note: "The payment page could not be opened. Please try again." });
  }, [router, refresh]);

  const run = async (text: string, f: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true; setView({ kind: "busy", text });
    try { await f(); } finally { busy.current = false; }
  };
  const pay = (forceNew = false) => run("Opening payment…", async () => open(await payAction(obligationId, { idrOption, forceNew })));
  const resume = (orderId: string) => run("Reopening your payment…", async () => {
    const r = await resumePaymentAction(orderId);
    if (r?.status === "paid") { setView({ kind: "paid", note: "Payment completed. Thank you!" }); router.refresh(); return; }
    if (r?.error) { setView({ kind: "choose", note: r.error }); return; }
    await open(r);
  });
  const cancel = (orderId: string) => run("Cancelling your previous payment…", async () => {
    const r = await cancelPaymentAction(orderId);
    if (r.outcome === "cancelled" || r.outcome === "closed") setView({ kind: "choose", note: r.message, tone: "ok" });
    else if (r.outcome === "paid") { setView({ kind: "paid", note: r.message }); router.refresh(); }
    else if (r.outcome === "in_progress") setView({ kind: "cancelling", orderId });
    else if (r.outcome === "not_cancellable") setView({ kind: "not_cancellable", orderId, note: r.message });
    else setView({ kind: "error", orderId, note: r.message });
  });

  const btn = (cls: string, text: string, onClick: () => void, testId?: string) =>
    <button type="button" className={`btn ${cls} btn-sm`} onClick={onClick} data-testid={testId}>{text}</button>;

  switch (view.kind) {
    case "idle":
      return btn(idrOption ? "btn-secondary" : "btn-primary", label, () => pay(), "pay");
    case "busy":
      return <p className="small muted" role="status">{view.text}</p>;
    case "open":
      return (
        <div className="attempt" role="status" data-testid="attempt-open">
          <p className="small"><strong>Awaiting payment.</strong> {view.note ?? "You started a payment that isn't finished yet."}</p>
          <div className="btn-row">{btn("btn-primary", "Continue payment", () => resume(view.orderId), "continue")}
            {btn("btn-secondary", "Cancel & change payment method", () => cancel(view.orderId), "cancel-change")}</div>
        </div>
      );
    case "cancelling":
      return <p className="small" role="status" data-testid="attempt-cancelling"><strong>Cancelling your previous payment…</strong> This takes a few seconds.</p>;
    case "choose":
      return (
        <div className="attempt" role="status" data-testid="attempt-choose">
          <p className={`small ${view.tone === "ok" ? "" : "muted"}`}>{view.note}</p>
          {btn("btn-primary", "Choose a payment method", () => pay(), "choose-method")}
        </div>
      );
    case "not_cancellable":
      return (
        <div className="attempt" role="status" data-testid="attempt-not-cancellable">
          <p className="small"><strong>Can&apos;t cancel this payment.</strong> {view.note}</p>
          <div className="btn-row">{btn("btn-primary", "Continue payment", () => resume(view.orderId), "continue")}
            {btn("btn-secondary", "Start a new payment", () => pay(true), "force-new")}</div>
          <p className="tiny muted">If both payments go through, we refund the second one in full. Need help? <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp us</a>.</p>
        </div>
      );
    case "paid":
      return <p className="small" role="status" data-testid="attempt-paid"><span className="badge ok">Paid</span> {view.note}</p>;
    case "error":
      return (
        <div className="attempt" role="alert" data-testid="attempt-error">
          <p className="small error">{view.note}</p>
          {view.orderId ? btn("btn-secondary", "Check again", () => refresh(view.orderId!), "check-again") : btn("btn-primary", label, () => pay(), "pay")}
        </div>
      );
  }
}

export function InvoiceButton({ obligationId }: { obligationId: string }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(requestInvoiceAction, null);
  if (s?.ok) return <p className="small" role="status">{s.message}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="obligation_id" value={obligationId} />
      <button className="btn btn-secondary btn-sm" disabled={pending}>{pending ? "Requesting…" : "Request invoice"}</button>
      {s?.error && <p className="error small" role="alert">{s.error}</p>}
    </form>
  );
}
