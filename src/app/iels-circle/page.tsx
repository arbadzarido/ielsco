"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

function CountUp({
  end,
  suffix = "",
  duration = 1200,
}: {
  end: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [end, duration]);

  return (
    <span className="text-[#E56668] font-extrabold">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// TODO: ganti dengan link Google Form pendaftaran IELS Circle
const REGISTRATION_LINK = "https://forms.gle/REPLACE_WITH_IELS_CIRCLE_FORM";

/* ================= DATA ================= */

type ProgramItem = {
  date: string;
  title: string;
  focus: string;
  points: string[];
};

const programTimeline: ProgramItem[] = [
  {
    date: "12 – 18 Oct 2026",
    title: "Week 1 — Daily Conversation & Greetings",
    focus: "Getting comfortable expressing yourself in English",
    points: [
      "Everyday communication basics",
      "Natural greetings & small talk",
      "Kick-off community forum",
    ],
  },
  {
    date: "19 – 25 Oct 2026",
    title: "Week 2 — Grammar Essentials",
    focus: "Building accuracy without the boring memorization",
    points: [
      "Tenses & sentence structure",
      "Common mistakes, simplified",
      "Weekly evaluation quiz",
    ],
  },
  {
    date: "26 Oct – 1 Nov 2026",
    title: "Week 3 — Everyday Listening Comprehension",
    focus: "Training your ear for real-life English",
    points: [
      "Listening to natural conversations",
      "Everyday situational context",
      "Speaking club practice",
    ],
  },
  {
    date: "2 – 8 Nov 2026",
    title: "Week 4 — Practical Reading & Vocabulary",
    focus: "Expanding vocabulary for everyday use",
    points: [
      "Practical reading strategies",
      "Vocabulary building activities",
      "Community mini games",
    ],
  },
  {
    date: "9 – 15 Nov 2026",
    title: "Week 5 — Academic Reading Strategies",
    focus: "Reading academic texts with more confidence",
    points: [
      "Approaching academic material",
      "Skimming & scanning techniques",
      "Weekly evaluation quiz",
    ],
  },
  {
    date: "16 – 22 Nov 2026",
    title: "Week 6 — Paragraph & Essay Writing Basics",
    focus: "Turning ideas into clear, structured writing",
    points: [
      "Organizing your ideas",
      "Paragraph & essay structure",
      "Speaking club practice",
    ],
  },
  {
    date: "23 – 29 Nov 2026",
    title: "Week 7 — Idioms, Phrasal Verbs & Slang",
    focus: "Sounding more natural and conversational",
    points: [
      "Everyday idioms & slang",
      "Phrasal verbs in context",
      "Community mini games",
    ],
  },
  {
    date: "30 Nov – 6 Dec 2026",
    title: "Week 8 — Podcasts & Lectures",
    focus: "Leveling up with longer-form listening",
    points: [
      "Podcast & lecture comprehension",
      "Note-taking while listening",
      "Weekly evaluation quiz",
    ],
  },
  {
    date: "12 Dec 2026",
    title: "Grand Finale — Graduation Day",
    focus: "Celebrating 8 weeks of progress, together",
    points: [
      "Recap of the full journey",
      "Community celebration",
      "E-Certificate distribution",
    ],
  },
];

/* ================= PAGE ================= */

export default function IELSCirclePage() {
  const [pressed, setPressed] = useState<number | null>(null);

  return (
    <main className="bg-white text-[#2F4157]">
      <Header />
{/* ================= HERO ================= */}
<section className="relative overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 bg-[url('/images/contents/careers/iels_team_0.png')] bg-cover bg-center" />
  <div className="absolute inset-0 bg-[#2F4157]/85" />

  <div className="relative max-w-6xl mx-auto px-6 py-20 sm:py-24 lg:py-28">
    <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">

      {/* LEFT — MAIN MESSAGE */}
      <div>
      {/* Program Identity */}
<div className="flex items-center gap-3 mb-7">
  <Image
    src="/images/logos/events/iels-circle.png"
    alt="IELS Circle"
    width={180}
    height={48}
    className="h-9 w-auto brightness-0 invert opacity-90"
    priority
  />

  <span className="h-5 w-px bg-white/25" />

  <div className="flex items-center gap-2">
    <span className="text-sm text-white/65 whitespace-nowrap">
      In collaboration with
    </span>

    <Image
      src="/images/logos/company/tofly.png"
      alt="Tofly.id"
      width={180}
      height={48}
      className="h-7 w-auto"
      priority
    />
  </div>
</div>

        {/* Small contextual label */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="w-2 h-2 rounded-full bg-[#E56668]" />
          <span className="text-sm font-semibold text-white/80 tracking-wide">
            FREE 8-WEEK ENGLISH COMMUNITY
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight max-w-3xl">
          Make English a part of your{" "}
          <span className="text-[#E56668]">everyday life.</span>
        </h1>

        {/* Supporting copy */}
        <p className="mt-7 text-base sm:text-lg text-white/85 leading-relaxed max-w-2xl">
          Join an 8-week learning community where you can practice English,
          meet like-minded young people, and build a habit of using English
          beyond the classroom.
        </p>

        {/* CTA */}
        <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            asChild
            className="
              bg-[#E56668]
              hover:bg-[#C04C4E]
              px-8 py-3
              rounded-full
              text-white
              font-semibold
              shadow-lg
              transition-all
              hover:-translate-y-0.5
            "
          >
            <Link href={REGISTRATION_LINK}>
              Join IELS Circle
            </Link>
          </Button>

          <span className="text-sm text-white/60">
            Free to join · Sep 11 – Oct 9, 2026
          </span>
        </div>
      </div>

      {/* RIGHT — PROGRAM SNAPSHOT */}
      <div className="lg:justify-self-end w-full max-w-md">
        <div className="rounded-3xl bg-white p-7 sm:p-8 shadow-2xl">

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E56668]">
                Your 8-week journey
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-[#2F4157]">
                Learn. Practice. Connect.
              </h2>
            </div>

            <div className="shrink-0 rounded-full bg-[#E56668]/10 px-3 py-1.5">
              <span className="text-xs font-bold text-[#E56668]">
                FREE
              </span>
            </div>
          </div>

          <div className="mt-7 space-y-5">

            {/* Item 1 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-[#2F4157]/5 flex items-center justify-center">
                <span className="text-sm font-bold text-[#2F4157]">
                  01
                </span>
              </div>

              <div>
                <p className="font-bold text-[#2F4157]">
                  Weekly learning themes
                </p>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  From everyday conversation and grammar to academic reading,
                  writing, and listening.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-[#2F4157]/5 flex items-center justify-center">
                <span className="text-sm font-bold text-[#2F4157]">
                  02
                </span>
              </div>

              <div>
                <p className="font-bold text-[#2F4157]">
                  Real English practice
                </p>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  Join speaking sessions, quizzes, forums, and activities
                  designed to keep you practicing.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-2xl bg-[#2F4157]/5 flex items-center justify-center">
                <span className="text-sm font-bold text-[#2F4157]">
                  03
                </span>
              </div>

              <div>
                <p className="font-bold text-[#2F4157]">
                  A community to grow with
                </p>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  Learn alongside young people across Southeast Asia in a
                  supportive, low-pressure environment.
                </p>
              </div>
            </div>

          </div>

          <div className="mt-7 pt-6 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              October 12 – December 12, 2026
            </span>

            <span className="text-sm font-semibold text-[#E56668]">
              8 weeks
            </span>
          </div>

        </div>
      </div>

    </div>
  </div>
</section>

     {/* ================= WHY IELS CIRCLE ================= */}
<section className="py-20 sm:py-24">
  <div className="max-w-6xl mx-auto px-6">

    {/* INTRO */}
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#E56668]" />
        <span className="text-sm font-semibold text-[#E56668]">
          WHY IELS CIRCLE
        </span>
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2F4157] leading-tight">
        Knowing English is one thing.
        <br />
        <span className="text-[#E56668]">
          Actually using it is another.
        </span>
      </h2>

      <p className="mt-6 text-gray-600 leading-relaxed max-w-2xl">
        You might understand the grammar. You might know hundreds of words.
        But becoming confident in English takes more than knowing what is
        correct — it takes a place where you can keep practicing.
      </p>
    </div>

    {/* PROBLEM → SOLUTION */}
    <div className="mt-14 grid lg:grid-cols-2 gap-8">

      {/* LEFT — REAL PROBLEMS */}
      <div className="rounded-3xl border border-gray-200 bg-[#FAFAFA] p-7 sm:p-8">

        <p className="text-sm font-semibold text-[#2F4157] mb-6">
          Maybe you've felt this before:
        </p>

        <div className="space-y-4">

          <div className="flex gap-4 items-start">
            <span className="text-[#E56668] text-lg">“</span>
            <p className="text-gray-700 leading-relaxed">
              I keep starting to learn English, but I never stay consistent.
            </p>
          </div>

          <div className="flex gap-4 items-start">
            <span className="text-[#E56668] text-lg">“</span>
            <p className="text-gray-700 leading-relaxed">
              I understand English, but I still freeze when I have to speak.
            </p>
          </div>

          <div className="flex gap-4 items-start">
            <span className="text-[#E56668] text-lg">“</span>
            <p className="text-gray-700 leading-relaxed">
              I want to practice, but practicing alone gets boring.
            </p>
          </div>

        </div>

      </div>

      {/* RIGHT — IELS ANSWER */}
      <div className="rounded-3xl bg-[#2F4157] p-7 sm:p-8 text-white">

        <p className="text-sm font-semibold text-[#E56668] mb-4">
          That's what IELS Circle is for.
        </p>

        <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">
          A place to keep showing up.
        </h3>

        <p className="mt-5 text-white/75 leading-relaxed">
          For 8 weeks, you'll have a simple rhythm to follow — learn
          something new, practice it, and use it with other people.
        </p>

        <p className="mt-4 text-white/75 leading-relaxed">
          Because progress doesn't come from studying once.
          <span className="text-white font-semibold">
            {" "}It comes from coming back.
          </span>
        </p>

        <div className="mt-7 pt-6 border-t border-white/10">
          <p className="text-sm text-white/50">
            What you'll get
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "Weekly learning",
              "Speaking practice",
              "Community activities",
              "Evaluation quizzes",
              "Learning materials",
              "E-Certificate",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/85"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>

    {/* VALUE PROPOSITIONS */}
    <div className="mt-16">

      <div className="mb-8">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#2F4157]">
          What makes the Circle different?
        </h3>

        <p className="mt-3 text-gray-600 max-w-2xl">
          We don't want you to just collect more English materials.
          We want you to actually use what you learn.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

        {[
          {
            number: "01",
            title: "Practice, not just study",
            desc: "Turn what you learn into conversations, writing, quizzes, and everyday English practice.",
          },
          {
            number: "02",
            title: "Consistency made easier",
            desc: "A simple weekly rhythm gives you a reason to keep coming back without overwhelming your schedule.",
          },
          {
            number: "03",
            title: "Speak without the pressure",
            desc: "Practice with other learners in a supportive environment where mistakes are part of learning.",
          },
          {
            number: "04",
            title: "Learn beyond the textbook",
            desc: "Explore English through real conversations, entertainment, games, podcasts, and practical topics.",
          },
          {
            number: "05",
            title: "Meet people who get it",
            desc: "Connect with fellow Southeast Asian youth who are also learning, growing, and figuring things out.",
          },
          {
            number: "06",
            title: "Finish with something tangible",
            desc: "Complete the journey, celebrate your progress, and receive an official e-certificate.",
          },
        ].map((item) => (
          <div
            key={item.number}
            className="
              group
              rounded-3xl
              border border-gray-200
              bg-white
              p-6
              transition-all duration-300
              hover:-translate-y-1
              hover:border-[#E56668]/60
              hover:shadow-xl
            "
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-bold text-[#E56668]">
                {item.number}
              </span>

              <span className="text-gray-300 transition-colors group-hover:text-[#E56668]">
                ↗
              </span>
            </div>

            <h4 className="mt-8 text-xl font-bold text-[#2F4157]">
              {item.title}
            </h4>

            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}

      </div>
    </div>

    {/* CLOSING */}
    <div className="mt-16 max-w-3xl">
      <p className="text-xl sm:text-2xl font-bold text-[#2F4157] leading-relaxed">
        You don't need to be fluent to join.
        <span className="text-[#E56668]">
          {" "}You just need a place to start — and people to practice with.
        </span>
      </p>
    </div>

  </div>
</section>

      {/* ================= PROGRAM TIMELINE (HORIZONTAL) ================= */}
      <section className="bg-white py-15 overflow-hidden">
        <div className="text-center mb-14 px-6">
          <h2 className="text-3xl font-extrabold mb-4">
            8-Week Program Timeline
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A structured, week-by-week journey from everyday conversation to
            confident, natural English.
          </p>
        </div>

        <div className="relative max-w-[1400px] mx-auto">
          <div className="absolute left-0 right-0 top-1/2 h-[6px] bg-[#E56668]/30 rounded-full -translate-y-1/2" />

          <div className="overflow-x-auto scrollbar-none px-12">
            <div className="flex gap-8 w-max py-6 mx-auto">
              {programTimeline.map((item, i) => (
                <div
                  key={i}
                  className="
                    relative min-w-[320px] max-w-[320px]
                    rounded-3xl bg-[#FAFAFA] p-6
                    border border-gray-200
                    transition-all duration-300
                    hover:shadow-xl hover:-translate-y-1
                  "
                >
                  <p className="text-sm font-semibold text-[#E56668] mb-2">
                    {item.date}
                  </p>
                  <h3 className="text-lg font-bold mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {item.focus}
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {item.points.map((p, idx) => (
                      <li key={idx}>• {p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHO SHOULD JOIN ================= */}
      <section className="max-w-6xl mx-auto px-6 py-15">
        <div className="grid lg:grid-cols-2 gap-14 items-start">

          {/* LEFT CONTENT */}
          <div>
            <h2 className="text-3xl font-extrabold mb-6">
              Who Should Join?
            </h2>

            <p className="text-gray-700 leading-relaxed mb-6 max-w-xl">
              IELS Circle is open to <b>Southeast Asian youth</b> who are
              passionate about improving their English and becoming more
              confident communicators.
            </p>

            <ul className="space-y-3 text-gray-700">
              <li>• A high school student building your English foundation</li>
              <li>• A university student strengthening academic & professional English</li>
              <li>• A fresh graduate preparing for your next opportunity</li>
              <li>• A young professional who wants consistent practice</li>
            </ul>

            <p className="mt-6 text-sm text-gray-600 max-w-xl">
              You don&apos;t need to be fluent.
              You just need to be <b>willing to learn and grow</b>.
            </p>
          </div>

          {/* RIGHT CONTENT */}
          <div className="relative rounded-3xl border border-gray-200 bg-[#FAFAFA] p-8">

            {/* ACCENT BAR */}
            <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-[#E56668]" />

            <div className="pl-4">
              <h3 className="text-2xl font-bold mb-6">
                What&apos;s Included
              </h3>

              <ul className="space-y-3 text-sm text-gray-700">
                <li>✔ Weekly Learning Material Delivery (Thursdays)</li>
                <li>✔ Community Forum & Mini Games (Wednesdays)</li>
                <li>✔ Evaluation Quiz (Fridays)</li>
                <li>✔ Speaking Club / English Hangout (Saturdays)</li>
                <li>✔ Official E-Certificate</li>
                <li>✔ Lifetime Access to Learning Materials</li>
              </ul>

            </div>
          </div>
        </div>

      </section>
      {/* ================= FINAL CTA ================= */}
      <section className="relative bg-[#2f4157] py-15 overflow-hidden">

        {/* BACKGROUND GLOW */}
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-[#E56668]/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-white/10 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* IMAGE COLLAGE */}
            <div className="relative h-[300px] sm:h-[360px] lg:h-[440px] w-full flex items-center justify-center">

              {/* IMAGE BACK */}
              <div
                className="
                  absolute
                  left-4 sm:left-6 lg:left-0
                  top-10 sm:top-8 lg:top-10
                  w-[78%] sm:w-[70%] lg:w-[65%]
                  rotate-[-3deg] lg:rotate-[-6deg]
                  rounded-3xl
                  border-4 border-white
                  shadow-2xl
                  overflow-hidden
                  z-10
                "
              >
                <Image
                  src="/images/contents/careers/banner/business.jpeg"
                  alt="IELS Circle Speaking Club"
                  width={600}
                  height={420}
                  className="object-cover"
                />
              </div>

              {/* IMAGE FRONT */}
              <div
                className="
                  absolute
                  right-2 sm:right-4 lg:right-0
                  bottom-6 sm:bottom-4 lg:bottom-8
                  w-[82%] sm:w-[75%] lg:w-[70%]
                  rotate-[2deg] lg:rotate-[4deg]
                  rounded-3xl
                  border-4 border-white
                  shadow-2xl
                  overflow-hidden
                  z-20
                "
              >
                <Image
                  src="/images/contents/careers/banner/talent.jpeg"
                  alt="IELS Circle Community"
                  width={600}
                  height={420}
                  className="object-cover"
                />
              </div>
            </div>

            {/* CONTENT */}
            <div className="text-white">

              <div className="mb-6 flex items-center gap-4">
                <Image
                  src="/images/logos/events/iels-circle.png"
                  alt="IELS Circle"
                  width={180}
                  height={48}
                  className="
                    h-10 w-auto
                    brightness-0 invert
                    opacity-90
                  "
                  priority
                />
                {/* TODO: ganti dengan logo kolaborasi Tofly.id */}
                <span className="text-white/50 text-sm">×</span>
                <Image
                  src="/images/logos/company/tofly.png"
                  alt="Tofly.id"
                  width={100}
                  height={32}
                  className="h-12 w-auto"
                />
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-6">
                Ready to Join the <span className="text-[#E56668]">Circle</span>?
              </h2>

              <p className="text-white/90 leading-relaxed max-w-xl mb-8">
                Join a growing community of Southeast Asian youth practicing
                <b> English</b>, building <b>friendships</b>, and growing
                <b> one conversation at a time</b> — completely free.
              </p>

              <div className="space-y-2 text-sm text-white/80 mb-10">
                <p>🧭 Be part of the early Circle members</p>
                <p>🗓️ 8 weeks, 4 activities a week, zero cost</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* CTA BUTTON */}
                <Button
                  asChild
                  className="
                    bg-[#E56668] text-white
                    font-semibold
                    px-6 py-3
                    rounded-full
                    hover:bg-[#C04C4E]
                    transition-all duration-300
                    active:scale-[0.97]
                    shadow-lg hover:shadow-xl
                    w-full sm:w-auto
                  "
                >
                  <Link href={REGISTRATION_LINK}>
                    Join IELS Circle — It&apos;s Free!
                  </Link>
                </Button>
                <span className="text-sm text-white/60">
                  Registration closes Fri, 9 Oct 2026, 23.59 WIB
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}