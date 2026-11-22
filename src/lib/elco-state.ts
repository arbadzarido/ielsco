"use client";
// The signed-in member's Elco connection and Elco-derived access, from public.my_elco_benefits() (IELSco's own database,
// filled by Elco's signed benefit events), and the one Elco next step to offer. Destinations are Elco app routes: a member
// who isn't signed in to Elco there is asked to sign in and comes back to the same page (no public landing page).
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ELCO_URL } from "@/lib/elco";
import { nextStepFor, type ElcoState } from "@/lib/elco-next";
export type { ElcoState } from "@/lib/elco-next";


export const EXAM_NAMES: Record<string, string> = { toefl: "TOEFL ITP", ielts: "IELTS", toeic: "TOEIC L&R" };
export const elcoConnectUrl = () => `${ELCO_URL}/connect/ielsco`;

// The sidebar promo and the page both ask for the same row, so a request that is already in flight (or finished in the
// last few seconds) is shared; `reload()` after the member links or unlinks Elco always asks again.
let shared: { at: number; supabase: SupabaseClient; promise: Promise<ElcoState> } | null = null;
const SHARE_MS = 5_000;

function fetchElco(supabase: SupabaseClient, fresh: boolean): Promise<ElcoState> {
  if (!fresh && shared && shared.supabase === supabase && Date.now() - shared.at < SHARE_MS) return shared.promise;
  const promise = Promise.resolve(supabase.rpc("my_elco_benefits")).then(({ data, error }) =>
    (error || !data ? { linked: false, active: false, exams: [] } : { linked: false, active: false, exams: [], ...(data as object) }) as ElcoState);
  shared = { at: Date.now(), supabase, promise };
  return promise;
}

export function useElcoState(supabase: SupabaseClient) {
  const [state, setState] = useState<ElcoState | null>(null);
  const load = useCallback((fresh = false) => fetchElco(supabase, fresh === true).then(setState), [supabase]);
  useEffect(() => { void load(); }, [load]);
  const reload = useCallback(() => load(true), [load]);
  return { elco: state, reload };
}

export const elcoNextStep = (s: ElcoState | null) => nextStepFor(s, ELCO_URL);
