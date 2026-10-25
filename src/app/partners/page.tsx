import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, GraduationCap, Megaphone, School, Users } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { InquiryForm } from "@/components/site/InquiryForm";
import { body, btnPrimary, btnSecondary, card, cardLink, container, eyebrow, h1, h2, h3, lead, pill, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { eventsData } from "@/data/events";
import { generateSlug } from "@/utils/slug";

export const metadata: Metadata = pageMetadata({
  title: "Partner with IELSco: run programs with young people preparing to study and work abroad",
  description: "Universities, organizations and youth communities work with IELSco on info sessions, workshops, application clinics and sponsored seats for young people in Southeast Asia. Tell us what you have in mind.",
  path: "/partners",
});

// Partners shown here are only organizations named on IELSco's own published event pages (src/data/events.ts) or event
// posters. No logos are used: we don't have written permission on file to display them.
const PAST = [
  { org: "Western Sydney University Indonesia", what: "Global Pathways through English and Education, an info session on studying in Australia", eventId: "Hello Sydney!" },
  { org: "Skilio", what: "Step Up!, a career bootcamp series for young professionals", eventId: "Step Up! IELS x Skilio" },
  { org: "LuarSekolah", what: "Beyond Borders: Youth Skills That Conquer the World", eventId: "Beyond Borders" },
  { org: "EStudyMe", what: "A free TOEIC try-out for the IELS community", eventId: "Free TOEIC Try Out" },
  { org: "AIESEC", what: "Insight Talks for the Global Impact Fellowship", eventId: null },
];

const AUDIENCES = [
  { icon: GraduationCap, title: "Universities and study-abroad offices", text: "Info sessions and Q&As for students considering your programs, run with our community and promoted to people who have said that's their goal." },
  { icon: Building2, title: "Companies and career platforms", text: "Career talks, CV and interview workshops, and sponsored seats in IELS programs for young people starting international careers." },
  { icon: Users, title: "Youth organizations and communities", text: "Co-hosted talks and joint programs, like our Insight Talks, where both communities bring people and speakers." },
  { icon: Megaphone, title: "Scholarship and fellowship programs", text: "A checked listing on the IELS opportunity board (free for legitimate programs) and an info session for applicants." },
];

const FORMATS = [
  ["Co-hosted info session", "60–90 minutes online. You present, we host, moderate Q&A and invite the right members."],
  ["Workshop or application clinic", "Practical sessions on CVs, essays or interviews, delivered by your team, ours, or both."],
  ["Sponsored seats", "You fund places in an IELS program, such as the Global Impact Fellowship, for selected participants."],
  ["Program listing", "Your opportunity on our board with its official link. We check it before it goes live."],
];

export default function PartnersPage() {
  const eventHref = (needle: string | null) => {
    const e = needle ? eventsData.find((x) => x.title.includes(needle)) : null;
    return e ? `/events/${generateSlug(e.title)}` : null;
  };
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="partners-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[88px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Partner with IELSco</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Reach young people who are actively preparing to go abroad</h1>
            <p className={cn(lead, "mt-6 max-w-[580px]")}>
              IELSco&apos;s community is made of students and young professionals in Southeast Asia working toward
              scholarships, study abroad and international careers. We run programs with organizations that can help them get
              there, and we&apos;re clear about what each side brings.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#inquiry" className={btnPrimary} data-testid="partners-cta">Start a conversation <ArrowRight size={18} aria-hidden="true" /></a>
              <a href="#past" className={btnSecondary}>What we&apos;ve done together</a>
            </div>
          </div>
          <Photo photo="teamCampusVisit" priority caption="IELS team members at a university visit." />
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="who">
        <div className={container}>
          <div className="max-w-[640px]">
            <p className={eyebrow}>Who we work with</p>
            <h2 id="who" className={cn(h2, "mt-3")}>What a partnership can look like</h2>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {AUDIENCES.map((a) => (
              <li key={a.title} className={cn(card, "p-7")}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><a.icon size={20} aria-hidden="true" /></span>
                <h3 className={cn(h3, "mt-5")}>{a.title}</h3>
                <p className={cn(body, "mt-2")}>{a.text}</p>
              </li>
            ))}
            <li className="sm:col-span-2">
              <Link href="/school" className={cn(cardLink, "flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between")}>
                <span className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><School size={20} aria-hidden="true" /></span>
                  <span><span className="block text-[18px] font-bold text-[#1A2534]">Schools</span><span className="text-[15px] text-[#2F4157]/75">Schools have their own page and process.</span></span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157]">IELS for Schools <ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="formats">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:gap-16")}>
          <div>
            <p className={eyebrow}>Formats</p>
            <h2 id="formats" className={cn(h2, "mt-3")}>Start small, then grow what works</h2>
            <p className={cn(lead, "mt-4")}>Most partnerships start with one session. After it, we share attendance and feedback, and decide together whether to do more.</p>
            <dl className="mt-8 space-y-5">
              {FORMATS.map(([t, d]) => (
                <div key={t} className="border-l-2 border-[#E56668] pl-5"><dt className="text-[17px] font-bold text-[#1A2534]">{t}</dt><dd className={cn(body, "mt-1")}>{d}</dd></div>
              ))}
            </dl>
          </div>
          <div className={cn(card, "self-start p-7")}>
            <h3 className={h3}>Our ground rules</h3>
            <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-[#2F4157]/80">
              <li>We only promote opportunities we&apos;ve checked, and we label sponsored content as sponsored.</li>
              <li>We never sell or hand over members&apos; personal data. Members who want to hear from you sign up themselves.</li>
              <li>We don&apos;t promise outcomes we don&apos;t control, such as admissions or hires, to you or to our members.</li>
              <li>Every partnership has a named contact on both sides and a short written agreement before anything is announced.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="past" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="past-h">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Track record</p>
            <h2 id="past-h" className={cn(h2, "mt-3")}>Organizations we&apos;ve run programs with</h2>
            <p className={cn(lead, "mt-4")}>Listed from our own published event pages. Ask us for attendance figures for any of them.</p>
            <Photo photo="speaker" ratio="landscape" className="mt-8" />
          </div>
          <ul className="space-y-4">
            {PAST.map((p) => {
              const href = eventHref(p.eventId);
              return (
                <li key={p.org} className={cn(card, "p-6")}>
                  <p className="text-[18px] font-bold text-[#1A2534]">{p.org}</p>
                  <p className={cn(body, "mt-1 text-[15px]")}>{p.what}</p>
                  {href && <Link href={href} className={cn(textLink, "mt-3 text-[15px]")}>Event page <ArrowRight size={15} aria-hidden="true" /></Link>}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id="inquiry" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="inquiry-h">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16")}>
          <div>
            <span className={pill}>Reply within 3 working days</span>
            <h2 id="inquiry-h" className={cn(h2, "mt-4")}>Tell us what you have in mind</h2>
            <p className={cn(lead, "mt-4")}>A few lines are enough. We&apos;ll reply with questions, a suggested format and our partnership deck.</p>
            <p className={cn(body, "mt-6")}>Prefer email? <a className="font-semibold underline" href="mailto:partnership@ielsco.com">partnership@ielsco.com</a></p>
          </div>
          <div className={cn(card, "p-7 sm:p-8")}>
            <InquiryForm
              kind="partner"
              fields={["organization", "role", "topic", "message"]}
              required={["organization", "message"]}
              topics={[
                { value: "university", label: "University / study abroad" },
                { value: "company", label: "Company / career platform" },
                { value: "community", label: "Youth organization / community" },
                { value: "program", label: "Scholarship or fellowship program" },
                { value: "media", label: "Media" },
                { value: "other", label: "Something else" },
              ]}
              labels={{ message: "What would you like to do together?" }}
              submitLabel="Send"
              successTitle="Thanks, we've got it"
              successText="Someone from the partnerships team will reply by email within 3 working days."
            />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
