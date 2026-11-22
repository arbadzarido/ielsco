"use client";

import { useEffect, useState } from "react";
import { loadSnap } from "@/components/dashboard/membership/useMembership";

export type Product = "collective" | "studio" | "one";
export interface CheckoutConfig { enabled: boolean; environment: "production" | "local_test" | null; client_key?: string; snap_js?: string }
export interface Cohort { id: string; product: "collective" | "studio"; name: string; capacity: number; schedule_text: string | null; starts_on: string | null; tutor_name: string | null; seats_left: number }
export interface Plan { code: string; product: "collective" | "studio"; name: string; price_idr: number; period_months: number; capacity_max: number; billing_enabled: boolean }
export interface CourseConfig { checkout: CheckoutConfig; plans: Plan[]; cohorts: Cohort[] }

export const PRODUCT_NAME: Record<Product, string> = { collective: "IELScourse Collective", studio: "IELScourse Studio", one: "IELScourse One" };
export const ORDER_STATUS: Record<string, string> = {
  created: "Starting", pending: "Waiting for payment", paid: "Paid", failed: "Failed", expired: "Expired", cancelled: "Cancelled",
  refunded: "Refunded", partially_refunded: "Partly refunded",
};

export function useCourseConfig() {
  const [cfg, setCfg] = useState<CourseConfig | null>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    fetch("/api/ielscourse/config", { cache: "no-store" }).then((r) => r.json()).then((j) => { if (live) setCfg(j); })
      .catch(() => { if (live) setCfg({ checkout: { enabled: false, environment: null }, plans: [], cohorts: [] }); });
    return () => { live = false; };
  }, [n]);
  return { cfg, reload: () => setN((x) => x + 1) };
}

export type CheckoutBody =
  | { product: "collective" | "studio"; cohort_id: string }
  | { product: "one"; instalment_id: string; agreed: boolean }
  | { product: "one"; package: "starter" | "growth" | "intensive"; option: "full" | "deposit"; agreed: boolean };

// Starts (or continues) a payment: the server creates the order and the Snap token; the price never comes from here.
// Whatever Snap reports, the return page asks the server, which re-checks with Midtrans before showing "paid".
export async function payOnline(body: CheckoutBody): Promise<void> {
  const r = await fetch("/api/ielscourse/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || "Couldn't start the payment. Please try again.");
  const back = () => { window.location.href = `/dashboard/courses/return?order_id=${encodeURIComponent(j.order.order_id)}`; };
  try {
    await loadSnap(j.snap_js, j.client_key);
    window.snap!.pay(j.token, { onSuccess: back, onPending: back, onError: back, onClose: back });
  } catch {
    window.location.href = j.redirect_url; // Snap.js blocked: Midtrans's hosted page, which returns to the same page
  }
}
