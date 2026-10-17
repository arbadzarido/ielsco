"use client";

import { useEffect, useMemo, useState } from "react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader } from "../PageStates";
import { useBookmarks, UNAVAILABLE_MESSAGE } from "../bookmarks/BookmarksProvider";
import { ResourceCard } from "../ResourceCard";
import { CollectionFeature, CollectionList } from "../collections/CollectionViews";
import { EMPTY_FILTERS, ResourceFilters, type ResourceFilterState } from "./ResourceFilters";
import { btnPrimary, btnSecondary, focusRing } from "../ui";
import { DEMO_RESOURCES, getResource } from "@/data/dashboard/resources";
import { COLLECTIONS, featuredCollectionFor, getCollection } from "@/data/dashboard/collections";
import { matchesGoals, resourceScore } from "@/lib/dashboard/match";
import { clearRecentViews, getRecentViews } from "@/lib/dashboard/recent";
import type { Direction, MemberProfile, Resource } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ElcoCallout } from "@/components/elco/ElcoCallout";

type Tab = "all" | "saved" | "recent";
const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "recent", label: "Recently viewed" },
];

function applyFilters(resources: Resource[], f: ResourceFilterState, profile: MemberProfile) {
  const q = f.query.trim().toLowerCase();
  const list = resources.filter((r) => {
    if (f.category && r.category !== f.category) return false;
    if (f.type && r.type !== f.type) return false;
    if (f.direction && !r.goalTags.includes(f.direction)) return false;
    if (f.mine && !matchesGoals(r, profile)) return false;
    if (!q) return true;
    return [r.title, r.description, r.source, r.category, ...r.goalTags].some((s) => s.toLowerCase().includes(q));
  });
  return f.mine ? [...list].sort((a, b) => resourceScore(b, profile) - resourceScore(a, profile)) : list;
}

function Collections({ profile }: { profile: MemberProfile }) {
  const featured = featuredCollectionFor(profile.direction, profile.interests);
  return (
    <section aria-labelledby="collections-heading" className="mb-12">
      <h2 id="collections-heading" className="mb-1 text-2xl font-bold">Curated collections</h2>
      <p className="mb-5 text-base text-[#2F4157]/65">Hand-picked sets for one goal. Nothing to complete — open what helps.</p>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <CollectionFeature collection={featured} compact />
        <CollectionList collections={COLLECTIONS.filter((c) => c.id !== featured.id)} />
      </div>
    </section>
  );
}

function SavedState({ onBrowse }: { onBrowse: () => void }) {
  const bookmarks = useBookmarks()!;
  if (bookmarks.status === "loading") return <LoadingState label="Loading your saved items…" />;
  if (bookmarks.status === "unavailable") return <Notice testId="bookmarks-unavailable-notice">{UNAVAILABLE_MESSAGE}</Notice>;
  if (bookmarks.status === "error") return <ErrorState message={bookmarks.error ?? "Could not load saved items."} onRetry={bookmarks.reload} />;
  return (
    <EmptyState
      title="Nothing saved yet"
      body="Tap the bookmark on any resource or collection to keep it here. Saved items follow your account across devices."
      action={<button type="button" onClick={onBrowse} className={btnPrimary}>Browse all resources</button>}
    />
  );
}

