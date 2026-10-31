import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Banknote, Briefcase, CalendarDays, Clock, Globe2, Instagram, Languages, Laptop, Mail, Plane, Users } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Faq } from "@/components/site/Faq";
import { ApplicationForm } from "@/components/careers/ApplicationForm";
import { body, btnPrimary, btnSecondary, card, cardLink, container, eyebrow, h1, h2, h3, lead, pill, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { divisions } from "@/data/careers/divisions";
import { RECRUITMENT, recruitmentPhase } from "@/data/careers/recruitment";

export const metadata: Metadata = pageMetadata({
  title: "Careers at IELSco & Elco AI: Open Recruitment 2027",
  description: "Join the volunteer team behind IELSco and Elco AI. Remote, 10–12 hours a week, for 1st to 3rd-year university students. Applications open 9–29 November 2026.",
  path: "/careers",
});

// The page is static; re-render every 10 minutes so the open/closed state follows the application window. The database
// enforces the window itself (public.career_applications_open()).
export const revalidate = 600;

const BENEFITS = [
  {
    icon: Languages, title: "English development",
    points: ["Our guarantee: we help every member improve their English toward at least B2 (CEFR) level.", "Build fluent, confident spoken English in an English-speaking working environment.", "Practise English in real professional situations: meetings, partner emails, presentations."],
  },
  {
    icon: Briefcase, title: "Global career development",
    points: ["Professional experience working with international teams.", "Career development resources, mentoring and guidance.", "Privileged access to global opportunities facilitated by IELSco, connected with 100+ companies across Asia-Pacific and global universities."],
  },
  {
    icon: Plane, title: "International exposure",
    points: ["The chance to take part in the Global Impact Fellowship (GIF): GIF to Thailand in Summer 2027 and GIF to China in Winter 2027.", "Participation may be fully funded, subject to program eligibility and selection."],
  },
  {
    icon: Banknote, title: "Performance-based incentives",
    points: ["Performance-based allowance and profit-sharing opportunities.", "Referral incentives and sponsorship-related incentives.", "Paid UGC and content creation work for members who take part in content production."],
  },
];

const ELIGIBILITY = [
  "You are a university student currently in your 1st, 2nd or 3rd year.",
  "You are willing to learn, grow and take responsibility for your work.",
  "You are interested in international exposure, professional development and English communication.",
  "You can contribute about 10–12 hours a week.",
  "No long list of past experience needed, and no minimum English score: the program is designed to help you improve.",
];

export default function CareersPage() {
  const phase = recruitmentPhase();
  const ig = RECRUITMENT.instagram;
  const campaignPost = ig.campaignPostUrl ?? ig.ielsco.url;
  const TASKS: { t: string; link?: { href: string; label: string } }[] = [
    { t: "Follow the official IELSco Instagram account.", link: { href: ig.ielsco.url, label: ig.ielsco.handle } },
    { t: "Follow the official Elco AI Instagram account.", link: { href: ig.elco.url, label: ig.elco.handle } },
    { t: "Comment on the recruitment campaign post and mention at least one friend.", link: { href: campaignPost, label: ig.campaignPostUrl ? "Open the post" : `Find it on ${ig.ielsco.handle}` } },
    { t: "Share the recruitment campaign post to your Instagram Story." },
    { t: "Use Instagram's repost feature to repost the recruitment campaign post." },
  ];

  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="careers-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[88px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>{RECRUITMENT.cohortName}</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Build your English and your career with IELSco &amp; Elco AI</h1>
            <p className={cn(lead, "mt-6 max-w-[580px]")}>
              We&apos;re recruiting university students to join the remote volunteer team behind IELSco and Elco AI. Run real
              programs, grow our communities and products, and work in English every week.
            </p>
            <div className="mt-6" data-testid="recruitment-status">
              {phase === "open" && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Applications open until {RECRUITMENT.closesLabel}, 23:59 WIB</span>}
              {phase === "upcoming" && <span className={cn(pill, "border-[#577E90]/30 text-[#577E90]")}>Applications open {RECRUITMENT.opensLabel} – {RECRUITMENT.closesLabel}</span>}
              {phase === "closed" && <span className={pill}>Applications for the 2027 cohort closed on {RECRUITMENT.closesLabel}</span>}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#apply" className={btnPrimary} data-testid="careers-cta">{phase === "open" ? "Apply now" : phase === "upcoming" ? "How to apply" : "Register interest"} <ArrowRight size={18} aria-hidden="true" /></a>
              <a href="#divisions" className={btnSecondary}>See divisions and roles</a>
            </div>
          </div>
          <Photo photo="teamPortrait" priority caption="Members of the IELSco team." />
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="who">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>Who we are</p>
            <h2 id="who" className={cn(h2, "mt-3")}>One team, two organisations</h2>
            <p className={cn(lead, "mt-4")}>
              This recruitment builds a shared volunteer team for IELSco and Elco AI: a small cohort that runs our programs,
              tells our stories and helps more young people reach global opportunities, while building the skills to reach them too.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className={cn(card, "p-7")}>
              <p className="text-[14px] font-semibold text-[#577E90]">PT English Space Berkah Indonesia</p>
              <h3 className={cn(h3, "mt-2")}>IELSco</h3>
              <p className={cn(body, "mt-2")}>An inclusive English community that helps Southeast Asian youth reach scholarships, exchanges, internships and work abroad, through the IELS Circle, events and programs such as the Global Impact Fellowship.</p>
              <Link href="/about" className={cn(textLink, "mt-4 text-[15px]")}>About IELSco <ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
            <div className={cn(card, "p-7")}>
              <p className="text-[14px] font-semibold text-[#577E90]">PT Elco Edukasi Berkah Indonesia</p>
              <h3 className={cn(h3, "mt-2")}>Elco AI</h3>
              <p className={cn(body, "mt-2")}>An AI-powered English learning platform, operated by a subsidiary of PT English Space Berkah Indonesia: personalized practice, live voice calls, interactive lessons and AI-powered feedback.</p>
              <a href="https://www.elcoai.com/about" target="_blank" rel="noopener noreferrer" className={cn(textLink, "mt-4 text-[15px]")}>About Elco AI <ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="facts">
        <div className={container}>
          <p className={eyebrow}>The program</p>
          <h2 id="facts" className={cn(h2, "mt-3")}>Nine months, fully remote</h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {RECRUITMENT.structure.map(([t, d], i) => {
              const Icon = [CalendarDays, Users, Laptop, Clock][i];
              return (
                <li key={t} className={cn(card, "p-7")}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><Icon size={20} aria-hidden="true" /></span>
                  <p className="mt-5 text-[22px] font-extrabold text-[#1A2534]">{t}</p>
                  <p className={cn(body, "mt-1 text-[15px]")}>{d}</p>
                </li>
              );
            })}
          </ul>
          <p className={cn(body, "mt-6")}>{RECRUITMENT.extras}</p>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="benefits">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>What you gain</p>
            <h2 id="benefits" className={cn(h2, "mt-3")}>A career development and learning program</h2>
            <p className={cn(lead, "mt-4")}>This is not salaried employment and there is no fixed monthly salary. Here is what you get instead.</p>
          </div>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {BENEFITS.map((b) => (
              <li key={b.title} className={cn(card, "p-7")}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><b.icon size={20} aria-hidden="true" /></span>
                <h3 className={cn(h3, "mt-5")}>{b.title}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-[16px] leading-[1.6] text-[#2F4157]/80">{b.points.map((p) => <li key={p}>{p}</li>)}</ul>
              </li>
            ))}
          </ul>
          <p className="mt-6 rounded-[16px] border border-[#E6E9EE] bg-[#F7F8FA] px-5 py-4 text-[15px] leading-relaxed text-[#2F4157]/85" data-testid="incentives-note">
            <strong className="text-[#1A2534]">Please note:</strong> financial incentives are not guaranteed income. Whether and how much you
            receive depends on your individual performance and participation, the budgets available and the program terms that apply.
            GIF funding depends on program eligibility and selection.
          </p>
        </div>
      </section>

      <section id="divisions" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="div-h">
        <div className={container}>
          <div className="max-w-[640px]">
            <p className={eyebrow}>Divisions</p>
            <h2 id="div-h" className={cn(h2, "mt-3")}>Seven divisions, {divisions.reduce((n, d) => n + d.roles.length, 0)} roles</h2>
            <p className={cn(lead, "mt-4")}>Choose one division when you apply. Each division page explains what the roles do and what we look for.</p>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {divisions.map((d) => (
              <li key={d.slug}>
                <Link href={`/careers/${d.slug}`} className={cn(cardLink, "flex h-full flex-col p-7")} data-testid={`division-${d.slug}`}>
                  <h3 className={h3}>{d.title}</h3>
                  <p className={cn(body, "mt-2 text-[15px]")}>{d.description}</p>
                  <ul className="mt-4 flex flex-1 flex-wrap content-start gap-2">{d.roles.map((r) => <li key={r.id} className={cn(pill, "font-medium")}>{r.title}</li>)}</ul>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2F4157]">See roles <ArrowRight size={16} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="who-can">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Requirements</p>
            <h2 id="who-can" className={cn(h2, "mt-3")}>Who can apply</h2>
            <ul className="mt-8 space-y-4">
              {ELIGIBILITY.map((e) => <li key={e} className="border-l-2 border-[#E56668] pl-5 text-[17px] leading-relaxed text-[#1A2534]">{e}</li>)}
            </ul>
            <p className={cn(body, "mt-6")}>You also need to complete the five Instagram campaign tasks below before you apply.</p>
          </div>
          <div className={cn(card, "self-start p-7")} data-testid="final-year-note">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><Globe2 size={20} aria-hidden="true" /></span>
            <h3 className={cn(h3, "mt-5")}>Final-year student or fresh graduate?</h3>
            <p className={cn(body, "mt-2")}>
              This volunteer recruitment is aimed at 1st to 3rd-year students. From January 2027, IELSco plans to start sharing
              international employment opportunities, and you&apos;re welcome to talk to us now about international careers.
            </p>
            <ul className="mt-4 space-y-2">
              {RECRUITMENT.internationalContacts.map((m) => (
                <li key={m}><a href={`mailto:${m}?subject=${encodeURIComponent("International career opportunities")}`} className={cn(textLink, "text-[15px]")}><Mail size={16} aria-hidden="true" />{m}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="timeline">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Timeline</p>
            <h2 id="timeline" className={cn(h2, "mt-3")}>From application to your first cycle</h2>
            <p className={cn(lead, "mt-4")}>All dates are 2026 unless marked otherwise. There is a holiday break from 21 December to 3 January.</p>
          </div>
          <ol className="relative space-y-6 border-l border-[#E6E9EE] pl-7" data-testid="recruitment-timeline">
            {RECRUITMENT.timeline.map(([date, t, d]) => (
              <li key={t} className="relative">
                <span className="absolute -left-[33px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#2F4157] ring-1 ring-[#2F4157]" aria-hidden="true" />
                <p className="text-[14px] font-semibold text-[#577E90]">{date}</p>
                <p className="text-[17px] font-bold text-[#1A2534]">{t}</p>
                <p className={cn(body, "mt-1 text-[15px]")}>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="apply" className={cn(section, "scroll-mt-24 border-t border-[#E6E9EE]")} aria-labelledby="apply-h">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>How to apply</p>
            <h2 id="apply-h" className={cn(h2, "mt-3")}>Two steps</h2>
            <h3 className={cn(h3, "mt-8")}>1. Complete the campaign tasks</h3>
            <p className={cn(body, "mt-2 text-[15px]")}>All five are required. You don&apos;t need to send screenshots: our recruitment team checks them on Instagram using the profile you give us.</p>
            <ol className="mt-5 space-y-4" data-testid="campaign-tasks">
              {TASKS.map((task, i) => (
                <li key={task.t} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{i + 1}</span>
                  <div className="pt-1">
                    <p className="text-[16px] text-[#1A2534]">{task.t}</p>
                    {task.link && <a href={task.link.href} target="_blank" rel="noopener noreferrer" className={cn(textLink, "mt-1 text-[15px]")}><Instagram size={16} aria-hidden="true" />{task.link.label}</a>}
                  </div>
                </li>
              ))}
            </ol>
            <h3 className={cn(h3, "mt-10")}>2. Fill in the application form</h3>
            <p className={cn(body, "mt-2 text-[15px]")}>About 10 minutes. Have your CV ready as a PDF, and your portfolio as a PDF or a link.</p>
          </div>
          <div className={cn(card, "p-6 sm:p-8")}>
            {phase === "open" && <ApplicationForm />}
            {phase === "upcoming" && (
              <div data-testid="apply-upcoming">
                <p className="text-[20px] font-bold text-[#1A2534]">The form opens on {RECRUITMENT.opensLabel}</p>
                <p className={cn(body, "mt-2")}>Applications run until {RECRUITMENT.closesLabel}, 23:59 WIB. Leave your email and we&apos;ll remind you the day it opens.</p>
                <div className="mt-6">
                  <InquiryForm kind="careers" fields={["organization", "topic"]}
                    labels={{ organization: "University (optional)", topic: "Division you're most interested in" }}
                    topics={[...divisions.map((d) => ({ value: d.slug, label: d.title })), { value: "unsure", label: "Not sure yet" }]}
                    submitLabel="Remind me" successTitle="We'll remind you" successText={`We'll email you when applications open on ${RECRUITMENT.opensLabel}.`} />
                </div>
              </div>
            )}
            {phase === "closed" && (
              <div data-testid="apply-closed">
                <p className="text-[20px] font-bold text-[#1A2534]">Applications for 2027 are closed</p>
                <p className={cn(body, "mt-2")}>We&apos;ll email you when the next intake opens. This isn&apos;t an application.</p>
                <div className="mt-6">
                  <InquiryForm kind="careers" fields={["organization", "topic", "message"]}
                    labels={{ organization: "University (optional)", topic: "Division you're most interested in", message: "Anything you'd like us to know (optional)" }}
                    topics={[...divisions.map((d) => ({ value: d.slug, label: d.title })), { value: "unsure", label: "Not sure yet" }]}
                    submitLabel="Keep me posted" successTitle="You're on our list" successText="We'll email you when the next intake opens." />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="faq">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16")}>
          <div>
            <h2 id="faq" className={h2}>Questions</h2>
            <p className={cn(body, "mt-4")}>Anything else? <a className="font-semibold underline" href="mailto:careers@ielsco.com">careers@ielsco.com</a></p>
          </div>
          <Faq items={[
            { q: "Is this a paid job?", a: "No. It's a volunteer career development and learning program with no fixed monthly salary. Members can earn performance-based allowances, profit-sharing, referral and sponsorship incentives, and paid UGC work, depending on performance, participation, available budgets and program terms." },
            { q: "Do I need perfect English?", a: "No, and there's no minimum score. You'll work in English every week, and the program is designed to help you improve toward at least B2." },
            { q: "Can I apply to more than one division?", a: "Choose the one division you want most, and optionally a role. If you'd also consider another division, say so in your motivation." },
            { q: "Do I need to send screenshots of the Instagram tasks?", a: "No. Our recruitment team checks them on Instagram using the profile link in your application, so keep your account public until results are out." },
            { q: "What happens after I apply?", a: "On 30 November everyone with a complete application gets the group-session schedule by email. Sessions run 1–4 December and decisions are sent on 9 December." },
            { q: "Can I apply if I'm in my final year or have graduated?", a: "This recruitment is for 1st to 3rd-year students. Final-year students and fresh graduates can email arbadza@ielsco.com or careers@ielsco.com about international career opportunities, which IELSco plans to start sharing in January 2027." },
          ]} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
