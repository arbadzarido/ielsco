"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import Footer from "@/components/footer";
import EventCard from "@/components/events/EventCard";
import { eventsData } from "@/data/events";
import { GIF_BATCH, gifRegistrationOpen } from "@/data/gif";
import { wibDeadline } from "@/lib/events/deadline";
import { body, cardLink, container, eyebrow, focusRing, h1, h2, h3, lead, pill, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";

// Public events. Status ("Registration open" / "Past event") comes from each event's own deadline, evaluated in the
// browser; nothing is labelled open unless its deadline is still ahead.
const closes = (e: (typeof eventsData)[number]) => Date.parse(wibDeadline(e.registrationDateDeadline, e.registrationTimeDeadline));
const PAGE = 9;

export default function EventsPage() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);

  const { open, past } = useMemo(() => {
    const term = q.trim().toLowerCase();
    const match = eventsData.filter((e) => !term || `${e.title} ${e.seo.meta_description}`.toLowerCase().includes(term));
    if (now === null) return { open: [], past: match };
    return {
      open: match.filter((e) => closes(e) > now).sort((a, b) => closes(a) - closes(b)),
      past: match.filter((e) => closes(e) <= now).sort((a, b) => closes(b) - closes(a)),
    };
  }, [q, now]);
  const gifOpen = now === null ? null : gifRegistrationOpen(new Date(now));

  return (
    <div className={cn(siteRoot, "bg-white")} data-testid="events-page">
      <section className="border-b border-[#E6E9EE] bg-white pb-[48px] pt-[40px] md:pt-[64px]">
        <div className={container}>
          <p className={eyebrow}>Events &amp; programs</p>
          <h1 className={cn(h1, "mt-3 max-w-[760px]")}>Info sessions, workshops and fellowships</h1>
          <p className={cn(lead, "mt-5 max-w-[640px]")}>
            Events run by IELS and with universities and partners. Registration happens on each event&apos;s page while it is open.
          </p>
          <div className="relative mt-8 max-w-[520px]">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/50" aria-hidden="true" />
            <label htmlFor="event-search" className="sr-only">Search events</label>
            <input id="event-search" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Search events"
              className={cn("h-12 w-full rounded-full border border-[#D5DBE3] bg-white pl-11 pr-11 text-[16px] text-[#1A2534] placeholder:text-[#2F4157]/45", focusRing)} />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Clear search" className={cn("absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#2F4157]/60 hover:bg-[#F1F4F8]", focusRing)}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-[48px]">
        <div className={container}>
          <Link href={GIF_BATCH.overviewPage} className={cn(cardLink, "grid overflow-hidden md:grid-cols-[1fr_280px]")} data-testid="events-gif">
            <div className="p-7 sm:p-9">
              <div className="flex items-center gap-3">
                <Image src="/images/logos/events/gif.png" alt="" width={120} height={44} className="h-[44px] w-auto" />
                <p className="text-[14px] font-semibold text-[#914D4D]">Flagship program · Global Impact Fellowship</p>
              </div>
              <h2 className={cn(h3, "mt-5 text-[24px]")}>Lead a project with youth from across Southeast Asia</h2>
              <ul className={cn(body, "mt-3 list-disc space-y-1 pl-5")}>
                {GIF_BATCH.facts.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {gifOpen === true && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>{GIF_BATCH.name}: registration open</span>}
                {gifOpen === false && <span className={pill}>{GIF_BATCH.name}: registration closed</span>}
                <span className="flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">About GIF <ArrowRight size={16} aria-hidden="true" /></span>
              </div>
            </div>
            <div className="relative hidden min-h-[260px] md:block"><Image src={GIF_BATCH.poster} alt="" fill sizes="280px" className="object-cover" /></div>
          </Link>
        </div>
      </section>

      <section className="bg-white pb-[40px]" aria-labelledby="open-heading">
        <div className={container}>
          <h2 id="open-heading" className={h2}>Open for registration</h2>
          {now !== null && open.length === 0 && (
            <p className={cn(body, "mt-4")} data-testid="events-none-open">
              {q ? "No open events match your search." : "Nothing is open right now. New events are announced on Instagram (@iels.co) and here."}
            </p>
          )}
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((e) => <li key={e.id}><EventCard event={e} open /></li>)}
          </ul>
        </div>
      </section>

      <section className="border-t border-[#E6E9EE] bg-white py-[56px]" aria-labelledby="past-heading">
        <div className={container}>
          <h2 id="past-heading" className={h2}>Past events</h2>
          {past.length === 0 && <p className={cn(body, "mt-4")}>No past events match your search.</p>}
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {past.slice(0, shown).map((e) => <li key={e.id}><EventCard event={e} open={now === null ? null : false} /></li>)}
          </ul>
          {past.length > shown && (
            <div className="mt-10 flex justify-center">
              <button type="button" onClick={() => setShown(shown + PAGE)} className={cn("min-h-[46px] rounded-full border border-[#D5DBE3] px-6 text-[16px] font-semibold text-[#2F4157] hover:border-[#2F4157]", focusRing)}>
                Show more events
              </button>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
