"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import CountUp from "react-countup";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GIFPopup from "@/components/GIFPopup";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, GraduationCap, Briefcase, TrendingUp, Star, CheckCircle } from "lucide-react";

// =========================================
// MASCOT COMPONENT (3D Parallax + Stop-Motion)
// =========================================
function MascotHero() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const frames = [
    "/images/contents/mascot/hi.svg",
    "/images/contents/mascot/hi2.svg",
    "/images/contents/mascot/elco.svg",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [frames.length]);

  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 15;
    const y = -(e.clientY - top - height / 2) / 15;
    setTilt({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="order-1 lg:order-none flex justify-center items-center w-full lg:w-1/2 z-10 animate-fadeIn" style={{ perspective: "1000px" }}>
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={() => setIsClicked(true)}
        onMouseUp={() => setIsClicked(false)}
        className="relative w-[280px] sm:w-[400px] lg:w-[600px] aspect-square cursor-grab active:cursor-grabbing"
        style={{
          transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale3d(${isClicked ? 0.9 : 1}, ${isClicked ? 0.9 : 1}, 1)`,
          transition: isHovered && !isClicked ? "transform 0.1s ease-out" : "transform 0.4s cubic-bezier(0.25, 1.5, 0.5, 1)",
          transformStyle: "preserve-3d",
        }}
      >
        {frames.map((src, index) => (
          <Image
            key={src}
            src={src}
            alt={`IELS Mascot Pose ${index + 1}`}
            fill
            priority
            sizes="(max-width: 640px) 280px, (max-width: 1024px) 400px, 600px"
            className={`object-contain mx-auto transition-opacity duration-0 ${
              index === currentFrame ? "opacity-100" : "opacity-0"
            }`}
            style={{
              filter: `drop-shadow(${tilt.x * -1 + 6}px ${tilt.y + 6}px 0px rgba(26,37,52,0.12))`,
            }}
          />
        ))}
        <div
          className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-300 mix-blend-overlay"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.x * 2}% ${50 - tilt.y * 2}%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}

// =========================================
// PARTICLE CANVAS (Antigravity-style)
// =========================================
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let mouse = { x: -9999, y: -9999 };
    const PARTICLE_COUNT = 220;
    const MAGNET_RADIUS = 120;
    const FIELD_STRENGTH = 8;
    const LERP = 0.08;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => { mouse.x = -9999; mouse.y = -9999; };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // Particle init
    const particles = Array.from({ length: PARTICLE_COUNT }, () => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * Math.min(canvas.width, canvas.height) * 0.38;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      return {
        ox: cx + Math.cos(angle) * radius * (0.6 + Math.random() * 0.8),
        oy: cy + Math.sin(angle) * radius * (0.6 + Math.random() * 0.8),
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: 0, vy: 0,
        size: 1.2 + Math.random() * 2,
        alpha: 0.25 + Math.random() * 0.55,
        // warm off-white / soft coral so they're visible on dark bg
        color: Math.random() > 0.65 ? "#E56668" : "#FAFAFA",
        waveOffset: Math.random() * Math.PI * 2,
        waveSpeed: 0.008 + Math.random() * 0.012,
      };
    });

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 1;

      for (const p of particles) {
        // gentle wave drift on origin
        const ox = p.ox + Math.sin(t * p.waveSpeed + p.waveOffset) * 12;
        const oy = p.oy + Math.cos(t * p.waveSpeed * 0.7 + p.waveOffset) * 8;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let tx = ox, ty = oy;
        if (dist < MAGNET_RADIUS && dist > 1) {
          const force = (1 - dist / MAGNET_RADIUS) * FIELD_STRENGTH;
          // repel
          tx = p.x - (dx / dist) * force * 14;
          ty = p.y - (dy / dist) * force * 14;
        }

        p.vx += (tx - p.x) * LERP;
        p.vy += (ty - p.y) * LERP;
        p.vx *= 0.82;
        p.vy *= 0.82;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        // capsule: two circles connected
        const hw = p.size;
        const hh = p.size * 2.2;
        ctx.ellipse(p.x, p.y, hw, hh, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ zIndex: 1 }}
    />
  );
}

// =========================================
// MAIN PAGE
// =========================================
export default function Home() {
  const studyPartners = [
    { name: "Deakin University", logo: "/images/logos/uni/deakin.png" },
    { name: "Monash University", logo: "/images/logos/uni/monash.png" },
    { name: "WSU", logo: "/images/logos/uni/wsu.jpg" },
    { name: "NUS", logo: "/images/logos/uni/nus.png" },
  ];

  const workPartners = [
    { name: "Skilio", logo: "/images/logos/company/skilio.png" },
    { name: "Glints", logo: "/images/logos/company/glints.png" },
    { name: "Upwork", logo: "/images/logos/company/upwork.png" },
    { name: "Teman Startup", logo: "/images/logos/company/ts.png" },
  ];

  const journeySteps = [
    {
      num: "01",
      tag: "For Beginners",
      title: "Build the Foundation",
      desc: "Master the basics, build your confidence, and find your voice in our inclusive community.",
      icon: "/images/contents/general/speaking.png",
      accent: "bg-[#1A2534]",
      tagColor: "bg-white/10 text-white/70",
    },
    {
      num: "02",
      tag: "EPT Prep",
      title: "Bridge to Proficiency",
      desc: "Targeted IELTS & TOEFL preparation. Get the scores you need to unlock global opportunities.",
      icon: "/images/contents/general/pencil.png",
      accent: "bg-[#E56668]",
      tagColor: "bg-white/20 text-white/90",
    },
    {
      num: "03",
      tag: "Goal Tracking",
      title: "Reach Your Goal",
      desc: "Visualize your progress. Whether it's a dream university or a work abroad career, we help you bridge the gap.",
      icon: "/images/contents/general/globe.png",
      accent: "bg-[#1A2534]",
      tagColor: "bg-white/10 text-white/70",
    },
  ];

  return (
    <div className="bg-[#FAFAFA] min-h-screen font-sans selection:bg-[#E56668] selection:text-white overflow-x-hidden text-[#1A2534]">
      <Header />
      <main className="flex flex-col w-full">
{/* =========================================
    1️⃣ HERO SECTION — Clean, Aesthetic & Close
========================================= */}
<section className="relative flex flex-col lg:flex-row items-center justify-center w-full gap-4 lg:gap-4 pt-28 sm:pt-32 lg:pt-36 pb-20 lg:pb-28 overflow-hidden bg-[#FAFAFA] px-6 sm:px-12 lg:px-[100px]">

  {/* Background Foto Community IELS (Opacity Kecil) */}
  <div className="absolute inset-0 z-0">
    <Image 
      src="/images/contents/careers/iels_team_0.png" 
      alt="IELS Community" 
      fill 
      priority
      className="object-cover opacity-[0.07]" 
    />
  </div>

  {/* Subtle Grid Background (Ditumpuk di atas foto biar estetik) */}
  <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#1A25340A_1px,transparent_1px),linear-gradient(to_bottom,#1A25340A_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>

  {/* Mascot — z-10 (Lebih deket karena gap dikecilin & width di-adjust) */}
  <div className="relative z-10 order-1 lg:order-none w-full lg:w-[45%] flex justify-center lg:justify-end lg:pr-4">
    <MascotHero />
  </div>

  {/* Text — z-10 */}
  <div className="relative z-20 order-2 lg:order-none flex flex-col justify-center items-center lg:items-start text-center lg:text-left w-full lg:w-[55%] space-y-7 lg:pl-4">

    {/* Badge (Udah diganti ke Southeast Asia) */}
    <span className="inline-flex items-center gap-2 bg-white border-2 border-[#1A2534] shadow-[2px_2px_0px_#1A2534] text-[#1A2534] px-5 py-2 rounded-full text-sm font-bold tracking-wide animate-fadeIn">
      🌏 Southeast Asia's Goal-Driven English Ecosystem
    </span>

    {/* Headline — Dark text on light background */}
    <h1 className="text-[38px] sm:text-[50px] lg:text-[64px] leading-[1.07] text-[#1A2534] font-sans animate-fadeIn" style={{ animationDelay: "100ms" }}>
      <span className="font-extrabold block">Your English Journey,</span>
      <span className="font-extrabold text-[#E56668] block relative">
        Personalized for
        <br className="hidden sm:block" /> Your Ambition.
        {/* Scribble underline */}
        <svg
          className="absolute w-[103%] h-4 -bottom-1 -left-1 opacity-70"
          viewBox="0 0 340 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2 12 C60 4, 150 2, 250 8 S310 14, 338 10" stroke="#E56668" strokeWidth="4" strokeLinecap="round" fill="none" />
        </svg>
      </span>
    </h1>

    <p className="text-base sm:text-lg lg:text-xl text-[#2F4157] max-w-xl leading-relaxed animate-fadeIn font-medium" style={{ animationDelay: "200ms" }}>
      From building the basics to acing IELTS & TOEFL — we give you the community, 
      resources, and progress tracking to{" "}
      <span className="font-bold text-[#1A2534]">study or work abroad.</span>
    </p>

    <div className="flex flex-col sm:flex-row gap-4 pt-2 w-full sm:w-auto animate-fadeIn" style={{ animationDelay: "400ms" }}>
      <Button asChild className="bg-[#E56668] text-white font-extrabold px-10 py-3 text-lg border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] hover:shadow-[6px_6px_0px_#1A2534] hover:-translate-y-1 transition-all duration-300 rounded-full group w-full sm:w-auto">
        <Link href="/welcome/start" className="flex items-center justify-center gap-2">
          Find Your Path
          <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
        </Link>
      </Button>

      <Button asChild className="bg-white text-[#1A2534] font-extrabold px-10 py-3 text-lg border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] hover:bg-[#1A2534] hover:text-white hover:shadow-[6px_6px_0px_#E56668] hover:-translate-y-1 transition-all duration-300 rounded-full w-full sm:w-auto">
        <Link href="/about" className="flex items-center justify-center">Learn More</Link>
      </Button>
    </div>
  </div>
</section>
        {/* =========================================
            2️⃣ STATS STRIP
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-14 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
              {[
                { num: 8700,  suffix: "+", label: "Active Members",  desc: "Growing daily",           color: "text-[#E56668]", sep: true  },
                { num: 810,   suffix: "+", label: "Success Stories",  desc: "Scholarships & awards",   color: "text-[#1A2534]", sep: false },
                { num: 135,   suffix: "+", label: "Global Careers",   desc: "Remote jobs & interns",   color: "text-[#E56668]", sep: false },
                { num: 35,    suffix: "+", label: "Study Abroad",     desc: "International programs",  color: "text-[#1A2534]", sep: false },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-[#FAFAFA] p-6 sm:p-8 rounded-[28px] border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 text-center sm:text-left"
                >
                  <p className={`text-4xl sm:text-5xl font-black ${stat.color} mb-2 tracking-tighter`}>
                    <CountUp end={stat.num} duration={2.5} separator="," enableScrollSpy />{stat.suffix}
                  </p>
                  <p className="text-base sm:text-lg font-bold text-[#1A2534]">{stat.label}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            3️⃣ JOURNEY STAIRCASE SECTION
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-20 lg:py-28 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto">

            {/* Header */}
            <div className="text-center space-y-5 mb-20">
              <span className="inline-block bg-white border-2 border-[#1A2534] text-[#E56668] font-extrabold text-sm tracking-widest uppercase px-5 py-2 rounded-full shadow-[2px_2px_0px_#1A2534]">
                Your Learning Path
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A2534] leading-tight tracking-tight">
                Master English at Every<br />
                <span className="text-[#E56668]">Stage of Your Goal.</span>
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium">
                No matter where you start, IELS gives you a clear, structured path to your global destination.
              </p>
            </div>

            {/* Staircase — Desktop */}
            <div className="hidden lg:flex flex-col gap-0 relative">
              {/* Vertical line */}
              <div className="absolute left-[50%] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#1A2534]/10 via-[#E56668]/40 to-[#1A2534]/10 -translate-x-1/2 z-0" />

              {journeySteps.map((step, i) => {
                const isEven = i % 2 === 0;
                return (
                  <div
                    key={i}
                    className={`relative flex items-center gap-0 mb-8 ${isEven ? "flex-row" : "flex-row-reverse"}`}
                  >
                    {/* Card */}
                    <div className={`w-[calc(50%-48px)] ${isEven ? "mr-auto pl-0 pr-8" : "ml-auto pr-0 pl-8"}`}>
                      <div
                        className={`${step.accent} rounded-[36px] p-8 lg:p-10 text-white border-2 border-[#1A2534] shadow-[6px_6px_0px_#1A2534] group hover:-translate-y-2 hover:shadow-[10px_10px_0px_#1A2534] transition-all duration-300`}
                        style={{ marginTop: i === 1 ? "56px" : i === 2 ? "112px" : "0px" }}
                      >
                        <span className={`text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-5 inline-block ${step.tagColor} border border-white/20`}>
                          {step.tag}
                        </span>

                        <div className="flex items-start gap-5 mb-5">
                          <div className="w-16 h-16 bg-white/15 border-2 border-white/30 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <Image src={step.icon} alt={step.title} width={40} height={40} className="object-contain" />
                          </div>
                          <div>
                            <p className="text-5xl font-black text-white/20 leading-none mb-1">{step.num}</p>
                            <h3 className="text-2xl font-extrabold text-white leading-tight">{step.title}</h3>
                          </div>
                        </div>

                        <p className="text-white/85 leading-relaxed text-base font-medium">{step.desc}</p>
                      </div>
                    </div>

                    {/* Center dot on line */}
                    <div className="absolute left-1/2 -translate-x-1/2 z-10 flex items-center justify-center"
                      style={{ top: i === 0 ? "40px" : i === 1 ? "96px" : "152px" }}>
                      <div className="w-10 h-10 rounded-full bg-[#E56668] border-4 border-white shadow-[0_0_0_3px_#1A2534] flex items-center justify-center">
                        <span className="text-white font-black text-sm">{i + 1}</span>
                      </div>
                    </div>

                    {/* Spacer for other side */}
                    <div className={`w-[calc(50%-48px)] ${isEven ? "ml-auto" : "mr-auto"}`} />
                  </div>
                );
              })}
            </div>

            {/* Staircase — Mobile (vertical stack) */}
            <div className="lg:hidden flex flex-col gap-6 relative">
              <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#1A2534]/10 via-[#E56668]/40 to-[#1A2534]/10 z-0" />
              {journeySteps.map((step, i) => (
                <div key={i} className="flex gap-5 relative z-10">
                  {/* Dot */}
                  <div className="w-12 h-12 rounded-full bg-[#E56668] border-4 border-white shadow-[0_0_0_2px_#1A2534] flex items-center justify-center shrink-0 mt-2">
                    <span className="text-white font-black text-sm">{i + 1}</span>
                  </div>
                  <div className={`${step.accent} rounded-[28px] p-7 text-white border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] flex-1`}>
                    <span className={`text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block ${step.tagColor} border border-white/20`}>
                      {step.tag}
                    </span>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                        <Image src={step.icon} alt={step.title} width={32} height={32} className="object-contain" />
                      </div>
                      <h3 className="text-xl font-extrabold text-white">{step.title}</h3>
                    </div>
                    <p className="text-white/85 leading-relaxed text-sm font-medium">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom CTA under staircase */}
            <div className="text-center mt-20">
              <Button asChild className="bg-[#E56668] text-white font-bold px-10 py-3 text-lg border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] hover:shadow-[6px_6px_0px_#1A2534] hover:-translate-y-1 transition-all duration-300 rounded-full group">
                <Link href="/welcome/start" className="flex items-center justify-center gap-2">
                  Take Our Free Assessment
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* =========================================
            4️⃣ PATHS SECTION
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto">

            <div className="text-center space-y-4 mb-16">
              <span className="inline-block border-2 border-[#E56668] text-[#E56668] font-extrabold text-sm tracking-widest uppercase px-5 py-2 rounded-full shadow-[2px_2px_0px_#E56668]">
                Choose Your Track
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A2534] tracking-tight">
                Study or Work.<br />
                <span className="text-[#E56668]">We'll Get You There.</span>
              </h2>
            </div>

            <div className="grid lg:grid-cols-2 gap-10">

              {/* Study Path */}
              <div className="relative bg-[#1A2534] border-2 border-[#1A2534] rounded-[40px] p-10 lg:p-14 text-white shadow-[8px_8px_0px_#E56668] group hover:-translate-y-2 hover:shadow-[12px_12px_0px_#E56668] transition-all duration-300">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-[#E56668] border-2 border-white rounded-2xl flex items-center justify-center mb-8 shadow-[3px_3px_0px_#FFF] transform -rotate-3 group-hover:rotate-0 transition-transform duration-300">
                    <GraduationCap size={32} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl font-extrabold mb-4">Study Abroad</h3>
                  <p className="text-white/85 mb-10 leading-relaxed text-lg font-medium">
                    Win scholarships, ace standardized tests, and secure admission to top universities worldwide. We guide you from English proficiency to application success.
                  </p>
                  <div className="mb-10 mt-auto">
                    <div className="flex items-center gap-4 bg-white/8 p-4 rounded-2xl border-2 border-[#E56668]">
                      <div className="w-10 h-10 rounded-full bg-[#E56668] flex items-center justify-center shrink-0 border-2 border-white">
                        <CheckCircle size={18} className="text-white" />
                      </div>
                      <span className="text-sm font-bold">Direct access to 9+ world-class university networks</span>
                    </div>
                  </div>
                  <div className="border-t-2 border-dashed border-white/25 pt-6">
                    <p className="text-xs text-[#E56668] mb-4 uppercase tracking-widest font-extrabold">Partner Universities</p>
                    <div className="grid grid-cols-4 gap-3">
                      {studyPartners.map((partner, index) => (
                        <div key={index} className="bg-white rounded-xl h-14 flex items-center justify-center p-2 border-2 border-transparent hover:border-[#E56668] transition-colors overflow-hidden">
                          <Image src={partner.logo} alt={partner.name} width={80} height={40} loading="lazy" className="object-contain max-h-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Path */}
              <div className="relative bg-[#E56668] border-2 border-[#1A2534] rounded-[40px] p-10 lg:p-14 text-white shadow-[8px_8px_0px_#1A2534] group hover:-translate-y-2 hover:shadow-[12px_12px_0px_#1A2534] transition-all duration-300 lg:mt-12">
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-[#1A2534] border-2 border-white rounded-2xl flex items-center justify-center mb-8 shadow-[3px_3px_0px_#FFF] transform rotate-3 group-hover:rotate-0 transition-transform duration-300">
                    <Briefcase size={32} className="text-white" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-3xl font-extrabold mb-4">Global Careers</h3>
                  <p className="text-white/90 mb-10 leading-relaxed text-lg font-medium">
                    Land remote jobs, secure international internships, and build professional careers with global companies. From interview prep to job placement.
                  </p>
                  <div className="mb-10 mt-auto">
                    <div className="flex items-center gap-4 bg-white/15 p-4 rounded-2xl border-2 border-[#1A2534]">
                      <div className="w-10 h-10 rounded-full bg-[#1A2534] flex items-center justify-center shrink-0 border-2 border-white">
                        <CheckCircle size={18} className="text-white" />
                      </div>
                      <span className="text-sm font-bold">Strategic career pipeline to 30+ MNCs in Asia Pacific</span>
                    </div>
                  </div>
                  <div className="border-t-2 border-dashed border-white/25 pt-6">
                    <p className="text-xs text-[#1A2534] mb-4 uppercase tracking-widest font-extrabold">Partner Companies</p>
                    <div className="grid grid-cols-4 gap-3">
                      {workPartners.map((partner, index) => (
                        <div key={index} className="bg-white rounded-xl h-14 flex items-center justify-center p-2 border-2 border-transparent hover:border-[#1A2534] transition-colors overflow-hidden">
                          <Image src={partner.logo} alt={partner.name} width={80} height={40} loading="lazy" className="object-contain max-h-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            5️⃣ MEMBER STORIES
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-16 lg:py-24 bg-[#1A2534] relative overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10">

            <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left order-1 lg:order-none">
              <div className="inline-block border-2 border-[#E56668] bg-[#E56668] text-white px-5 py-2 rounded-full font-black text-sm tracking-widest uppercase shadow-[3px_3px_0px_rgba(255,255,255,0.3)]">
                Social Proof
              </div>
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight">
                They made it.<br />
                <span className="text-[#E56668]">You're next.</span>
              </h2>
              <p className="text-white/80 text-lg font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                From academic exchanges at Tohoku University to international programs in the Philippines. Our members are proving that with the right ecosystem, Indonesian talent is absolutely unstoppable.
              </p>
              <div className="pt-4">
                <Button asChild className="bg-[#E56668] text-white font-extrabold border-2 border-white shadow-[4px_4px_0px_rgba(255,255,255,0.3)] hover:shadow-[6px_6px_0px_rgba(255,255,255,0.4)] hover:-translate-y-1 rounded-full px-10 py-3 text-lg group w-full sm:w-auto transition-all duration-300">
                  <Link href="/stories" className="flex items-center justify-center gap-3">
                    Discover Their Stories
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="w-full lg:w-1/2 order-2 lg:order-none">
              {/* Desktop Cards */}
              <div className="hidden lg:block relative w-full h-[540px]">
                <div className="absolute top-8 right-8 w-[320px] bg-[#FAFAFA] border-2 border-[#1A2534] rounded-[24px] p-6 shadow-[6px_6px_0px_#E56668] transform rotate-3 hover:rotate-0 hover:-translate-y-2 transition-all duration-300 z-20 cursor-default">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1A2534] shadow-[2px_2px_0px_#1A2534] relative shrink-0">
                      <Image src="/images/contents/stories/member-stories/profile/jo.png" alt="George Abraham" fill className="object-cover" />
                    </div>
                    <div>
                      <p className="font-extrabold text-[#1A2534] text-base leading-tight">George "Jo" Abraham</p>
                      <p className="text-[10px] text-[#E56668] font-black uppercase tracking-wider mt-0.5">ISUFST, Philippines</p>
                    </div>
                  </div>
                  <p className="text-[#1A2534] font-medium text-sm italic leading-relaxed">
                    "English isn't just a subject—it's a passport. If you have the willingness to learn and the courage to use it, the world becomes a lot closer."
                  </p>
                </div>

                <div className="absolute bottom-8 left-0 w-[340px] bg-[#FAFAFA] border-2 border-[#1A2534] rounded-[24px] p-6 shadow-[6px_6px_0px_#E56668] transform -rotate-3 hover:rotate-0 hover:-translate-y-2 transition-all duration-300 z-30 cursor-default">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#1A2534] shadow-[2px_2px_0px_#1A2534] relative shrink-0">
                      <Image src="/images/contents/stories/member-stories/profile/dzakwan.png" alt="Ahmad Zakwaan" fill className="object-cover" />
                    </div>
                    <div>
                      <p className="font-extrabold text-[#1A2534] text-base leading-tight">Ahmad Zakwaan</p>
                      <p className="text-[10px] text-[#E56668] font-black uppercase tracking-wider mt-0.5">Tohoku Univ, Japan</p>
                    </div>
                  </div>
                  <p className="text-[#1A2534] font-medium text-sm italic leading-relaxed">
                    "Studying in an international space robotics lab was a dream. English skills are the absolute key to unlocking global opportunity."
                  </p>
                </div>

                <div className="absolute top-[38%] left-[14%] w-[210px] bg-[#E56668] border-2 border-white rounded-[24px] p-6 shadow-[4px_4px_0px_rgba(255,255,255,0.4)] transform -translate-y-1/2 -rotate-6 hover:rotate-0 transition-all duration-300 z-10 text-white cursor-default">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => <Star key={i} fill="currentColor" className="text-yellow-300 w-5 h-5" />)}
                  </div>
                  <p className="font-black text-5xl mb-1 tracking-tighter">110+</p>
                  <p className="text-sm font-bold leading-tight opacity-90">Success stories written by our amazing community.</p>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-5 lg:hidden mt-4">
                <div className="bg-[#E56668] border-2 border-white rounded-[20px] p-5 text-white text-center">
                  <div className="flex justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} fill="currentColor" className="text-yellow-300 w-4 h-4" />)}
                  </div>
                  <p className="font-black text-3xl mb-1">110+</p>
                  <p className="text-sm opacity-90">Global Success Stories</p>
                </div>
                {[
                  { img: "/images/contents/stories/member-stories/profile/jo.png", name: 'George "Jo" Abraham', loc: "ISUFST, Philippines", quote: "English isn't just a subject—it's a passport. The world becomes a lot closer." },
                  { img: "/images/contents/stories/member-stories/profile/dzakwan.png", name: "Ahmad Zakwaan", loc: "Tohoku Univ, Japan", quote: "English skills are the absolute key to unlocking global opportunity." },
                ].map((c, i) => (
                  <div key={i} className="bg-[#FAFAFA] border-2 border-[#1A2534] rounded-[20px] p-5 shadow-[4px_4px_0px_#E56668]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#1A2534] relative shrink-0">
                        <Image src={c.img} alt={c.name} fill className="object-cover" />
                      </div>
                      <div>
                        <p className="font-extrabold text-[#1A2534] text-sm">{c.name}</p>
                        <p className="text-[10px] text-[#E56668] font-black uppercase tracking-wider">{c.loc}</p>
                      </div>
                    </div>
                    <p className="text-[#1A2534] text-sm italic font-medium">"{c.quote}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            6️⃣ IELS LOUNGE
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-16 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto">
            <div className="bg-[#1A2534] border-2 border-[#1A2534] rounded-[48px] p-10 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 overflow-hidden relative shadow-[8px_8px_0px_#E56668]">

              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#E56668]/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10 text-center lg:text-left max-w-2xl">
                <span className="font-extrabold tracking-widest uppercase text-sm mb-5 inline-block bg-[#E56668] text-white px-5 py-2 rounded-full border-2 border-white/30 shadow-[2px_2px_0px_rgba(255,255,255,0.2)]">
                  Daily Practice
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
                  Speak English<br />
                  <span className="text-[#E56668]">Every Night</span> at IELS Lounge
                </h2>
                <p className="text-white/80 text-lg mb-10 leading-relaxed font-medium">
                  Join 8,700+ members practicing English in real conversations. Build confidence, make friends, and improve naturally through daily speaking sessions.
                </p>
                <Button asChild className="bg-[#E56668] text-white font-bold hover:bg-[#c94f51] rounded-full px-10 py-3 text-lg group w-full sm:w-auto border-2 border-white/30 shadow-[4px_4px_0px_rgba(255,255,255,0.2)] hover:shadow-[6px_6px_0px_rgba(255,255,255,0.3)] hover:-translate-y-1 transition-all duration-300">
                  <Link href="/iels-lounge" className="flex items-center justify-center gap-3">
                    Join the Community
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </Link>
                </Button>
              </div>

              <div className="relative z-10 flex-shrink-0">
                <Image
                  src="/images/contents/general/landing_page_3.png"
                  alt="IELS Lounge"
                  width={400}
                  height={400}
                  loading="lazy"
                  sizes="(max-width: 640px) 280px, (max-width: 1024px) 350px, 400px"
                  className="w-[260px] sm:w-[320px] lg:w-[380px] h-auto object-contain -rotate-3 hover:rotate-0 transition-transform duration-500"
                  style={{ filter: "drop-shadow(0 0 20px rgba(229,102,104,0.4))" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            7️⃣ PRODUCTS — Icon Grid with IELS imagery
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-16 bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">

              {[
                {
                  icon: "/images/contents/general/laptop.png",
                  iconBg: "bg-[#E56668]/10 group-hover:bg-[#E56668]",
                  title: "IELS English Test",
                  desc: "Measure your real communication skills and get personalized recommendations for improvement.",
                  link: "/test",
                  linkText: "Take the Test",
                  linkColor: "text-[#E56668] hover:border-[#E56668]",
                },
                {
                  icon: "/images/contents/general/chat.png",
                  iconBg: "bg-[#1A2534]/10 group-hover:bg-[#1A2534]",
                  title: "Global Events",
                  desc: "Join workshops, bootcamps, and speaking clubs guided by global mentors and industry experts.",
                  link: "/events",
                  linkText: "See What's On",
                  linkColor: "text-[#1A2534] hover:border-[#1A2534]",
                },
                {
                  icon: "/images/contents/general/bookmark_icon.png",
                  iconBg: "bg-[#E56668]/10 group-hover:bg-[#E56668]",
                  title: "Free Resources",
                  desc: "Access a vast library of e-books, grammar guides, and study materials — completely free.",
                  link: "/products/resources",
                  linkText: "Access Library",
                  linkColor: "text-[#E56668] hover:border-[#E56668]",
                },
              ].map((card, i) => (
                <div key={i} className="bg-white p-10 rounded-[40px] border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] hover:-translate-y-2 hover:shadow-[8px_8px_0px_#E56668] transition-all duration-300 group">
                  <div className={`w-16 h-16 ${card.iconBg} border-2 border-[#1A2534] rounded-2xl flex items-center justify-center mb-8 transition-colors duration-500`}>
                    <Image src={card.icon} alt={card.title} width={36} height={36} className="object-contain" />
                  </div>
                  <h3 className="font-extrabold text-2xl text-[#1A2534] mb-4">{card.title}</h3>
                  <p className="text-gray-600 mb-8 leading-relaxed font-medium">{card.desc}</p>
                  <Link href={card.link} className={`inline-flex items-center gap-2 font-extrabold hover:gap-4 transition-all uppercase tracking-wide text-sm border-b-2 border-transparent pb-1 ${card.linkColor}`}>
                    {card.linkText} <ArrowRight size={18} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================
            8️⃣ FINAL CTA
        ========================================= */}
        <section className="w-full bg-[#FAFAFA] text-center pt-20 pb-40 px-6 sm:px-12 lg:px-[100px] relative border-t-2 border-dashed border-gray-200">

          {/* Decorative icons — tasteful, not chaotic */}
          <div className="absolute top-10 left-[8%] opacity-15 w-20 h-20 hidden lg:block">
            <Image src="/images/contents/general/globe.png" alt="" fill className="object-contain" />
          </div>
          <div className="absolute top-14 right-[8%] opacity-15 w-20 h-20 hidden lg:block">
            <Image src="/images/contents/general/pencil.png" alt="" fill className="object-contain" />
          </div>
          <div className="absolute bottom-28 left-[12%] opacity-10 w-16 h-16 hidden lg:block">
            <Image src="/images/contents/general/speaking.png" alt="" fill className="object-contain" />
          </div>
          <div className="absolute bottom-28 right-[12%] opacity-10 w-16 h-16 hidden lg:block">
            <Image src="/images/contents/general/chat.png" alt="" fill className="object-contain" />
          </div>

          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-10 relative z-10">
            <div className="space-y-6">
              <h2 className="text-[44px] sm:text-[60px] lg:text-[76px] font-extrabold leading-[1.07] text-[#1A2534] tracking-tight">
                Ready to Go{" "}
                <span className="text-[#E56668] relative inline-block">
                  Global?
                  <svg className="absolute w-full h-3 -bottom-1 left-0 opacity-60" viewBox="0 0 200 12" fill="none">
                    <path d="M2 9 C40 3, 100 1, 198 7" stroke="#E56668" strokeWidth="4" strokeLinecap="round" fill="none" />
                  </svg>
                </span>
              </h2>
              <p className="text-xl sm:text-2xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
                Join thousands of ambitious Indonesian students building their path to scholarships, remote careers, and international opportunities.
              </p>
            </div>

            <Button asChild className="bg-[#E56668] text-white font-extrabold px-14 py-3 text-xl border-2 border-[#1A2534] shadow-[6px_6px_0px_#1A2534] hover:shadow-[8px_8px_0px_#1A2534] hover:-translate-y-2 transition-all duration-300 rounded-full group">
              <Link href="/welcome/start" className="flex items-center justify-center gap-4">
                Start Now!
                <ArrowRight className="group-hover:translate-x-2 transition-transform" size={24} />
              </Link>
            </Button>

            <p className="text-sm text-gray-400 font-medium">Free to join · 8,700+ members · Start in 2 minutes</p>
          </div>
        </section>

      </main>

      <Footer />
      <GIFPopup />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}