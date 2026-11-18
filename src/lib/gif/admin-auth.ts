// Server-side GIF admin check: uses the caller's own Supabase session (cookies) and asks the database
// (public.gif_is_admin → public.gif_admins, keyed by auth user id). Nothing from the browser is trusted.
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireGifAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, supabase };
  const { data, error } = await supabase.rpc("gif_is_admin");
  if (error || data !== true) return { ok: false as const, status: 403, supabase };
  return { ok: true as const, user, supabase };
}
