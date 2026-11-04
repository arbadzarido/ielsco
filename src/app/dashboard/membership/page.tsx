"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, BadgeCheck, Check, Link2 } from "lucide-react";
import { DashboardPage, type DashboardCtx } from "@/components/dashboard/DashboardPage";
import { LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, cardGloss, tag } from "@/components/dashboard/ui";
import { BuddyMatching, CommunityLinks, ElcoBenefitCard, FeedbackRequests, MemberSessions, elcoKinds } from "@/components/dashboard/membership/MemberTools";
import { useMembership } from "@/components/dashboard/membership/useMembership";
import { useElcoState } from "@/lib/elco-state";
import { ELCO_LINK_URL, ELCO_PLANS, ELCO_PRICING_URL, HOW_BENEFITS_REACH_IELSCO } from "@/data/membership";
import { tutorRequestUrl, TUTOR_PRICE_LABEL } from "@/components/tutoring/links";
import { cn } from "@/lib/utils";
import { dateWib, idr } from "@/lib/format";

// IELSco has no membership of its own. Paid benefits come from an Elco AI subscription (Starter / Pro), synced to this
// account once the Elco account is linked, and are read from public.my_elco_benefits() (via useElcoState). The legacy IELS
// Member period (public.my_membership) is still honoured for people who already hold one, but nothing here sells it.
const ORDER_LABEL: Record<string, string> = {
  created: "Started", pending: "Waiting for payment", paid: "Paid", failed: "Failed", expired: "Expired", cancelled: "Cancelled",
  refunded: "Refunded", partially_refunded: "Partly refunded",
};

