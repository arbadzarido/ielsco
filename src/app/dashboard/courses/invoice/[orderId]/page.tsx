"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Printer } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ErrorState, LoadingState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card } from "@/components/dashboard/ui";
import { useLocalFormat } from "@/components/time/TimeZoneProvider";
import { cn } from "@/lib/utils";
import { idr } from "@/lib/format";
import { ORDER_STATUS } from "@/components/ielscourse/checkout";

type Order = {
  order_id: string; product: string; item_name: string; amount_idr: number; status: string; invoice_no: string; receipt_no: string | null;
  created_at: string; paid_at: string | null; payment_type: string | null; midtrans_transaction_id: string | null; student_id: string;
};
const METHOD: Record<string, string> = { bank_transfer: "Bank transfer (virtual account)", echannel: "Mandiri bill", qris: "QRIS", gopay: "GoPay", shopeepay: "ShopeePay", credit_card: "Card", cstore: "Retail outlet", akulaku: "Akulaku" };

// Invoice (unpaid) or receipt (paid) for one IELScourse order, generated from the order record. Printable / save as PDF.
export default function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  return <DashboardPage>{({ supabase, profile }) => <Doc supabase={supabase} orderId={orderId} name={profile.display_name || ""} />}</DashboardPage>;
}

function Doc({ supabase, orderId, name }: { supabase: SupabaseClient; orderId: string; name: string }) {
  const fmt = useLocalFormat();
  const [o, setO] = useState<Order | null | undefined>(undefined);
  useEffect(() => {
    supabase.from("course_payment_orders").select("order_id, product, item_name, amount_idr, status, invoice_no, receipt_no, created_at, paid_at, payment_type, midtrans_transaction_id, student_id")
      .eq("order_id", orderId).maybeSingle().then(({ data }) => setO((data as Order) ?? null));
  }, [supabase, orderId]);
  if (o === undefined) return <LoadingState />;
  if (o === null) return <ErrorState message="This invoice wasn't found." />;
  const paid = ["paid", "partially_refunded", "refunded"].includes(o.status) && o.receipt_no;
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Link className={btnSecondary} href="/dashboard/courses">Back to My Courses</Link>
        <button className={btnPrimary} onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print or save as PDF</button>
      </div>
      <article className={cn(card, "mx-auto max-w-2xl p-8 print:border-0")} data-testid="course-invoice">
        <header className="flex items-start justify-between gap-4">
          <div><p className="text-2xl font-bold">{paid ? "Receipt" : "Invoice"}</p><p className="text-base">{paid ? o.receipt_no : o.invoice_no}</p></div>
          <div className="text-right text-sm"><p className="font-semibold">IELSco · IELScourse</p><p>www.ielsco.com</p></div>
        </header>
        <dl className="mt-6 grid grid-cols-2 gap-y-2 text-base">
          <dt className="text-[#2F4157]/70">Billed to</dt><dd>{name || "Student"}</dd>
          <dt className="text-[#2F4157]/70">Invoice</dt><dd>{o.invoice_no}</dd>
          <dt className="text-[#2F4157]/70">Issued</dt><dd>{fmt.date(o.created_at)}</dd>
          <dt className="text-[#2F4157]/70">Order</dt><dd className="break-all">{o.order_id}</dd>
          <dt className="text-[#2F4157]/70">Status</dt><dd>{ORDER_STATUS[o.status] ?? o.status}</dd>
          {o.paid_at && <><dt className="text-[#2F4157]/70">Paid</dt><dd>{fmt.dateTime(o.paid_at)}</dd></>}
          {o.payment_type && <><dt className="text-[#2F4157]/70">Method</dt><dd>{METHOD[o.payment_type] ?? o.payment_type} via Midtrans</dd></>}
          {o.midtrans_transaction_id && <><dt className="text-[#2F4157]/70">Midtrans ref.</dt><dd className="break-all">{o.midtrans_transaction_id}</dd></>}
        </dl>
        <table className="mt-6 w-full text-base">
          <thead><tr className="border-b border-[#E3E7ED] text-left"><th className="py-2">Item</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody><tr className="border-b border-[#E3E7ED]"><td className="py-2">{o.item_name}</td><td className="py-2 text-right">{idr(Number(o.amount_idr))}</td></tr></tbody>
          <tfoot><tr><td className="py-2 font-bold">{paid ? "Paid" : "Total due"}</td><td className="py-2 text-right font-bold">{idr(Number(o.amount_idr))}</td></tr></tfoot>
        </table>
        <p className="mt-6 text-sm text-[#2F4157]/70">{paid ? "This receipt was issued automatically after Midtrans confirmed the payment." : "Pay online from My Courses. Access starts only after Midtrans confirms the payment."} Questions: contact the IELSco team on WhatsApp.</p>
      </article>
    </>
  );
}
