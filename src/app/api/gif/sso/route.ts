// GET /api/gif/sso?next=<gif path> — open a GIF page (application, payments, uploads…) with the IELSco session.
// Not signed in → IELSco sign-in, which comes back here. Signed in → a 2-minute signed hop to gif.ielsco.com/sso,
// which starts the GIF session for the same person (no second login). See src/lib/gif/bridge.ts.
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gifSsoUrl, safeGifPath } from "@/lib/gif/bridge";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const next = safeGifPath(req.nextUrl.searchParams.get("next"));
  const back = `/api/gif/sso?next=${encodeURIComponent(next)}`;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(back)}`, req.url), 303);
  if (!user.email || !user.email_confirmed_at) return NextResponse.redirect(new URL("/dashboard/gif?gif=confirm_email", req.url), 303);
  const url = gifSsoUrl({ sub: user.id, email: user.email }, next);
  if (!url) return NextResponse.redirect(new URL("/dashboard/gif?gif=not_configured", req.url), 303);
  const res = NextResponse.redirect(url, 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
