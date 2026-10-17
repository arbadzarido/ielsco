// One-click event registration (IELS events and IELS Circle cohorts). No per-event form:
// a registration is just (user_id, event_id) in public.event_registrations. Organisers see who registered,
// with their account details, in the admin-only view public.event_registrants and send reminders by email.

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadAccountDetails, missingForEvents } from "@/lib/dashboard/account";

// Query param that sends a member back to an event and finishes the registration they started.
export const REGISTER_PARAM = "register";

export type RegisterResult = "registered" | "signed-out" | "needs-details";

export function returnPathFor(pathname: string, eventId: string) {
  return `${pathname}?${REGISTER_PARAM}=${encodeURIComponent(eventId)}`;
}

export { wibDeadline } from "./deadline";

export async function isRegistered(supabase: SupabaseClient, userId: string, eventId: string) {
  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error(`Couldn't check your registration: ${error.message}`);
  return !!data;
}

export async function registerForEvent(supabase: SupabaseClient, eventId: string): Promise<RegisterResult> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "signed-out";
  const details = await loadAccountDetails(supabase, data.user);
  if (missingForEvents(details).length) return "needs-details";
  const { error } = await supabase
    .from("event_registrations")
    .upsert({ user_id: data.user.id, event_id: eventId }, { onConflict: "user_id,event_id", ignoreDuplicates: true });
  if (error) throw new Error(`Couldn't register you: ${error.message}`);
  return "registered";
}
