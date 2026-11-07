import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, requireOsPerson } from "@/lib/os/api";
import { DRIVE_SCOPES, oauthClient, oauthConfigured } from "@/lib/os/drive-oauth";
import { callbackUrl, STATE_COOKIE } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Founders only: start Google's consent screen so Company OS can create files in Drive with this founder's account.
export async function GET(req: Request) {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const { data: founder } = await auth.supabase.rpc("os_is_founder");
  if (!founder) return jsonError("Founders only.", 403);
  if (!oauthConfigured()) return jsonError("Google sign-in for Drive isn't configured on the server.", 503);
  const redirect = callbackUrl(req);
  if (!redirect) return jsonError("Not found.", 404);
  const state = randomBytes(24).toString("base64url");
  const url = oauthClient(redirect).generateAuthUrl({ access_type: "offline", prompt: "consent", scope: DRIVE_SCOPES, state, include_granted_scopes: false });
  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, `${state}.${auth.personId}`, { httpOnly: true, secure: !redirect.startsWith("http:"), sameSite: "lax", path: "/os/api/admin/drive", maxAge: 600 });
  return res;
}
