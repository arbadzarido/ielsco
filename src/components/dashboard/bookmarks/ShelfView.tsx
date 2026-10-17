"use client";

import Link from "next/link";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, ErrorState, LoadingState, Notice, PageHeader } from "../PageStates";
import { useBookmarks, UNAVAILABLE_MESSAGE } from "./BookmarksProvider";
import { ResourceCard } from "../ResourceCard";
import { CollectionList } from "../collections/CollectionViews";
import { btnLink, btnPrimary } from "../ui";
import { getResource } from "@/data/dashboard/resources";
import { getCollection } from "@/data/dashboard/collections";
import type { Resource } from "@/lib/dashboard/types";
import { useI18n } from "@/lib/i18n/I18nProvider";

// My Shelf: everything the member saved, stored per account in public.member_bookmarks.
export function ShelfView({ user }: DashboardCtx) {
  const { t } = useI18n();
  const bookmarks = useBookmarks()!;

  const body = () => {
    if (bookmarks.status === "loading") return <LoadingState label="Loading your shelf…" />;
    if (bookmarks.status === "unavailable") return <Notice testId="bookmarks-unavailable-notice">{UNAVAILABLE_MESSAGE}</Notice>;
    if (bookmarks.status === "error") return <ErrorState message={bookmarks.error ?? "Could not load your shelf."} onRetry={bookmarks.reload} />;

    const resources = bookmarks.saved.filter((k) => k.startsWith("resource:")).map((k) => getResource(k.slice(9))).filter(Boolean) as Resource[];
    const collections = bookmarks.saved.filter((k) => k.startsWith("collection:")).map((k) => getCollection(k.slice(11))).filter((c) => !!c);

    if (!resources.length && !collections.length) {
      return (
        <EmptyState
          title="Your shelf is empty"
          body="Tap the bookmark on any resource or collection in Explore to keep it here. Saved items follow your account across devices."
          action={<Link href="/dashboard/explore" data-testid="shelf-browse" className={btnPrimary}>Browse Explore</Link>}
        />
      );
    }
    return (
      <div className="space-y-10">
        {collections.length > 0 && (
          <section aria-labelledby="shelf-collections">
            <h2 id="shelf-collections" className="text-xl font-bold md:text-2xl">Collections</h2>
            <CollectionList collections={collections} />
          </section>
        )}
        {resources.length > 0 && (
          <section aria-labelledby="shelf-resources">
            <h2 id="shelf-resources" className="mb-4 text-xl font-bold md:text-2xl">Resources <span className="text-[#577E90]">{resources.length}</span></h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((r) => <ResourceCard key={r.id} resource={r} userId={user.id} />)}
            </div>
          </section>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-10 md:px-6 md:py-14 lg:px-12" data-testid="shelf-page">
      <PageHeader title={t("nav.myShelf")} description="Resources and collections you saved, on any device you sign in to.">
        <Link href="/dashboard/explore?tab=recent" className={btnLink}>Recently viewed</Link>
      </PageHeader>
      {body()}
    </div>
  );
}
