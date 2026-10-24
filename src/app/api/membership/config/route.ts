import { NextResponse } from "next/server";
import { listPlans, publicCheckoutConfig } from "@/lib/membership/server";

export const dynamic = "force-dynamic";

// Public: plans (with billing_enabled) and whether checkout is open. No secrets.
export async function GET() {
  const plans = await listPlans();
  return NextResponse.json({ plans, checkout: publicCheckoutConfig() }, { headers: { "Cache-Control": "no-store" } });
}
