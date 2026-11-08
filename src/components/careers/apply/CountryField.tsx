"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";
import { codeForName, countryName, searchCountries } from "@/lib/dashboard/countries";

const input = "mt-2 block w-full rounded-[14px] border border-[#D5DBE3] bg-white px-4 py-3 text-[16px] font-normal text-[#1A2534] placeholder:text-[#2F4157]/40 hover:border-[#B8C2CF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-1 aria-[invalid=true]:border-[#C04C4E]";

// Searchable country picker (ARIA combobox). Stores an ISO 3166-1 alpha-2 code; type a few letters, pick with the mouse
// or arrow keys + Enter. Typing an exact country name and leaving the field also picks it.
export function CountryField({ value, onChange, error }: { value: string; onChange: (code: string) => void; error?: string }) {
  const id = useId();
  const [q, setQ] = useState(value ? countryName(value) : "");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  useEffect(() => { if (value) setQ(countryName(value)); }, [value]);
  const results = open ? searchCountries(q).slice(0, 8) : [];
  const pick = (code: string) => { onChange(code); setQ(countryName(code)); setOpen(false); };

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="block text-[15px] font-semibold text-[#1A2534]">Country you live in</label>
      <input id={`${id}-input`} role="combobox" aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" autoComplete="country-name"
        aria-activedescendant={open && results[hi] ? `${id}-${results[hi]}` : undefined} aria-invalid={!!error} aria-describedby={`${id}-err`}
        value={q} placeholder="Start typing, e.g. Indonesia" className={input} data-testid="f-country"
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); if (value) onChange(""); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => { setOpen(false); if (!value) { const c = codeForName(q); if (c) pick(c); } }, 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && open && results[hi]) { e.preventDefault(); pick(results[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }} />
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-[14px] border border-[#D5DBE3] bg-white py-1 shadow-[0_12px_32px_rgba(26,37,52,0.12)]">
          {results.map((c, k) => (
            <li key={c} id={`${id}-${c}`} role="option" aria-selected={k === hi} onMouseDown={(e) => { e.preventDefault(); pick(c); }} onMouseEnter={() => setHi(k)}
              className={cn("cursor-pointer px-4 py-2 text-[15px] text-[#1A2534]", k === hi && "bg-[#EEF2F7]")} data-testid={`country-option-${c}`}>{countryName(c)}</li>
          ))}
        </ul>
      )}
      {error && <span id={`${id}-err`} className="mt-1.5 block text-[13px] font-semibold text-[#C04C4E]" role="alert">{error}</span>}
    </div>
  );
}
