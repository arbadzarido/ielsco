"use client";

import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

import { divisions } from "@/data/careers/divisions";
import Timeline from "@/components/careers/Timeline";
import DivisionCard from "@/components/careers/DivisionCard";
import { Button } from "@/components/ui/button";
import CareersFAQ from "@/components/careers/CareersFAQ";

const DEADLINE = new Date("2026-02-05T23:59:59+07:00");

/* ===== COUNTDOWN (FIXED) ===== */
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    setTimeLeft(DEADLINE.getTime() - new Date().getTime());

    const timer = setInterval(() => {
      setTimeLeft(DEADLINE.getTime() - new Date().getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (timeLeft === null) {
    return null; // Atau bisa return <div>Loading...</div>
  }

  if (timeLeft <= 0) {
    return (
      <span className="text-[#E56668] font-bold text-sm">
        Recruitment Closed
      </span>
    );
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="flex gap-3 justify-center">
      {[
        ["Days", days],
        ["Hours", hours],
        ["Min", minutes],
        ["Sec", seconds],
      ].map(([label, value]) => (
        <div
          key={label}
          className="bg-white/20 rounded-xl px-4 py-2 text-center"
        >
          {/* Suppress hydration warning jika masih ada selisih kecil */}
          <div className="text-xl font-extrabold" suppressHydrationWarning>
            {value}
          </div>
          <p className="text-[10px] uppercase tracking-wide text-white">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}
const benefits = [
  {
    icon: "🚀",
    title: "Real Project Experience",
    proof: "Live programs, not simulations",
    points: [
      "English Global Festival",
      "Global Insight Trips",
      "Institutional & school partnerships",
      "Community & product execution",
    ],
  },
  {
    icon: "🌍",
    title: "Global Exposure & Network",
    proof: "Cross-country collaboration",
    points: [
      "Global universities & mentors",
      "International student interaction",
      "Cross-division collaboration",
    ],
  },
  {
    icon: "📈",
    title: "Measurable Skill Growth",
    proof: "Clear output & evaluation",
    points: [
      "Weekly responsibilities",
      "Defined deliverables",
      "Performance review & feedback",
    ],
  },
  {
    icon: "🧠",
    title: "Leadership & Ownership",
    proof: "Startup-level responsibility",
    points: [
      "Systemic thinking",
      "Professional communication",
      "Decision-making ownership",
    ],
  },
  {
    icon: "📂",
    title: "Strong Portfolio Material",
    proof: "Proof of work, not titles",
    points: [
      "Projects & reports",
      "Campaigns & content",
      "Operational systems",
    ],
  },
  {
    icon: "🏅",
    title: "Long-Term Growth Path",
    proof: "Merit-based progression",
    points: [
      "Manager & Principal track",
      "Lead major IELS programs",
      "External representation",
    ],
  },
];
  


export default function CareersPage() {
  /* ===== CAROUSEL STATE ===== */
  const images = [
    "/images/contents/careers/iels_team_0.png",
    "/images/contents/careers/iels_team_1.png",
    "/images/contents/careers/iels_team_2.png",
    "/images/contents/careers/iels_team_3.png",
 
  ];

  const [currentImage, setCurrentImage] = useState(0);
  const [pressed, setPressed] = useState<number | null>(null);
  const nextSlide = () => {
    setCurrentImage((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentImage((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  return (
    <>

      <div className="min-h-screen bg-[#2F4157] text-white">
        {/* ===== HERO ===== */}
        <section className="text-center py-10 px-4">
{/* HEADER TITLE - CONSISTENT LAYOUT (Mobile & Desktop Same Style) */}
      <div className="flex flex-row items-center justify-center gap-4 sm:gap-6 mb-8 px-2">
        
        {/* BAGIAN KIRI: Emoji & Badge */}
        <div className="relative shrink-0">
          {/* Emoji Besar */}
          <span className="text-7xl sm:text-9xl leading-none drop-shadow-sm">
            💼
          </span>

          {/* Badge Batch 3 (Stempel Nempel di Bawah Kanan Emoji) */}
          <div
            className="
              absolute
              -bottom-0 -right-1      /* Posisi menimpa sedikit di kanan bawah */
               
              rotate-[-12deg]         /* Miring ke kiri */
              bg-[#E56668] text-white
              text-[10px] sm:text-sm font-bold tracking-wider uppercase
              px-2 py-1 sm:px-4 sm:py-1.5
              rounded-md sm:rounded-lg
              shadow-md
              border-2 border-white   /* Outline putih biar rapi */
              z-10
              whitespace-nowrap
            "
          >
            Batch #3
          </div>
        </div>

        {/* BAGIAN KANAN: Teks Judul (Rata Kiri) */}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight text-left">
          IELS Open <br /> Recruitment
        </h1>
      </div>
          <p className="max-w-2xl mx-auto text-base text-gray-200">
            We&apos;re a student-led English learning community empowering youths for global
            opportunities. Explore open positions and be part of our journey.
          </p>
          <br/>
          <p className="max-w-2xl mx-auto font-bold text-gray-200">
          📆 Program Period: 9 months (April – December 2026)</p>

  {/* ===== CAROUSEL ===== */}
<div className="relative mt-8 flex justify-center">
  <div className="relative w-[800px] h-[400px] overflow-hidden rounded-2xl shadow-md">
    {images.map((src, index) => (
      <div
        key={index}
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          currentImage === index ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Apply grayscale filter to the image.
            Use 'grayscale' class from Tailwind.
        */}
        <Image
          src={src}
          alt={`IELS Image ${index + 1}`}
          fill
          className="object-cover grayscale" // Tambahkan 'grayscale' di sini
        />
        
        {/* Optional: Dark overlay to match the mood if needed */}
        {/* <div className="absolute inset-0 bg-black/20 mix-blend-multiply" /> */}
      </div>
    ))}

              {/* ARROWS */}
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/60 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-white transition"
              >
                <span className="text-2xl text-gray-800">‹</span>
              </button>

              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/60 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-white transition"
              >
                <span className="text-2xl text-gray-800">›</span>
              </button>
            </div>
          </div>

          {/* DOTS */}
          <div className="flex justify-center mt-4 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`w-2 h-2 rounded-full ${
                  currentImage === index
                    ? "bg-white"
                    : "bg-gray-400"
                }`}
              />
            ))}
          </div>

              {/* COUNTDOWN (TOP) */}
    <div className="mt-10">
      <p className="text-sm uppercase tracking-widest text-white/70 mb-3">
      </p>
      <CountdownTimer />
    </div>
      
</section>

    <section className="bg-white py-24 px-4">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#2F4157] mb-4">
            What You&apos;ll Gain from IELS
          </h2>
          <p className="text-gray-600 max-w-3xl mx-auto">
            IELS is <b>not a paid internship</b>.  
            What you gain instead is ownership, exposure, and proof of growth —
            the kind that actually compounds.
          </p>
        </div>

        {/* GRID */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => {
            const isActive = pressed === i;

            return (
              <div
                key={i}
                onPointerDown={() => setPressed(i)}
                onPointerUp={() => setTimeout(() => setPressed(null), 120)}
                onPointerLeave={() => setPressed(null)}
                className={`
                  relative rounded-3xl border bg-[#FAFAFA] p-7
                  transition-all duration-300
                  ${
                    isActive
                      ? "border-[#E56668] shadow-2xl -translate-y-1"
                      : "border-gray-200 hover:border-[#E56668]/60 hover:-translate-y-1 hover:shadow-xl"
                  }
                `}
              >
                {/* RED ACCENT BAR */}
                <div
                  className={`
                    absolute left-0 top-6 bottom-6 w-1 rounded-full
                    transition-all duration-300
                    ${isActive ? "bg-[#E56668]" : "bg-transparent group-hover:bg-[#E56668]"}
                  `}
                />

                <div className="pl-4 flex flex-col gap-4">

                  {/* HEADER */}
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{b.icon}</span>
                    <h3
                      className={`
                        text-xl font-bold transition
                        ${
                          isActive
                            ? "text-[#E56668]"
                            : "text-[#2F4157] group-hover:text-[#E56668]"
                        }
                      `}
                    >
                      {b.title}
                    </h3>
                  </div>

                  {/* PROOF LINE */}
                  <p className="text-sm font-semibold text-[#E56668]">
                    {b.proof}
                  </p>

                  {/* DETAILS */}
                  <ul className="text-sm text-gray-600 space-y-2">
                    {b.points.map((p, idx) => (
                      <li key={idx}>• {p}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

        

        {/* ===== TIMELINE ===== */}
        <Timeline />

        {/* ===== DIVISIONS ===== */}
        <section id="division" className="py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto text-center mb-14">
            <h2 className="text-3xl font-extrabold text-[#2F4157] mb-4">
              Explore Divisions
            </h2>
            <p className="text-gray-600">
              Choose where you want to grow and create impact.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {divisions.map((division) => (
              <DivisionCard
                key={division.slug}
                slug={division.slug}
                title={division.title}
                image={division.image}
                description={division.description}
              />
            ))}
          </div>
        </section>
        <CareersFAQ/>

 {/* ===== STRATEGIC PLAN CTA (Refactored) ===== */}
      <section className="relative bg-[#2f4157] py-20 overflow-hidden">
        
        {/* SUBTLE BACKGROUND GLOW */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-[#E56668]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-white/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* LEFT SIDE: VISUAL MOCKUP (Strategic Plan Cover) */}
            <div className="relative w-full flex items-center justify-center lg:justify-end order-1 lg:order-1">
              
              {/* DECORATIVE ELEMENTS BEHIND */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#E56668]/30 to-transparent rounded-full blur-3xl opacity-40 scale-90" />
              
              {/* THE CARD / COVER */}
              <div 
                className="
                  relative
                  w-[80%] sm:w-[60%] lg:w-[80%]
                  aspect-[16/9]
                  rounded-2xl
                  border-4 border-white/10
                  shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                  overflow-hidden
                  transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500
                  z-10
                  bg-[#1a2634]
                "
              >
                {/* GANTI SRC INI DENGAN PATH GAMBAR COVER DECK KAMU */}
                <Image
                  src="/images/contents/careers/strategic-plan.png" // Placeholder sementara, ganti dengan cover asli
                  alt="IELS 1-Year Strategic Plan Cover"
                  fill
                  className="object-cover opacity-90 hover:opacity-100 transition-opacity"
                />
                
                {/* Overlay text jika belum ada gambar cover asli (Opsional) */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                   <p className="text-white font-bold text-xl sm:text-2xl opacity-80 uppercase tracking-widest border-2 border-white px-4 py-2">
                      Strategic Plan 2026
                   </p>
                </div>
              </div>
              
              {/* Floating Badge (Opsional) */}
              <div className="absolute -bottom-6 -right-4 sm:right-10 bg-white text-[#2F4157] px-4 py-2 rounded-lg font-bold shadow-xl rotate-[5deg] z-20">
                 💡 Read our vision
              </div>
            </div>

            {/* RIGHT SIDE: CONTENT & ACTION */}
            <div className="text-white text-center lg:text-left order-2 lg:order-2">
              
              <div className="inline-block px-3 py-1 bg-[#E56668]/20 text-[#E56668] rounded-full text-xs font-bold tracking-widest uppercase mb-4 border border-[#E56668]/30">
                Transparent & Visionary
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-6">
                Ready to Grow with IELS? <br/>
                <span className="text-[#E56668]">Understand Our Direction.</span>
              </h2>

              <p className="text-white/80 leading-relaxed text-sm mb-8 max-w-xl mx-auto lg:mx-0">
                Before you apply, we want you to know exactly where we are heading.
                Read our <b>1-Year Strategic Plan</b> to see our big goals, 
                how we operate, and where <i>you</i> fit into the picture.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {/* PRIMARY CTA: READ STRATEGIC PLAN */}
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
    max-w-full
                  "
                >
                  <a
                    href="https://drive.google.com/file/d/1JgTczzvuf6nwpMMkLmMUGO0TrUkkJLXN/view?usp=sharing" // Masukkan Link Canva di sini
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📄 Read Strategic Plan
                  </a>
                </Button>

                {/* SECONDARY CTA: EXPLORE DIVISIONS */}
                <Button 
                  asChild
                  className="
   bg-white text-[#2F4157]
    font-semibold
    px-6 py-3
    rounded-full
    hover:bg-white/90
    transition-all duration-300
    active:scale-[0.97]
    shadow-lg hover:shadow-xl

    w-full sm:w-auto
    max-w-full
                  "
                >
                  <a href="#division">
                    Explore Divisions
                  </a>
                </Button>
              </div>

              <p className="mt-6 text-sm text-white/50 italic">
                *We recommend reading the plan before choosing a division.
              </p>

            </div>

          </div>
        </div>
     
    {/* CONTACT */}
        <div className="py-10 text-center pb-4">
          <p>
            Questions? Reach us at{" "}
            <a
              href="mailto:careers@ielsco.com"
              className="underline text-white font-semibold"
            >
              careers@ielsco.com
            </a>
          </p>
        </div>
        </section>



        <Footer />
      </div>
    </>
  );
}
