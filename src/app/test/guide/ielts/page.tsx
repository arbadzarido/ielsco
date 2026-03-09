"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import { useEffect, useState } from "react";
import Link from "next/link";
import { VALID_CODES } from "@/data/test/codes";
import { Button } from "@/components/ui/button";

type CurriculumItem = {
  date: string;
  title: string;
  desc: string;
  output: string;
};

const curriculum: CurriculumItem[] = [
  {
    date: "Before Jan 10, 2026",
    title: "Onboarding & Access Preparation",
    desc: "Participants receive their personal access code, guidebook, and full batch timeline. This phase ensures clarity, readiness, and confidence before starting the test.",
    output: "Clear understanding of flow, rules, and expectations.",
  },
  {
    date: "10 Jan 2026",
    title: "Pre-Test (Baseline Assessment)",
    desc: "IELTS-style mock test covering Listening, Reading, and Writing to measure your current proficiency as a baseline for improvement.",
    output: "Baseline IELTS band score & skill breakdown.",
  },
  {
    date: "After Pre-Test",
    title: "Score Feedback & Personal Insight",
    desc: "AI-powered score report combined with human insight to identify strengths, weaknesses, and the gap toward your target band.",
    output: "Personalized improvement focus & band gap clarity.",
  },
  {
    date: "13 Jan 2026",
    title: "MasterClass 1 — IELTS Foundations & Band Strategy",
    desc: "Deep understanding of IELTS structure, band descriptors, and how examiners score. Participants build a realistic improvement roadmap.",
    output: "Personal IELTS Improvement Map.",
  },
  {
    date: "17 Jan 2026",
    title: "MasterClass 2 — Listening & Reading Strategies",
    desc: "Score-oriented techniques for accuracy, speed, and time management. Learn how to avoid traps and careless mistakes.",
    output: "Listening & Reading strategy checklist.",
  },
  {
    date: "20 Jan 2026",
    title: "MasterClass 3 — Writing Task 1 & Task 2",
    desc: "Learn examiner-friendly writing structures, idea development, and sentence upgrading for higher band scores.",
    output: "Writing frameworks & personal checklist.",
  },
  {
    date: "24 Jan 2026",
    title: "MasterClass 4 — Speaking Confidence & Psychology",
    desc: "Build natural fluency, confidence, and clarity for the speaking test through structured frameworks and live practice.",
    output: "Speaking answer framework & confidence strategies.",
  },
  {
    date: "27 Jan 2026",
    title: "Speaking Mock Test",
    desc: "Realistic IELTS-style speaking simulation with structured questions and examiner-style feedback.",
    output: "Speaking performance feedback.",
  },
  {
    date: "31 Jan 2026",
    title: "Post-Test (Final Assessment)",
    desc: "Participants retake the test to clearly compare Pre-Test and Post-Test performance and measure real progress.",
    output: "Pre vs Post score comparison & improvement highlight.",
  },
  {
    date: "7 Feb 2026",
    title: "Certification & Next Steps",
    desc: "Official certificate issuance, recognition of improvement, and guidance toward next opportunities.",
    output: "IELS Test Certificate & future pathway clarity.",
  },
];

type CodeEntry = {
  code: string;
  used: boolean;
  name?: string;
  email?: string;
};

const codes: CodeEntry[] = (VALID_CODES as unknown) as CodeEntry[];

const DEADLINE = new Date("2026-01-05T23:59:59+07:00");

