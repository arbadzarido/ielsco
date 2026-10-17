"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MemberProfile } from "@/lib/dashboard/types";
import { btnPrimary, btnSecondary, btnLink } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { destinationLabels } from "@/lib/dashboard/countries";

function GoalChips({ profile }: { profile: MemberProfile }) {
  const { t, locale } = useI18n();
  const chips = [
    profile.direction && t(`directions.${profile.direction}`),
    ...destinationLabels(profile.destination_countries, profile.destination_other, locale).map((country) => t("home.destination", { country })),
    ...profile.interests.filter((i) => i !== "Not sure yet"),
  ].filter(Boolean) as string[];
  return (
    <div data-testid="hero-goal-chips" className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <span key={c} className="rounded-full border border-[#2F4157]/15 bg-white px-3 py-1 text-sm font-medium">{c}</span>
      ))}
      <Link href="/dashboard/my-goals" data-testid="home-edit-goals" className={cn(btnLink, "text-sm")}>{t("home.editGoals")}</Link>
    </div>
  );
}

export function HomeHero({ profile, needsOnboarding }: { profile: MemberProfile; needsOnboarding: boolean }) {
  const firstName = (profile.display_name || "").split(" ")[0];
  const { t } = useI18n();
  return (
    <section data-testid="home-hero" className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-12">
      <div className="space-y-6">
        <p className="text-base font-semibold text-[#577E90]">{firstName ? t("home.hi", { name: firstName }) : t("home.hiNoName")}</p>
        <h1 data-testid="home-greeting" className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{t("home.title")}</h1>
        <p className="max-w-lg text-lg text-[#2F4157]/75 md:text-xl">
          {needsOnboarding ? t("home.subtitleNew") : t("home.subtitle")}
        </p>
        {needsOnboarding ? (
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/onboarding" data-testid="finish-setup-button" className={btnPrimary}>{t("home.setGoals")} <ArrowRight size={16} /></Link>
            <Link href="/dashboard/explore" className={btnSecondary}>{t("home.browse")}</Link>
          </div>
        ) : (
          <>
            <GoalChips profile={profile} />
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/explore?for=me" data-testid="hero-explore-cta" className={btnPrimary}>{t("home.exploreCta")} <ArrowRight size={16} /></Link>
              <Link href="/dashboard/people" data-testid="hero-people-cta" className={btnSecondary}>{t("home.peopleCta")}</Link>
            </div>
          </>
        )}
      </div>
      <div className="relative h-56 overflow-hidden rounded-[28px] sm:h-72 md:h-[380px]">
        <Image src="/images/dashboard/hero-learners.jpg" alt="Two young learners smiling while working on a laptop together" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
      </div>
    </section>
  );
}
