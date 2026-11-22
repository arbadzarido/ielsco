// Anonymous, cookie-less Supabase client for server components that render public data (opportunities, plans, the
// member-session schedule). Same access as a signed-out visitor (RLS applies), so pages using it can be cached.
import { createClient } from "@supabase/supabase-js";

export function publicSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Same anonymous client, but its requests go through Next's data cache: the answer is reused for `revalidate` seconds by
// every visitor and refreshed in the background, and `revalidateTag(tag)` drops it at once when staff edit the data
// (app/api/admin/opportunities/revalidate). ONLY for rows an anonymous visitor may read (RLS decides what that is), never
// for a signed-in member's own data. Server-side only: the cache option is ignored in the browser.
export const OPPORTUNITIES_CACHE_TAG = "public-opportunities";
export const PUBLIC_REVALIDATE_SECONDS = 300;

export function cachedPublicSupabase(tag: string, revalidate = PUBLIC_REVALIDATE_SECONDS) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate, tags: [tag] } }) },
  });
}

// During `next build` a database that is unreachable must not fail the whole build: pages that prerender then fall back to
// an empty list and refresh themselves (revalidate) once the database answers. At runtime errors still surface.
export const buildingSite = () => process.env.NEXT_PHASE === "phase-production-build";
