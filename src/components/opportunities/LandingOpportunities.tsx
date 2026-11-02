"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnPrimary, cardLink, container, eyebrow, h2, lead, pill, section } from "@/components/site/ui";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABEL, FUNDING_LABEL, type Opportunity } from "@/lib/opportunities";
import { professionalDisclaimer, type OpportunityTrack, type ProfessionalOpportunity } from "@/lib/professional/model";
import { loadProfessional } from "@/lib/professional/queries";
import { JobCard, JobCardSkeleton } from "./JobCard";
import { TrackSwitch } from "./TrackSwitch";

type Academic = Pick<Opportunity, "id" | "slug" | "title" | "organizer" | "category" | "funding">;

// Landing-page preview of the Opportunities directory: the same Academic | Professional switcher and the same data,
// featured listings only, with a link into the full directory on the chosen tab.
export function LandingOpportunities() {
  const [current, setCurrent] = useState<OpportunityTrack>("academic");
  const [academic, setAcademic] = useState<Academic[] | null>(null);
  const [jobs, setJobs] = useState<ProfessionalOpportunity[] | null>(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.from("opportunities").select("id, slug, title, organizer, category, funding").eq("status", "published").eq("featured", true).limit(4)
      .then(({ data }) => setAcademic((data as Academic[]) ?? []));
    loadProfessional(supabase, { featuredOnly: true, limit: 3 }).then(setJobs, () => setJobs([]));
  }, []);
  if (academic?.length === 0 && jobs?.length === 0) return null;
  const partner = jobs?.find((j) => j.partner)?.partner?.name;

  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="opp-preview-heading" data-testid="landing-opportunity-preview">
      <div className={container}>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[640px]">
            <p className={eyebrow}>Opportunity board</p>
            <h2 id="opp-preview-heading" className={cn(h2, "mt-3")}>Study, grow and work across borders</h2>
            <p className={cn(lead, "mt-4")}>
              {current === "academic" ? "Scholarships, exchanges and programs abroad. Each listing links to the official page and says what we have checked."
                : "International jobs shared with our official recruitment partners, with salary, benefits and who handles the recruitment."}
            </p>
          </div>
          <TrackSwitch value={current} onChange={setCurrent} controls="landing-opportunity-panel" className="md:max-w-[400px]" />
        </div>

        <div id="landing-opportunity-panel" role="tabpanel" aria-labelledby={`track-${current}`} className="mt-10">
          {current === "academic" ? (
            <ul key="academic" className="grid gap-5 motion-safe:animate-in motion-safe:fade-in duration-300 sm:grid-cols-2 lg:grid-cols-4">
              {(academic ?? Array.from({ length: 4 }, () => null)).map((o, i) => (
                <li key={o?.id ?? i}>
                  {o ? (
                    <Link href={`/opportunities/${o.slug}`} className={cn(cardLink, "flex h-full flex-col p-6")}>
                      <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">{CATEGORY_LABEL[o.category]}</span>
                      <span className="mt-3 text-[18px] font-bold leading-snug text-[#1A2534]">{o.title}</span>
                      <span className="mt-1 flex-1 text-[14px] text-[#2F4157]/65">{o.organizer}</span>
                      <span className={cn(pill, "mt-5 self-start")}>{FUNDING_LABEL[o.funding]}</span>
                    </Link>
                  ) : <div className="h-[200px] animate-pulse rounded-[20px] bg-[#F1F4F8]" aria-hidden="true" />}
                </li>
              ))}
            </ul>
          ) : (
            <div key="professional" className="motion-safe:animate-in motion-safe:fade-in duration-300">
              <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {jobs === null ? [0, 1, 2].map((i) => <JobCardSkeleton key={i} />) : jobs.map((o) => <JobCard key={o.id} o={o} href={`/opportunities/professional/${o.slug}`} />)}
              </ul>
              {jobs?.length === 0 && <p className="text-[15px] text-[#2F4157]/70">New international jobs are added as our partners confirm them.</p>}
              <p className="mt-6 max-w-[900px] text-[13.5px] leading-relaxed text-[#2F4157]/60">{professionalDisclaimer(partner)}</p>
            </div>
          )}
        </div>

        <Link href={current === "academic" ? "/opportunities" : "/opportunities?type=professional"} className={cn(btnPrimary, "mt-10")} data-testid="landing-explore-all">
          Explore all {current === "academic" ? "academic" : "professional"} opportunities <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
