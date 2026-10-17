"use client";

import Footer from "@/components/footer";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { CIRCLE_COHORT } from "@/data/dashboard/circle";
import { CIRCLE_DISCORD_LINK, CIRCLE_REGISTRATION_LINK } from "@/components/circle/PublicSessions";
import { btnAccent, btnSecondary, pill } from "@/components/site/ui";
import { cn } from "@/lib/utils";

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
    <span className="font-extrabold">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

// Batas akhir pendaftaran: 9 Oktober 2026, 23:59 WIB (UTC+7)
const REGISTRATION_DEADLINE = new Date(CIRCLE_COHORT.registrationClosesAt);

function CountdownTimer() {
  // null di initial render -> dihitung ulang di useEffect (client-only) biar
  // gak ada hydration mismatch antara waktu render server & waktu di browser.
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const update = () =>
      setTimeLeft(REGISTRATION_DEADLINE.getTime() - Date.now());

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  if (timeLeft === null) return null;

  if (timeLeft <= 0) {
    return (
      <span className="font-bold text-[#2F4157]/70">Registration closed</span>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="flex gap-3">
      {(
        [
          ["Days", days],
          ["Hours", hours],
          ["Min", minutes],
          ["Sec", seconds],
        ] as const
      ).map(([label, value], i) => (
        <div
          key={label}
          className="rounded-2xl border border-[#E6E9EE] bg-white px-4 py-3 text-center"
        >
          <div className="text-2xl sm:text-3xl font-extrabold text-[#1A2534] tabular-nums">
            {i === 0 ? value : pad(value)}
          </div>
          <p className="mt-0.5 text-[10px] sm:text-xs uppercase tracking-wide text-[#2F4157]/60">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}


// Registration for the cohort uses the existing IELS Circle form while it is open. After the deadline the button is
// replaced by a closed notice and the community channels, so visitors never see an expired call to action.
function CohortCta({ label }: { label: string }) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => setOpen(REGISTRATION_DEADLINE.getTime() > Date.now()), []);
  if (open === null) return <span className="h-[46px] w-[220px] animate-pulse rounded-full bg-[#F1F4F8]" aria-hidden="true" />;
  if (open) {
    return (
      <a href={CIRCLE_REGISTRATION_LINK} target="_blank" rel="noopener noreferrer" className={btnAccent} data-testid="cohort-register">
        {label} <ArrowUpRight size={18} aria-hidden="true" />
      </a>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3" data-testid="cohort-closed">
      <span className={cn(pill, "px-4 py-2 text-[14px]")}><Lock size={14} aria-hidden="true" /> Registration for this cohort closed on 9 October 2026</span>
      <div className="flex flex-wrap gap-3">
        <a href={CIRCLE_DISCORD_LINK} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Join our Discord for the next cohort</a>
        <Link href="/circle#sessions" className={btnSecondary}>Weekly sessions</Link>
      </div>
    </div>
  );
}

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

const snapshotItems = [
  {
    n: "01",
    title: "Weekly learning themes",
    desc: "From everyday conversation and grammar to academic reading, writing, and listening.",
  },
  {
    n: "02",
    title: "Real English practice",
    desc: "Join speaking sessions, quizzes, forums, and activities designed to keep you practicing.",
  },
  {
    n: "03",
    title: "A community to grow with",
    desc: "Learn alongside young people across Southeast Asia in a supportive, low-pressure environment.",
  },
];

const whoShouldJoin = [
  "A high school student building your English foundation",
  "A university student strengthening academic & professional English",
  "A fresh graduate preparing for your next opportunity",
  "A young professional who wants consistent practice",
];

const whatsIncluded = [
  "Weekly Learning Material Delivery (Thursdays)",
  "Community Forum & Mini Games (Wednesdays)",
  "Evaluation Quiz (Fridays)",
  "Speaking Club / English Hangout (Saturdays)",
  "Official E-Certificate",
  "Lifetime Access to Learning Materials",
];

/* ================= PAGE ================= */

export default function IELSCircleAgendaPage() {
  const [pressed, setPressed] = useState<number | null>(null);

  // Program Timeline: drag-to-scroll pakai mouse di desktop (bukan cuma
  // touch/keyboard) + tombol panah sebagai alternatif yang lebih jelas.
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const onTimelinePointerDown = (e: React.MouseEvent) => {
    const el = timelineRef.current;
    if (!el) return;
    dragRef.current.isDown = true;
    dragRef.current.moved = false;
    dragRef.current.startX = e.pageX - el.offsetLeft;
    dragRef.current.scrollLeft = el.scrollLeft;
  };

  const stopTimelineDrag = () => {
    dragRef.current.isDown = false;
  };

  const onTimelinePointerMove = (e: React.MouseEvent) => {
    const el = timelineRef.current;
    if (!el || !dragRef.current.isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragRef.current.startX;
    if (Math.abs(walk) > 5) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - walk;
  };

  const scrollTimeline = (direction: 1 | -1) => {
    const el = timelineRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="bg-white text-[#2F4157] [&_:is(h1,h2,h3,h4,h5,h6)]:font-sans">

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden border-b border-[#E6E9EE] bg-white">

        <div className="relative max-w-6xl mx-auto px-6 py-14 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            {/* LEFT — MAIN MESSAGE */}
            <div>
              {/* Program Identity */}
              <div className="flex items-center gap-3 mb-7">
                <Image
                  src="/images/logos/events/circleblue.png"
                  alt="IELS Circle"
                  width={180}
                  height={48}
                  className="h-9 w-auto"
                  priority
                />
                <span className="h-5 w-px bg-[#E6E9EE]" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#2F4157]/60 whitespace-nowrap">
                    In collaboration with
                  </span>
                  {/* TODO: ganti dengan logo Tofly.id */}
                  <Image
                    src="/images/logos/company/tofly.png"
                    alt="Tofly.id"
                    width={180}
                    height={48}
                    className="h-8 w-auto"
                    priority
                  />
                </div>
              </div>

              {/* Small contextual label */}
              <div className="inline-flex items-center gap-2 mb-6">
                <span className="w-2 h-2 rounded-full bg-[#E56668]" />
                <span className="text-sm font-semibold text-[#577E90] tracking-wide">
                  FREE 8-WEEK ENGLISH COMMUNITY
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A2534] leading-[1.05] tracking-tight max-w-3xl">
                Make English a part of your{" "}
                <span className="text-[#E56668]">everyday life.</span>
              </h1>

              {/* Supporting copy */}
              <p className="mt-7 text-base sm:text-lg text-[#2F4157]/80 leading-relaxed max-w-2xl">
                Join an 8-week learning community where you can practice English,
                meet like-minded young people, and build a habit of using English
                beyond the classroom.
              </p>

              {/* CTA */}
              <div className="mt-9 flex flex-col items-start gap-4">
                <CohortCta label="Join IELS Circle" />

                <span className="text-sm text-[#2F4157]/60">
                  Free to join · Sep 11 – Oct 9, 2026
                </span>
              </div>
            </div>

            {/* RIGHT — PROGRAM SNAPSHOT */}
            <div className="lg:justify-self-end w-full max-w-md">
              <div className="rounded-3xl bg-white p-7 sm:p-8 border border-[#E6E9EE]">
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
                    <span className="text-xs font-bold text-[#E56668]">FREE</span>
                  </div>
                </div>

                <div className="mt-7 space-y-5">
                  {snapshotItems.map((item) => (
                    <div key={item.n} className="flex gap-4">
                      <div className="shrink-0 w-10 h-10 rounded-2xl bg-[#2F4157]/5 flex items-center justify-center">
                        <span className="text-sm font-bold text-[#2F4157]">
                          {item.n}
                        </span>
                      </div>

                      <div>
                        <p className="font-bold text-[#2F4157]">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
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

      {/* ================= QUICK FACTS ================= */}
      <section className="py-14 sm:py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="rounded-3xl bg-white border border-[#E6E9EE] p-7 sm:p-8 text-center sm:text-left">
              <p className="text-4xl sm:text-5xl font-extrabold text-[#2F4157]">
                <CountUp end={19} suffix="K+" />
              </p>
              <p className="mt-2 text-sm sm:text-base font-medium text-gray-500">
                Members across the community
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-[#E6E9EE] p-7 sm:p-8 text-center sm:text-left">
              <p className="text-4xl sm:text-5xl font-extrabold text-[#E56668]">
                <CountUp end={5} />
              </p>
              <p className="mt-2 text-sm sm:text-base font-medium text-gray-500">
                Countries across Southeast Asia
              </p>
            </div>

            <div className="rounded-3xl bg-white border border-[#E6E9EE] p-7 sm:p-8 text-center sm:text-left">
              <p className="text-4xl sm:text-5xl font-extrabold text-[#2F4157]">
                <CountUp end={100} suffix="+" />
              </p>
              <p className="mt-2 text-sm sm:text-base font-medium text-gray-500">
                Learning materials & resources
              </p>
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
              <span className="text-[#E56668]">Actually using it is another.</span>
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
            <div className="rounded-3xl border border-gray-200 bg-white p-7 sm:p-8">
              <p className="text-sm font-semibold text-[#2F4157] mb-6">
                Maybe you&apos;ve felt this before:
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
                That&apos;s what IELS Circle is for.
              </p>

              <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                A place to keep showing up.
              </h3>

              <p className="mt-5 text-white/75 leading-relaxed">
                For 8 weeks, you&apos;ll have a simple rhythm to follow — learn
                something new, practice it, and use it with other people.
              </p>

              <p className="mt-4 text-white/75 leading-relaxed">
                Because progress doesn&apos;t come from studying once.
                <span className="text-white font-semibold"> It comes from coming back.</span>
              </p>

              <div className="mt-7 pt-6 border-t border-white/10">
                <p className="text-sm text-white/50">What you&apos;ll get</p>

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
                We don&apos;t want you to just collect more English materials.
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
                  className="group rounded-3xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#E56668]/60 hover:shadow-xl"
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
              You don&apos;t need to be fluent to join.
              <span className="text-[#E56668]">
                {" "}You just need a place to start — and people to practice with.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ================= PROGRAM TIMELINE (HORIZONTAL) ================= */}
      <section className="bg-white py-16 sm:py-20 overflow-hidden">
        <div className="text-center mb-14 px-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#E56668]" />
            <span className="text-sm font-semibold text-[#E56668] tracking-wide">
              YOUR 8-WEEK JOURNEY
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2F4157] mb-4">
            Program Timeline
          </h2>

          <p className="text-gray-600 max-w-2xl mx-auto">
            A structured, week-by-week journey from everyday conversation to
            confident, natural English.
          </p>

          <p className="mt-2 text-sm font-semibold text-[#E56668] sm:hidden">
            Swipe to see every week →
          </p>
        </div>

        <div className="relative max-w-[1400px] mx-auto">
          {/* desktop nav arrows — drag/swipe works too, this is just the discoverable option */}
          <div className="hidden sm:flex items-center justify-end gap-2 px-12 mb-4">
            <button
              type="button"
              onClick={() => scrollTimeline(-1)}
              aria-label="Previous week"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollTimeline(1)}
              aria-label="Next week"
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-[#2F4157] hover:border-[#E56668] hover:text-[#E56668] transition-colors"
            >
              →
            </button>
          </div>

          <div className="absolute left-0 right-0 top-1/2 h-[6px] bg-[#E56668]/30 rounded-full -translate-y-1/2" />

          <div
            ref={timelineRef}
            onMouseDown={onTimelinePointerDown}
            onMouseMove={onTimelinePointerMove}
            onMouseUp={stopTimelineDrag}
            onMouseLeave={stopTimelineDrag}
            className="overflow-x-auto px-6 sm:px-12 cursor-grab active:cursor-grabbing select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="flex gap-6 sm:gap-8 w-max py-6 mx-auto snap-x snap-mandatory">
              {programTimeline.map((item, i) => {
                const isActive = pressed === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      // abaikan klik yang sebenarnya adalah akhir dari sebuah drag
                      if (dragRef.current.moved) {
                        dragRef.current.moved = false;
                        return;
                      }
                      setPressed(isActive ? null : i);
                    }}
                    className={`
                      relative min-w-[260px] max-w-[260px] sm:min-w-[320px] sm:max-w-[320px]
                      shrink-0 snap-center text-left
                      rounded-3xl bg-white p-6
                      border transition-all duration-300
                      hover:shadow-xl hover:-translate-y-1
                      ${
                        isActive
                          ? "border-[#E56668] shadow-xl -translate-y-1"
                          : "border-gray-200"
                      }
                    `}
                  >
                    <p className="text-sm font-semibold text-[#E56668] mb-2">
                      {item.date}
                    </p>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{item.focus}</p>
                    <ul className="text-sm text-gray-600 space-y-1.5">
                      {item.points.map((p, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-1.5 h-1 w-1 rounded-full bg-[#E56668] shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHO SHOULD JOIN ================= */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-start">
            {/* LEFT CONTENT */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-[#E56668]" />
                <span className="text-sm font-semibold text-[#E56668] tracking-wide">
                  IS THIS FOR YOU?
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2F4157] mb-6">
                Who Should Join?
              </h2>

              <p className="text-gray-700 leading-relaxed mb-6 max-w-xl">
                IELS Circle is open to <b>Southeast Asian youth</b> who are
                passionate about improving their English and becoming more
                confident communicators.
              </p>

              <ul className="space-y-3 text-gray-700">
                {whoShouldJoin.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#E56668] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-sm text-gray-600 max-w-xl">
                You don&apos;t need to be fluent.
                You just need to be <b>willing to learn and grow</b>.
              </p>
            </div>

            {/* RIGHT CONTENT */}
            <div className="relative rounded-3xl border border-gray-200 bg-white p-8">
              {/* ACCENT BAR */}
              <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-[#E56668]" />

              <div className="pl-4">
                <h3 className="text-2xl font-bold mb-6 text-[#2F4157]">
                  What&apos;s Included
                </h3>

                <ul className="space-y-3 text-sm text-gray-700">
                  {whatsIncluded.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="text-[#E56668] font-bold">✔</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="relative overflow-hidden border-t border-[#E6E9EE] bg-white py-16 sm:py-20">

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* IMAGE COLLAGE */}
            <div className="relative h-[300px] sm:h-[360px] lg:h-[440px] w-full flex items-center justify-center">
              {/* IMAGE BACK */}
              <div className="absolute left-4 sm:left-6 lg:left-0 top-10 sm:top-8 lg:top-10 w-[78%] sm:w-[70%] lg:w-[65%] aspect-[4/3] rotate-[-3deg] lg:rotate-[-6deg] rounded-3xl border border-[#E6E9EE] overflow-hidden z-10">
                <Image
                  src="/images/contents/careers/banner/business.jpeg"
                  alt="IELS Circle Speaking Club"
                  fill
                  sizes="(min-width: 1024px) 35vw, 60vw"
                  className="object-cover"
                />
              </div>

              {/* IMAGE FRONT */}
              <div className="absolute right-2 sm:right-4 lg:right-0 bottom-6 sm:bottom-4 lg:bottom-8 w-[82%] sm:w-[75%] lg:w-[70%] aspect-[4/3] rotate-[2deg] lg:rotate-[4deg] rounded-3xl border border-[#E6E9EE] overflow-hidden z-20">
                <Image
                  src="/images/contents/careers/banner/talent.jpeg"
                  alt="IELS Circle Community"
                  fill
                  sizes="(min-width: 1024px) 38vw, 65vw"
                  className="object-cover"
                />
              </div>
            </div>

            {/* CONTENT */}
            <div className="text-[#1A2534]">
              <div className="mb-6 flex items-center gap-4">
                <Image
                  src="/images/logos/events/circleblue.png"
                  alt="IELS Circle"
                  width={180}
                  height={48}
                  className="h-10 w-auto"
                />
                <span className="text-[#2F4157]/50 text-sm">×</span>
                {/* TODO: ganti dengan logo kolaborasi Tofly.id */}
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

              <p className="text-[#2F4157]/80 leading-relaxed max-w-xl mb-8">
                Join a growing community of Southeast Asian youth practicing
                <b> English</b>, building <b>friendships</b>, and growing
                <b> one conversation at a time</b> — completely free.
              </p>

              <div className="space-y-2 text-sm text-[#2F4157]/75 mb-8">
                <p>🧭 Be part of the early Circle members</p>
                <p>🗓️ 8 weeks, 4 activities a week, zero cost</p>
              </div>

              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2F4157]/50 mb-3">
                  Registration closes 9 Oct 2026, 23:59 WIB
                </p>
                <CountdownTimer />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <CohortCta label="Join IELS Circle — It's Free!" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}