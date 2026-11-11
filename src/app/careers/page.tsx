import type { Metadata } from "next";
import { OfficialDeadline } from "@/components/time/LocalTime";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Banknote, Briefcase, Check, ExternalLink, FileText, Instagram, Languages, Linkedin, Mail, Plane, ShieldCheck } from "lucide-react";
import Footer from "@/components/footer";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Faq } from "@/components/site/Faq";
import { PhotoCarousel, type CarouselPhoto } from "@/components/careers/PhotoCarousel";
import { RoleExplorer } from "@/components/careers/RoleExplorer";
import { body, btnPrimary, btnSecondary, card, container, eyebrow, h1, h2, h3, lead, pill, section, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { LEADS, ROLE_COUNT, divisions, divisionsLedBy, type LeadKey } from "@/data/careers/divisions";
import { APPLY_PATH, CAMPAIGN_TASKS, RECRUITMENT, campaignTaskLink, recruitmentPhase } from "@/data/careers/recruitment";

export const metadata: Metadata = pageMetadata({
  title: "Careers at IELSco & Elco AI: Open Recruitment 2027",
  description: `Join the team behind IELSco and Elco AI: ${ROLE_COUNT} roles in 7 divisions, fully remote, for 1st to 3rd-year university students. Applications open 9–29 November 2026.`,
  path: "/careers",
});

// The page is static; re-render every 10 minutes so the open/closed state follows the application window. The database
// enforces the window itself (public.career_applications_open()).
export const revalidate = 600;

// Same design language as the rest of ielsco.com (site/ui tokens: white sections, hairline dividers, navy type). The
// MKT-0008 campaign is only a source of photos and the campaign preview, not a layout.

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

// One rotating frame of real IELSco moments (Figma campaign photos + IELS Circle meetups), one treatment for all.
const PHOTOS: CarouselPhoto[] = [
  { src: "/images/careers/2027/team-expo.webp", caption: "UTM Malaysia–Japan Expo 2026", alt: "The IELSco team at the UTM Malaysia–Japan Industrial & Innovation Expo 2026" },
  { src: "/images/site/community-in-person.webp", caption: "Surabaya", alt: "IELSco members at Hello Sydney! IELSco × Western Sydney University in Surabaya" },
  { src: "/images/careers/2027/team-summit.webp", caption: "International summit", alt: "IELSco members at an international summit" },
  { src: "/images/site/circle-bangkok.webp", caption: "Bangkok", alt: "IELSco members taking a group selfie at an IELSco Hangout in Bangkok" },
  { src: "/images/careers/2027/team-booth.webp", caption: "Campus expo booth", alt: "The IELSco team at an expo booth" },
  { src: "/images/site/circle-kuala-lumpur.webp", caption: "Kuala Lumpur", alt: "IELSco members at an IELSco Hangout in Kuala Lumpur" },
  { src: "/images/careers/2027/team-online-hall.webp", caption: "IELSco event", alt: "A large group of IELSco members and the team at an IELSco event" },
  { src: "/images/site/circle-phnom-penh.webp", caption: "Phnom Penh", alt: "Students and the IELSco team at IELSco Goes to School in Phnom Penh" },
  { src: "/images/site/circle-ho-chi-minh.webp", caption: "Ho Chi Minh City", alt: "IELSco members holding certificates at an IELSco Hangout in Ho Chi Minh City" },
];

const ELIGIBILITY = [
  "You are a university student currently in your 1st, 2nd or 3rd year.",
  "You are willing to learn, grow and take responsibility for your work.",
  "You are interested in international exposure, professional development and English communication.",
  "You can contribute about 10–12 hours a week.",
  "No long list of past experience needed, and no minimum English score: the program is designed to help you improve.",
];

const PREPARE = [
  ["Your CV as a PDF", "Required for every role, up to 10 MB."],
  ["A portfolio", "Required if one of your roles is in Creative (Graphic Designer, Video Designer). Optional for other roles: a PDF or a link."],
  ["Your Instagram profile", "Public until results are out, so the team can check the campaign tasks."],
  ["Your LinkedIn profile link", "For your professional background."],
  ["WhatsApp, university, year and where you live", "Country and city only. We never ask for your ID card, date of birth or home address."],
  ["A short motivation", "A few honest sentences on why you want to join and why these roles."],
];

// The published MKT-0008 carousel, in posting order (alt text describes each slide).
const SLIDE_ALTS = [
  "Open Recruitment for Associates, now open: application period 9–29 November 2026 at ielsco.com/careers, seven divisions, for 1st–3rd year university students.",
  "One team, two organisations: IELSco and Elco AI.",
  "What you'll help build: IELS Circle meetups in Surabaya, Bangkok, Kuala Lumpur, Phnom Penh and Ho Chi Minh City.",
  "7 divisions, 17 roles: Growth, Creative, Community and Learning, led by Arbadza Rido Adzariyat, Co-Founder and CEO.",
  "Three more divisions: Partnerships, Operations and People, led by Muhammad Farrel Alrezky, Co-Founder and COO.",
  "Grow your English and your career: work toward at least B2 (CEFR), with access to 100+ companies across Asia-Pacific.",
  "Go global: Global Impact Fellowship 2027, GIF Thailand in Summer and GIF China in Winter. Participation may be fully funded, subject to eligibility and selection.",
  "More than experience: performance-based allowance and profit sharing, referral and sponsorship incentives, paid UGC and content creation.",
  "The program: a 9-month journey, 3 months of probation then a 6-month organization period, starting 11 January 2027.",
  "Ready to be part of the IELS team? For 1st–3rd year university students. Apply at ielsco.com/careers until 29 November 2026, 23:59 WIB.",
];

// Official company pages (Instagram and LinkedIn). LinkedIn is for discovery only, not a campaign task.
function SocialLinks({ org, className }: { org: "ielsco" | "elco"; className?: string }) {
  const ig = RECRUITMENT.instagram[org], li = RECRUITMENT.linkedin[org];
  const name = org === "ielsco" ? "IELSco" : "Elco AI";
  const link = "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E6E9EE] text-[#2F4157] transition-colors hover:border-[#2F4157] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2";
  return (
    <span className={cn("inline-flex gap-2", className)}>
      <a href={ig.url} target="_blank" rel="noopener noreferrer" className={link} aria-label={`${name} on Instagram (${ig.handle})`} data-testid={`social-${org}-instagram`}><Instagram size={16} aria-hidden="true" /></a>
      <a href={li.url} target="_blank" rel="noopener noreferrer" className={link} aria-label={li.label} data-testid={`social-${org}-linkedin`}><Linkedin size={16} aria-hidden="true" /></a>
    </span>
  );
}

export default function CareersPage() {
  const phase = recruitmentPhase();
  const open = phase === "open";
  const applyHref = open ? APPLY_PATH : "#apply";
  const applyLabel = open ? "Apply now" : phase === "upcoming" ? "How to apply" : "Register interest";

  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="careers-page">
      {/* 1. Introduction and application period */}
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[80px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>{RECRUITMENT.cohortName}</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Build your English and your career with IELSco &amp; Elco AI</h1>
            <p className={cn(lead, "mt-6 max-w-[580px]")}>
              We&apos;re recruiting university students to join the remote team behind IELSco and Elco AI. Run real programs,
              grow our communities and products, and work in English every week.
            </p>
            <div className="mt-6" data-testid="recruitment-status">
              {open && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Now open · until <OfficialDeadline value={RECRUITMENT.closesAt} /></span>}
              {phase === "upcoming" && <span className={cn(pill, "border-[#577E90]/30 text-[#577E90]")}>Applications open {RECRUITMENT.opensLabel} – {RECRUITMENT.closesLabel}</span>}
              {phase === "closed" && <span className={pill}>Applications for the 2027 cohort closed on {RECRUITMENT.closesLabel}</span>}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={applyHref} className={btnPrimary} data-testid="careers-cta">{applyLabel} <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#roles" className={btnSecondary}>See the {ROLE_COUNT} roles</a>
            </div>
            {open && <p className="mt-4 flex items-center gap-2 text-[14px] text-[#2F4157]/65"><ShieldCheck size={16} aria-hidden="true" /> Apply with your Elco-Pass, one account for IELSco and Elco AI.</p>}
          </div>
          <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] border border-[#E6E9EE]">
            <Image src="/images/careers/2027/team-expo.webp" alt="The IELSco team at the UTM Malaysia–Japan Industrial & Innovation Expo 2026" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          </div>
        </div>
        <div className={cn(container, "mt-12")}>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="careers-facts">
            {[["7 divisions", `${ROLE_COUNT} roles to choose from`], ["9 months", "3-month probation, then 6 months"], ["Fully remote", "10–12 hours a week, alongside your studies"], ["1st–3rd year", "University students, any major"]].map(([n, l]) => (
              <div key={n} className={cn(card, "p-5")}><dt className="text-[22px] font-extrabold text-[#1A2534]">{n}</dt><dd className="mt-1 text-[14px] text-[#2F4157]/70">{l}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      {/* 2. About the recruitment program */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="who">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>About the program</p>
            <h2 id="who" className={cn(h2, "mt-3")}>One team, two organisations</h2>
            <p className={cn(lead, "mt-4")}>
              This recruitment builds a shared team for IELSco and Elco AI: a small cohort that runs our programs, tells our
              stories and helps more young people reach global opportunities, while building the skills to reach them too.
              The team meets online every week and works with members from Indonesia to Vietnam.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className={cn(card, "flex flex-col p-6")} data-testid="org-ielsco">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[#E6E9EE] bg-white">
                    <Image src="/images/logos/iels_blue1.png" alt="IELSco logo" width={28} height={30} className="h-[28px] w-auto" />
                  </span>
                  <div className="min-w-0"><h3 className={h3}>IELSco</h3><p className="text-[12px] font-semibold text-[#577E90]">PT English Space Berkah Indonesia</p></div>
                </div>
                <p className={cn(body, "mt-3 text-[15px]")}>An inclusive English community that helps Southeast Asian youth reach scholarships, exchanges, internships and work abroad.</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <Link href="/about" className={cn(textLink, "text-[15px]")}>About IELSco <ArrowRight size={16} aria-hidden="true" /></Link>
                  <SocialLinks org="ielsco" />
                </div>
              </div>
              <div className={cn(card, "flex flex-col p-6")} data-testid="org-elco">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[#E6E9EE] bg-white">
                    <Image src="/images/logos/elco-mark.svg" alt="Elco AI logo" width={28} height={26} className="h-[26px] w-auto" />
                  </span>
                  <div className="min-w-0"><h3 className={h3}>Elco AI</h3><p className="text-[12px] font-semibold text-[#577E90]">PT Elco Edukasi Berkah Indonesia</p></div>
                </div>
                <p className={cn(body, "mt-3 text-[15px]")}>An AI-powered English learning platform: personalized practice, live voice calls, interactive lessons and AI feedback.</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                  <a href="https://www.elcoai.com/about" target="_blank" rel="noopener noreferrer" className={cn(textLink, "text-[15px]")}>About Elco AI <ArrowRight size={16} aria-hidden="true" /></a>
                  <SocialLinks org="elco" />
                </div>
              </div>
            </div>
          </div>
          <PhotoCarousel photos={PHOTOS} />
        </div>
      </section>

      {/* 3. The 17 roles */}
      <section id="roles" className={cn(section, "scroll-mt-20 border-t border-[#E6E9EE]")} aria-labelledby="roles-h">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>Divisions and roles</p>
            <h2 id="roles-h" className={cn(h2, "mt-3")}>Seven divisions, {ROLE_COUNT} roles</h2>
            <p className={cn(lead, "mt-4")}>Choose up to two roles when you apply, from any division. Here is what each role does.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2" data-testid="division-leads">
            {(["arbadza", "farrel"] as LeadKey[]).map((key) => {
              const l = LEADS[key];
              const ds = divisionsLedBy(key);
              return (
                <div key={key} className={cn(card, "flex items-center gap-5 p-5")} data-testid={`lead-${key}`}>
                  <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden rounded-[18px] bg-[#F1F4F8]">
                    <Image src={l.image} alt={l.name} fill sizes="96px" className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#577E90]">{l.title}</p>
                    <p className="mt-0.5 text-[18px] font-bold text-[#1A2534]">{l.name}</p>
                    <p className="mt-1 text-[14px] text-[#2F4157]/70">Leads {ds.map((d) => d.title).join(", ").replace(/, ([^,]*)$/, " and $1")} · {ds.reduce((n, d) => n + d.roles.length, 0)} roles</p>
                    <a href={`mailto:${l.email}`} className={cn(textLink, "mt-1 text-[14px]")}><Mail size={14} aria-hidden="true" />{l.email}</a>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10"><RoleExplorer divisions={divisions} /></div>
        </div>
      </section>

      {/* 4. Benefits */}
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
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><b.icon size={20} aria-hidden="true" /></span>
                  <h3 className={h3}>{b.title}</h3>
                </div>
                <ul className="mt-4 space-y-2.5">{b.points.map((p) => <li key={p} className="flex gap-2.5 text-[15px] leading-[1.6] text-[#2F4157]/80"><Check size={17} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />{p}</li>)}</ul>
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

      {/* 5. Program structure and timeline */}
      <section id="facts" className={cn(section, "scroll-mt-20 border-t border-[#E6E9EE]")} aria-labelledby="facts-h">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:gap-16")}>
          <div>
            <p className={eyebrow}>The program</p>
            <h2 id="facts-h" className={cn(h2, "mt-3")}>Nine months, fully remote</h2>
            <p className={cn(lead, "mt-4")}>The first cycle starts on 11 January 2027.</p>
            <ol className="mt-8 grid grid-cols-9 gap-1.5" aria-label="Nine months: three months of probation, then six months">
              {Array.from({ length: 9 }, (_, i) => (
                <li key={i} className={cn("flex h-9 items-center justify-center rounded-[10px] text-[13px] font-bold", i < 3 ? "bg-[#2F4157] text-white" : "bg-[#EEF2F7] text-[#2F4157]")}>{i + 1}</li>
              ))}
            </ol>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {RECRUITMENT.structure.map(([t, d]) => (
                <li key={t} className={cn(card, "p-5")}><p className="text-[18px] font-bold text-[#1A2534]">{t}</p><p className={cn(body, "mt-1 text-[15px]")}>{d}</p></li>
              ))}
            </ul>
            <p className={cn(body, "mt-5 text-[15px]")}>{RECRUITMENT.extras}</p>
          </div>
          <div>
            <p className={eyebrow}>Timeline</p>
            <h3 className="mt-3 text-[24px] font-bold text-[#1A2534]">From application to your first cycle</h3>
            <p className={cn(body, "mt-2 text-[15px]")}>All dates are 2026 unless marked otherwise. Holiday break: 21 December – 3 January.</p>
            <ol className="relative mt-6 space-y-5 border-l border-[#E6E9EE] pl-7" data-testid="recruitment-timeline">
              {RECRUITMENT.timeline.map(([date, t, d]) => (
                <li key={t} className="relative">
                  <span className="absolute -left-[33px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#2F4157] ring-1 ring-[#2F4157]" aria-hidden="true" />
                  <p className="text-[13px] font-semibold text-[#577E90]">{date}</p>
                  <p className="text-[16px] font-bold text-[#1A2534]">{t}</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-[#2F4157]/70">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 6–7. How to apply and what to prepare */}
      <section id="apply" className={cn(section, "scroll-mt-20 border-t border-[#E6E9EE]")} aria-labelledby="apply-h">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>How to apply</p>
            <h2 id="apply-h" className={cn(h2, "mt-3")}>Three steps, about 10 minutes</h2>
          </div>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
            <ol className="space-y-8">
              <li className="flex gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[16px] font-bold text-white">1</span>
                <div>
                  <h3 className={h3}>Sign in with your Elco-Pass</h3>
                  <p className={cn(body, "mt-1.5 text-[15px]")}>One account for IELSco and Elco AI. Already have one? Sign in. New? Create it in a minute. You can connect your Elco AI account too, if you use it.</p>
                </div>
              </li>
              <li className="flex gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[16px] font-bold text-white">2</span>
                <div className="min-w-0 flex-1">
                  <h3 className={h3}>Complete the seven campaign tasks on Instagram</h3>
                  <p className={cn(body, "mt-1.5 text-[15px]")}>All seven are required, with the Instagram account you apply with. No screenshots: the recruitment team checks each one by hand.</p>
                  <ol className="mt-4 grid gap-2.5 sm:grid-cols-2" data-testid="campaign-tasks">
                    {CAMPAIGN_TASKS.map((t, i) => {
                      const l = campaignTaskLink(t.link);
                      return (
                        <li key={t.key} className="flex gap-3 rounded-[14px] border border-[#E6E9EE] px-4 py-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[12px] font-bold text-[#2F4157]">{i + 1}</span>
                          <span className="min-w-0">
                            <span className="block text-[14px] leading-snug text-[#1A2534]">{t.detail}</span>
                            {l && !l.download && <a href={l.href} target="_blank" rel="noopener noreferrer" className={cn(textLink, "mt-1 text-[13px]")} data-testid={`task-link-${t.key}`}>{l.label} <ExternalLink size={12} aria-hidden="true" /></a>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </li>
              <li className="flex gap-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[16px] font-bold text-white">3</span>
                <div>
                  <h3 className={h3}>Fill in the application</h3>
                  <p className={cn(body, "mt-1.5 text-[15px]")}>Choose up to two roles, then add your details and documents. Your progress is saved, and you can follow your status after you submit.</p>
                </div>
              </li>
            </ol>
            <aside className={cn(card, "self-start p-7 lg:sticky lg:top-24")} data-testid="careers-prepare">
              <h3 className={h3}>What to prepare</h3>
              <ul className="mt-4 space-y-3.5">
                {PREPARE.map(([t, d]) => (
                  <li key={t} className="flex gap-3"><FileText size={18} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
                    <span><span className="block text-[15px] font-semibold text-[#1A2534]">{t}</span><span className="block text-[14px] leading-relaxed text-[#2F4157]/70">{d}</span></span></li>
                ))}
              </ul>
            </aside>
          </div>
          <div className="mt-14 grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
            <div>
              <h3 className={h3}>Who can apply</h3>
              <ul className="mt-4 space-y-3">
                {ELIGIBILITY.map((e) => <li key={e} className="border-l-2 border-[#E56668] pl-4 text-[16px] leading-relaxed text-[#1A2534]">{e}</li>)}
              </ul>
            </div>
            <div className={cn(card, "self-start p-7")} data-testid="final-year-note">
              <h3 className={h3}>Final-year student or fresh graduate?</h3>
              <p className={cn(body, "mt-2 text-[15px]")}>This recruitment is aimed at 1st to 3rd-year students. From January 2027, IELSco plans to start sharing international employment opportunities; talk to us now about international careers.</p>
              <ul className="mt-3 space-y-1.5">
                {RECRUITMENT.internationalContacts.map((m) => (
                  <li key={m}><a href={`mailto:${m}?subject=${encodeURIComponent("International career opportunities")}`} className={cn(textLink, "text-[15px]")}><Mail size={16} aria-hidden="true" />{m}</a></li>
                ))}
              </ul>
            </div>
          </div>
          {phase !== "open" && (
            <div className={cn(card, "mt-10 p-7")} data-testid={phase === "upcoming" ? "apply-upcoming" : "apply-closed"}>
              <p className="text-[20px] font-bold text-[#1A2534]">{phase === "upcoming" ? `Applications open on ${RECRUITMENT.opensLabel}` : "Applications for 2027 are closed"}</p>
              <p className={cn(body, "mt-2")}>{phase === "upcoming" ? "Leave your email and we'll remind you the day it opens." : "We'll email you when the next intake opens. This isn't an application."}</p>
              <div className="mt-6 max-w-[560px]">
                <InquiryForm kind="careers" fields={["organization", "topic"]}
                  labels={{ organization: "University (optional)", topic: "Division you're most interested in" }}
                  topics={[...divisions.map((d) => ({ value: d.slug, label: d.title })), { value: "unsure", label: "Not sure yet" }]}
                  submitLabel={phase === "upcoming" ? "Remind me" : "Keep me posted"} successTitle="You're on our list" successText="We'll email you." />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Campaign preview (approved MKT-0008 slides) */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="campaign-h">
        <div className={container}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={eyebrow}>The campaign</p>
              <h2 id="campaign-h" className={cn(h2, "mt-3")}>Seen it on Instagram?</h2>
            </div>
            <a href={RECRUITMENT.instagram.campaignPostUrl ?? RECRUITMENT.instagram.ielsco.url} target="_blank" rel="noopener noreferrer" className={btnSecondary} data-testid="campaign-post-link"><Instagram size={18} aria-hidden="true" /> Open the recruitment post</a>
          </div>
          <ul className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3" data-testid="campaign-slides" aria-label="Recruitment carousel as published on Instagram">
            {RECRUITMENT.slides.map((src, i) => (
              <li key={src} className="relative aspect-[4/5] w-[220px] shrink-0 snap-start overflow-hidden rounded-[18px] border border-[#E6E9EE] bg-[#F1F4F8] sm:w-[260px]">
                <Image src={src} alt={SLIDE_ALTS[i] ?? `Recruitment slide ${i + 1}`} fill sizes="260px" className="object-contain" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="faq">
        <div className={cn(container, "max-w-[860px]")}>
          <div className="text-center">
            <p className={eyebrow}>FAQ</p>
            <h2 id="faq" className={cn(h2, "mt-3")}>Questions</h2>
            <p className={cn(body, "mt-3")}>Anything else? <a className="font-semibold underline" href="mailto:careers@ielsco.com">careers@ielsco.com</a></p>
          </div>
          <Faq className="mt-10" items={[
            { q: "Is this a paid job?", a: "No. It's a volunteer career development and learning program with no fixed monthly salary. Members can earn performance-based allowances, profit-sharing, referral and sponsorship incentives, and paid UGC work, depending on performance, participation, available budgets and program terms." },
            { q: "Why do I need an account to apply?", a: "You apply with your Elco-Pass, the one account for IELSco and Elco AI. Your progress is saved, and you can follow your status and the campaign-task checks after you submit. If you already have an IELSco account, just sign in." },
            { q: "Can I apply for more than one role?", a: "Yes, up to two roles, chosen by position. They can be in different divisions. Put the one you want most first." },
            { q: "Do I need a portfolio?", a: "Only if one of your roles is in the Creative division (Graphic Designer or Video Designer). For every other role it's optional, but welcome. A CV is required for everyone." },
            { q: "Do I need perfect English?", a: "No, and there's no minimum score. You'll work in English every week, and the program is designed to help you improve toward at least B2." },
            { q: "Do I need to send screenshots of the Instagram tasks?", a: "No. Our recruitment team checks them by hand on Instagram using the profile link in your application, so keep your account public and your Story up until results are out." },
            { q: "Can I change my application after submitting?", a: "Yes, while applications are open and before review starts. Open your application from the dashboard and choose Change application." },
            { q: "What happens after I apply?", a: "On 30 November everyone with a complete application gets the group-session schedule by email. Sessions run 1–4 December and decisions are sent on 9 December." },
          ]} />
        </div>
      </section>

      {/* 9. Final CTA */}
      {phase !== "closed" && (
        <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="close-h">
          <div className={container}>
            <div className="flex flex-col gap-8 rounded-[28px] border border-[#E6E9EE] bg-[#F7F8FA] p-7 sm:p-10 lg:flex-row lg:items-center lg:justify-between" data-testid="careers-final-cta">
              <div className="flex items-center gap-6">
                <Image src="/images/contents/mascot/poses/happy.png" alt="" width={80} height={80} className="hidden h-[80px] w-[80px] shrink-0 object-contain sm:block" />
                <div>
                  <p className={eyebrow}>{open ? <>Applications close <OfficialDeadline value={RECRUITMENT.closesAt} /></> : `Applications open ${RECRUITMENT.opensLabel}`}</p>
                  <h2 id="close-h" className={cn(h2, "mt-2")}>Find your role. Join the team.</h2>
                  <p className={cn(body, "mt-2 max-w-[520px]")}>For 1st–3rd year university students. Sign in with your Elco-Pass and apply in about 10 minutes.</p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row lg:shrink-0">
                <Link href={applyHref} className={cn(btnPrimary, "sm:min-w-[168px]")} data-testid="careers-cta-close">{applyLabel} <ArrowRight size={18} aria-hidden="true" /></Link>
                <a href="#roles" className={cn(btnSecondary, "sm:min-w-[168px]")}>Explore the roles</a>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 text-[14px] text-[#2F4157]/70 sm:flex-row sm:gap-8" data-testid="careers-follow">
              <span className="flex items-center gap-3">Follow IELSco <SocialLinks org="ielsco" /></span>
              <span className="flex items-center gap-3">Follow Elco AI <SocialLinks org="elco" /></span>
            </div>
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
}
