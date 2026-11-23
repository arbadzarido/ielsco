"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RefreshCw } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { useTutoringRole } from "@/components/tutoring/dashboard/useStaff";
import { useLocalFormat } from "@/components/time/TimeZoneProvider";
import { cn } from "@/lib/utils";
import { idr } from "@/lib/format";
import { ORDER_STATUS, PRODUCT_NAME, useCourseConfig } from "@/components/ielscourse/checkout";

type Order = {
  order_id: string; product: "collective" | "studio" | "one"; student_id: string; item_name: string; amount_idr: number; status: string; environment: string;
  invoice_no: string; receipt_no: string | null; payment_type: string | null; midtrans_transaction_id: string | null; created_at: string; paid_at: string | null;
  needs_review: boolean; review_reason: string | null; cohort_id: string | null;
};
type Cohort = { id: string; product: "collective" | "studio"; name: string; capacity: number; status: string; schedule_text: string | null; starts_on: string | null; meeting_url: string | null; tutor_name: string | null };
type Membership = { id: string; student_id: string; product: string; cohort_id: string; period_start: string; period_end: string; status: string };
type Ent = { id: string; membership_id: string; student_id: string; kind: string; status: string; ends_at: string };
type Wait = { id: string; product: string; student_id: string; preferred_times: string | null; created_at: string };
type Event = { order_id: string; source: string; transaction_status: string | null; signature_valid: boolean | null; outcome: string; created_at: string };

// IELScourse payment centre (admins): every Midtrans order for Collective, Studio and One, reconciliation, review queue,
// cohorts and seats, renewals due, waiting list and Elco AI activations. Reads through RLS (tutoring_is_admin); writes are
// admin RPCs, re-checked in the database. Manual bank-transfer verification stays in the mentor dashboard as an exception.
export default function PaymentsAdminPage() {
  return <DashboardPage>{({ supabase }) => <Gate supabase={supabase} />}</DashboardPage>;
}

function Gate({ supabase }: { supabase: SupabaseClient }) {
  const role = useTutoringRole(supabase);
  if (!role) return <LoadingState />;
  if (!role.admin) return <ErrorState message="This page is for IELSco admins." />;
  return <Centre supabase={supabase} />;
}

