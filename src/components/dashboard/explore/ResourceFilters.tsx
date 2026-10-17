"use client";

import { Search, X } from "lucide-react";
import { RESOURCE_CATEGORIES, RESOURCE_TYPES } from "@/data/dashboard/resources";
import { DIRECTIONS } from "@/lib/dashboard/options";
import type { Direction } from "@/lib/dashboard/types";
import { focusRing, inputClass } from "../ui";
import { cn } from "@/lib/utils";

export interface ResourceFilterState {
  query: string;
  category: string;
  type: string;
  direction: Direction | "";
  mine: boolean;
}

export const EMPTY_FILTERS: ResourceFilterState = { query: "", category: "", type: "", direction: "", mine: false };

const chip = (active: boolean) =>
  cn(
    "shrink-0 rounded-full border px-3.5 py-1.5 text-base font-medium transition-colors",
    focusRing,
    active ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157] hover:border-[#577E90]"
  );

export function ResourceFilters({
  value,
  onChange,
  canMatchGoals,
}: {
  value: ResourceFilterState;
  onChange: (v: ResourceFilterState) => void;
  canMatchGoals: boolean;
}) {
  const set = (patch: Partial<ResourceFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#577E90]" />
          <input
            type="search"
            data-testid="resource-search-input"
            aria-label="Search resources"
            placeholder="Search by title, source or topic"
            value={value.query}
            onChange={(e) => set({ query: e.target.value })}
            className={cn(inputClass, "pl-11")}
          />
        </div>
        <select aria-label="Resource type" data-testid="resource-type-select" value={value.type} onChange={(e) => set({ type: e.target.value })} className={cn(inputClass, "md:w-48")}>
          <option value="">All types</option>
          {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Goal direction" data-testid="resource-direction-select" value={value.direction} onChange={(e) => set({ direction: e.target.value as Direction | "" })} className={cn(inputClass, "md:w-52")}>
          <option value="">All directions</option>
          {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Category">
        {canMatchGoals && (
          <button type="button" data-testid="filter-my-goals" aria-pressed={value.mine} onClick={() => set({ mine: !value.mine })} className={chip(value.mine)}>
            Matches my goals
          </button>
        )}
        <button type="button" data-testid="category-all" aria-pressed={value.category === ""} onClick={() => set({ category: "" })} className={chip(value.category === "")}>
          All categories
        </button>
        {RESOURCE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            data-testid={`category-${c.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            aria-pressed={value.category === c}
            onClick={() => set({ category: value.category === c ? "" : c })}
            className={chip(value.category === c)}
          >
            {c}
          </button>
        ))}
      </div>

      {JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS) && (
        <button type="button" data-testid="clear-filters" onClick={() => onChange(EMPTY_FILTERS)} className={cn("inline-flex items-center gap-1 rounded text-base font-semibold text-[#577E90] hover:underline", focusRing)}>
          <X size={15} /> Clear filters
        </button>
      )}
    </div>
  );
}
