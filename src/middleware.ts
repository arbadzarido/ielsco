// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// --- SECURITY ADDITION (Anti-Spam / Rate Limiter) ---
const requestTracker = new Map<string, { count: number; timestamp: number }>();
// --------------------------------------------------

export async function middleware(request: NextRequest) {

  const host = request.headers.get('host');
  const url = request.nextUrl.clone();

  // --- VERCEL URL PROTECTION ---
  // If accessed via .vercel.app, redirect immediately to the main domain
  if (host && host.includes('.vercel.app')) {
    url.host = 'ielsco.com';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 301); // 301 = Permanent Redirect
  }
  
  // --- 1. BOT KILLER ENGINE (RUNS FIRST) ---
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';

  // Bot Blacklist (The hey/0.0.1 bot that attacked recently)
  const blockedAgents = ['hey/0.0.1', 'curl', 'PostmanRuntime', 'python-requests'];
  
  const isBot = blockedAgents.some(bot => userAgent.includes(bot));
  
  // Specific rate limit for the homepage
  if (request.nextUrl.pathname === '/') {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Get specific limit data for homepage
    const homeRecord = requestTracker.get(`home-${ip}`) || { count: 0, timestamp: now };
    
    if (now - homeRecord.timestamp < 5000) { // Check every 5 seconds
      homeRecord.count++;
    } else {
      homeRecord.count = 1;
      homeRecord.timestamp = now;
    }
    
    requestTracker.set(`home-${ip}`, homeRecord);

    if (homeRecord.count > 5) {
      return new NextResponse("Too many requests. Please slow down.", { status: 429 });
    }
  }

  if (isBot) {
    console.warn(`[KILL SHOT] Bot detected and blocked: ${userAgent} from IP: ${ip}`);
    // Kick immediately with 403 (Forbidden) status
    return new NextResponse("Access Denied. Bot activity detected.", { status: 403 });
  }

  // --- START API PROTECTION BLOCK (Runs before Supabase) ---
  if (request.nextUrl.pathname.startsWith('/api/')) {
    
    const ip = request.headers.get('x-forwarded-for') || 'unknown-ip';
    const now = Date.now();
    const WINDOW_MS = 10000; // 10 seconds
    const MAX_REQUESTS = 20; // Maximum 20 requests per 10 seconds

    const record = requestTracker.get(ip) || { count: 0, timestamp: now };

    if (now - record.timestamp > WINDOW_MS) {
      record.count = 1;
      record.timestamp = now;
    } else {
      record.count++;
    }

    requestTracker.set(ip, record);

    if (record.count > MAX_REQUESTS) {
      console.warn(`[SECURITY ALERT] IP ${ip} blocked due to API spam.`);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: "Too many requests. System blocked this action to prevent abuse." 
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  // --- END API PROTECTION BLOCK ---


  // =====================================================================
  // ORIGINAL CODE BELOW
  // =====================================================================

  // 1. Initialize initial Response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Setup Supabase Client for Middleware
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

  // 3. IMPORTANT: getUser() will validate the token & refresh the session cookie if necessary.
  const { data: { user } } = await supabase.auth.getUser()

  // 4. REDIRECT RULES
  const isAuthRoute = request.nextUrl.pathname.startsWith('/sign-in') || 
                      request.nextUrl.pathname.startsWith('/sign-up');

  // All pages in the forgot password flow — not just new-password
  const isForgotPasswordFlow = request.nextUrl.pathname.startsWith('/sign-in/forgot');

  // If user is ALREADY logged in but opens an Auth page
  if (user && isAuthRoute) {
    // Let the entire forgot password flow pass (forgot, verify, new-password)
    if (isForgotPasswordFlow) {
      return response;
    }
    
    // Otherwise, redirect to Dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // ONLY REMOVED THE WORD 'api/test' FROM HERE SO MIDDLEWARE CAN CATCH THE SPAM
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}