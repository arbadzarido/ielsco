import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, Banknote, BookOpen, Briefcase, ClipboardCheck, Handshake, HeartHandshake, Instagram, Languages, Mail, Megaphone,
  PenTool, Plane, ShieldCheck, UserRound, Users,
} from "lucide-react";
import Footer from "@/components/footer";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Faq } from "@/components/site/Faq";
import { body, btnSecondary, card, container, eyebrow, focusRing, h2, h3, lead, siteRoot, textLink } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { LEADS, ROLE_COUNT, divisions, divisionsLedBy, type LeadKey } from "@/data/careers/divisions";
import { APPLY_PATH, CAMPAIGN_TASKS, RECRUITMENT, recruitmentPhase } from "@/data/careers/recruitment";

export const metadata: Metadata = pageMetadata({
  title: "Careers at IELSco & Elco AI: 2027 Team Recruitment",
  description: `Join the team behind IELSco and Elco AI: ${ROLE_COUNT} roles in 7 divisions, fully remote, for 1st to 3rd-year university students. Applications open 9–29 November 2026.`,
  path: "/careers",
});

// The page is static; re-render every 10 minutes so the open/closed state follows the application window. The database
// enforces the window itself (public.career_applications_open()).
export const revalidate = 600;

// Campaign art direction (MKT-0008, approved v3): Nightfall / Mist / White / Steel blocks, black-and-white photos of
// real IELSco moments, Butter yellow kept for the "+ you" device and the call to action.
const NIGHT = "bg-[#2F4157]";
const MIST = "bg-[#EEF1F5]";
const BUTTER = "bg-[#F9E15B] text-[#1A2534]";
const btnButter = `inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full ${BUTTER} px-7 text-[16px] font-bold transition-colors hover:bg-white ${focusRing}`;
const btnGhost = `inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-white/40 px-7 text-[16px] font-semibold text-white transition-colors hover:bg-white/10 ${focusRing}`;
const YouTag = ({ className }: { className?: string }) => (
  <span className={cn("rounded-full px-3 py-1 text-[14px] font-bold shadow-[0_6px_18px_rgba(26,37,52,0.18)]", BUTTER, className)} aria-hidden="true">+ you</span>
);

const DIVISION_ICON: Record<string, typeof Megaphone> = {
  growth: Megaphone, creative: PenTool, community: Users, learning: BookOpen, partnerships: Handshake, operations: ClipboardCheck, people: HeartHandshake,
};

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

// Real IELS Circle meetups (the community moments on circle.ielsco.com).
const MOMENTS = [
  { src: "/images/site/community-in-person.webp", place: "Surabaya", alt: "A large group of IELSco members at Hello Sydney! IELSco × Western Sydney University in Surabaya" },
  { src: "/images/site/circle-bangkok.webp", place: "Bangkok", alt: "IELSco members taking a group selfie at an IELSco Hangout in Bangkok" },
  { src: "/images/site/circle-kuala-lumpur.webp", place: "Kuala Lumpur", alt: "IELSco members at an IELSco Hangout in Kuala Lumpur" },
  { src: "/images/site/circle-phnom-penh.webp", place: "Phnom Penh", alt: "Students and the IELSco team at IELSco Goes to School in Phnom Penh" },
  { src: "/images/site/circle-ho-chi-minh.webp", place: "Ho Chi Minh City", alt: "IELSco members holding certificates at an IELSco Hangout in Ho Chi Minh City" },
];

// "Real work. Real projects." (MKT-0008 slide 6), one line per division.
const WORK: [string, string][] = [
  ["growth", "Write and publish content for IELSco and Elco AI"],
  ["creative", "Design social posts, event identities and product demos"],
  ["community", "Welcome and grow the IELS Circle community"],
  ["learning", "Create learning materials for Elco AI"],
  ["partnerships", "Reach out to universities, sponsors and media partners"],
  ["operations", "Keep the Global Impact Fellowship on track"],
  ["people", "Tell the stories of our people"],
];

