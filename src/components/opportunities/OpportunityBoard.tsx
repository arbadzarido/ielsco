"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Bookmark, BookmarkCheck, Search, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { card, focusRing, pill } from "@/components/site/ui";
import {
  CATEGORY_LABEL, deadlineState, FUNDING_LABEL, regionLabel, type Category, type Funding, type Opportunity,
} from "@/lib/opportunities";
import { useTracker } from "./useTracker";

const chip = (on: boolean) => cn("rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors", focusRing,
  on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#D5DBE3] bg-white text-[#2F4157] hover:border-[#2F4157]");

export function SaveButton({ id, tracker, compact }: { id: string; tracker: ReturnType<typeof useTracker>; compact?: boolean }) {
  const isSaved = tracker.saved.has(id);
  if (tracker.signedIn === false) {
    return (
      <Link href={`/sign-in?next=${encodeURIComponent("/opportunities")}`} className={cn("inline-flex items-center gap-1.5 rounded-full border border-[#D5DBE3] px-3.5 py-2 text-[14px] font-semibold text-[#2F4157] hover:border-[#2F4157]", focusRing)}>
        <Bookmark size={16} aria-hidden="true" /> {compact ? "Save" : "Sign in to save"}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => tracker.toggle(id)} disabled={tracker.signedIn === undefined || tracker.busy === id} aria-pressed={isSaved}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[14px] font-semibold disabled:opacity-60", focusRing,
        isSaved ? "border-[#2D7A58]/40 bg-[#F3FAF6] text-[#2D7A58]" : "border-[#D5DBE3] text-[#2F4157] hover:border-[#2F4157]")}
      data-testid={`save-${id}`}>
      {isSaved ? <BookmarkCheck size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />} {isSaved ? "Saved" : "Save"}
    </button>
  );
}

export function DeadlinePill({ o }: { o: Pick<Opportunity, "deadline" | "deadline_note"> }) {
  const st = deadlineState(o.deadline);
  if (st === "none") return <span className={pill}>Dates: see official page</span>;
  const d = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(o.deadline!));
  if (st === "closed") return <span className={cn(pill, "text-[#2F4157]/60")}>Closed {d}</span>;
  return <span className={cn(pill, st === "soon" ? "border-[#E56668]/40 text-[#C94F51]" : "border-[#2D7A58]/30 text-[#2D7A58]")}>Deadline {d}</span>;
}

export default function OpportunityBoard({ items }: { items: Opportunity[] }) {
  const tracker = useTracker();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [funding, setFunding] = useState<Funding | "all">("all");
  const [hideClosed, setHideClosed] = useState(true);

  const cats = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);
  const fundings = useMemo(() => [...new Set(items.map((i) => i.funding))], [items]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((o) =>
      (cat === "all" || o.category === cat) && (funding === "all" || o.funding === funding)
      && (!hideClosed || deadlineState(o.deadline) !== "closed")
      && (!s || [o.title, o.organizer, o.summary, o.open_to ?? "", ...o.regions.map(regionLabel)].join(" ").toLowerCase().includes(s)));
  }, [items, q, cat, funding, hideClosed]);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <label className="relative block max-w-[520px]">
          <span className="sr-only">Search opportunities</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/45" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, country or organizer"
            className={cn("w-full rounded-full border border-[#D5DBE3] bg-white py-3 pl-11 pr-4 text-[16px] placeholder:text-[#2F4157]/45", focusRing)} />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
          <button type="button" className={chip(cat === "all")} aria-pressed={cat === "all"} onClick={() => setCat("all")}>All types</button>
          {cats.map((c) => <button key={c} type="button" className={chip(cat === c)} aria-pressed={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Funding">
          <button type="button" className={chip(funding === "all")} aria-pressed={funding === "all"} onClick={() => setFunding("all")}>Any funding</button>
          {fundings.map((f) => <button key={f} type="button" className={chip(funding === f)} aria-pressed={funding === f} onClick={() => setFunding(f)}>{FUNDING_LABEL[f]}</button>)}
          <label className="ml-1 inline-flex items-center gap-2 text-[14px] font-medium text-[#2F4157]">
            <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} className="h-4 w-4 accent-[#2F4157]" /> Hide closed
          </label>
        </div>
      </div>

      {tracker.notice && (
        <div className="mt-6 flex items-start justify-between gap-4 rounded-[14px] border border-[#E6E9EE] bg-[#F8FAFC] p-4 text-[15px] text-[#2F4157]" role="status">
          <p>{tracker.notice} <Link href="/membership" className="font-semibold underline">About membership</Link></p>
          <button type="button" onClick={tracker.clearNotice} aria-label="Dismiss" className={cn("rounded-full p-1", focusRing)}><X size={16} aria-hidden="true" /></button>
        </div>
      )}

      <p className="mt-8 text-[14px] text-[#2F4157]/60" aria-live="polite">{shown.length} {shown.length === 1 ? "opportunity" : "opportunities"}</p>
      {shown.length === 0 ? (
        <div className={cn(card, "mt-4 p-10 text-center")}>
          <p className="text-[18px] font-bold text-[#1A2534]">Nothing matches those filters</p>
          <p className="mt-2 text-[15px] text-[#2F4157]/70">Try another type, or include closed opportunities.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 md:grid-cols-2">
          {shown.map((o) => (
            <li key={o.id} className={cn(card, "flex flex-col p-6")} data-testid={`opp-${o.slug}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">{CATEGORY_LABEL[o.category]}</span>
                {o.is_iels_program && <span className={cn(pill, "border-[#E56668]/40 text-[#C94F51]")}>IELS program</span>}
              </div>
              <h3 className="mt-3 text-[19px] font-bold leading-snug text-[#1A2534]">
                <Link href={`/opportunities/${o.slug}`} className={cn("rounded hover:underline", focusRing)}>{o.title}</Link>
              </h3>
              <p className="mt-1 text-[14px] text-[#2F4157]/65">{o.organizer} · {o.regions.map(regionLabel).join(", ") || "Location varies"}</p>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-[#2F4157]/80">{o.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={pill}>{FUNDING_LABEL[o.funding]}</span>
                <DeadlinePill o={o} />
                {o.verification === "verified" && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}><ShieldCheck size={14} aria-hidden="true" /> Checked</span>}
              </div>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E6E9EE] pt-4">
                <Link href={`/opportunities/${o.slug}`} className={cn("inline-flex items-center gap-1.5 rounded text-[15px] font-semibold text-[#2F4157] hover:text-[#E56668]", focusRing)}>
                  Details <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <SaveButton id={o.id} tracker={tracker} compact />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
