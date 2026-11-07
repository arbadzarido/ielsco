import "server-only";
import { redirectUriFor } from "@/lib/os/google-oauth";

export const STATE_COOKIE = "os_drive_oauth";

/** The Drive callback URL registered with Google: https://os.ielsco.com/os/api/admin/drive/callback in production.
 *  Only ever on the Company OS host. */
export function callbackUrl(req: Request): string | null {
  return redirectUriFor(req.headers.get("x-forwarded-host") ?? req.headers.get("host"), "drive");
}
