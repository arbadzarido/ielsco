"use client";
import { useMemo } from "react";
import { COUNTRY_CODES } from "@/lib/validation";

export function useCountries() {
  return useMemo(() => {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    const list = COUNTRY_CODES.map((c) => ({ code: c, name: dn.of(c) ?? c })).sort((a, b) => a.name.localeCompare(b.name));
    const top = ["ID", "MY", "SG", "TH", "PH", "VN", "BD"].map((c) => list.find((x) => x.code === c)!);
    return { top, list };
  }, []);
}

export function CountrySelect({ id, name, value, defaultValue = "", onChange, invalid }: { id: string; name: string; value?: string; defaultValue?: string; onChange?: (v: string) => void; invalid?: boolean }) {
  const { top, list } = useCountries();
  const props = value !== undefined ? { value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value) } : { defaultValue };
  return (
    <select id={id} name={name} required aria-invalid={invalid} {...props}>
      <option value="" disabled>Choose a country…</option>
      <optgroup label="Southeast Asia and nearby">{top.map((c) => <option key={`t-${c.code}`} value={c.code}>{c.name}</option>)}</optgroup>
      <optgroup label="All countries">{list.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</optgroup>
    </select>
  );
}
