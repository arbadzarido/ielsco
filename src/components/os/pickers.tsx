"use client";

// Pickers used by the Company OS forms. Options come from the directory the person can read (RLS), so nobody can pick
// a person, company or division they cannot see.
import { useDirectory } from "./data";
import { useOsMe } from "./OsProvider";
import { Select } from "./ui";
import { WORKSPACES } from "@/lib/os/meta";

export function PersonSelect({ id, value, onChange, placeholder = "Unassigned", ariaLabel, staffOnly = true }: {
  id?: string; value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string; staffOnly?: boolean;
}) {
  const dir = useDirectory();
  const people = (dir?.people ?? []).filter((p) => ["active", "onboarding"].includes(p.status) && (!staffOnly || p.org_role !== "guest"));
  return <Select id={id} ariaLabel={ariaLabel} value={value} onChange={onChange} placeholder={placeholder}
    options={people.map((p) => ({ value: p.id, label: p.short_name ? `${p.short_name} (${p.full_name})` : p.full_name }))} />;
}

export function DivisionSelect({ id, value, onChange, placeholder = "No division (company-wide)", ariaLabel }: {
  id?: string; value: string; onChange: (v: string) => void; placeholder?: string; ariaLabel?: string;
}) {
  const dir = useDirectory();
  return <Select id={id} ariaLabel={ariaLabel} value={value} onChange={onChange} placeholder={placeholder}
    options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} />;
}

/** Companies the person works in (founders with verified sign-in: all three). */
export function CompanySelect({ id, value, onChange, ariaLabel, includeHq = true }: {
  id?: string; value: string; onChange: (v: string) => void; ariaLabel?: string; includeHq?: boolean;
}) {
  const { me } = useOsMe();
  const options = WORKSPACES.filter((w) => (includeHq && w.code === "HQ") || me.isAdmin || me.companies.includes(w.code))
    .filter((w) => includeHq || w.code !== "HQ")
    .map((w) => ({ value: w.code, label: w.name }));
  return <Select id={id} ariaLabel={ariaLabel} value={value} onChange={onChange} options={options} />;
}

/** The default company for a new record: the first one the person works in. */
export function useDefaultCompany(): string {
  const { me } = useOsMe();
  return me.companies.find((c) => c !== "HQ") ?? me.companies[0] ?? "HQ";
}