function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<number>(
    DEADLINE.getTime() - new Date().getTime()
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(DEADLINE.getTime() - new Date().getTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (timeLeft <= 0) {
    return <span className="text-[#E56668] font-bold">Registration Closed</span>;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="flex gap-3 text-center justify-center text-white">
      {[["Days", days], ["Hours", hours], ["Min", minutes], ["Sec", seconds]].map(
        ([label, value]) => (
          <div key={label} className="bg-[#294154] rounded-xl px-4 py-2">
            <div className="text-2xl font-extrabold">{value}</div>
            <p className="text-xs uppercase tracking-wide text-white">
              {label}
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default function IELTSGuidePage() {
  const formUrl = "https://forms.gle/yFCdzbeR8uMBzM5X8"; // Replace with actual form link

  // ----- Access code state & validation -----
  const [accessCode, setAccessCode] = useState("");
  const [validation, setValidation] = useState<
    { status: "valid" | "used" | "invalid" } | null
  >(null);

function validateCode() {
  const codeValue = accessCode.trim().toUpperCase();
  if (!codeValue) {
    setValidation({ status: "invalid" });
    return;
  }

  const found = codes.find((item) => item.code === codeValue);

  if (!found) {
    setValidation({ status: "invalid" });
    return;
  }

  if (found.used) {
    setValidation({ status: "used" });
    return;
  }

  setValidation({ status: "valid" });
}
  return (
    <div className="min-h-screen bg-white text-[#294154] antialiased">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12 lg:py-20 space-y-12">
        {/* HERO */}
        <section className="p-8 lg:p-12 ">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight text-center">
                IELTS-style Mock Test by IELS
              </h1>
              <p className="mt-3 text-gray-700 justify-center text-center">
                The IELS Mock Test helps you measure your English proficiency with real test standards — 
                combining AI-powered scoring and expert tutor feedback.  
                Experience how the real IELTS feels, but more affordable and accessible anywhere.
              </p>
                  {/* COUNTDOWN (TOP) */}
    <div className="mt-10">
      <p className="text-sm text-center uppercase tracking-widest text-[#294154] mb-3">
        Registration closes in
      </p>
      <CountdownTimer />
    </div>
<div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild className="bg-[#E56668] text-white font-semibold px-6 py-3 hover:bg-[#C04C4E]">
                              <Link
                              href={formUrl}
                              target="https://forms.gle/yFCdzbeR8uMBzM5X8"
                              rel="noopener noreferrer"
                            >
                              Register for IELTS Mock Test
                            </Link></Button>
              
                            <Button asChild className="bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f]"><Link
                              href="https://drive.google.com/file/d/1h2IPjkahj1yKqU1_pK0T3L1cYAMz2pQk/view?usp=drive_link"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Read Full IELTS Overview
                            </Link></Button>
            
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT IELTS */}
        <section className="bg-white rounded-2xl p-8 shadow-sm border border-[#294154]/10">
          <h2 className="text-2xl font-bold mb-4">What Is IELTS?</h2>
          <p className="text-gray-700 mb-3">
            IELTS (International English Language Testing System) is the world&apos;s most recognized English proficiency test. 
            It measures your ability to communicate effectively in English across <strong>four key skills:</strong>
          </p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1 mb-4">
            <li><strong>Listening</strong> — understand ideas and details from audio clips or conversations.</li>
            <li><strong>Reading</strong> — comprehend academic and general English texts.</li>
            <li><strong>Writing</strong> — respond to visual data and express arguments in essay form.</li>
            <li><strong>Speaking</strong> — hold a conversation fluently and naturally with an examiner.</li>
          </ul>
          <p className="text-gray-700 mb-2">
            The IELS Mock Test follows the same structure — offering a realistic practice experience with accurate scoring and personalized feedback.
          </p>
        </section>

{/* ===== IELTS TEST CURRICULUM & TIMELINE ===== */}
<section className="py-20 overflow-hidden">
  {/* HEADER */}
  <div className="text-center mb-12 px-6">
    <h2 className="text-3xl font-extrabold text-[#2F4157] mb-3">
      IELTS Test Curriculum & Timeline
    </h2>
    <p className="text-gray-600 max-w-2xl mx-auto">
      A structured, batch-based journey designed to measure your progress,
      strengthen key IELTS skills, and build real confidence for the test.
    </p>
  </div>

  {/* OUTER FRAME */}
  <div className="relative max-w-[1400px] mx-auto">
    {/* TRACK */}
    <div
      className="
        absolute left-0 right-0 top-1/2
        h-[6px]
       
        rounded-full
        -translate-y-1/2
      "
    />

    {/* GRADIENT FADE */}
    <div className="pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-[#F7F8FA] to-transparent z-10" />
    <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-[#F7F8FA] to-transparent z-10" />

    {/* SCROLL AREA */}
    <div className="overflow-x-auto scrollbar-none px-12">
      <div className="flex gap-8 w-max py-6 mx-auto">
        {curriculum.map((item, i) => (
          <div
            key={i}
            className="
              relative min-w-[300px] max-w-[300px]
              rounded-3xl bg-white p-6
              border border-gray-200
              transition-all duration-300
              hover:shadow-xl hover:-translate-y-1
            "
          >
            <p className="text-sm font-semibold text-[#E56668] mb-2">
              {item.date}
            </p>

            <h3 className="text-lg font-bold text-[#2F4157] mb-3">
              {item.title}
            </h3>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {item.desc}
            </p>

            <div className="text-sm font-semibold text-[#2F4157]">
              Output:
              <span className="block mt-1 font-normal text-gray-600">
                {item.output}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>
{/* ===== FEEDBACK & INSIGHT ===== */}
<section className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-[#294154]/10">
  {/* HEADER */}
  <div className="mb-8 max-w-3xl">
    <h2 className="text-2xl md:text-3xl font-extrabold text-[#294154] mb-3">
      More Than Just a Score
    </h2>
    <p className="text-gray-700 leading-relaxed">
      Your IELTS result is treated as a <b>diagnostic tool</b>, not a verdict.
      Every participant receives personalized insight designed to guide
      real, measurable improvement.
    </p>
  </div>

  {/* CONTENT GRID */}
  <div className="grid gap-6 sm:grid-cols-2">
    {[
      {
        title: "Fast & Accurate Scoring",
        desc: "AI-powered scoring delivered quickly after your test — aligned with real IELTS band descriptors.",
      },
      {
        title: "Human Insight Included",
        desc: "Your score is reviewed and enriched with human insight on strengths, weaknesses, and patterns.",
      },
      {
        title: "Clear Band Gap Explanation",
        desc: "Understand exactly where you stand today and what separates you from your target band.",
      },
      {
        title: "Personalized Focus Area",
        desc: "Actionable recommendation on what to prioritize during MasterClass and self-practice.",
      },
    ].map((item, i) => (
      <div
        key={i}
        className="
          relative rounded-2xl bg-[#F7F8FA] p-6
          border border-gray-100
          transition-all duration-300
          hover:shadow-md
        "
      >
        {/* ACCENT BAR */}
        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-[#E56668]" />

        <div className="pl-4">
          <h3 className="font-bold text-[#294154] mb-1">
            {item.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {item.desc}
          </p>
        </div>
      </div>
    ))}
  </div>

  {/* QUOTE */}
  <div className="mt-10 text-sm italic text-gray-600 max-w-2xl">
    “You&apos;re not just scored. You&apos;re understood — and guided forward.”
  </div>
</section>

{/* ===== CERTIFICATION & RECOGNITION ===== */}
<section className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-[#294154]/10">
  {/* HEADER */}
  <div className="mb-8 max-w-3xl">
    <h2 className="text-2xl md:text-3xl font-extrabold text-[#294154] mb-3">
      Certification & Recognition
    </h2>
    <p className="text-gray-700 leading-relaxed">
      Your journey concludes with a certificate that reflects
      <b> real effort, real assessment, and real progress</b> —
      not just attendance.
    </p>
  </div>

  {/* CERTIFICATE FEATURES */}
  <div className="grid gap-6 sm:grid-cols-2">
    {[
      {
        title: "Official IELS Certificate",
        desc: "Issued directly by IELS as proof of participation and assessment completion.",
      },
      {
        title: "Skill Assessment Breakdown",
        desc: "Listening, Reading, Writing, and Speaking clearly stated for transparency.",
      },
      {
        title: "Batch-Based Recognition",
        desc: "Your certificate includes your batch name (IELS Test Batch 1).",
      },
      {
        title: "Portfolio-Ready Design",
        desc: "Designed to be confidently used on CVs, LinkedIn, and academic portfolios.",
      },
    ].map((item, i) => (
      <div
        key={i}
        className="
          relative rounded-2xl bg-[#F7F8FA] p-6
          border border-gray-100
          transition-all duration-300
          hover:shadow-md
        "
      >
        {/* ACCENT BAR */}
        <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-[#E56668]" />

        <div className="pl-4">
          <h3 className="font-bold text-[#294154] mb-1">
            {item.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {item.desc}
          </p>
        </div>
      </div>
    ))}
  </div>

  {/* CLOSING NOTE */}
  <div className="mt-10 text-sm text-gray-600 max-w-2xl">
    This certificate represents learning, commitment, and measurable growth —
    something worth being proud of.
  </div>
</section>

   {/* PACKAGES & PRICING */}
<section className="bg-white rounded-2xl p-8 shadow-sm border border-[#294154]/10">
  {/* HEADER */}
  <div className="text-center mb-14">
    <h2 className="text-2xl font-bold mb-3">
      Select the Registration Package That Works Best for You 🎓
    </h2>
    <p className="text-gray-700 max-w-3xl mx-auto">
      Choose a package based on your preparation needs — from quick assessment
      to a full IELTS learning experience.
    </p>
  </div>

  {/* GRID */}
  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-[#294154]">
    {[
      {
        title: "Package A — Basic Mock Test",
        price: "Rp 50.000",
        desc: "Perfect for first-time takers or quick assessment.",
        bg: "bg-[#FAFAFA]",
        border: "border-gray-200",
        highlight: false,
        points: [
          "IELTS Mock Test (Listening, Reading, Writing)",
          "AI-generated score report",
          "Expert feedback & recommendations",
        ],
      },
      {
        title: "Package B — Mock Test + Preparation Kit",
        price: "Rp 75.000",
        desc: "Best for learners who want structured preparation before testing.",
        bg: "bg-[#FAFAFA]",
        border: "border-gray-200",
        highlight: false,
        points: [
          "Everything in Package A",
          "3 IELTS preparation videos",
          "10 eBooks + 100+ practice questions",
        ],
      },
      {
        title: "Package C — Full IELTS Learning Experience",
        price: "Rp 125.000",
        desc: "For those aiming to experience the complete IELTS journey.",
        bg: "bg-[#FAFAFA]",
        border: "border-[#E56668]/40",
        highlight: true,
        points: [
          "Everything in Package B",
          "Live speaking simulation",
          "1-Year IELS Lounge Premium access",
          "Chance to win free Official IELTS Test (worth Rp 3.6M)",
        ],
      },
    ].map((p, i) => (
      <div
        key={i}
        className={`
          group relative rounded-3xl border ${p.bg} ${p.border}
          flex flex-col h-full
          transition-all duration-300
          hover:border-[#E56668]/60 hover:-translate-y-1 hover:shadow-xl
        `}
      >
        {/* ACCENT BAR */}
        <div
          className={`
            absolute left-0 top-6 bottom-6 w-1 rounded-full
            transition-all duration-300
            ${
              p.highlight
                ? "bg-[#E56668]"
                : "bg-transparent group-hover:bg-[#E56668]"
            }
          `}
        />

        {/* RECOMMENDED BADGE */}
        {p.highlight && (
          <div className="absolute top-2 right-3 bg-[#294154]/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            Recommended
          </div>
        )}

        {/* CONTENT */}
        <div className="pl-4 p-7 flex-1 flex flex-col gap-4">
          <div>
            <h3
              className={`
                text-lg font-bold transition
                ${p.highlight ? "text-[#E56668]" : "group-hover:text-[#E56668]"}
              `}
            >
              {p.title}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {p.desc}
            </p>
          </div>

          <div>
            <div className="text-3xl font-extrabold">
              {p.price}
            </div>
          </div>

          <ul className="text-sm text-gray-700 space-y-2">
            {p.points.map((pt, idx) => (
              <li key={idx}>• {pt}</li>
            ))}
          </ul>
        </div>

        {/* FOOTER (READY FOR CTA IF NEEDED) */}
        <div className="border-t border-gray-100 p-5 text-center text-sm text-gray-500">
          Secure checkout • Limited slots
        </div>
      </div>
    ))}
  </div>
</section>

        {/* REGISTRATION CTA */}
        <section className="rounded-2xl p-8 text-center shadow-sm">
          <h3 className="text-xl font-bold mb-2">Ready to Begin?</h3>
          <p className="text-90 mb-4 max-w-2xl mx-auto">
            Choose your package, complete your registration, and start your IELTS Mock Test journey today.  
            Accessible, affordable, and globally aligned.
          </p>
              <div className="mt-10 justify-center">
      <p className="text-sm uppercase tracking-widest text-[#294154] mb-3">
        Registration closes in
      </p>
      <CountdownTimer />
    </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild className="bg-[#E56668] text-white font-semibold px-6 py-3 hover:bg-[#C04C4E]">
                              <Link
                              href={formUrl}
                              target="https://forms.gle/yFCdzbeR8uMBzM5X8"
                              rel="noopener noreferrer"
                            >
                              Register for IELTS Mock Test
                            </Link></Button>
              
                            <Button asChild className="bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f]"><Link
                              href="https://drive.google.com/file/d/1h2IPjkahj1yKqU1_pK0T3L1cYAMz2pQk/view?usp=drive_link"
                              target="_blank"
                              rel="noopener noreferrer"
                             
                            >
                              Read Full IELTS Overview
                            </Link></Button>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}