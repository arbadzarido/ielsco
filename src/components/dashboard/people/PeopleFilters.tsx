"use client";

import { DIRECTIONS, INTERESTS, NOT_DECIDED, ORIGIN_OPTIONS, PREFER_NOT_TO_SAY } from "@/lib/dashboard/options";
import { countryName, searchCountries } from "@/lib/dashboard/countries";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DirectoryQuery } from "@/lib/dashboard/profile";
import type { Direction } from "@/lib/dashboard/types";
import { inputClass } from "../ui";
import { cn } from "@/lib/utils";

const ALL_INTERESTS = Array.from(new Set(Object.values(INTERESTS).flat())).filter((i) => i !== "Not sure yet");
const select = cn(inputClass, "py-2.5");

export function PeopleFilters({ value, onChange }: { value: DirectoryQuery; onChange: (q: DirectoryQuery) => void }) {
  const set = (patch: Partial<DirectoryQuery>) => onChange({ ...value, ...patch });
  const { locale } = useI18n();
  // Values are English names: the directory matches on member_profiles.destination_country (first destination).
  const destinations = searchCountries("", locale);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input
        type="search"
        data-testid="people-search-input"
        aria-label="Search people"
        placeholder="Search by name or any country (e.g. Australia)"
        value={value.search}
        onChange={(e) => set({ search: e.target.value })}
        className={cn(select, "sm:col-span-2")}
      />
      <select aria-label="From (country of origin)" data-testid="people-origin-select" value={value.origin} onChange={(e) => set({ origin: e.target.value })} className={select}>
        <option value="">Any origin</option>
        {ORIGIN_OPTIONS.filter((c) => c !== PREFER_NOT_TO_SAY).map((c) => <option key={c} value={c}>From {c}</option>)}
      </select>
      <select aria-label="Destination country" data-testid="people-destination-select" value={value.destination} onChange={(e) => set({ destination: e.target.value })} className={select}>
        <option value="">Any destination</option>
        {destinations.map((code) => <option key={code} value={countryName(code, "en")}>{`Going to ${countryName(code, locale)}`}</option>)}
        <option value={NOT_DECIDED}>Destination not decided</option>
      </select>
      <select aria-label="Direction" data-testid="people-direction-select" value={value.direction ?? ""} onChange={(e) => set({ direction: (e.target.value || null) as Direction | null })} className={select}>
        <option value="">All directions</option>
        {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>
      <select aria-label="Interest" data-testid="people-interest-select" value={value.interest} onChange={(e) => set({ interest: e.target.value })} className={select}>
        <option value="">Any interest</option>
        {ALL_INTERESTS.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
    </div>
  );
}
