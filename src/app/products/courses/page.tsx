import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import Footer from "@/components/footer";
import { Faq } from "@/components/site/Faq";
import { body, btnPrimary, btnSecondary, card, container, eyebrow, focusRing, h1, h2, h3, lead, pill, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { idr } from "@/lib/format";
import { COURSE_PACKAGES, MENTORS, TRACK_META, type CourseTrack } from "@/data/courses";
import { elcoHref } from "@/lib/elco";
import { TutoringPanel } from "@/components/tutoring/TutoringPanel";
import { TUTOR_PRICE_IDR, TUTOR_PRICE_LABEL, tutorRequestUrl } from "@/components/tutoring/links";

export const metadata: Metadata = pageMetadata({
  title: "Private English tutor: one-to-one sessions at Rp90,000 | IELSco",
  description: "Learn and practise English with Elco AI, then add a private English tutor from IELSco when you want a person: scholarship essays, work-abroad English, IELTS/TOEFL/TOEIC, speaking and grammar. Rp90,000 per session, requested per session.",
  path: "/products/courses",
});

// Elco AI is the primary place to learn English. IELSco adds private human tutoring, requested per session through the
// official WhatsApp channel (no course subscription, no enrolment flow). The focus areas come from src/data/courses.ts.
const GROUPS: { title: string; text: string; tracks: CourseTrack[] }[] = [
  { title: "Applications and careers", text: "Tutoring focus areas for people preparing a specific application or a move abroad.", tracks: ["scholarship-essay", "work-abroad", "writing"] },
  { title: "Tests and core skills, with a tutor", text: "Tutoring focus areas for a test score or a skill you want to build with feedback from a person. For self-paced test practice, use Elco AI.", tracks: ["standardized-test", "speaking", "grammar"] },
];

const AUDIENCE: Record<CourseTrack, string> = {
  "scholarship-essay": "Applicants to LPDP, Chevening, DAAD and similar scholarships",
  "work-abroad": "Professionals aiming for international or remote roles",
  writing: "Students and applicants who need clear academic and professional writing",
  "standardized-test": "Anyone who needs an IELTS, TOEFL or TOEIC score",
  speaking: "People who want to speak with confidence in interviews and at work",
  grammar: "Learners who want accurate English for writing and tests",
};

function Track({ track }: { track: CourseTrack }) {
  const meta = TRACK_META[track];
  const pkgs = COURSE_PACKAGES.filter((p) => p.trackId === track).sort((a, b) => a.sessions - b.sessions);
  const mentor = MENTORS.find((m) => m.id === meta.mentorId) ?? null;
  const first = pkgs[0];
  return (
    <li className={cn(card, "flex flex-col p-7")} data-testid={`course-${track}`}>
      <p className="text-[14px] font-semibold text-[#577E90]">Level {first?.level}</p>
      <h3 className={cn(h3, "mt-2 text-[22px]")}>{meta.label}</h3>
      <p className="mt-1 text-[15px] text-[#2F4157]/70">For: {AUDIENCE[track]}</p>
      <ul className="mt-5 space-y-2">
        {first?.outcomes.filter((o) => !/certificate/i.test(o)).slice(0, 3).map((o) => (
          <li key={o} className="flex gap-2.5 text-[15px] leading-snug text-[#2F4157]/85"><Check size={17} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{o}</li>
        ))}
      </ul>
      <p className="mt-6 rounded-[14px] border border-[#E6E9EE] p-4 text-[15px] font-semibold text-[#1A2534]">{TUTOR_PRICE_LABEL}<span className="mt-0.5 block text-[13px] font-normal text-[#2F4157]/65">Requested per session. No package to buy.</span></p>
      <div className="mt-6 flex items-center gap-3 border-t border-[#E6E9EE] pt-5">
        {mentor ? (
          <>
            <Image src={mentor.image} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover grayscale" />
            <div className="min-w-0"><p className="text-[15px] font-semibold text-[#1A2534]">{mentor.name}</p><p className="truncate text-[13px] text-[#2F4157]/65">{mentor.tagline}</p></div>
          </>
        ) : (
          <p className="text-[14px] text-[#2F4157]/65">Tutor confirmed when you request a session.</p>
        )}
      </div>
      {first && (
        <details className="group mt-5">
          <summary className={cn("cursor-pointer list-none rounded text-[15px] font-semibold text-[#2F4157] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden", focusRing)}>
            See a sample session outline
          </summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px] leading-snug text-[#2F4157]/80">
            {first.curriculum.map((s) => <li key={s.session}>{s.title}</li>)}
          </ol>
        </details>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={tutorRequestUrl(meta.label)} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, "min-h-[42px] px-5 text-[15px]")}>Request a private tutor <ArrowUpRight size={16} aria-hidden="true" /></a>
        <a href={elcoHref(`tutoring-${track}`)} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "min-h-[42px] px-5 text-[15px]")}>Access Elco AI <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </li>
  );
}

