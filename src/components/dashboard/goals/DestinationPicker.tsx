"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, Search, X } from "lucide-react";
import { countryName, MAX_DESTINATIONS, POPULAR_DESTINATIONS, searchCountries } from "@/lib/dashboard/countries";
import { CountryFlag } from "./CountryFlag";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { focusRing, inputClass, labelClass } from "../ui";

interface Props {
  codes: string[];
  other: string | null;
  onChange: (next: { codes: string[]; other: string | null }) => void;
  labelId?: string;
}

// Worldwide destination picker: searchable multi-select (ARIA combobox + listbox), up to MAX_DESTINATIONS,
// plus "not listed" free text. Flags are decorative; every option and chip carries the country name.
export function DestinationPicker({ codes, other, onChange, labelId }: Props) {
  const { t, locale } = useI18n();
  const uid = useId();
  const listId = `${uid}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [showOther, setShowOther] = useState(!!other);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const list = query.trim() ? searchCountries(query, locale) : [...POPULAR_DESTINATIONS, ...searchCountries("", locale).filter((c) => !POPULAR_DESTINATIONS.includes(c))];
    return list.slice(0, 60);
  }, [query, locale]);

  const full = codes.length >= MAX_DESTINATIONS;

  const toggle = (code: string, refocus = true) => {
    if (codes.includes(code)) onChange({ codes: codes.filter((c) => c !== code), other });
    else if (!full) onChange({ codes: [...codes, code], other });
    setQuery("");
    setActive(0);
    if (refocus) inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      toggle(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && codes.length) {
      onChange({ codes: codes.slice(0, -1), other });
    }
  };

  return (
    <div className="space-y-4" data-testid="destination-picker">
      {(codes.length > 0 || other) && (
        <ul aria-label={t("myGoals.selected")} className="flex flex-wrap gap-2" data-testid="destination-chips">
          {codes.map((code) => (
            <li key={code} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#2F4157]/15 bg-white py-1 pl-2.5 pr-1 text-[15px] font-semibold text-[#1A2534] shadow-[0_1px_2px_rgba(47,65,87,0.06)]">
              <CountryFlag code={code} size={16} />
              {countryName(code, locale)}
              <button
                type="button"
                data-testid={`destination-remove-${code}`}
                aria-label={t("myGoals.remove", { name: countryName(code, locale) })}
                onClick={() => toggle(code)}
                className={cn("rounded-full p-1 text-[#2F4157]/60 hover:bg-[#F1F4F8] hover:text-[#2F4157]", focusRing)}
              >
                <X size={14} />
              </button>
            </li>
          ))}
          {other && (
            <li className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#2F4157]/25 bg-white px-3 py-1 text-base font-medium">
              {other}
            </li>
          )}
        </ul>
      )}

      <div>
        <p className="mb-2 text-[14px] font-semibold text-[#2F4157]/70">{t("myGoals.popular")}</p>
        <div className="flex flex-wrap gap-2" data-testid="destination-popular">
          {POPULAR_DESTINATIONS.slice(0, 8).map((code) => {
            const on = codes.includes(code);
            return (
              <button
                key={code}
                type="button"
                aria-pressed={on}
                disabled={!on && full}
                onClick={() => toggle(code, false)}
                data-testid={`destination-popular-${code}`}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border-2 px-3 text-[14px] font-medium transition-colors disabled:opacity-40",
                  focusRing,
                  on ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157] hover:border-[#577E90]"
                )}
              >
                <CountryFlag code={code} size={14} />
                {countryName(code, locale)}
                {on && <Check size={14} strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/40" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          data-testid="destination-search"
          aria-labelledby={labelId}
          aria-label={labelId ? undefined : t("myGoals.searchLabel")}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${uid}-opt-${results[active]}` : undefined}
          aria-describedby={`${uid}-hint`}
          value={query}
          placeholder={full ? t("myGoals.full", { n: MAX_DESTINATIONS }) : t("myGoals.searchPlaceholder")}
          disabled={full}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={cn(inputClass, "pl-11")}
        />
        <p id={`${uid}-hint`} className="mt-2 text-sm text-[#2F4157]/60">{t("myGoals.hint", { n: MAX_DESTINATIONS })}</p>
        {open && !full && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            data-testid="destination-options"
            className="absolute inset-x-0 top-[3.6rem] z-30 max-h-72 overflow-y-auto rounded-2xl border border-[#E3E7ED] bg-white p-1.5 shadow-[0_16px_40px_rgba(47,65,87,0.14)]"
          >
            {results.length === 0 && <li className="px-3 py-2.5 text-base text-[#2F4157]/60">{t("myGoals.noMatch")}</li>}
            {results.map((code, i) => {
              const selected = codes.includes(code);
              return (
                <li
                  key={code}
                  id={`${uid}-opt-${code}`}
                  role="option"
                  aria-selected={selected}
                  data-testid={`destination-option-${code}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggle(code)}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-base", i === active && "bg-[#F1F4F8]")}
                >
                  <CountryFlag code={code} size={16} />
                  <span className="flex-1">{countryName(code, locale)}</span>
                  {selected && <Check size={16} className="text-[#577E90]" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <button
          type="button"
          data-testid="destination-other-toggle"
          aria-expanded={showOther}
          onClick={() => {
            if (showOther) onChange({ codes, other: null });
            setShowOther(!showOther);
          }}
          className={cn("rounded text-base font-semibold text-[#577E90] underline-offset-4 hover:underline", focusRing)}
        >
          {showOther ? t("myGoals.otherRemove") : t("myGoals.otherAdd")}
        </button>
        {(codes.length > 0 || other) && (
          <button
            type="button"
            data-testid="destination-clear"
            onClick={() => {
              onChange({ codes: [], other: null });
              setShowOther(false);
            }}
            className={cn("rounded text-base font-semibold text-[#2F4157]/60 underline-offset-4 hover:underline", focusRing)}
          >
            {t("myGoals.notDecided")}
          </button>
        )}
      </div>
      {showOther && (
        <div>
          <label htmlFor={`${uid}-other`} className={labelClass}>{t("myGoals.otherLabel")}</label>
          <input
            id={`${uid}-other`}
            data-testid="destination-other-input"
            value={other ?? ""}
            maxLength={60}
            onChange={(e) => onChange({ codes, other: e.target.value || null })}
            placeholder={t("myGoals.otherPlaceholder")}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
