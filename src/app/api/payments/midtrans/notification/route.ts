import { NextResponse } from "next/server";
import { handleNotification } from "@/lib/membership/server";
import { handleCourseNotification } from "@/lib/ielscourse/payments";

export const dynamic = "force-dynamic";

// Midtrans HTTP notification (POST JSON) for IELSco orders: IELScourse (IELS-C-…) and legacy membership (IELS-M-…).
// Each Snap request names this URL with X-Override-Notification, so Elco's and GIF's notifications never come here. Public: authenticated by its signature, then the
// status is re-read from Midtrans before anything changes. 200 = processed (including duplicates), 400 = not JSON,
// 403 = bad signature, 404 = unknown order, 503 = Midtrans unreachable (Midtrans retries).
export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 16 * 1024) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  let n: unknown;
  try {
    n = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!n || typeof n !== "object" || Array.isArray(n)) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  try {
    const body = n as Record<string, unknown>;
    const { status, outcome } = String(body.order_id ?? "").startsWith("IELS-C-") ? await handleCourseNotification(body) : await handleNotification(body);
    return NextResponse.json({ ok: status === 200, outcome }, { status });
  } catch (e) {
    console.error("[payments] notification error", (e as Error).message);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
