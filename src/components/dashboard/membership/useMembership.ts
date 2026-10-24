"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface MembershipStatus {
  active: boolean;
  plan_code: string | null;
  current_ends_at: string | null;
  access_until: string | null;
  member_since: string | null;
  last_ended_at: string | null;
}
export interface Plan { code: string; name: string; months: number; price_idr: number; billing_enabled: boolean }
export interface Checkout { enabled: boolean; environment: "sandbox" | "production" | null; client_key?: string; snap_js?: string; reason?: string }
export interface Order { order_id: string; plan_code: string; months: number; amount_idr: number; status: string; environment: string; created_at: string; paid_at: string | null }

const EMPTY: MembershipStatus = { active: false, plan_code: null, current_ends_at: null, access_until: null, member_since: null, last_ended_at: null };

// Membership status comes from public.my_membership() (the database decides); plans and checkout availability from the
// server; orders from the server after it re-checks open ones with Midtrans.
export function useMembership(supabase: SupabaseClient) {
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkout, setCheckout] = useState<Checkout>({ enabled: false, environment: null });
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const [m, cfg, ord] = await Promise.all([
      supabase.rpc("my_membership"),
      fetch("/api/membership/config", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      fetch("/api/membership/orders", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { orders: [] })).catch(() => ({ orders: [] })),
    ]);
    if (m.error) {
      setError(/my_membership/.test(m.error.message) ? "Membership isn't switched on in this environment yet." : "Couldn't load your membership. Please try again.");
      setStatus(EMPTY);
    } else {
      setStatus({ ...EMPTY, ...(m.data as Partial<MembershipStatus>) });
    }
    if (cfg) { setPlans(cfg.plans ?? []); setCheckout(cfg.checkout ?? { enabled: false, environment: null }); }
    setOrders(ord?.orders ?? []);
  }, [supabase]);

  useEffect(() => { reload(); }, [reload]);
  return { status, plans, checkout, orders, error, reload };
}

declare global {
  interface Window { snap?: { pay: (token: string, cb: Record<string, (r?: unknown) => void>) => void } }
}

// Loads Midtrans Snap once (the client key is public by design).
export function loadSnap(src: string, clientKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.snap) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.dataset.clientKey = clientKey;
    s.onload = () => (window.snap ? resolve() : reject(new Error("snap missing")));
    s.onerror = () => reject(new Error("snap failed to load"));
    document.head.appendChild(s);
  });
}
