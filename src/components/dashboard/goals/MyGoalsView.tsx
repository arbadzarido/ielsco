"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { PageHeader, ProfilePendingNotice } from "../PageStates";
import { DirectionPicker, InterestPicker } from "./GoalPickers";
import { DestinationPicker } from "./DestinationPicker";
import { ENGLISH_LEVELS, INTERESTS } from "@/lib/dashboard/options";
import { MAX_DESTINATIONS, countryName } from "@/lib/dashboard/countries";
import { CountryFlag } from "./CountryFlag";
import type { Direction, MemberProfile } from "@/lib/dashboard/types";
import { btnPrimary, cardGloss, inputClass } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className={cn(cardGloss, "p-6 md:p-8")}>
      <h2 id={`${id}-title`} className="text-xl font-bold">{title}</h2>
      {description ? <p className="mb-6 mt-1 text-base text-[#2F4157]/65">{description}</p> : <div className="mb-6" />}
      {children}
    </section>
  );
}

// "Your plan": a live summary of the goals being edited (only what the member entered; no invented suggestions).
function PlanSummary({ profile, dirty }: { profile: MemberProfile; dirty: boolean }) {
  const { t, locale } = useI18n();
  const empty = !profile.direction && !profile.destination_countries.length && !profile.destination_other;
  return (
    <section aria-labelledby="plan-heading" data-testid="my-goals-summary" className="relative mb-8 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#2F4157] via-[#34495f] to-[#577E90] p-6 text-white shadow-[0_18px_40px_rgba(47,65,87,0.2)] md:p-8">
      <Image src="/images/contents/mascot/poses/proud.png" alt="" width={120} height={120} className="pointer-events-none absolute -bottom-3 right-3 hidden h-28 w-auto opacity-95 sm:block" aria-hidden="true" />
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/70">{dirty ? t("myGoals.planDraft") : t("myGoals.planTitle")}</p>
      <h2 id="plan-heading" className="mt-1 text-[24px] font-bold leading-tight sm:pr-32 md:text-[28px]">
        {empty ? t("myGoals.planEmpty") : profile.direction ? t(`directions.${profile.direction}`) : t("myGoals.planNoDirection")}
      </h2>
      {(profile.destination_countries.length > 0 || profile.destination_other) && (
        <ul className="mt-4 flex flex-wrap gap-2 sm:pr-32" aria-label={t("myGoals.selected")}>
          {profile.destination_countries.map((c) => (
            <li key={c} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[14px] font-semibold ring-1 ring-white/25">
              <CountryFlag code={c} size={13} /> {countryName(c, locale)}
            </li>
          ))}
          {profile.destination_other && <li className="rounded-full px-3 py-1.5 text-[14px] border border-dashed border-white/40">{profile.destination_other}</li>}
        </ul>
      )}
      {profile.interests.length > 0 && <p className="mt-4 text-[15px] text-white/80 sm:pr-32">{t("myGoals.planFocus")}: {profile.interests.join(" · ")}</p>}
    </section>
  );
}

const goalFields = (p: MemberProfile) =>
  JSON.stringify([p.direction, p.destination_countries, p.destination_other ?? null, p.interests, p.english_level ?? null]);

// My Goals: direction, worldwide destinations, interests and level, saved to public.member_profiles.
// On a failed save the form keeps every answer and says why; nothing is written to the browser instead.
export function MyGoalsView({ profile: initial, storage, save }: DashboardCtx) {
  const { t } = useI18n();
  const [profile, setProfile] = useState(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(() => goalFields(initial));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = goalFields(profile) !== savedSnapshot;

  const set = (patch: Partial<MemberProfile>) => {
    setProfile((p) => ({ ...p, ...patch }));
    setMessage(null);
  };

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const chooseDirection = (d: Direction) => set({ direction: d, interests: profile.interests.filter((i) => INTERESTS[d].includes(i)) });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.direction) return setMessage({ ok: false, text: t("myGoals.pickDirection") });
    setSaving(true);
    setMessage(null);
    const next = { ...profile, onboarding_completed_at: profile.onboarding_completed_at ?? new Date().toISOString() };
    try {
      await save(next);
      setProfile(next);
      setSavedSnapshot(goalFields(next));
      setMessage({ ok: true, text: t("myGoals.saved") });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-12">
      <PageHeader title={t("myGoals.title")} description={t("myGoals.body")} />
      <PlanSummary profile={profile} dirty={dirty} />
      {storage === "unavailable" && <div className="mb-6"><ProfilePendingNotice /></div>}
      <form onSubmit={submit} noValidate className="space-y-6" data-testid="my-goals-form">
        <Section id="direction" title={t("myGoals.directionTitle")}>
          <DirectionPicker value={profile.direction} onChange={chooseDirection} />
        </Section>

        <Section id="destinations" title={t("myGoals.destinationsTitle")} description={t("myGoals.destinationsBody", { n: MAX_DESTINATIONS })}>
          <DestinationPicker
            labelId="destinations-title"
            codes={profile.destination_countries}
            other={profile.destination_other}
            onChange={({ codes, other }) => set({ destination_countries: codes, destination_other: other })}
          />
        </Section>

        {profile.direction && (
          <Section id="interests" title={t("myGoals.interestsTitle")}>
            <InterestPicker direction={profile.direction} value={profile.interests} onChange={(interests) => set({ interests })} />
          </Section>
        )}

        <Section id="level" title={t("myGoals.levelTitle")}>
          <label htmlFor="my-goals-level" className="sr-only">{t("myGoals.levelTitle")}</label>
          <select
            id="my-goals-level"
            data-testid="my-goals-level"
            value={profile.english_level ?? ""}
            onChange={(e) => set({ english_level: e.target.value || null })}
            className={inputClass}
          >
            <option value="">{t("onboarding.preferNot")}</option>
            {ENGLISH_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Section>

        <div className="sticky bottom-20 z-20 flex flex-col gap-3 rounded-2xl border border-[#E3E7ED] bg-white/95 p-4 shadow-[0_10px_30px_rgba(47,65,87,0.1)] sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
          <p
            role={message && !message.ok ? "alert" : "status"}
            data-testid="my-goals-message"
            className={cn("flex items-center gap-2 text-base", message ? (message.ok ? "text-[#577E90]" : "text-[#C04C4E]") : "text-[#2F4157]/60")}
          >
            {message?.ok && <CheckCircle2 size={16} aria-hidden="true" />}
            {message?.text ?? (dirty ? t("myGoals.unsaved") : "")}
          </p>
          <button type="submit" data-testid="my-goals-save" disabled={saving || !dirty} className={btnPrimary}>
            {saving ? t("myGoals.saving") : t("myGoals.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
