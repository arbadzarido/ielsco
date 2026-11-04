"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Award, BriefcaseBusiness, Globe2, GraduationCap, Library, Lightbulb, Plane, Search, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { PageHeader } from "../PageStates";
import { ACCENTS, btnLink, btnPrimary, cardGloss, focusRing, inputClass, type Accent } from "../ui";
import { useLoad } from "@/components/connect/shared";
import { loadOpportunities } from "@/lib/pulse";
import { loadProfessional } from "@/lib/professional/queries";
import { loadStoriesFeed } from "@/lib/content/stories-feed";
import { CATEGORY_LABEL, deadlineState, recommendOpportunities, type Category } from "@/lib/opportunities";
import { DEMO_RESOURCES } from "@/data/dashboard/resources";
import { featuredCollectionFor } from "@/data/dashboard/collections";
import { dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";

// Discover overview (docs/IELSCO-PRODUCT-ARCHITECTURE.md §3): Opportunities first, then News & Stories and Learning
// Materials. Category tiles show real counts of open listings; categories with nothing open say so.
type Tile = { label: string; icon: LucideIcon; accent: Accent; href: string; categories?: Category[]; professional?: boolean };
const TILES: Tile[] = [
  { label: "Scholarships", icon: GraduationCap, accent: "navy", categories: ["scholarship"], href: "/dashboard/discover/opportunities?category=scholarship" },
  { label: "Internships", icon: BriefcaseBusiness, accent: "teal", categories: ["internship"], href: "/dashboard/discover/opportunities?category=internship" },
  { label: "Jobs abroad", icon: Plane, accent: "coral", professional: true, href: "/dashboard/discover/opportunities?type=professional" },
  { label: "Fellowships", icon: Award, accent: "violet", categories: ["fellowship"], href: "/dashboard/discover/opportunities?category=fellowship" },
  { label: "Exchanges", icon: Globe2, accent: "green", categories: ["exchange"], href: "/dashboard/discover/opportunities?category=exchange" },
  { label: "Competitions", icon: Trophy, accent: "amber", categories: ["competition"], href: "/dashboard/discover/opportunities?category=competition" },
  { label: "Leadership & volunteering", icon: Users, accent: "teal", categories: ["volunteering"], href: "/dashboard/discover/opportunities?category=volunteering" },
  { label: "Programs & conferences", icon: Lightbulb, accent: "navy", categories: ["program", "conference"], href: "/dashboard/discover/opportunities" },
];

export function DiscoverOverview({ supabase, profile }: DashboardCtx) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const data = useLoad(async () => {
    const [academic, professional, stories] = await Promise.all([
      loadOpportunities(supabase), loadProfessional(supabase).catch(() => []), loadStoriesFeed(supabase).catch(() => ({ items: [], partial: true })),
    ]);
    return { academic, professional, stories: stories.items };
  }, [supabase]);
  const ready = data.state.s === "ready" ? data.state.data : null;
  const open = useMemo(() => ready?.academic.filter((o) => deadlineState(o.deadline) !== "closed") ?? [], [ready]);
  const picks = useMemo(() => recommendOpportunities(ready?.academic ?? [], profile, 3), [ready, profile]);
  const collection = featuredCollectionFor(profile.direction, profile.interests);
  const materials = DEMO_RESOURCES.filter((r) => r.origin === "curated" && r.url && r.linkCheckedOn).slice(0, 4);

  return (
    <div className="mx-auto max-w-[110rem] space-y-12 px-4 py-8 md:px-6 md:py-10 lg:px-10">
      <PageHeader title="Discover" description="Opportunities to go for, stories to learn from and materials to prepare with." />
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/dashboard/search?q=${encodeURIComponent(q.trim())}`); }} className="relative max-w-[640px]">
        <label htmlFor="discover-search" className="sr-only">Search opportunities, stories, materials, events and people</label>
        <Search size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#2F4157]/45" aria-hidden="true" />
        <input id="discover-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search opportunities, stories, materials, events and people"
          className={cn(inputClass, "rounded-full py-3.5 pl-14 text-[16px]")} data-testid="discover-search" />
      </form>

      <section aria-labelledby="opps-heading" className="space-y-4" data-testid="discover-opportunities">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#577E90]">Start here</p>
            <h2 id="opps-heading" className="mt-2 text-[26px] font-bold">Opportunities</h2>
          </div>
          <Link href="/dashboard/discover/opportunities" className={btnPrimary}>Browse all <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TILES.map((t) => {
            const n = ready ? (t.professional ? ready.professional.length : open.filter((o) => t.categories!.includes(o.category)).length) : null;
            const a = ACCENTS[t.accent];
            return (
              <li key={t.label}>
                <Link href={t.href} className={cn(cardGloss, "flex h-full items-center gap-3 p-4 transition-colors hover:border-[#577E90]", focusRing)} data-testid={`discover-tile-${t.label.toLowerCase().split(" ")[0]}`}>
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", a.soft, a.text)}><t.icon size={19} aria-hidden="true" /></span>
                  <span className="min-w-0"><span className="block text-[15px] font-semibold leading-tight">{t.label}</span>
                    <span className="text-[13px] text-[#2F4157]/60">{n === null ? "…" : n === 0 ? "None open right now" : `${n} open`}</span></span>
                </Link>
              </li>
            );
          })}
        </ul>
        {picks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[18px] font-bold">Recommended for your goals</h3>
            <ul className="grid gap-3 md:grid-cols-3">
              {picks.map(({ opportunity: o, reason }) => (
                <li key={o.id}>
                  <Link href={`/opportunities/${o.slug}`} className={cn(cardGloss, "flex h-full flex-col gap-1 p-5 hover:border-[#577E90]", focusRing)}>
                    <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">{CATEGORY_LABEL[o.category]}{reason ? ` · ${reason}` : ""}</span>
                    <span className="text-[17px] font-semibold leading-snug">{o.title}</span>
                    <span className="text-[14px] text-[#2F4157]/65">{o.organizer}{o.deadline ? ` · Deadline ${dateWib(o.deadline)}` : ""}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/dashboard/opportunities" className={btnLink}>My opportunity tracker <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="news-heading" className="space-y-3">
          <div className="flex items-end justify-between"><h2 id="news-heading" className="text-[22px] font-bold">News & Stories</h2><Link href="/dashboard/discover/stories" className={btnLink}>All stories</Link></div>
          {ready && ready.stories.length === 0 ? <p className="text-[15px] text-[#2F4157]/65">No stories published yet.</p> : (
            <ul className="space-y-2">
              {(ready?.stories ?? []).slice(0, 4).map((s) => (
                <li key={s.id}>
                  <Link href={s.href} className={cn(cardGloss, "block p-4 hover:border-[#577E90]", focusRing)}>
                    <span className="text-[13px] font-semibold text-[#577E90]">{s.categoryLabel}</span>
                    <span className="block text-[16px] font-semibold leading-snug">{s.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="materials-heading" className="space-y-3">
          <div className="flex items-end justify-between"><h2 id="materials-heading" className="text-[22px] font-bold">Learning Materials</h2><Link href="/dashboard/explore" className={btnLink}>All materials</Link></div>
          <Link href={`/dashboard/explore/collections/${collection.id}`} className={cn(cardGloss, "flex items-center gap-3 bg-gradient-to-br from-[#E6F4F2] via-white to-white p-4 hover:border-[#577E90]", focusRing)}>
            <Library size={20} className="text-[#0B6E64]" aria-hidden="true" />
            <span><span className="block text-[13px] font-semibold text-[#0B6E64]">Collection for your goals</span><span className="block text-[16px] font-semibold">{collection.title}</span></span>
          </Link>
          <ul className="space-y-2">
            {materials.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/explore/${r.id}`} className={cn(cardGloss, "flex items-center justify-between gap-3 p-4 hover:border-[#577E90]", focusRing)}>
                  <span className="min-w-0"><span className="block truncate text-[16px] font-semibold">{r.title}</span><span className="text-[13px] text-[#2F4157]/60">{r.type} · {r.source}</span></span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
