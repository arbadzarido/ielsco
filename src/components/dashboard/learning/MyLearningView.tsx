"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, GraduationCap, Receipt } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader } from "../PageStates";
import { btnLink, btnPrimary, btnSecondary, cardGloss, tag } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ELCO_ENABLED } from "@/lib/elco";
import { cn } from "@/lib/utils";

interface Enrollment {
  id: string;
  course_name: string;
  status: string;
  total_sessions: number | null;
  created_at: string;
  course_sessions: { id: string; mentor_score: number | null; mentor_feedback: string | null }[] | null;
}

interface Payment {
  id: string;
  amount: number | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  metadata: { product_name?: string } | null;
}

type Load<T> = { state: "loading" } | { state: "error"; message: string } | { state: "unavailable" } | { state: "ready"; rows: T[] };

const money = (n: number | null, currency: string | null) =>
  n == null ? "—" : new Intl.NumberFormat("id-ID", { style: "currency", currency: currency || "IDR", maximumFractionDigits: 0 }).format(n);

// My Learning: the courses you're enrolled in and what you've paid for. IELSco sells one-time purchases only;
// there is nothing to renew or cancel here. Elco plans are managed in Elco.
export function MyLearningView({ user, supabase }: DashboardCtx) {
  const { t, locale } = useI18n();
  const [enrollments, setEnrollments] = useState<Load<Enrollment>>({ state: "loading" });
  const [payments, setPayments] = useState<Load<Payment>>({ state: "loading" });

  const load = useCallback(async () => {
    setEnrollments({ state: "loading" });
    setPayments({ state: "loading" });
    const [e, p] = await Promise.all([
      supabase
        .from("course_enrollments")
        .select("id, course_name, status, total_sessions, created_at, course_sessions(id, mentor_score, mentor_feedback)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("transactions").select("id, amount, currency, status, paid_at, metadata").eq("user_id", user.id).order("paid_at", { ascending: false }).limit(50),
    ]);
    setEnrollments(e.error ? { state: "error", message: `Couldn't load your courses: ${e.error.message}` } : { state: "ready", rows: (e.data ?? []) as Enrollment[] });
    // Payment history may not be readable by members yet (depends on the table's RLS); say so instead of failing.
    setPayments(p.error ? { state: "unavailable" } : { state: "ready", rows: (p.data ?? []) as Payment[] });
  }, [supabase, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 md:px-6 md:py-14" data-testid="my-learning-page">
      <PageHeader title={t("nav.myLearning")} description="Your IELS courses and purchases. Courses are one-time purchases: nothing renews automatically.">
        <Link href="/dashboard/programs" data-testid="my-learning-browse" className={btnSecondary}>Browse courses <ArrowRight size={16} /></Link>
      </PageHeader>

      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="mb-4 text-xl font-bold md:text-2xl">My courses</h2>
        {enrollments.state === "loading" && <LoadingState label="Loading your courses…" />}
        {enrollments.state === "error" && <ErrorState message={enrollments.message} onRetry={load} />}
        {enrollments.state === "ready" && enrollments.rows.length === 0 && (
          <EmptyState
            title="No courses yet"
            body="When you join an IELS course, it appears here with your sessions and progress."
            action={<Link href="/dashboard/programs" className={btnPrimary}>See IELS courses</Link>}
          />
        )}
        {enrollments.state === "ready" && enrollments.rows.length > 0 && (
          <ul className="grid gap-5 md:grid-cols-2">
            {enrollments.rows.map((e) => {
              const sessions = e.course_sessions ?? [];
              // Same rule as the course page: a session counts once the mentor has scored it or left feedback.
              const done = sessions.filter((s) => s.mentor_score !== null || !!s.mentor_feedback).length;
              const total = e.total_sessions || sessions.length;
              return (
                <li key={e.id} data-testid="my-learning-course" className={cn(cardGloss, "flex flex-col gap-4 p-6")}>
                  <div className="flex items-start gap-3">
                    <GraduationCap size={22} className="mt-1 shrink-0 text-[#577E90]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold">{e.course_name}</h3>
                      <p className="text-base text-[#2F4157]/60">Joined {date(e.created_at)}</p>
                    </div>
                    <span className={tag}>{e.status === "completed" ? "Completed" : "Active"}</span>
                  </div>
                  {total > 0 && (
                    <div>
                      <div className="mb-1 flex justify-between text-sm text-[#2F4157]/70">
                        <span>{done} of {total} sessions completed</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F1F4F8]" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={`${e.course_name} progress`}>
                        <div className="h-2 rounded-full bg-[#577E90]" style={{ width: `${Math.min(100, (done / total) * 100)}%` }} />
                      </div>
                    </div>
                  )}
                  <Link href="/dashboard/learning/courses" className={cn(btnSecondary, "self-start")}>Open course <ArrowRight size={16} /></Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="purchases-heading">
        <h2 id="purchases-heading" className="mb-4 text-xl font-bold md:text-2xl">Purchases</h2>
        {payments.state === "loading" && <LoadingState label="Loading purchases…" />}
        {payments.state === "unavailable" && (
          <Notice testId="purchases-unavailable">Your payment history can&apos;t be shown here yet. Your purchases are safe; contact IELS through Help if you need a receipt.</Notice>
        )}
        {payments.state === "ready" && payments.rows.length === 0 && <p className="text-base text-[#2F4157]/65">No purchases yet.</p>}
        {payments.state === "ready" && payments.rows.length > 0 && (
          <ul className={cn(cardGloss, "divide-y divide-[#E3E7ED]")}>
            {payments.rows.map((p) => (
              <li key={p.id} data-testid="my-learning-payment" className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                <Receipt size={18} className="text-[#577E90]" aria-hidden="true" />
                <span className="min-w-0 flex-1 font-semibold">{p.metadata?.product_name || "IELS purchase"}</span>
                <span className="text-base text-[#2F4157]/60">{date(p.paid_at)}</span>
                <span className="font-semibold">{money(p.amount, p.currency)}</span>
                <span className={tag}>{p.status === "success" ? "Paid" : p.status ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-base text-[#2F4157]/60">
        {ELCO_ENABLED && "Using Elco AI? Elco plans are separate and managed in Elco. "}Questions about a payment? <Link href="/dashboard/help" className={btnLink}>Get help</Link>
      </p>
    </div>
  );
}
