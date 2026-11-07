"use client";

// The marketing workflow at a glance, above the Marketing calendar: content due today and this week, upcoming
// launches, content waiting for review, overdue content and each active campaign's progress. Content items are not
// tasks; they are read from os_campaign_items with the person's own session.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useOsMe } from "./OsProvider";
import { muted, panel, ring } from "./ui";
import { DEFAULT_TZ, addDays, zonedParts } from "@/lib/os/calendar";
import { cn } from "@/lib/utils";

type Content = { id: string; title: string; status: string; channel: string | null; campaign_id: string | null; publish_at: string | null; planned_publish_date: string | null; reviewer_person_id: string | null };
type Campaign = { id: string; name: string; status: string; start_date: string | null; end_date: string | null };

/** Group content for the board. Pure, so it can be tested. */
export function boardGroups(content: Content[], campaigns: Campaign[], today: string, now = Date.now()) {
  const day = (c: Content) => (c.publish_at ? zonedParts(c.publish_at, DEFAULT_TZ).date : c.planned_publish_date);
  const open = content.filter((c) => !["Published", "Cancelled"].includes(c.status));
  const due = (c: Content) => (c.publish_at ? Date.parse(c.publish_at) : c.planned_publish_date ? Date.parse(`${c.planned_publish_date}T23:59:59+07:00`) : Infinity);
  const weekEnd = addDays(today, 6);
  return {
    today: content.filter((c) => day(c) === today && c.status !== "Cancelled"),
    week: open.filter((c) => { const d = day(c); return d !== null && d > today && d <= weekEnd; }),
    launches: campaigns.filter((c) => c.start_date && c.start_date >= today && c.start_date <= addDays(today, 30) && !["Completed", "Cancelled"].includes(c.status)).sort((a, b) => a.start_date!.localeCompare(b.start_date!)),
    review: content.filter((c) => c.status === "In review"),
    overdue: open.filter((c) => due(c) < now),
    progress: campaigns.filter((c) => ["Planned", "Active"].includes(c.status)).map((c) => {
      const mine = content.filter((x) => x.campaign_id === c.id && x.status !== "Cancelled");
      return { ...c, total: mine.length, published: mine.filter((x) => x.status === "Published").length };
    }),
  };
}

export function MarketingBoard({ campaigns, tick }: { campaigns: Campaign[]; tick: number }) {
  const { supabase } = useOsMe();
  const [content, setContent] = useState<Content[]>([]);
  const today = zonedParts(new Date(), DEFAULT_TZ).date;
  useEffect(() => {
    supabase.from("os_campaign_items").select("id, title, status, channel, campaign_id, publish_at, planned_publish_date, reviewer_person_id")
      .gte("planned_publish_date", addDays(today, -60)).lte("planned_publish_date", addDays(today, 60)).limit(1000)
      .then(({ data }) => setContent((data ?? []) as Content[]));
  }, [supabase, today, tick]);
  const g = useMemo(() => boardGroups(content, campaigns, today), [content, campaigns, today]);
  const list = (rows: Content[], empty: string) => rows.length ? (
    <ul className="space-y-1">{rows.slice(0, 6).map((c) => (
      <li key={c.id}><Link href={`/os/campaigns?open=${c.id}`} className={cn("block truncate text-sm hover:underline", ring)}>{c.title} <span className={cn("text-xs", muted)}>· {c.channel ?? c.status}</span></Link></li>
    ))}{rows.length > 6 && <li className={cn("text-xs", muted)}>+{rows.length - 6} more</li>}</ul>
  ) : <p className={cn("text-xs", muted)}>{empty}</p>;
  const card = (title: string, n: number, body: React.ReactNode, tone?: "red" | "amber", testId?: string) => (
    <section className={cn(panel, "p-3", tone === "red" && n > 0 && "border-[#F1C9CA]", tone === "amber" && n > 0 && "border-[#F1D5A6]")} data-testid={testId}>
      <h3 className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-[#3A4B60]">{title}<span className="rounded-full bg-[#F0F2F5] px-1.5 text-[11px]">{n}</span></h3>
      {body}
    </section>
  );
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="os-marketing-board">
      {card("Publishing today", g.today.length, list(g.today, "Nothing to publish today."))}
      {card("This week", g.week.length, list(g.week, "Nothing else planned this week."))}
      {card("Overdue", g.overdue.length, list(g.overdue, "Nothing overdue."), "red", "os-marketing-overdue")}
      {card("Awaiting review", g.review.length, list(g.review, "Nothing waiting for review."), "amber")}
      {card("Upcoming launches", g.launches.length, g.launches.length ? <ul className="space-y-1">{g.launches.slice(0, 6).map((c) => <li key={c.id}><Link href={`/os/campaigns/${c.id}`} className={cn("block truncate text-sm hover:underline", ring)}>{c.name} <span className={cn("text-xs", muted)}>· starts {c.start_date}</span></Link></li>)}</ul> : <p className={cn("text-xs", muted)}>No campaign starts in the next 30 days.</p>)}
      {card("Campaign progress", g.progress.length, g.progress.length ? (
        <ul className="space-y-2">{g.progress.slice(0, 5).map((c) => (
          <li key={c.id}>
            <Link href={`/os/campaigns/${c.id}`} className={cn("flex justify-between text-sm hover:underline", ring)}><span className="truncate">{c.name}</span><span className={cn("shrink-0 text-xs", muted)}>{c.published}/{c.total} published</span></Link>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F0F2F5]" role="presentation"><div className="h-full rounded-full bg-[#B4590B]" style={{ width: `${c.total ? (c.published / c.total) * 100 : 0}%` }} /></div>
          </li>
        ))}</ul>
      ) : <p className={cn("text-xs", muted)}>No active campaigns.</p>)}
    </div>
  );
}
