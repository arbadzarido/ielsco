"use client";
import { useEffect, useState } from "react";
import { checkPaymentAction } from "@/app/actions/portal";
import { PayFlow } from "../buttons";

const TEXT: Record<string, [string, string]> = {
  paid: ["ok", "Payment completed and verified. Thank you! Your receipt is on the Payments page."],
  pending: ["", "Awaiting payment. If you chose bank transfer, a virtual account or an e-wallet, complete it there; this page and your portal update automatically. Picked the wrong method? Cancel it below and choose another."],
  created: ["", "We haven't received a payment yet. You can continue the payment, or cancel it and choose another method."],
  cancelling: ["", "Cancelling your previous payment. This takes a few seconds."],
  failed: ["err", "The payment failed. Nothing was charged for this attempt. You can choose a payment method again from the Payments page."],
  expired: ["err", "The payment expired before it was completed. You can start a new one from the Payments page."],
  cancelled: ["", "This payment was cancelled. You can choose a payment method from the Payments page."],
  not_found: ["err", "We couldn't find this payment on your account."],
};

type State = Awaited<ReturnType<typeof checkPaymentAction>>;

export default function ReturnStatus({ orderId }: { orderId: string }) {
  const [s, setS] = useState<State>({ status: "created" });
  const [tries, setTries] = useState(0);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const r = await checkPaymentAction(orderId).catch(() => ({ status: "created" } as State));
      if (stop) return;
      setS(r);
      setTries((t) => t + 1);
    };
    if (tries === 0) tick();
    const t = setInterval(() => { if (["created", "pending", "cancelling"].includes(s.status) && tries < 20) tick(); }, 5000);
    return () => { stop = true; clearInterval(t); };
  }, [orderId, s.status, tries]);
  const [tone, text] = TEXT[s.status] ?? ["", `Status: ${s.status}`];
  const open = ["created", "pending", "cancelling"].includes(s.status) && s.obligationId && tries > 0;
  return (
    <>
      <div className={`notice ${tone}`} role="status" aria-live="polite"><p>{text}</p><p className="tiny muted">Reference {orderId}</p></div>
      {open && <PayFlow key={`${s.status}-${s.cancelResult ?? ""}`} obligationId={s.obligationId!} label="Pay online" openOrderId={orderId} openStatus={s.status} cancelResult={s.cancelResult ?? null} />}
    </>
  );
}
