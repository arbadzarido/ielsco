import "server-only";
import { isOsHost } from "@/lib/os/host";

export const STATE_COOKIE = "os_drive_oauth";

/** The callback URL registered with Google. Only ever on the Company OS host. */
export function callbackUrl(req: Request): string | null {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (!isOsHost(host)) return null;
  const proto = host.startsWith("os.localhost") ? "http" : "https";
  return `${proto}://${host}/os/api/admin/drive/callback`;
}
