"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { LoadingState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, cardGloss } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { idr } from "@/lib/format";
import { track } from "@/lib/analytics";

type Order = { order_id: string; status: string; months: number; amount_idr: number };

// Where Midtrans sends the member back. The redirect proves nothing: this page asks the server, which re-checks the
// payment with Midtrans, and polls for a short while for payments that settle a little later (e.g. bank transfer).
function ReturnView() {
  const orderId = useSearchParams().get("order_id") ?? "";
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tries = useRef(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      try {
        const r = await fetch(`/api/membership/orders/${encodeURIComponent(orderId)}?refresh=1`, { cache: "no-store" });
        const o = await r.json();
        if (!alive) return;
        if (!r.ok) { setError(o.message || "We couldn't find that order."); return; }
        setOrder(o);
        if (tries.current === 0) track("membership_payment_returned", { status: o.status });
        tries.current += 1;
        if ((o.status === "pending" || o.status === "created") && tries.current < 20) timer = setTimeout(check, 4000);
      } catch {
        if (alive) setError("We couldn't check the payment. Please refresh in a moment.");
      }
    }
    if (orderId) check(); else setError("Missing order number.");
    return () => { alive = false; clearTimeout(timer); };
  }, [orderId]);

  if (error) {
    return <Result icon={<XCircle size={40} className="text-[#C94F51]" aria-hidden="true" />} title="Something's not right" text={error} />;
  }
  if (!order) return <LoadingState label="Checking your payment with Midtrans…" />;
  if (order.status === "paid") {
    return <Result testId="return-paid" icon={<BadgeCheck size={40} className="text-[#2D7A58]" aria-hidden="true" />} title="Welcome, you're a member"
      text={`Payment of ${idr(order.amount_idr)} confirmed for ${order.months} months. Your member tools are ready.`} primary={{ href: "/dashboard/membership", label: "Open member tools" }} />;
  }
  if (order.status === "pending" || order.status === "created") {
    return <Result testId="return-pending" icon={<Clock size={40} className="text-[#577E90]" aria-hidden="true" />} title="Waiting for your payment"
      text="If you chose bank transfer or another delayed method, finish it using the instructions from Midtrans. This page updates by itself, and your membership starts as soon as Midtrans confirms the payment." primary={{ href: "/dashboard/membership", label: "Back to membership" }} />;
  }
  return <Result testId="return-failed" icon={<XCircle size={40} className="text-[#C94F51]" aria-hidden="true" />} title="The payment didn't go through"
    text="Nothing was charged for this attempt. You can try again from the membership page." primary={{ href: "/dashboard/membership", label: "Try again" }} />;
}

function Result({ icon, title, text, primary, testId }: { icon: React.ReactNode; title: string; text: string; primary?: { href: string; label: string }; testId?: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16" data-testid={testId}>
      <div className={cn(cardGloss, "p-8 text-center")}>
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-4 text-2xl font-bold text-[#1A2534]">{title}</h1>
        <p className="mt-3 text-base text-[#2F4157]/75">{text}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {primary && <Link href={primary.href} className={btnPrimary}>{primary.label}</Link>}
          <Link href="/dashboard" className={btnSecondary}>Dashboard home</Link>
        </div>
      </div>
    </div>
  );
}

export default function MembershipReturnPage() {
  return <DashboardPage>{() => <Suspense fallback={<LoadingState />}><ReturnView /></Suspense>}</DashboardPage>;
}
