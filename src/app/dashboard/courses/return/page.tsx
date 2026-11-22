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

type Order = { order_id: string; status: string; item_name: string; amount_idr: number; product: string; receipt_no: string | null };

// Where Midtrans sends the student back. The redirect proves nothing: this page asks the server, which re-checks the
// payment with Midtrans, and polls for a while for payments that settle later (bank transfer, QRIS).
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
        const r = await fetch(`/api/ielscourse/orders/${encodeURIComponent(orderId)}?refresh=1`, { cache: "no-store" });
        const o = await r.json();
        if (!alive) return;
        if (!r.ok) { setError(o.message || "We couldn't find that payment."); return; }
        setOrder(o);
        if (["created", "pending"].includes(o.status) && tries.current++ < 20) timer = setTimeout(check, tries.current < 6 ? 3000 : 10000);
      } catch {
        if (alive) setError("We couldn't check the payment. Please refresh in a moment.");
      }
    }
    check();
    return () => { alive = false; clearTimeout(timer); };
  }, [orderId]);

  if (error) return <Box icon={<XCircle className="text-[#B42318]" size={40} />} title="Payment not found" body={error} orderId={orderId} />;
  if (!order) return <LoadingState label="Checking your payment with Midtrans…" />;
  if (order.status === "paid") {
    return <Box icon={<BadgeCheck className="text-[#1F7A4D]" size={40} />} title="Payment confirmed" orderId={orderId}
      body={`${order.item_name} (${idr(order.amount_idr)}) is paid. Receipt ${order.receipt_no}. ${order.product === "one" ? "Your tutoring workspace is open: propose your first session times." : "Your class details are in My Courses."}`}
      primary={order.product === "one" ? { href: "/dashboard/tutoring", label: "Open my tutoring workspace" } : { href: "/dashboard/courses", label: "Go to My Courses" }} />;
  }
  if (["created", "pending"].includes(order.status)) {
    return <Box icon={<Clock className="text-[#B54708]" size={40} />} title="Waiting for your payment" orderId={orderId}
      body="If you chose bank transfer, QRIS or an e-wallet, finish the payment there. This page updates by itself; you can also come back later from My Courses. Nothing starts until Midtrans confirms the payment." />;
  }
  return <Box icon={<XCircle className="text-[#B42318]" size={40} />} title={order.status === "expired" ? "Payment window expired" : "Payment not completed"} orderId={orderId}
    body="No money was taken for this order. You can start a new payment from My Courses." />;
}

function Box({ icon, title, body, orderId, primary }: { icon: React.ReactNode; title: string; body: string; orderId: string; primary?: { href: string; label: string } }) {
  return (
    <section className={cn(cardGloss, "mx-auto mt-8 max-w-xl p-8 text-center")} data-testid="course-return">
      <div className="flex justify-center">{icon}</div>
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-base text-[#2F4157]/80">{body}</p>
      {orderId && <p className="mt-2 text-sm text-[#2F4157]/60">Order {orderId}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link className={btnPrimary} href={primary?.href ?? "/dashboard/courses"}>{primary?.label ?? "Back to My Courses"}</Link>
        {orderId && <Link className={btnSecondary} href={`/dashboard/courses/invoice/${orderId}`}>Invoice / receipt</Link>}
      </div>
    </section>
  );
}

export default function CourseReturnPage() {
  return <DashboardPage>{() => <Suspense fallback={<LoadingState />}><ReturnView /></Suspense>}</DashboardPage>;
}
