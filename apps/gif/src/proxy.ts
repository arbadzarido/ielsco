import { NextResponse, type NextRequest } from "next/server";

// Edge proxy for gif.ielsco.com:
// 1. CSRF: state-changing /api requests must come from this site (Origin check). The Midtrans notification and the
//    cron endpoint are exempt: they are server-to-server and verify a signature / secret themselves. Server Actions
//    have Next's own Origin check.
// 2. A per-instance burst limit on /api as a first line (real limits are in Postgres, see lib/ratelimit.ts).
// 3. gif_cc: the visitor's country from the edge, used only to pick the default price currency on public pages.
const EXEMPT = ["/api/payments/midtrans/notification", "/api/cron/", "/api/dev-storage/"];
const hits = new Map<string, { n: number; t: number }>();

function burst(key: string, max: number, ms: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > ms) { hits.set(key, { n: 1, t: now }); if (hits.size > 5000) hits.clear(); return false; }
  h.n++;
  return h.n > max;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    if (!EXEMPT.some((p) => pathname.startsWith(p))) {
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        let ok = false;
        try { ok = !!origin && !!host && new URL(origin).host === host; } catch { ok = false; }
        if (!ok) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
      }
      if (burst(`api:${ip}`, 120 * Number(process.env.GIF_RATE_LIMIT_FACTOR || 1), 10_000)) {
        return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429, headers: { "Retry-After": "10" } });
      }
    }
    return NextResponse.next();
  }
  const res = NextResponse.next();
  const cc = req.headers.get("x-vercel-ip-country");
  if (cc && /^[A-Z]{2}$/.test(cc) && req.cookies.get("gif_cc")?.value !== cc) {
    res.cookies.set("gif_cc", cc, { path: "/", maxAge: 86400 * 7, sameSite: "lax", secure: req.nextUrl.protocol === "https:" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-icon.png|photos/|brand/|robots.txt|sitemap.xml).*)"],
};
