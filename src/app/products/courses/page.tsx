"use client";
// src/app/courses/page.tsx

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import { useRef, useState } from "react";
// Import MENTORS dari file data lu juga harus ada
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
  ChevronDown, Filter, Search, Sliders, MessageCircle,
  ExternalLink, Check, Zap, Star, Award, Users, ArrowRight
} from "lucide-react";

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
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
    // scroll to courses
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-wider">
                🎓 IELS Personalized Courses
              </div>
              <h1 className="text-4xl lg:text-5xl font-black leading-tight">
                Learn English with<br />
                <span className="text-[#E56668]">3 Expert Mentors</span><br />
                Built for Your Goals
              </h1>
              <p className="text-white/80 text-lg leading-relaxed max-w-lg">
                Grammar, Speaking, Writing, Test Prep, Remote Careers — every course is led by a dedicated IELS Principal, personalized to your level, and designed for real outcomes.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Check size={16} className="text-emerald-400" /> 1-on-1 mentorship
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Check size={16} className="text-emerald-400" /> Certificate included
                </div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Check size={16} className="text-emerald-400" /> IELS Lounge 1yr free
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link href={GOOGLE_FORM_URL} target="_blank"
                  className="px-6 py-3 bg-[#E56668] hover:bg-[#C04C4E] text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2">
                  Register Now <ExternalLink size={16} />
                </Link>
                <Link href={WHATSAPP_URL} target="_blank"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2">
                  <MessageCircle size={16} /> Chat on WhatsApp
                </Link>
              </div>
              <p className="text-xs text-white/50">{formatIDR(PRICE_PER_SESSION)}/session · Placement Test included · Flexible scheduling</p>
            </div>

            {/* 3 MENTOR AVATARS (DIPERBESAR & DISESUAIKAN) */}
            <div className="hidden lg:flex items-center justify-center gap-4 relative">
              {MENTORS.map((mentor, i) => (
                <div key={mentor.id}
                  className="relative transition-transform duration-500 hover:z-30"
                  style={{ 
                    // Scale tengah lebih gede dikit, dan posisi diatur biar overlapping cantik
                    transform: i === 1 ? "scale(1.15) translateY(-16px)" : "scale(0.95)", 
                    zIndex: i === 1 ? 2 : 1 
                  }}>
                  {/* Container digedein dari w-36 h-44 jadi w-48 h-60 */}
                  <div className="w-48 h-60 rounded-[24px] overflow-hidden border border-white/20 shadow-2xl relative group">
                    <Image 
                      src={mentor.image} 
                      alt={mentor.name} 
                      fill 
                      className="object-cover object-top group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e2a38]/90 via-[#1e2a38]/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      {/* Teks digedein dikit biar kebaca enak di box yang baru */}
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

{/* ─── MEET THE MENTORS ─── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 bg-[#2F4157]/10 text-[#2F4157] rounded-full text-xs font-black uppercase tracking-widest mb-3">
            The Principals
          </span>
          <h2 className="text-3xl font-black text-[#2F4157]">Meet Your Mentors</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto text-sm">
            Three IELS Principals, three specializations. Click a course track to filter programs.
          </p>
        </div>

        {/* --- CAROUSEL WRAPPER --- */}
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 -mx-6 px-6 md:mx-0 md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {MENTORS.map((mentor) => (
              <div 
                key={mentor.id} 
                // w-[85vw] bikin card-nya lebar tapi nyisain sedikit view ke card selanjutnya (biar user tau bisa diswipe)
                className="w-[85vw] sm:w-[400px] md:w-auto shrink-0 snap-center md:snap-align-none flex justify-center"
              >
                <div className="w-full">
                  <MentorCard mentor={mentor} onSelectTrack={handleSelectTrack} />
                </div>
              </div>
            ))}
          </div>

  {/* --- DOT INDICATORS (Mobile Only) --- */}
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

        {/* ── Filters (Disederhanakan & Clean) ── */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-10 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">
              <Filter size={14} /> Filter
            </div>
            
            {/* Mentor filter */}
            <select 
              value={filterMentor} 
              onChange={e => setFilterMentor(e.target.value)}
              className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-[#2F4157] cursor-pointer hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#E56668]/30"
            >
              <option value="all">All Mentors</option>
              {MENTORS.map(m => <option key={m.id} value={m.id}>{m.name.split(" ")[0]}</option>)}
            </select>

            {/* Track filter */}
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

     {/* ── Grid of Tracks ── */}
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
                  onViewCurriculum={setSelectedTrack} // <-- Tembak langsung ke state trackId
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
                  <span className="text-white/60">IELS Lounge (1yr)</span>
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
            { q: "What's included in IELS Lounge Premium?", a: "1 year access to live speaking clubs, storytelling nights, and professional networking sessions — all in English." },
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
          <h2 className="text-4xl font-black mb-3">Ready to Start?</h2>
          <p className="text-white/70 max-w-xl mx-auto text-sm mb-8">
            Register now or chat with us first. Either way, your IELS journey starts today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={GOOGLE_FORM_URL} target="_blank"
              className="px-8 py-4 bg-[#E56668] hover:bg-[#C04C4E] text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-2">
              Register Now <ArrowRight size={18} />
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