"use client";
import { useEffect, useState } from "react";
import { checkPaymentAction } from "@/app/actions/portal";

const TEXT: Record<string, [string, string]> = {
  paid: ["ok", "Payment verified. Thank you! Your receipt is on the Payments page."],
  pending: ["", "Waiting for confirmation from the payment provider. If you chose bank transfer or a virtual account, complete the transfer; this page and your portal update automatically."],
  created: ["", "We haven't received a confirmation yet. This can take a minute."],
  failed: ["err", "The payment failed. Nothing was charged for this attempt. You can try again from the Payments page."],
  expired: ["err", "The payment expired before it was completed. You can start a new one from the Payments page."],
  cancelled: ["err", "The payment was cancelled."],
  not_found: ["err", "We couldn't find this payment on your account."],
};

export default function ReturnStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState("created");
  const [tries, setTries] = useState(0);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const r = await checkPaymentAction(orderId).catch(() => ({ status: "created" }));
      if (stop) return;
      setStatus(r.status);
      setTries((t) => t + 1);
    };
    tick();
    const t = setInterval(() => { if (["created", "pending"].includes(status) && tries < 20) tick(); }, 5000);
    return () => { stop = true; clearInterval(t); };
  }, [orderId, status, tries]);
  const [tone, text] = TEXT[status] ?? ["", `Status: ${status}`];
  return <div className={`notice ${tone}`} role="status" aria-live="polite"><p>{text}</p><p className="tiny muted">Reference {orderId}</p></div>;
}
