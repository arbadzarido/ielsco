"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import Footer from "@/components/footer";
import EventCard from "@/components/events/EventCard";
import { eventsData } from "@/data/events";
import { GifFeature } from "@/components/gif-public/GifFeature";
import { wibDeadline } from "@/lib/events/deadline";
import { body, container, eyebrow, focusRing, h1, h2, lead, siteRoot } from "@/components/site/ui";
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

      <section className="bg-white py-[48px]" aria-label="Featured programme">
        <div className={container}>
          <GifFeature placement="events" />
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
