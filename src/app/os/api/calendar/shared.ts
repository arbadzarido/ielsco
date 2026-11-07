import "server-only";
import { redirectUriFor } from "@/lib/os/google-oauth";

// Calendar's own consent flow: separate cookie, callback and scope from Drive's.
export const CAL_STATE_COOKIE = "os_calendar_oauth";
export const COOKIE_PATH = "/os/api/calendar";

/** https://os.ielsco.com/os/api/calendar/callback in production. */
export function calendarCallbackUrl(req: Request): string | null {
  return redirectUriFor(req.headers.get("x-forwarded-host") ?? req.headers.get("host"), "calendar");
}
