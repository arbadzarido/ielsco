// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// --- TAMBAHAN SATPAM (Anti-Spam / Rate Limiter) ---
const requestTracker = new Map<string, { count: number; timestamp: number }>();
// --------------------------------------------------

  export async function middleware(request: NextRequest) {

  const host = request.headers.get('host');
  const url = request.nextUrl.clone();

  // --- PROTEKSI URL VERCEL ---
  // Jika ada yang akses pake .vercel.app, langsung lempar ke domain utama
  if (host && host.includes('.vercel.app')) {
    url.host = 'ielsco.com';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 301); // 301 = Pindah Permanen
  }
  
  // ... sisa kode pembunuh bot & supabase lo di bawahnya ...

  // --- 1. MESIN PEMBUNUH BOT (JALAN PALING AWAL) ---
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';

  // Daftar Hitam Bot (Kemaren bot hey/0.0.1 yang nyerang lo)
  const blockedAgents = ['hey/0.0.1', 'curl', 'PostmanRuntime', 'python-requests'];
  
  const isBot = blockedAgents.some(bot => userAgent.includes(bot));
  // Tambahin di dalam fungsi middleware lo, di paling atas:
if (request.nextUrl.pathname === '/') {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  // Ambil data limit khusus homepage
  const homeRecord = requestTracker.get(`home-${ip}`) || { count: 0, timestamp: now };
  
  if (now - homeRecord.timestamp < 5000) { // Cek per 5 detik
    homeRecord.count++;
  } else {
    homeRecord.count = 1;
    homeRecord.timestamp = now;
  }
  
  requestTracker.set(`home-${ip}`, homeRecord);

  if (homeRecord.count > 5) {
    return new NextResponse("Sabar bang, pelan-pelan aksesnya.", { status: 429 });
  }
}
  if (isBot) {
    console.warn(`[KILL SHOT] Bot terdeteksi dan diblokir: ${userAgent} dari IP: ${ip}`);
    // Tendang langsung dengan status 403 (Forbidden)
    return new NextResponse("Access Denied. Bot activity detected.", { status: 403 });
  }

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