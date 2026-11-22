"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

// supabase.auth.getUser() is a network round trip to the auth server (unlike getSession(), which reads the local
// cookie). A dashboard page asks for the signed-in user from five places at once (page wrapper, header badge, account
// menu, records, public header), which used to be five identical requests. This shares the request that is already in
// flight, and the answer for a few seconds, between all callers in the page. A sign-in or sign-out clears it at once, and
// a failed answer is never kept, so the next call tries again.
type Result = Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>;

const TTL_MS = 5_000;
let entry: { at: number; promise: Promise<Result> } | null = null;
let watching = false;

export function getUserOnce(supabase: SupabaseClient): Promise<Result> {
  if (!watching) {
    watching = true;
    supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") entry = null; });
  }
  if (entry && Date.now() - entry.at < TTL_MS) return entry.promise;
  const promise = supabase.auth.getUser();
  const mine = { at: Date.now(), promise };
  entry = mine;
  promise.then((r) => { if (r.error && entry === mine) entry = null; }, () => { if (entry === mine) entry = null; });
  return promise;
}
