"use client";

import { ENGLISH_LEVELS, ORIGIN_OPTIONS, ROLE_OPTIONS } from "@/lib/dashboard/options";
import type { MemberProfile } from "@/lib/dashboard/types";
import { CountrySelect } from "../goals/CountrySelect";
import { inputClass, labelClass } from "../ui";
import { AvatarField } from "./AvatarField";

type Set = (patch: Partial<MemberProfile>) => void;

function Field({ id, label, optional, children }: { id: string; label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} {optional && <span className="font-normal text-[#2F4157]/50">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

export function BasicFields({ profile, set }: { profile: MemberProfile; set: Set }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="border-b border-[#E3E7ED] pb-5 md:col-span-2">
        <AvatarField profile={profile} onChange={(url) => set({ avatar_url: url })} />
      </div>
      <Field id="display-name" label="Display name">
        <input id="display-name" data-testid="profile-display-name" aria-required="true" aria-invalid={!profile.display_name.trim()} maxLength={80} value={profile.display_name} onChange={(e) => set({ display_name: e.target.value })} className={inputClass} />
      </Field>
      <Field id="origin" label="Where are you from?" optional>
        <CountrySelect id="origin" testId="profile-origin" options={ORIGIN_OPTIONS} value={profile.origin_country ?? ""} onChange={(v) => set({ origin_country: v || null })} />
      </Field>
      <Field id="country" label="Where you live now" optional>
        <input id="country" data-testid="profile-country" maxLength={60} value={profile.country ?? ""} onChange={(e) => set({ country: e.target.value || null })} placeholder="e.g. Jakarta, Indonesia" className={inputClass} />
      </Field>
      <Field id="role" label="Current role" optional>
        <select id="role" data-testid="profile-role" value={profile.role_status ?? ""} onChange={(e) => set({ role_status: e.target.value || null })} className={inputClass}>
          <option value="">Prefer not to say</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          {profile.role_status && !ROLE_OPTIONS.includes(profile.role_status) && <option value={profile.role_status}>{profile.role_status}</option>}
        </select>
      </Field>
      <Field id="english-level" label="English level" optional>
        <select id="english-level" data-testid="profile-english-level" value={profile.english_level ?? ""} onChange={(e) => set({ english_level: e.target.value || null })} className={inputClass}>
          <option value="">Prefer not to say</option>
          {ENGLISH_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          {profile.english_level && !ENGLISH_LEVELS.includes(profile.english_level) && <option value={profile.english_level}>{profile.english_level}</option>}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field id="bio" label="Short bio" optional>
          <textarea id="bio" data-testid="profile-bio" rows={3} maxLength={300} value={profile.bio ?? ""} onChange={(e) => set({ bio: e.target.value || null })} placeholder="A sentence or two about you and what you're working towards." className={inputClass} />
          <p className="mt-1 text-right text-sm text-[#2F4157]/50">{(profile.bio ?? "").length}/300</p>
        </Field>
      </div>
    </div>
  );
}

export function LinkFields({ profile, set }: { profile: MemberProfile; set: Set }) {
  const links = [
    { key: "linkedin_url" as const, label: "LinkedIn", placeholder: "https://linkedin.com/in/your-name" },
    { key: "instagram_url" as const, label: "Instagram", placeholder: "https://instagram.com/your-handle" },
    { key: "portfolio_url" as const, label: "Portfolio / website", placeholder: "https://…" },
  ];
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {links.map(({ key, label, placeholder }) => (
        <Field key={key} id={key} label={label} optional>
          <input id={key} type="url" data-testid={`profile-${key}`} value={profile[key] ?? ""} onChange={(e) => set({ [key]: e.target.value || null })} placeholder={placeholder} className={inputClass} />
        </Field>
      ))}
    </div>
  );
}
