"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DirectionPicker, InterestPicker } from "./GoalPickers";
import { CountrySelect } from "./CountrySelect";
import { DestinationPicker } from "./DestinationPicker";
import { CountryFlag } from "./CountryFlag";
import { ENGLISH_LEVELS, INTERESTS, ORIGIN_OPTIONS } from "@/lib/dashboard/options";
import { countryName } from "@/lib/dashboard/countries";
import type { Direction, MemberProfile } from "@/lib/dashboard/types";
import { btnPrimary, btnSecondary, cardGloss, inputClass, labelClass, focusRing } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { cn } from "@/lib/utils";

const STEPS = ["origin", "destination", "direction", "interests"];
// Original IELSco mascot poses (public/images/contents/mascot), one per step. Kept small so the form stays above the
// fold on phones.
const MASCOT = ["/images/contents/mascot/hi.svg", "/images/contents/mascot/poses/wink-jump.png", "/images/contents/mascot/poses/happy.png", "/images/contents/mascot/poses/proud.png"];

interface Props {
  profile: MemberProfile;
  isEdit: boolean;
  onSave: (next: MemberProfile) => Promise<unknown>;
  onLater: () => void;
}

export function OnboardingFlow({ profile, isEdit: isEditProp, onSave, onLater }: Props) {
  const [isEdit] = useState(isEditProp);
  const { t, locale } = useI18n();
  const [step, setStep] = useState(0);
  const [origin, setOrigin] = useState(profile.origin_country ?? "");
  const [destination, setDestination] = useState({ codes: profile.destination_countries, other: profile.destination_other });
  const [direction, setDirection] = useState<Direction | null>(profile.direction);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [level, setLevel] = useState(profile.english_level ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canContinue = [origin.trim() !== "", true, direction !== null, interests.length > 0][step];

  const chooseDirection = (d: Direction) => {
    setDirection(d);
    setInterests((prev) => prev.filter((i) => INTERESTS[d].includes(i)));
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...profile,
        origin_country: origin.trim(),
        destination_countries: destination.codes,
        destination_other: destination.other,
        direction,
        interests,
        english_level: level || null,
        onboarding_completed_at: profile.onboarding_completed_at ?? new Date().toISOString(),
      });
      setDone(true);
    } catch (e) {
      // The form keeps every answer; nothing is written anywhere else.
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div data-testid="onboarding-done" className={cn(cardGloss, "overflow-hidden rounded-[28px] text-center")}>
        <div className="bg-gradient-to-b from-[#EAF1F6] to-white px-6 pb-2 pt-10">
          <Image src="/images/contents/mascot/poses/cheer.png" alt="" width={140} height={140} className="mx-auto h-28 w-auto md:h-32" priority />
        </div>
        <div className="px-6 pb-10 md:px-12">
          <h1 className="mb-2 text-[28px] font-bold text-[#1A2534] md:text-[32px]">{isEdit ? t("onboarding.doneTitleEdit") : t("onboarding.doneTitle")}</h1>
          <p className="mx-auto mb-6 max-w-md text-[16px] text-[#2F4157]/70">{t("onboarding.doneBody")}</p>
          <div className="mb-8 flex flex-wrap justify-center gap-2" data-testid="onboarding-summary">
            {direction && <span className="rounded-full bg-[#2F4157] px-4 py-1.5 text-[14px] font-semibold text-white">{t(`directions.${direction}`)}</span>}
            {destination.codes.map((c) => (
              <span key={c} className="inline-flex items-center gap-2 rounded-full border border-[#E3E7ED] bg-white px-3 py-1.5 text-[14px] font-medium">
                <CountryFlag code={c} size={13} /> {countryName(c, locale)}
              </span>
            ))}
            {destination.other && <span className="rounded-full border border-dashed border-[#2F4157]/30 px-3 py-1.5 text-[14px]">{destination.other}</span>}
          </div>
          <Link href="/dashboard" data-testid="onboarding-go-home" className={btnPrimary}>
            {t("onboarding.goHome")} <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className={cn(cardGloss, "overflow-hidden rounded-[28px]")}>
      <div className="bg-gradient-to-br from-[#EAF1F6] via-white to-[#FBEFEF] px-6 pb-6 pt-6 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p data-testid="onboarding-step-indicator" className="text-[14px] font-semibold text-[#577E90]">
            {t("onboarding.stepOf", { n: step + 1, total: STEPS.length })}
          </p>
          <LanguageSelect testId="onboarding-language-select" />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(47,65,87,0.08)]" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-gradient-to-r from-[#2F4157] to-[#577E90] transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-5 flex items-center gap-4">
          <Image src={MASCOT[step]} alt="" width={84} height={84} className="h-16 w-auto shrink-0 md:h-20" priority />
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold leading-tight text-[#1A2534] md:text-[28px]">{t(`onboarding.${STEPS[step]}Title`)}</h1>
            <p className="mt-1 text-[15px] text-[#2F4157]/70 md:text-[16px]">{t(`onboarding.${STEPS[step]}Body`)}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-7 md:px-10 md:py-8">
        {step === 0 && (
          <div>
            <label htmlFor="origin" className={labelClass}>{t("onboarding.originLabel")}</label>
            <CountrySelect id="origin" testId="origin-select" options={ORIGIN_OPTIONS} value={origin} onChange={setOrigin} />
          </div>
        )}
        {step === 1 && (
          <div>
            <p id="destination-label" className="sr-only">{t("onboarding.destinationLabel")}</p>
            <DestinationPicker labelId="destination-label" codes={destination.codes} other={destination.other} onChange={setDestination} />
          </div>
        )}
        {step === 2 && <DirectionPicker value={direction} onChange={chooseDirection} />}
        {step === 3 && direction && (
          <div className="space-y-8">
            <InterestPicker direction={direction} value={interests} onChange={setInterests} />
            <div>
              <label htmlFor="english-level" className={labelClass}>
                {t("onboarding.englishLevel")} <span className="font-normal text-[#2F4157]/50">({t("common.optional")})</span>
              </label>
              <select id="english-level" data-testid="english-level-select" value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass}>
                <option value="">{t("onboarding.preferNot")}</option>
                {ENGLISH_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" data-testid="onboarding-error" className="mt-6 rounded-xl bg-[#E56668]/10 px-4 py-3 text-[15px] text-[#2F4157]">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E3E7ED]/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <button type="button" data-testid="onboarding-back" onClick={() => setStep(step - 1)} className={btnSecondary}>
              <ArrowLeft size={16} /> {t("onboarding.back")}
            </button>
          ) : (
            <button
              type="button"
              data-testid="onboarding-later"
              onClick={onLater}
              className={cn("rounded px-2 py-2 text-[15px] font-medium text-[#2F4157]/60 hover:text-[#2F4157] hover:underline", focusRing)}
            >
              {isEdit ? t("onboarding.cancel") : t("onboarding.later")}
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" data-testid="onboarding-next" disabled={!canContinue} onClick={() => setStep(step + 1)} className={btnPrimary}>
              {t("onboarding.continue")} <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" data-testid="onboarding-finish" disabled={!canContinue || saving} onClick={finish} className={btnPrimary}>
              {saving ? t("onboarding.saving") : isEdit ? t("onboarding.saveGoals") : t("onboarding.finish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
