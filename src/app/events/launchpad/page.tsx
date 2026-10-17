"use client";

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


/* ================= DATA ================= */

type ProgramItem = {
  date: string;
  title: string;
  focus: string;
  points: string[];
};

const programTimeline: ProgramItem[] = [
  {
    date: "8 Feb 2026",
    title: "Opening Day — Orientation & Global Mindset",
    focus: "Setting direction & activating the community",
    points: [
      "Program overview & expectations",
      "Global career landscape for English majors",
      "Community grouping & activation",
    ],
  },
  {
    date: "14 Feb 2026",
    title: "Day 1 — Remote Work & Global Opportunities",
    focus: "Turning English into global income pathways",
    points: [
      "Remote English-related job mapping",
      "Global platforms & realistic pathways",
      "Personal career mapping session",
    ],
  },
  {
    date: "21 Feb 2026",
    title: "Day 2 — Teaching Abroad & Certification Path",
    focus: "Understanding TEFL / TESL / CELTA realistically",
    points: [
      "Certification types & requirements explained",
      "Teaching contract & application flow",
      "Action plan for teaching abroad pathway",
    ],
  },
  {
    date: "28 Feb 2026",
    title: "Closing Day — Portfolio & Next Steps",
    focus: "Positioning yourself as a global-ready graduate",
    points: [
      "Digital portfolio & global CV guidance",
      "Career positioning as English graduate",
      "Next-step roadmap after Launchpad",
    ],
  },
];

/* ================= PAGE ================= */

