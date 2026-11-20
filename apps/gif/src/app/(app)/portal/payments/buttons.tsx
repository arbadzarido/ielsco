"use client";
import { useActionState } from "react";
import { payAction, requestInvoiceAction, type ActionResult } from "@/app/actions/portal";

export function PayButton({ obligationId, label, idrOption }: { obligationId: string; label: string; idrOption?: boolean }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(payAction, null);
  return (
    <form action={action}>
      <input type="hidden" name="obligation_id" value={obligationId} />
      {idrOption && <input type="hidden" name="idr_option" value="1" />}
      <button className={`btn ${idrOption ? "btn-secondary" : "btn-primary"} btn-sm`} disabled={pending}>{pending ? "Opening payment…" : label}</button>
      {s?.error && <p className="error small" role="alert" style={{ marginTop: 6 }}>{s.error}</p>}
    </form>
  );
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
