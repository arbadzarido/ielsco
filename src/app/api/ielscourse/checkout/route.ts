import { NextResponse } from "next/server";
import { z } from "zod";
import { sessionUser } from "@/lib/membership/server";
import { CourseError, startCheckout } from "@/lib/ielscourse/payments";
import { isSameSiteRequest } from "@/lib/integrations/elco";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };
const uuid = z.string().uuid();
// The browser says WHAT to buy, never the price: amounts come from course_plans / tutoring_instalments in Postgres.
const Body = z.union([
  z.object({ product: z.enum(["collective", "studio"]), cohort_id: uuid }),
  z.object({ product: z.literal("one"), instalment_id: uuid, agreed: z.boolean() }),
  z.object({ product: z.literal("one"), package: z.enum(["starter", "growth", "intensive"]), option: z.enum(["full", "deposit"]), agreed: z.boolean() }),
]);

export async function POST(request: Request) {
  if (!isSameSiteRequest(request)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "Please sign in first." }, { status: 401, headers: noStore });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", message: "Choose what you'd like to pay for." }, { status: 400, headers: noStore });
  try {
    return NextResponse.json(await startCheckout(user, parsed.data), { headers: noStore });
  } catch (e) {
    if (e instanceof CourseError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status, headers: noStore });
    console.error("[ielscourse] checkout", (e as Error).message);
    return NextResponse.json({ error: "server_error", message: "Something went wrong. Please try again." }, { status: 500, headers: noStore });
  }
}
