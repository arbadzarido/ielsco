// =============================================================================
// src/middleware.ts
// Middleware utama IELS — menggabungkan:
//   1. Bot killer & rate limiter (kode lama)
//   2. Subdomain rewrite: school.ielsco.com -> app/school/*  (kode lama)
//   2B. Subdomain rewrite: circle.ielsco.com -> app/circle/*  (BARU)
//   3. Auth redirect via Supabase SSR (kode lama)
// =============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { unreadableAuthCookies } from '@/lib/supabase/auth-cookie-guard'
import { NextResponse, type NextRequest } from 'next/server'
import { isGatedOsPath, isOsHost, isOsPath, osHostRoute } from '@/lib/os/host'

// ── In-memory rate limiter (resets on cold start) ─────────────────────────────
const requestTracker = new Map<string, { count: number; timestamp: number }>();

export async function proxy(request: NextRequest) {

  const host = request.headers.get('host') || '';
  const url  = request.nextUrl.clone();

  // ===========================================================================
  // STEP 1 — VERCEL URL PROTECTION
  // Redirect .vercel.app URLs langsung ke main domain
  // ===========================================================================
  // Preview deployments stay reachable on their own URL so changes can be checked before they reach production.
  if (host.includes('.vercel.app') && process.env.VERCEL_ENV !== 'preview') {
    url.host     = 'www.ielsco.com'; // the primary host: one redirect, not two (ielsco.com itself redirects to www)
    url.protocol = 'https:';
    url.port     = '';
    return NextResponse.redirect(url, 301);
  }

  // ===========================================================================
  // STEP 2 — SUBDOMAIN REWRITE: school.ielsco.com
  //
  // Kalau diakses via school.ielsco.com (atau school.localhost di dev),
  // rewrite path secara internal ke /school/* tanpa mengubah URL yang
  // terlihat oleh user.
  //
  // Contoh:
  //   school.ielsco.com/dashboard         -> app/school/dashboard/page.tsx
  //   school.ielsco.com/dashboard/class   -> app/school/dashboard/class/page.tsx
  //   school.ielsco.com/sign-in           -> app/school/sign-in/page.tsx
  //   school.ielsco.com/insights          -> app/school/insights/page.tsx
  //   school.ielsco.com/reports           -> app/school/reports/page.tsx
  //   school.ielsco.com/settings          -> app/school/settings/page.tsx
  // ===========================================================================

  const isSchoolSubdomain =
    host === 'school.ielsco.com' ||
    host.startsWith('school.localhost');   // untuk dev lokal

  if (isSchoolSubdomain) {
    // Hanya rewrite kalau path belum dimulai dengan /school
    // (mencegah double-prefix /school/school/...)
    if (!url.pathname.startsWith('/school')) {
      url.pathname = `/school${url.pathname}`;
      return NextResponse.rewrite(url);
    }
    // Kalau sudah ada /school prefix, lanjut tanpa rewrite
  }

  // ===========================================================================
  // STEP 2B — SUBDOMAIN REWRITE: circle.ielsco.com
  //
  // Sama persis pola-nya kayak school.ielsco.com di atas, cuma arahnya ke
  // src/app/circle/*. Karena file kamu sudah ada di
  // src/app/circle/page.tsx dan src/app/circle/agenda/page.tsx, gak perlu
  // pindahin/rename file apa pun — cukup rewrite host-nya di sini.
  //
  // Contoh:
  //   circle.ielsco.com            -> app/circle/page.tsx
  //   circle.ielsco.com/agenda     -> app/circle/agenda/page.tsx
  // ===========================================================================

  const isCircleSubdomain =
    host === 'circle.ielsco.com' ||
    host.startsWith('circle.localhost');   // untuk dev lokal

  if (isCircleSubdomain) {
    // Hanya rewrite kalau path belum dimulai dengan /circle
    // (mencegah double-prefix /circle/circle/...)
    if (!url.pathname.startsWith('/circle')) {
      url.pathname = `/circle${url.pathname}`;
      return NextResponse.rewrite(url);
    }
    // Kalau sudah ada /circle prefix, lanjut tanpa rewrite
  }

  // ===========================================================================
  // STEP 2C — COMPANY OS HOST ISOLATION (src/lib/os/host.ts)
  //
  // os.ielsco.com serves only /os/... routes. Short URLs (/, /login, /dashboard, /admin) redirect into /os; every other
  // path goes to /os/<path>, which is either a Company OS page or the Company OS 404. Public pages (the member
  // dashboard, sign-in, sign-up) and public APIs never answer on this host, and the public hosts never serve /os.
  // Redirect (not rewrite) so the browser path is the real route: a rewrite broke hydration before.
  // Data access is still enforced by RLS on every os_* table and by the server gate in app/os/(app)/layout.tsx.
  // ===========================================================================

  const isOsSubdomain = isOsHost(host);

  if (isOsSubdomain) {
    const decision = osHostRoute(url.pathname);
    if (decision.action === 'api-not-found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (decision.action === 'redirect') {
      url.pathname = decision.to;
      return NextResponse.redirect(url);
    }
  } else if (isOsPath(url.pathname)) {
    // Not on the OS host: render the public 404, as if the route did not exist.
    url.pathname = '/__company-os-is-on-its-own-domain';
    return NextResponse.rewrite(url, { status: 404 });
  }

  // ===========================================================================
  // STEP 3 — BOT KILLER ENGINE
  // ===========================================================================

  const userAgent = request.headers.get('user-agent') || '';
  const ip        = request.headers.get('x-forwarded-for') || 'unknown-ip';

  const blockedAgents = ['hey/0.0.1', 'curl', 'PostmanRuntime', 'python-requests'];
  const isBot = blockedAgents.some((bot) => userAgent.toLowerCase().includes(bot.toLowerCase()));

  if (isBot) {
    console.warn(`[KILL SHOT] Bot blocked: ${userAgent} — IP: ${ip}`);
    return new NextResponse('Access Denied. Bot activity detected.', { status: 403 });
  }

  // ===========================================================================
  // STEP 4 — HOMEPAGE RATE LIMIT (max 5 req / 5 sec per IP)
  // ===========================================================================

  if (request.nextUrl.pathname === '/') {
    const now       = Date.now();
    const homeKey   = `home-${ip}`;
    const homeRecord = requestTracker.get(homeKey) || { count: 0, timestamp: now };

    if (now - homeRecord.timestamp < 5000) {
      homeRecord.count++;
    } else {
      homeRecord.count    = 1;
      homeRecord.timestamp = now;
    }

    requestTracker.set(homeKey, homeRecord);

    if (homeRecord.count > 5) {
      return new NextResponse('Too many requests. Please slow down.', { status: 429 });
    }
  }

  // ===========================================================================
  // STEP 4B — COMPANY OS SIGN-IN RATE LIMIT (max 10 req / 60 sec per IP; OS_SIGNIN_RATE_LIMIT overrides, for tests)
  // Per serverless instance (in-memory); Supabase Auth applies its own limits to the OAuth endpoints too.
  // ===========================================================================

  if (isOsSubdomain && (request.nextUrl.pathname === '/os/login' || request.nextUrl.pathname.startsWith('/os/auth/'))) {
    const now = Date.now();
    const key = `os-auth-${ip}`;
    const record = requestTracker.get(key) || { count: 0, timestamp: now };
    if (now - record.timestamp > 60_000) { record.count = 1; record.timestamp = now; } else { record.count++; }
    requestTracker.set(key, record);
    if (record.count > (Number(process.env.OS_SIGNIN_RATE_LIMIT) || 10)) {
      return new NextResponse('Too many sign-in attempts. Please wait a minute and try again.', { status: 429 });
    }
  }

  // ===========================================================================
  // STEP 5 — API RATE LIMIT (max 20 req / 10 sec per IP)
  // ===========================================================================

  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Elco's server calls the signed integration endpoints from one IP for all its users, so they get their own
    // bucket (still limited) instead of sharing the 20/10s browser limit. Being in this bucket grants nothing:
    // every one of these routes verifies the HMAC signature itself (src/lib/integrations/signature.ts).
    const isElcoServerCall = /^\/api\/integrations\/elco\/(exchange|goals|summary|revoke|benefits)$/.test(request.nextUrl.pathname);
    // Midtrans sends every merchant's notifications from a few shared IPs; the route verifies each signature itself.
    const isPaymentNotification = request.nextUrl.pathname === '/api/payments/midtrans/notification';
    const now        = Date.now();
    const WINDOW_MS  = 10_000;
    const MAX_REQ    = isElcoServerCall || isPaymentNotification ? 60 : 20;
    const bucket     = isElcoServerCall ? `elco-int-${ip}` : isPaymentNotification ? `midtrans-${ip}` : ip;
    const record     = requestTracker.get(bucket) || { count: 0, timestamp: now };

    if (now - record.timestamp > WINDOW_MS) {
      record.count     = 1;
      record.timestamp = now;
    } else {
      record.count++;
    }

    requestTracker.set(bucket, record);

    if (record.count > MAX_REQ) {
      console.warn(`[SECURITY ALERT] API spam blocked — IP: ${ip}`);
      return new NextResponse(
        JSON.stringify({
          success: false,
          error:   'Too many requests. System blocked this action to prevent abuse.',
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ===========================================================================
  // STEP 6 — SUPABASE AUTH (session refresh + redirect rules)
  // ===========================================================================

  // A session cookie the browser holds in an unreadable state (chunks from two different sessions) is dropped before
  // any Supabase client reads it: auth-js would otherwise log the raw value, tokens included. The person is signed out,
  // which is what happens anyway.
  const unreadable = unreadableAuthCookies(request.cookies.getAll());
  for (const name of unreadable) request.cookies.delete(name);

  let response = NextResponse.next({ request });

  // getAll/setAll: a refreshed session can span several cookie chunks, and every chunk must reach the browser. The old
  // get/set/remove adapter rebuilt the response on each set, so only the last chunk was sent and the browser kept the
  // previous session's refresh token (already rotated, so the next refresh failed and the person was signed out).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value } of list) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    }
  );

  // Validasi token + refresh cookie kalau perlu
  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const name of unreadable) {
    if (!response.cookies.has(name)) response.cookies.set(name, '', { path: '/', maxAge: 0 });
  }

  // ── Redirect rules ──────────────────────────────────────────────────────────
  // Catatan: IELS Circle (circle.ielsco.com) saat ini adalah halaman publik
  // tanpa proteksi auth, jadi isCircleSubdomain sengaja belum dipakai di
  // kondisi-kondisi di bawah. Kalau nanti ada halaman circle yang butuh
  // login, tinggal tambahin kondisi baru di sini mengikuti pola school.

  const pathname = request.nextUrl.pathname;

  // Daftar route yang butuh auth (proteksi utama)
  const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/school/dashboard');
  const isOsRoute = pathname === '/os' || pathname.startsWith('/os/');

  // Auth routes yang diizinkan tanpa login
  const isMainAuthRoute =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up');

  // Auth route untuk school portal
  const isSchoolAuthRoute =
    pathname.startsWith('/school/sign-in') ||
    pathname === '/sign-in'; // subdomain redirect ke /sign-in juga valid

  // Alur forgot password — boleh diakses tanpa auth
  const isForgotPasswordFlow = pathname.startsWith('/sign-in/forgot');

  // =========================================================================
  // KONDISI 1: User BELUM LOGIN tapi maksa masuk ke halaman terproteksi
  // (Ini yang nyelesaiin masalah bocor & flash 2 detik)
  // =========================================================================
  // Company OS: its own sign-in page. Who may use the OS is decided by the server gate and RLS, not here.
  if (!user && isOsRoute && isGatedOsPath(pathname)) {
    return NextResponse.redirect(new URL('/os/login', request.url));
  }
  if (isOsSubdomain) return response;

  if (!user && isProtectedRoute) {
    // Arahkan instan ke /sign-in sebelum halaman sempat di-render
    const signInUrl = new URL(isSchoolSubdomain ? '/sign-in' : '/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // =========================================================================
  // KONDISI 2: User SUDAH LOGIN tapi buka halaman auth main (mencegah user login 2x)
  // =========================================================================
  if (user && isMainAuthRoute && !pathname.startsWith('/school')) {
    if (isForgotPasswordFlow) return response;
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // =========================================================================
  // KONDISI 3: User SUDAH LOGIN tapi buka halaman sign-in school
  // =========================================================================
  if (user && isSchoolAuthRoute && isSchoolSubdomain) {
    if (isForgotPasswordFlow) return response;
    // Redirect ke dashboard (subdomain-aware)
    return NextResponse.redirect(
      new URL(isSchoolSubdomain ? '/dashboard' : '/school/dashboard', request.url)
    );
  }

  return response;
}

// ===========================================================================
// MATCHER CONFIG
// Jangan jalankan middleware di file statis, gambar, dan favicon.
// robots.txt and sitemap.xml skip it too: the same files must answer on every host (no circle./school. rewrite) and
// for every crawler (no user-agent block).
// ===========================================================================
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};