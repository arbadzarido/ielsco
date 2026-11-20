import { NextResponse } from "next/server";
import { midtransConfig, signatureOk } from "@/lib/payments/midtrans";
import { syncFromGateway } from "@/lib/payments/service";
import { q } from "@/lib/db";

// Midtrans HTTP notification. Server-to-server; CSRF-exempt (lib/proxy) because it is authenticated by its signature.
// 1. Verify SHA512(order_id + status_code + gross_amount + key) against the Signature Secret Key(s).
// 2. Re-read the order's status from Midtrans (the authority) and apply it idempotently (lib/payments/service.ts).
// Unsigned or wrongly signed requests change nothing (401). Unknown orders are acknowledged (200) so Midtrans stops
// retrying notifications that belong to another integration on a shared merchant account.
export async function POST(req: Request) {
  const { config } = midtransConfig();
  if (!config) return NextResponse.json({ error: "payments disabled" }, { status: 503 });
  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return NextResponse.json({ error: "too large" }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const orderId = String(body.order_id ?? "");
  if (!signatureOk(body, config.signatureKeys)) {
    await q(`insert into gif.payment_events (order_id, source, transaction_status, status_code, gross_amount, signature_ok, dedupe_key, payload)
      values ($1, 'webhook', $2, $3, $4, false, $5, $6) on conflict do nothing`,
      [orderId.slice(0, 80) || "unknown", String(body.transaction_status ?? "").slice(0, 40), String(body.status_code ?? "").slice(0, 10), String(body.gross_amount ?? "").slice(0, 30),
        `badsig:${orderId.slice(0, 80)}:${Date.now()}`, JSON.stringify({ note: "rejected: bad signature" })]).catch(() => {});
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  try {
    const r = await syncFromGateway(orderId, "webhook", body, true);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    console.error("[gif] notification failed", orderId, (e as Error).message);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 }); // Midtrans retries
  }
}
