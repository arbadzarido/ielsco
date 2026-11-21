import { NextResponse, type NextRequest } from "next/server";
import { bridgeSecrets, verifySsoToken } from "@/lib/ielsco-bridge";
import { signInAsIelscoUser } from "@/lib/auth";
import { firstUse } from "@/lib/ratelimit";
import { logDbError } from "@/lib/db";

// GET /sso?t=<token>&next=<gif path> — arrival from the IELSco dashboard (www.ielsco.com/api/gif/sso). IELSco has
// already signed the person in, so GIF starts its session without asking for a password or code (lib/ielsco-bridge.ts).
export const dynamic = "force-dynamic";

const safeNext = (v: string | null) => (v && /^\/(portal|admin|apply)([/?#][\w\-/?=&.%#]*)?$/.test(v) && !v.includes("//") ? v : "/portal");

export async function GET(req: NextRequest) {
  const site = (process.env.GIF_SITE_URL || req.nextUrl.origin).replace(/\/+$/, "");
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const fail = (code: string) => NextResponse.redirect(`${site}/login?next=${encodeURIComponent(next)}&sso=${code}`, 303);
  const v = verifySsoToken(req.nextUrl.searchParams.get("t"), bridgeSecrets());
  if (!v.ok) return fail(v.error);
  try {
    // Single use: the nonce may be redeemed once (tokens live 2 minutes; the window outlives them).
    if (!(await firstUse(`sso-nonce:${v.nonce}`, 86400))) return fail("used");
    const r = await signInAsIelscoUser({ id: v.identity.sub, email: v.identity.email });
    if (!r.ok) return fail("conflict");
  } catch (e) {
    logDbError("sso", e);
    return fail("unavailable");
  }
  const res = NextResponse.redirect(`${site}${next}`, 303);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
