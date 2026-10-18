// Server-side admin check for the Member Stories API routes. Uses the caller's own Supabase session (anon key +
// cookies, so RLS applies to everything they do) and asks the database whether they are in public.staff_roles.
// Nothing from the client (profile fields, user metadata, request body) is trusted.
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireStoryAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, supabase };
  const { data, error } = await supabase.rpc("is_story_admin");
  if (error || data !== true) return { ok: false as const, status: 403, supabase };
  return { ok: true as const, user, supabase };
}
