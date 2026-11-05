"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarClock, Compass, FileText, Globe2, GraduationCap, Mic, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Footer from "@/components/footer";
import { body, btnPrimary, btnSecondary, card, cardLink, container, eyebrow, h1, h2, h3, lead, pill, section, textLink, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";
import { eventsData } from "@/data/events";
import { formatSessionWib, upcomingSessions } from "@/lib/circle/sessions";
import { generateSlug } from "@/utils/slug";
import { wibDeadline } from "@/lib/events/deadline";
import { ELCO_MASCOT, elcoHref } from "@/lib/elco";
import ElcoCharacter from "@/components/brand/ElcoCharacter";
import { CircleCIcon } from "@/components/brand/CircleCIcon";
import StoryAuthorLine from "@/components/stories/StoryAuthorLine";
import { TUTOR_PRICE_LABEL, tutorRequestUrl } from "@/components/tutoring/links";
import { ELCO_PLANS } from "@/data/membership";
import { Photo } from "@/components/site/Photo";
import { LandingOpportunities } from "@/components/opportunities/LandingOpportunities";
import { track } from "@/lib/analytics";

// Public landing page. Positioning: IELSco is an English community connecting people, English learning and global
// opportunities across Southeast Asia; Elco AI is its integrated learning technology. The Elco robot is the shared
// IELSco/Elco mascot (animated: idle, blink, wave; still under prefers-reduced-motion).
// Membership comes only from Elco AI subscriptions (Starter / Pro); IELSco has no separate paid membership.
// Everything time-based (sessions, registration status) is computed in the browser after mount, so the page never
// shows a stale "open" state and server/client renders match.


const GIF_EARLY_BIRD_END = "2026-11-09T23:59:00+07:00";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  return now;
}

// Hero: the community photo is the full-bleed background. Two CSS gradients sit over it: a soft white centre veil
// that keeps the headline readable while the people at the edges stay visible, and a vertical white gradient that
// fades the photo into the white page at the bottom (and lightly under the header), so the next section continues
// seamlessly. No new image; same asset as before.
function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-white" aria-labelledby="hero-heading" data-testid="landing-hero">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <Image src="/images/site/community-in-person.webp" alt="" fill priority sizes="100vw" className="object-cover object-[50%_35%]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_62%_58%_at_50%_46%,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.78)_42%,rgba(255,255,255,0.32)_72%,rgba(255,255,255,0.12)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0.15)_18%,rgba(255,255,255,0.1)_48%,rgba(255,255,255,0.6)_74%,#ffffff_100%)]" />
      </div>
      <div className={cn(container, "flex flex-col items-center pb-[64px] pt-[64px] text-center sm:pt-[80px] md:pb-[96px] md:pt-[104px]")}>
        <p className={eyebrow}>IELSco · Southeast Asia English community</p>
        <h1 id="hero-heading" className={cn(h1, "mt-4 max-w-[1120px] text-[34px] leading-[1.06] sm:text-[50px] lg:text-[60px]")}>
          Empowering Southeast Asia through English and <span className="text-[#E56668]">connection</span>.
        </h1>
        <p className={cn(lead, "mt-5 max-w-[620px] text-[#1A2534]/80")}>
          Practise speaking every week in IELS Circle, learn with Elco AI, and find scholarships, study abroad and career
          opportunities with people across Southeast Asia.
        </p>
        <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Link href="/sign-up" className={btnPrimary} data-testid="landing-join" onClick={() => track("cta_click", { cta: "home_hero_join" })}>
            Create a free account <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/circle" className={cn(btnSecondary, "bg-white/90")} data-testid="landing-circle">
            Join IELS Circle
          </Link>
        </div>
        <p className="mt-4 text-[14px] font-medium text-[#2F4157]/75">Free account · Membership comes with an Elco AI plan</p>
        <div className="mt-10 flex items-end gap-2 rounded-[18px] border border-[#E6E9EE] bg-white/95 py-2 pl-2 pr-4 text-left shadow-[0_12px_32px_rgba(26,37,52,0.08)] backdrop-blur-sm sm:w-[360px] xl:absolute xl:bottom-10 xl:right-10 xl:mt-0" data-testid="landing-mascot">
          <ElcoCharacter height={92} className="-mt-8" />
          <p className="pb-2 text-[14px] leading-snug text-[#2F4157]">
            <span className="font-bold text-[#1A2534]">Hi, I&apos;m Elco!</span> IELS Circle open sessions run every Wednesday and Saturday.
          </p>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { icon: Compass, n: "01", title: "Find", text: "A checked list of scholarships, fellowships and programs, plus jobs abroad shared with official recruitment partners.", href: "/opportunities", cta: "Browse opportunities" },
  { icon: FileText, n: "02", title: "Prepare", text: "Free guides for CVs, essays and interviews, English learning and test preparation with Elco AI, and a private tutor when you want a person.", href: "/products/resources", cta: "Free resources" },
  { icon: Users, n: "03", title: "Go together", text: "Practise English speaking every week in IELS Circle, meet members with the same goal, and read how members did it.", href: "/circle", cta: "Meet the Circle" },
];

