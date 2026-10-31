"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarClock, Compass, FileText, Users } from "lucide-react";
import Footer from "@/components/footer";
import { body, btnPrimary, btnSecondary, card, cardLink, container, eyebrow, h1, h2, h3, lead, pill, section, textLink, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";
import { eventsData } from "@/data/events";
import { GIF_BATCH, gifRegistrationOpen } from "@/data/gif";
import { formatSessionWib, upcomingSessions } from "@/lib/circle/sessions";
import { generateSlug } from "@/utils/slug";
import { wibDeadline } from "@/lib/events/deadline";
import { ELCO_ENABLED, ELCO_MASCOT, ELCO_MASCOT_WAVE, elcoHref } from "@/lib/elco";
import { Photo } from "@/components/site/Photo";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABEL, FUNDING_LABEL, type Opportunity } from "@/lib/opportunities";
import { track } from "@/lib/analytics";

// Public landing page. Positioning: IELSco = international opportunities + the community and preparation to go after them.
// The Elco robot is the shared IELSco/Elco mascot; Elco AI (English practice) is promoted in its own section.
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
          <p className={eyebrow}>IELSco · Opportunities &amp; community</p>
          <h1 id="hero-heading" className={cn(h1, "mt-4")}>
            Go after international opportunities,<br />
            <span className="text-[#E56668]">with people beside you.</span>
          </h1>
          <p className={cn(lead, "mt-6 max-w-[560px]")}>
            IELSco helps young people in Southeast Asia find scholarships, fellowships and programs abroad, prepare strong
            applications, and stay on track with a community that is doing the same.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-up" className={btnPrimary} data-testid="landing-join" onClick={() => track("cta_click", { cta: "home_hero_join" })}>
              Create a free account <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/opportunities" className={btnSecondary} data-testid="landing-opportunities">
              Browse opportunities
            </Link>
          </div>
          <p className="mt-4 text-[14px] text-[#2F4157]/60">Free account · Membership is optional</p>
        </div>
        <div className="relative">
          <Photo photo="communityInPerson" ratio="wide" priority sizes="(min-width: 1024px) 520px, 100vw" />
          <div className="absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-[18px] border border-[#E6E9EE] bg-white p-3 pr-4 shadow-[0_12px_32px_rgba(26,37,52,0.08)] sm:left-auto sm:right-6 sm:w-[310px]">
            <Image src={ELCO_MASCOT_WAVE} alt="" width={48} height={48} className="h-12 w-12 shrink-0" />
            <p className="text-[14px] leading-snug text-[#2F4157]">
              <span className="font-bold text-[#1A2534]">IELS Circle is free.</span> Open sessions every Wednesday and Saturday.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Compass, n: "01", title: "Find", text: "A short, checked list of scholarships, fellowships and programs, each with its official link and what we've verified.", href: "/opportunities", cta: "Browse opportunities" },
  { icon: FileText, n: "02", title: "Prepare", text: "Free guides for CVs, essays and interviews; mentor-led courses; and for members, written feedback and application clinics.", href: "/products/resources", cta: "Free resources" },
  { icon: Users, n: "03", title: "Go together", text: "Practise every week in IELS Circle, read how members did it, and (as a member) get a study buddy with the same goal.", href: "/circle", cta: "Meet the Circle" },
];

