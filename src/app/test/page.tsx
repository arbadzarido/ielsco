"use client";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { VALID_CODES } from "@/data/test/codes";
import { Button } from "@/components/ui/button";

type CodeEntry = {
  code: string;
  used: boolean;
  name?: string;
  email?: string;
};

const codes: CodeEntry[] = (VALID_CODES as unknown) as CodeEntry[];

export default function TestSelectionPage() {
  const googleFormLink = "https://forms.gle/yFCdzbeR8uMBzM5X8";

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

  const tests = [
    { title: "IELTS Mock Test", emoji: "🎓", active: true },
    { title: "TOEFL Mock Test", emoji: "🏫", active: false },
    { title: "TOEIC Mock Test", emoji: "💼", active: false },
    { title: "SAT English", emoji: "📚", active: false },
    { title: "Grammar Placement", emoji: "✏", active: false },
  ];

  return (
    <div>
    <Header />
    <main className="min-h-screen bg-gradient-to-b from-white to-[#f7f9f8] text-[#294154] font-geologica">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        {/* ================= HERO ================= */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* RIGHT: MASCOT */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-[300px] sm:w-[400px] lg:w-[520px]">
              <Image
                src="/images/contents/general/ielstest.svg"
                alt="IELS Mascot"
                width={800}
                height={800}
                priority
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* LEFT: TEXT */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              Welcome to the IELS Test Platform 🌍
            </h1>
            <p className="max-w-2xl text-gray-700 text-base sm:text-lg">
              Practice global English exams in a structured, affordable, and guided environment.  
              IELS helps you get ready for real opportunities — from scholarships to international careers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button asChild className="bg-[#E56668] text-white font-semibold px-6 py-3 hover:bg-[#C04C4E]">
                <Link
                href={googleFormLink}
                target="https://forms.gle/yFCdzbeR8uMBzM5X8"
                rel="noopener noreferrer"
              >
                Register Now
              </Link></Button>

              <Button asChild className="bg-[#294154] text-white font-semibold px-6 py-3 hover:bg-[#21363f]"><Link
                href="https://docs.google.com/document/d/1YSVY9lNDNmBCi7oaZZOhXoEa2xMWaYLuD4cVUc_4vFc/edit?usp=sharing"
                target="_blank"
                rel="noopener noreferrer"
              >
                📘 View Test Guide
              </Link></Button>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              Registration and payment are handled externally via Google Form.  
              You&apos;ll receive an access code after registration to unlock your test.
            </p>
          </div>
        </section>
{/* Test Format */}
<article
  id="test-format"
  className="bg-white rounded-2xl p-8 shadow-sm border border-[#294154]/6"
>
  {/* HEADER */}
  <div className="text-center mb-14">
    <h3 className="text-2xl font-bold mb-3">
      Test Format & Timing
    </h3>
    <p className="text-gray-700 max-w-3xl mx-auto">
      Each IELS test follows international standards but is simplified for
      accessibility and clarity. Below is a quick comparison of our current
      and upcoming test formats — including duration, focus, and purpose.
    </p>
  </div>

  {/* GRID */}
  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-[#294154]">
    {[
      {
        status: "available",
        badge: "Available",
        icon: "📘",
        title: "IELTS-style",
        desc:
          "Balanced, academic-focused test for real communication skills. Ideal for global study and scholarship preparation.",
        sections: [
          "Listening — 25–30 min",
          "Reading — 45–60 min",
          "Writing — 45–60 min",
          "Speaking — 10–15 min (live)",
        ],
        link:
          "https://drive.google.com/file/d/1h2IPjkahj1yKqU1_pK0T3L1cYAMz2pQk/view?usp=drive_link",
      },
      {
        status: "soon",
        badge: "Coming Soon",
        icon: "🧠",
        title: "TOEFL-style",
        desc:
          "Academic comprehension and integrated writing test for university readiness and research-based learners.",
        sections: [
          "Listening — 30–40 min",
          "Reading — 60–80 min",
          "Writing — 50–60 min",
        ],
      },
      {
        status: "soon",
        badge: "Coming Soon",
        icon: "💼",
        title: "TOEIC-style",
        desc:
          "Workplace-oriented assessment focused on clarity, efficiency, and professional communication.",
        sections: [
          "Listening — 45–60 min",
          "Reading — 45–60 min",
        ],
      },
    ].map((t, i) => (
      <div
        key={i}
        className={`
          group relative rounded-3xl border bg-[#FAFAFA] flex flex-col h-full
          transition-all duration-300
          ${
            t.status === "available"
              ? "border-gray-200 hover:border-[#E56668]/60 hover:-translate-y-1 hover:shadow-xl"
              : "border-gray-200 opacity-80"
          }
        `}
      >
        {/* ACCENT BAR */}
        <div
          className="
            absolute left-0 top-6 bottom-6 w-1 rounded-full
            bg-transparent
            group-hover:bg-[#E56668]
            transition-all duration-300
          "
        />

        {/* BADGE */}
        <div
          className={`
            absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full
            ${
              t.status === "available"
                ? "bg-[#E56668]/10 text-[#E56668]"
                : "bg-gray-100 text-gray-600"
            }
          `}
        >
          {t.badge}
        </div>

        {/* CONTENT */}
        <div className="pl-4 p-7 flex-1 flex flex-col gap-4">
          {/* HEADER */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">{t.icon}</span>
            <h4
              className="
                text-lg font-bold transition
                group-hover:text-[#E56668]
              "
            >
              {t.title}
            </h4>
          </div>

          {/* DESC */}
          <p className="text-sm text-gray-700">
            {t.desc}
          </p>

          {/* SECTIONS */}
          <ul className="text-sm text-gray-700 space-y-2">
            {t.sections.map((s, idx) => (
              <li key={idx}>• {s}</li>
            ))}
          </ul>
        </div>

        {/* FOOTER */}
        <div className="border-t border-gray-100 p-5">
          {t.status === "available" ? (
            <Link
              href={t.link!}
              target="_blank"
              className="text-sm font-semibold text-[#E56668] hover:underline"
            >
              Read full details →
            </Link>
          ) : (
            <div className="text-sm text-gray-500">
              Details coming soon
            </div>
          )}
        </div>
      </div>
    ))}
  </div>

  {/* NOTE */}
  <p className="mt-8 text-sm text-gray-600 border-t border-gray-100 pt-5">
    ⏰ <strong>Note:</strong> Timers run per section and must be completed in
    order. During your test, you&apos;ll join a Zoom session or secure web portal.
    Each participant is monitored by IELS proctors to ensure fairness and
    prevent cheating.
  </p>
</article>
  
 {/* Pricing & Packages */}
<article
  id="register"
  className="bg-white rounded-2xl p-8 shadow-sm border border-[#294154]/6"
>
  {/* HEADER */}
  <div className="text-center mb-14">
    <h3 className="text-2xl font-bold mb-3">
      Test Packages & Pricing
    </h3>
    <p className="text-gray-700 max-w-2xl mx-auto">
      Choose the right assessment for your goal. Each test is designed to
      evaluate real-world English skills, guided by the same quality and
      feedback system used by our tutors.
    </p>
  </div>

  {/* GRID */}
  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 text-[#294154]">
    {[
      {
        status: "available",
        badge: "Available",
        title: "IELTS-style Assessment",
        desc:
          "Academic and general English simulation for academic, professional, and daily contexts.",
        price: "Rp50.000",
        note: "starting price per participant",
        points: [
          "Listening, Reading, and Writing modules",
          "Optional live Speaking interview",
          "Expert feedback & improvement plan",
        ],
        link: "/test/guide/ielts",
      },
      {
        status: "soon",
        badge: "Coming Soon",
        title: "TOEFL-style Assessment",
        desc:
          "Academic-integrated test for university and scholarship applicants.",
        price: "Rp30.000",
        note: "expected starting price",
        points: [
          "Integrated academic tasks",
          "Automated scoring + tutor review add-on",
          "Preparation-focused practice mode",
        ],
      },
      {
        status: "soon",
        badge: "Coming Soon",
        title: "TOEIC-style Assessment",
        desc:
          "Workplace English evaluation for professional settings.",
        price: "Rp30.000",
        note: "expected starting price",
        points: [
          "Listening & Reading sections",
          "Professional task simulation",
          "Quick certificate for employment use",
        ],
      },
    ].map((p, i) => (
      <div
        key={i}
        className={`
          group relative rounded-3xl border bg-[#FAFAFA] flex flex-col h-full
          transition-all duration-300
          ${
            p.status === "available"
              ? "border-gray-200 hover:border-[#E56668]/60 hover:-translate-y-1 hover:shadow-xl"
              : "border-gray-200 opacity-80"
          }
        `}
      >
        {/* ACCENT BAR */}
        <div
          className="
            absolute left-0 top-6 bottom-6 w-1 rounded-full
            bg-transparent
            group-hover:bg-[#E56668]
            transition-all duration-300
          "
        />

        {/* BADGE */}
        <div
          className={`
            absolute top-4 right-4 text-xs font-semibold px-3 py-1 rounded-full
            ${
              p.status === "available"
                ? "bg-[#E56668]/10 text-[#E56668]"
                : "bg-gray-100 text-gray-600"
            }
          `}
        >
          {p.badge}
        </div>

        {/* CONTENT */}
        <div className="pl-4 p-7 flex-1 flex flex-col gap-4">
          <div>
            <h4 className="text-lg font-bold mb-1">
              {p.title}
            </h4>
            <p className="text-sm text-gray-600">
              {p.desc}
            </p>
          </div>

          <div>
            <div className="text-3xl font-extrabold mb-1">
              {p.price}
            </div>
            <div className="text-xs text-gray-500">
              {p.note}
            </div>
          </div>

          <ul className="text-sm text-gray-700 space-y-2">
            {p.points.map((pt, idx) => (
              <li key={idx}>• {pt}</li>
            ))}
          </ul>
        </div>

        {/* FOOTER CTA */}
        <div className="border-t border-gray-100 p-5">
          {p.status === "available" ? (
            <Button
              asChild
              className="w-full bg-[#E56668] text-white font-semibold py-2 rounded-full hover:bg-[#C04C4E] transition active:scale-[0.97]"
            >
              <Link href={p.link!}>
                Register Now
              </Link>
            </Button>
          ) : (
            <button
              disabled
              className="w-full rounded-full bg-gray-200 text-gray-500 font-semibold py-2 cursor-not-allowed"
            >
              Coming Soon
            </button>
          )}
        </div>
      </div>
    ))}
  </div>

  {/* ORG NOTE */}
  <div className="text-center mt-10 text-sm text-gray-700">
    <span className="text-[#E56668] font-semibold">
      Organizations get 20% off
    </span>{" "}
    — email <strong>partnership@ielsco.com</strong> to claim your bundle.
  </div>

  {/* FOOTER CTA */}
  <div className="mt-8 flex justify-center">
    <Button
      asChild
      className="bg-[#294154] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#21363f] transition active:scale-[0.97]"
    >
      <Link href="mailto:partnership@ielsco.com?subject=Organization%20Test%20Bundle%20Request">
        Register for Your Organization — 20% Off
      </Link>
    </Button>
  </div>
</article>
 {/* ===== REGISTRATION & ACCESS FLOW ===== */}
<section className="py-20 overflow-hidden">
  {/* HEADER */}
  <div className="text-center mb-12 px-6">
    <h3 className="text-2xl sm:text-3xl font-bold text-[#294154] mb-3">
      Registration & Access — Step by Step
    </h3>
    <p className="text-gray-600 max-w-2xl mx-auto">
      A quick, no-drama guide to register, validate your access code, join the Zoom
      session, and receive your results. Follow these steps in order — the access
      code you receive by email is the single key that unlocks your test.
    </p>
  </div>

  {/* OUTER FRAME */}
  <div className="relative max-w-[1400px] mx-auto">
    {/* GRADIENT FADE */}
    <div className="pointer-events-none absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-white to-transparent z-10" />
    <div className="pointer-events-none absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-white to-transparent z-10" />

    {/* SCROLL AREA */}
    <div className="overflow-x-auto scrollbar-none px-12">
      <div className="flex gap-8 w-max py-6 mx-auto">
        {[
          {
            step: 1,
            title: "Complete Registration",
            desc: "Fill the official registration form with your full name, valid email, phone number, and chosen test package.",
          },
          {
            step: 2,
            title: "Confirm & Pay",
            desc: "Follow the payment instructions in the confirmation email. Keep your payment proof — it may be required for verification.",
          },
          {
            step: 3,
            title: "Receive Access Code",
            desc: "After verification we send a one-time access code to your email/WhatsApp. Save it — this code is required to start the test.",
          },
          {
            step: 4,
            title: "Pick a Test Slot",
            desc: "Choose a Zoom schedule from available slots (or accept the slot we assigned). Slot link and time appear in your confirmation email.",
          },
          {
            step: 5,
            title: "Validate Your Code",
            desc: "Before test day, paste your access code into the Access form (section with id=\"access\") and press <strong>Validate</strong> — the form checks the code status.",
          },
          {
            step: 6,
            title: "Start the Test",
            desc: "After validation (code must be valid & unused), click <strong>Start Test</strong> to proceed — timers begin when you start.",
          },
          {
            step: 7,
            title: "Receive Feedback",
            desc: "Tutors review your writing and speaking; expect personalized feedback within 24–72 hours after submission.",
          },
          {
            step: 8,
            title: "Get Certificate",
            desc: "After verification, we email your completion certificate and performance summary (if included with your package).",
          },
        ].map((item, i) => {
          const isActive = i === 0; // first step highlighted (same logic as testimonial)

          return (
            <div
              key={item.step}
              className={`
                relative min-w-[300px] max-w-[300px]
                rounded-2xl p-6 text-center bg-[#f9fafb]
                transition-all duration-300
                ${
                  isActive
                    ? "border-2 border-[#E56668] shadow-2xl scale-[1.05]"
                    : "border border-[#e4e8ec] hover:shadow-lg hover:-translate-y-1"
                }
              `}
            >
              {/* STEP NUMBER */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E56668] text-white font-bold mx-auto mb-4 text-lg">
                {item.step}
              </div>

              {/* CONTENT */}
              <h4 className="text-lg font-semibold text-[#294154] mb-2">
                {item.title}
              </h4>
              <p
                className="text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: item.desc }}
              />
            </div>
          );
        })}
      </div>
    </div>
  </div>

  {/* FOOTNOTE */}
  <p className="text-sm text-gray-600 text-center mt-10 max-w-2xl mx-auto px-6">
    💡 <strong>Tip:</strong> Validation (step 5) is mandatory — only access codes
    that are <strong>valid</strong> and <strong>unused</strong> will allow you to
    start the test.
  </p>
</section>
  
  
  
            {/* FAQ */}
            <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
              <h3 className="text-xl font-semibold mb-3">FAQ</h3>
  
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                <details className="p-4 rounded-lg border border-gray-100">
                  <summary className="font-semibold cursor-pointer">Can I change my slot after I receive the access code?</summary>
                  <p className="mt-2 text-sm">You can request a slot change before test day depending on availability. Contact support as soon as possible.</p>
                </details>
  
                <details className="p-4 rounded-lg border border-gray-100">
                  <summary className="font-semibold cursor-pointer">What ID is required for verification?</summary>
                  <p className="mt-2 text-sm">A government-issued ID or student card is recommended. Keep it ready for the proctor on test day.</p>
                </details>
  
                <details className="p-4 rounded-lg border border-gray-100">
                  <summary className="font-semibold cursor-pointer">Who reviews my Writing & Speaking?</summary>
                  <p className="mt-2 text-sm">Qualified IELS tutors review tasks according to our rubric. Diagnostic packages get the most detailed commentary.</p>
                </details>
  
                <details className="p-4 rounded-lg border border-gray-100">
                  <summary className="font-semibold cursor-pointer">How soon will I get the certificate?</summary>
                  <p className="mt-2 text-sm">Certificates (if included) are sent by email after verification — usually within 5 working days for Premium/Diagnostic packages.</p>
                </details>
              </div>
            </article>
            {/* Contact */}
            <article className="bg-white rounded-2xl p-6 shadow-sm border border-[#294154]/6">
              <h3 className="text-xl font-semibold mb-3">Need help?</h3>
  
              <p className="text-gray-700 mb-4">
                If you experience issues or have questions, contact our support team:
              </p>
  
              <div className="flex flex-col sm:flex-row gap-4">
                <a className="flex-1 items-center gap-3 p-4 rounded-lg border border-[#294154]/8 hover:shadow-sm transition"
                   href="mailto:support@ielsco.com">
                  <span className="font-semibold">📧 Email</span>
                  <span className="text-gray-600">support@ielsco.com</span>
                </a>
  
                <a className="flex-1 items-center gap-3 p-4 rounded-lg border border-[#294154]/8 hover:shadow-sm transition"
                   href="https://wa.me/6288297253491" target="_blank" rel="noreferrer">
                  <span className="font-semibold">📱 WhatsApp</span>
                  <span className="text-gray-600">+62 882-9725-3491</span>
                </a>
  
                <div className="flex-1 items-center gap-3 p-4 rounded-lg border border-[#294154]/8 hover:shadow-sm transition">
                  <div className="font-semibold">🕘 Support hours</div>
                  <div className="text-gray-600 text-sm">Mon–Fri, 09:00–17:00 (WIB)</div>
                </div>
              </div>
            </article>

        </div>
      
    </main>
    <Footer/>
    </div>
  );
}