function Centre({ supabase }: { supabase: SupabaseClient }) {
  const fmt = useLocalFormat();
  const { cfg } = useCourseConfig();
  const [d, setD] = useState<{ orders: Order[]; cohorts: Cohort[]; members: Membership[]; ents: Ent[]; wait: Wait[]; names: Record<string, string> } | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ product: "", status: "", q: "", from: "", to: "" });
  const [events, setEvents] = useState<{ id: string; rows: Event[] } | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const [o, c, m, e, w] = await Promise.all([
      supabase.from("course_payment_orders").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("course_cohorts").select("*").order("created_at", { ascending: false }),
      supabase.from("course_memberships").select("id, student_id, product, cohort_id, period_start, period_end, status").order("period_end", { ascending: false }),
      supabase.from("course_entitlements").select("id, membership_id, student_id, kind, status, ends_at").eq("kind", "elco_ai"),
      supabase.from("course_waitlist").select("id, product, student_id, preferred_times, created_at").eq("status", "waiting").order("created_at"),
    ]);
    const bad = o.error || c.error || m.error || e.error || w.error;
    if (bad) { setErr(bad.message); return; }
    const ids = [...new Set([...(o.data ?? []), ...(m.data ?? []), ...(w.data ?? [])].map((x) => x.student_id as string))];
    const u = ids.length ? await supabase.from("users").select("id, full_name, email").in("id", ids) : { data: [] };
    const names = Object.fromEntries(((u.data ?? []) as { id: string; full_name: string | null; email: string | null }[]).map((x) => [x.id, x.full_name || x.email || x.id.slice(0, 8)]));
    setD({ orders: (o.data ?? []) as Order[], cohorts: (c.data ?? []) as Cohort[], members: (m.data ?? []) as Membership[], ents: (e.data ?? []) as Ent[], wait: (w.data ?? []) as Wait[], names });
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(() => (d?.orders ?? []).filter((o) => (!f.product || o.product === f.product) && (!f.status || o.status === f.status)
    && (!f.from || o.created_at >= f.from) && (!f.to || o.created_at <= `${f.to}T23:59:59`)
    && (!f.q || [o.order_id, o.invoice_no, o.receipt_no ?? "", o.midtrans_transaction_id ?? "", d?.names[o.student_id] ?? ""].join(" ").toLowerCase().includes(f.q.toLowerCase()))), [d, f]);

  if (err) return <ErrorState message={err} onRetry={() => { setErr(""); void load(); }} />;
  if (!d || !cfg) return <LoadingState />;
  const paid = d.orders.filter((o) => o.status === "paid" && o.environment === "production");
  const now = Date.now();
  const seats = (c: Cohort) => new Set(d.members.filter((m) => m.cohort_id === c.id && m.status === "active" && new Date(m.period_end).getTime() > now - 3 * 864e5).map((m) => m.student_id)).size;
  const renewals = d.members.filter((m) => m.status === "active" && new Date(m.period_end).getTime() - now < 7 * 864e5 && new Date(m.period_end).getTime() > now - 3 * 864e5
    && !d.members.some((x) => x.student_id === m.student_id && x.product === m.product && x.status === "active" && x.period_end > m.period_end));
  const review = d.orders.filter((o) => o.needs_review);

  return (
    <>
      <PageHeader title="IELScourse payments" description="Midtrans production orders for Collective, Studio and One." />
      <p className="text-base">Tutor assignment, sessions, attendance, materials and announcements: <Link className="font-semibold underline" href="/dashboard/courses/teach">Teach</Link>.</p>
      <p className="text-base" data-testid="gateway-state">Checkout: <strong>{cfg.checkout.enabled ? `open (${cfg.checkout.environment})` : "closed"}</strong>{!cfg.checkout.enabled ? " — set the Midtrans production variables and IELSCOURSE_CHECKOUT_ENABLED on Vercel (docs/IELSCOURSE-PAYMENTS.md)." : ""}</p>

      <section className="mt-4 grid gap-3 sm:grid-cols-4" aria-label="Totals">
        {(["collective", "studio", "one"] as const).map((p) => (
          <div key={p} className={cn(card, "p-4")}><p className="text-sm text-[#2F4157]/70">{PRODUCT_NAME[p]}</p>
            <p className="text-xl font-bold">{idr(paid.filter((o) => o.product === p).reduce((s, o) => s + Number(o.amount_idr), 0))}</p>
            <p className="text-sm">{paid.filter((o) => o.product === p).length} paid</p></div>
        ))}
        <div className={cn(card, "p-4")}><p className="text-sm text-[#2F4157]/70">Needs review</p><p className="text-xl font-bold">{review.length}</p>
          <button className={cn(btnSecondary, "mt-2")} onClick={async () => {
            setNote("Checking with Midtrans…");
            const r = await fetch("/api/ielscourse/admin/reconcile", { method: "POST" }); const j = await r.json().catch(() => ({}));
            setNote(r.ok ? `Checked ${j.checked}, updated ${j.changed}, expired ${j.expired}, reminders ${j.reminded}.` : "Re-check failed."); void load();
          }}><RefreshCw size={16} aria-hidden="true" /> Re-check pending</button></div>
      </section>
      {note && <p role="status" className="mt-2 text-base">{note}</p>}

      {review.length > 0 && (
        <section className={cn(card, "mt-6 p-5")} aria-label="Review queue">
          <h2 className="text-xl font-bold">Review queue</h2>
          <ul className="mt-2 divide-y divide-[#E3E7ED]">{review.map((o) => (
            <li key={o.order_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{o.order_id} · {d.names[o.student_id]} · {idr(Number(o.amount_idr))} · <strong>{o.review_reason}</strong></span>
              <button className={btnSecondary} onClick={async () => {
                const n = window.prompt("What did you do? (refund made, capacity raised, …)"); if (!n) return;
                const { error } = await supabase.rpc("course_admin_resolve_review", { p_order_id: o.order_id, p_note: n }); if (error) alert(error.message); else void load();
              }}>Mark resolved</button>
            </li>))}</ul>
        </section>
      )}

      <section className={cn(card, "mt-6 p-5")} aria-label="Orders">
        <h2 className="text-xl font-bold">Orders</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          <select className={inputClass} value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} aria-label="Product"><option value="">All products</option><option value="collective">Collective</option><option value="studio">Studio</option><option value="one">One</option></select>
          <select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status"><option value="">All statuses</option>{Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input className={inputClass} type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="From" />
          <input className={inputClass} type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} aria-label="To" />
          <input className={inputClass} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Student, order, invoice…" aria-label="Search" />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b text-left"><th className="py-2">Created</th><th>Student</th><th>Product</th><th>Invoice / receipt</th><th>Midtrans</th><th className="text-right">Amount</th><th>Method</th><th>Status</th><th>Paid</th><th /></tr></thead>
            <tbody>{rows.map((o) => (
              <tr key={o.order_id} className="border-b align-top">
                <td className="py-2">{fmt.date(o.created_at)}</td><td>{d.names[o.student_id]}</td><td>{o.item_name}</td>
                <td>{o.invoice_no}{o.receipt_no ? <><br />{o.receipt_no}</> : null}</td><td className="break-all">{o.midtrans_transaction_id ?? "—"}<br /><span className="text-[#2F4157]/60">{o.order_id}</span></td>
                <td className="text-right">{idr(Number(o.amount_idr))}</td><td>{o.payment_type ?? "—"}</td>
                <td><span className={tag}>{ORDER_STATUS[o.status] ?? o.status}</span>{o.environment !== "production" ? <span className="ml-1 text-[#B54708]">test</span> : null}</td>
                <td>{o.paid_at ? fmt.dateTime(o.paid_at) : "—"}</td>
                <td><button className="underline" onClick={async () => {
                  const { data } = await supabase.from("course_payment_events").select("order_id, source, transaction_status, signature_valid, outcome, created_at").eq("order_id", o.order_id).order("created_at");
                  setEvents({ id: o.order_id, rows: (data ?? []) as Event[] });
                }}>Log</button></td>
              </tr>))}</tbody>
          </table>
        </div>
        {events && (
          <div className="mt-3 rounded-xl bg-[#F7F8FA] p-3 text-sm" data-testid="event-log">
            <p className="font-semibold">Audit trail {events.id} <button className="ml-2 underline" onClick={() => setEvents(null)}>close</button></p>
            {events.rows.length === 0 ? <p>No notifications yet.</p> : <ul>{events.rows.map((e, i) => <li key={i}>{fmt.dateTime(e.created_at)} · {e.source} · {e.transaction_status ?? "—"} · signature {e.signature_valid === null ? "n/a" : e.signature_valid ? "ok" : "BAD"} · {e.outcome}</li>)}</ul>}
          </div>
        )}
      </section>

      <section className={cn(card, "mt-6 p-5")} aria-label="Renewals due">
        <h2 className="text-xl font-bold">Renewals due (next 7 days)</h2>
        {renewals.length === 0 ? <p className="mt-2 text-base">None.</p> : <ul className="mt-2">{renewals.map((m) => <li key={m.id} className="py-1">{d.names[m.student_id]} · {PRODUCT_NAME[m.product as "collective"]} · {d.cohorts.find((c) => c.id === m.cohort_id)?.name} · ends {fmt.date(m.period_end)}</li>)}</ul>}
      </section>

      <Cohorts supabase={supabase} cohorts={d.cohorts} seats={seats} onChange={load} />

      <section className={cn(card, "mt-6 p-5")} aria-label="Elco AI activations">
        <h2 className="text-xl font-bold">Elco AI to activate</h2>
        <p className="text-sm text-[#2F4157]/70">Activate in Elco admin (or the partner grant), then record it here. Students see &quot;being activated&quot; until then.</p>
        {d.ents.filter((x) => x.status === "pending_activation").length === 0 ? <p className="mt-2 text-base">None pending.</p> : (
          <ul className="mt-2 divide-y divide-[#E3E7ED]">{d.ents.filter((x) => x.status === "pending_activation").map((x) => (
            <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{d.names[x.student_id]} · until {fmt.date(x.ends_at)}</span>
              <button className={btnSecondary} onClick={async () => {
                const ref = window.prompt("Elco grant reference"); if (!ref) return;
                const { error } = await supabase.rpc("course_admin_set_elco", { p_entitlement: x.id, p_status: "granted", p_reference: ref }); if (error) alert(error.message); else void load();
              }}>Mark granted</button></li>))}</ul>
        )}
      </section>

      <section className={cn(card, "mt-6 p-5")} aria-label="Waiting list">
        <h2 className="text-xl font-bold">Waiting list</h2>
        {d.wait.length === 0 ? <p className="mt-2 text-base">Nobody waiting.</p> : <ul className="mt-2">{d.wait.map((w) => <li key={w.id} className="py-1">{PRODUCT_NAME[w.product as "collective"]} · {d.names[w.student_id]} · {w.preferred_times || "no preference"} · since {fmt.date(w.created_at)}</li>)}</ul>}
      </section>
      <p className="mt-6 text-sm text-[#2F4157]/70">Bank-transfer exceptions for One are verified in the <Link className="underline" href="/dashboard/tutoring/mentor">mentor dashboard</Link>; online payments never need it.</p>
    </>
  );
}

