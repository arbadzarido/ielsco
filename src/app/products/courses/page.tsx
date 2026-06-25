"use client";
// src/app/courses/page.tsx

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import { useRef, useState } from "react";
import Link from "next/link";
import CurriculumModal from "@/components/courses/CurriculumModal";
import MentorCard from "@/components/courses/MentorCard";
import CourseCard from "@/components/courses/CourseCard";
import {
  MENTORS, COURSE_PACKAGES, TRACK_META, GOOGLE_FORM_URL, WHATSAPP_URL,
  CourseTrack, PRICE_PER_SESSION
} from "@/data/courses";
import {
  ChevronDown, CheckCircle, MessageCircle,
  Check, Star, Award, Users, ArrowRight, ArrowLeft, Video, Gift, Briefcase
} from "lucide-react";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

export default function CoursesPage() {
  const [selectedTrack, setSelectedTrack] = useState<CourseTrack | null>(null);
  const [filterMentor, setFilterMentor] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterTrack, setFilterTrack] = useState<string>("all");
  const [customSessions, setCustomSessions] = useState(10);
  
  // --- Refs untuk memisahkan carousel Mentors dan Courses ---
  const mentorsScrollRef = useRef<HTMLDivElement>(null);
  const coursesScrollRef = useRef<HTMLDivElement>(null);
  
  const [activeIndex, setActiveIndex] = useState(0);

  // Logic untuk Carousel Mentors
  const handleScrollMentors = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const itemWidth = target.scrollWidth / MENTORS.length;
    const newIndex = Math.round(target.scrollLeft / itemWidth);
    setActiveIndex(newIndex);
  };

  const scrollToMentor = (index: number) => {
    if (!mentorsScrollRef.current) return;
    const target = mentorsScrollRef.current;
    const itemWidth = target.scrollWidth / MENTORS.length;
    target.scrollTo({
      left: index * itemWidth,
      behavior: "smooth",
    });
  };

  // Logic untuk Carousel Courses (Tombol Panah Desktop)
  const scrollCourses = (direction: "left" | "right") => {
    if (coursesScrollRef.current) {
      // 444 didapat dari lebar card (420px) + gap-6 (24px)
      const scrollAmount = direction === "left" ? -444 : 444;
      coursesScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleSelectTrack = (track: CourseTrack) => {
    setFilterTrack(track);
    document.getElementById("courses-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-[#F7F8FA] text-[#294154] font-geologica">
      <Header />

      {/* ─── HERO: PERSONALIZED LEARNING JOURNEY ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2F4157] via-[#243344] to-[#1e2a38] text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #E56668 0%, transparent 50%), radial-gradient(circle at 80% 20%, #4A90E2 0%, transparent 40%)" }} />
        
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider shadow-sm">
                🌍 Your Personal English Transformation
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-black leading-tight">
                Your English Goals.<br />
                <span className="text-[#E56668]">Your Timeline.</span><br />
                Your Transformation.
              </h1>
              
              <p className="text-white/80 text-lg leading-relaxed max-w-lg">
                Break through language barriers with personalized 1-on-1 mentorship and dynamic group learning. Whether you're aiming for fluency, professional advancement, or exam excellence, we craft your unique path to success.
              </p>
              
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
                  <Check size={16} className="text-emerald-400" /> Expert Mentors
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
                  <Check size={16} className="text-emerald-400" /> Flexible Learning
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70 font-semibold">
                  <Check size={16} className="text-emerald-400" /> Real Results
                </div>
              </div>
              
              <div className="flex gap-3 flex-wrap pt-4">
                <Link href={GOOGLE_FORM_URL} target="_blank"
                  className="px-6 py-3 bg-[#E56668] hover:bg-[#C04C4E] text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(229,102,104,0.4)] flex items-center gap-2 hover:-translate-y-0.5">
                  Start Your Journey <ArrowRight size={16} />
                </Link>
                <Link href={WHATSAPP_URL} target="_blank"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2">
                  <MessageCircle size={16} /> Chat with Us
                </Link>
              </div>
            </div>

            {/* MENTOR AVATARS */}
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
          FEATURED PROGRAM: PERSONALIZED MASTERY
      ========================================= */}
      <section className="max-w-6xl mx-auto px-6 pb-20 mt-16">
        
        {/* 1. HEADER */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h3 className="text-3xl lg:text-[40px] font-extrabold text-[#304156] mb-3 leading-tight">
            English Mastery Through Personalized Learning
          </h3>
          <p className="text-[#E56668] text-lg mb-6 font-bold tracking-wide">
            Flexible, Intensive, Impactful
          </p>
          <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
            <strong>Why choose IELS?</strong> We combine expert mentorship with flexibility. Learn at your pace with 1-on-1 sessions tailored to your goals, plus supportive group classes to practice with peers. Build a habit, master the language, achieve your dreams.
            <br className="hidden sm:block" />
            <strong>Master:</strong> English Foundations • Conversational Fluency • Professional & Academic Excellence • Your Specific Goals (IELTS/TOEFL/Career Ready).
          </p>
        </div>

        {/* 2. CONTENT: Better Mobile Layout */}
        <div className="grid md:grid-cols-12 gap-8 lg:gap-14 mb-12">
          
          {/* POSTER: Hidden on mobile, sticky on desktop */}
          <div className="hidden md:block md:col-span-5 relative sticky top-28">
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-100 border-[6px] border-white relative shadow-2xl">
              <Image 
                src="/images/contents/events/courses.png"
                alt="English Mastery Course Poster" 
                fill 
                className="object-cover transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2F4157]/40 to-transparent hover:opacity-0 transition-opacity duration-500"></div>
              
              <div className="absolute top-5 left-5 bg-white/95 backdrop-blur-sm text-[#E56668] px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                <Star className="w-4 h-4 fill-[#E56668]" /> IELS Featured
              </div>
            </div>
          </div>

          {/* DETAILS: Full width on mobile */}
          <div className="md:col-span-7 flex flex-col justify-center">
            
            {/* CLASS TYPES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
              {/* Private Box */}
              <div className="bg-[#E56668]/5 border border-[#E56668]/20 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Video size={64} className="text-[#E56668]" />
                </div>
                <h4 className="text-[#E56668] font-black text-xl mb-4 relative z-10">1-on-1 Sessions<br /> (Personalized)</h4>
                <ul className="space-y-3 relative z-10">
                  {[
                    "Flexible schedule by request",
                    "100% customized to your goals",
                    "Direct access to your mentor",
                    "60 minutes focused learning",
                    "Full session recordings"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 font-medium">
                      <CheckCircle size={18} className="text-[#E56668] shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Group Box */}
              <div className="bg-[#2F4157]/5 border border-[#2F4157]/10 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Users size={64} className="text-[#2F4157]" />
                </div>
                <h4 className="text-[#2F4157] font-black text-xl mb-4 relative z-10">Group Classes<br /> (Practice & Community)</h4>
                <ul className="space-y-3 relative z-10">
                  {[
                    "Dynamic peer learning environment",
                    "Max 15 students per class",
                    "Regular speaking practice sessions",
                    "Supportive learning community",
                    "Lifetime IELS Lounge access"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 font-medium">
                      <CheckCircle size={18} className="text-[#2F4157] shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* WHAT YOU'LL GET */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6 lg:p-8">
              <h4 className="font-black text-[#304156] text-lg mb-5 flex items-center gap-2">
                <Award className="text-[#E56668]" /> What You'll Achieve
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 mb-8">
                {[
                  "Native-like speaking confidence",
                  "Full IELS Lounge Premium access",
                  "Personalized learning dashboard",
                  "Structured, proven curriculum",
                  "Customized study materials",
                  "Accountability & progress tracking",
                  "Direct mentor feedback & coaching",
                  "Lifetime community membership"
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
                    "Monthly speaking challenges",
                    "English grammar handbook",
                    "Professional feedback sessions"
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

        {/* 3. CTA & PRICING */}
        <div className="bg-gradient-to-br from-[#2F4157] to-[#1e2a38] rounded-[32px] p-8 lg:p-12 text-white overflow-hidden relative mt-12 shadow-2xl">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #E56668 0%, transparent 50%)" }} />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            
            {/* LEFT: Info & Pricing */}
            <div className="flex-1 w-full text-center lg:text-left">
              <div className="inline-block px-3 py-1 bg-[#E56668] border border-[#E56668]/50 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm">
                ⭐ Flexible pricing
              </div>
              
              <h3 className="text-2xl lg:text-3xl font-black text-white mb-4">
                Start your personalized journey today
              </h3>
              
              <p className="text-white/80 text-base max-w-lg mb-6 leading-relaxed">
                Choose your mentor, pick your path, and transform your English. No rigid timelines. No pressure. Just real progress at your pace.
              </p>

              <div className="flex items-center gap-2 text-white/70 mb-4">
                <Check size={20} className="text-emerald-400" />
                <span className="font-semibold">Register anytime. Progress always.</span>
              </div>
            </div>

            {/* RIGHT: Action Box */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full lg:w-80 shrink-0 shadow-lg">
              <p className="font-black text-white mb-2 text-lg">Ready to Transform?</p>
              <p className="text-xs text-white/60 mb-6 leading-relaxed">
                Join hundreds of students who've achieved their English goals with IELS personalized mentorship.
              </p>
              
              <div className="flex flex-col gap-3">
                <Link 
                  href={GOOGLE_FORM_URL} 
                  target="_blank"
                  className="w-full py-3.5 bg-[#E56668] hover:bg-[#c94f51] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(229,102,104,0.4)] whitespace-nowrap"
                >
                  Start Now <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <Link 
                  href={WHATSAPP_URL} 
                  target="_blank"
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" /> Ask Questions
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
            The IELS Team
          </span>
          <h2 className="text-3xl font-black text-[#2F4157]">Meet Your Mentors</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
            Expert English educators dedicated to your success. Click a track to explore programs.
          </p>
        </div>

        <div className="relative">
          <div
            ref={mentorsScrollRef}
            onScroll={handleScrollMentors}
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

      {/* ─── COURSE PACKAGES: SWIPEABLE CAROUSEL ─── */}
      <section id="courses-section" className="max-w-6xl mx-auto px-6 pb-20 relative group">
        
        {/* Header & Controls Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black text-[#2F4157]">Signature Programs</h2>
            <p className="text-gray-500 mt-2 text-sm max-w-lg leading-relaxed">
              6 specialized tracks. Swipe to explore, tap to learn more.
            </p>
          </div>

          {/* Navigation Buttons — Hanya Muncul di Desktop (lg) */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => scrollCourses("left")}
              className="w-10 h-10 rounded-full bg-white border-2 border-[#1A2534] text-[#1A2534] shadow-[2px_2px_0px_#1A2534] hover:bg-[#FAFAFA] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center font-bold"
              aria-label="Scroll left"
            >
              <ArrowLeft size={18} />
            </button>
            <button
              onClick={() => scrollCourses("right")}
              className="w-10 h-10 rounded-full bg-[#E56668] border-2 border-[#1A2534] text-white shadow-[2px_2px_0px_#1A2534] hover:opacity-90 active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center font-bold"
              aria-label="Scroll right"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Carousel Wrapper */}
        <div className="relative">
          {/* Ditambahkan ref={coursesScrollRef} di bawah ini */}
          <div 
            ref={coursesScrollRef}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 pb-6 -mx-6 px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {Object.keys(TRACK_META).map(trackId => {
              const mentor = MENTORS.find(m => m.tracks.includes(trackId as CourseTrack));
              if (!mentor) return null;

              const intensive = COURSE_PACKAGES.find(p => p.trackId === trackId && p.type === "intensive");
              const extensive = COURSE_PACKAGES.find(p => p.trackId === trackId && p.type === "extensive");
              if (!intensive || !extensive) return null;

              return (
                <div 
                  key={trackId} 
                  className="w-[85vw] sm:w-[500px] lg:w-[420px] shrink-0 snap-center flex justify-center"
                >
                  <CourseCard 
                    trackId={trackId as CourseTrack} 
                    mentor={mentor} 
                    intensive={intensive} 
                    extensive={extensive} 
                    onViewCurriculum={setSelectedTrack}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Bantu/Indicator untuk Mobile (hidden di desktop) */}
        <div className="flex justify-center mt-4 lg:hidden">
          <p className="text-xs text-gray-400 font-semibold bg-gray-100 px-4 py-1.5 rounded-full animate-pulse">
            ← Swipe to see more tracks →
          </p>
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
                🎛️ Build Your Path
              </div>
              <h2 className="text-3xl font-black mb-3">Design Your Own Learning Experience</h2>
              <p className="text-white/70 max-w-lg text-sm leading-relaxed">
                Want something custom? Pick your mentor, choose your topic, select your session count. We'll design a personalized curriculum and guide you to your goals during a free consultation.
              </p>
              <ul className="mt-4 space-y-2">
                {["Free goal-setting consultation call", "Curriculum tailored 100% to you", "Consistent Rp 90.000/session rate"].map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                    <Check size={14} className="text-emerald-400 shrink-0" /> {i}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full lg:w-80 shrink-0">
              <p className="font-black text-white mb-4">Quick Estimate</p>
              
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
                  <span className="text-white/60">Sessions</span>
                  <span className="font-bold">{formatIDR(customSessions * PRICE_PER_SESSION)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">IELS Lounge Premium</span>
                  <span className="font-bold text-emerald-400">FREE</span>
                </div>
                <div className="border-t border-white/20 pt-2 flex justify-between">
                  <span className="font-black">Total</span>
                  <span className="font-black text-[#E56668] text-xl">{formatIDR(customSessions * PRICE_PER_SESSION)}</span>
                </div>
              </div>

              <Link href={WHATSAPP_URL} target="_blank"
                className="w-full py-3 bg-[#E56668] hover:bg-[#C04C4E] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                <MessageCircle size={16} /> Schedule Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LEARNING FLOW ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-[#2F4157]">Your Transformation Journey</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { step: "01", icon: "📝", title: "Register", desc: "Complete your registration and tell us about your English goals." },
            { step: "02", icon: "🎯", title: "Assess", desc: "Take a free placement assessment. We get to know your level and style." },
            { step: "03", icon: "🚀", title: "Learn", desc: "Start personalized sessions with your dedicated mentor. Real progress weekly." },
            { step: "04", icon: "🏆", title: "Achieve", desc: "Reach your goals, earn your certificate, and join our community forever." },
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
            { q: "Can I reschedule my sessions?", a: "Absolutely. Just give us 24 hours notice and we'll find a time that works for you." },
            { q: "What if I don't hit my goal?", a: "We offer a progress guarantee: free retake session if you don't see improvement. Your success is our success." },
            { q: "Can I switch mentors or topics?", a: "Yes, anytime. We track your progress so you won't lose momentum or repeat lessons." },
            { q: "What's included in IELS Lounge Premium?", a: "Lifetime access to live speaking clubs, English socials, mock exam sessions, and a thriving community of learners." },
            { q: "How do I register and pay?", a: "Fill the form, we'll confirm your course and payment details. Bank transfer to Bank Jago or other methods available." },
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

      {/* ─── CAREERS: TEACHERS WANTED ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-r from-[#E56668]/10 to-[#E56668]/5 rounded-[24px] p-8 border border-[#E56668]/20">
          <div className="flex items-start gap-4 md:gap-6">
            <div className="p-3 bg-[#E56668]/20 rounded-xl shrink-0">
              <Briefcase className="w-6 h-6 text-[#E56668]" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-black text-[#2F4157] mb-2">Join Our Mentor Team</h3>
              <p className="text-gray-600 text-sm mb-4">
                Are you an English educator passionate about transformation? We're building a team of world-class mentors. Apply to teach with IELS and impact lives globally.
              </p>
              <Link 
                href="mailto:careers@ielsco.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#E56668] hover:bg-[#C04C4E] text-white rounded-lg font-bold text-sm transition-all"
              >
                Apply Now (Coming Soon) <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-[#2F4157] rounded-[32px] p-10 text-center text-white">
          <h2 className="text-4xl font-black mb-3">Your English Transformation Starts Here.</h2>
          <p className="text-white/70 max-w-xl mx-auto text-base mb-8">
            Stop overthinking. Start learning. Join hundreds of IELS students who've broken through language barriers and achieved their dreams.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={GOOGLE_FORM_URL} target="_blank"
              className="px-8 py-4 bg-[#E56668] hover:bg-[#C04C4E] text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-2">
              Begin Your Journey <ArrowRight size={18} />
            </Link>
            <Link href={WHATSAPP_URL} target="_blank"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2">
              <MessageCircle size={18} /> Ask a Question
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Modal Kurikulum */}
      <CurriculumModal 
        trackId={selectedTrack} 
        onClose={() => setSelectedTrack(null)} 
        isDashboard={false} 
      />
    </main>
  );
}