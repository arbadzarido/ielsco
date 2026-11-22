import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, Check } from "lucide-react";
import Footer from "@/components/footer";
import { Faq } from "@/components/site/Faq";
import { body, btnAccent, btnPrimary, btnSecondary, card, container, eyebrow, h1, h2, h3, lead, section, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { pageMetadata } from "@/lib/seo";
import { idr } from "@/lib/format";
import { ELCO_MASCOT, elcoHref } from "@/lib/elco";
import { SINGLE_SESSION_IDR, ELCO_STARTER_MONTHLY_IDR, MENTOR_FULL_TITLE, MENTOR_TITLE, TUTORING_PACKAGES, depositRequestUrl, generalRequestUrl, packageMath, packageRequestUrl } from "@/components/tutoring/packages";
import { buildSchedule, depositAllowed } from "@/lib/tutoring/payments";
import { tutorRequestUrl } from "@/components/tutoring/links";

export const metadata: Metadata = pageMetadata({
  title: "Private English tutoring with Elco AI and IELS Circle | IELSco",
  description: "Learn English with AI, community and a mentor. Private tutoring packages with Arbadza Rido, one month of Elco AI and IELS Circle access, for IELTS, TOEFL ITP, TOEIC, speaking, writing and career English.",
  path: "/products/courses",
});

// Page structure: hero, the three-part experience, what you get, packages, mentor, goals, how it works, FAQ, final CTA.
// Package prices are PROPOSED and live in src/components/tutoring/packages.ts; they need founder approval before release.

const THREE = [
  { key: "ai", label: "Learn with Elco AI", title: "Practise every day, on your own time", text: "Speaking and writing practice, grammar and vocabulary, with AI feedback, plus preparation for IELTS, TOEFL ITP and TOEIC. Your daily companion between sessions.", icon: "mascot" },
  { key: "community", label: "Learn with IELS Circle", title: "Speak with people who are learning too", text: "Practise English with other learners, build confidence through peer interaction and meet ambitious people from an international-minded community.", icon: "photo" },
  { key: "mentor", label: "Learn with a mentor", title: "Get one-to-one guidance from a real person", text: "Direct correction and explanations, a plan that targets your gaps, and someone who keeps you accountable. This is the part that turns practice into progress.", icon: "arba" },
] as const;

const GOALS: { title: string; who: string; work: string[] }[] = [
  { title: "IELTS · TOEFL ITP · TOEIC", who: "Anyone who needs a test score", work: ["Format, scoring and time management", "Writing, speaking and reading strategies", "Mock tasks with detailed feedback"] },
  { title: "Speaking & Fluency", who: "People who understand English but hesitate to speak", work: ["Pronunciation and natural flow", "Interview and meeting English", "Thinking in English, with less translating"] },
  { title: "Grammar Mastery", who: "Learners who keep repeating the same mistakes", work: ["A personal error log", "Tenses, articles, conditionals and more", "Accuracy for writing and tests"] },
  { title: "Academic Writing", who: "Students writing essays, reports and papers", work: ["Essay structure and argument", "Paraphrasing and academic style", "Editing and proofreading"] },
  { title: "Scholarship Essays", who: "Applicants to LPDP, Chevening, DAAD and similar programs", work: ["Motivation letters and personal statements", "Tailoring to each program", "Interview preparation"] },
  { title: "Career English & Work Abroad", who: "Professionals aiming for international roles", work: ["CVs, cover letters and LinkedIn", "International job interviews", "Email and meetings in global teams"] },
];

const STEPS = [
  ["Choose your package", "Pick the number of sessions that fits your goal and timeline. Not sure? Growth suits most people."],
  ["Message us on WhatsApp", "Tap the button on your package. The message is prefilled; add your goal and level."],
  ["Confirm goals, schedule and payment", "The IELSco team replies with times and the payment schedule (bank transfer). Once you agree and your first payment is verified, your sessions are scheduled and your Elco AI month is activated."],
  ["Start learning", "Sign in to your tutoring dashboard to complete your goals and request your first session. Meet your mentor online, practise with Elco AI between sessions, and join IELS Circle."],
];

const FAQS: { q: string; a: string }[] = [
  { q: "What is included in every package?", a: "Private one-to-one sessions with Arbadza Rido, one month of Elco AI (Starter) access, IELS Circle community access, and personalised feedback and learning direction." },
  { q: "How does the free Elco AI access work?", a: `Every package includes one month of Elco AI Starter, which normally costs ${idr(ELCO_STARTER_MONTHLY_IDR)} per month. The IELSco team activates it for you after your booking is confirmed.` },
  { q: "Do I need prior English experience?", a: "No. Tell us your level and goal when you message us and your mentor will start from where you are. If you are a complete beginner, say so and we will advise you honestly on whether this is the right fit." },
  { q: "Can I choose my own learning goals?", a: "Yes. IELTS, TOEFL ITP or TOEIC, speaking, grammar, academic writing, scholarship essays or career English. You confirm your goal with the team before the first session." },
  { q: "Are sessions conducted online?", a: "Yes, sessions are held online." },
  { q: "Can I prepare for IELTS or TOEFL?", a: "Yes. Test preparation is one of the main focus areas. Elco AI also has IELTS, TOEFL ITP and TOEIC practice. We do not guarantee a score; results depend on your effort and the test." },
  { q: "How do I schedule sessions?", a: "After you message us on WhatsApp, the team confirms your schedule with you. If you need to move a session, tell us in advance and we will find another time." },
  { q: "What happens when my Elco AI access expires?", a: "Your Elco account stays, on the free plan. You can subscribe to Elco Starter or Pro on the Elco pricing page if you want to continue. Your IELSco account, the free IELS Circle open sessions and your tutoring package are not affected." },
  { q: "Can I purchase additional tutoring sessions?", a: `Yes. You can add more sessions after a package, or request a single session at ${idr(SINGLE_SESSION_IDR)}, through WhatsApp.` },
  { q: "How do I pay?", a: "By bank transfer. Every package can be paid in full upfront, and your package is activated once we verify the payment. For packages of more than 4 sessions (currently Intensive), there is also a deposit arrangement, described under the packages. The team confirms the exact payment schedule with you and gets your agreement before your booking is confirmed." },
  { q: "How does the deposit arrangement work?", a: `It is available only for packages of more than 4 sessions. You pay 50% before your first session is scheduled, 25% after your second completed session, and the final 25% before your last two sessions, or before your exam or application deadline if that comes first. The total price is the same as paying in full; a deposit is not a discount. Your next sessions are scheduled once each payment is verified.` },
  { q: "Do you guarantee a score or a scholarship?", a: "No. We teach, practise and give feedback; results depend on you and on the test or program." },
];

export default function CoursesPage() {
  const intensive = TUTORING_PACKAGES.find((p) => p.sessions > 4)!;
  const intensiveSchedule = { total: intensive.priceIdr, rows: buildSchedule({ totalIdr: intensive.priceIdr, sessions: intensive.sessions, option: "deposit" }) };
  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="courses-page">
      {/* 1. Hero */}
      <section className="bg-white pb-[48px] pt-[40px] md:pb-[72px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>IELSco Private Tutoring</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Learn English with AI, Community &amp; Personal Mentorship.</h1>
            <p className={cn(lead, "mt-6 max-w-[600px]")}>
              Daily practice with Elco AI. A supportive English community in IELS Circle. One-to-one guidance from a real
              mentor. Every package includes all three, so your English does not stop when the lesson ends.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#packages" className={btnPrimary} data-testid="hero-primary-cta">Explore packages</a>
              <a href="#mentor" className={btnSecondary}>Meet your mentor</a>
            </div>
            <p className="mt-5 text-[14px] text-[#2F4157]/65">Includes one month of Elco AI. Online sessions. Booked through WhatsApp.</p>
          </div>

          <div className={cn(card, "p-5 sm:p-6")} aria-label="What every package includes">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#577E90]">In every package</p>
            <ul className="mt-4 divide-y divide-[#E6E9EE]">
              <li className="flex items-center gap-4 py-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EEF2F7]"><Image src={ELCO_MASCOT} alt="" width={38} height={38} /></span>
                <div><p className="text-[17px] font-bold">1 month of Elco AI</p><p className="text-[14px] text-[#2F4157]/70">Daily practice and AI feedback</p></div>
              </li>
              <li className="flex items-center gap-4 py-4">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EEF2F7]"><Image src="/images/site/discussion.webp" alt="" fill sizes="56px" className="object-cover" /></span>
                <div><p className="text-[17px] font-bold">IELS Circle access</p><p className="text-[14px] text-[#2F4157]/70">Practise with other learners</p></div>
              </li>
              <li className="flex items-center gap-4 py-4">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EEF2F7]"><Image src="/images/people/leadership/arbadza.png" alt="" fill sizes="56px" className="object-cover object-top mix-blend-multiply" /></span>
                <div><p className="text-[17px] font-bold">Sessions with Arbadza Rido</p><p className="text-[14px] text-[#2F4157]/70">IELTS 8.0 · TOEFL ITP 610</p></div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Three-part experience */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="three">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>One learning experience</p>
            <h2 id="three" className={cn(h2, "mt-3")}>Classes alone are not enough. Practice, people and a guide are.</h2>
            <p className={cn(lead, "mt-4")}>You do not have to rely on a single way of learning. Each part covers what the others cannot.</p>
          </div>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {THREE.map((t, i) => (
              <li key={t.key} className="border-t-2 border-[#2F4157] pt-6">
                <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#E56668]">0{i + 1} · {t.label}</p>
                <h3 className={cn(h3, "mt-3 text-[22px]")}>{t.title}</h3>
                <p className={cn(body, "mt-3 text-[16px]")}>{t.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. What you get */}
      <section className="border-t border-[#E6E9EE] bg-[#F8FAFC] py-[64px] md:py-[96px]" aria-labelledby="get">
        <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>What you get</p>
            <h2 id="get" className={cn(h2, "mt-3")}>Everything in one package</h2>
            <p className={cn(lead, "mt-4")}>
              Elco AI is not an add-on we mention. It is your practice partner between sessions, and every package
              starts with a full month of it.
            </p>
            <a href={elcoHref("tutoring-what-you-get")} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157] underline-offset-4 hover:text-[#E56668] hover:underline">
              See Elco AI <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <ul className="divide-y divide-[#E6E9EE] rounded-[20px] border border-[#E6E9EE] bg-white">
            {[
              ["Private sessions with Arbadza Rido", "One-to-one, online. Correction, explanations and a plan built around your goal.", `${idr(SINGLE_SESSION_IDR)} each when bought alone`],
              ["1 month of Elco AI (Starter)", "Daily speaking, writing, grammar and vocabulary practice, IELTS, TOEFL ITP and TOEIC preparation, and progress tracking.", `${idr(ELCO_STARTER_MONTHLY_IDR)} value, included`],
              ["IELS Circle community access", "Practise English with other learners. The Elco Starter month adds the IELS Circle speaking club, 12 sessions a month, once you link your accounts.", "Included"],
              ["Personalised feedback and direction", "Your mentor tells you what to fix first and what to practise before the next session.", "Included"],
            ].map(([t, d, v]) => (
              <li key={t} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6">
                <div><p className="text-[17px] font-bold">{t}</p><p className={cn(body, "mt-1 text-[15px]")}>{d}</p></div>
                <p className="shrink-0 text-[14px] font-semibold text-[#2D7A58] sm:text-right sm:pt-1">{v}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Packages */}
      <section id="packages" className={cn(section, "scroll-mt-20 border-t border-[#E6E9EE]")} aria-labelledby="packages-h">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>Packages</p>
            <h2 id="packages-h" className={cn(h2, "mt-3")}>Choose how far you want to go</h2>
            <p className={cn(lead, "mt-4")}>Every package includes one month of Elco AI, IELS Circle access and personal sessions with Arbadza Rido.</p>
          </div>
          <ul className="mt-12 grid gap-6 md:grid-cols-3 md:items-stretch" data-testid="packages">
            {TUTORING_PACKAGES.map((p) => {
              const m = packageMath(p);
              return (
                <li key={p.id} data-testid={`package-${p.id}`} className={cn(card, "relative flex flex-col p-7", p.recommended && "order-first border-2 border-[#2F4157] shadow-[0_16px_40px_rgba(26,37,52,0.10)] md:order-none")}>
                  {p.recommended && <span className="absolute -top-3 left-7 rounded-full bg-[#E56668] px-3 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-white">Recommended</span>}
                  <h3 className={cn(h3, "text-[24px]")}>{p.name}</h3>
                  <p className="mt-1 min-h-[44px] text-[15px] text-[#2F4157]/70">{p.tagline}</p>
                  <p className="mt-5 text-[40px] font-extrabold leading-none tracking-[-0.02em] text-[#1A2534]">{idr(p.priceIdr)}</p>
                  <p className="mt-2 text-[15px] font-semibold text-[#2F4157]">{idr(m.perSessionIdr)} per session</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {[`${p.sessions} private sessions with Arbadza Rido`, "1 month of Elco AI included", "IELS Circle access included", "Personalised feedback and learning plan"].map((t) => (
                      <li key={t} className="flex gap-2.5 text-[15px] leading-snug text-[#2F4157]"><Check size={17} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{t}</li>
                    ))}
                  </ul>
                  <div className="mt-6 rounded-[14px] bg-[#F1F4F8] p-4 text-[14px] leading-snug text-[#2F4157]">
                    <p className="font-semibold text-[#1A2534]">You save {idr(m.savingsIdr)}</p>
                    <p className="mt-1 text-[#2F4157]/75">Bought separately: {p.sessions} sessions {idr(m.sessionsAtListIdr)} + Elco AI month {idr(ELCO_STARTER_MONTHLY_IDR)} = {idr(m.separateTotalIdr)}</p>
                  </div>
                  <a href={packageRequestUrl(p)} target="_blank" rel="noopener noreferrer" className={cn(p.recommended ? btnAccent : btnPrimary, "mt-6")} data-testid={`package-cta-${p.id}`}>
                    Choose {p.name} <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                  {depositAllowed(p.sessions) && (
                    <a href={depositRequestUrl(p)} target="_blank" rel="noopener noreferrer" className="mt-3 text-center text-[14px] font-semibold text-[#2F4157] underline underline-offset-4 hover:text-[#E56668]" data-testid={`package-deposit-${p.id}`}>
                      Prefer a deposit arrangement? Ask us
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-10 grid gap-6 rounded-[20px] border border-[#E6E9EE] bg-[#F8FAFC] p-6 md:grid-cols-2 md:p-8" data-testid="payment-options">
            <div>
              <h3 className={cn(h3, "text-[20px]")}>Pay in full</h3>
              <p className={cn(body, "mt-2 text-[15px]")}>Available for every package. Pay by bank transfer and your package is activated once the payment is verified.</p>
            </div>
            <div>
              <h3 className={cn(h3, "text-[20px]")}>Deposit arrangement for longer packages</h3>
              <p className={cn(body, "mt-2 text-[15px]")}>For packages of more than 4 sessions, you can secure your package and schedule with a deposit and pay the balance in two milestones. The total price stays the same. For Intensive ({idr(intensiveSchedule.total)}):</p>
              <ol className="mt-3 space-y-1.5 text-[15px] text-[#2F4157]">
                {intensiveSchedule.rows.map((m) => (
                  <li key={m.kind}><b>{idr(m.amountIdr)}</b> ({m.pct}%): {m.trigger.toLowerCase()}</li>
                ))}
              </ol>
              <p className="mt-3 text-[14px] text-[#2F4157]/70">Your next sessions are scheduled once each payment is verified. We confirm this schedule with you before your booking is confirmed.</p>
            </div>
          </div>
          <p className="mt-8 text-[15px] text-[#2F4157]/75">
            Just want to try one session first? You can still request a single session at {idr(SINGLE_SESSION_IDR)}.{" "}
            <a href={tutorRequestUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2F4157] underline underline-offset-4 hover:text-[#E56668]">Request one session</a>
          </p>
        </div>
      </section>

      {/* 5. Mentor */}
      <section id="mentor" className="scroll-mt-20 border-t border-[#E6E9EE] bg-[#F8FAFC] py-[64px] md:py-[96px]" aria-labelledby="mentor-h">
        <div className={cn(container, "grid items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16")}>
          <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[24px] border border-[#E6E9EE] bg-[#EEF2F7] lg:max-w-none">
            <div className="relative aspect-square">
              <Image src="/images/people/leadership/arbadza.png" alt="Arbadza Rido, Lead English Mentor and Founder of IELSco and Elco AI" fill sizes="(min-width: 1024px) 460px, 90vw" className="object-cover object-top mix-blend-multiply" />
            </div>
          </div>
          <div>
            <p className={eyebrow}>Meet your mentor</p>
            <h2 id="mentor-h" className={cn(h2, "mt-3")}>Arbadza Rido</h2>
            <p className="mt-2 text-[18px] font-semibold text-[#2F4157]" data-testid="mentor-title">{MENTOR_TITLE}</p>
            <p className="sr-only">{MENTOR_FULL_TITLE}</p>
            <dl className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-[16px] border border-[#E6E9EE] bg-white p-5"><dt className="text-[14px] font-semibold text-[#577E90]">IELTS Academic</dt><dd className="mt-1 text-[40px] font-extrabold leading-none text-[#1A2534]">8.0</dd><dd className="mt-1 text-[13px] text-[#2F4157]/65">Band score</dd></div>
              <div className="rounded-[16px] border border-[#E6E9EE] bg-white p-5"><dt className="text-[14px] font-semibold text-[#577E90]">TOEFL ITP</dt><dd className="mt-1 text-[40px] font-extrabold leading-none text-[#1A2534]">610</dd><dd className="mt-1 text-[13px] text-[#2F4157]/65">Score</dd></div>
            </dl>
            <ul className="mt-6 space-y-3">
              {["Teaching experience across Southeast Asia", "Founder of IELSco, an English learning community", "Founder of Elco AI, an AI-powered English learning platform"].map((t) => (
                <li key={t} className="flex gap-3 text-[16px] leading-snug text-[#2F4157]"><Check size={19} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{t}</li>
              ))}
            </ul>
            <p className={cn(body, "mt-6 max-w-[560px]")}>
              You learn directly from the person who built the community and the platform you will be practising on, and who
              teaches IELTS, TOEFL ITP and TOEIC preparation, grammar, speaking, academic and professional writing, scholarship
              essays and career English.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Goals */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="goals">
        <div className={container}>
          <div className="max-w-[720px]">
            <p className={eyebrow}>What can you learn?</p>
            <h2 id="goals" className={cn(h2, "mt-3")}>One service, six learning goals</h2>
            <p className={cn(lead, "mt-4")}>Tell us what you are working towards. Your sessions are built around it.</p>
          </div>
          <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {GOALS.map((g) => (
              <li key={g.title} className="border-t border-[#D5DBE3] pt-5">
                <h3 className={cn(h3, "text-[20px]")}>{g.title}</h3>
                <p className="mt-1 text-[15px] text-[#577E90]">{g.who}</p>
                <ul className="mt-4 space-y-2">
                  {g.work.map((w) => <li key={w} className="flex gap-2.5 text-[15px] leading-snug text-[#2F4157]/85"><Check size={16} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{w}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7. How it works */}
      <section className="border-t border-[#E6E9EE] bg-[#F8FAFC] py-[64px] md:py-[96px]" aria-labelledby="how">
        <div className={container}>
          <p className={eyebrow}>How it works</p>
          <h2 id="how" className={cn(h2, "mt-3 max-w-[640px]")}>From message to first session</h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F4157] text-[15px] font-bold text-white">{i + 1}</span>
                <p className="mt-4 text-[18px] font-bold text-[#1A2534]">{t}</p>
                <p className={cn(body, "mt-1.5 text-[15px]")}>{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 text-[16px] text-[#2F4157]/80">Already booked and paid? <a href="/dashboard/tutoring" className="font-semibold text-[#2F4157] underline underline-offset-4 hover:text-[#E56668]" data-testid="open-dashboard">Open your tutoring dashboard</a>.</p>
        </div>
      </section>

      {/* 8. FAQ */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="faq">
        <div className={cn(container, "max-w-[860px]")}>
          <h2 id="faq" className={h2}>Questions</h2>
          <Faq className="mt-8" items={FAQS} />
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="bg-white pb-[64px] md:pb-[96px]" aria-labelledby="final">
        <div className={container}>
          <div className="rounded-[28px] bg-[#1A2534] px-6 py-12 text-center sm:px-12 md:py-16">
            <h2 id="final" className="text-[32px] font-extrabold leading-[1.12] tracking-[-0.015em] text-white sm:text-[44px]">Stop learning English alone.</h2>
            <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-[1.6] text-white/75">
              Build your English with the right tools, the right people and the right guidance.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#packages" className={btnAccent}>Choose your package</a>
              <a href={generalRequestUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full border border-white/30 px-6 text-[16px] font-semibold text-white transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                Ask us on WhatsApp <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
