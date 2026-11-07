import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { jsonError, requireOsPerson } from "@/lib/os/api";
import { calendarConfigured, consentUrl } from "@/lib/os/gcal";
import { calendarCallbackUrl, CAL_STATE_COOKIE, COOKIE_PATH } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Any Company OS member: start Google's consent screen for THEIR OWN calendar (scope calendar.events only).
export async function GET(req: Request) {
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  if (!calendarConfigured()) return jsonError("Google Calendar isn't configured on the server yet.", 503);
  const redirect = calendarCallbackUrl(req);
  if (!redirect) return jsonError("Not found.", 404);
  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(consentUrl(redirect, state));
  res.cookies.set(CAL_STATE_COOKIE, `${state}.${auth.personId}`, { httpOnly: true, secure: !redirect.startsWith("http:"), sameSite: "lax", path: COOKIE_PATH, maxAge: 600 });
  return res;
}
