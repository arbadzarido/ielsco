"use client";

import { useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { card, focusRing } from "@/components/site/ui";
import {
  activeFilterCount, EMPLOYMENT_LABEL, EMPTY_FILTERS, filterJobs, filterOptions, type JobFilters, type ProfessionalOpportunity,
} from "@/lib/professional/model";
import { JobCard, JobCardSkeleton } from "./JobCard";

const chip = (on: boolean) => cn("shrink-0 rounded-full border px-4 py-2 text-[14px] font-semibold transition-colors", focusRing,
  on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#D5DBE3] bg-white text-[#2F4157] hover:border-[#2F4157]");
function FilterSelect({ label, value, onChange, testId, children }: { label: string; value: string; onChange: (v: string) => void; testId: string; children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-semibold text-[#2F4157]">{label}
      <span className="relative mt-1.5 block">
        <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId}
          className={cn("block w-full appearance-none rounded-[12px] border border-[#D5DBE3] bg-white py-2.5 pl-3.5 pr-9 text-[15px] font-normal text-[#1A2534] hover:border-[#B8C2CF]", focusRing)}>
          {children}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#2F4157]/60" aria-hidden="true" />
      </span>
    </label>
  );
}

// Data-driven job directory: every option list comes from the published listings (filterOptions), so a new country,
// industry or role shows up without code changes. `items === null` renders the loading skeleton. Cards link to
// `${basePath}/<slug>` (the public or the dashboard detail page).
export function ProfessionalBoard({ items, basePath, initialFilters }: {
  items: ProfessionalOpportunity[] | null; basePath: string; initialFilters?: Partial<JobFilters>;
}) {
  const [f, setF] = useState<JobFilters>({ ...EMPTY_FILTERS, ...initialFilters });
  const set = <K extends keyof JobFilters>(k: K, v: JobFilters[K]) => setF((s) => ({ ...s, [k]: v }));
  const opts = useMemo(() => filterOptions(items ?? []), [items]);
  const shown = useMemo(() => filterJobs(items ?? [], f), [items, f]);
  const active = activeFilterCount(f);

  return (
    <div data-testid="professional-board">
      <div className="flex flex-col gap-5">
        <label className="relative block max-w-[560px]">
          <span className="sr-only">Search jobs</span>
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/45" aria-hidden="true" />
          <input value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Search by job title, country or industry" type="search"
            className={cn("w-full rounded-full border border-[#D5DBE3] bg-white py-3 pl-11 pr-4 text-[16px] placeholder:text-[#2F4157]/45", focusRing)} data-testid="job-search" />
        </label>

        {opts.industries.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Industry">
            <button type="button" className={chip(f.industry === "all")} aria-pressed={f.industry === "all"} onClick={() => set("industry", "all")}>All industries</button>
            {opts.industries.map((i) => (
              <button key={i} type="button" className={chip(f.industry === i)} aria-pressed={f.industry === i} onClick={() => set("industry", i)} data-testid={`industry-${i}`}>{i}</button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <FilterSelect label="Country" value={f.country} onChange={(v) => set("country", v)} testId="filter-country">
            <option value="all">All countries</option>
            {opts.countries.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </FilterSelect>
          <FilterSelect label="Job position" value={f.position} onChange={(v) => set("position", v)} testId="filter-position">
            <option value="all">All positions</option>
            {opts.positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </FilterSelect>
          <FilterSelect label="Employment type" value={f.employment} onChange={(v) => set("employment", v)} testId="filter-employment">
            <option value="all">Any type</option>
            {opts.employment.map((t) => <option key={t} value={t}>{EMPLOYMENT_LABEL[t]}</option>)}
          </FilterSelect>
          <label className="flex items-end pb-2.5 text-[14px] font-medium text-[#2F4157]">
            <span className="inline-flex items-center gap-2"><input type="checkbox" checked={f.hideClosed} onChange={(e) => set("hideClosed", e.target.checked)} className="h-4 w-4 accent-[#2F4157]" /> Hide closed</span>
          </label>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] text-[#2F4157]/65" aria-live="polite" data-testid="job-count">
          {items === null ? "Loading opportunities…" : `${shown.length} ${shown.length === 1 ? "opportunity" : "opportunities"}${active ? " match your filters" : ""}`}
        </p>
        {active > 0 && (
          <button type="button" onClick={() => setF(EMPTY_FILTERS)} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold text-[#2F4157] hover:bg-[#F1F4F8]", focusRing)} data-testid="reset-filters">
            <RotateCcw size={15} aria-hidden="true" /> Reset filters ({active})
          </button>
        )}
      </div>

      {items !== null && shown.length === 0 ? (
        <div className={cn(card, "mt-4 flex flex-col items-center p-10 text-center")} data-testid="job-empty">
          <SearchX size={32} className="text-[#2F4157]/35" aria-hidden="true" />
          <p className="mt-3 text-[18px] font-bold text-[#1A2534]">{items.length === 0 ? "No international jobs are listed right now" : "No jobs match those filters"}</p>
          <p className="mt-2 max-w-[460px] text-[15px] text-[#2F4157]/70">
            {items.length === 0 ? "New countries and roles are added as our recruitment partners confirm them. Please check back soon." : "Try another country or industry, or clear the filters to see every listing."}
          </p>
          {active > 0 && <button type="button" onClick={() => setF(EMPTY_FILTERS)} className={cn("mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#D5DBE3] px-4 py-2 text-[14px] font-semibold text-[#2F4157] hover:border-[#2F4157]", focusRing)}>Reset filters</button>}
        </div>
      ) : (
        <ul className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items === null ? Array.from({ length: 6 }, (_, i) => <JobCardSkeleton key={i} />) : shown.map((o) => <JobCard key={o.id} o={o} href={`${basePath}/${o.slug}`} />)}
        </ul>
      )}
    </div>
  );
}
