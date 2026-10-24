"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarClock, Compass, Users, Sparkles } from "lucide-react";
import Footer from "@/components/footer";
import { body, btnPrimary, btnSecondary, card, cardLink, container, eyebrow, h1, h2, h3, lead, pill, section, textLink, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";
import { eventsData } from "@/data/events";
import { GIF_BATCH, gifRegistrationOpen } from "@/data/gif";
import { formatSessionWib, upcomingSessions } from "@/lib/circle/sessions";
import { generateSlug } from "@/utils/slug";
import { wibDeadline } from "@/lib/events/deadline";
import { ELCO_ENABLED, ELCO_MASCOT, elcoHref } from "@/lib/elco";

// Public landing page. Positioning: Community & Opportunities for Southeast Asian learners.
// Everything time-based (sessions, registration status) is computed in the browser after mount, so the page never
// shows a stale "open" state and server/client renders match.


function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now;
}

function Hero() {
  return (
    <section className="bg-white pb-[56px] pt-[40px] md:pb-[88px] md:pt-[64px]" aria-labelledby="hero-heading">
      <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16")}>
        <div>
          <p className={eyebrow}>IELS · Community &amp; Opportunities</p>
          <h1 id="hero-heading" className={cn(h1, "mt-4")}>
            Find your people.<br />
            <span className="text-[#E56668]">Find your next opportunity.</span>
          </h1>
          <p className={cn(lead, "mt-6 max-w-[560px]")}>
            IELS connects learners across Southeast Asia with peers, mentors and free resources, and with programs for
            studying and working abroad. Practise together every week, learn from members who have done it, and apply
            when an opportunity fits you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={btnPrimary} data-testid="landing-join">
              Join IELS for free <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/circle" className={btnSecondary} data-testid="landing-circle">
              See how the Circle works
            </Link>
          </div>
          <p className="mt-4 text-[14px] text-[#2F4157]/60">Free account · Weekly sessions on Wednesdays and Saturdays</p>
        </div>
        <div className="relative">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[28px] border border-[#E6E9EE]">
            <Image src="/images/contents/careers/iels_team_0.png" alt="IELS members together at an in-person IELS session" fill priority
              sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />
          </div>
          <div className="absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-[18px] border border-[#E6E9EE] bg-white p-3 pr-4 shadow-[0_12px_32px_rgba(26,37,52,0.08)] sm:left-auto sm:right-6 sm:w-[300px]">
            <Image src="/images/contents/mascot/hi.svg" alt="" width={48} height={48} className="h-12 w-12 shrink-0" />
            <p className="text-[14px] leading-snug text-[#2F4157]">
              <span className="font-bold text-[#1A2534]">New here?</span> Start with one Circle session. Listening counts too.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Compass, n: "01", title: "Discover", text: "Free guides, recordings and scholarship lists, plus stories from members who have studied, interned and volunteered abroad.", href: "/products/resources", cta: "Browse free resources" },
  { icon: Users, n: "02", title: "Participate", text: "Join IELS Circle: online sessions every Wednesday at 19:00 and Saturday at 13:00 WIB, each with a new topic to talk about.", href: "/circle", cta: "Meet the Circle" },
  { icon: Sparkles, n: "03", title: "Take the next step", text: "Apply to programs such as the Global Impact Fellowship and join events run with universities and partners.", href: "/events", cta: "See events and programs" },
];

function HowItWorks() {
  return (
    <section className={section} aria-labelledby="how-heading" id="how-it-works">
      <div className={container}>
        <div className="max-w-[640px]">
          <p className={eyebrow}>How IELS works</p>
          <h2 id="how-heading" className={cn(h2, "mt-3")}>From your first conversation to your first application</h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className={cn(card, "flex flex-col p-7")}>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><s.icon size={20} aria-hidden="true" /></span>
                <span className="text-[14px] font-bold text-[#577E90]">{s.n}</span>
              </div>
              <h3 className={cn(h3, "mt-6")}>{s.title}</h3>
              <p className={cn(body, "mt-2 flex-1")}>{s.text}</p>
              <Link href={s.href} className={cn(textLink, "mt-6")}>{s.cta} <ArrowRight size={16} aria-hidden="true" /></Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CircleSessions() {
  const now = useNow();
  const sessions = useMemo(() => (now ? upcomingSessions(2, now) : []), [now]);
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="circle-heading">
      <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2 lg:gap-16")}>
        <div className="relative order-last aspect-[16/11] overflow-hidden rounded-[28px] border border-[#E6E9EE] lg:order-first">
          <Image src="/images/contents/general/iels_gathering.png" alt="IELS members smiling around a table at a meet-up" fill sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
        </div>
        <div>
          <p className={eyebrow}>IELS Circle</p>
          <h2 id="circle-heading" className={cn(h2, "mt-3")}>A weekly place to practise, ask and share</h2>
          <p className={cn(lead, "mt-4")}>
            Circle sessions are online and open to members. Each one has a topic, from scholarship essays to small talk, so you
            always have something to say.
          </p>
          <ul className="mt-8 space-y-3" aria-live="polite">
            {sessions.length === 0 && <li className="h-[76px] animate-pulse rounded-[18px] bg-[#F1F4F8]" aria-hidden="true" />}
            {sessions.map((s) => {
              const f = formatSessionWib(s.start);
              return (
                <li key={s.id} className={cn(card, "flex items-start gap-4 p-4")}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><CalendarClock size={20} aria-hidden="true" /></span>
                  <div>
                    <p className="text-[14px] font-semibold text-[#577E90]">{f.day} · {f.time}</p>
                    <p className="mt-0.5 text-[16px] font-bold text-[#1A2534]">{s.topic.title}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/circle" className={btnPrimary}>Explore IELS Circle <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href="/circle/agenda" className={btnSecondary}>Cohort agenda</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stories() {
  const stories = usePublishedStories(3);
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="stories-heading">
      <div className={container}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[620px]">
            <p className={eyebrow}>Member stories</p>
            <h2 id="stories-heading" className={cn(h2, "mt-3")}>Written by members, in their own words</h2>
          </div>
          <Link href="/circle/stories" className={textLink}>Read all stories <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {stories.map((s) => (
            <li key={s.slug}>
              <Link href={`/circle/stories/${s.slug}`} className={cn(cardLink, "flex h-full flex-col overflow-hidden")}>
                <div className="relative aspect-[16/9] bg-[#F1F4F8]">
                  {s.bannerImage && <Image src={s.bannerImage} alt="" fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-[18px] font-bold leading-snug text-[#1A2534]">{s.title}</h3>
                  <div className="mt-auto flex items-center gap-3 pt-6">
                    {s.author.avatar && <Image src={s.author.avatar} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-cover" />}
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-[#1A2534]">{s.author.name}</p>
                      {s.author.role && <p className="truncate text-[13px] text-[#2F4157]/65">{s.author.role}</p>}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Opportunities() {
  const now = useNow();
  const gifOpen = now ? gifRegistrationOpen(now) : null;
  // The next event whose registration is still open, straight from the events data. Nothing shown if there is none.
  const nextEvent = useMemo(() => {
    if (!now) return null;
    return eventsData
      .map((e) => ({ e, closes: new Date(wibDeadline(e.registrationDateDeadline, e.registrationTimeDeadline)) }))
      .filter(({ closes }) => closes > now)
      .sort((a, b) => a.closes.getTime() - b.closes.getTime())[0] ?? null;
  }, [now]);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(d);

  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="opps-heading">
      <div className={container}>
        <div className="max-w-[640px]">
          <p className={eyebrow}>Programs &amp; opportunities</p>
          <h2 id="opps-heading" className={cn(h2, "mt-3")}>Ways to go further with IELS</h2>
          <p className={cn(lead, "mt-4")}>Programs open and close through the year. Dates and status below come from the event pages themselves.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Link href={GIF_BATCH.overviewPage} className={cn(cardLink, "grid overflow-hidden sm:grid-cols-[1fr_200px]")} data-testid="landing-gif">
            <div className="flex flex-col p-7">
              <div className="flex items-center gap-3">
                <Image src="/images/logos/events/gifsgp.png" alt="" width={40} height={40} className="h-10 w-auto" />
                <p className="text-[14px] font-semibold text-[#914D4D]">Global Impact Fellowship</p>
              </div>
              <h3 className={cn(h3, "mt-5")}>Lead a project with youth from across Southeast Asia</h3>
              <p className={cn(body, "mt-2")}>{GIF_BATCH.facts[0]}. {GIF_BATCH.facts[1]}.</p>
              <div className="mt-auto pt-6">
                {gifOpen === true && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Registration open until {fmt(new Date(GIF_BATCH.registrationDeadline))}</span>}
                {gifOpen === false && <span className={pill}>{GIF_BATCH.name}: registration closed</span>}
                <span className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">About the fellowship <ArrowRight size={16} aria-hidden="true" /></span>
              </div>
            </div>
            <div className="relative hidden min-h-[240px] sm:block">
              <Image src={GIF_BATCH.poster} alt="" fill sizes="200px" className="object-cover" />
            </div>
          </Link>

          <div className="grid gap-6">
            {nextEvent ? (
              <Link href={`/events/${generateSlug(nextEvent.e.title)}`} className={cn(cardLink, "p-7")} data-testid="landing-next-event">
                <p className="text-[14px] font-semibold text-[#577E90]">Next event · registration open</p>
                <h3 className={cn(h3, "mt-2")}>{nextEvent.e.title}</h3>
                <p className={cn(body, "mt-2")}>Register by {fmt(nextEvent.closes)}.</p>
                <span className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">Event details <ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            ) : (
              <Link href="/events" className={cn(cardLink, "p-7")}>
                <p className="text-[14px] font-semibold text-[#577E90]">Events</p>
                <h3 className={cn(h3, "mt-2")}>Info sessions, workshops and fellowships</h3>
                <span className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">See all events <ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            )}
            <a href="https://school.ielsco.com" className={cn(cardLink, "p-7")}>
              <p className="text-[14px] font-semibold text-[#577E90]">For schools</p>
              <h3 className={cn(h3, "mt-2")}>IELS for Schools</h3>
              <p className={cn(body, "mt-2")}>A portal for partner schools to follow their students&apos; English learning.</p>
              <span className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">Visit the school portal <ArrowUpRight size={16} aria-hidden="true" /></span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Elco AI, IELSco's English-learning companion (separate app at ai.ielsco.com). Shown only when NEXT_PUBLIC_ELCO_ENABLED
// is "true", i.e. after the Elco deployment has been verified, so the landing page never links to a missing site.
function ElcoSection() {
  if (!ELCO_ENABLED) return null;
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="elco-heading" data-testid="landing-elco">
      <div className={cn(container, "grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14")}>
        <Image src={ELCO_MASCOT} alt="" width={160} height={157} className="mx-auto h-[140px] w-auto lg:h-[160px]" />
        <div>
          <p className={eyebrow}>Elco AI · by IELS</p>
          <h2 id="elco-heading" className={cn(h2, "mt-3")}>Learn English with Elco AI</h2>
          <p className={cn(lead, "mt-4 max-w-[640px]")}>
            Elco is IELS&apos;s English-learning companion: guided practice planned around your goals, conversations with
            Elco Chat, feedback on your speaking and writing, and a vocabulary notebook. IELS stays your home for people,
            Circle and opportunities.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={elcoHref("landing")} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="landing-elco-cta">
              Start learning with Elco <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <p className="text-[14px] text-[#2F4157]/60">Free to start · separate Elco account</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="final-heading">
      <div className={cn(container, "flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between")}>
        <div className="flex items-center gap-5">
          <Image src="/images/contents/mascot/poses/happy.png" alt="" width={88} height={88} className="hidden h-[88px] w-[88px] shrink-0 object-contain sm:block" />
          <div>
            <h2 id="final-heading" className={h2}>Start with one session</h2>
            <p className={cn(lead, "mt-2 max-w-[560px]")}>Create a free account and join the next Circle session.</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/sign-up" className={btnPrimary}>Join IELS for free <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link href="/about" className={btnSecondary}>About IELS</Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="landing-page">
      <Hero />
      <HowItWorks />
      <CircleSessions />
      <Stories />
      <Opportunities />
      <ElcoSection />
      <FinalCta />
      <Footer />
    </div>
  );
}
