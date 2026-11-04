"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BookOpen, BriefcaseBusiness, CalendarDays, HelpCircle, Newspaper, Search, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardPage, type DashboardCtx } from "@/components/dashboard/DashboardPage";
import { EmptyState, PageHeader } from "@/components/dashboard/PageStates";
import { cardGloss, focusRing, inputClass } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { loadStoriesFeed, type FeedStory } from "@/lib/content/stories-feed";
import { searchTopics } from "@/lib/copilot";
import { eventDayLabel, officialEvents } from "@/lib/events/catalog";
import { CATEGORY_LABEL, type Opportunity } from "@/lib/opportunities";
import { loadProfessional } from "@/lib/professional/queries";
import type { ProfessionalOpportunity } from "@/lib/professional/model";
import { loadOpportunities } from "@/lib/pulse";
import { COLLECTIONS } from "@/data/dashboard/collections";
import { DEMO_RESOURCES } from "@/data/dashboard/resources";
import { cn } from "@/lib/utils";

// Global search (docs/IELSCO-PRODUCT-ARCHITECTURE.md §11): one box over opportunities, jobs abroad, events, news &
// stories, learning materials, people and help answers. Content lists are small, so they are matched in the browser;
// people are searched by the existing privacy-masked directory RPC (only members who opted in to Discover).
type Hit = { id: string; title: string; detail: string; href: string };
type Group = { id: string; label: string; icon: LucideIcon; hits: Hit[] };
type Corpus = { opps: Opportunity[]; jobs: ProfessionalOpportunity[]; stories: FeedStory[] };

const matches = (q: string, ...fields: (string | null | undefined)[]) => {
  const hay = fields.filter(Boolean).join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};

