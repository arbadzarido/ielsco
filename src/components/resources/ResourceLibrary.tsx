"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { card, focusRing, pill } from "@/components/site/ui";
import type { PublicResource, Topic } from "@/data/public-resources";
import { SearchEmpty } from "@/components/feedback/ErrorState";

// Shown 12 at a time ("Show more" adds the next 12); search and the topic filter always run over the whole list first.
const PAGE_SIZE = 12;

const chip = (on: boolean) => cn("rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors", focusRing,
  on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#D5DBE3] bg-white text-[#2F4157] hover:border-[#2F4157]");

export default function ResourceLibrary({ items, topics }: { items: PublicResource[]; topics: { id: Topic; label: string; blurb: string }[] }) {
  const [topic, setTopic] = useState<Topic | "all">("all");
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q);
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => { setVisible(PAGE_SIZE); }, [dq, topic]);
  const terms = useMemo(() => items.flatMap((r) => [r.title, r.source, ...topics.map((t) => t.label)]), [items, topics]);
  const shown = useMemo(() => {
    const s = dq.trim().toLowerCase();
    return items.filter((r) => (topic === "all" || r.topic === topic) && (!s || `${r.title} ${r.description} ${r.source}`.toLowerCase().includes(s)));
  }, [items, topic, dq]);
  const blurb = topics.find((t) => t.id === topic)?.blurb;

  return (
    <div>
      <label className="relative block max-w-[480px]">
        <span className="sr-only">Search resources</span>
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/45" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides and sites"
          className={cn("w-full rounded-full border border-[#D5DBE3] bg-white py-3 pl-11 pr-4 text-[16px] placeholder:text-[#2F4157]/45", focusRing)} />
      </label>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Topic">
        <button type="button" className={chip(topic === "all")} aria-pressed={topic === "all"} onClick={() => setTopic("all")}>All topics</button>
        {topics.map((t) => <button key={t.id} type="button" className={chip(topic === t.id)} aria-pressed={topic === t.id} onClick={() => setTopic(t.id)}>{t.label}</button>)}
      </div>
      {blurb && <p className="mt-4 text-[15px] text-[#2F4157]/70">{blurb}</p>}
      <p className="mt-6 text-[14px] text-[#2F4157]/60" aria-live="polite">{shown.length} resources</p>
      {shown.length === 0 && (
        <div className={cn(card, "mt-4")} data-testid="resource-empty">
          <SearchEmpty query={q} terms={terms} onPick={setQ} onClear={() => { setQ(""); setTopic("all"); }}
            hint="Check the spelling, try a shorter word, or choose another topic."
            actions={<Link href="/opportunities" className={cn("inline-flex min-h-[46px] items-center rounded-full px-5 text-[15px] font-semibold text-[#2F4157] hover:underline", focusRing)}>Browse opportunities</Link>} />
        </div>
      )}
      <ul className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {shown.slice(0, visible).map((r) => (
          <li key={r.id}>
            <a href={r.url!} target="_blank" rel="noopener noreferrer" className={cn(card, "group flex h-full flex-col p-6 transition-colors hover:border-[#C9D1DC]", focusRing)} data-testid={`resource-${r.id}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">{r.type}</span>
                <ArrowUpRight size={18} className="text-[#2F4157]/40 group-hover:text-[#2F4157]" aria-hidden="true" />
              </div>
              <p className="mt-3 text-[18px] font-bold leading-snug text-[#1A2534]">{r.title}</p>
              <p className="mt-1 text-[14px] text-[#2F4157]/60">{r.source}</p>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#2F4157]/80">{r.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={pill}>{r.isFree ? "Free" : "Paid options"}</span>
                {r.level && <span className={pill}>{r.level}</span>}
              </div>
              <span className="sr-only">(opens the {r.source} website in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
      {shown.length > visible && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-[14px] text-[#2F4157]/60" aria-live="polite">Showing {Math.min(visible, shown.length)} of {shown.length}</p>
          <button type="button" onClick={() => setVisible((v) => v + PAGE_SIZE)} data-testid="resource-show-more"
            className={cn("inline-flex min-h-[46px] items-center rounded-full border border-[#D5DBE3] bg-white px-6 text-[15px] font-semibold text-[#2F4157] hover:border-[#2F4157]", focusRing)}>Show more</button>
        </div>
      )}
    </div>
  );
}
