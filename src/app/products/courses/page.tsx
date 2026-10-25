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
import { COURSE_PACKAGES, GOOGLE_FORM_URL, MENTORS, TRACK_META, WHATSAPP_URL, type CourseTrack } from "@/data/courses";
import { ELCO_ENABLED, elcoHref } from "@/lib/elco";

export const metadata: Metadata = pageMetadata({
  title: "IELS Courses: mentor-led scholarship essay, career and test-prep courses",
  description: "Small mentor-led courses for applications and careers abroad: scholarship essays, work-abroad communication, academic writing, IELTS/TOEFL/TOEIC, speaking and grammar. 8 or 21 sessions at Rp90,000 per session.",
  path: "/products/courses",
});

// The catalog renders from src/data/courses.ts (tracks, packages, mentors, prices, registration link): change a course
// there, not here. Registration is still manual (Google Form, then the team confirms schedule and payment).
const GROUPS: { title: string; text: string; tracks: CourseTrack[] }[] = [
  { title: "Applications and careers", text: "For people preparing a specific application or a move abroad.", tracks: ["scholarship-essay", "work-abroad", "writing"] },
  { title: "Tests and core skills, with a mentor", text: "For a test score or a skill you want to build with feedback from a person.", tracks: ["standardized-test", "speaking", "grammar"] },
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
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {pkgs.map((p) => (
          <div key={p.id} className="rounded-[14px] border border-[#E6E9EE] p-4">
            <p className="text-[14px] font-semibold text-[#1A2534]">{p.type === "intensive" ? "Intensive" : "Extensive"} · {p.sessions} sessions</p>
            <p className="mt-1 text-[20px] font-extrabold text-[#1A2534]">{idr(p.totalPrice)}</p>
            <p className="text-[13px] text-[#2F4157]/60">{idr(p.pricePerSession)} per session</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3 border-t border-[#E6E9EE] pt-5">
        {mentor ? (
          <>
            <Image src={mentor.image} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover grayscale" />
            <div className="min-w-0"><p className="text-[15px] font-semibold text-[#1A2534]">{mentor.name}</p><p className="truncate text-[13px] text-[#2F4157]/65">{mentor.tagline}</p></div>
          </>
        ) : (
          <p className="text-[14px] text-[#2F4157]/65">Mentor to be confirmed when you register.</p>
        )}
      </div>
      {first && (
        <details className="group mt-5">
          <summary className={cn("cursor-pointer list-none rounded text-[15px] font-semibold text-[#2F4157] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden", focusRing)}>
            See the {first.sessions}-session outline
          </summary>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px] leading-snug text-[#2F4157]/80">
            {first.curriculum.map((s) => <li key={s.session}>{s.title}</li>)}
          </ol>
        </details>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={GOOGLE_FORM_URL} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, "min-h-[42px] px-5 text-[15px]")}>Register <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </li>
  );
}

export default function CoursesPage() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="courses-page">
      <section className="bg-white pb-[48px] pt-[40px] md:pt-[64px]" aria-labelledby="hero">
        <div className={container}>
          <p className={eyebrow}>IELS Courses</p>
          <h1 id="hero" className={cn(h1, "mt-4 max-w-[880px]")}>Mentor-led courses for the application or career you&apos;re working on</h1>
          <p className={cn(lead, "mt-6 max-w-[720px]")}>
            Six courses taught by IELS mentors, each in an 8-session intensive or a 21-session extensive version. You register,
            we confirm your schedule and payment, and you work with your mentor session by session.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#catalog" className={btnPrimary}>See the courses</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Ask us on WhatsApp</a>
          </div>
        </div>
      </section>

      <section className="bg-white pb-[48px]" aria-labelledby="which">
        <div className={container}>
          <div className={cn(card, "overflow-hidden")}>
            <h2 id="which" className="border-b border-[#E6E9EE] px-6 py-5 text-[18px] font-bold text-[#1A2534]">Course, membership, event or Elco: which do you need?</h2>
            <dl className="grid divide-y divide-[#E6E9EE] md:grid-cols-4 md:divide-x md:divide-y-0">
              {[
                ["IELS Courses", "A structured set of sessions with a mentor, for one goal. Paid per course."],
                ["Membership", "Ongoing support while you apply: clinics, feedback, a buddy. Separate from courses."],
                ["Events & workshops", "One-off sessions, often free, sometimes with partners. See Events."],
                ["Elco AI", "Self-paced English practice with AI, any time. A separate app with its own plans."],
              ].map(([t, d]) => (
                <div key={t} className="p-6"><dt className="text-[16px] font-bold text-[#1A2534]">{t}</dt><dd className="mt-1.5 text-[15px] leading-relaxed text-[#2F4157]/75">{d}</dd></div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[#E6E9EE] px-6 py-4 text-[15px]">
              <Link href="/membership" className={textLink}>Membership <ArrowRight size={15} aria-hidden="true" /></Link>
              <Link href="/events" className={textLink}>Events <ArrowRight size={15} aria-hidden="true" /></Link>
              {ELCO_ENABLED && <a href={elcoHref("courses")} target="_blank" rel="noopener noreferrer" className={textLink}>Elco AI <ArrowUpRight size={15} aria-hidden="true" /></a>}
            </div>
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
            <span className={pill}>Open for registration any time</span>
            <h2 id="how" className={cn(h2, "mt-4")}>How registration works</h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Fill in the registration form", "Choose the course and version, and tell us about your goal and level."],
                ["We confirm by WhatsApp or email", "Your mentor, the schedule and the payment details (bank transfer)."],
                ["Start your sessions", "Sessions are scheduled with your mentor. You can reschedule with notice."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{i + 1}</span>
                  <div><p className="text-[17px] font-bold text-[#1A2534]">{t}</p><p className={cn(body, "mt-1")}>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <Faq className="self-start" items={[
            { q: "Are courses part of membership?", a: "No. Courses are paid per course. Membership is ongoing support while you apply, and is separate." },
            { q: "Is the price per person?", a: `Yes: ${idr(90000)} per session, so ${idr(720000)} for 8 sessions and ${idr(1890000)} for 21.` },
            { q: "Can I reschedule a session?", a: "Yes, with notice to your mentor. We'll find another time." },
            { q: "Do you guarantee a score or a scholarship?", a: "No. We teach, practise and give feedback; results depend on you and on the test or program." },
          ]} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
