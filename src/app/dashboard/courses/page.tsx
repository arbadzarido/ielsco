"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, CalendarDays, CreditCard, Receipt, Users } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { ErrorState, LoadingState, Notice, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { useLocalFormat } from "@/components/time/TimeZoneProvider";
import { cn } from "@/lib/utils";
import { idr } from "@/lib/format";
import { IELSCOURSE_TAGLINE, joinUrl } from "@/components/courses/products";
import { TUTORING_PACKAGES, type PackageId } from "@/components/tutoring/packages";
import { generalRequestUrl } from "@/components/tutoring/packages";
import { ORDER_STATUS, PRODUCT_NAME, payOnline, useCourseConfig, type Cohort, type CourseConfig } from "@/components/ielscourse/checkout";

type Membership = { id: string; product: "collective" | "studio"; cohort_id: string; order_id: string; period_start: string; period_end: string; status: string };
type Entitlement = { membership_id: string; kind: "circle" | "elco_ai"; status: string; ends_at: string };
type CohortRow = { id: string; name: string; schedule_text: string | null; meeting_url: string | null; starts_on: string | null; tutor_name: string | null; status: string };
type OrderRow = { order_id: string; product: string; item_name: string; amount_idr: number; status: string; invoice_no: string; receipt_no: string | null; created_at: string; paid_at: string | null };
type Enrolment = { id: string; package_code: PackageId; status: string };

// IELScourse "My Courses": every product a student holds (Collective, Studio, One) in one place, with online checkout,
// renewals and invoices/receipts. All reads go through RLS; all purchases go through /api/ielscourse/checkout.
export default function CoursesPage() {
  return (
    <DashboardPage>
      {({ supabase }) => <Suspense fallback={<LoadingState />}><Hub supabase={supabase} /></Suspense>}
    </DashboardPage>
  );
}

