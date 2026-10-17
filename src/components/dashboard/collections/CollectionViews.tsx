"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Collection } from "@/lib/dashboard/types";
import { getResource } from "@/data/dashboard/resources";
import { SaveButton } from "../bookmarks/SaveButton";
import { focusRing } from "../ui";
import { cn } from "@/lib/utils";

const exploreLink = cn("inline-flex items-center gap-2 rounded-full text-base font-semibold text-[#2F4157] hover:text-[#577E90]", focusRing);

// Editorial, image-led presentation for the most relevant collection.
export function CollectionFeature({ collection, compact = false }: { collection: Collection; compact?: boolean }) {
  const resources = collection.resourceIds.map(getResource).filter(Boolean);
  return (
    <article data-testid={`collection-feature-${collection.id}`} className={cn("grid overflow-hidden rounded-3xl bg-white", compact ? "" : "md:grid-cols-[1.15fr_1fr]")}>
      <div className={cn("relative", compact ? "h-44" : "h-56 md:h-auto md:min-h-[320px]")}>
        <Image src={collection.cover} alt={collection.coverAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-[#2F4157]">Curated collection</span>
      </div>
      <div className="flex flex-col p-6 md:p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">{collection.level}</p>
        <h3 className="mb-2 text-2xl font-bold leading-tight md:text-3xl">{collection.title}</h3>
        <p className="mb-4 text-lg text-[#2F4157]/75">{collection.outcome}</p>
        {!compact && (
          <ul className="mb-6 space-y-1.5 text-base text-[#2F4157]/70">
            {resources.slice(0, 3).map((r) => (
              <li key={r!.id} className="truncate">— {r!.title} <span className="text-[#2F4157]/45">· {r!.source}</span></li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-center gap-3">
          <Link href={`/dashboard/explore/collections/${collection.id}`} data-testid={`collection-open-${collection.id}`} className={exploreLink}>
            Explore collection <ArrowRight size={16} />
          </Link>
          <SaveButton type="collection" id={collection.id} title={collection.title} />
        </div>
      </div>
    </article>
  );
}

// Secondary collections as a slim image + text list (not identical boxes).
export function CollectionList({ collections }: { collections: Collection[] }) {
  return (
    <ul className="divide-y divide-[#E3E7ED]/60">
      {collections.map((c) => (
        <li key={c.id} data-testid={`collection-row-${c.id}`} className="flex items-center gap-4 py-4">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
            <Image src={c.cover} alt="" fill sizes="96px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/explore/collections/${c.id}`} className={cn("rounded text-lg font-bold hover:underline underline-offset-4", focusRing)}>
              {c.title}
            </Link>
            <p className="truncate text-base text-[#2F4157]/60">{c.level} · {c.resourceIds.length} resources</p>
          </div>
          <SaveButton type="collection" id={c.id} title={c.title} />
        </li>
      ))}
    </ul>
  );
}
