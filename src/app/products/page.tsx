"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function ProductsPage() {
  const [pressed, setPressed] = useState<string | null>(null);

  const products = [
    {
      name: "IELS Lounge",
      desc: "A structured English learning community for daily practice, mentorship, and global networking.",
      emoji: "💬",
      href: "/iels-lounge",
    },
    {
      name: "IELS Courses",
      desc: "Guided English courses focused on real-world communication, tests, and professional growth.",
      emoji: "🎓",
      href: "/products/courses",
    },
    {
      name: "IELS English Test",
      desc: "IELTS, TOEFL, and TOEIC mock tests with AI scoring and educator feedback.",
      emoji: "🧠",
      href: "/test",
    },
    {
      name: "IELS for Schools",
      desc: "One-year structured English programs for schools & universities with measurable outcomes.",
      emoji: "🏫",
      href: "https://school.ielsco.com",
    },
    {
      name: "Resources & Recordings",
      desc: "Premium e-books, recorded sessions, and digital resources for independent learning.",
      emoji: "📚",
      href: "/products/resources",
    },
  ];

  const events = [
    {
      title: "English Global Festival",
      desc: "IELS flagship annual event connecting English learners, educators, and global partners.",
    },
    {
      title: "Step Up!",
      desc: "Skill-boosting program focused on academic & professional English readiness.",
    },
    {
      title: "IELS Insight Series",
      desc: "Regular discussions with mentors, universities, and global professionals.",
    },
    {
      title: "Singapore Global Insight Trip",
      desc: "International exposure program with universities & institutions in Singapore.",
    },
  ];

  return (
    <div>
      <Header />

      <main className="min-h-screen bg-gradient-to-b from-white to-[#f7f9f8] text-[#294154]">

        {/* ================= HERO ================= */}
        <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">
            The IELS Learning Ecosystem 🌍
          </h1>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            IELS is not just a course or a community.  
            It is a connected ecosystem designed to help learners grow, perform,
            and access global opportunities.
          </p>
        </section>

   {/* ================= PRODUCTS ================= */}
<section className="max-w-6xl mx-auto px-6 pb-24">
  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
    {products.map((p) => {
      const isActive = pressed === p.name;

      return (
        <div
          key={p.name}
          onPointerDown={() => setPressed(p.name)}
          onPointerUp={() => setTimeout(() => setPressed(null), 120)}
          onPointerLeave={() => setPressed(null)}
          className={`
            relative group rounded-3xl border bg-white p-8
            flex flex-col h-full /* Membuat card menjadi kontainer flex vertikal */
            transition-all duration-300
            ${
              isActive
                ? "border-[#E56668] shadow-2xl -translate-y-1"
                : "border-[#294154]/10 hover:border-[#E56668]/60 hover:-translate-y-1 hover:shadow-xl"
            }
          `}
        >
          {/* Accent Line */}
          <div
            className={`
              absolute left-0 top-8 bottom-8 w-1.5 rounded-r-full
              transition-all duration-300
              ${isActive ? "bg-[#E56668]" : "bg-transparent group-hover:bg-[#E56668]"}
            `}
          />

          {/* Content Area */}
          <div className="flex flex-col flex-grow">
            <div className="text-4xl mb-4">{p.emoji}</div>
            <h3 className="text-xl font-bold mb-3 text-[#294154]">{p.name}</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-8">
              {p.desc}
            </p>
          </div>

          {/* Footer Area — Tombol diletakkan di sini dengan mt-auto agar sejajar */}
          <div className="mt-auto pt-1">
            <Button
              asChild
              className="
                w-full bg-[#E56668] text-white 
                rounded-full font-semibold py-3
                hover:bg-[#C04C4E] transition-all duration-300
                active:scale-[0.97] shadow-md hover:shadow-lg
              "
            >
              <Link href={p.href}>
                Explore {p.name}
              </Link>
            </Button>
          </div>
        </div>
      );
    })}
  </div>
</section>

{/* ================= FLAGSHIP EVENTS (EDITORIAL) ================= */}
<section className="relative py-15 px-6 overflow-hidden bg-white">

  {/* SUBTLE BACKGROUND SHAPE */}
  <div className="absolute -top-32 -right-32 w-[420px] h-[420px] bg-[#E56668]/10 rounded-full blur-[140px]" />

  <div className="relative max-w-6xl mx-auto grid gap-14 lg:grid-cols-2 items-center">

    {/* LEFT — EVENT DOCUMENTATION IMAGE */}
    <div
      className="
        group relative h-[360px] sm:h-[420px] w-full
        overflow-hidden rounded-3xl
        shadow-2xl
        transition-all duration-500
        hover:-translate-y-1
      "
    >
      <img
        src="/images/contents/careers/iels_team_0.png"
        alt="IELS Flagship Event Experience"
        className="
          absolute inset-0 w-full h-full object-cover
          transition-transform duration-700
          group-hover:scale-105
        "
      />

      {/* EDITORIAL OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#2F4157]/60 via-[#2F4157]/20 to-transparent" />

      {/* LABEL */}
      <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold text-[#2F4157] shadow">
        Real IELS Moments
      </div>
    </div>

    {/* RIGHT — CONTENT */}
    <div className="flex flex-col gap-8">

      {/* HEADER */}
      <div>
        <p className="uppercase tracking-widest text-sm text-[#E56668] font-semibold mb-3">
          IELS Experiences
        </p>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2F4157] mb-5 leading-tight">
          Where Learning Turns Into <br className="hidden sm:block" />
          <span className="text-[#E56668]">Real Exposure</span>
        </h2>

        <p className="text-gray-600 max-w-xl leading-relaxed">
          IELS flagship events are <b>not seminars or passive webinars</b>.
          They are curated exposure platforms where learners
          <b> collaborate, present ideas, get challenged</b>,
          and connect directly with global institutions and partners.
        </p>
      </div>

      {/* EVENT LIST */}
      <ul className="space-y-4">
        {[
          {
            name: "English Global Festival",
            desc: "National-scale showcase of English, ideas, and youth collaboration.",
          },
          {
            name: "Step Up!",
            desc: "Career acceleration programs for students ready to move beyond campus.",
          },
          {
            name: "IELS Insight Series",
            desc: "Focused discussions with practitioners, mentors, and global partners.",
          },
          {
            name: "Singapore Global Insight Trip",
            desc: "Flagship international exposure connecting global insight with local impact.",
          },
        ].map((event) => (
          <li
            key={event.name}
            className="
              group flex gap-4
              transition-all duration-300
            "
          >
            <span className="mt-2 w-2 h-2 rounded-full bg-[#E56668] flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#2F4157] group-hover:text-[#E56668] transition">
                {event.name}
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                {event.desc}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="pt-4">
        <Button
          asChild
          className="
            bg-[#E56668] text-white
            px-8 py-3 rounded-full
            font-semibold
            hover:bg-[#C04C4E]
            transition-all duration-300
            active:scale-[0.97]
            shadow-lg hover:shadow-xl
            w-full sm:w-auto
          "
        >
          <Link href="/events">
            See What&apos;s Running Now
          </Link>
        </Button>
      </div>
    </div>

  </div>
</section>

      </main>

      <Footer />
    </div>
  );
}