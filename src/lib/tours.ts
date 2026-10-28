// Product tour completion for IELSco (per user, per tour key). Primary storage: public.product_tours
// (RLS: owners only; user_id is the authenticated auth.uid(), never a browser-supplied id).
// localStorage is only a "don't show again on this device" hint (not a record): until the migration is applied the
// tour may show again on another device, which is harmless. Nothing member-owned is kept only in the browser. See supabase/migrations/20261016010000_product_tours.sql.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingRelation } from "@/lib/dashboard/profile";

export type TourStatus = "completed" | "skipped";
// v2 (2026-10-29): the five-menu navigation. Members who finished v1 see the new tour once.
export const IELSCO_DASHBOARD_TOUR = { key: "ielsco-dashboard", version: 2 } as const;

const localKey = (userId: string, key: string) => `iels:tour:${key}:${userId}`;

function readLocal(userId: string, key: string, version: number): TourStatus | null {
  try {
    const raw = window.localStorage.getItem(localKey(userId, key));
    if (!raw) return null;
    const v = JSON.parse(raw) as { status: TourStatus; version: number };
    return v.version >= version ? v.status : null;
  } catch {
    return null;
  }
}

function writeLocal(userId: string, key: string, version: number, status: TourStatus) {
  try {
    window.localStorage.setItem(localKey(userId, key), JSON.stringify({ status, version }));
  } catch {
    /* storage unavailable: the tour may show again, which is harmless */
  }
}

/** Returns the stored status, or null when the user has not finished or skipped this version yet. */
export async function loadTourStatus(supabase: SupabaseClient, userId: string, key: string, version: number): Promise<TourStatus | null> {
  const { data, error } = await supabase.from("product_tours").select("status, version").eq("tour_key", key).maybeSingle();
  if (error) {
    if (!isMissingRelation(error)) console.warn("[tour] could not load tour state:", error.message);
    return readLocal(userId, key, version);
  }
  if (data && data.version >= version) return data.status as TourStatus;
  return readLocal(userId, key, version);
}

export async function saveTourStatus(supabase: SupabaseClient, userId: string, key: string, version: number, status: TourStatus) {
  writeLocal(userId, key, version, status);
  const { error } = await supabase
    .from("product_tours")
    .upsert({ tour_key: key, version, status, updated_at: new Date().toISOString() }, { onConflict: "user_id,tour_key" });
  if (error && !isMissingRelation(error)) console.warn("[tour] could not save tour state:", error.message);
}