export function ExploreView({ user, profile }: DashboardCtx) {
  const { t } = useI18n();
  // ExploreView only renders on the client (after DashboardPage has loaded the profile), so the query string is read
  // directly. Using useSearchParams here made a full page load wait on a streamed Suspense boundary that never swapped in.
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const bookmarks = useBookmarks()!;
  const hasGoals = !!profile.direction;
  const [tab, setTab] = useState<Tab>(() => (["saved", "recent"].includes(params.get("tab") ?? "") ? (params.get("tab") as Tab) : "all"));
  const [filters, setFilters] = useState<ResourceFilterState>(() => ({
    ...EMPTY_FILTERS,
    direction: (["study", "work", "explore"].includes(params.get("direction") ?? "") ? params.get("direction") : "") as Direction | "",
    mine: params.get("for") === "me",
  }));
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    setRecentIds(getRecentViews(user.id).map((v) => v.id));
  }, [user.id, tab]);

  const savedResources = bookmarks.saved.filter((k) => k.startsWith("resource:")).map((k) => getResource(k.slice(9))).filter(Boolean) as Resource[];
  const savedCollections = bookmarks.saved.filter((k) => k.startsWith("collection:")).map((k) => getCollection(k.slice(11))).filter((c) => !!c);
  const pool = tab === "all" ? DEMO_RESOURCES : tab === "saved" ? savedResources : (recentIds.map(getResource).filter(Boolean) as Resource[]);
  const results = useMemo(() => applyFilters(pool, { ...filters, mine: filters.mine && hasGoals }, profile), [pool, filters, hasGoals, profile]);
  const filtersEmpty = JSON.stringify(filters) === JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-10 md:px-6 md:py-14 lg:px-12">
      <PageHeader title={t("pages.exploreTitle")} description={t("pages.exploreBody")} />

      <div role="tablist" aria-label="Resource views" className="mb-8 flex gap-1 border-b border-[#E3E7ED]/70">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            data-testid={`explore-tab-${t.id}`}
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn("-mb-px border-b-2 px-4 py-3 text-base font-semibold transition-colors", focusRing, tab === t.id ? "border-[#2F4157] text-[#2F4157]" : "border-transparent text-[#2F4157]/55 hover:text-[#2F4157]")}
          >
            {t.label}
            {t.id === "saved" && bookmarks.status === "ready" && bookmarks.saved.length > 0 && <span className="ml-1.5 text-[#577E90]">{bookmarks.saved.length}</span>}
          </button>
        ))}
      </div>

      {tab === "all" && filtersEmpty && <Collections profile={profile} />}
      {tab === "saved" && savedCollections.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold">Saved collections</h2>
          <CollectionList collections={savedCollections} />
        </section>
      )}
      {tab === "recent" && recentIds.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-base text-[#2F4157]/60">Kept on this device only: just which resources you opened, and when.</p>
          <button type="button" data-testid="clear-recent" onClick={() => { clearRecentViews(user.id); setRecentIds([]); }} className={btnSecondary}>Clear history</button>
        </div>
      )}

      {tab === "all" && (
        <div className="mb-6">
          <Notice testId="demo-resources-notice">
            {DEMO_RESOURCES.length} free resources from other organisations, chosen for IELS members. IELS doesn&apos;t run these sites; links were checked on 17 Oct 2026.
          </Notice>
        </div>
      )}

      {pool.length > 0 && <ResourceFilters value={filters} onChange={setFilters} canMatchGoals={hasGoals} />}

      {pool.length > 0 && (
        <p data-testid="resource-result-count" aria-live="polite" className="mb-4 mt-6 text-base text-[#2F4157]/60">
          Showing {results.length} of {pool.length} {tab === "all" ? "resources" : tab === "saved" ? "saved resources" : "recently viewed"}
        </p>
      )}

      {results.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => <ResourceCard key={r.id} resource={r} userId={user.id} />)}
        </div>
      ) : tab === "saved" && pool.length === 0 && savedCollections.length === 0 ? (
        <SavedState onBrowse={() => setTab("all")} />
      ) : tab === "recent" && pool.length === 0 ? (
        <EmptyState title="Nothing viewed yet" body="Resources you open will appear here so you can find them again." action={<button type="button" onClick={() => setTab("all")} className={btnPrimary}>Browse all resources</button>} />
      ) : pool.length > 0 ? (
        <EmptyState
          title="No resources match yet"
          body="Try a different word, or clear your filters to see everything."
          action={<button type="button" data-testid="empty-clear-filters" onClick={() => setFilters(EMPTY_FILTERS)} className={btnPrimary}>Clear filters</button>}
        />
      ) : null}

      <ElcoCallout className="mt-12" refId="explore" title="Want to practise what you read?" body="Elco turns your goals into short speaking and writing practice with feedback." />
    </div>
  );
}