function HowItWorks() {
  return (
    <section className={section} aria-labelledby="how-heading" id="how-it-works">
      <div className={container}>
        <div className="max-w-[640px]">
          <p className={eyebrow}>How IELS works</p>
          <h2 id="how-heading" className={cn(h2, "mt-3")}>From finding an opportunity to sending the application</h2>
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
          <Image src="/images/site/gathering.webp" alt="IELS members smiling together at a meet-up" fill sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
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
          <h2 id="opps-heading" className={cn(h2, "mt-3")}>IELS programs and events</h2>
          <p className={cn(lead, "mt-4")}>Programs open and close through the year. Dates and status below come from the event pages themselves.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Link href={GIF_BATCH.overviewPage} className={cn(cardLink, "grid overflow-hidden sm:grid-cols-[1fr_200px]")} data-testid="landing-gif">
            <div className="flex flex-col p-7">
              <div className="flex items-center gap-3">
                <Image src="/images/logos/events/gif.png" alt="" width={110} height={40} className="h-[40px] w-auto" />
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
            <Link href="/school" className={cn(cardLink, "p-7")}>
              <p className="text-[14px] font-semibold text-[#577E90]">For schools</p>
              <h3 className={cn(h3, "mt-2")}>IELS for Schools</h3>
              <p className={cn(body, "mt-2")}>Global-opportunity sessions and application workshops, planned with your school.</p>
              <span className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">For schools <ArrowRight size={16} aria-hidden="true" /></span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Elco AI: a separate English learning app (www.elcoai.com) run by PT Elco Edukasi Berkah Indonesia, which shares IELSco's
// founder. Shown only when NEXT_PUBLIC_ELCO_ENABLED
// is "true", i.e. after the Elco deployment has been verified, so the landing page never links to a missing site.
function ElcoSection() {
  if (!ELCO_ENABLED) return null;
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="elco-heading" data-testid="landing-elco">
      <div className={cn(container, "grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14")}>
        <Image src={ELCO_MASCOT} alt="" width={160} height={157} className="mx-auto h-[140px] w-auto lg:h-[160px]" />
        <div>
          <p className={eyebrow}>Elco AI · English learning app</p>
          <h2 id="elco-heading" className={cn(h2, "mt-3")}>Practise English through games with Elco AI</h2>
          <p className={cn(lead, "mt-4 max-w-[640px]")}>
            Elco AI makes English practice feel like play: short English games you can play against Elco Bot, another
            learner or a friend, plus guided lessons, AI chat and voice practice. It&apos;s developed and operated by PT Elco
            Edukasi Berkah Indonesia, a separate company that shares IELSco&apos;s founder. IELSco stays your home for people,
            Circle and opportunities.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={elcoHref("landing")} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="landing-elco-cta">
              Try Elco AI <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <p className="text-[14px] text-[#2F4157]/60">Free to start at elcoai.com · separate Elco account</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function OpportunityPreview() {
  const [items, setItems] = useState<Pick<Opportunity, "id" | "slug" | "title" | "organizer" | "category" | "funding">[] | null>(null);
  useEffect(() => {
    createClient().from("opportunities").select("id, slug, title, organizer, category, funding").eq("status", "published").eq("featured", true).limit(4)
      .then(({ data }) => setItems((data as typeof items) ?? []));
  }, []);
  if (items && items.length === 0) return null;
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="opp-preview-heading" data-testid="landing-opportunity-preview">
      <div className={container}>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[640px]">
            <p className={eyebrow}>Opportunity board</p>
            <h2 id="opp-preview-heading" className={cn(h2, "mt-3")}>Programs worth knowing about</h2>
            <p className={cn(lead, "mt-4")}>Each listing links to the official page and says what we have checked.</p>
          </div>
          <Link href="/opportunities" className={textLink}>See all opportunities <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(items ?? Array.from({ length: 4 }, () => null)).map((o, i) => (
            <li key={o?.id ?? i}>
              {o ? (
                <Link href={`/opportunities/${o.slug}`} className={cn(cardLink, "flex h-full flex-col p-6")}>
                  <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#577E90]">{CATEGORY_LABEL[o.category]}</span>
                  <span className="mt-3 text-[18px] font-bold leading-snug text-[#1A2534]">{o.title}</span>
                  <span className="mt-1 flex-1 text-[14px] text-[#2F4157]/65">{o.organizer}</span>
                  <span className={cn(pill, "mt-5 self-start")}>{FUNDING_LABEL[o.funding]}</span>
                </Link>
              ) : <div className="h-[200px] animate-pulse rounded-[20px] bg-[#F1F4F8]" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function MembershipTeaser() {
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="membership-heading">
      <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16")}>
        <div>
          <p className={eyebrow}>Free account &amp; membership</p>
          <h2 id="membership-heading" className={cn(h2, "mt-3")}>Free to start. Membership when you want support.</h2>
          <p className={cn(lead, "mt-4")}>
            Your free account covers the opportunity board, tracking up to 10 applications, IELS Circle and free resources.
            Members add live application clinics, written feedback on a CV or essay, a study buddy and a private member group.
          </p>
          <Link href="/membership" className={cn(btnPrimary, "mt-8")} onClick={() => track("cta_click", { cta: "home_membership" })}>What members get <ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
        <Photo photo="discussion" ratio="wide" position="40% center" />
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
            <h2 id="final-heading" className={h2}>Start with one opportunity</h2>
            <p className={cn(lead, "mt-2 max-w-[560px]")}>Create a free account, save what you want to apply for, and join the next Circle session.</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link href="/sign-up" className={btnPrimary} onClick={() => track("cta_click", { cta: "home_final_join" })}>Create a free account <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link href="/about" className={btnSecondary}>About IELSco</Link>
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
      <OpportunityPreview />
      <CircleSessions />
      <Stories />
      <Opportunities />
      <MembershipTeaser />
      <ElcoSection />
      <FinalCta />
      <Footer />
    </div>
  );
}
