"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Resource } from "@/lib/dashboard/types";
import { recordView } from "@/lib/dashboard/recent";
import { ResourceThumb } from "./ResourceThumb";
import { SaveButton } from "../bookmarks/SaveButton";
import { focusRing } from "../ui";
import { cn } from "@/lib/utils";

export const resourceMeta = (r: Resource) =>
  [r.category, r.level, r.isFree ? "Free" : "Paid", r.duration].filter(Boolean).join(" · ");

export function OpenResourceLink({ resource, userId, className }: { resource: Resource; userId: string; className?: string }) {
  if (!resource.url) return <span className="text-sm text-[#2F4157]/50">Not published yet</span>;
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => recordView(userId, resource.id)}
      data-testid={`resource-open-${resource.id}`}
      aria-label={`Open ${resource.title} on ${resource.source} (opens in a new tab)`}
      className={cn("inline-flex items-center gap-1.5 rounded-full text-base font-semibold text-[#2F4157] hover:text-[#577E90]", focusRing, className)}
    >
      Open <ExternalLink size={15} />
    </a>
  );
}

// Compact list presentation (Home, collections, saved shelf).
export function ResourceRow({ resource, userId }: { resource: Resource; userId: string }) {
  return (
    <li data-testid={`resource-row-${resource.id}`} className="flex items-center gap-4 py-4">
      <ResourceThumb resource={resource} />
      <div className="min-w-0 flex-1">
        <Link href={`/dashboard/explore/${resource.id}`} className={cn("rounded text-lg font-bold leading-snug hover:text-[#577E90] hover:underline underline-offset-4", focusRing)}>
          {resource.title}
        </Link>
        <p className="truncate text-base text-[#2F4157]/60">
          {resource.type} · {resource.source}
          <span className="hidden sm:inline"> · {resource.level}</span>
        </p>
      </div>
      <OpenResourceLink resource={resource} userId={userId} className="hidden sm:inline-flex" />
      <SaveButton type="resource" id={resource.id} title={resource.title} />
    </li>
  );
}
