"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PenLine, Search } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, PageHeader } from "../PageStates";
import { SaveButton } from "../bookmarks/SaveButton";
import { btnSecondary, cardGloss, focusRing, inputClass, tag } from "../ui";
import { LoadGate, useLoad } from "@/components/connect/shared";
import StoryAuthorLine from "@/components/stories/StoryAuthorLine";
import { ElcoPractice } from "@/components/elco/ElcoCallout";
import { loadStoriesFeed, type FeedCategory, type FeedStory } from "@/lib/content/stories-feed";
import { STORY_FALLBACK_COVER } from "@/lib/covers";
import { cn } from "@/lib/utils";

const dateLabel = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

function StoryCard({ s, large }: { s: FeedStory; large?: boolean }) {
  return (
    <article className={cn(cardGloss, "group flex h-full flex-col overflow-hidden", large && "md:flex-row")} data-testid="story-card">
      <Link href={s.href} className={cn("relative block shrink-0 bg-[#EAEFF5]", large ? "aspect-[16/9] md:aspect-auto md:w-[55%]" : "aspect-[16/9]", focusRing)} tabIndex={-1} aria-hidden="true">
        <Image src={s.image || STORY_FALLBACK_COVER} alt="" fill sizes={large ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"} className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className={tag}>{s.categoryLabel}</span>
          <SaveButton type="story" id={s.id} title={s.title} />
        </div>
        {s.authorName && <div className="mt-1" data-testid="story-author"><StoryAuthorLine name={s.authorName} avatar={s.authorAvatar} role={s.authorRole} size="sm" /></div>}
        <h3 className={cn("font-bold leading-snug text-[#1A2534]", large ? "text-[26px]" : "text-[18px]")}>
          <Link href={s.href} className={cn("rounded hover:underline", focusRing)}>{s.title}</Link>
        </h3>
        <p className={cn("text-[15px] text-[#2F4157]/70", large ? "line-clamp-4" : "line-clamp-3")}>{s.summary}</p>
        <p className="mt-auto pt-2 text-[13px] text-[#2F4157]/55">{dateLabel(s.date)}</p>
      </div>
    </article>
  );
}

// News & Stories (Discover): a featured story, category filter, search and bookmarks over IELSco Stories and Member
// Stories. Only published stories exist here; an empty CMS shows an empty state, never placeholders.
export function NewsStoriesView({ supabase }: DashboardCtx) {
  const data = useLoad(() => loadStoriesFeed(supabase), [supabase]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<FeedCategory | "all">("all");
  const items = useMemo(() => (data.state.s === "ready" ? data.state.data.items : []), [data.state]);
  const cats = useMemo(() => [...new Map(items.map((i) => [i.category, i.categoryLabel])).entries()], [items]);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => (cat === "all" || i.category === cat) && (!s || `${i.title} ${i.summary} ${i.author} ${i.tags.join(" ")}`.toLowerCase().includes(s)));
  }, [items, q, cat]);
  const filtered = q.trim() !== "" || cat !== "all";
  const [featured, ...rest] = shown;

  return (
    <div className="mx-auto max-w-[110rem] space-y-8 px-4 py-8 md:px-6 md:py-10 lg:px-10">
      <PageHeader title="News & Stories" description="IELSco news, partnerships and events, and stories from members across Southeast Asia.">
        <Link href="/circle/stories/submit" className={btnSecondary}><PenLine size={16} aria-hidden="true" /> Share your story</Link>
      </PageHeader>
      <LoadGate state={data.state} onRetry={data.reload} label="Loading stories…" />
      {data.state.s === "ready" && (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative block md:w-[420px]">
              <span className="sr-only">Search stories</span>
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/45" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stories" className={cn(inputClass, "rounded-full py-2.5 pl-11 text-base")} data-testid="stories-search" />
            </label>
            {cats.length > 1 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
                {[["all", "All"] as const, ...cats].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={cat === v} onClick={() => setCat(v as FeedCategory | "all")}
                    className={cn("rounded-full border px-4 py-2 text-[14px] font-semibold", focusRing, cat === v ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white hover:border-[#577E90]")}>{l}</button>
                ))}
              </div>
            )}
          </div>
          {data.state.data.partial && <p className="text-[14px] text-[#2F4157]/60">IELSco news couldn&apos;t be loaded right now; member stories are shown.</p>}
          {shown.length === 0 ? (
            <EmptyState title={filtered ? "No stories match" : "No stories published yet"} body={filtered ? "Try another word or category." : "IELSco news and member stories appear here as soon as they're published."}
              action={<Link href="/circle/stories/submit" className={btnSecondary}>Share your story</Link>} />
          ) : (
            <>
              {featured && <StoryCard s={featured} large />}
              {rest.length > 0 && <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{rest.map((s) => <li key={s.id}><StoryCard s={s} /></li>)}</ul>}
            </>
          )}
          <ElcoPractice context="article" refId="discover-stories" />
        </>
      )}
    </div>
  );
}
