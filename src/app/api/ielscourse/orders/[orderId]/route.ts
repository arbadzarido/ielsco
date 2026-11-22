import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/membership/server";
import { CourseError, getMyOrder } from "@/lib/ielscourse/payments";
import { COURSE_ORDER_ID_RE } from "@/lib/payments/gateway";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

// One of the student's orders. ?refresh=1 re-checks it with Midtrans server-side; the browser's redirect is never proof.
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  if (!COURSE_ORDER_ID_RE.test(orderId)) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  try {
    return NextResponse.json(await getMyOrder(user, orderId, new URL(request.url).searchParams.get("refresh") === "1"), { headers: noStore });
  } catch (e) {
    if (e instanceof CourseError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status, headers: noStore });
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: noStore });
  }
}
