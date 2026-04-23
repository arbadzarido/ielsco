// =============================================================================
// src/middleware.ts
// Middleware utama IELS — menggabungkan:
//   1. Bot killer & rate limiter (kode lama)
//   2. Subdomain rewrite: school.ielsco.com -> app/school/*  (BARU)
//   3. Auth redirect via Supabase SSR (kode lama)
// =============================================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── In-memory rate limiter (resets on cold start) ─────────────────────────────
const requestTracker = new Map<string, { count: number; timestamp: number }>();

export async function proxy(request: NextRequest) {

  const host = request.headers.get('host') || '';
  const url  = request.nextUrl.clone();

  // ===========================================================================
  // STEP 1 — VERCEL URL PROTECTION
  // Redirect .vercel.app URLs langsung ke main domain
  // ===========================================================================
  if (host.includes('.vercel.app')) {
    url.host     = 'ielsco.com';
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
  // STEP 5 — API RATE LIMIT (max 20 req / 10 sec per IP)
  // ===========================================================================

  if (request.nextUrl.pathname.startsWith('/api/')) {
    const now        = Date.now();
    const WINDOW_MS  = 10_000;
    const MAX_REQ    = 20;
    const record     = requestTracker.get(ip) || { count: 0, timestamp: now };

    if (now - record.timestamp > WINDOW_MS) {
      record.count     = 1;
      record.timestamp = now;
    } else {
      record.count++;
    }

    requestTracker.set(ip, record);

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

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Validasi token + refresh cookie kalau perlu
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Redirect rules ──────────────────────────────────────────────────────────

  const pathname = request.nextUrl.pathname;

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

  // User sudah login tapi buka halaman auth main
  if (user && isMainAuthRoute && !pathname.startsWith('/school')) {
    if (isForgotPasswordFlow) return response;
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // User sudah login tapi buka halaman sign-in school
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
// Jangan jalankan middleware di file statis, gambar, dan favicon
// ===========================================================================
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};