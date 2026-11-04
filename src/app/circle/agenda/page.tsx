"use client";

import Footer from "@/components/footer";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { CIRCLE_ACTIVITIES, CIRCLE_COHORT } from "@/data/dashboard/circle";
import { CIRCLE_DISCORD_LINK, CIRCLE_REGISTRATION_LINK } from "@/components/circle/PublicSessions";
import { btnAccent, btnSecondary, card, container, eyebrow, focusRing, h1, h2, h3, lead, body, pill, section, siteRoot } from "@/components/site/ui";
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

/* ================= STATUS (computed from the real cohort dates) ================= */

type Status = "upcoming" | "live" | "done";

// Today in Jakarta (WIB) as YYYY-MM-DD; null until mounted so server and client markup agree.
function useTodayWib() {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10)), []);
  return today;
}

function statusOf(start: string, end: string, today: string | null): Status | null {
  if (!today) return null;
  if (today < start) return "upcoming";
  if (today > end) return "done";
  return "live";
}

const STATUS_LABEL: Record<Status, string> = { upcoming: "Upcoming", live: "In progress", done: "Completed" };
const STATUS_STYLE: Record<Status, string> = {
  upcoming: "border-[#E6E9EE] bg-white text-[#2F4157]/70",
  live: "border-[#E56668]/30 bg-[#E56668]/10 text-[#C94F51]",
  done: "border-[#E6E9EE] bg-[#F1F4F8] text-[#2F4157]/60",
};

