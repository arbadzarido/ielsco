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

export function useElcoState(supabase: SupabaseClient) {
  const [state, setState] = useState<ElcoState | null>(null);
  const load = useCallback(() => supabase.rpc("my_elco_benefits").then(({ data, error }) =>
    setState(error || !data ? { linked: false, active: false, exams: [] } : ({ linked: false, active: false, exams: [], ...(data as object) } as ElcoState))), [supabase]);
  useEffect(() => { load(); }, [load]);
  return { elco: state, reload: load };
}

export const elcoNextStep = (s: ElcoState | null) => nextStepFor(s, ELCO_URL);
