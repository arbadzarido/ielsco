// Anonymous, cookie-less Supabase client for server components that render public data (opportunities, plans, the
// member-session schedule). Same access as a signed-out visitor (RLS applies), so pages using it can be cached.
import { createClient } from "@supabase/supabase-js";

export function publicSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
