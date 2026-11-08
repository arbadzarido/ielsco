// GET /careers/apply — the recruitment popup's "Apply now" (IELSco site, IELSco dashboard and Elco AI dashboard).
// Signed in to IELSco (Elco-Pass) → the application; signed out → the public Careers page, where they read about the
// roles and continue through sign-in. Only fixed same-site destinations; nothing from the query is used.
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APPLY_PATH } from "@/data/careers/recruitment";

export const dynamic = "force-dynamic";

export async function GET() {
  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
  } catch {
    signedIn = false;
  }
  // A relative Location: always this same host, never built from request headers.
  return new NextResponse(null, { status: 307, headers: { Location: signedIn ? APPLY_PATH : "/careers", "Cache-Control": "private, no-store" } });
}
