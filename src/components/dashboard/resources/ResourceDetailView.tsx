"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState } from "../PageStates";
import { ResourceThumb } from "./ResourceThumb";
import { OpenResourceLink } from "./ResourceRow";
import { originLabel } from "../ResourceCard";
import { SaveButton } from "../bookmarks/SaveButton";
import { CoursePromo } from "../home/HomePromos";
import { btnLink, btnPrimary } from "../ui";
import { getResource } from "@/data/dashboard/resources";
import { COLLECTIONS } from "@/data/dashboard/collections";
import { CATEGORY_TO_TRACK } from "@/data/dashboard/courses";
import { recordView } from "@/lib/dashboard/recent";

export function ResourceDetailView({ user, id }: DashboardCtx & { id: string }) {
  const resource = getResource(id);
  useEffect(() => {
    if (resource) recordView(user.id, resource.id);
  }, [user.id, resource]);

  if (!resource) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <EmptyState title="Resource not found" body="It may have been removed from the library." action={<Link href="/dashboard/explore" className={btnPrimary}>Back to Explore</Link>} />
      </div>
    );
  }

  const inCollections = COLLECTIONS.filter((c) => c.resourceIds.includes(resource.id));
  const track = CATEGORY_TO_TRACK[resource.category];
  const facts: [string, string | null | undefined][] = [
    ["Type", resource.type],
    ["Topic", resource.category],
    ["Level", resource.level],
    ["Cost", resource.isFree ? "Free" : "Paid"],
    ["Source", resource.source],
    ["Duration", resource.duration],
    ["Status", originLabel(resource)],
  ];

  return (
    <article data-testid="resource-detail" className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <Link href="/dashboard/explore" className={btnLink}><ArrowLeft size={16} /> Explore</Link>
      <ResourceThumb resource={resource} variant="band" className="mt-6 h-40 rounded-3xl" />
      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_260px]">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-[#577E90]">{resource.source}</p>
          <h1 className="mb-4 text-3xl font-bold leading-tight md:text-4xl">{resource.title}</h1>
          <p className="mb-8 text-lg leading-relaxed text-[#2F4157]/80">{resource.description}</p>
          <div className="flex flex-wrap items-center gap-4">
            {resource.url && <OpenResourceLink resource={resource} userId={user.id} className="rounded-full bg-[#2F4157] px-5 py-2.5 text-white hover:bg-[#3d5470] hover:text-white" />}
            <SaveButton type="resource" id={resource.id} title={resource.title} variant="full" />
          </div>
          {inCollections.length > 0 && (
            <p className="mt-8 text-base text-[#2F4157]/70">
              Part of:{" "}
              {inCollections.map((c, i) => (
                <span key={c.id}>{i > 0 && ", "}<Link href={`/dashboard/explore/collections/${c.id}`} className="font-semibold underline-offset-4 hover:underline">{c.title}</Link></span>
              ))}
            </p>
          )}
        </div>
        <dl className="divide-y divide-[#E3E7ED]/60 text-base">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5">
              <dt className="text-[#2F4157]/55">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      {track && <div className="mt-12"><CoursePromo track={track} reason={`Related to ${resource.category}`} /></div>}
    </article>
  );
}
