"use client";

import Link from "next/link";
import type { Resource } from "@/lib/dashboard/types";
import { ResourceThumb } from "./resources/ResourceThumb";
import { OpenResourceLink, resourceMeta } from "./resources/ResourceRow";
import { SaveButton } from "./bookmarks/SaveButton";
import { focusRing } from "./ui";
import { cn } from "@/lib/utils";

export function originLabel(r: Resource) {
  if (r.origin === "ielsco-demo") return "Original IELSco material (demo)";
  return r.linkCheckedOn ? "Third-party · link checked" : "Third-party · link check pending";
}

// Grid presentation for Explore. Fallback visual band instead of fabricated thumbnails.
export function ResourceCard({ resource, userId }: { resource: Resource; userId: string }) {
  return (
    <article data-testid={`resource-card-${resource.id}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#E3E7ED]/60 bg-white">
      <ResourceThumb resource={resource} variant="band" />
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#577E90]">{resource.source}</p>
        <h3 className="mb-2 text-lg font-bold leading-snug">
          <Link href={`/dashboard/explore/${resource.id}`} data-testid={`resource-details-${resource.id}`} className={cn("rounded hover:underline underline-offset-4", focusRing)}>
            {resource.title}
          </Link>
        </h3>
        <p className="mb-3 line-clamp-2 text-base leading-relaxed text-[#2F4157]/75">{resource.description}</p>
        <p className="mb-4 text-sm text-[#2F4157]/60">{resourceMeta(resource)}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#E3E7ED]/50 pt-4">
          <span className="text-sm text-[#2F4157]/55">{originLabel(resource)}</span>
          <div className="flex items-center gap-3">
            <OpenResourceLink resource={resource} userId={userId} />
            <SaveButton type="resource" id={resource.id} title={resource.title} />
          </div>
        </div>
      </div>
    </article>
  );
}
