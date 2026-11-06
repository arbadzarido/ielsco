// Server-only helpers for Company OS sign-in. Never import from a client component: this module reads the service-role
// key, which must never reach the browser.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resend } from "resend";
import { describeDevice, type DeviceInfo } from "./device";

/** Cookie-bound client for route handlers (can set and clear the session cookies). */
export async function osRouteClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        for (const { name, value, options } of list) cookieStore.set({ name, value, ...options });
      },
    },
  });
}

/** Service-role client, or null when the key is not configured on this deployment. RLS does not apply: use only for
 *  the server-only os_record_login / os_access_reason functions and reading founders' emails. */
export function osServiceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Supabase session id (the session_id claim of the access token). Not a secret: it cannot be used to sign in. */
export function sessionIdFromAccessToken(token: string | undefined): string | null {
  try {
    const payload = JSON.parse(Buffer.from((token ?? "").split(".")[1] ?? "", "base64url").toString("utf8"));
    return typeof payload.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}

export function clientIp(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
}

/** Approximate location from Vercel's edge headers (country is reliable; region and city are best effort). */
export function approxLocation(headers: Headers) {
  const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : null; } catch { return null; } };
  return { country: headers.get("x-vercel-ip-country"), region: dec(headers.get("x-vercel-ip-country-region")), city: dec(headers.get("x-vercel-ip-city")) };
}

/** New-device email to the account owner and the active founders. Sends only when RESEND_API_KEY and EMAIL_FROM are
 *  set (the same Resend setup the careers form uses); otherwise the event is still visible in Admin → Security. */
export async function notifyNewDevice(service: SupabaseClient, ownerEmail: string | null, device: DeviceInfo,
  where: { country: string | null; city: string | null }, at: Date): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from || !ownerEmail) return false;
  const { data: founders } = await service.from("os_people").select("google_account").eq("org_role", "founder").eq("status", "active");
  const to = Array.from(new Set([ownerEmail, ...((founders ?? []).map((f) => f.google_account).filter(Boolean) as string[])]));
  const place = [where.city, where.country].filter(Boolean).join(", ") || "unknown location";
  try {
    const { error } = await new Resend(key).emails.send({
      from, to,
      subject: "Company OS: sign-in from a new device",
      text: `${ownerEmail} signed in to Company OS from a device profile not seen before on this account.\n\n`
        + `Device: ${describeDevice(device)} (approximate, from the browser)\nWhere: ${place} (approximate, from the IP address)\n`
        + `When: ${at.toISOString()}\n\nIf this wasn't you, tell a founder now. They can end the session in Company OS → Admin → Security & sessions.\n`,
    });
    if (error) { console.error("[os login] new-device email failed", error.name); return false; }
    return true;
  } catch (e) {
    console.error("[os login] new-device email failed", (e as Error).name);
    return false;
  }
}
