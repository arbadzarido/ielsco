"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, CalendarDays, IdCard, Trophy } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, LoadingState, Notice, ProfilePendingNotice } from "../PageStates";
import { ONBOARDING_LATER_KEY } from "../useMemberProfile";
import { useMyRecords } from "../useMyRecords";
import { ActivityList } from "../me/ActivityList";
import { ElcoProgressCard } from "../me/ElcoProgressCard";
import { GifFeatureCard } from "../gif/GifFeatureCard";
import { DashboardTour } from "./DashboardTour";
import { HomeHero } from "./HomeHero";
import { ACCENTS, btnLink, btnPrimary, btnSecondary, cardGloss, focusRing, tag } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { badgeStates } from "@/lib/me/badges";
import { upcoming, type MyRecords } from "@/lib/me/records";
import { CATEGORY_LABEL, deadlineState, recommendOpportunities, type Opportunity } from "@/lib/opportunities";
import { loadOpportunities } from "@/lib/pulse";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";
import type { MemberProfile } from "@/lib/dashboard/types";
import { dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";

// Home is the member's command center (docs/IELSCO-PRODUCT-ARCHITECTURE.md §3): one clear next action, Elco
// progress, what they registered for, opportunities for their goals, their journey, and community stories when
// there are real ones. Everything shown comes from their own records or published content; empty sections say what
// to do instead of being padded.

type NextAction = { title: string; body: string; href: string; cta: string };

function nextAction(profile: MemberProfile, needsOnboarding: boolean, r: MyRecords | null): NextAction {
  if (needsOnboarding) return { title: "Set your goals", body: "Tell us where you're headed and what you're interested in. Takes about a minute.", href: "/dashboard/onboarding", cta: "Set my goals" };
  if (r) {
    const soon = upcoming(r).find((a) => a.start.getTime() - Date.now() < 36 * 3600_000);
    if (soon) return { title: `Coming up: ${soon.title}`, body: "Check the details and add it to your calendar so you don't miss it.", href: soon.href, cta: "Get ready" };
    if (r.incomingIntros > 0) return { title: "Someone wants to connect", body: `${r.incomingIntros} intro request${r.incomingIntros === 1 ? " is" : "s are"} waiting for your answer.`, href: "/dashboard/connect/requests", cta: "Answer intros" };
    const due = r.tracked.find((t) => ["saved", "preparing"].includes(t.status) && deadlineState(t.personal_deadline ?? t.opportunity?.deadline ?? null) === "soon");
    if (due?.opportunity) return { title: `Deadline soon: ${due.opportunity.title}`, body: "Your tracker shows a deadline within three weeks. Check the official page and plan your application.", href: "/dashboard/opportunities", cta: "Open my tracker" };
    if (r.tracked.length === 0) return { title: "Find your first opportunity", body: profile.direction === "work" ? "Internships, jobs and fellowships, each checked against its official page." : "Scholarships, exchanges and programs, each checked against its official page.", href: "/dashboard/discover/opportunities", cta: "Browse opportunities" };
    if (upcoming(r).length === 0) return { title: "Practise speaking this week", body: "IELS Circle meets every Wednesday and Saturday. Check in to a session and come and talk.", href: "/dashboard/circle", cta: "See Circle sessions" };
  }
  return { title: "See what's new for you", body: "New opportunities, stories and materials matched to your goals.", href: "/dashboard/discover", cta: "Open Discover" };
}

function NextActionCard({ action }: { action: NextAction }) {
  return (
    <section aria-label="Your next step" data-testid="home-next-action" className={cn(cardGloss, "p-5")}>
      <Link href={action.href} data-testid="home-next-action-cta" className={cn("group flex items-start gap-3 rounded-xl p-2 hover:bg-[#F7F8FA]", focusRing)}>
        <ArrowRight size={20} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[#1A2534]">{action.title}</span>
          <span className="text-sm text-[#2F4157]/70">{action.body}</span>
        </span>
        <span className="ml-auto mt-1 shrink-0 text-sm font-semibold text-[#577E90] group-hover:text-[#2F4157]">{action.cta}</span>
      </Link>
    </section>
  );
}

function Spotlight({ profile, supabase }: { profile: MemberProfile; supabase: DashboardCtx["supabase"] }) {
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  useEffect(() => { loadOpportunities(supabase).then(setOpps); }, [supabase]);
  const picks = useMemo(() => (opps ? recommendOpportunities(opps, profile, 3) : []), [opps, profile]);
  return (
    <section aria-labelledby="spotlight-heading" className="space-y-3" data-testid="home-opportunity-spotlight">
      <div className="flex items-end justify-between gap-3">
        <h2 id="spotlight-heading" className="text-[22px] font-bold">Opportunity spotlight</h2>
        <Link href="/dashboard/discover/opportunities" className={btnLink}>All opportunities</Link>
      </div>
      {opps === null ? <div className="h-32 animate-pulse rounded-2xl bg-white/70" aria-hidden="true" /> : picks.length === 0 ? (
        <EmptyState title="No open opportunities right now" body="New scholarships, internships and programs are added after IELS checks them against the official page."
          action={<Link href="/dashboard/discover/opportunities?type=professional" className={btnSecondary}>See jobs abroad</Link>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {picks.map(({ opportunity: o, reason }) => (
            <li key={o.id}>
              <Link href={`/opportunities/${o.slug}`} className={cn(cardGloss, "flex h-full flex-col gap-2 p-5 transition-colors hover:border-[#577E90]", focusRing)}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn(tag, ACCENTS.navy.soft)}>{CATEGORY_LABEL[o.category]}</span>
                  {reason && <span className="text-[13px] font-semibold text-[#0B6E64]">{reason}</span>}
                </span>
                <span className="text-[17px] font-semibold leading-snug text-[#1A2534]">{o.title}</span>
                <span className="text-[14px] text-[#2F4157]/65">{o.organizer}</span>
                <span className="mt-auto text-[14px] font-medium text-[#2F4157]/75">{o.deadline ? `Deadline ${dateWib(o.deadline)}` : o.deadline_note || "Check the official page for dates"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Journey({ r }: { r: MyRecords }) {
  const badges = badgeStates(r);
  const earned = badges.filter((b) => b.earned);
  const circle = r.activities.filter((a) => a.kind === "circle_session" && a.past).length;
  const events = r.activities.filter((a) => a.past && a.kind !== "circle_session" && a.kind !== "circle_cohort").length;
  const stats = [
    { label: "Circle check-ins", value: circle }, { label: "Events", value: events },
    { label: "Opportunities tracked", value: r.tracked.length }, { label: "Connections", value: r.connections },
  ];
  return (
    <section aria-labelledby="journey-heading" data-testid="home-journey" className={cn(cardGloss, "p-6")}>
      <div className="flex items-center gap-3">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", ACCENTS.violet.strong)}><IdCard size={20} aria-hidden="true" /></span>
        <div><h2 id="journey-heading" className="text-[20px] font-bold">My learning journey</h2><p className="text-[14px] text-[#2F4157]/60">From your EL-Passport</p></div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => <div key={s.label} className="rounded-xl bg-[#F7F8FA] p-3"><dt className="text-[13px] text-[#2F4157]/60">{s.label}</dt><dd className="text-[22px] font-bold">{s.value}</dd></div>)}
      </dl>
      <p className="mt-4 flex items-center gap-2 text-[15px]">
        <Trophy size={18} className="text-[#8A5A00]" aria-hidden="true" />
        {earned.length ? <span><strong>{earned.length}</strong> of {badges.length} badges: {earned.slice(0, 3).map((b) => b.def.name).join(", ")}</span> : <span>Your first badge: <strong>{badges[0].def.name}</strong>. {badges[0].def.how}</span>}
      </p>
      <Link href="/dashboard/passport" data-testid="home-open-passport" className={cn(btnSecondary, "mt-4 w-full")}>Open EL-Passport</Link>
    </section>
  );
}

function CommunitySpotlight() {
  const [story] = usePublishedStories(1);
  if (!story) return null;
  return (
    <section aria-labelledby="community-spotlight-heading" data-testid="home-community-spotlight" className={cn(cardGloss, "overflow-hidden")}>
      {story.bannerImage && <div className="relative aspect-[16/8] bg-[#EAEFF5]"><Image src={story.bannerImage} alt="" fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" /></div>}
      <div className="p-5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#577E90]" id="community-spotlight-heading">Beyond the Circle · member story</p>
        <h3 className="mt-1 text-[18px] font-bold leading-snug">{story.title}</h3>
        <p className="mt-1 line-clamp-2 text-[15px] text-[#2F4157]/70">{story.summary}</p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link href={`/circle/stories/${story.slug}`} className={btnLink}>Read the story</Link>
          <Link href="/circle/stories/submit" className={btnLink}>Share yours</Link>
        </div>
      </div>
    </section>
  );
}

export function HomeView({ user, profile, storage, supabase }: DashboardCtx) {
  const { t } = useI18n();
  const router = useRouter();
  const needsOnboarding = !profile.onboarding_completed_at;
  // Onboarding can't be saved while the profile table is missing, so don't send members into it.
  const canOnboard = storage === "supabase";
  const [deferred, setDeferred] = useState(false);
  const { state, reload } = useMyRecords(user.id);

  useEffect(() => {
    if (!needsOnboarding || !canOnboard) return;
    if (window.sessionStorage.getItem(ONBOARDING_LATER_KEY) === "1") setDeferred(true);
    else router.replace("/dashboard/onboarding");
  }, [needsOnboarding, canOnboard, router]);

  if (needsOnboarding && canOnboard && !deferred) return <LoadingState />;

  const records = state.s === "ready" ? state.data : null;
  const coming = records ? upcoming(records).slice(0, 4) : [];

  return (
    <div className="mx-auto max-w-[110rem] space-y-10 px-4 py-8 md:px-6 md:py-10 lg:px-10">
      {storage === "unavailable" && <ProfilePendingNotice />}
      <div data-tour="ielsco-home"><HomeHero profile={profile} needsOnboarding={needsOnboarding} /></div>
      <NextActionCard action={nextAction(profile, needsOnboarding, records)} />

      {!needsOnboarding && !profile.origin_country && (
        <Notice testId="origin-prompt">
          {t("home.originPrompt")}{" "}
          <Link href="/dashboard/profile#about" data-testid="origin-prompt-link" className={btnLink}>{t("home.originPromptLink")}</Link>
        </Notice>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-10">
          <div data-tour="ielsco-elco"><ElcoProgressCard elco={records?.elco ?? null} /></div>

          <section aria-labelledby="upcoming-heading" className="space-y-3" data-testid="home-upcoming">
            <div className="flex items-end justify-between gap-3">
              <h2 id="upcoming-heading" className="text-[22px] font-bold">My upcoming activities</h2>
              <Link href="/dashboard/events" className={btnLink}>All my events</Link>
            </div>
            {state.s === "loading" && <div className="h-24 animate-pulse rounded-2xl bg-white/70" aria-hidden="true" />}
            {state.s === "error" && <p role="alert" className="text-[15px] text-[#B4383A]">Couldn&apos;t load your activities: {state.message}</p>}
            {records && (coming.length === 0 ? (
              <EmptyState title="Nothing on your calendar yet" body="Register for an IELSco event, check in to an IELS Circle session or join a community event. They'll all appear here."
                action={<div className="flex flex-wrap justify-center gap-3"><Link href="/dashboard/circle" className={btnPrimary}><CalendarDays size={16} aria-hidden="true" /> IELS Circle sessions</Link><Link href="/dashboard/events/ielsco" className={btnSecondary}>IELSco Events</Link></div>} />
            ) : <ActivityList items={coming} userId={user.id} onChanged={reload} />)}
          </section>

          <Spotlight profile={profile} supabase={supabase} />
        </div>

        <aside className="min-w-0 space-y-6">
          {records ? <Journey r={records} /> : <div className="h-72 animate-pulse rounded-2xl bg-white/70" aria-hidden="true" />}
          {records && records.tracked.length > 0 && (
            <Link href="/dashboard/opportunities" className={cn(cardGloss, "flex items-center gap-3 p-4 hover:border-[#577E90]", focusRing)}>
              <BriefcaseBusiness size={20} className="text-[#577E90]" aria-hidden="true" />
              <span className="flex-1"><span className="block font-semibold">My opportunity tracker</span><span className="text-[14px] text-[#2F4157]/65">{records.tracked.filter((x) => x.status === "applied").length} applied · {records.tracked.filter((x) => x.status === "preparing").length} applying</span></span>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
          <CommunitySpotlight />
          <GifFeatureCard />
        </aside>
      </div>
      {(!needsOnboarding || !canOnboard) && <Suspense fallback={null}><DashboardTour supabase={supabase} userId={user.id} /></Suspense>}
    </div>
  );
}
