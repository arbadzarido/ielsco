"use client";

import { PUBLIC_FIELD_OPTIONS } from "@/lib/dashboard/options";
import type { MemberProfile, PublicField } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export function PrivacyFields({ profile, set }: { profile: MemberProfile; set: (patch: Partial<MemberProfile>) => void }) {
  const toggleField = (f: PublicField) =>
    set({ public_fields: profile.public_fields.includes(f) ? profile.public_fields.filter((x) => x !== f) : [...profile.public_fields, f] });

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-[#E3E7ED] bg-white p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90]">
        <input
          type="checkbox"
          role="switch"
          data-testid="profile-is-public-switch"
          checked={profile.is_public}
          onChange={(e) => set({ is_public: e.target.checked })}
          className="peer sr-only"
        />
        <span aria-hidden="true" className={cn("relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors", profile.is_public ? "bg-[#2F4157]" : "bg-[#E3E7ED]")}>
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", profile.is_public ? "translate-x-5" : "translate-x-0.5")} />
        </span>
        <span>
          <span className="block text-lg font-semibold">Show me in the People directory</span>
          <span className="block text-base text-[#2F4157]/65">Off by default. Your email and phone number are never shown.</span>
        </span>
      </label>

      <fieldset disabled={!profile.is_public} className="disabled:opacity-50">
        <legend className="mb-3 text-base font-semibold">Fields other members can see (name and avatar are always shown when visible)</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PUBLIC_FIELD_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg px-1 py-1.5 text-base">
              <input
                type="checkbox"
                data-testid={`public-field-${value}`}
                checked={profile.public_fields.includes(value)}
                onChange={() => toggleField(value)}
                className="h-4 w-4 accent-[#2F4157]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
