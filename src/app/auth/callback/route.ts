// src/app/auth/callback/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { safeNextPath, trustedBaseUrl } from '@/lib/safe-redirect'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  // Security: only same-site relative paths (was an open redirect: `${base}${next}` with any `next`).
  const next = safeNextPath(searchParams.get('next'), '/dashboard')

  // Base URL from an allowlisted Host / X-Forwarded-Host only; otherwise the canonical site URL.
  const base = trustedBaseUrl(request.headers)

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    // Exchange the auth code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  // Failed / missing code: back to sign-in with an error flag (the old /auth/auth-code-error page never existed).
  return NextResponse.redirect(`${base}/sign-in?error=auth_callback`)
}