const FEATURES: { icon: LucideIcon; title: string; text: string; href: string; cta: string }[] = [
  { icon: Users, title: "People & community", text: "An English speaking community of learners across Southeast Asia. Find members with the same goals and languages, and connect through intros.", href: "/sign-up", cta: "Join the community" },
  { icon: CircleCIcon, title: "IELS Circle", text: "Our English speaking club: open online speaking sessions every week, plus cohorts with a set agenda.", href: "/circle", cta: "Explore IELS Circle" },
  { icon: Globe2, title: "Global opportunities", text: "Scholarships, study abroad programs, fellowships, exchanges and career opportunities, checked against official pages.", href: "/opportunities", cta: "Browse opportunities" },
  { icon: GraduationCap, title: "Programs & events", text: "IELSco programs and official events, including the Global Impact Fellowship and IELS for Schools.", href: "/products", cta: "See programs" },
  { icon: Mic, title: "IELSco Talks", text: "Real stories and global perspectives: speakers, alumni and partners on studying, working and growing across borders.", href: "/events", cta: "See events" },
  { icon: Sparkles, title: "Elco AI", text: "IELSco's integrated English learning technology: courses, speaking and writing practice, and test preparation.", href: elcoHref("landing-features"), cta: "Access Elco AI" },
];

function Highlights() {
  return (
    <section className={section} aria-labelledby="features-heading" data-testid="landing-features">
      <div className={container}>
        <div className="max-w-[680px]">
          <p className={eyebrow}>What IELSco brings together</p>
          <h2 id="features-heading" className={cn(h2, "mt-3")}>One English learning community, from practice to opportunity</h2>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const external = f.href.startsWith("http");
            const inner = (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><f.icon size={20} aria-hidden="true" /></span>
                <h3 className={cn(h3, "mt-5")}>{f.title}</h3>
                <p className={cn(body, "mt-2 flex-1")}>{f.text}</p>
                <span className="mt-5 flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">{f.cta} {external ? <ArrowUpRight size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}</span>
              </>
            );
            return (
              <li key={f.title}>
                {external
                  ? <a href={f.href} target="_blank" rel="noopener noreferrer" className={cn(cardLink, "flex h-full flex-col p-7")}>{inner}</a>
                  : <Link href={f.href} className={cn(cardLink, "flex h-full flex-col p-7")}>{inner}</Link>}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="how-heading" id="how-it-works">
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
          <p className={eyebrow}>IELS Circle · English speaking club</p>
          <h2 id="circle-heading" className={cn(h2, "mt-3")}>A weekly place to practise English speaking</h2>
          <p className={cn(lead, "mt-4")}>
            IELS Circle is IELSco&apos;s ongoing English speaking community. Open sessions are online and open to members; each
            one has a topic, from scholarship essays to small talk, so you always have something to say.
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
            <Link href="/circle/agenda" className={btnSecondary}>Current cohort agenda</Link>
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
                  {s.bannerImage && <Image src={s.bannerImage} alt={`Banner for ${s.author.name}'s story`} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover" />}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  {/* Verified author identity above the title (photo or initials, name, role from the story record). */}
                  <div data-testid="story-author"><StoryAuthorLine name={s.author.name} avatar={s.author.avatar} role={s.author.role || s.author.country} size="sm" /></div>
                  <h3 className="mt-4 text-[18px] font-bold leading-snug text-[#1A2534]">{s.title}</h3>
                  {s.summary && <p className={cn(body, "mt-2 line-clamp-3 text-[15px]")}>{s.summary}</p>}
                  <span className="mt-auto flex items-center gap-1.5 pt-5 text-[15px] font-semibold text-[#2F4157]">Read the story <ArrowRight size={15} aria-hidden="true" /></span>
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
  // GIF Summer 2027 (guidebook): Early Bird open until 9 Nov 2026 23:59 WIB; general registration coming soon.
  const earlyBirdOpen = now ? now.getTime() < Date.parse(GIF_EARLY_BIRD_END) : null;
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
          <h2 id="opps-heading" className={cn(h2, "mt-3")}>IELSco programs and events</h2>
          <p className={cn(lead, "mt-4")}>Programs open and close through the year. Dates and status below come from the event pages themselves.</p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Link href="/events/gif" className={cn(cardLink, "grid overflow-hidden sm:grid-cols-[1fr_200px]")} data-testid="landing-gif">
            <div className="flex flex-col p-7">
              <div className="flex items-center gap-3">
                <Image src="/images/logos/events/gif.png" alt="" width={110} height={40} className="h-[40px] w-auto" />
                <p className="text-[14px] font-semibold text-[#914D4D]">Global Impact Fellowship</p>
              </div>
              <h3 className={cn(h3, "mt-5")}>GIF Summer 2027: Singapore, Malaysia and Thailand</h3>
              <p className={cn(body, "mt-2")}>An international youth incubation program with university sessions in three countries, six months of mentoring and a Final Pitch.</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {earlyBirdOpen === true && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Early Bird open until {fmt(new Date(GIF_EARLY_BIRD_END))}</span>}
                {earlyBirdOpen === false && <span className={pill}>Early Bird closed</span>}
                <span className={pill}>General registration: coming soon</span>
                <span className="mt-4 flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">About the fellowship <ArrowRight size={16} aria-hidden="true" /></span>
              </div>
            </div>
            <div className="relative hidden min-h-[240px] sm:block">
              <Image src="/images/gif-2027/wsu_group.webp" alt="" fill sizes="200px" className="object-cover" />
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

// Learning: Elco AI is the primary place to learn English (courses, practice, test prep); IELSco adds private human
// tutoring, requested per session. No enrolment or subscription flow here.
function Learning() {
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="learning-heading" data-testid="landing-learning">
      <div className={cn(container, "grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-14")}>
        <Image src={ELCO_MASCOT} alt="" width={160} height={157} className="mx-auto h-[140px] w-auto lg:h-[160px]" />
        <div>
          <p className={eyebrow}>English learning · Elco AI</p>
          <h2 id="learning-heading" className={cn(h2, "mt-3")}>Learn English with Elco AI. Add a private tutor when you want a person.</h2>
          <p className={cn(lead, "mt-4 max-w-[680px]")}>
            Elco AI is IELSco&apos;s integrated English learning platform: lessons, speaking and writing practice, English games and
            TOEFL ITP, IELTS and TOEIC preparation (SAT English is coming soon). When you want one-to-one help, IELSco adds a private human tutor for{" "}
            {TUTOR_PRICE_LABEL}, requested one session at a time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={elcoHref("landing")} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="landing-elco-cta">
              Access Elco AI <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            <a href={tutorRequestUrl()} target="_blank" rel="noopener noreferrer" className={btnSecondary} data-testid="landing-tutor-cta">
              Request a private tutor <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-[14px] text-[#2F4157]/60">
            Elco AI is developed and operated by PT Elco Edukasi Berkah Indonesia, IELSco&apos;s learning technology partner.{" "}
            <Link href="/products/courses" className="underline underline-offset-4">About private tutoring</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// Membership: there is no separate IELSco membership. Elco AI Starter / Pro subscriptions carry the IELSco benefits
// (synced to IELSco once the accounts are linked). Plan names and benefits come from data/membership.ts.
function MembershipTeaser() {
  return (
    <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="membership-heading" data-testid="landing-membership">
      <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16")}>
        <div>
          <p className={eyebrow}>Free account &amp; membership</p>
          <h2 id="membership-heading" className={cn(h2, "mt-3")}>Free to join. Membership comes with Elco AI.</h2>
          <p className={cn(lead, "mt-4")}>
            A free IELSco account covers the community, IELS Circle open sessions, the opportunity board and free resources.
            There is no separate IELSco payment: an Elco AI Starter or Pro plan adds the IELS Circle Speaking Club and, on Pro,
            mentoring.
          </p>
          <ul className="mt-6 space-y-3">
            {ELCO_PLANS.map((p) => (
              <li key={p.id} className={cn(card, "p-4")}>
                <p className="text-[16px] font-bold text-[#1A2534]">{p.name}</p>
                <p className="mt-1 text-[15px] text-[#2F4157]/75">{[p.elco, ...p.ielsco].join(" · ")}</p>
              </li>
            ))}
          </ul>
          <Link href="/membership" className={cn(btnPrimary, "mt-8")} onClick={() => track("cta_click", { cta: "home_membership" })}>How membership works <ArrowRight size={18} aria-hidden="true" /></Link>
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
            <h2 id="final-heading" className={h2}>Join the English community</h2>
            <p className={cn(lead, "mt-2 max-w-[560px]")}>Create a free account, join the next IELS Circle session, and save the opportunities you want to go after.</p>
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
      <Highlights />
      <CircleSessions />
      <LandingOpportunities />
      <HowItWorks />
      <Learning />
      <Stories />
      <Opportunities />
      <MembershipTeaser />
      <FinalCta />
      <Footer />
    </div>
  );
}
