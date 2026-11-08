"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Mic } from "lucide-react";
import type { DashboardCtx } from "../DashboardPage";
import { EmptyState, LoadingState, Notice, ProfilePendingNotice } from "../PageStates";
import { ONBOARDING_LATER_KEY } from "../useMemberProfile";
import { useMyRecords } from "../useMyRecords";
import { ElcoProgressCard } from "../me/ElcoProgressCard";
import { GifFeatureCard } from "../gif/GifFeatureCard";
import { DashboardTour } from "./DashboardTour";
import { btnLink, btnPrimary, cardGloss, focusRing, tag } from "../ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { currentOrNextActivity, formatRange } from "@/data/dashboard/circle";
import { PROGRAMS } from "@/data/dashboard/programs";
import { formatSessionWib, upcomingSessions } from "@/lib/circle/sessions";
import { eventDayLabel, officialEvents } from "@/lib/events/catalog";
import { loadStoriesFeed, type FeedStory } from "@/lib/content/stories-feed";
import { CATEGORY_LABEL, recommendOpportunities, type Opportunity } from "@/lib/opportunities";
import { loadOpportunities } from "@/lib/pulse";
import { dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { opportunityCover } from "@/lib/covers";

// Home (docs/IELSCO-PRODUCT-ARCHITECTURE.md §3), IELSco first: 1 IELSco Highlights, 2 Upcoming IELSco Events,
// 3 Explore Programs, 4 Explore Opportunities, 5 Continue Learning (Elco AI). Images are existing IELSco posters and
// photos; every item is real data (published content, the events list, the member's own records).

function SectionHead({ id, title, href, label }: { id: string; title: string; href?: string; label?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 id={id} className="text-2xl font-bold md:text-3xl">{title}</h2>
      {href && <Link href={href} className={btnLink}>{label} <ArrowRight size={16} aria-hidden="true" /></Link>}
    </div>
  );
}

// Image card in the style of the events cards (cardGloss, 16:10 cover, text below).
function ImageCard({ href, image, eyebrow, title, body, testId }: { href: string; image?: string; eyebrow: string; title: string; body?: string; testId?: string }) {
  return (
    <Link href={href} data-testid={testId} className={cn(cardGloss, "group flex h-full flex-col overflow-hidden rounded-3xl hover:border-[#577E90]", focusRing)}>
      <span className="relative block aspect-[16/10] bg-[#EAEFF5]">
        {image && <Image src={image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover object-top" />}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-5">
        <span className="text-[14px] font-semibold text-[#577E90]">{eyebrow}</span>
        <span className="text-[18px] font-bold leading-snug text-[#1A2534]">{title}</span>
        {body && <span className="line-clamp-2 text-[15px] text-[#2F4157]/70">{body}</span>}
      </span>
    </Link>
  );
}

function Highlights({ supabase }: { supabase: DashboardCtx["supabase"] }) {
  const [news, setNews] = useState<FeedStory | null>(null);
  useEffect(() => { loadStoriesFeed(supabase).then((f) => setNews(f.items.find((s) => s.kind === "ielsco") ?? null)).catch(() => setNews(null)); }, [supabase]);
  const circle = currentOrNextActivity();
  const course = PROGRAMS.find((p) => p.id === "iels-course");
  return (
    <section aria-labelledby="highlights-heading" className="space-y-5" data-testid="home-highlights">
      <SectionHead id="highlights-heading" title="IELSco highlights" />
      <GifFeatureCard />
      <div className="grid gap-5 md:grid-cols-2">
        {course && (
          <ImageCard href="/dashboard/programs" image={course.image} eyebrow={`IELSco program · ${course.status}`} title={course.name} body={course.summary} testId="home-highlight-course" />
        )}
        {news ? (
          <ImageCard href={news.href} image={news.image} eyebrow={`IELSco news · ${news.categoryLabel}`} title={news.title} body={news.summary} testId="home-highlight-news" />
        ) : circle && (
          <ImageCard href="/dashboard/circle" image="/images/dashboard/collection-speaking.jpg" testId="home-highlight-circle"
            eyebrow={`IELS Circle cohort · ${circle.isNow ? "this week" : "next"} · ${formatRange(circle.activity)}`} title={circle.activity.title} body={circle.activity.focus} />
        )}
      </div>
    </section>
  );
}

function UpcomingIelsco({ userId }: { userId: string }) {
  const { state } = useMyRecords(userId);
  const registered = new Set(state.s === "ready" ? state.data.activities.filter((a) => a.eventId).map((a) => a.eventId!) : []);
  const checkedIn = new Set(state.s === "ready" ? state.data.activities.filter((a) => a.kind === "circle_session").map((a) => a.start.toISOString()) : []);
  const events = officialEvents().filter((e) => !e.isPast).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 3);
  const sessions = events.length < 3 ? upcomingSessions(3) : [];
  return (
    <section aria-labelledby="upcoming-ielsco-heading" className="space-y-5" data-testid="home-upcoming-ielsco">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="upcoming-ielsco-heading" className="text-2xl font-bold md:text-3xl">Upcoming IELSco events</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard/notifications" className={btnLink}>Notifications</Link>
          <Link href="/dashboard/events/ielsco" className={btnLink}>All IELSco Events <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {events.map((e) => (
          <li key={e.id}>
            <Link href={e.href} className={cn(cardGloss, "flex h-full flex-col overflow-hidden rounded-3xl hover:border-[#577E90]", focusRing)} data-testid="home-event-card">
              <span className="relative block aspect-[16/10] bg-[#2F4157]">
                {e.poster && <Image src={e.poster} alt="" fill sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />}
                {registered.has(e.id) && <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-[#2F4157]"><CheckCircle2 size={14} className="text-[#577E90]" aria-hidden="true" /> Registered</span>}
              </span>
              <span className="flex flex-1 flex-col gap-1 p-5">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-[#577E90]"><CalendarDays size={15} aria-hidden="true" />{eventDayLabel(e.date)}{e.format === "talk" && <span className={tag}>IELSco Talk</span>}</span>
                <span className="text-[18px] font-bold leading-snug text-[#1A2534]">{e.title}</span>
                <span className="mt-auto pt-2 text-[15px] font-semibold text-[#577E90]">{registered.has(e.id) ? "See details" : "Register"}</span>
              </span>
            </Link>
          </li>
        ))}
        {/* IELS Circle: one card with its next sessions, filling the rest of the row. */}
        {sessions.length > 0 && (
          <li className={cn(events.length === 0 && "md:col-span-2 xl:col-span-3", events.length === 1 && "xl:col-span-2")}>
            <div className={cn(cardGloss, "flex h-full flex-col overflow-hidden rounded-3xl", events.length === 0 && "md:flex-row")} data-testid="home-circle-card">
              {/* The ongoing community's own identity (official Circle logo), not the 2025 event poster. */}
              <div className={cn("relative flex aspect-[16/10] shrink-0 items-center justify-center bg-[#EEF2F7]", events.length === 0 && "md:aspect-auto md:w-[42%]")}>
                <Image src="/images/logos/circle/circle-typeface-blue.svg" alt="IELS Circle" width={212} height={310} className="h-auto w-[34%] max-w-[150px]" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                  <p className="text-[14px] font-semibold text-[#0B6E64]">IELS Circle · open speaking sessions</p>
                  <h3 className="text-[18px] font-bold leading-snug text-[#1A2534]">Practise speaking every Wednesday and Saturday</h3>
                </div>
                <ul className="divide-y divide-[#E3E7ED]">
                  {sessions.map((s) => {
                    const { day, time } = formatSessionWib(s.start);
                    const mine = checkedIn.has(s.start.toISOString());
                    return (
                      <li key={s.id} className="flex items-start gap-3 py-2">
                        <Mic size={16} className="mt-1 shrink-0 text-[#0B6E64]" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-[#2F4157]/70">{day} · {time}</span>
                          <span className="block text-[15px] font-semibold text-[#1A2534]">{s.topic.title}</span>
                        </span>
                        {mine && <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#577E90]"><CheckCircle2 size={14} aria-hidden="true" /> Checked in</span>}
                      </li>
                    );
                  })}
                </ul>
                <Link href="/dashboard/circle" className={cn(btnLink, "mt-auto")} data-testid="home-circle-cta">Check in to a session <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
            </div>
          </li>
        )}
      </ul>
    </section>
  );
}

function ExplorePrograms() {
  // GIF and the IELS Course are in the highlights and IELS Circle is in Upcoming events, so these are the others.
  const picks = PROGRAMS.filter((p) => p.image && !["gif", "iels-course", "iels-circle"].includes(p.id)).slice(0, 3);
  return (
    <section aria-labelledby="programs-heading" className="space-y-5" data-testid="home-programs">
      <SectionHead id="programs-heading" title="Explore programs" href="/dashboard/programs" label="All programs" />
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {picks.map((p) => <li key={p.id}><ImageCard href="/dashboard/programs" image={p.image} eyebrow={p.status} title={p.name} body={p.summary} /></li>)}
      </ul>
    </section>
  );
}

function ExploreOpportunities({ profile, supabase }: Pick<DashboardCtx, "profile" | "supabase">) {
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  useEffect(() => { loadOpportunities(supabase).then(setOpps); }, [supabase]);
  const picks = useMemo(() => (opps ? recommendOpportunities(opps, profile, 3, new Date(), true) : []), [opps, profile]);
  return (
    <section aria-labelledby="opps-heading" className="space-y-5" data-testid="home-opportunity-spotlight">
      <SectionHead id="opps-heading" title="Explore opportunities" href="/dashboard/discover/opportunities" label="All opportunities" />
      {opps === null ? <div className="h-32 animate-pulse rounded-2xl bg-[#F7F8FA]" aria-hidden="true" /> : picks.length === 0 ? (
        <EmptyState title="No open opportunities right now" body="New scholarships, internships and programs are added after IELS checks them against the official page."
          action={<Link href="/dashboard/discover/opportunities?type=professional" className={btnPrimary}>See jobs abroad</Link>} />
      ) : (
        <ul className="grid gap-5 md:grid-cols-3">
          {picks.map(({ opportunity: o, reason }) => (
            <li key={o.id}>
              <Link href={`/opportunities/${o.slug}`} className={cn(cardGloss, "flex h-full flex-col gap-2 overflow-hidden rounded-3xl p-5 hover:border-[#577E90]", focusRing)}>
                <span className="relative -mx-5 -mt-5 mb-2 block aspect-[16/10] bg-[#EAEFF5]">
                  <Image src={opportunityCover(o.category, o.slug)} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                </span>
                <span className="flex flex-wrap items-center gap-2"><span className={tag}>{CATEGORY_LABEL[o.category]}</span>{reason && <span className="text-[13px] font-semibold text-[#0B6E64]">{reason}</span>}</span>
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

export function HomeView({ user, profile, storage, supabase }: DashboardCtx) {
  const { t } = useI18n();
  const router = useRouter();
  const needsOnboarding = !profile.onboarding_completed_at;
  // Onboarding can't be saved while the profile table is missing, so don't send members into it.
  const canOnboard = storage === "supabase";
  const [deferred, setDeferred] = useState(false);
  const { state } = useMyRecords(user.id);

  useEffect(() => {
    if (!needsOnboarding || !canOnboard) return;
    if (window.sessionStorage.getItem(ONBOARDING_LATER_KEY) === "1") setDeferred(true);
    else router.replace("/dashboard/onboarding");
  }, [needsOnboarding, canOnboard, router]);

  if (needsOnboarding && canOnboard && !deferred) return <LoadingState />;
  const first = (profile.display_name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-[110rem] space-y-14 px-4 py-10 md:px-6 md:py-14 lg:px-12">
      {storage === "unavailable" && <ProfilePendingNotice />}
      <div data-tour="ielsco-home">
        <p className="text-base font-semibold text-[#577E90]">{first ? t("home.hi", { name: first }) : t("home.hiNoName")}</p>
        <h1 data-testid="home-greeting" className="mt-1 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">What&apos;s happening at IELSco</h1>
      </div>
      {needsOnboarding && (
        <Notice testId="home-set-goals">Tell us your goals so we can match programs and opportunities to you. <Link href="/dashboard/onboarding" className={btnLink}>{t("home.setGoals")}</Link></Notice>
      )}
      {!needsOnboarding && !profile.origin_country && (
        <Notice testId="origin-prompt">
          {t("home.originPrompt")}{" "}
          <Link href="/dashboard/profile#about" data-testid="origin-prompt-link" className={btnLink}>{t("home.originPromptLink")}</Link>
        </Notice>
      )}
      <Highlights supabase={supabase} />
      <UpcomingIelsco userId={user.id} />
      <ExplorePrograms />
      <ExploreOpportunities profile={profile} supabase={supabase} />
      <div data-tour="ielsco-elco"><ElcoProgressCard elco={state.s === "ready" ? state.data.elco : null} /></div>
      {(!needsOnboarding || !canOnboard) && <Suspense fallback={null}><DashboardTour supabase={supabase} userId={user.id} /></Suspense>}
    </div>
  );
}
