// Circle session check-ins (public.circle_session_checkins). The member id always comes from the session (auth.uid()
// default + RLS); the browser only sends which session. Counts come from an aggregate function (numbers, never names).

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRelation } from "@/lib/dashboard/profile";

export type CheckinState =
  | { status: "loading" }
  | { status: "unavailable" } // migration not applied yet
  | { status: "error"; message: string }
  | { status: "ready"; mine: Set<string>; counts: Map<string, number> | null };

const iso = (s: string) => new Date(s).toISOString();

export async function loadCheckins(supabase: SupabaseClient, sessionIds: string[]): Promise<CheckinState> {
  const [mine, counts] = await Promise.all([
    // Own rows only (RLS); matched by instant below, so timestamp formatting never matters.
    supabase.from("circle_session_checkins").select("session_start").order("session_start", { ascending: false }).limit(100),
    supabase.rpc("circle_session_counts", { p_starts: sessionIds }),
  ]);
  if (mine.error && isMissingRelation(mine.error)) return { status: "unavailable" };
  if (mine.error) return { status: "error", message: `Couldn't load your check-ins: ${mine.error.message}` };
  return {
    status: "ready",
    mine: new Set((mine.data ?? []).map((r) => iso(r.session_start)).filter((id) => sessionIds.includes(id))),
    // If only the count function is missing, show no numbers rather than wrong ones.
    counts: counts.error || !Array.isArray(counts.data) ? null : new Map(counts.data.map((r: { session_start: string; checkins: number }) => [iso(r.session_start), r.checkins])),
  };
}

export async function checkIn(supabase: SupabaseClient, sessionId: string) {
  const { error } = await supabase.from("circle_session_checkins").insert({ session_start: sessionId });
  if (error && error.code !== "23505") throw new Error(`Couldn't check you in: ${error.message}`);
}

export async function cancelCheckIn(supabase: SupabaseClient, sessionId: string) {
  const { error, count } = await supabase.from("circle_session_checkins").delete({ count: "exact" }).eq("session_start", sessionId);
  if (error) throw new Error(`Couldn't cancel your check-in: ${error.message}`);
  // Never report a cancellation that didn't happen (e.g. the session already started).
  if (count === 0) throw new Error("Couldn't cancel: this check-in no longer exists or the session has started.");
}
