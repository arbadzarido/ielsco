import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, FileText, MessagesSquare, Rocket } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Faq } from "@/components/site/Faq";
import { body, btnPrimary, btnSecondary, card, container, eyebrow, h1, h2, h3, lead, pill, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata, SCHOOL_URL } from "@/lib/seo";
import { ELCO_ENABLED, elcoHref } from "@/lib/elco";

export const metadata: Metadata = pageMetadata({
  title: "IELS for Schools: global opportunity sessions and application workshops for students",
  description: "IELSco runs sessions for senior high schools and universities: international scholarships and study-abroad pathways, CV and interview workshops, facilitated speaking sessions and leadership programs. Tell us about your students.",
  path: `${SCHOOL_URL}/`,
});

// Offers are formats IELSco already runs for its own community (info sessions, application clinics, Circle speaking
// sessions, the Global Impact Fellowship), adapted for a school. Prices are quoted per school; nothing is listed here.
const OFFERS = [
  { icon: Compass, title: "Global opportunities session", who: "Senior high school and university students", text: "What scholarships, exchanges and international programs exist, who they're for, and how students in your school can start preparing. Run in your hall or online.", format: "60–90 minutes, one session" },
  { icon: FileText, title: "Application workshop", who: "Final-year students and recent applicants", text: "Hands-on work on a CV, a motivation letter or interview answers, with examples from real applications. Students leave with a draft.", format: "Half-day, or 2–3 shorter sessions" },
  { icon: MessagesSquare, title: "Facilitated speaking sessions", who: "Students who want to speak up with confidence", text: "Small-group discussions in English on topics students care about, in the format we use every week in IELS Circle.", format: "A series of weekly sessions" },
  { icon: Rocket, title: "Leadership and project programs", who: "Motivated students and student leaders", text: "Places for your students in IELS programs such as the Global Impact Fellowship, or a tailored project program run with your school.", format: "Depends on the program" },
];

export default function SchoolPage() {
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="school-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[88px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>IELS for Schools</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Show your students what&apos;s possible beyond graduation</h1>
            <p className={cn(lead, "mt-6 max-w-[580px]")}>
              We run sessions and workshops for senior high schools and universities on international scholarships, study
              abroad and applying with confidence, led by people who have done it. Every program is planned with your school.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#inquiry" className={btnPrimary} data-testid="school-cta">Talk to us about your school <ArrowRight size={18} aria-hidden="true" /></a>
              <a href="#offers" className={btnSecondary}>What we offer</a>
            </div>
          </div>
          <Photo photo="communityInPerson" priority caption="An in-person IELS session." />
        </div>
      </section>

      <section id="offers" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="offers-h">
        <div className={container}>
          <div className="max-w-[680px]">
            <p className={eyebrow}>What we offer</p>
            <h2 id="offers-h" className={cn(h2, "mt-3")}>Four formats, adapted to your students</h2>
            <p className={cn(lead, "mt-4")}>Schools usually start with one session, then build a program around what worked.</p>
          </div>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {OFFERS.map((o) => (
              <li key={o.title} className={cn(card, "flex flex-col p-7")}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><o.icon size={20} aria-hidden="true" /></span>
                <h3 className={cn(h3, "mt-5")}>{o.title}</h3>
                <p className="mt-1 text-[14px] font-semibold text-[#577E90]">For: {o.who}</p>
                <p className={cn(body, "mt-3 flex-1")}>{o.text}</p>
                <p className="mt-5 border-t border-[#E6E9EE] pt-4 text-[14px] text-[#2F4157]/70">Format: {o.format}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="process">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:gap-16")}>
          <div>
            <p className={eyebrow}>How it works</p>
            <h2 id="process" className={cn(h2, "mt-3")}>From first message to first session</h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Send us a short message", "Your school, the students you have in mind and what you'd like them to gain."],
                ["A 30-minute call", "We ask about grade levels, group size, schedule and what's been tried before."],
                ["A written proposal", "Format, dates, who facilitates and the cost, before anything is agreed."],
                ["Run a first session, then review it", "We share attendance and student feedback, and decide together what comes next."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{i + 1}</span>
                  <div><p className="text-[17px] font-bold text-[#1A2534]">{t}</p><p className={cn(body, "mt-1")}>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-6">
            <Photo photo="discussion" ratio="wide" position="40% center" />
            <div className={cn(card, "p-7")}>
              <h3 className={h3}>What we don&apos;t do</h3>
              <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-[#2F4157]/80">
                <li>We don&apos;t replace your English curriculum or grade students.</li>
                <li>We don&apos;t promise admissions or scholarships: we help students understand the options and prepare.</li>
                <li>We don&apos;t collect students&apos; personal data beyond what a session needs, and never share it.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="faq">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16")}>
          <div>
            <h2 id="faq" className={h2}>Questions schools ask</h2>
            <div className="mt-8 space-y-4 text-[15px]">
              {ELCO_ENABLED && (
                <p className={body}>Looking for daily English practice for students? That&apos;s <a className={textLink} href={elcoHref("school")} target="_blank" rel="noopener noreferrer">Elco AI <ArrowUpRight size={15} aria-hidden="true" /></a>, our separate English-learning app.</p>
              )}
              <p className={body}>Already a partner school? <Link className={textLink} href="/school/sign-in">Sign in to the school portal <ArrowRight size={15} aria-hidden="true" /></Link></p>
            </div>
          </div>
          <Faq items={[
            { q: "How much does it cost?", a: "It depends on the format, the number of students and whether sessions are online or in person. We quote in writing after the first call, before anything is agreed." },
            { q: "Can you come to our school in person?", a: "Online sessions work anywhere. For in-person sessions, tell us your city and we'll say honestly whether we can come." },
            { q: "Which language are sessions in?", a: "English, with Bahasa Indonesia where it helps students follow. We agree this with you in advance." },
            { q: "Who runs the sessions?", a: "IELSco's team and facilitators, named in the proposal. For specialist topics we may invite a guest speaker, also named in advance." },
          ]} />
        </div>
      </section>

      <section id="inquiry" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="inquiry-h">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16")}>
          <div>
            <span className={pill}>Reply within 3 working days</span>
            <h2 id="inquiry-h" className={cn(h2, "mt-4")}>Tell us about your students</h2>
            <p className={cn(lead, "mt-4")}>A few lines are enough. We&apos;ll reply by email to set up a short call.</p>
          </div>
          <div className={cn(card, "p-7 sm:p-8")}>
            <InquiryForm
              kind="school"
              fields={["organization", "role", "phone", "topic", "message"]}
              required={["organization"]}
              labels={{ organization: "School or university", role: "Your role (e.g. teacher, counselor, principal)" }}
              topics={[
                { value: "opportunities_session", label: "Global opportunities session" },
                { value: "application_workshop", label: "Application workshop" },
                { value: "speaking_sessions", label: "Facilitated speaking sessions" },
                { value: "leadership_program", label: "Leadership and project programs" },
                { value: "not_sure", label: "Not sure yet" },
              ]}
              submitLabel="Send"
              successTitle="Thanks, we've got it"
              successText="We'll email you within 3 working days to arrange a short call."
            />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
