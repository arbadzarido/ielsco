"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, Loader2 } from "lucide-react";
import { DashboardPage, type DashboardCtx } from "@/components/dashboard/DashboardPage";
import { LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, cardGloss, tag } from "@/components/dashboard/ui";
import { BuddyMatching, CommunityLinks, FeedbackRequests, MemberSessions } from "@/components/dashboard/membership/MemberTools";
import { loadSnap, useMembership, type Plan } from "@/components/dashboard/membership/useMembership";
import { MEMBER_BENEFITS } from "@/data/membership";
import { cn } from "@/lib/utils";
import { dateWib, idr } from "@/lib/format";
import { track } from "@/lib/analytics";

const ORDER_LABEL: Record<string, string> = {
  created: "Started", pending: "Waiting for payment", paid: "Paid", failed: "Failed", expired: "Expired", cancelled: "Cancelled",
  refunded: "Refunded", partially_refunded: "Partly refunded",
};

function Plans({ plans, checkout, highlight, renew }: { plans: Plan[]; checkout: ReturnType<typeof useMembership>["checkout"]; highlight: string | null; renew: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buyable = plans.filter((p) => p.billing_enabled);

  async function buy(code: string) {
    setBusy(code); setError(null);
    track("membership_checkout_started", { plan: code });
    try {
      const r = await fetch("/api/membership/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan_code: code }) });
      const o = await r.json();
      if (!r.ok) throw new Error(o.message || "Couldn't start the payment.");
      const goReturn = () => { window.location.href = `/dashboard/membership/return?order_id=${o.order_id}`; };
      try {
        await loadSnap(o.snap_js, o.client_key);
        window.snap!.pay(o.token, { onSuccess: goReturn, onPending: goReturn, onError: goReturn, onClose: () => setBusy(null) });
      } catch {
        window.location.href = o.redirect_url; // Snap's hosted page; it returns to the same return URL
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  if (!checkout.enabled || buyable.length === 0) {
    return (
      <div className={cn(card, "p-6")} data-testid="membership-not-open">
        <p className="text-lg font-bold text-[#1A2534]">Membership isn&apos;t open for purchase yet</p>
        <p className="mt-2 text-base text-[#2F4157]/75">We&apos;re opening it to a first group of founding members. Join the list and we&apos;ll email you the price and first session dates.</p>
        <Link href="/membership#founding" className={cn(btnSecondary, "mt-4")}>Join the founding-member list</Link>
      </div>
    );
  }
  return (
    <div data-testid="membership-plans">
      {checkout.environment === "sandbox" && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-[#F2D7A6] bg-[#FFF8EB] px-4 py-3 text-sm text-[#7A5310]" data-testid="sandbox-banner">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Test mode (Midtrans Sandbox): no real money moves. Use Midtrans test payment details.
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2">
        {buyable.map((p) => (
          <li key={p.code} className={cn(cardGloss, "flex flex-col p-6", highlight === p.code && "ring-2 ring-[#2F4157]")}>
            <p className="text-sm font-semibold text-[#577E90]">{p.months} months</p>
            <p className="mt-1 text-3xl font-extrabold text-[#1A2534]">{idr(p.price_idr)}</p>
            <p className="text-sm text-[#2F4157]/65">Paid once · no automatic renewal</p>
            <button type="button" onClick={() => buy(p.code)} disabled={!!busy} className={cn(btnPrimary, "mt-5")} data-testid={`buy-${p.code}`}>
              {busy === p.code && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} {renew ? "Renew" : "Become a member"}
            </button>
          </li>
        ))}
      </ul>
      {renew && <p className="mt-3 text-sm text-[#2F4157]/65">Renewing early is safe: the new period starts when your current one ends.</p>}
      {error && <p className="mt-4 rounded-xl bg-[#FDF1F1] px-4 py-3 text-sm text-[#A23B3D]" role="alert">{error}</p>}
      <p className="mt-4 text-sm text-[#2F4157]/60">Payments are processed by Midtrans. Your membership starts once Midtrans confirms the payment to us.</p>
    </div>
  );
}

function MembershipView({ supabase, user }: DashboardCtx) {
  const params = useSearchParams();
  const { status, plans, checkout, orders, error } = useMembership(supabase);
  if (!status) return <LoadingState />;
  const daysLeft = status.access_until ? Math.ceil((Date.parse(status.access_until) - Date.now()) / 864e5) : null;
  const renewSoon = status.active && daysLeft !== null && daysLeft <= 14;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 md:px-6 md:py-14" data-testid="dashboard-membership">
      <PageHeader title="Membership" description="Your plan, your member tools and your payments." />
      {error && <p className="rounded-xl bg-[#FDF1F1] px-4 py-3 text-base text-[#A23B3D]" role="alert">{error}</p>}

      <section className={cn(cardGloss, "p-6 md:p-8")} data-testid="membership-status">
        {status.active ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-lg font-bold text-[#1A2534]"><BadgeCheck className="text-[#2D7A58]" size={22} aria-hidden="true" /> You&apos;re an IELS member</p>
              <p className="mt-1 text-base text-[#2F4157]/75">Access until <strong>{dateWib(status.access_until!)}</strong>{daysLeft !== null ? ` (${daysLeft} days)` : ""}. Member since {dateWib(status.member_since!)}.</p>
            </div>
            {renewSoon && <span className={cn(tag, "bg-[#FFF3E0] text-[#8A5A00]")} data-testid="renewal-reminder">Ends in {daysLeft} days: renew below</span>}
          </div>
        ) : (
          <div>
            <p className="text-lg font-bold text-[#1A2534]">{status.last_ended_at ? `Your membership ended on ${dateWib(status.last_ended_at)}` : "You're on a free account"}</p>
            <p className="mt-1 text-base text-[#2F4157]/75">Everything free stays yours. Membership adds the tools below.</p>
          </div>
        )}
      </section>

      {status.active ? (
        <div className="grid gap-6">
          <MemberSessions supabase={supabase} isMember />
          <FeedbackRequests supabase={supabase} userId={user.id} />
          <BuddyMatching supabase={supabase} userId={user.id} />
          <CommunityLinks supabase={supabase} />
        </div>
      ) : (
        <section aria-labelledby="what">
          <h2 id="what" className="text-xl font-bold text-[#1A2534]">What members get</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {MEMBER_BENEFITS.map((b) => (
              <li key={b.id} className={cn(card, "flex gap-3 p-4")}><Check size={18} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />
                <span><span className="block font-semibold text-[#1A2534]">{b.title}</span><span className="text-sm text-[#2F4157]/70">{b.howOften}</span></span></li>
            ))}
          </ul>
          <Link href="/membership" className="mt-3 inline-block text-base font-semibold text-[#577E90] underline-offset-4 hover:underline">Full details and limits</Link>
        </section>
      )}

      {(!status.active || renewSoon) && (
        <section aria-labelledby="plans-h">
          <h2 id="plans-h" className="mb-4 text-xl font-bold text-[#1A2534]">{status.active ? "Renew" : "Become a member"}</h2>
          <Plans plans={plans} checkout={checkout} highlight={params.get("plan")} renew={status.active} />
        </section>
      )}

      {orders.length > 0 && (
        <section aria-labelledby="orders-h" data-testid="membership-orders">
          <h2 id="orders-h" className="mb-4 text-xl font-bold text-[#1A2534]">Payments</h2>
          <div className={cn(card, "overflow-x-auto")}>
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="border-b border-[#E3E7ED] text-[#2F4157]/70"><th className="px-4 py-3 font-semibold">Order</th><th className="px-4 py-3 font-semibold">Plan</th><th className="px-4 py-3 font-semibold">Amount</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Date</th></tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.order_id} className="border-b border-[#E3E7ED] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{o.order_id}{o.environment === "sandbox" && <span className={cn(tag, "ml-2")}>test</span>}</td>
                    <td className="px-4 py-3">{o.months} months</td>
                    <td className="px-4 py-3">{idr(o.amount_idr)}</td>
                    <td className="px-4 py-3">{ORDER_LABEL[o.status] ?? o.status}</td>
                    <td className="px-4 py-3">{dateWib(o.paid_at ?? o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-[#2F4157]/60">Problem with a payment? Email hello@ielsco.com with the order number.</p>
        </section>
      )}
    </div>
  );
}

export default function MembershipDashboardPage() {
  return (
    <DashboardPage>
      {(ctx) => <Suspense fallback={<LoadingState />}><MembershipView {...ctx} /></Suspense>}
    </DashboardPage>
  );
}
