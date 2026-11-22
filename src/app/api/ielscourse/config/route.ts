import { NextResponse } from "next/server";
import { sessionUser } from "@/lib/membership/server";
import { coursePlans, openCohorts, publicCheckoutConfig, reconcile } from "@/lib/ielscourse/payments";

export const dynamic = "force-dynamic";

// Checkout availability (client key is public by design), plans and open class groups with seats left. A signed-in
// student's open orders are re-checked with Midtrans first, so a payment whose notification was missed still lands.
export async function GET() {
  const user = await sessionUser().catch(() => null);
  if (user) await reconcile({ studentId: user.id, limit: 3, source: "return" }).catch(() => undefined);
  const [plans, cohorts] = await Promise.all([coursePlans(), openCohorts()]);
  return NextResponse.json({ checkout: publicCheckoutConfig(), plans, cohorts }, { headers: { "Cache-Control": "no-store" } });
}
