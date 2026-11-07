import "server-only";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { osRouteClient } from "./server";

// Company OS API routes start here. The caller's own session client is returned, so every read and write the route
// makes on their behalf goes through RLS exactly as if they had made it in the browser. os_current_person() applies all
// access conditions (allowlist, status, company, session not revoked).
export async function requireOsPerson(): Promise<{ supabase: SupabaseClient; personId: string } | NextResponse> {
  const supabase = await osRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  const { data: allowed } = await supabase.rpc("os_access_status");
  if (!allowed) return NextResponse.json({ error: "You don't have access to Company OS." }, { status: 403 });
  const { data: person } = await supabase.from("os_people").select("id").eq("user_id", user.id).maybeSingle();
  if (!person) return NextResponse.json({ error: "You don't have access to Company OS." }, { status: 403 });
  return { supabase, personId: person.id as string };
}

export const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Same-origin check for state-changing requests (defence in depth on top of SameSite cookies). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === (req.headers.get("x-forwarded-host") ?? req.headers.get("host")); } catch { return false; }
}