function SearchView({ supabase }: DashboardCtx) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [people, setPeople] = useState<Hit[] | null>(null);
  useEffect(() => setQ(initial), [initial]);

  useEffect(() => {
    Promise.all([loadOpportunities(supabase), loadProfessional(supabase).catch(() => []), loadStoriesFeed(supabase).then((f) => f.items).catch(() => [])])
      .then(([opps, jobs, stories]) => setCorpus({ opps, jobs, stories }));
  }, [supabase]);

  const term = initial.trim();
  useEffect(() => {
    if (term.length < 2) { setPeople(null); return; }
    let alive = true;
    connectApi.discover(supabase, { search: term, country: "", speaks: "", learning: "", englishLevel: "", topic: "", goal: "", activity: "", day: "" }, 0, 6)
      .then((rows) => alive && setPeople(rows.map((r) => ({ id: r.person.id, title: r.person.display_name, detail: [r.person.role_status, r.person.country].filter(Boolean).join(" · ") || "Member", href: `/dashboard/connect/people/${r.person.id}` }))))
      .catch(() => alive && setPeople([]));
    return () => { alive = false; };
  }, [supabase, term]);

  const groups: Group[] = useMemo(() => {
    if (term.length < 2) return [];
    const c = corpus;
    return [
      { id: "opportunities", label: "Opportunities", icon: BriefcaseBusiness, hits: [
        ...(c?.opps ?? []).filter((o) => matches(term, o.title, o.organizer, o.summary, o.category, CATEGORY_LABEL[o.category], o.open_to)).map((o) => ({ id: o.id, title: o.title, detail: `${CATEGORY_LABEL[o.category]} · ${o.organizer}`, href: `/opportunities/${o.slug}` })),
        ...(c?.jobs ?? []).filter((j) => matches(term, j.title, j.industry, j.summary, j.positions.join(" "), "job jobs work abroad")).map((j) => ({ id: j.id, title: j.title, detail: `Job abroad · ${j.industry}`, href: `/dashboard/discover/opportunities/professional/${j.slug}` })),
      ] },
      { id: "events", label: "Events", icon: CalendarDays, hits: officialEvents().filter((e) => matches(term, e.title, e.excerpt, e.format === "talk" ? "talk talks" : "")).map((e) => ({ id: e.id, title: e.title, detail: `${e.isPast ? "Past" : "Upcoming"} · ${eventDayLabel(e.date)}`, href: e.href })) },
      { id: "stories", label: "News & Stories", icon: Newspaper, hits: (c?.stories ?? []).filter((s) => matches(term, s.title, s.summary, s.author, s.tags.join(" "))).map((s) => ({ id: s.id, title: s.title, detail: s.categoryLabel, href: s.href })) },
      { id: "materials", label: "Learning Materials", icon: BookOpen, hits: [
        ...COLLECTIONS.filter((col) => matches(term, col.title, col.outcome, col.description)).map((col) => ({ id: col.id, title: col.title, detail: "Collection", href: `/dashboard/explore/collections/${col.id}` })),
        ...DEMO_RESOURCES.filter((r) => r.url && matches(term, r.title, r.description, r.type, r.category, r.source)).map((r) => ({ id: r.id, title: r.title, detail: `${r.type} · ${r.source}`, href: `/dashboard/explore/${r.id}` })),
      ] },
      { id: "people", label: "People", icon: Users, hits: people ?? [] },
      { id: "help", label: "Help", icon: HelpCircle, hits: searchTopics(term).map((t) => ({ id: t.id, title: t.q, detail: t.cta, href: t.href })) },
    ];
  }, [term, corpus, people]);
  const total = groups.reduce((n, g) => n + g.hits.length, 0);
  const loading = term.length >= 2 && (!corpus || people === null);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6 md:py-10">
      <PageHeader title="Search" description="Opportunities, events, stories, learning materials, people and help, in one place." />
      <form role="search" onSubmit={(e) => { e.preventDefault(); router.replace(`/dashboard/search?q=${encodeURIComponent(q.trim())}`); }} className="relative">
        <label htmlFor="global-search" className="sr-only">Search IELSco</label>
        <Search size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#2F4157]/45" aria-hidden="true" />
        <input id="global-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “scholarship”, “Japan”, “interview” or a member's name"
          className={cn(inputClass, "rounded-full py-3.5 pl-14 text-[16px]")} data-testid="global-search-input" />
      </form>
      {term.length < 2 ? (
        <p className="text-[15px] text-[#2F4157]/65">Type at least two letters and press Enter.</p>
      ) : (
        <>
          <p className="text-[14px] text-[#2F4157]/60" aria-live="polite">{loading ? "Searching…" : `${total} result${total === 1 ? "" : "s"} for “${term}”`}</p>
          {!loading && total === 0 && (
            <EmptyState title="Nothing found" body="Try a shorter word, a country or a type like “internship”. People appear only if they chose to be listed in Discover."
              action={<Link href="/dashboard/discover" className={cn("font-semibold text-[#577E90] hover:underline", focusRing)}>Browse Discover</Link>} />
          )}
          <div className="space-y-8" data-testid="search-results">
            {groups.filter((g) => g.hits.length > 0).map((g) => (
              <section key={g.id} aria-labelledby={`results-${g.id}`} className="space-y-2">
                <h2 id={`results-${g.id}`} className="flex items-center gap-2 text-[18px] font-bold"><g.icon size={18} className="text-[#577E90]" aria-hidden="true" /> {g.label} <span className="text-[14px] font-normal text-[#2F4157]/55">{g.hits.length}</span></h2>
                <ul className="space-y-2">
                  {g.hits.slice(0, 8).map((h) => (
                    <li key={`${g.id}-${h.id}`}>
                      <Link href={h.href} className={cn(cardGloss, "block p-4 hover:border-[#577E90]", focusRing)}>
                        <span className="block text-[16px] font-semibold">{h.title}</span>
                        <span className="text-[14px] text-[#2F4157]/65">{h.detail}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <DashboardPage>{(ctx) => <Suspense fallback={null}><SearchView {...ctx} /></Suspense>}</DashboardPage>;
}
