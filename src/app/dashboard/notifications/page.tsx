"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BellOff, BookOpen, BriefcaseBusiness, CalendarDays, MessageCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { useMyRecords } from "@/components/dashboard/useMyRecords";
import { MUTED_EVENT, readMuted, writeMuted } from "@/components/dashboard/useHeaderCounts";
import { ACCENTS, cardGloss, focusRing, type Accent } from "@/components/dashboard/ui";
import { NOTIFICATION_CATEGORIES, buildNotifications, type NotificationCategory } from "@/lib/me/notifications";
import { cn } from "@/lib/utils";

const STYLE: Record<NotificationCategory, { icon: LucideIcon; accent: Accent }> = {
  social: { icon: MessageCircle, accent: "violet" }, events: { icon: CalendarDays, accent: "coral" },
  opportunities: { icon: BriefcaseBusiness, accent: "amber" }, learning: { icon: BookOpen, accent: "teal" },
};

// Notifications Center: derived from the member's own records (lib/me/notifications.ts), so it's always current.
// Category switches decide what counts towards the bell badge on this device; nothing is emailed or pushed.
function NotificationsView({ user }: { user: User }) {
  const { state, reload } = useMyRecords(user.id);
  const [muted, setMuted] = useState<Set<NotificationCategory>>(new Set());
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  useEffect(() => {
    const sync = () => setMuted(readMuted());
    sync();
    window.addEventListener(MUTED_EVENT, sync);
    return () => window.removeEventListener(MUTED_EVENT, sync);
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const items = useMemo(() => (state.s === "ready" ? buildNotifications(state.data) : []), [state]);

  if (state.s === "loading") return <LoadingState label="Loading notifications…" />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={reload} />;
  const shown = items.filter((n) => !muted.has(n.category) && (filter === "all" || n.category === filter));
  const toggle = (c: NotificationCategory) => {
    const next = new Set(muted);
    if (next.has(c)) next.delete(c); else next.add(c);
    writeMuted(next);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6 md:py-10" data-testid="notifications-page">
      <PageHeader title="Notifications" description="What needs your attention: intros and messages, events coming up, deadlines you track and your Elco practice." />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter notifications">
        {[["all", "All"] as const, ...NOTIFICATION_CATEGORIES.map((c) => [c.id, c.label] as const)].map(([v, l]) => (
          <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}
            className={cn("rounded-full border px-4 py-2 text-[14px] font-semibold", focusRing, filter === v ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white hover:border-[#577E90]")}>{l}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState title="You're all caught up" body="New intro requests, messages, events within a week and deadlines within two weeks show up here."
          action={<Link href="/dashboard/events" className={cn("inline-flex items-center gap-2 font-semibold text-[#577E90] hover:underline", focusRing)}>See upcoming events <ArrowRight size={16} aria-hidden="true" /></Link>} />
      ) : (
        <ul className="space-y-2" data-testid="notification-list">
          {shown.map((n) => {
            const { icon: Icon, accent } = STYLE[n.category];
            return (
              <li key={n.id}>
                <Link href={n.href} className={cn(cardGloss, "flex items-center gap-4 p-4 transition-colors hover:border-[#577E90]", focusRing)}>
                  <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", ACCENTS[accent].soft, ACCENTS[accent].text)}><Icon size={20} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[16px] font-semibold text-[#1A2534]">{n.title}{n.actionable && <span className="h-2 w-2 shrink-0 rounded-full bg-[#E56668]" aria-label="Needs your attention" />}</span>
                    <span className="block text-[14px] text-[#2F4157]/65">{n.body}</span>
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-[#2F4157]/40" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <section aria-labelledby="notif-prefs" className={cn(cardGloss, "p-6")}>
        <h2 id="notif-prefs" className="text-[18px] font-bold">What to show</h2>
        <p className="mt-1 text-[14px] text-[#2F4157]/65">Saved on this device. All categories are on by default. IELSco doesn&apos;t send push notifications or emails from here.</p>
        <ul className="mt-4 space-y-3">
          {NOTIFICATION_CATEGORIES.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={!muted.has(c.id)} onChange={() => toggle(c.id)} className="mt-1 h-5 w-5 accent-[#2F4157]" data-testid={`notif-pref-${c.id}`} />
                <span><span className="block font-semibold">{c.label}</span><span className="text-[14px] text-[#2F4157]/65">{c.description}</span></span>
              </label>
            </li>
          ))}
        </ul>
        {muted.size > 0 && <p className="mt-3 flex items-center gap-2 text-[14px] text-[#2F4157]/65"><BellOff size={16} aria-hidden="true" /> {muted.size} categor{muted.size === 1 ? "y is" : "ies are"} hidden.</p>}
      </section>
    </div>
  );
}

export default function NotificationsPage() {
  return <DashboardPage>{({ user }) => <NotificationsView user={user} />}</DashboardPage>;
}
