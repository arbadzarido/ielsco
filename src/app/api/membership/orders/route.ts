import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, MembershipError, myOrders, reconcilePending, sessionUser } from "@/lib/membership/server";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const Body = z.object({ plan_code: z.string().regex(/^[a-z0-9-]{2,40}$/) });

function fail(e: unknown) {
  if (e instanceof MembershipError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status, headers: noStore });
  console.error("[membership] orders", (e as Error).message);
  return NextResponse.json({ error: "server_error", message: "Something went wrong. Please try again." }, { status: 500, headers: noStore });
}

// Start a checkout for the signed-in member. The price comes from public.membership_plans, never from the request.
export async function POST(request: Request) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "Please sign in first." }, { status: 401, headers: noStore });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: "Choose a plan." }, { status: 400, headers: noStore });
  try {
    return NextResponse.json(await createOrder(user, parsed.data.plan_code), { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}

// The member's orders (newest first), after re-checking any open ones with Midtrans.
export async function GET() {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  try {
    await reconcilePending(user);
    return NextResponse.json({ orders: await myOrders(user) }, { headers: noStore });
  } catch (e) {
    return fail(e);
  }
}