const ELIGIBILITY = [
  "You are a university student currently in your 1st, 2nd or 3rd year.",
  "You are willing to learn, grow and take responsibility for your work.",
  "You are interested in international exposure, professional development and English communication.",
  "You can contribute about 10–12 hours a week.",
  "No long list of past experience needed, and no minimum English score: the program is designed to help you improve.",
];

// Approved MKT-0008 carousel slides that match this page (the role-index and CTA slides still show the earlier 16 roles
// and five tasks, so they are left out until the art is updated).
const SLIDES = [
  { n: "01", alt: "Cover: 2027 Team Recruitment, now open. We're building something. Come build it with us." },
  { n: "02", alt: "One team. Two organisations: IELSco and Elco AI." },
  { n: "03", alt: "What you'll help build: IELS Circle meetups across Southeast Asia." },
  { n: "06", alt: "Real work. Real projects." },
  { n: "07", alt: "Grow your English. Grow your career." },
  { n: "08", alt: "Go global: GIF Thailand Summer 2027 and GIF China Winter 2027." },
  { n: "09", alt: "More than experience: performance-based incentives." },
  { n: "10", alt: "The program: a 9-month journey." },
];

export default function CareersPage() {
  const phase = recruitmentPhase();
  const open = phase === "open";
  const applyHref = open ? APPLY_PATH : "#apply";
  const applyLabel = open ? "Apply now" : phase === "upcoming" ? "How to apply" : "Register interest";

  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="careers-page">
      {/* ── Hero (MKT-0008 cover) ── */}
      <section className={cn(NIGHT, "relative overflow-hidden text-white")} aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-10 pb-12 pt-10 md:pb-16 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-20 lg:pt-16")}>
          <div className="order-2 lg:order-1">
            <div data-testid="recruitment-status">
              {open && <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-bold uppercase tracking-wide", BUTTER)}><span className="h-2 w-2 rounded-full bg-[#2D7A58]" aria-hidden="true" />Now open</span>}
              {phase === "upcoming" && <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold uppercase tracking-wide">Opens {RECRUITMENT.opensLabel}</span>}
              {phase === "closed" && <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold uppercase tracking-wide">Applications closed</span>}
            </div>
            <p className="mt-6 text-[14px] font-semibold uppercase tracking-[0.16em] text-white/70">IELSco &amp; Elco AI</p>
            <h1 id="hero" className="mt-2 text-[44px] font-extrabold uppercase leading-[0.98] tracking-[-0.02em] sm:text-[60px] lg:text-[72px]">2027 Team<br />Recruitment</h1>
            <p className="mt-5 max-w-[520px] text-[20px] leading-snug text-white/90 sm:text-[22px]">We&apos;re building something. <em className="font-semibold not-italic text-[#F9E15B]">Come build it with us.</em></p>
            <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-3 text-[15px]">
              <div><dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">Application period</dt><dd className="mt-0.5 font-bold">9–29 November 2026, 23:59 WIB</dd></div>
              <div><dt className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">For</dt><dd className="mt-0.5 font-bold">1st–3rd year university students</dd></div>
            </dl>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={applyHref} className={btnButter} data-testid="careers-cta">{applyLabel} <ArrowRight size={18} aria-hidden="true" /></Link>
              <a href="#divisions" className={btnGhost}>Find your role</a>
            </div>
            {open && <p className="mt-4 flex items-center gap-2 text-[14px] text-white/70"><ShieldCheck size={16} aria-hidden="true" /> Apply with your Elco-Pass, one account for IELSco and Elco AI.</p>}
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] lg:aspect-[5/4]">
              <Image src="/images/careers/2027/team-expo.webp" alt="The IELSco team at the UTM Malaysia–Japan Industrial & Innovation Expo 2026" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover grayscale" />
            </div>
            <YouTag className="absolute -bottom-3 right-6 rotate-[-4deg] sm:right-10" />
          </div>
        </div>
        <div className="border-t border-white/10">
          <dl className={cn(container, "grid grid-cols-2 gap-y-5 py-6 sm:grid-cols-4")} data-testid="careers-facts">
            {[["7", "divisions"], [String(ROLE_COUNT), "roles"], ["9 months", "3 probation + 6 organization"], ["Fully remote", "alongside your studies"]].map(([n, l]) => (
              <div key={l} className="pr-4"><dt className="sr-only">{l}</dt><dd><span className="block text-[26px] font-extrabold leading-none sm:text-[30px]">{n}</span><span className="mt-1 block text-[14px] text-white/65">{l}</span></dd></div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── One team, two organisations ── */}
      <section className="bg-white py-[64px] md:py-[96px]" aria-labelledby="who">
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16")}>
          <div>
            <p className={eyebrow}>Who we are</p>
            <h2 id="who" className={cn(h2, "mt-3")}>One team. <span className="text-[#577E90]">Two organisations.</span></h2>
            <p className={cn(lead, "mt-4")}>Built by one shared team, online every week across Southeast Asia. This recruitment builds the cohort that runs our programs, tells our stories and helps more young people reach global opportunities, while building the skills to reach them too.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className={cn(card, "p-6")}>
                <div className="flex items-center gap-2.5"><Image src="/images/logos/iels_blue1.png" alt="" width={28} height={28} /><h3 className={h3}>IELSco</h3></div>
                <p className={cn(body, "mt-2 text-[15px]")}>An inclusive English community that helps Southeast Asian youth reach scholarships, exchanges, internships and work abroad, through the IELS Circle, events and programs such as the Global Impact Fellowship.</p>
                <Link href="/about" className={cn(textLink, "mt-3 text-[15px]")}>About IELSco <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className={cn(card, "p-6")}>
                <div className="flex items-center gap-2.5"><Image src="/images/contents/mascot/elco.svg" alt="" width={28} height={28} /><h3 className={h3}>Elco AI</h3></div>
                <p className={cn(body, "mt-2 text-[15px]")}>An AI-powered English learning platform, operated by a subsidiary of PT English Space Berkah Indonesia: personalized practice, live voice calls, interactive lessons and AI-powered feedback.</p>
                <a href="https://www.elcoai.com/about" target="_blank" rel="noopener noreferrer" className={cn(textLink, "mt-3 text-[15px]")}>About Elco AI <ArrowRight size={16} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
          <figure className="relative">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[24px]">
              <Image src="/images/careers/2027/team-online-hall.webp" alt="A large group of IELSco members and the team at an IELSco event" fill sizes="(min-width: 1024px) 580px, 100vw" className="object-cover grayscale" />
            </div>
            <figcaption className="mt-3 text-[14px] text-[#2F4157]/60">IELSco members and the team, together in person.</figcaption>
          </figure>
        </div>
      </section>

      {/* ── What you'll help build (mosaic + "+ you") ── */}
      <section className={cn(MIST, "py-[64px] md:py-[96px]")} aria-labelledby="life-h">
        <div className={container}>
          <div className="max-w-[680px]">
            <p className={eyebrow}>What you&apos;ll help build</p>
            <h2 id="life-h" className={cn(h2, "mt-3")}>Online every week, together across Southeast Asia</h2>
            <p className={cn(lead, "mt-4")}>IELS Circle meetups, campus visits and programs like the Global Impact Fellowship, with members from Indonesia to Vietnam. You&apos;ll be part of the next ones.</p>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="careers-gallery">
            {MOMENTS.map((m, i) => (
              <li key={m.src} className={cn("relative overflow-hidden rounded-[20px] bg-white", i === 0 ? "col-span-2 aspect-[16/10] md:row-span-2 md:aspect-auto" : "aspect-square")}>
                <Image src={m.src} alt={m.alt} fill sizes={i === 0 ? "(min-width: 768px) 580px, 100vw" : "(min-width: 768px) 290px, 50vw"} className="object-cover grayscale" />
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[13px] font-semibold text-[#1A2534]">{m.place}</span>
              </li>
            ))}
            <li className="col-span-2 flex aspect-[16/7] items-center justify-center rounded-[20px] border-2 border-dashed border-[#2F4157]/25 md:col-span-2 md:aspect-auto md:min-h-[140px]">
              <Link href={applyHref} className={cn("flex flex-col items-center gap-2 text-center", focusRing)}>
                <YouTag className="text-[16px]" />
                <span className="text-[15px] font-semibold text-[#2F4157]">There&apos;s a place for you in the picture</span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* ── Divisions and roles (editorial index, led by the co-founders) ── */}
      <section id="divisions" className="scroll-mt-20 bg-white py-[64px] md:py-[96px]" aria-labelledby="div-h">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>Divisions and roles</p>
            <h2 id="div-h" className={cn(h2, "mt-3")}>7 divisions. {ROLE_COUNT} roles. <span className="text-[#577E90]">Find yours.</span></h2>
            <p className={cn(lead, "mt-4")}>Each division is led by one of our co-founders. Choose up to two roles when you apply, from any division. Each division page explains what the roles do and what we look for.</p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {(["arbadza", "farrel"] as LeadKey[]).map((key) => {
              const l = LEADS[key];
              const ds = divisionsLedBy(key);
              const dark = key === "farrel";
              return (
                <div key={key} className={cn("overflow-hidden rounded-[28px]", dark ? cn(NIGHT, "text-white") : MIST)} data-testid={`lead-${key}`}>
                  <div className="grid sm:grid-cols-[180px_1fr]">
                    <div className="relative aspect-[4/3] sm:aspect-auto sm:min-h-full">
                      <Image src={`/images/careers/2027/lead-${key}.webp`} alt={`${l.name}, ${l.title}`} fill sizes="(min-width: 640px) 180px, 100vw" className="object-cover object-top grayscale" />
                      <span className={cn("absolute bottom-3 left-3 rounded-md px-2.5 py-1.5 text-[12px] leading-tight", dark ? "bg-white text-[#1A2534]" : cn(NIGHT, "text-white"))}>
                        <span className="block opacity-70">Led by</span><span className="block font-bold">{l.name.split(" ").slice(0, 2).join(" ")}</span><span className="block opacity-70">{l.title}</span>
                      </span>
                    </div>
                    <div className="p-6 sm:p-7">
                      <ul className="space-y-5">
                        {ds.map((d) => {
                          const Icon = DIVISION_ICON[d.slug] ?? Users;
                          return (
                            <li key={d.slug} className={cn("border-b pb-5 last:border-0 last:pb-0", dark ? "border-white/15" : "border-[#2F4157]/10")}>
                              <Link href={`/careers/${d.slug}`} className={cn("group block rounded-lg", focusRing)} data-testid={`division-${d.slug}`}>
                                <span className="flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-2.5 text-[20px] font-bold"><Icon size={19} aria-hidden="true" className={dark ? "text-[#F9E15B]" : "text-[#577E90]"} />{d.title}</span>
                                  <span className={cn("flex items-center gap-1 text-[13px] font-semibold", dark ? "text-white/70" : "text-[#2F4157]/60")}>{d.roles.length} roles <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                                </span>
                                <span className={cn("mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[15px]", dark ? "text-white/85" : "text-[#2F4157]/85")}>
                                  {d.roles.map((r) => (
                                    <span key={r.id} className="inline-flex items-center gap-1.5">{r.title}{r.isNew && <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase", BUTTER)}>New</span>}</span>
                                  ))}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      <a href={`mailto:${l.email}`} className={cn("mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold underline-offset-4 hover:underline", dark ? "text-white/80" : "text-[#2F4157]", focusRing)}><Mail size={15} aria-hidden="true" />{l.email}</a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Real work ── */}
      <section className={cn(MIST, "py-[64px] md:py-[96px]")} aria-labelledby="work-h">
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-16")}>
          <div className="relative aspect-[4/5] max-h-[560px] overflow-hidden rounded-[24px] sm:aspect-[4/3] lg:aspect-[4/5]">
            <Image src="/images/careers/2027/team-working.webp" alt="IELSco team members working together on laptops" fill sizes="(min-width: 1024px) 520px, 100vw" className="object-cover grayscale" />
          </div>
          <div>
            <p className={eyebrow}>The work</p>
            <h2 id="work-h" className={cn(h2, "mt-3")}>Real work. <span className="text-[#577E90]">Real projects.</span></h2>
            <ol className="mt-8 space-y-3">
              {WORK.map(([slug, t]) => {
                const Icon = DIVISION_ICON[slug] ?? Users;
                return (
                  <li key={slug} className="flex items-center gap-4 rounded-[16px] bg-white px-4 py-3.5">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white", NIGHT)}><Icon size={18} aria-hidden="true" /></span>
                    <span className="text-[16px] font-medium text-[#1A2534]">{t}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ── What you gain ── */}
      <section className="bg-white py-[64px] md:py-[96px]" aria-labelledby="benefits">
        <div className={container}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <p className={eyebrow}>What you gain</p>
              <h2 id="benefits" className={cn(h2, "mt-3")}>A career development and learning program</h2>
              <p className={cn(lead, "mt-4")}>This is not salaried employment and there is no fixed monthly salary. Here is what you get instead.</p>
            </div>
            <div className="relative hidden aspect-[16/9] overflow-hidden rounded-[24px] lg:block">
              <Image src="/images/careers/2027/team-summit.webp" alt="IELSco members at a summit" fill sizes="560px" className="object-cover object-[50%_30%] grayscale" />
            </div>
          </div>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {BENEFITS.map((b, i) => (
              <li key={b.title} className={cn("rounded-[24px] p-7", i === 3 ? cn(NIGHT, "text-white") : i === 2 ? "bg-[#577E90] text-white" : cn(card))}>
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", i >= 2 ? "bg-white/15 text-white" : "bg-[#EEF2F7] text-[#2F4157]")}><b.icon size={20} aria-hidden="true" /></span>
                <h3 className={cn("mt-5 text-[20px] font-bold leading-snug", i >= 2 ? "text-white" : "text-[#1A2534]")}>{b.title}</h3>
                <ul className={cn("mt-3 list-disc space-y-2 pl-5 text-[16px] leading-[1.6]", i >= 2 ? "text-white/85" : "text-[#2F4157]/80")}>{b.points.map((p) => <li key={p}>{p}</li>)}</ul>
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

      {/* ── The program: a 9-month journey ── */}
      <section id="facts" className={cn(NIGHT, "scroll-mt-20 py-[64px] text-white md:py-[96px]")} aria-labelledby="facts-h">
        <div className={cn(container, "grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center")}>
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#F9E15B]">The program</p>
            <h2 id="facts-h" className="mt-3 text-[30px] font-extrabold leading-[1.15] sm:text-[38px]">A 9-month journey</h2>
            <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed text-white/80">Fully remote, alongside your studies. The first cycle starts on 11 January 2027.</p>
            <ol className="mt-8 flex items-center gap-1.5 sm:gap-2" aria-label="Nine months: three months of probation, then six months">
              {Array.from({ length: 9 }, (_, i) => (
                <li key={i} className="flex flex-1 items-center gap-1.5 sm:gap-2">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold sm:h-10 sm:w-10 sm:text-[15px]", i < 3 ? BUTTER : "bg-white text-[#1A2534]")}>{i + 1}</span>
                  {i < 8 && <span className={cn("h-0.5 flex-1", i < 2 ? "bg-[#F9E15B]" : "bg-white/40")} aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {RECRUITMENT.structure.map(([t, d]) => (
                <li key={t} className="rounded-[18px] bg-white/[0.07] p-5"><p className="text-[20px] font-extrabold">{t}</p><p className="mt-1 text-[15px] text-white/75">{d}</p></li>
              ))}
            </ul>
            <p className="mt-5 text-[15px] text-white/70">{RECRUITMENT.extras}</p>
          </div>
          <div className="relative mx-auto hidden h-[300px] w-[300px] items-center justify-center rounded-full bg-[#EEF1F5] lg:flex">
            <Image src="/images/contents/mascot/poses/happy.png" alt="Elco, the IELSco and Elco AI mascot, waving" width={220} height={220} className="h-[220px] w-auto" />
          </div>
        </div>
      </section>

      {/* ── Who can apply ── */}
      <section className="bg-white py-[64px] md:py-[96px]" aria-labelledby="who-can">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Requirements</p>
            <h2 id="who-can" className={cn(h2, "mt-3")}>Who can apply</h2>
            <ul className="mt-8 space-y-4">
              {ELIGIBILITY.map((e) => <li key={e} className="border-l-2 border-[#F9E15B] pl-5 text-[17px] leading-relaxed text-[#1A2534]">{e}</li>)}
            </ul>
            <p className={cn(body, "mt-6")}>You also need to complete the seven Instagram campaign tasks below before you submit.</p>
          </div>
          <div className={cn(card, "self-start p-7")} data-testid="final-year-note">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[#2F4157]"><UserRound size={20} aria-hidden="true" /></span>
            <h3 className={cn(h3, "mt-5")}>Final-year student or fresh graduate?</h3>
            <p className={cn(body, "mt-2")}>
              This recruitment is aimed at 1st to 3rd-year students. From January 2027, IELSco plans to start sharing
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

      {/* ── How to apply ── */}
      <section id="apply" className={cn(MIST, "scroll-mt-20 py-[64px] md:py-[96px]")} aria-labelledby="apply-h">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>How to apply</p>
            <h2 id="apply-h" className={cn(h2, "mt-3")}>Three steps, about 10 minutes</h2>
            <p className={cn(lead, "mt-4")}>Have your CV ready as a PDF, and your portfolio as a PDF or a link. We never ask for your ID card, date of birth or home address.</p>
          </div>
          <ol className="mt-10 grid gap-5 lg:grid-cols-3">
            <li className="rounded-[24px] bg-white p-7">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-bold text-white", NIGHT)}>1</span>
              <h3 className={cn(h3, "mt-5")}>Sign in with your Elco-Pass</h3>
              <p className={cn(body, "mt-2 text-[15px]")}>One account for IELSco and Elco AI. Already have one? Sign in. New? Create it in a minute. You can connect your Elco AI account too, if you use it.</p>
            </li>
            <li className="rounded-[24px] bg-white p-7 lg:row-span-2">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-bold text-white", NIGHT)}>2</span>
              <h3 className={cn(h3, "mt-5")}>Complete the campaign tasks</h3>
              <p className={cn(body, "mt-2 text-[15px]")}>All seven are required. No screenshots: the recruitment team checks them by hand on Instagram, using the profile you give us.</p>
              <ol className="mt-5 space-y-3" data-testid="campaign-tasks">
                {CAMPAIGN_TASKS.map((t, i) => (
                  <li key={t.key} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7] text-[13px] font-bold text-[#2F4157]">{i + 1}</span>
                    <span className="pt-0.5 text-[15px] leading-snug text-[#1A2534]">{t.detail}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                <a href={RECRUITMENT.instagram.ielsco.url} target="_blank" rel="noopener noreferrer" className={cn(textLink, "text-[15px]")}><Instagram size={16} aria-hidden="true" />{RECRUITMENT.instagram.ielsco.handle}</a>
                <a href={RECRUITMENT.instagram.elco.url} target="_blank" rel="noopener noreferrer" className={cn(textLink, "text-[15px]")}><Instagram size={16} aria-hidden="true" />{RECRUITMENT.instagram.elco.handle}</a>
              </div>
            </li>
            <li className="rounded-[24px] bg-white p-7">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-bold text-white", NIGHT)}>3</span>
              <h3 className={cn(h3, "mt-5")}>Fill in the application</h3>
              <p className={cn(body, "mt-2 text-[15px]")}>Choose up to two roles, add your Instagram and LinkedIn, a short motivation, your CV and portfolio. Your progress is saved, and you can follow your status after you submit.</p>
            </li>
            <li className={cn("flex flex-col justify-between gap-5 rounded-[24px] p-7 text-white lg:col-span-2", NIGHT)} data-testid={open ? "apply-open" : phase === "upcoming" ? "apply-upcoming" : "apply-closed"}>
              {phase === "closed" ? (
                <div>
                  <p className="text-[20px] font-bold">Applications for 2027 are closed</p>
                  <p className="mt-2 text-[15px] text-white/75">We&apos;ll email you when the next intake opens. This isn&apos;t an application.</p>
                  <div className="mt-5 rounded-[18px] bg-white p-5 text-[#1A2534]">
                    <InquiryForm kind="careers" fields={["organization", "topic", "message"]}
                      labels={{ organization: "University (optional)", topic: "Division you're most interested in", message: "Anything you'd like us to know (optional)" }}
                      topics={[...divisions.map((d) => ({ value: d.slug, label: d.title })), { value: "unsure", label: "Not sure yet" }]}
                      submitLabel="Keep me posted" successTitle="You're on our list" successText="We'll email you when the next intake opens." />
                  </div>
                </div>
              ) : phase === "upcoming" ? (
                <div>
                  <p className="text-[20px] font-bold">Applications open on {RECRUITMENT.opensLabel}</p>
                  <p className="mt-2 text-[15px] text-white/75">Until {RECRUITMENT.closesLabel}, 23:59 WIB. Leave your email and we&apos;ll remind you the day it opens.</p>
                  <div className="mt-5 rounded-[18px] bg-white p-5 text-[#1A2534]">
                    <InquiryForm kind="careers" fields={["organization", "topic"]}
                      labels={{ organization: "University (optional)", topic: "Division you're most interested in" }}
                      topics={[...divisions.map((d) => ({ value: d.slug, label: d.title })), { value: "unsure", label: "Not sure yet" }]}
                      submitLabel="Remind me" successTitle="We'll remind you" successText={`We'll email you when applications open on ${RECRUITMENT.opensLabel}.`} />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[22px] font-bold sm:text-[26px]">Find your role. <span className="text-[#F9E15B]">Join the team.</span></p>
                    <p className="mt-2 text-[15px] text-white/75">Applications close on {RECRUITMENT.closesLabel} at 23:59 WIB.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link href={APPLY_PATH} className={btnButter} data-testid="careers-apply-bottom">Apply now <ArrowRight size={18} aria-hidden="true" /></Link>
                    <Link href={`/sign-up?next=${encodeURIComponent(APPLY_PATH)}`} className={btnGhost} data-testid="careers-create-pass">Create your Elco-Pass</Link>
                  </div>
                </>
              )}
            </li>
          </ol>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="bg-white py-[64px] md:py-[96px]" aria-labelledby="timeline">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>Timeline</p>
            <h2 id="timeline" className={cn(h2, "mt-3")}>From application to your first cycle</h2>
            <p className={cn(lead, "mt-4")}>All dates are 2026 unless marked otherwise. There is a holiday break from 21 December to 3 January.</p>
          </div>
          <ol className="relative space-y-6 border-l border-[#E6E9EE] pl-7" data-testid="recruitment-timeline">
            {RECRUITMENT.timeline.map(([date, t, d], i) => (
              <li key={t} className="relative">
                <span className={cn("absolute -left-[33px] top-1.5 h-3 w-3 rounded-full border-2 border-white ring-1", i === 0 ? "bg-[#F9E15B] ring-[#1A2534]" : "bg-[#2F4157] ring-[#2F4157]")} aria-hidden="true" />
                <p className="text-[14px] font-semibold text-[#577E90]">{date}</p>
                <p className="text-[17px] font-bold text-[#1A2534]">{t}</p>
                <p className={cn(body, "mt-1 text-[15px]")}>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The campaign (approved MKT-0008 slides) ── */}
      <section className={cn(MIST, "py-[64px] md:py-[88px]")} aria-labelledby="campaign-h">
        <div className={container}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-[640px]">
              <p className={eyebrow}>The campaign</p>
              <h2 id="campaign-h" className={cn(h2, "mt-3")}>Seen it on Instagram?</h2>
              <p className={cn(lead, "mt-3")}>The 2027 Team Recruitment carousel on {RECRUITMENT.instagram.ielsco.handle}. Share it with a friend who&apos;d thrive here.</p>
            </div>
            <a href={RECRUITMENT.instagram.campaignPostUrl ?? RECRUITMENT.instagram.ielsco.url} target="_blank" rel="noopener noreferrer" className={btnSecondary}><Instagram size={18} aria-hidden="true" /> Open on Instagram</a>
          </div>
        </div>
        <ul className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(2rem,calc((100vw-1180px)/2+2rem))]" data-testid="campaign-slides" aria-label="Campaign carousel slides">
          {SLIDES.map((s) => (
            <li key={s.n} className="relative aspect-[4/5] w-[240px] shrink-0 snap-start overflow-hidden rounded-[18px] bg-white shadow-[0_10px_30px_rgba(26,37,52,0.08)] sm:w-[300px]">
              <Image src={`/images/careers/2027/campaign/slide-${s.n}.webp`} alt={s.alt} fill sizes="300px" className="object-cover" />
            </li>
          ))}
        </ul>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-[64px] md:py-[96px]" aria-labelledby="faq">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16")}>
          <div>
            <h2 id="faq" className={h2}>Questions</h2>
            <p className={cn(body, "mt-4")}>Anything else? <a className="font-semibold underline" href="mailto:careers@ielsco.com">careers@ielsco.com</a></p>
          </div>
          <Faq items={[
            { q: "Is this a paid job?", a: "No. It's a volunteer career development and learning program with no fixed monthly salary. Members can earn performance-based allowances, profit-sharing, referral and sponsorship incentives, and paid UGC work, depending on performance, participation, available budgets and program terms." },
            { q: "Why do I need an account to apply?", a: "You apply with your Elco-Pass, the one account for IELSco and Elco AI. It keeps your application in one place: your progress is saved, and you can follow your status and the campaign-task checks after you submit. If you already have an IELSco account, just sign in." },
            { q: "Can I apply for more than one role?", a: "Yes, up to two roles, chosen by position. They can be in different divisions. Put the one you want most first." },
            { q: "Do I need perfect English?", a: "No, and there's no minimum score. You'll work in English every week, and the program is designed to help you improve toward at least B2." },
            { q: "Do I need to send screenshots of the Instagram tasks?", a: "No. Our recruitment team checks them by hand on Instagram using the profile link in your application, so keep your account public and your Story up until results are out." },
            { q: "Can I change my application after submitting?", a: "Yes, while applications are open and before review starts. Open your application from the dashboard and choose Change application." },
            { q: "What happens after I apply?", a: "On 30 November everyone with a complete application gets the group-session schedule by email. Sessions run 1–4 December and decisions are sent on 9 December." },
            { q: "Can I apply if I'm in my final year or have graduated?", a: "This recruitment is for 1st to 3rd-year students. Final-year students and fresh graduates can email arbadza@ielsco.com or careers@ielsco.com about international career opportunities, which IELSco plans to start sharing in January 2027." },
          ]} />
        </div>
      </section>

      {/* ── Closing CTA (MKT-0008 slide 11) ── */}
      {phase !== "closed" && (
        <section className={cn(NIGHT, "relative overflow-hidden text-white")} aria-labelledby="close-h">
          <div className={cn(container, "grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1fr_1fr]")}>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[24px]">
              <Image src="/images/careers/2027/team-cafe.webp" alt="IELSco team members together outside a café" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover grayscale" />
              <YouTag className="absolute bottom-4 right-4" />
            </div>
            <div>
              <h2 id="close-h" className="text-[34px] font-extrabold leading-[1.08] sm:text-[44px]">Find your role.<br /><span className="text-[#F9E15B]">Join the team.</span></h2>
              <p className="mt-4 text-[17px] text-white/80">Applications {phase === "open" ? `close on ${RECRUITMENT.closesLabel}, 23:59 WIB` : `open on ${RECRUITMENT.opensLabel}`}. For 1st–3rd year university students.</p>
              <Link href={applyHref} className={cn(btnButter, "mt-7")} data-testid="careers-cta-close">{applyLabel} <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
}