export default function EnglishStudentLaunchpadPage() {
  const [pressed, setPressed] = useState<number | null>(null);

  return (
    <div className="bg-white text-[#2F4157]">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/contents/careers/iels_team_0.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-[#2F4157]/85" />

        <div className="relative max-w-6xl mx-auto px-6 py-28">
<div className="mb-6">
  <Image
    src="/images/logos/events/esl.png"
    alt="English Student Launchpad"
    width={180}
    height={48}
    className="
      h-10 w-auto
      brightness-0 invert
      opacity-90
    "
    priority
  />
</div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white max-w-3xl leading-tight">
            English Major?
            <br />
            <span className="text-[#E56668]">Your Classroom Is the World.</span>
          </h1>

          <p className="mt-6 text-white/90 max-w-3xl leading-relaxed">
            English Student Launchpad is an intensive career incubation program
            for English Education & English Literature students who want to turn
            their major into <b>real global opportunities</b>.
          </p>

          <p className="mt-4 text-white/80 max-w-3xl">
            This is not just about learning English —  
            it&apos;s about learning how English can generate income, international
            exposure, and clear career direction.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              className="bg-[#E56668] hover:bg-[#C04C4E] px-8 py-3 rounded-full text-white"
            >
              <Link href="https://forms.gle/gXd2gsBKhgbfsErd9">
                Register Now!
              </Link>
            </Button>
            <span className="text-sm text-white/70 self-center">
              Registration: 1 Jan – 7 Feb 2026
            </span>
          </div>
        </div>
      </section>


    <section className="max-w-6xl mx-auto px-6 py-15">
      <div className="grid lg:grid-cols-2 gap-14 items-start">

        {/* LEFT — STORY */}
        <div>
          <h2 className="text-3xl font-extrabold mb-6">
            Why English Student Launchpad Exists
          </h2>

          <p className="text-gray-700 leading-relaxed max-w-xl mb-6">
            Every year, thousands of English majors graduate with the same
            questions:
          </p>

          <div className="space-y-2 text-gray-700 italic">
            <p>“What career can I actually pursue after graduation?”</p>
            <p>“How do people teach abroad?”</p>
            <p>“Is it possible to earn income from English while still studying?”</p>
          </div>

          <p className="mt-6 text-gray-700 max-w-xl">
            The problem is not English ability.  
            The problem is <b>lack of direction and exposure</b>.
          </p>

          <p className="mt-4 font-semibold text-[#2F4157] max-w-xl">
            English Student Launchpad exists to bridge campus life
            with the real global world.
          </p>
        </div>

        {/* RIGHT — IMPACT NUMBERS */}
        <div className="relative rounded-3xl border border-gray-200 bg-[#FAFAFA] p-8">

          {/* ACCENT BAR */}
          <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-[#E56668]" />

          <div className="pl-4 space-y-8">

            {/* NUMBER 1 */}
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold leading-none">
                <CountUp end={3000} suffix="+" />
              </p>
              <p className="mt-2 text-sm text-gray-600 max-w-sm">
                Indonesian youth mapped across English majors and early careers
              </p>
            </div>

            {/* NUMBER 2 */}
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold leading-none">
                <CountUp end={70} suffix="%" />
              </p>
              <p className="mt-2 text-sm text-gray-600 max-w-sm">
                feel uncertain about career direction after graduation
              </p>
            </div>

            {/* NUMBER 3 */}
            <div>
              <p className="text-4xl sm:text-5xl font-extrabold leading-none">
                <CountUp end={1} /> clear insight
              </p>
              <p className="mt-2 text-sm text-gray-600 max-w-sm">
                keeps appearing: they don&apos;t want just a degree —
                they want <b>real opportunities</b>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CLOSING LINE */}
      <p className="mt-16 max-w-3xl text-lg font-semibold text-[#E56668]">
        English Student Launchpad exists because potential without direction
        is wasted — and we refuse to let that happen.
      </p>
    </section>

  {/* ================= WHAT YOU'LL GET ================= */}
<section className="py-15">
  <div className="max-w-6xl mx-auto px-6">
    <h2 className="text-3xl font-extrabold mb-4">
      What You&apos;ll Get from This Program
    </h2>
    <p className="text-gray-600 max-w-3xl mb-14">
      This is not a one-off webinar.  
      English Student Launchpad is a <b>career launch journey</b> designed to help
      you turn your English major into <b>real, global opportunities</b> — step by step.
    </p>

    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {[
        {
          title: "🌍 Global Career Roadmap",
          desc: "You won't be left guessing. You'll clearly understand realistic pathways to remote work, international roles, and global exposure — and where English actually fits in.",
        },
        {
          title: "🎓 Teaching Abroad Insight (TEFL / TESL)",
          desc: "Learn how teaching abroad really works: certifications, contracts, country requirements, and common myths — explained honestly and practically.",
        },
        {
          title: "🧾 Digital Portfolio & Global Resume",
          desc: "Build a CV, profile, and portfolio that make sense for global markets — not just local campus standards.",
        },
        {
          title: "🤝 Exclusive National Community",
          desc: "Connect with English majors from universities across Indonesia who share the same ambition: global exposure with purpose.",
        },
        {
          title: "💸 Realistic Income Pathway",
          desc: "Understand how English can generate income while you're still a student — including realistic potential up to ± USD 200/month through remote teaching (based on skill & consistency).",
        },
        {
          title: "🚀 Clear Direction, Not Confusion",
          desc: "You'll finish this program knowing your next steps — instead of wondering what to do after graduation.",
        },
      
            ].map((item, i) => {
              const isActive = pressed === i;

              return (
                <div
                  key={i}
                  onPointerDown={() => setPressed(i)}
                  onPointerUp={() => setTimeout(() => setPressed(null), 120)}
                  onPointerLeave={() => setPressed(null)}
                  className={`
                    relative rounded-3xl border bg-white p-7
                    transition-all duration-300
                    ${
                      isActive
                        ? "border-[#E56668] shadow-2xl -translate-y-1"
                        : "border-gray-200 hover:border-[#E56668]/60 hover:-translate-y-1 hover:shadow-xl"
                    }
                  `}
                >
                  <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-[#E56668]" />
                  <div className="pl-4 space-y-3">
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= PROGRAM TIMELINE (HORIZONTAL) ================= */}
      <section className="bg-white py-15 overflow-hidden">
        <div className="text-center mb-14 px-6">
          <h2 className="text-3xl font-extrabold mb-4">
            Program Timeline & Structure
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A structured journey designed to move you from confusion to clarity.
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
        This program is designed for you if you are serious about turning
        English into <b>real global opportunities</b>, not just academic credits.
      </p>

      <ul className="space-y-3 text-gray-700">
        <li>• An English Education student</li>
        <li>• An English Literature student</li>
        <li>• A university student who wants to turn English into global opportunities</li>
        <li>• Someone who wants direction, not confusion after graduation</li>
      </ul>

      <p className="mt-6 text-sm text-gray-600 max-w-xl">
        No prior teaching experience is required.  
        What you need is <b>commitment</b> and <b>curiosity</b>.
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
          <li>✔ Live Program Access (Opening Day, Day 1, Day 2, Closing Day)</li>
          <li>✔ Exclusive Community Access</li>
          <li>✔ Digital Certificate of Completion</li>
          <li>✔ Event Guidebook (step-by-step journey companion)</li>
          <li>✔ Teaching Abroad E-book (TEFL / TESL Guidance)</li>
          <li>✔ Lifetime Access to Program Recordings</li>
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
            alt="English Student Launchpad Session"
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
            alt="English Student Launchpad Community"
            width={600}
            height={420}
            className="object-cover"
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="text-white">

<div className="mb-6">
  <Image
    src="/images/logos/events/esl.png"
    alt="English Student Launchpad"
    width={180}
    height={48}
    className="
      h-10 w-auto
      brightness-0 invert
      opacity-90
    "
    priority
  />
</div>

        <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-6">
          Ready to <span className="text-[#E56668]">Launch</span><br />
          Your Global English Journey?
        </h2>

        <p className="text-white/90 leading-relaxed max-w-xl mb-8">
          Join a growing national network of English students preparing for
          <b> global careers</b>, <b>international exposure</b>, and
          <b> real-world opportunities</b>.
        </p>

        <div className="space-y-2 text-sm text-white/80 mb-10">
          <p>🧭 Be part of the early movers</p>
          <p>🌍 Build global exposure while you&apos;re still a student</p>
        </div>

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
          <Link href="https://forms.gle/gXd2gsBKhgbfsErd9">
            Register Now!
          </Link>
        </Button>
      </div>
    </div>
  </div>
</section>
      <Footer />
    </div>
  );
}