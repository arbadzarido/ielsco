import { NextResponse } from "next/server";
import { getOrder, MembershipError, sessionUser } from "@/lib/membership/server";
import { ORDER_ID_RE } from "@/lib/payments/midtrans";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

// One of the member's orders. ?refresh=1 re-checks the status with Midtrans server-side and applies the verified result.
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  if (!ORDER_ID_RE.test(orderId)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  try {
    const refresh = new URL(request.url).searchParams.get("refresh") === "1";
    return NextResponse.json(await getOrder(user, orderId, refresh), { headers: noStore });
  } catch (e) {
    if (e instanceof MembershipError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status, headers: noStore });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: noStore });
  }
}
