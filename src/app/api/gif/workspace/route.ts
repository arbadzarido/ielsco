// GET /api/gif/workspace — the signed-in member's GIF Summer 2027 journey for the GIF workspace (/dashboard/gif).
// The identity comes from the IELSco session; the data comes from the GIF app over a signed server-to-server call.
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchGifWorkspace, gifBridgeConfigured } from "@/lib/gif/bridge";

export const dynamic = "force-dynamic";

const json = (status: number, body: unknown) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return json(401, { error: "not_signed_in" });
  if (!gifBridgeConfigured()) return json(503, { error: "not_configured" });
  if (!user.email || !user.email_confirmed_at) return json(403, { error: "confirm_email" });
  const r = await fetchGifWorkspace({ sub: user.id, email: user.email });
  return r.ok ? json(200, r.data) : json(r.status >= 500 ? 503 : 502, { error: r.error });
}