function Hub({ supabase }: { supabase: SupabaseClient }) {
  const fmt = useLocalFormat();
  const join = useSearchParams().get("join");
  const { cfg } = useCourseConfig();
  const [data, setData] = useState<{ memberships: Membership[]; ents: Entitlement[]; cohorts: CohortRow[]; orders: OrderRow[]; enrolments: Enrolment[]; waitlist: { product: string }[] } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [m, e, o, t, w] = await Promise.all([
      supabase.from("course_memberships").select("id, product, cohort_id, order_id, period_start, period_end, status").order("period_end", { ascending: false }),
      supabase.from("course_entitlements").select("membership_id, kind, status, ends_at"),
      supabase.from("course_payment_orders").select("order_id, product, item_name, amount_idr, status, invoice_no, receipt_no, created_at, paid_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("tutoring_enrolments").select("id, package_code, status").neq("status", "cancelled").order("created_at", { ascending: false }),
      supabase.from("course_waitlist").select("product").eq("status", "waiting"),
    ]);
    const firstErr = m.error || e.error || o.error || t.error;
    if (firstErr) { setErr(/course_/.test(firstErr.message) ? "My Courses isn't switched on in this environment yet." : firstErr.message); return; }
    const ids = [...new Set((m.data ?? []).map((x) => x.cohort_id))];
    const c = ids.length ? await supabase.from("course_cohorts").select("id, name, schedule_text, meeting_url, starts_on, tutor_name, status").in("id", ids) : { data: [] };
    setData({ memberships: (m.data ?? []) as Membership[], ents: (e.data ?? []) as Entitlement[], orders: (o.data ?? []) as OrderRow[], enrolments: (t.data ?? []) as Enrolment[],
      cohorts: (c.data ?? []) as CohortRow[], waitlist: (w.data ?? []) as { product: string }[] });
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (join && data) document.getElementById(`join-${join}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [join, data]);

  if (err) return <ErrorState message={err} onRetry={() => { setErr(""); void load(); }} />;
  if (!data || !cfg) return <LoadingState />;
  const now = Date.now();
  // The latest period per product decides what the student sees.
  const current = (["collective", "studio"] as const).map((p) => data.memberships.find((x) => x.product === p && x.status === "active")).filter(Boolean) as Membership[];

  return (
    <>
      <PageHeader title="My Courses" description={`IELScourse. ${IELSCOURSE_TAGLINE}`} />
      {!cfg.checkout.enabled && (
        <Notice testId="checkout-closed">Online payment is opening soon. Until then, register with the team on WhatsApp and they will confirm your class and payment.</Notice>
      )}

      {(current.length > 0 || data.enrolments.length > 0) && (
        <section className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Your classes">
          {current.map((m) => {
            const c = data.cohorts.find((x) => x.id === m.cohort_id);
            const later = data.memberships.filter((x) => x.product === m.product && x.status === "active" && new Date(x.period_end) > new Date(m.period_end));
            const end = new Date(m.period_end).getTime(), activeNow = end > now && new Date(m.period_start).getTime() <= now;
            const upcoming = new Date(m.period_start).getTime() > now;
            const renewSoon = !later.length && end - now < 10 * 864e5;
            const ents = data.ents.filter((x) => x.membership_id === m.id);
            return (
              <article key={m.id} className={cn(card, "p-5")} data-testid={`membership-${m.product}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-sm font-semibold uppercase tracking-wide text-[#577E90]">{PRODUCT_NAME[m.product]}</p>
                    <h2 className="mt-1 text-xl font-bold">{c?.name ?? "Your class group"}</h2></div>
                  <span className={tag}>{activeNow ? "Active" : upcoming ? "Starts soon" : end > now - 3 * 864e5 ? "Renewal due" : "Ended"}</span>
                </div>
                {c?.schedule_text && <p className="mt-3 flex items-center gap-2 text-base"><CalendarDays size={16} aria-hidden="true" /> {c.schedule_text}{c.starts_on ? ` · from ${fmt.date(c.starts_on)}` : ""}</p>}
                {c?.tutor_name && <p className="mt-1 flex items-center gap-2 text-base"><Users size={16} aria-hidden="true" /> Tutor: {c.tutor_name}</p>}
                <p className="mt-2 text-base">Paid until <strong>{fmt.date(later[0]?.period_end ?? m.period_end)}</strong></p>
                <p className="mt-1 text-sm text-[#2F4157]/70">IELS Circle: {ents.find((x) => x.kind === "circle")?.status === "active" ? "included" : "ended"} · Elco AI: {ents.find((x) => x.kind === "elco_ai")?.status === "granted" ? "active" : ents.find((x) => x.kind === "elco_ai")?.status === "pending_activation" ? "being activated by the team" : "ended"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {c?.meeting_url && activeNow && <a className={btnPrimary} href={c.meeting_url} target="_blank" rel="noopener noreferrer">Join class <ArrowUpRight size={16} aria-hidden="true" /></a>}
                  {renewSoon && cfg.checkout.enabled && <PayButton label={`Renew 1 month · ${idr(cfg.plans.find((p) => p.product === m.product)?.price_idr ?? 0)}`} body={{ product: m.product, cohort_id: m.cohort_id }} secondary={!!c?.meeting_url && activeNow} />}
                </div>
              </article>
            );
          })}
          {data.enrolments.map((t) => (
            <article key={t.id} className={cn(card, "p-5")} data-testid="membership-one">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#577E90]">{PRODUCT_NAME.one}</p>
              <h2 className="mt-1 text-xl font-bold">{TUTORING_PACKAGES.find((p) => p.id === t.package_code)?.name} package</h2>
              <p className="mt-2 text-base">{t.status === "pending_payment" ? "Waiting for your first payment." : t.status === "active" ? "Active. Book sessions and see your feedback in your workspace." : t.status === "payment_review" ? "A payment needs attention." : "Completed."}</p>
              <Link className={cn(btnPrimary, "mt-4")} href="/dashboard/tutoring">Open my tutoring workspace</Link>
            </article>
          ))}
        </section>
      )}

      <JoinGroup product="collective" cfg={cfg} mine={current.find((m) => m.product === "collective")} waiting={data.waitlist.some((w) => w.product === "collective")} supabase={supabase} onChange={load} />
      <JoinGroup product="studio" cfg={cfg} mine={current.find((m) => m.product === "studio")} waiting={data.waitlist.some((w) => w.product === "studio")} supabase={supabase} onChange={load} />
      <JoinOne cfg={cfg} hasUnpaid={data.enrolments.some((e) => e.status === "pending_payment")} />

      <section className={cn(card, "mt-6 p-5 sm:p-6")} aria-label="Payments" data-testid="course-payments">
        <h2 className="text-xl font-bold">Payments, invoices &amp; receipts</h2>
        {data.orders.length === 0 ? <p className="mt-2 text-base text-[#2F4157]/70">No payments yet.</p> : (
          <ul className="mt-3 divide-y divide-[#E3E7ED]">
            {data.orders.map((o) => (
              <li key={o.order_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><p className="font-semibold">{o.item_name} · {idr(Number(o.amount_idr))}</p>
                  <p className="text-sm text-[#2F4157]/70">{o.invoice_no} · {fmt.date(o.created_at)} · {ORDER_STATUS[o.status] ?? o.status}</p></div>
                <div className="flex gap-2">
                  {o.status === "pending" && <Link className={btnSecondary} href={`/dashboard/courses/return?order_id=${o.order_id}`}>Check status</Link>}
                  <Link className={btnSecondary} href={`/dashboard/courses/invoice/${o.order_id}`}><Receipt size={16} aria-hidden="true" /> {o.receipt_no ? "Receipt" : "Invoice"}</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function PayButton({ label, body, secondary, disabled }: { label: string; body: Parameters<typeof payOnline>[0]; secondary?: boolean; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <span className="inline-flex flex-col gap-1">
      <button className={secondary ? btnSecondary : btnPrimary} disabled={busy || disabled} onClick={async () => {
        setBusy(true); setErr("");
        try { await payOnline(body); } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't start the payment."); setBusy(false); }
      }}><CreditCard size={16} aria-hidden="true" /> {busy ? "Opening payment…" : label}</button>
      {err && <span role="alert" className="text-sm text-[#B42318]">{err}</span>}
    </span>
  );
}

function JoinGroup({ product, cfg, mine, waiting, supabase, onChange }: { product: "collective" | "studio"; cfg: CourseConfig; mine?: Membership; waiting: boolean; supabase: SupabaseClient; onChange: () => void }) {
  const plan = cfg.plans.find((p) => p.product === product);
  const cohorts = cfg.cohorts.filter((c: Cohort) => c.product === product);
  const [pref, setPref] = useState("");
  const [msg, setMsg] = useState("");
  if (mine) return null;
  const blurb = product === "collective" ? "Public group classes, up to 20 students. 3 live classes a week, Elco AI and IELS Circle included." : "Small group of 3 to 5 students. 4 live sessions a month, more tutor attention, Elco AI and IELS Circle included.";
  return (
    <section id={`join-${product}`} className={cn(card, "mt-6 scroll-mt-24 p-5 sm:p-6")} aria-label={`Join ${PRODUCT_NAME[product]}`} data-testid={`join-${product}`}>
      <h2 className="text-xl font-bold">{PRODUCT_NAME[product]} · {plan ? idr(plan.price_idr) : ""} a month</h2>
      <p className="mt-1 text-base text-[#2F4157]/80">{blurb}</p>
      {cohorts.length > 0 && (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {cohorts.map((c) => (
            <li key={c.id} className="rounded-xl border border-[#E3E7ED] p-4">
              <p className="font-semibold">{c.name}</p>
              <p className="text-base">{c.schedule_text}</p>
              <p className="text-sm text-[#2F4157]/70">{c.starts_on ? `Starts ${c.starts_on} · ` : ""}{c.seats_left > 0 ? `${c.seats_left} of ${c.capacity} seats left` : "Full"}</p>
              <div className="mt-3">
                {cfg.checkout.enabled && c.seats_left > 0 ? <PayButton label={`Pay ${idr(plan?.price_idr ?? 0)} and join`} body={{ product, cohort_id: c.id }} />
                  : c.seats_left > 0 ? <a className={btnPrimary} href={joinUrl(product)} target="_blank" rel="noopener noreferrer">Register on WhatsApp</a> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {cohorts.every((c) => c.seats_left === 0) && (
        <div className="mt-4">
          {waiting ? <p className="text-base">You&apos;re on the waiting list. We&apos;ll message you when a group with your times opens.</p> : (
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={async (ev) => {
              ev.preventDefault();
              const { error } = await supabase.rpc("course_join_waitlist", { p_product: product, p_preferred: pref });
              setMsg(error ? "Couldn't join the waiting list. Please try again." : "You're on the waiting list."); if (!error) onChange();
            }}>
              <label className="flex-1"><span className={labelClass}>{cohorts.length ? "All groups are full. " : "No group is open right now. "}Your preferred days and times</span>
                <input className={inputClass} value={pref} onChange={(e) => setPref(e.target.value)} maxLength={300} placeholder="e.g. weekday evenings after 19:00 WIB" /></label>
              <button className={btnSecondary} type="submit">Join the waiting list</button>
            </form>
          )}
          {msg && <p role="status" className="mt-2 text-base">{msg}</p>}
        </div>
      )}
      <p className="mt-3 text-sm text-[#2F4157]/70">Your seat is held for 60 minutes while you pay. Your class starts only after the payment is confirmed by Midtrans; a later month starts when your current month ends.</p>
    </section>
  );
}

function JoinOne({ cfg, hasUnpaid }: { cfg: CourseConfig; hasUnpaid: boolean }) {
  const [pkg, setPkg] = useState<PackageId>("growth");
  const [option, setOption] = useState<"full" | "deposit">("full");
  const [agreed, setAgreed] = useState(false);
  const p = TUTORING_PACKAGES.find((x) => x.id === pkg)!;
  const deposit = pkg === "intensive" && option === "deposit";
  const first = deposit ? Math.round(p.priceIdr * 0.5) : p.priceIdr;
  return (
    <section id="join-one" className={cn(card, "mt-6 scroll-mt-24 p-5 sm:p-6")} aria-label="Start IELScourse One" data-testid="join-one">
      <h2 className="text-xl font-bold">{PRODUCT_NAME.one} · private 1-on-1</h2>
      <p className="mt-1 text-base text-[#2F4157]/80">Sessions with your mentor, a personal roadmap and feedback, 1 month of Elco AI and IELS Circle. You propose times; your mentor confirms.</p>
      {hasUnpaid && <p className="mt-2 text-base">You have a package waiting for payment: pay it from your <Link className="font-semibold underline" href="/dashboard/tutoring">tutoring workspace</Link>.</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Package">
        {TUTORING_PACKAGES.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={pkg === x.id} onClick={() => { setPkg(x.id); if (x.id !== "intensive") setOption("full"); }}
            className={cn("rounded-xl border p-4 text-left", pkg === x.id ? "border-[#2F4157] bg-[#F7F8FA]" : "border-[#E3E7ED]")}>
            <span className="block font-semibold">{x.name} · {x.sessions} sessions</span><span className="block text-base">{idr(x.priceIdr)}</span>
          </button>
        ))}
      </div>
      {pkg === "intensive" && (
        <fieldset className="mt-4"><legend className={labelClass}>How would you like to pay?</legend>
          <label className="mr-6 inline-flex items-center gap-2 text-base"><input type="radio" checked={option === "full"} onChange={() => setOption("full")} /> Full payment</label>
          <label className="inline-flex items-center gap-2 text-base"><input type="radio" checked={option === "deposit"} onChange={() => setOption("deposit")} /> Deposit 50% now, 25% after session 2, 25% before the final two sessions</label>
        </fieldset>
      )}
      <label className="mt-4 flex items-start gap-2 text-base"><input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>I agree to the payment schedule{deposit ? " (the same total as paying in full; later sessions are scheduled once each instalment is paid)" : ""} and understand my package starts after the payment is confirmed.</span></label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {cfg.checkout.enabled ? <PayButton label={`Pay ${idr(first)}${deposit ? " deposit" : ""}`} body={{ product: "one", package: pkg, option, agreed }} disabled={!agreed} />
          : <a className={btnPrimary} href={generalRequestUrl()} target="_blank" rel="noopener noreferrer">Register on WhatsApp</a>}
        <Link className={btnSecondary} href="/products/courses#one">Compare packages</Link>
      </div>
    </section>
  );
}
