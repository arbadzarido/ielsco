// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// --- TAMBAHAN SATPAM (Anti-Spam / Rate Limiter) ---
const requestTracker = new Map<string, { count: number; timestamp: number }>();
// --------------------------------------------------

export async function middleware(request: NextRequest) {
  
  // --- MULAI BLOK PROTEKSI API (Jalan duluan sebelum Supabase) ---
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();
    const WINDOW_MS = 10000; // 10 detik
    const MAX_REQUESTS = 20; // Maksimal 20 request per 10 detik

    const record = requestTracker.get(ip) || { count: 0, timestamp: now };

    if (now - record.timestamp > WINDOW_MS) {
      record.count = 1;
      record.timestamp = now;
    } else {
      record.count++;
    }

    requestTracker.set(ip, record);

    if (record.count > MAX_REQUESTS) {
      console.warn(`[SECURITY ALERT] IP ${ip} diblokir karena spam API.`);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: "Too many requests. System blocked this action to prevent abuse." 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  // --- SELESAI BLOK PROTEKSI API ---


  // =====================================================================
  // KODE ASLI LO DI BAWAH INI (TIDAK ADA YANG DIUBAH SAMA SEKALI)
  // =====================================================================

  // 1. Inisialisasi Response awal
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Setup Supabase Client untuk Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. PENTING: getUser() akan memvalidasi token & me-refresh session cookie jika perlu.
  const { data: { user } } = await supabase.auth.getUser()

  // 4. ATURAN REDIRECT
  const isAuthRoute = request.nextUrl.pathname.startsWith('/sign-in') || 
                      request.nextUrl.pathname.startsWith('/sign-up');

  // Semua halaman dalam forgot password flow — bukan cuma new-password
  const isForgotPasswordFlow = request.nextUrl.pathname.startsWith('/sign-in/forgot');

  // Jika user SUDAH login tapi buka halaman Auth
  if (user && isAuthRoute) {
    // Biarin seluruh forgot password flow lewat (forgot, verify, new-password)
    if (isForgotPasswordFlow) {
      return response;
    }
    
    // Selain itu, tendang ke Dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // HANYA HAPUS KATA 'api/test' DARI SINI BIAR MIDDLEWARE BISA NANGKEP SPAM-NYA
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}