function StatusCard({ linked, active, tier, endsAt }: { linked: boolean; active: boolean; tier?: "starter" | "pro"; endsAt?: string }) {
  if (active) {
    return (
      <div>
        <p className="flex items-center gap-2 text-lg font-bold text-[#1A2534]"><BadgeCheck className="text-[#2D7A58]" size={22} aria-hidden="true" /> Elco {tier === "pro" ? "Pro" : "Starter"} is active on IELSco</p>
        <p className="mt-1 text-base text-[#2F4157]/75">Your benefits come from your linked Elco account{endsAt ? <> and run until <strong>{dateWib(endsAt)}</strong></> : ""}.</p>
      </div>
    );
  }
  if (linked) {
    return (
      <div>
        <p className="text-lg font-bold text-[#1A2534]">Your Elco account is linked, with no active Starter or Pro plan</p>
        <p className="mt-1 text-base text-[#2F4157]/75">Paid benefits start when you subscribe to Elco Starter or Pro. They sync to this account automatically.</p>
        <div className="mt-4"><a href={ELCO_PRICING_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="membership-plans-cta">See Elco plans <ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-lg font-bold text-[#1A2534]">You&apos;re on a free IELSco account</p>
      <p className="mt-1 text-base text-[#2F4157]/75">Everything free stays yours. If you have an Elco Starter or Pro plan, link your Elco account and your benefits sync here automatically. If you don&apos;t, you can subscribe in Elco AI.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={ELCO_LINK_URL} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="membership-link-cta"><Link2 size={16} aria-hidden="true" /> Link your Elco account</a>
        <a href={ELCO_PRICING_URL} target="_blank" rel="noopener noreferrer" className={btnSecondary} data-testid="membership-plans-cta">See Elco plans <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </div>
  );
}

function MembershipView({ supabase, user }: DashboardCtx) {
  const { status, orders, error } = useMembership(supabase);
  const { elco } = useElcoState(supabase);
  if (!status || !elco) return <LoadingState />;
  const hasBenefit = elco.active;
  const legacyActive = status.active; // an earlier IELS Member period that is still running (not sold any more)

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 md:px-6 md:py-14" data-testid="dashboard-membership">
      <PageHeader title="Membership" description="IELSco membership comes with your Elco AI plan. There is no separate IELSco subscription." />
      {error && <p className="rounded-xl bg-[#FDF1F1] px-4 py-3 text-base text-[#A23B3D]" role="alert">{error}</p>}

      <section className={cn(cardGloss, "p-6 md:p-8")} data-testid="membership-status">
        <StatusCard linked={elco.linked} active={hasBenefit} tier={elco.tier} endsAt={elco.ends_at} />
      </section>

      {hasBenefit && <ElcoBenefitCard benefit={elco} />}
      {(hasBenefit || legacyActive) && <MemberSessions supabase={supabase} isMember={legacyActive} elco={elcoKinds(elco)} />}

      {legacyActive && (
        <section className="space-y-6" aria-labelledby="legacy-h" data-testid="legacy-member">
          <div>
            <h2 id="legacy-h" className="text-xl font-bold text-[#1A2534]">Your earlier IELS Member access</h2>
            <p className="mt-1 text-base text-[#2F4157]/75">You hold an IELS Member period from before membership moved to Elco AI. It stays active until <strong>{dateWib(status.access_until!)}</strong>. It can&apos;t be renewed; Elco Starter and Pro now carry membership benefits.</p>
          </div>
          <FeedbackRequests supabase={supabase} userId={user.id} />
          <BuddyMatching supabase={supabase} userId={user.id} />
          <CommunityLinks supabase={supabase} />
        </section>
      )}

      <section aria-labelledby="plans-h" data-testid="elco-plans">
        <h2 id="plans-h" className="text-xl font-bold text-[#1A2534]">Elco plans and what they add on IELSco</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {ELCO_PLANS.map((p) => {
            const mine = hasBenefit && elco.tier === p.id;
            return (
              <li key={p.id} className={cn(card, "flex flex-col p-5", mine && "ring-2 ring-[#2F4157]")} data-testid={`elco-plan-${p.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-bold text-[#1A2534]">{p.name}</p>
                  {mine && <span className={tag}>Your plan</span>}
                </div>
                <ul className="mt-3 flex-1 space-y-2 text-base text-[#2F4157]/85">
                  <li className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{p.elco}</li>
                  {p.ielsco.map((t) => <li key={t} className="flex gap-2"><Check size={17} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{t}</li>)}
                </ul>
                {!mine && <a href={ELCO_PRICING_URL} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "mt-4 self-start")}>{hasBenefit ? "Compare in Elco" : `Get ${p.name}`} <ArrowUpRight size={15} aria-hidden="true" /></a>}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-[#2F4157]/60">{hasBenefit ? "" : "These benefits are not active on your account. "}Billing is handled by Elco AI, and benefits sync to IELSco after you link your accounts.</p>
        <details className="mt-3 text-base text-[#2F4157]/80">
          <summary className="cursor-pointer font-semibold text-[#577E90]">How benefits reach your IELSco account</summary>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            {HOW_BENEFITS_REACH_IELSCO.map((s) => <li key={s.title}><strong>{s.title}.</strong> {s.text}</li>)}
          </ol>
        </details>
      </section>

      <section className={cn(card, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")} data-testid="membership-tutoring">
        <div>
          <p className="text-lg font-bold text-[#1A2534]">Want a person to work with you?</p>
          <p className="text-base text-[#2F4157]/75">Private tutoring is separate from Elco plans: {TUTOR_PRICE_LABEL}, requested per session.</p>
        </div>
        <a href={tutorRequestUrl()} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "shrink-0")}>Request a private tutor <ArrowUpRight size={15} aria-hidden="true" /></a>
      </section>

      {orders.length > 0 && (
        <section aria-labelledby="orders-h" data-testid="membership-orders">
          <h2 id="orders-h" className="mb-4 text-xl font-bold text-[#1A2534]">Earlier IELS Member payments</h2>
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
          <p className="mt-3 text-sm text-[#2F4157]/60">Question about an earlier payment? Email hello@ielsco.com with the order number. <Link href="/membership" className="font-semibold text-[#577E90] underline-offset-4 hover:underline">How membership works now</Link></p>
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
