import Link from "next/link";
import ReturnStatus from "./ReturnStatus";

// Midtrans sends the payer back here. The query string is never trusted: the page asks the server, which re-reads the
// payment status from Midtrans before showing anything as paid.
export default async function PaymentReturn({ searchParams }: { searchParams: Promise<{ order_id?: string }> }) {
  const orderId = (await searchParams).order_id ?? "";
  return (
    <>
      <h1>Checking your payment</h1>
      {/^[A-Z0-9-]{8,60}$/.test(orderId) ? <ReturnStatus key={orderId} orderId={orderId} /> : <p className="muted">No payment reference found.</p>}
      <p style={{ marginTop: 24 }}><Link href="/portal/payments">Back to payments</Link></p>
    </>
  );
}
