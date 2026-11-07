import { NextResponse } from "next/server";
import { trustedBaseUrl } from "@/lib/safe-redirect";
import { deviceProfileKey, parseUserAgent } from "@/lib/os/device";
import { approxLocation, clientIp, notifyNewDevice, osRouteClient, osServiceClient, sessionIdFromAccessToken } from "@/lib/os/server";

// Company OS OAuth callback (Supabase Auth with Google). Exact redirect URL to allow in Supabase:
//   https://os.ielsco.com/os/auth/callback
// After the code exchange, access is decided by the database (os_access_status), never by the email domain:
//   1. link the login to the approved registry entry for its verified Google email (os_claim_account; no-op otherwise)
//   2. ask os_access_status() as the user: Google identity, verified email, approved + active, company, live session
//   3. record the attempt in os_login_events (service role, server only), success or not
//   4. refused: end the session at once and show a generic message (no hint whether the email is registered)
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = trustedBaseUrl(request.headers);
  const back = (error: string) => NextResponse.redirect(`${base}/os/login?error=${error}`, { status: 303 });

  const code = url.searchParams.get("code");
  if (!code) return back(url.searchParams.get("error") === "access_denied" ? "cancelled" : "signin");

  const supabase = await osRouteClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || !data.user) return back("signin");

  const service = osServiceClient();
  if (!service) {
    // Without the service key the login cannot be recorded. Fail closed rather than let unrecorded sign-ins in.
    console.error("[os login] SUPABASE_SERVICE_ROLE_KEY is not set; refusing Company OS sign-in");
    await supabase.auth.signOut({ scope: "local" });
    return back("unavailable");
  }

  const user = data.user;
  const sessionId = sessionIdFromAccessToken(data.session.access_token);
  await supabase.rpc("os_claim_account");
  const { data: allowed, error: accessError } = await supabase.rpc("os_access_status");
  let ok = !accessError && allowed === true;
  let reason = "ok";
  if (!ok) {
    const { data: why } = await service.rpc("os_access_reason", { p_user: user.id });
    reason = accessError ? "check_failed" : typeof why === "string" && why !== "ok" ? why : "session_check_failed";
    // A verified factor makes the first (aal1) session fail the check by design: let it through to the MFA prompt.
    if (!accessError && why === "ok") {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") { ok = true; reason = "ok_mfa_pending"; }
    }
  }

  const device = parseUserAgent(request.headers.get("user-agent"));
  const where = approxLocation(request.headers);
  const provider = (user.app_metadata?.provider as string | undefined) ?? null;
  const { data: isNew, error: recordError } = await service.rpc("os_record_login", {
    p_user: user.id, p_session: ok ? sessionId : null, p_success: ok, p_reason: reason, p_provider: provider,
    p_ip: clientIp(request.headers), p_user_agent: request.headers.get("user-agent"),
    p_browser: device.browser, p_browser_version: device.browserVersion, p_os: device.os, p_device_type: device.deviceType,
    p_device_profile: deviceProfileKey(device), p_country: where.country, p_region: where.region, p_city: where.city,
  });

  if (!ok || recordError) {
    if (recordError) console.error("[os login] could not record sign-in", recordError.code);
    await supabase.auth.signOut({ scope: "local" });
    return back(recordError ? "unavailable" : "denied");
  }

  if (isNew === true) await notifyNewDevice(service, user.email ?? null, device, where, new Date());
  return NextResponse.redirect(`${base}/os`, { status: 303 });
}
