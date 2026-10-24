"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardCtx } from "../DashboardPage";
import { LoadingState, Notice, ProfilePendingNotice } from "../PageStates";
import { ONBOARDING_LATER_KEY } from "../useMemberProfile";
import { HomeHero } from "./HomeHero";
import { NextStepsCard } from "./NextStepsCard";
import { SavedShelf } from "./SavedShelf";
import { CircleActivityBanner, CoursePromo } from "./HomePromos";
import { SimilarPeople } from "./SimilarPeople";
import { GifFeatureCard } from "../gif/GifFeatureCard";
import { DashboardTour } from "./DashboardTour";
import { ElcoCallout } from "@/components/elco/ElcoCallout";
import { CollectionFeature } from "../collections/CollectionViews";
import { ResourceRow } from "../resources/ResourceRow";
import { btnLink } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { DEMO_RESOURCES } from "@/data/dashboard/resources";
import { featuredCollectionFor } from "@/data/dashboard/collections";
import { trackForGoals } from "@/data/dashboard/courses";
import { recommendResources } from "@/lib/dashboard/match";

export function HomeView({ user, profile, storage, supabase }: DashboardCtx) {
  const { t } = useI18n();
  const router = useRouter();
  const needsOnboarding = !profile.onboarding_completed_at;
  // Onboarding can't be saved while the profile table is missing, so don't send members into it.
  const canOnboard = storage === "supabase";
  const [deferred, setDeferred] = useState(false);

  useEffect(() => {
    if (!needsOnboarding || !canOnboard) return;
    if (window.sessionStorage.getItem(ONBOARDING_LATER_KEY) === "1") setDeferred(true);
    else router.replace("/dashboard/onboarding");
  }, [needsOnboarding, canOnboard, router]);

  if (needsOnboarding && canOnboard && !deferred) return <LoadingState />;

  const collection = featuredCollectionFor(profile.direction, profile.interests);
  const featuredIds = new Set(collection.resourceIds);
  const resources = recommendResources(DEMO_RESOURCES.filter((r) => !featuredIds.has(r.id) && (r.linkCheckedOn || r.origin === "ielsco-demo")), profile, 4);

  return (
    <div className="mx-auto max-w-[110rem] space-y-14 px-4 py-10 md:space-y-16 md:px-6 md:py-14 lg:px-12">
      {storage === "unavailable" && <ProfilePendingNotice />}
      <div data-tour="ielsco-home"><HomeHero profile={profile} needsOnboarding={needsOnboarding} /></div>
      <NextStepsCard supabase={supabase} userId={user.id} />
      <GifFeatureCard />

      {!needsOnboarding && !profile.origin_country && (
        <Notice testId="origin-prompt">
          {t("home.originPrompt")}{" "}
          <Link href="/dashboard/profile#about" data-testid="origin-prompt-link" className={btnLink}>{t("home.originPromptLink")}</Link>
        </Notice>
      )}

      <section aria-labelledby="picked-heading" className="space-y-6">
        <h2 id="picked-heading" className="text-2xl font-bold md:text-3xl">{needsOnboarding ? t("home.startTitle") : t("home.pickedTitle")}</h2>
        <CollectionFeature collection={collection} />
        <div>
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-lg font-bold">{t("home.moreResources")}</h3>
            <Link href="/dashboard/explore?for=me" data-testid="home-see-all-resources" className={btnLink}>{t("home.seeAll")}</Link>
          </div>
          <ul data-testid="home-recommended" className="divide-y divide-[#E3E7ED]/60">
            {resources.map((r) => <ResourceRow key={r.id} resource={r} userId={user.id} />)}
          </ul>
        </div>
      </section>

      <SavedShelf userId={user.id} />
      <SimilarPeople supabase={supabase} profile={profile} />
      <CircleActivityBanner />
      {!needsOnboarding && <CoursePromo track={trackForGoals(profile.direction, profile.interests)} reason="Matches your goals" />}
      <div data-tour="ielsco-elco"><ElcoCallout refId="dashboard-home" title="Practise English with Elco" body="Daily practice with feedback that remembers your recurring mistakes. A separate app, free to start." /></div>
      {(!needsOnboarding || !canOnboard) && <Suspense fallback={null}><DashboardTour supabase={supabase} userId={user.id} /></Suspense>}
    </div>
  );
}
