import { NextResponse } from "next/server";
import { trustedBaseUrl } from "@/lib/safe-redirect";
import { osRouteClient } from "@/lib/os/server";

// Company OS sign-out. Ends this session on the Supabase side (the refresh token stops working and, because the OS
// checks that the session still exists, so does any copy of the access token), then clears the cookies.
// GET is used by the server gate to sign out an account that has no OS access; POST by the Sign out button.
export const dynamic = "force-dynamic";

async function signOut(request: Request) {
  const reason = new URL(request.url).searchParams.get("reason");
  const supabase = await osRouteClient();
  await supabase.auth.signOut({ scope: "local" });
  const q = reason === "denied" ? "error=denied" : reason === "expired" ? "error=expired" : "signed_out=1";
  return NextResponse.redirect(`${trustedBaseUrl(request.headers)}/os/login?${q}`, { status: 303 });
}

export const GET = signOut;
export const POST = signOut;
