"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState } from "../PageStates";
import { ResourceRow } from "../resources/ResourceRow";
import { SaveButton } from "../bookmarks/SaveButton";
import { CoursePromo } from "../home/HomePromos";
import { btnLink, btnPrimary } from "../ui";
import { getCollection } from "@/data/dashboard/collections";
import { getResource } from "@/data/dashboard/resources";
import { isCourseTrack } from "@/data/dashboard/courses";
import type { Resource } from "@/lib/dashboard/types";

export function CollectionDetailView({ user, id }: DashboardCtx & { id: string }) {
  const collection = getCollection(id);
  if (!collection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <EmptyState title="Collection not found" body="It may have been renamed or removed." action={<Link href="/dashboard/explore" className={btnPrimary}>Back to Explore</Link>} />
      </div>
    );
  }
  const resources = collection.resourceIds.map(getResource).filter(Boolean) as Resource[];

  return (
    <article data-testid="collection-detail" className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Link href="/dashboard/explore" className={btnLink}><ArrowLeft size={16} /> Explore</Link>
      <div className="relative mt-6 h-56 overflow-hidden rounded-3xl md:h-80">
        <Image src={collection.cover} alt={collection.coverAlt} fill priority sizes="(min-width: 1024px) 1000px, 100vw" className="object-cover" />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1 text-xs text-white">{collection.coverCredit}</span>
      </div>
      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">Curated collection · {collection.level}</p>
          <h1 className="mb-3 text-3xl font-bold leading-tight md:text-5xl">{collection.title}</h1>
          <p className="text-xl text-[#2F4157]/80"><span className="font-semibold">Outcome:</span> {collection.outcome}</p>
          <p className="mt-2 text-lg text-[#2F4157]/70">{collection.description}</p>
        </div>
        <SaveButton type="collection" id={collection.id} title={collection.title} variant="full" />
      </div>
      <p className="mt-6 text-base text-[#2F4157]/55">A hand-picked reading and listening list, not a course. There are no tasks and nothing is tracked.</p>
      <ul className="mt-6 divide-y divide-[#E3E7ED]/60 border-y border-[#E3E7ED]/60">
        {resources.map((r) => <ResourceRow key={r.id} resource={r} userId={user.id} />)}
      </ul>
      {collection.courseTrack && isCourseTrack(collection.courseTrack) && (
        <div className="mt-12"><CoursePromo track={collection.courseTrack} reason={`Goes deeper than this collection`} /></div>
      )}
    </article>
  );
}
