"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { h2, lead } from "@/components/site/ui";
import type { Opportunity } from "@/lib/opportunities";
import { parseTrack, type OpportunityTrack, type ProfessionalOpportunity, type RecruitmentPartner } from "@/lib/professional/model";
import { track as trackEvent } from "@/lib/analytics";
import OpportunityBoard from "./OpportunityBoard";
import { ProfessionalBoard } from "./ProfessionalBoard";
import { Disclaimer, PartnerCard, RoleSplit } from "./PartnerPanel";
import { TrackSwitch } from "./TrackSwitch";

// The one Opportunities experience, used by /opportunities and the dashboard (Discover → Opportunities): the Academic |
// Professional switcher over the existing academic board and the professional job directory. Switching never reloads:
// the choice is kept in ?type= with history.replaceState, so links, refreshes and "back" from a listing keep it.
// `null` data = still loading (skeletons).
export function OpportunitiesExplorer({ academic, professional, initialTrack, jobBasePath, academicEmpty, syncUrl = true }: {
  academic: Opportunity[] | null;
  professional: ProfessionalOpportunity[] | null;
  initialTrack?: OpportunityTrack;
  jobBasePath: string;
  academicEmpty?: ReactNode;
  syncUrl?: boolean;
}) {
  const [current, setCurrent] = useState<OpportunityTrack>(() =>
    initialTrack ?? (typeof window !== "undefined" ? parseTrack(new URLSearchParams(window.location.search).get("type")) : "academic"));

  const choose = useCallback((t: OpportunityTrack) => {
    setCurrent(t);
    trackEvent("opportunity_track", { track: t });
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    if (t === "professional") url.searchParams.set("type", "professional"); else url.searchParams.delete("type");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [syncUrl]);

  const partners = useMemo(() => {
    const m = new Map<string, RecruitmentPartner>();
    (professional ?? []).forEach((o) => { if (o.partner) m.set(o.partner.id, o.partner); });
    return [...m.values()];
  }, [professional]);

  return (
    <div data-testid="opportunities-explorer">
      <TrackSwitch value={current} onChange={choose} controls="opportunity-panel" />

      <div id="opportunity-panel" role="tabpanel" aria-labelledby={`track-${current}`} className="mt-10">
        {current === "academic" ? (
          <div key="academic" className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300" data-testid="academic-panel">
            <p className={cn(lead, "mb-8 max-w-[720px] text-[16px] sm:text-[17px]")}>
              Scholarships, exchanges, fellowships and study programs abroad. A short list we maintain by hand: every listing links to
              the official page and says what we have checked.
            </p>
            {academic === null ? <div className="grid gap-5 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[260px] animate-pulse rounded-[20px] bg-[#F1F4F8]" aria-hidden="true" />)}</div>
              : academic.length > 0 ? <OpportunityBoard items={academic} /> : academicEmpty}
          </div>
        ) : (
          <div key="professional" className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300" data-testid="professional-panel">
            <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
              <div>
                <h2 className={cn(h2, "text-[28px] sm:text-[34px]")}>Build Your Career Beyond Borders</h2>
                <p className={cn(lead, "mt-4 text-[16px] sm:text-[17px]")}>Discover international employment opportunities and explore your next professional journey abroad.</p>
                <p className="mt-3 text-[15.5px] leading-relaxed text-[#2F4157]/75">
                  IELSco connects aspiring international professionals with information about overseas employment opportunities through
                  collaborations with trusted industry partners. For official recruitment information, placement procedures, eligibility
                  requirements and employment contracts, you will be directed to the partner&apos;s official channels.
                </p>
              </div>
              {partners.length > 0 && <div className="space-y-4">{partners.map((p) => <PartnerCard key={p.id} partner={p} compact />)}</div>}
            </div>
            <Disclaimer partner={partners.length === 1 ? partners[0].name : undefined} className="mt-8" />
            <div className="mt-10"><ProfessionalBoard items={professional} basePath={jobBasePath} /></div>
            <div className="mt-12"><RoleSplit /></div>
          </div>
        )}
      </div>
    </div>
  );
}