function StatusBadge({ status }: { status: Status | null }) {
  if (!status) return null;
  return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[12px] font-bold", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

const COHORT_START = CIRCLE_ACTIVITIES[0].start;
const COHORT_END = CIRCLE_ACTIVITIES[CIRCLE_ACTIVITIES.length - 1].end;

const valueProps = [
  { number: "01", title: "Practice, not just study", desc: "Turn what you learn into conversations, writing, quizzes, and everyday English practice." },
  { number: "02", title: "Consistency made easier", desc: "A simple weekly rhythm gives you a reason to keep coming back without overwhelming your schedule." },
  { number: "03", title: "Speak without the pressure", desc: "Practice with other learners in a supportive environment where mistakes are part of learning." },
  { number: "04", title: "Learn beyond the textbook", desc: "Explore English through real conversations, entertainment, games, podcasts, and practical topics." },
  { number: "05", title: "Meet people who get it", desc: "Connect with fellow Southeast Asian youth who are also learning, growing, and figuring things out." },
  { number: "06", title: "Finish with something tangible", desc: "Complete the journey, celebrate your progress, and receive an official e-certificate." },
];

const sectionHead = (kicker: string, title: string, id: string, intro?: string) => (
  <div className="max-w-[720px]">
    <p className={eyebrow}>{kicker}</p>
    <h2 id={id} className={cn(h2, "mt-3")}>{title}</h2>
    {intro && <p className={cn(lead, "mt-4")}>{intro}</p>}
  </div>
);

/* ================= PAGE ================= */

export default function IELSCircleAgendaPage() {
  const [pressed, setPressed] = useState<number | null>(null);
  const today = useTodayWib();
  const [regOpen, setRegOpen] = useState<boolean | null>(null);
  useEffect(() => setRegOpen(REGISTRATION_DEADLINE.getTime() > Date.now()), []);
  const cohortStatus = statusOf(COHORT_START, COHORT_END, today);

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
    <div className={cn(siteRoot, "bg-white text-[#2F4157]")} data-testid="circle-agenda-page">
      {/* ================= HERO ================= */}
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[80px] md:pt-[64px]" aria-labelledby="agenda-h1">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]")}>
          <div>
            <Link href="/circle" className={cn("inline-block rounded", focusRing)}>
              <Image src="/images/logos/circle/circle-typeface-blue.svg" alt="IELS Circle" width={49} height={72} priority className="h-[72px] w-auto" />
            </Link>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className={eyebrow}>Oct – Dec 2026 cohort</span>
              <StatusBadge status={cohortStatus} />
            </div>
            <h1 id="agenda-h1" className={cn(h1, "mt-4 max-w-[760px]")}>
              Make English a part of your <span className="text-[#E56668]">everyday life.</span>
            </h1>
            <p className={cn(lead, "mt-6 max-w-[620px]")}>
              IELS Circle is our English speaking club and community across Southeast Asia. This 8-week cohort adds weekly themes,
              quizzes and speaking practice on top of the recurring weekly sessions.
            </p>
            <div className="mt-8">
              <CohortCta label="Join IELS Circle" />
              <p className="mt-4 text-[14px] text-[#2F4157]/60">Free to join · Registration ran Sep 11 – Oct 9, 2026</p>
            </div>
          </div>

          <div className={cn(card, "w-full p-7 sm:p-8 lg:justify-self-end")}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#E56668]">Your 8-week journey</p>
                <h2 className={cn(h3, "mt-2 text-[24px]")}>Learn. Practice. Connect.</h2>
              </div>
              <span className="shrink-0 rounded-full bg-[#E56668]/10 px-3 py-1.5 text-[12px] font-bold text-[#E56668]">FREE</span>
            </div>
            <ul className="mt-6 space-y-5">
              {snapshotItems.map((item) => (
                <li key={item.n} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2F4157]/5 text-[14px] font-bold text-[#2F4157]">{item.n}</span>
                  <div>
                    <p className="text-[16px] font-bold text-[#1A2534]">{item.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#2F4157]/70">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#E6E9EE] pt-5 text-[15px]">
              <span className="text-[#2F4157]/70">October 12 – December 12, 2026</span>
              <span className="font-semibold text-[#E56668]">8 weeks</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= QUICK FACTS ================= */}
      <section className="border-y border-[#E6E9EE] bg-white py-[40px] md:py-[56px]" aria-label="IELS Circle at a glance">
        <div className={cn(container, "grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6")}>
          {[
            { node: <CountUp end={19} suffix="K+" />, label: "Members across the community" },
            { node: <CountUp end={5} />, label: "Countries across Southeast Asia" },
            { node: <CountUp end={100} suffix="+" />, label: "Learning materials & resources" },
          ].map((f) => (
            <div key={f.label} className={cn(card, "p-6 sm:p-7")}>
              <p className="text-[40px] leading-none text-[#1A2534] sm:text-[48px]">{f.node}</p>
              <p className="mt-3 text-[16px] font-medium text-[#2F4157]/70">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= WHY IELS CIRCLE ================= */}
      <section className={section} aria-labelledby="why-heading">
        <div className={container}>
          {sectionHead("Why IELS Circle", "Knowing English is one thing. Actually using it is another.", "why-heading",
            "You might understand the grammar. You might know hundreds of words. But becoming confident in English takes more than knowing what is correct — it takes a place where you can keep practicing.")}

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className={cn(card, "p-7 sm:p-8")}>
              <p className="mb-6 text-[16px] font-semibold text-[#1A2534]">Maybe you&apos;ve felt this before:</p>
              <ul className="space-y-4">
                {[
                  "I keep starting to learn English, but I never stay consistent.",
                  "I understand English, but I still freeze when I have to speak.",
                  "I want to practice, but practicing alone gets boring.",
                ].map((q) => (
                  <li key={q} className="flex items-start gap-3">
                    <span aria-hidden="true" className="text-[20px] leading-none text-[#E56668]">“</span>
                    <p className={body}>{q}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[20px] bg-[#2F4157] p-7 text-white sm:p-8">
              <p className="mb-3 text-[15px] font-semibold text-[#F4A3A4]">That&apos;s what IELS Circle is for.</p>
              <h3 className="text-[26px] font-extrabold leading-tight sm:text-[30px]">A place to keep showing up.</h3>
              <p className="mt-4 text-[16px] leading-relaxed text-white/80">
                For 8 weeks, you&apos;ll have a simple rhythm to follow — learn something new, practice it, and use it with other people.
              </p>
              <p className="mt-3 text-[16px] leading-relaxed text-white/80">
                Because progress doesn&apos;t come from studying once.
                <span className="font-semibold text-white"> It comes from coming back.</span>
              </p>
              <div className="mt-6 border-t border-white/15 pt-5">
                <p className="text-[14px] text-white/60">What you&apos;ll get</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {["Weekly learning", "Speaking practice", "Community activities", "Evaluation quizzes", "Learning materials", "E-Certificate"].map((item) => (
                    <li key={item} className="rounded-full bg-white/10 px-3 py-1.5 text-[14px] text-white/90">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <h3 className="text-[24px] font-extrabold text-[#1A2534] sm:text-[28px]">What makes the Circle different?</h3>
            <p className={cn(body, "mt-2 max-w-[640px]")}>
              We don&apos;t want you to just collect more English materials. We want you to actually use what you learn.
            </p>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {valueProps.map((item) => (
                <li key={item.number} className={cn(card, "p-6 transition-colors hover:border-[#C9D1DC]")}>
                  <span className="text-[14px] font-bold text-[#577E90]">{item.number}</span>
                  <h4 className="mt-4 text-[18px] font-bold text-[#1A2534]">{item.title}</h4>
                  <p className={cn(body, "mt-2 text-[15px]")}>{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-14 max-w-[760px] text-[22px] font-bold leading-relaxed text-[#1A2534] sm:text-[26px]">
            You don&apos;t need to be fluent to join.
            <span className="text-[#E56668]"> You just need a place to start — and people to practice with.</span>
          </p>
        </div>
      </section>

      {/* ================= PROGRAM TIMELINE (HORIZONTAL) ================= */}
      <section className={cn(section, "overflow-hidden border-t border-[#E6E9EE]")} aria-labelledby="timeline-heading">
        <div className={cn(container, "flex flex-col gap-6 md:flex-row md:items-end md:justify-between")}>
          {sectionHead("Your 8-week journey", "Program timeline", "timeline-heading",
            "A structured, week-by-week journey from everyday conversation to confident, natural English.")}
          <div className="flex items-center gap-4">
            <p className="text-[14px] font-semibold text-[#577E90] sm:hidden">Swipe to see every week →</p>
            {/* desktop nav arrows — drag/swipe works too, this is just the discoverable option */}
            <div className="hidden items-center gap-2 sm:flex">
              <button type="button" onClick={() => scrollTimeline(-1)} aria-label="Previous week"
                className={cn("flex h-11 w-11 items-center justify-center rounded-full border border-[#D5DBE3] text-[#2F4157] transition-colors hover:border-[#2F4157]", focusRing)}>←</button>
              <button type="button" onClick={() => scrollTimeline(1)} aria-label="Next week"
                className={cn("flex h-11 w-11 items-center justify-center rounded-full border border-[#D5DBE3] text-[#2F4157] transition-colors hover:border-[#2F4157]", focusRing)}>→</button>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-[1400px]">
          <div
            ref={timelineRef}
            onMouseDown={onTimelinePointerDown}
            onMouseMove={onTimelinePointerMove}
            onMouseUp={stopTimelineDrag}
            onMouseLeave={stopTimelineDrag}
            className="cursor-grab select-none overflow-x-auto px-4 pb-4 active:cursor-grabbing sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            <div className="flex w-max snap-x snap-mandatory gap-4 sm:gap-5">
              {programTimeline.map((item, i) => {
                const isActive = pressed === i;
                const act = CIRCLE_ACTIVITIES[i];
                const st = act ? statusOf(act.start, act.end, today) : null;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      // abaikan klik yang sebenarnya adalah akhir dari sebuah drag
                      if (dragRef.current.moved) {
                        dragRef.current.moved = false;
                        return;
                      }
                      setPressed(isActive ? null : i);
                    }}
                    className={cn(
                      "min-w-[264px] max-w-[264px] shrink-0 snap-center rounded-[20px] border bg-white p-6 text-left transition-[border-color,box-shadow] sm:min-w-[320px] sm:max-w-[320px]",
                      focusRing,
                      isActive ? "border-[#2F4157] shadow-[0_12px_32px_rgba(26,37,52,0.1)]" : st === "live" ? "border-[#E56668]" : "border-[#E6E9EE] hover:border-[#C9D1DC]",
                      st === "done" && !isActive && "opacity-80",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-[#577E90]">{item.date}</p>
                      <StatusBadge status={st} />
                    </div>
                    <h3 className="mt-3 text-[18px] font-bold leading-snug text-[#1A2534]">{item.title}</h3>
                    <p className="mt-2 text-[15px] text-[#2F4157]/75">{item.focus}</p>
                    <ul className="mt-4 space-y-1.5 text-[15px] text-[#2F4157]/75">
                      {item.points.map((p, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#E56668]" />
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
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="who-heading">
        <div className={cn(container, "grid items-start gap-12 lg:grid-cols-2")}>
          <div>
            <p className={eyebrow}>Is this for you?</p>
            <h2 id="who-heading" className={cn(h2, "mt-3")}>Who should join?</h2>
            <p className={cn(lead, "mt-4 max-w-[560px]")}>
              IELS Circle is open to <b>Southeast Asian youth</b> who are passionate about improving their English and becoming more confident communicators.
            </p>
            <ul className="mt-6 space-y-3">
              {whoShouldJoin.map((item) => (
                <li key={item} className={cn(body, "flex gap-3")}>
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E56668]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className={cn(body, "mt-6 max-w-[560px]")}>
              You don&apos;t need to be fluent. You just need to be <b>willing to learn and grow</b>.
            </p>
          </div>

          <div className={cn(card, "p-7 sm:p-8")}>
            <h3 className="text-[22px] font-bold text-[#1A2534]">What&apos;s included</h3>
            <ul className="mt-5 divide-y divide-[#E6E9EE]">
              {whatsIncluded.map((item) => (
                <li key={item} className="flex gap-3 py-3 text-[16px] text-[#2F4157]/85">
                  <span aria-hidden="true" className="font-bold text-[#E56668]">✔</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="agenda-cta-heading">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-2")}>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[20px] border border-[#E6E9EE]">
              <Image src="/images/contents/careers/banner/business.jpeg" alt="IELS Circle Speaking Club" fill sizes="(min-width: 1024px) 280px, 45vw" className="object-cover" />
            </div>
            <div className="relative mt-8 aspect-[3/4] overflow-hidden rounded-[20px] border border-[#E6E9EE]">
              <Image src="/images/contents/careers/banner/talent.jpeg" alt="IELS Circle Community" fill sizes="(min-width: 1024px) 280px, 45vw" className="object-cover" />
            </div>
          </div>

          <div className="text-[#1A2534]">
            <Image src="/images/logos/circle/circle-c-blue.svg" alt="" width={44} height={50} className="h-[50px] w-auto" />
            <h2 id="agenda-cta-heading" className={cn(h2, "mt-5")}>
              Ready to join the <span className="text-[#E56668]">Circle</span>?
            </h2>
            <p className={cn(lead, "mt-4 max-w-[560px]")}>
              Join a growing community of Southeast Asian youth practicing <b>English</b>, building <b>friendships</b>, and growing <b>one conversation at a time</b> — completely free.
            </p>
            <ul className={cn(body, "mt-6 space-y-2")}>
              <li>🧭 Be part of the early Circle members</li>
              <li>🗓️ 8 weeks, 4 activities a week, zero cost</li>
            </ul>

            <div className="mt-8">
              {regOpen !== false && (
                <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-[#2F4157]/55">
                  Registration closes 9 Oct 2026, 23:59 WIB
                </p>
              )}
              <CountdownTimer />
            </div>

            <div className="mt-8">
              <CohortCta label="Join IELS Circle — It's Free!" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