export default function CoursesPage() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="courses-page">
      <section className="bg-white pb-[48px] pt-[40px] md:pt-[64px]" aria-labelledby="hero">
        <div className={container}>
          <p className={eyebrow}>Private tutoring</p>
          <h1 id="hero" className={cn(h1, "mt-4 max-w-[880px]")}>Learn with Elco AI. Add a private English tutor when you want a person.</h1>
          <p className={cn(lead, "mt-6 max-w-[720px]")}>
            Elco AI is where you learn and practise English every day, including test preparation. IELSco adds one-to-one
            tutoring with a real person at {TUTOR_PRICE_LABEL}. You request a session when you need one, with no course
            subscription and nothing to enrol in.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={tutorRequestUrl()} target="_blank" rel="noopener noreferrer" className={btnPrimary}>Request a private tutor <ArrowUpRight size={18} aria-hidden="true" /></a>
            <a href={elcoHref("tutoring")} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Access Elco AI <ArrowUpRight size={18} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="bg-white pb-[48px]" aria-labelledby="which">
        <div className={container}>
          <h2 id="which" className="sr-only">AI learning and human tutoring</h2>
          <TutoringPanel refId="tutoring-panel" />
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            <Link href="/membership" className={textLink}>Elco plans and IELSco member benefits <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/circle" className={textLink}>IELS Circle speaking community <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/events" className={textLink}>Events <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <div id="catalog">
        {GROUPS.map((g) => (
          <section key={g.title} className={cn(section, "border-t border-[#E6E9EE]")} aria-label={g.title}>
            <div className={container}>
              <h2 className={h2}>{g.title}</h2>
              <p className={cn(lead, "mt-3")}>{g.text}</p>
              <ul className="mt-10 grid gap-6 lg:grid-cols-3">{g.tracks.map((t) => <Track key={t} track={t} />)}</ul>
            </div>
          </section>
        ))}
      </div>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="how">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:gap-16")}>
          <div>
            <span className={pill}>{TUTOR_PRICE_LABEL}</span>
            <h2 id="how" className={cn(h2, "mt-4")}>How to request a private tutor</h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Message us on WhatsApp", "Tap Request a private tutor. The message is prefilled; add your goal, level and the times that suit you."],
                ["We confirm tutor, time and payment", "The IELSco team replies with a tutor, a time and the payment details (bank transfer)."],
                ["Meet your tutor", "Have your session online. Need more? Request the next one. Need to move a session? Tell us in advance."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{i + 1}</span>
                  <div><p className="text-[17px] font-bold text-[#1A2534]">{t}</p><p className={cn(body, "mt-1")}>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <Faq className="self-start" items={[
            { q: "Is a private tutor the same as Elco AI?", a: "No. Elco AI is the primary place to learn and practise English, including test preparation. A private tutor is a person who works with you one to one. Many learners use both." },
            { q: "How much does a session cost?", a: `${idr(TUTOR_PRICE_IDR)} per session, requested one session at a time. There is no package or subscription.` },
            { q: "Which tests can I prepare for in Elco AI?", a: "TOEFL ITP, IELTS and TOEIC are live in Elco AI, with Learn, Practice, Tryout (mock test) and Progress. SAT English is coming soon." },
            { q: "Can I reschedule a session?", a: "Yes, with notice. We will find another time." },
            { q: "Do you guarantee a score or a scholarship?", a: "No. We teach, practise and give feedback; results depend on you and on the test or program." },
          ]} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
