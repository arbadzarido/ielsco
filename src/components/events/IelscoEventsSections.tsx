"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { CircleCIcon } from "@/components/brand/CircleCIcon";
import { btnLink, cardGloss, focusRing, tag } from "@/components/dashboard/ui";
import { eventDayLabel, officialEvents } from "@/lib/events/catalog";
import { cn } from "@/lib/utils";

// IELSco Talks are part of IELSco Events (a section here; all talks and replays on /dashboard/events/talks). IELS Circle,
// the ongoing speaking community, has its own menu item and page, so IELSco Events only links to it.
export function CircleLink() {
  return (
    <Link href="/dashboard/circle" className={cn(cardGloss, "flex items-center gap-4 p-5 hover:border-[#577E90]", focusRing)} data-testid="ielsco-events-circle-link">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF2F7] text-[#304156]"><CircleCIcon className="h-7 w-7" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-[#1A2534]">Looking for IELS Circle?</span>
        <span className="block text-[15px] text-[#2F4157]/70">The weekly speaking sessions and check-ins have their own page under Events ▸ Circle.</span>
      </span>
      <ArrowRight size={18} className="shrink-0 text-[#2F4157]" aria-hidden="true" />
    </Link>
  );
}

export function TalksSection() {
  const talks = officialEvents().filter((e) => e.format === "talk").sort((a, b) => Number(a.isPast) - Number(b.isPast) || b.date.getTime() - a.date.getTime()).slice(0, 3);
  return (
    <section aria-labelledby="ielsco-talks-heading" className="space-y-4" data-testid="ielsco-events-talks">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#577E90]">IELSco Events</p>
          <h2 id="ielsco-talks-heading" className="text-2xl font-bold md:text-3xl">IELSco Talks</h2>
          <p className="mt-1 text-[16px] text-[#2F4157]/70">Real Stories. Global Perspectives. New Possibilities.</p>
        </div>
        <Link href="/dashboard/events/talks" className={btnLink}>All talks and replays <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <ul className="grid gap-5 md:grid-cols-3">
        {talks.map((e) => (
          <li key={e.id}>
            <Link href={e.href} className={cn(cardGloss, "flex h-full flex-col overflow-hidden hover:border-[#577E90]", focusRing)}>
              <span className="relative block aspect-[16/10] bg-[#2F4157]">
                {e.poster && <Image src={e.poster} alt="" fill sizes="(min-width: 768px) 30vw, 100vw" className={cn("object-cover", e.isPast && "saturate-[0.6]")} />}
              </span>
              <span className="flex flex-1 flex-col gap-1 p-5">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-[#577E90]"><CalendarDays size={15} aria-hidden="true" />{eventDayLabel(e.date)}{e.isPast && <span className={tag}>Past</span>}</span>
                <span className="text-[17px] font-semibold leading-snug text-[#1A2534]">{e.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
