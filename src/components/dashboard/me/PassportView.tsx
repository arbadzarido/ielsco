"use client";

import Link from "next/link";
import { Award, Compass, IdCard, Sparkles, Stamp as StampIcon } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { ErrorState, LoadingState } from "../PageStates";
import { useMyRecords } from "../useMyRecords";
import { ElcoProgressCard } from "./ElcoProgressCard";
import { PeopleTabs } from "@/components/connect/PeopleTabs";
import { PassportCover } from "./passport/PassportCover";
import { PassportBook } from "./passport/PassportBook";
import { BadgesPage, IdentityPage, JourneyPage, StampsPage } from "./passport/PassportPages";
import { btnSecondary, cardGloss } from "../ui";
import { badgeStates, buildStamps } from "@/lib/me/badges";
import { buildJourney } from "@/lib/me/records";
import { destinationLabels } from "@/lib/dashboard/countries";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

// Elco-Pass (docs/IELSCO-PRODUCT-ARCHITECTURE.md §6): one identity across IELSco and Elco AI, built from the same
// auth user id, laid out as a small passport: cover, then pages (identity, stamps, badges, Elco, journey). Every stamp
// and badge is computed from the member's own records (lib/me/badges.ts); nothing here is shown to other members.
export function PassportView({ user, profile }: DashboardCtx) {
  const { t, locale } = useI18n();
  const { state, reload } = useMyRecords(user.id);
  if (state.s === "loading") return <LoadingState label="Loading your Elco-Pass…" />;
  if (state.s === "error") return <ErrorState message={state.message} onRetry={reload} />;
  if (state.s === "signed-out") return null;
  const r = state.data;
  const journey = buildJourney(r, { joinedAt: user.created_at, goalsSetAt: profile.onboarding_completed_at });
  const badges = badgeStates(r);
  const stamps = buildStamps(r);
  const circleCheckins = r.activities.filter((a) => a.kind === "circle_session" && a.past).length;
  const goals = [
    profile.direction && t(`directions.${profile.direction}`),
    ...destinationLabels(profile.destination_countries, profile.destination_other, locale),
    ...profile.interests.filter((i) => i !== "Not sure yet"),
  ].filter(Boolean) as string[];
  const since = user.created_at ? new Date(user.created_at) : null;
  const memberSince = since && !Number.isNaN(since.getTime()) ? since.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : undefined;
  const record: [string, number, string][] = [
    ["IELS Circle check-ins", circleCheckins, "/dashboard/circle"],
    ["Circle groups joined", r.circlesJoined.length, "/dashboard/circles"],
    ["Events taken part in", r.activities.filter((a) => a.past && a.kind !== "circle_session" && a.kind !== "circle_cohort").length, "/dashboard/events"],
    ["Opportunities tracked", r.tracked.length, "/dashboard/opportunities"],
    ["Saved items", r.bookmarks, "/dashboard/shelf"],
    ["Connections", r.connections, "/dashboard/connect/connections"],
    ["Community events hosted", r.roomsHosted, "/dashboard/connect/rooms"],
  ];

  return (
    <div className="mx-auto max-w-[80rem] space-y-8 px-4 py-8 md:px-6 md:py-10 lg:px-10">
      <PeopleTabs />
      <PassportCover name={profile.display_name || "Member"} />
      <PassportBook pages={[
        { id: "identity", label: "Identity", icon: IdCard, content: <IdentityPage profile={profile} memberSince={memberSince} goals={goals} record={record} /> },
        { id: "stamps", label: "Stamps", icon: StampIcon, content: <StampsPage stamps={stamps} /> },
        { id: "badges", label: "Badges", icon: Award, content: <BadgesPage badges={badges} /> },
        { id: "elco", label: "Elco AI", icon: Sparkles, content: (
          <div className="space-y-4">
            <ElcoProgressCard elco={r.elco} className="border-[#2F4157]/10 shadow-none" />
          </div>
        ) },
        { id: "journey", label: "Journey", icon: Compass, content: <JourneyPage journey={journey} /> },
      ]} />

      <div className="grid gap-4 md:grid-cols-3">
        <section aria-labelledby="passport-certs-heading" className={cn(cardGloss, "p-5")}>
          <h2 id="passport-certs-heading" className="text-[18px] font-bold">Certificates</h2>
          <p className="mt-1 text-[15px] text-[#2F4157]/65">IELS Circle e-certificates are given at the cohort&apos;s graduation. None are recorded in your account yet; they will be listed here when IELSco issues them online.</p>
        </section>
        <section aria-labelledby="passport-story-heading" className={cn(cardGloss, "p-5")}>
          <h2 id="passport-story-heading" className="text-[18px] font-bold">Beyond the Circle</h2>
          <p className="mt-1 text-[15px] text-[#2F4157]/65">Got into a program, gave your first talk in English, landed a role? Share your story. We publish it only with your consent, and you can ask us to take it down.</p>
          <Link href="/circle/stories/submit" className={cn(btnSecondary, "mt-3")}>Share my story</Link>
        </section>
        <section aria-labelledby="passport-privacy-heading" className="rounded-2xl border border-[#E3E7ED] bg-white/70 p-5 text-[14px] text-[#2F4157]/70">
          <h2 id="passport-privacy-heading" className="text-[18px] font-bold text-[#2F4157]">What syncs, and who sees it</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your IELSco records come from your own account; nobody else can read this page.</li>
            <li>Elco AI shares a short practice summary only after you link accounts, and only with the permissions you approved. <Link href="/dashboard/connect/elco" className="font-semibold underline">Manage or unlink</Link>.</li>
            <li>Your public profile and Social profile have their own visibility settings.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
