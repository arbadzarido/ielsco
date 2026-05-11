"use client";
// src/app/courses/page.tsx

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CurriculumModal from "@/components/courses/CurriculumModal";
import MentorCard from "@/components/courses/MentorCard";
import CourseCard from "@/components/courses/CourseCard";
import {
  MENTORS, COURSE_PACKAGES, TRACK_META, GOOGLE_FORM_URL, WHATSAPP_URL,
  CoursePackage, CourseTrack, Mentor, PRICE_PER_SESSION
} from "@/data/courses";
import {
  ChevronDown, CheckCircle, Filter, Calendar, Search, Sliders, MessageCircle,
  ExternalLink, Check, Zap, Star, Award, Users, ArrowRight, Video, Gift
} from "lucide-react";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
const DEADLINE = new Date("2026-05-11T23:59:59+07:00"); // Maksimal 11 Mei 2026

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
    return <div className="text-[#E56668] font-bold py-2 bg-[#E56668]/10 rounded-lg text-center">Registration Closed</div>;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="flex gap-2 sm:gap-3 justify-center sm:justify-start">
      {[["Days", days], ["Hours", hours], ["Min", minutes], ["Sec", seconds]].map(
        ([label, value]) => (
          <div key={label} className="bg-black/20 rounded-lg px-3 sm:px-4 py-2 border border-white/5 flex-1 max-w-[80px] text-center backdrop-blur-sm">
            <div className="text-xl sm:text-2xl font-black text-white">{value}</div>
            <p className="text-[10px] sm:text-xs uppercase tracking-wide text-white/60 font-bold mt-0.5">
              {label}
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default function CoursesPage() {
  const [selectedTrack, setSelectedTrack] = useState<CourseTrack | null>(null);
  const [filterMentor, setFilterMentor] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customSessions, setCustomSessions] = useState(10);
  
  // --- Carousel State & Logic buat Mentors ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const itemWidth = target.scrollWidth / MENTORS.length;
    const newIndex = Math.round(target.scrollLeft / itemWidth);
    setActiveIndex(newIndex);
  };

  const scrollToMentor = (index: number) => {
    if (!scrollRef.current) return;
    const target = scrollRef.current;
    const itemWidth = target.scrollWidth / MENTORS.length;
    target.scrollTo({
      left: index * itemWidth,
      behavior: "smooth",
    });
  };

  const filteredPackages = COURSE_PACKAGES.filter((p) => {
    if (filterMentor !== "all" && p.mentorId !== filterMentor) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterTrack !== "all" && p.trackId !== filterTrack) return false;
    return true;
  });

  const handleSelectTrack = (track: CourseTrack) => {
    setFilterTrack(track);
    document.getElementById("courses-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#294154] font-geologica">
      <Header />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2F4157] via-[#243344] to-[#1e2a38] text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #E56668 0%, transparent 50%), radial-gradient(circle at 80% 20%, #4A90E2 0%, transparent 40%)" }} />
        
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider shadow-sm">
                🎓 ONLINE ENGLISH MASTERY COURSE
              </div>
              <h1 className="text-4xl lg:text-5xl font-black leading-tight">
                100 Live Sessions.<br />
                <span className="text-[#E56668]">100 Hours of Tutoring.</span><br />
                100 Days to Transformation.
              </h1>
              <p className="text-white/80 text-lg leading-relaxed max-w-lg">
                The ultimate learning ecosystem. Combine the intense focus of Private 1-on-1s with the dynamic environment of Semi-Private classes. Batch 1 Starts May 18, 2026.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
                  <Check size={16} className="text-emerald-400" /> 4 Private 1-on-1 Sessions
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
                  <Check size={16} className="text-emerald-400" /> 96 Semi-Private Sessions
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
                  <Check size={16} className="text-emerald-400" /> Special Price IDR 360K
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link href={GOOGLE_FORM_URL} target="_blank"
                  className="px-6 py-3 bg-[#E56668] hover:bg-[#C04C4E] text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(229,102,104,0.4)] flex items-center gap-2 hover:-translate-y-0.5">
                  Secure Your Spot <ExternalLink size={16} />
                </Link>
                <Link href={WHATSAPP_URL} target="_blank"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2">
                  <MessageCircle size={16} /> Chat on WhatsApp
                </Link>
              </div>
              <p className="text-xs text-white/50 font-bold tracking-wide">ONLY 30 SEATS AVAILABLE · REGISTRATION CLOSES MAY 11</p>
            </div>

            {/* 3 MENTOR AVATARS */}
            <div className="hidden lg:flex items-center justify-center gap-4 relative">
              {MENTORS.map((mentor, i) => (
                <div key={mentor.id}
                  className="relative transition-transform duration-500 hover:z-30"
                  style={{ 
                    transform: i === 1 ? "scale(1.15) translateY(-16px)" : "scale(0.95)", 
                    zIndex: i === 1 ? 2 : 1 
                  }}>
                  <div className="w-48 h-60 rounded-[24px] overflow-hidden border border-white/20 shadow-2xl relative group">
                    <Image 
                      src={mentor.image} 
                      alt={mentor.name} 
                      fill 
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e2a38]/90 via-[#1e2a38]/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-black text-lg leading-tight mb-0.5">{mentor.name.split(" ")[0]}</p>
                      <p className="text-white/70 text-xs font-medium tracking-wide">{mentor.tagline}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

     {/* =========================================
          FEATURED PROGRAM: 100 LIVE SESSIONS
      ========================================= */}
      <section className="max-w-6xl mx-auto px-6 pb-20 mt-16">
        
        {/* 1. HEADER (Top Center) */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h3 className="text-3xl lg:text-[40px] font-extrabold text-[#304156] mb-3 leading-tight">
            Online English Mastery Course
          </h3>
          <p className="text-[#E56668] text-lg mb-6 font-bold tracking-wide">
            Total: 100 Live Sessions (Private + Semi-Private)
          </p>
          <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
            <strong>Why is this program different?</strong> Intensive consistency (4 days a week, 1 hour a day) to build a habit, intimate learning via semi-private classes, direct mentorship for your specific weaknesses, and lifelong community access.
            <br className="hidden sm:block" />
            <strong>What you'll master:</strong> The English Foundation, Conversational Fluency, Professional & Academic English, and Goal-Oriented Practice (IELTS/TOEFL & Remote Career Readiness).
          </p>
        </div>

        {/* 2. CONTENT GRID (Left Poster, Right Benefits) */}
        <div className="grid md:grid-cols-12 gap-10 lg:gap-14 items-start mb-12">
          
          {/* POSTER 3:4 (Left) */}
          <div className="md:col-span-5 relative group sticky top-28">
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-100 border-[6px] border-white relative shadow-2xl">
              <Image 
                src="/images/contents/events/courses.png" // Ganti path gambarnya ke poster lo
                alt="Online English Mastery Course Poster" 
                fill 
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/40 to-transparent group-hover:opacity-0 transition-opacity duration-500"></div>
              
              <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-sm text-[#E56668] px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                <Calendar className="w-4 h-4" /> Batch 1: May 18
              </div>
            </div>
          </div>

          {/* DETAILS (Right) */}
          <div className="md:col-span-7 flex flex-col justify-center">
            
            {/* CLASS TYPES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
              {/* Private Box */}
              <div className="bg-[#E56668]/5 border border-[#E56668]/20 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Video size={64} className="text-[#E56668]" />
                </div>
                <h4 className="text-[#E56668] font-black text-xl mb-4 relative z-10">4 Private <br/> 1-on-1 Sessions</h4>
                <ul className="space-y-3 relative z-10">
                  {[
                    "Flexible schedule (by request)",
                    "Customized to your learning pace",
                    "1 session/week (Mon–Fri)",
                    "60 minutes/session",
                    "Completed in 1 month"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 font-medium">
                      <CheckCircle size={18} className="text-[#E56668] shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Semi-Private Box */}
              <div className="bg-[#2F4157]/5 border border-[#2F4157]/10 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Users size={64} className="text-[#2F4157]" />
                </div>
                <h4 className="text-[#2F4157] font-black text-xl mb-4 relative z-10">96 Semi-Private <br/> Sessions</h4>
                <ul className="space-y-3 relative z-10">
                  {[
                    "Fixed schedule: Monday & Thursday (20:00–21:00)",
                    "Max. 15 students per class",
                    "60 minutes/session",
                    "Valid for 1 year"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 font-medium">
                      <CheckCircle size={18} className="text-[#2F4157] shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* WHAT YOU'LL GET & BONUS */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 lg:p-8">
              <h4 className="font-black text-[#304156] text-lg mb-5 flex items-center gap-2">
                <Award className="text-[#E56668]" /> What You'll Get
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-8">
                {[
                  "Recording of every private session",
                  "Full access to IELS Lounge Premium",
                  "Personalized English learning dashboard",
                  "Fun & structured learning modules",
                  "Customized study plan & materials",
                  "Supportive learning community",
                  "Tutor consultation sessions",
                  "Speak English confidently & fluently"
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={16} className="text-emerald-500 shrink-0 mt-0.5 font-bold" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                <h4 className="font-black text-amber-900 text-sm mb-3 flex items-center gap-2 uppercase tracking-widest">
                  <Gift size={16} className="text-amber-600" /> Bonus Included
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Live speaking practice",
                    "Tenses handbook",
                    "Assignment & feedback sessions"
                  ].map((bonus, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-amber-800 font-medium">
                      <Star size={14} className="text-amber-500 shrink-0 fill-amber-500" />
                      {bonus}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
        {/* 3. CTA & PRICING (Format 100% Mengikuti Custom Package) */}
          <div className="bg-gradient-to-br from-[#2F4157] to-[#1e2a38] rounded-[32px] p-8 lg:p-12 text-white overflow-hidden relative mt-12 shadow-2xl">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #E56668 0%, transparent 50%)" }} />
            
            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              
              {/* KIRI: Info Harga & Countdown (flex-1) */}
              <div className="flex-1 w-full text-center lg:text-left">
                <div className="inline-block px-3 py-1 bg-[#E56668] border border-[#E56668]/50 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm">
                  ⭐ Special price for Batch 1
                </div>
                
                <div className="flex items-baseline justify-center lg:justify-start gap-2 mb-3">
                  <span className="text-xl font-bold text-white/70">Only</span>
                  <span className="text-5xl lg:text-6xl font-black text-white leading-none tracking-tight">IDR 360K</span>
                </div>
                
                <p className="text-sm font-bold text-white/80 flex items-center justify-center lg:justify-start gap-2 mb-8">
                  <Users className="w-5 h-5 text-[#E56668]" /> Strictly 30 Seats Available
                </p>

                <div className="pt-6 border-t border-white/10">
                  <p className="text-xs uppercase tracking-widest text-white/50 mb-4 font-bold">
                    Registration Closes: May 11, 2026
                  </p>
                  {/* Timer di kiri bareng harga biar rapi dan lega */}
                  <div className="max-w-[340px] mx-auto lg:mx-0">
                    <CountdownTimer />
                  </div>
                </div>
              </div>

              {/* KANAN: Box Action (w-80 persis kayak Custom Package) */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full lg:w-80 shrink-0 shadow-lg">
                <p className="font-black text-white mb-2 text-center lg:text-left text-lg">Secure Your Spot</p>
                <p className="text-xs text-white/60 mb-6 text-center lg:text-left leading-relaxed">
                  Join the Online English Mastery Course before the 30 seats are gone.
                </p>
                
                <div className="flex flex-col gap-3">
                  <Link 
                    href={GOOGLE_FORM_URL} 
                    target="_blank"
                    className="w-full py-3.5 bg-[#E56668] hover:bg-[#c94f51] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(229,102,104,0.4)] whitespace-nowrap"
                  >
                    Register Now <ArrowRight className="w-4 h-4 shrink-0" />
                  </Link>
                  <Link 
                    href={WHATSAPP_URL} 
                    target="_blank"
                    className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4 shrink-0" /> Ask Us
                  </Link>
                </div>
              </div>
              
            </div>
          </div>
          </section>      
          {/* ─── MEET THE MENTORS ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 bg-[#2F4157]/10 text-[#2F4157] rounded-full text-xs font-black uppercase tracking-widest mb-3">
            The Founders
          </span>
          <h2 className="text-3xl font-black text-[#2F4157]">Meet Your Mentors</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
            Click a course track to filter programs.
          </p>
        </div>

        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex md:grid md:grid-cols-2 max-w-4xl mx-auto gap-4 md:gap-8 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 -mx-6 px-6 md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {MENTORS.map((mentor) => (
              <div 
                key={mentor.id} 
                className="w-[85vw] sm:w-[400px] md:w-full shrink-0 snap-center md:snap-align-none flex justify-center"
              >
                <div className="w-full">
                  <MentorCard mentor={mentor} onSelectTrack={handleSelectTrack} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {MENTORS.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToMentor(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeIndex === i ? "w-6 bg-[#E56668]" : "w-2 bg-gray-300"
                }`}
                aria-label={`Go to mentor ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── COURSE PACKAGES ─── */}
      <section id="courses-section" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-[#2F4157]">Signature Programs</h2>
          <p className="text-gray-500 mt-3 text-sm max-w-lg mx-auto leading-relaxed">
            Choose from our 6 specialized tracks. Switch between Intensive (8 sessions) or Extensive (21 sessions) to fit your pace.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-10 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
              <Filter size={14} /> Filter
            </div>
            
            <select 
              value={filterMentor} 
              onChange={e => setFilterMentor(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[#2F4157] cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E56668]/30"
            >
              <option value="all">All Mentors</option>
              {MENTORS.map(m => <option key={m.id} value={m.id}>{m.name.split(" ")[0]}</option>)}
            </select>

            <select 
              value={filterTrack} 
              onChange={e => setFilterTrack(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[#2F4157] cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E56668]/30"
            >
              <option value="all">All Topics</option>
              {Object.entries(TRACK_META).map(([id, t]) => (
                <option key={id} value={id}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>

          {(filterMentor !== "all" || filterTrack !== "all") && (
            <button 
              onClick={() => { setFilterMentor("all"); setFilterTrack("all"); }}
              className="text-xs font-bold text-[#E56668] hover:text-[#C04C4E] hover:bg-[#E56668]/10 px-3 py-2 rounded-lg transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.keys(TRACK_META)
            .filter(trackId => filterTrack === "all" || trackId === filterTrack)
            .map(trackId => {
              const mentor = MENTORS.find(m => m.tracks.includes(trackId as CourseTrack));
              if (!mentor || (filterMentor !== "all" && mentor.id !== filterMentor)) return null;

              const intensive = COURSE_PACKAGES.find(p => p.trackId === trackId && p.type === "intensive");
              const extensive = COURSE_PACKAGES.find(p => p.trackId === trackId && p.type === "extensive");
              if (!intensive || !extensive) return null;

              return (
                <CourseCard 
                  key={trackId} 
                  trackId={trackId as CourseTrack} 
                  mentor={mentor} 
                  intensive={intensive} 
                  extensive={extensive} 
                  onViewCurriculum={setSelectedTrack}
                />
              );
          })}
        </div>
      </section>

      {/* ─── CUSTOM PACKAGE ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-br from-[#2F4157] to-[#1e2a38] rounded-[32px] p-8 lg:p-12 text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #E56668 0%, transparent 50%)" }} />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                🎛️ Custom Package
              </div>
              <h2 className="text-3xl font-black mb-3">Not Sure How Many Sessions You Need?</h2>
              <p className="text-white/70 max-w-lg text-sm leading-relaxed">
                Build your own package — choose your mentor, topic, and number of sessions. We'll customize a curriculum just for you after a quick consultation call.
              </p>
              <ul className="mt-4 space-y-2">
                {["1-on-1 consultation to understand your goals", "Custom curriculum tailored to your timeline", "Same rate: Rp 90.000/session + free Lounge access"].map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                    <Check size={14} className="text-emerald-400 shrink-0" /> {i}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full lg:w-80 shrink-0">
              <p className="font-black text-white mb-4">Estimate Your Investment</p>
              
              <div className="mb-4">
                <label className="text-xs text-white/60 font-bold uppercase tracking-wider">Sessions</label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="range" min={1} max={40} value={customSessions}
                    onChange={e => setCustomSessions(Number(e.target.value))}
                    className="flex-1 accent-[#E56668]"
                  />
                  <span className="font-black text-2xl text-white w-10 text-center">{customSessions}</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-xl p-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Sessions cost</span>
                  <span className="font-bold">{formatIDR(customSessions * PRICE_PER_SESSION)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">IELS Lounge Exclusive Lifetime</span>
                  <span className="font-bold text-emerald-400">FREE</span>
                </div>
                <div className="border-t border-white/20 pt-2 flex justify-between">
                  <span className="font-black">Total</span>
                  <span className="font-black text-[#E56668] text-xl">{formatIDR(customSessions * PRICE_PER_SESSION)}</span>
                </div>
              </div>

              <Link href={WHATSAPP_URL} target="_blank"
                className="w-full py-3 bg-[#E56668] hover:bg-[#C04C4E] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                <MessageCircle size={16} /> Start Custom Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LEARNING FLOW ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#2F4157]">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "01", icon: "📝", title: "Register & Fill Form", desc: "Fill out the registration form with your learning goals and preferred course." },
            { step: "02", icon: "🎯", title: "Placement Test", desc: "Take a free diagnostic test so your mentor can personalize your curriculum." },
            { step: "03", icon: "🚀", title: "Start Learning", desc: "Join 1-on-1 sessions with your mentor, follow your personalized curriculum." },
            { step: "04", icon: "🎓", title: "Earn Certificate", desc: "Complete the post-test, pass with 80%+, and receive your IELS certificate." },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative">
              <span className="absolute top-4 right-4 text-5xl font-black text-gray-100">{s.step}</span>
              <div className="text-3xl mb-3">{s.icon}</div>
              <h4 className="font-black text-[#2F4157] mb-1">{s.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-black text-[#2F4157] mb-6 text-center">FAQ</h2>
        <div className="space-y-3">
          {[
            { q: "Can I reschedule a session?", a: "Yes — notify us 24 hours in advance and we'll rearrange your session." },
            { q: "What if I don't reach my target level?", a: "We offer a level-up guarantee: one free evaluation session and retake if needed." },
            { q: "Can I switch mentors or topics mid-course?", a: "Yes, with advance notice. Your progress is tracked so you won't lose anything." },
            { q: "What's included in IELS Lounge Premium?", a: "Lifetime access to live speaking clubs, storytelling nights, and professional networking sessions — all in English." },
            { q: "How do I pay?", a: "Transfer to Bank Jago · 103196849968 (a.n. Arbadza Rido Adzariyat) after registration confirmation." },
          ].map((faq, i) => (
            <details key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm group">
              <summary className="font-bold cursor-pointer list-none flex items-center justify-between text-[#2F4157]">
                {faq.q}
                <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-[#2F4157] rounded-[32px] p-10 text-center text-white">
          <h2 className="text-4xl font-black mb-3">Transformation Doesn't Happen By Chance.</h2>
          <p className="text-white/70 max-w-xl mx-auto text-base mb-8">
            It happens by choice. Secure your spot in the Online English Mastery Course now before the 30 seats are gone. Classes start May 18, 2026.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={GOOGLE_FORM_URL} target="_blank"
              className="px-8 py-4 bg-[#E56668] hover:bg-[#C04C4E] text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-2">
              Secure Your Spot <ArrowRight size={18} />
            </Link>
            <Link href={WHATSAPP_URL} target="_blank"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2">
              <MessageCircle size={18} /> Ask via WhatsApp
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Modal Kurikulum */}
      <CurriculumModal 
        trackId={selectedTrack} 
        onClose={() => setSelectedTrack(null)} isDashboard={false} />
    </main>
  );
}