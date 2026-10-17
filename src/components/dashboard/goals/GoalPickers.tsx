"use client";

import { Briefcase, Check, Compass, GraduationCap } from "lucide-react";
import { DIRECTIONS, INTERESTS } from "@/lib/dashboard/options";
import type { Direction } from "@/lib/dashboard/types";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const focusWithin = "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90] has-[:focus-visible]:ring-offset-2";

const DIRECTION_STYLE: Record<Direction, { icon: typeof GraduationCap; tint: string }> = {
  study: { icon: GraduationCap, tint: "from-[#EAF1F6] to-white" },
  work: { icon: Briefcase, tint: "from-[#FBEFEF] to-white" },
  explore: { icon: Compass, tint: "from-[#EEF3EC] to-white" },
};

// Study / Work / Explore as three visual cards (radio group).
export function DirectionPicker({ value, onChange }: { value: Direction | null; onChange: (d: Direction) => void }) {
  const { t } = useI18n();
  return (
    <fieldset className="grid gap-3 sm:grid-cols-3">
      <legend className="sr-only">Primary direction</legend>
      {DIRECTIONS.map((d) => {
        const checked = value === d.value;
        const { icon: Icon, tint } = DIRECTION_STYLE[d.value];
        return (
          <label
            key={d.value}
            data-testid={`direction-option-${d.value}`}
            className={cn(
              "relative flex cursor-pointer flex-col gap-3 rounded-2xl border-2 bg-gradient-to-b p-5 transition-all",
              tint,
              focusWithin,
              checked ? "border-[#2F4157] shadow-[0_10px_24px_rgba(47,65,87,0.12)]" : "border-[#E3E7ED] hover:-translate-y-0.5 hover:border-[#577E90]"
            )}
          >
            <input type="radio" name="direction" value={d.value} checked={checked} onChange={() => onChange(d.value)} className="sr-only" />
            <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", checked ? "bg-[#2F4157] text-white" : "bg-white text-[#2F4157] shadow-[0_1px_3px_rgba(47,65,87,0.12)]")}>
              <Icon size={24} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[18px] font-bold text-[#1A2534]">{t(`directions.${d.value}`)}</span>
              <span className="mt-0.5 block text-[14px] leading-snug text-[#2F4157]/65">{t(`directions.${d.value}Hint`)}</span>
            </span>
            {checked && (
              <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#E56668] text-white">
                <Check size={14} strokeWidth={3} aria-hidden="true" />
              </span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

// Interests as selectable chips (checkbox group).
export function InterestPicker({
  direction,
  value,
  onChange,
}: {
  direction: Direction;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (interest: string) =>
    onChange(value.includes(interest) ? value.filter((i) => i !== interest) : [...value, interest]);

  return (
    <fieldset className="flex flex-wrap gap-2.5">
      <legend className="sr-only">Interests</legend>
      {INTERESTS[direction].map((interest) => {
        const checked = value.includes(interest);
        return (
          <label
            key={interest}
            data-testid={`interest-option-${interest.toLowerCase().replace(/[^a-z]+/g, "-")}`}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-[15px] font-medium transition-colors",
              focusWithin,
              checked ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157] hover:border-[#577E90]"
            )}
          >
            <input type="checkbox" checked={checked} onChange={() => toggle(interest)} className="sr-only" />
            {checked && <Check size={15} strokeWidth={3} aria-hidden="true" />}
            {interest}
          </label>
        );
      })}
    </fieldset>
  );
}
