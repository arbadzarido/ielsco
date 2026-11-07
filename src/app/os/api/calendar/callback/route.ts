import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { requireOsPerson } from "@/lib/os/api";
import { backTo, callbackErrorCode } from "@/lib/os/google-oauth";
import { calendarConfigured, CalendarError, connectCalendar } from "@/lib/os/gcal";
import { osServiceClient } from "@/lib/os/server";
import { calendarCallbackUrl, CAL_STATE_COOKIE, COOKIE_PATH } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (req: Request, result: string) => {
  const res = NextResponse.redirect(backTo(calendarCallbackUrl(req), req.url, `/os/calendar?google=${result}`));
  res.cookies.set(CAL_STATE_COOKIE, "", { path: COOKIE_PATH, maxAge: 0 });
  return res;
};

// Google sends the person back here. The state must match the cookie set for the same signed-in person; then the
// sealed refresh token is stored for that person only. Google's response is never echoed.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = await requireOsPerson();
  if (auth instanceof NextResponse) return auth;
  const redirect = calendarCallbackUrl(req);
  if (!redirect || !calendarConfigured()) return back(req, "failed");
  const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${CAL_STATE_COOKIE}=`))?.slice(CAL_STATE_COOKIE.length + 1) ?? "";
  const [state, personId] = decodeURIComponent(cookie).split(".");
  const given = url.searchParams.get("state") ?? "";
  const ok = state && given && state.length === given.length && timingSafeEqual(Buffer.from(state), Buffer.from(given)) && personId === auth.personId;
  if (!ok) return back(req, "expired");
  const googleError = callbackErrorCode(url.searchParams.get("error"));
  if (googleError) return back(req, googleError);
  const code = url.searchParams.get("code");
  if (!code) return back(req, "cancelled");
  try {
    const email = await connectCalendar(auth.personId, code, redirect);
    await osServiceClient()?.from("os_audit_log").insert({ actor_person_id: auth.personId, action: "calendar.connected", target_type: "os_calendar_connections", target_id: auth.personId, detail: { google_email: email } });
    return back(req, "connected");
  } catch (e) {
    console.error("[os calendar] connecting failed", e instanceof CalendarError ? e.kind : "error");
    return back(req, e instanceof CalendarError && e.kind === "denied" ? "scope" : "failed");
  }
}
