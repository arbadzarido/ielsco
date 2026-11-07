import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOsPerson } from "@/lib/os/api";
import { oauthClient, oauthConfigured, saveDriveConnection } from "@/lib/os/drive-oauth";
import { osServiceClient } from "@/lib/os/server";
import { backTo, callbackErrorCode } from "@/lib/os/google-oauth";
import { callbackUrl, STATE_COOKIE } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (req: Request, result: string) => {
  const res = NextResponse.redirect(backTo(callbackUrl(req), req.url, `/os/admin?tab=health&drive=${result}`));
  res.cookies.set(STATE_COOKIE, "", { path: "/os/api/admin/drive", maxAge: 0 });
  return res;
};

// Google sends the founder back here. Checks the state, that the same founder is still signed in, and that Drive
// access was granted; then stores the sealed refresh token. Never echoes Google's response.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: founder } = await auth.supabase.rpc("os_is_founder");
  const redirect = callbackUrl(req);
  if (!founder || !redirect || !oauthConfigured()) return back(req, "denied");

  const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1) ?? "";
  const [state, personId] = decodeURIComponent(cookie).split(".");
  const given = url.searchParams.get("state") ?? "";
  const ok = state && given && state.length === given.length && timingSafeEqual(Buffer.from(state), Buffer.from(given)) && personId === auth.personId;
  if (!ok) return back(req, "expired");
  const googleError = callbackErrorCode(url.searchParams.get("error"));
  if (googleError) return back(req, googleError);
  const code = url.searchParams.get("code");
  if (!code) return back(req, "cancelled");

  try {
    const client = oauthClient(redirect);
    const { tokens } = await client.getToken(code);
    const scopes = tokens.scope ?? "";
    if (!tokens.refresh_token || !scopes.split(" ").includes("https://www.googleapis.com/auth/drive")) return back(req, "scope");
    const info = await client.getTokenInfo(tokens.access_token!);
    const email = (info.email ?? "").toLowerCase();
    if (!email) return back(req, "scope");
    if (!(await saveDriveConnection(email, tokens.refresh_token, scopes, auth.personId))) return back(req, "failed");
    await osServiceClient()?.from("os_audit_log").insert({ actor_person_id: auth.personId, action: "drive.connected", target_type: "os_drive_connection", target_id: "drive", detail: { google_email: email } });
    return back(req, "connected");
  } catch {
    console.error("[os drive] connecting Google Drive failed");
    return back(req, "failed");
  }
}
