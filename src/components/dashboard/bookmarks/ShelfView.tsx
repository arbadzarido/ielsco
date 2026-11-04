"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, Newspaper } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader } from "../PageStates";
import { useBookmarks, UNAVAILABLE_MESSAGE } from "./BookmarksProvider";
import { SaveButton } from "./SaveButton";
import { ResourceCard } from "../ResourceCard";
import { CollectionList } from "../collections/CollectionViews";
import { useMyRecords } from "../useMyRecords";
import { btnLink, btnPrimary, cardGloss, focusRing, tag } from "../ui";
import { getResource } from "@/data/dashboard/resources";
import { getCollection } from "@/data/dashboard/collections";
import { eventDayLabel, officialEvents } from "@/lib/events/catalog";
import { loadStoriesFeed, type FeedStory } from "@/lib/content/stories-feed";
import type { Resource } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type Kind = "all" | "opportunities" | "stories" | "materials" | "events";

// Saved (unified): opportunities (the tracker, public.opportunity_tracker) plus everything bookmarked in
// public.member_bookmarks: materials, collections, stories and events. One page, filterable by kind.
export function ShelfView({ user, supabase }: DashboardCtx) {
  const bookmarks = useBookmarks()!;
  const { state: records } = useMyRecords(user.id);
  const [kind, setKind] = useState<Kind>("all");
  const [stories, setStories] = useState<FeedStory[] | null>(null);
  const hasStories = bookmarks.saved.some((k) => k.startsWith("story:"));
  useEffect(() => {
    if (hasStories && stories === null) loadStoriesFeed(supabase).then((f) => setStories(f.items)).catch(() => setStories([]));
  }, [hasStories, stories, supabase]);

  const saved = useMemo(() => {
    const ids = (p: string) => bookmarks.saved.filter((k) => k.startsWith(p)).map((k) => k.slice(p.length));
    const events = officialEvents();
    return {
      resources: ids("resource:").map(getResource).filter(Boolean) as Resource[],
      collections: ids("collection:").map(getCollection).filter((c) => !!c),
      stories: ids("story:").map((id) => stories?.find((s) => s.id === id)).filter(Boolean) as FeedStory[],
      storyCount: ids("story:").length,
      events: ids("event:").map((id) => events.find((e) => e.id === id)).filter((e) => !!e),
    };
  }, [bookmarks.saved, stories]);
  const tracked = records.s === "ready" ? records.data.tracked : [];

  const body = () => {
    if (bookmarks.status === "loading") return <LoadingState label="Loading your saved items…" />;
    if (bookmarks.status === "error") return <ErrorState message={bookmarks.error ?? "Could not load your saved items."} onRetry={bookmarks.reload} />;
    const counts: Record<Kind, number> = {
      all: tracked.length + saved.resources.length + saved.collections.length + saved.storyCount + saved.events.length,
      opportunities: tracked.length, stories: saved.storyCount, materials: saved.resources.length + saved.collections.length, events: saved.events.length,
    };
    if (counts.all === 0) {
      return (
        <EmptyState title="Nothing saved yet"
          body="Use the bookmark on opportunities, stories, learning materials and events to keep them here. Saved items follow your account across devices."
          action={<div className="flex flex-wrap justify-center gap-3"><Link href="/dashboard/discover/opportunities" data-testid="shelf-browse" className={btnPrimary}>Browse opportunities</Link><Link href="/dashboard/explore" className={btnLink}>Learning Materials</Link></div>} />
      );
    }
    const show = (k: Kind) => kind === "all" || kind === k;
    return (
      <div className="space-y-10">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter saved items" data-testid="saved-filter">
          {(["all", "opportunities", "stories", "materials", "events"] as Kind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
              className={cn("rounded-full border px-4 py-2 text-[14px] font-semibold capitalize", focusRing, kind === k ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white hover:border-[#577E90]")}>
              {k} <span className="opacity-70">{counts[k]}</span>
            </button>
          ))}
        </div>
        {bookmarks.status === "unavailable" && <Notice testId="bookmarks-unavailable-notice">{UNAVAILABLE_MESSAGE}</Notice>}

        {show("opportunities") && tracked.length > 0 && (
          <section aria-labelledby="saved-opps" className="space-y-3">
            <div className="flex items-end justify-between"><h2 id="saved-opps" className="text-[22px] font-bold">Opportunities</h2><Link href="/dashboard/opportunities" className={btnLink}>Open tracker</Link></div>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tracked.map((t) => (
                <li key={t.opportunity_id}>
                  <Link href={t.opportunity ? `/opportunities/${t.opportunity.slug}` : "/dashboard/opportunities"} className={cn(cardGloss, "flex h-full gap-3 p-4 hover:border-[#577E90]", focusRing)}>
                    <BriefcaseBusiness size={20} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
                    <span className="min-w-0"><span className="block font-semibold">{t.opportunity?.title ?? "Opportunity no longer listed"}</span>
                      <span className="text-[14px] text-[#2F4157]/65">{t.opportunity?.organizer} · {({ saved: "Interested", preparing: "Applying", applied: "Applied" } as Record<string, string>)[t.status] ?? t.status.replace("_", " ")}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        {show("stories") && saved.storyCount > 0 && (
          <section aria-labelledby="saved-stories" className="space-y-3">
            <h2 id="saved-stories" className="text-[22px] font-bold">Stories</h2>
            {stories === null ? <div className="h-20 animate-pulse rounded-2xl bg-white/70" aria-hidden="true" /> : (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {saved.stories.map((s) => (
                  <li key={s.id} className={cn(cardGloss, "flex gap-3 p-4")}>
                    <Newspaper size={20} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
                    <span className="min-w-0 flex-1"><Link href={s.href} className="block font-semibold hover:underline">{s.title}</Link><span className="text-[14px] text-[#2F4157]/65">{s.categoryLabel}</span></span>
                    <SaveButton type="story" id={s.id} title={s.title} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {show("materials") && saved.collections.length > 0 && (
          <section aria-labelledby="shelf-collections">
            <h2 id="shelf-collections" className="text-[22px] font-bold">Collections</h2>
            <CollectionList collections={saved.collections} />
          </section>
        )}
        {show("materials") && saved.resources.length > 0 && (
          <section aria-labelledby="shelf-resources">
            <h2 id="shelf-resources" className="mb-4 text-[22px] font-bold">Learning materials <span className="text-[#577E90]">{saved.resources.length}</span></h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {saved.resources.map((r) => <ResourceCard key={r.id} resource={r} userId={user.id} />)}
            </div>
          </section>
        )}
        {show("events") && saved.events.length > 0 && (
          <section aria-labelledby="saved-events" className="space-y-3">
            <h2 id="saved-events" className="text-[22px] font-bold">Events</h2>
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {saved.events.map((e) => (
                <li key={e.id} className={cn(cardGloss, "flex gap-3 p-4")}>
                  <CalendarDays size={20} className="mt-0.5 shrink-0 text-[#C04C4E]" aria-hidden="true" />
                  <span className="min-w-0 flex-1"><Link href={e.href} className="block font-semibold hover:underline">{e.title}</Link>
                    <span className="text-[14px] text-[#2F4157]/65">{eventDayLabel(e.date)}{e.isPast && <span className={cn(tag, "ml-2")}>Past</span>}</span></span>
                  <SaveButton type="event" id={e.id} title={e.title} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-10 md:px-6 md:py-12 lg:px-10" data-testid="shelf-page">
      <PageHeader title="Saved" description="Opportunities, stories, learning materials and events you saved, on any device you sign in to.">
        <Link href="/dashboard/explore?tab=recent" className={btnLink}>Recently viewed</Link>
      </PageHeader>
      {body()}
    </div>
  );
}