const EMPTY = { id: "", product: "collective" as "collective" | "studio", name: "", capacity: 20, status: "draft", schedule: "", starts_on: "", meeting_url: "", tutor_name: "" };

function Cohorts({ supabase, cohorts, seats, onChange }: { supabase: SupabaseClient; cohorts: Cohort[]; seats: (c: Cohort) => number; onChange: () => void }) {
  const [f, setF] = useState(EMPTY);
  const [msg, setMsg] = useState("");
  return (
    <section className={cn(card, "mt-6 p-5")} aria-label="Class groups">
      <h2 className="text-xl font-bold">Class groups and seats</h2>
      <ul className="mt-2 divide-y divide-[#E3E7ED]">{cohorts.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span><strong>{c.name}</strong> · {PRODUCT_NAME[c.product]} · {seats(c)}/{c.capacity} seats · {c.status} · {c.schedule_text ?? "no schedule yet"}</span>
          <button className={btnSecondary} onClick={() => setF({ id: c.id, product: c.product, name: c.name, capacity: c.capacity, status: c.status, schedule: c.schedule_text ?? "", starts_on: c.starts_on ?? "", meeting_url: c.meeting_url ?? "", tutor_name: c.tutor_name ?? "" })}>Edit</button>
        </li>))}</ul>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={async (ev) => {
        ev.preventDefault(); setMsg("");
        const { error } = await supabase.rpc("course_admin_save_cohort", { p_id: f.id || null, p_product: f.product, p_name: f.name, p_capacity: Number(f.capacity), p_status: f.status,
          p_schedule: f.schedule, p_starts_on: f.starts_on || null, p_meeting_url: f.meeting_url, p_tutor_name: f.tutor_name });
        if (error) setMsg(/open_needs_schedule/.test(error.message) ? "An open group needs a confirmed schedule." : /capacity/.test(error.message) ? "Capacity: Collective up to 20, Studio up to 5, and not below current members." : error.message);
        else { setMsg("Saved."); setF(EMPTY); onChange(); }
      }}>
        <label><span className={labelClass}>Product</span><select className={inputClass} value={f.product} disabled={!!f.id} onChange={(e) => setF({ ...f, product: e.target.value as "collective", capacity: e.target.value === "studio" ? 5 : 20 })}><option value="collective">Collective</option><option value="studio">Studio</option></select></label>
        <label><span className={labelClass}>Name</span><input className={inputClass} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Collective · January A" /></label>
        <label><span className={labelClass}>Capacity</span><input className={inputClass} type="number" min={1} max={f.product === "studio" ? 5 : 20} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} /></label>
        <label><span className={labelClass}>Status</span><select className={inputClass} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="draft">Draft (not for sale)</option><option value="open">Open for sale</option><option value="closed">Closed</option></select></label>
        <label className="sm:col-span-2"><span className={labelClass}>Confirmed schedule (required to open)</span><input className={inputClass} value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })} placeholder="Wednesday and Saturday, 19:30–21:00 WIB" /></label>
        <label><span className={labelClass}>Starts on</span><input className={inputClass} type="date" value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></label>
        <label><span className={labelClass}>Tutor</span><input className={inputClass} value={f.tutor_name} onChange={(e) => setF({ ...f, tutor_name: e.target.value })} /></label>
        <label className="sm:col-span-2"><span className={labelClass}>Meeting link (members only)</span><input className={inputClass} value={f.meeting_url} onChange={(e) => setF({ ...f, meeting_url: e.target.value })} placeholder="https://meet.google.com/…" /></label>
        <div className="flex gap-2 sm:col-span-2"><button className={btnPrimary} type="submit">{f.id ? "Save group" : "Create group"}</button>{f.id && <button type="button" className={btnSecondary} onClick={() => setF(EMPTY)}>Cancel</button>}</div>
        {msg && <p role="status" className="text-base sm:col-span-2">{msg}</p>}
      </form>
    </section>
  );
}
