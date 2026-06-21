"use client";

import {
  Plane, Building2, Utensils, MessageCircle, Info, Download, Briefcase,
  Lightbulb, Award, Gift, ExternalLink, Clock, Rocket, FileText,
  ArrowRight, CheckCircle, XCircle, Calendar, ShieldCheck, Gem, Users,
  Globe, BookOpen, Target, Sparkles, Star, ChevronDown, GraduationCap,
  TrendingUp, Handshake, Layers, Heart, Map, Zap, PlaneTakeoff, Compass,
  Camera, FileWarning
} from "lucide-react";
import Header  from "@/components/header";
import Footer  from "@/components/footer";
import Image   from "next/image";
import Link    from "next/link";
import { Button } from "@/components/ui/button";

// ============================================================
// DATA & LINKS
// ============================================================

const links = {
  register: "https://forms.gle/nR1P3GVrp4czmA4U8",
  indo: "https://drive.google.com/file/d/1Yx6WgRpr2OnPnpNhnI4tO3UPHIOtDWDO/view?usp=sharing",
  sea: "https://drive.google.com/file/d/1puH015sK8q7L6eImu2oTg_oQiYEMGGru/view?usp=sharing"
};

const timeline = [
  { phase: "Registration",  title: "Self-Funded Registration Opens",  date: "Current",         desc: "Applications open to youth across Southeast Asia (ages 15–23). Spots are limited; secure yours early." },
  { phase: "Preparation",   title: "Passport Submission Deadline",    date: "September 8, 2026",desc: "All confirmed delegates must submit a passport valid for at least 6 months prior to the departure date." },
  { phase: "Onboarding",    title: "Pre-Departure Onboarding",        date: "Sep – Oct 2026",  desc: "Receive the A-B-C onboarding pack: logistics guide, Foundations of Impact pre-reading, and the Blueprint worksheet." },
  { phase: "Execution",     title: "GIF Singapore Residency",         date: "Nov 17-20, 2026", desc: "4 Days 3 Nights of intensive Project Incubation at NUS, campus tours, dorm stay, and cultural exploration." },
  { phase: "Post-Program",  title: "Impact Follow-Through",           date: "Dec 2026 onwards",desc: "Optional continued support from IELS if you wish to keep building and scaling your NGO/project." },
];

const itinerary = [
  {
    day: "Day 01",
    date: "17 Nov 2026",
    title: "Arrival & Ecosystem Onboarding",
    activities: [
      "Arrival in Singapore",
      "Check-in to NUS Dormitory",
      "NUS Campus Tour",
    ],
    icon: PlaneTakeoff
  },
  {
    day: "Day 02",
    date: "18 Nov 2026",
    title: "Incubation Phase & Cultural Immersion",
    activities: [
      "Leadership Incubation Class",
      "Project Incubation Class",
      "Consultation & Feedback Session"
    ],
    icon: Lightbulb
  },
  {
    day: "Day 03",
    date: "19 Nov 2026",
    title: "Campus Experience & Networking",
    activities: [
      "Advanced Project Incubation Class",
      "Consultation & Feedback Session",
      "Cultural Exploration & Free Time at Chinatown"
    ],
    icon: Compass
  },
  {
    day: "Day 04",
    date: "20 Nov 2026",
    title: "Closing & Departure",
    activities: [
      "Final Project Presentation",
      "Awarding Ceremony",
      "Farewell Session"
    ],
    icon: CheckCircle
  }
];

const modules = [
  {
    num: "01",
    icon: Zap,
    title: "Foundational Leadership & Strategic Vision",
    desc: "Deconstruct the founder's mindset. Learn to turn abstract social impact goals into a concrete, execution-ready roadmap your team can follow from Day 1.",
  },
  {
    num: "02",
    icon: Users,
    title: "Organizational Architecture & Human Capital",
    desc: "Master team dynamics, remote delegation, and cultivating a high-performance culture within volunteer-based organizations — even with zero budget.",
  },
  {
    num: "03",
    icon: Handshake,
    title: "Sustainable Growth & Strategic Partnerships",
    desc: "Build high-leverage relationships with stakeholders. Master resource mobilization and partnership strategies that ensure your organization's long-term viability.",
  },
  {
    num: "04",
    icon: TrendingUp,
    title: "Future-Proofing & Impact Scaling",
    desc: "Navigate global youth-led trends and define a strategic trajectory that keeps your organization resilient, relevant, and ready to scale across borders.",
  },
];

const dailyRundown = [
  { time: "09:00 – 09:15", label: "Morning Check-in",       desc: "Brief warm-up and review of the previous day's key takeaway." },
  { time: "09:15 – 10:00", label: "Core Material (45 min)", desc: "High-level insights, real-world case studies, and framework delivery by NUS faculty or facilitators." },
  { time: "10:00 – 10:30", label: "Project Consultation",   desc: "Guided Q&A where you apply the lesson directly to your specific NGO or project idea." },
  { time: "10:30 – 10:45", label: "Documentation",          desc: "Short session for photos, reflection notes, and social content capture." },
];

const benefits = [
  { icon: Building2,    text: "Accommodation at NUS Dormitory" },
  { icon: Lightbulb,    text: "Leadership & Project Incubation Class" },
  { icon: Utensils,     text: "3× Meals per Day" },
  { icon: GraduationCap,text: "Exclusive NUS Campus Tour" },
  { icon: Award,        text: "International Certificate" },
  { icon: Gift,         text: "Exclusive Merchandise" },
];

// ============================================================
// PAGE
// ============================================================

export default function GIFEventPage() {
  return (
    <main className="min-h-screen bg-white text-[#304156] font-geologica">
      <Header />

      {/* ===================================================
          HERO
      =================================================== */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-[#304156] pt-12 pb-20">
        <div className="absolute inset-0">
          <Image
            src="/images/backgrounds/singapore-bg.jpg"
            alt="Singapore Skyline"
            fill className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2F4055]/95 via-[#914D4D]/85 to-[#304156]/95" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">

          {/* BATCH 2 badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-widest mb-6 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#FFD1D1]" /> Batch 2 — Open for Self-Funded
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#914D4D] blur-[40px] opacity-40 rounded-full" />
              <Image
                src="/images/logos/events/gifsgp.png"
                alt="Global Impact Fellowship Singapore"
                width={200} height={80}
                className="relative h-auto w-[240px] md:w-[380px] drop-shadow-2xl"
                priority
              />
            </div>
          </div>

                    {/* Departure badge */}

          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#304156]/80 border border-white/20 backdrop-blur-md text-white font-bold text-sm mb-6 shadow-xl">

            <Calendar className="w-4 h-4 text-[#FFD1D1]" />

            17 - 20 November 2026 · 4D3N in Singapore

          </div>



          {/* Headline */}

          <h1 className="text-3xl md:text-6xl font-black text-white leading-tight mb-6">

            Lead. Build. <span className="text-[#FFD1D1]">Impact.</span>

          </h1>



          <p className="text-base md:text-lg text-gray-200 max-w-2xl mx-auto leading-relaxed mb-10 font-light">

            A leadership & project incubation residency at the National University of Singapore — built for youth change-makers aged 15–23 across Southeast Asia.

          </p>


          {/* Dual Track CTA */}
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto relative z-10">
            
            {/* Indonesian Track */}
            <div className="bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl p-6 text-left hover:bg-white/15 transition-all shadow-2xl relative overflow-hidden group flex flex-col h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#914D4D] rounded-full blur-[60px] opacity-30 group-hover:opacity-50 transition-all pointer-events-none" />
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="text-3xl">🇮🇩</div>
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">Indonesian Citizens</h3>
                    <p className="text-white/60 text-xs mt-0.5">IDR Pricing Track</p>
                  </div>
                </div>
                <div className="mt-auto space-y-2.5">
                  <a href={links.register} target="_blank" rel="noopener noreferrer" className="bg-[#914D4D] hover:bg-[#7a3e3e] text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center w-full shadow-lg text-sm transition-colors">
                    Register Now <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                  <a href={links.indo} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center w-full text-sm transition-colors">
                    Download Guidebook <Download className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
            
            {/* SEA Youth Track */}
            <div className="bg-white/10 border border-white/20 backdrop-blur-xl rounded-3xl p-6 text-left hover:bg-white/15 transition-all shadow-2xl relative overflow-hidden group flex flex-col h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#304156] rounded-full blur-[60px] opacity-60 group-hover:opacity-80 transition-all pointer-events-none" />
              <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-5">
                  <div className="text-3xl">🌏</div>
                  <div>
                    <h3 className="text-xl font-bold text-white leading-tight">SEA Youths (Non-Indo)</h3>
                    <p className="text-white/60 text-xs mt-0.5">USD Pricing Track</p>
                  </div>
                </div>
                <div className="mt-auto space-y-2.5">
                  <a href={links.register} target="_blank" rel="noopener noreferrer" className="bg-[#304156] hover:bg-[#253344] text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center w-full shadow-lg text-sm transition-colors">
                    Register Now <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                  <a href={links.sea} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center w-full text-sm transition-colors">
                    Download Guidebook <Download className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>

          </div>

          <p className="text-white/50 text-xs mt-6">No IELTS / TOEFL Required • Self-Funded Categories Only</p>
        </div>
      </section>

      {/* ===================================================
          IMPORTANT REQUIREMENTS
      =================================================== */}
      <section className="py-12 bg-[#F7F8FA] border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#914D4D]" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-1">Age & Region</h4>
                <p className="text-sm text-gray-500">Ages 15–23. Open to all Southeast Asian nationalities.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 shrink-0">
                <MessageCircle className="w-6 h-6 text-[#914D4D]" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-1">Language</h4>
                <p className="text-sm text-gray-500">Basic English required. No formal IELTS or TOEFL scores needed.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 shrink-0">
                <FileWarning className="w-6 h-6 text-[#914D4D]" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-1">Mandatory Passport</h4>
                <p className="text-sm text-gray-500">Must be valid for ≥6 months. Submission deadline: Sep 8, 2026.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          4D3N ITINERARY
      =================================================== */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#914D4D]/10 text-[#914D4D] px-4 py-1.5 rounded-full text-sm font-bold border border-[#914D4D]/20 mb-4">
              <Map className="w-4 h-4" /> The Experience
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#304156] mb-3">4 Days, 3 Nights in Singapore</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              A carefully curated residency combining rigorous academic incubation with regional networking.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {itinerary.map((day, idx) => (
              <div key={day.day} className="relative bg-gray-50 border border-gray-100 rounded-3xl p-6 pt-10 hover:shadow-xl hover:border-[#914D4D]/30 transition-all group">
                <div className="absolute -top-6 left-6 bg-[#304156] text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-[#914D4D] transition-colors">
                  <day.icon className="w-6 h-6" />
                </div>
                <div className="mb-4">
                  <div className="text-xs font-black text-[#914D4D] uppercase tracking-widest">{day.day}</div>
                  <div className="text-sm font-bold text-gray-400 mb-2">{day.date}</div>
                  <h3 className="font-bold text-[#304156] text-lg leading-tight">{day.title}</h3>
                </div>
                <ul className="space-y-3">
                  {day.activities.map((act, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#304156]/40 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================
          HIGHLIGHT PROGRAM — 4 PILLARS
      =================================================== */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#304156] mb-3">Core Program Pillars</h2>
            <p className="text-gray-500 max-w-xl mx-auto">What defines the GIF residency experience in Singapore.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Layers,        num: "01", title: "Incubation at NUS",  desc: "Direct consultation sessions with NUS mentors on your real SDG project." },
              { icon: GraduationCap, num: "02", title: "NUS Campus Tour",    desc: "Explore one of Asia's top-ranked universities and its world-class facilities." },
              { icon: Building2,     num: "03", title: "Stay at NUS Dorm",   desc: "Live on campus for a full immersive academic experience." },
              { icon: Globe,         num: "04", title: "Cultural Immersion", desc: "Curated city exploration to experience Singapore's multicultural identity." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:border-[#304156]/20 transition-all">
                <div className="bg-[#304156]/8 p-2.5 rounded-xl w-fit mb-4">
                  <item.icon className="w-6 h-6 text-[#304156]" />
                </div>
                <h3 className="font-bold text-[#304156] text-base mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================
          PRICING — BATCH 2
      =================================================== */}
      <section className="py-20 px-6 bg-white" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#304156] mb-3">
              Transparent Pricing. <span className="text-[#914D4D]">Zero Hidden Fees.</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-lg">
              GIF Batch 2 is a Self-Funded program open to all Southeast Asian youth.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-10">

            {/* Indonesian */}
            <div className="relative bg-white rounded-3xl p-8 md:p-10 border-2 border-[#914D4D] shadow-2xl transform hover:-translate-y-1 transition-all flex flex-col">
              <div className="absolute top-0 right-0 bg-[#914D4D] text-white text-xs font-bold px-4 py-2 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
                🇮🇩 Indonesia
              </div>
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="p-3 bg-[#914D4D]/10 rounded-xl">
                  <Heart className="w-6 h-6 text-[#914D4D]" />
                </div>
                <h3 className="text-xl font-bold text-[#304156]">Indonesian Citizens</h3>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1 text-[#304156]">
                  <span className="text-lg font-bold text-[#304156]/60">IDR</span>
                  <span className="text-5xl font-black text-[#914D4D]">6,999</span>
                  <span className="text-2xl font-bold text-[#304156]/40">,000</span>
                </div>
                <p className="text-sm text-gray-500 mt-2 font-medium">One-time program fee</p>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {benefits.map((b) => (
                  <li key={b.text} className="flex items-center gap-3 text-sm md:text-base text-gray-700 font-medium">
                    <CheckCircle className="w-5 h-5 text-[#914D4D] shrink-0" />
                    {b.text}
                  </li>
                ))}
              </ul>
              
              <div className="space-y-3">
                <a href={links.register} target="_blank" rel="noopener noreferrer" className="w-full bg-[#914D4D] hover:bg-[#7a3e3e] text-white py-4 rounded-xl font-bold flex items-center justify-center transition-colors shadow-lg">
                  Register Now <ExternalLink className="w-4 h-4 ml-2" />
                </a>
                <a href={links.indo} target="_blank" rel="noopener noreferrer" className="w-full bg-white border-2 border-gray-100 hover:border-[#914D4D]/30 hover:bg-gray-50 text-[#304156] py-3.5 rounded-xl font-bold flex items-center justify-center transition-colors">
                  Download Guidebook <Download className="w-4 h-4 ml-2" />
                </a>
              </div>
              
              <div className="mt-5 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100 text-center flex items-center justify-center gap-2">
                <Plane className="w-4 h-4 text-gray-400" /> Flights not included.
              </div>
            </div>

            {/* ASEAN / International */}
            <div className="relative bg-white rounded-3xl p-8 md:p-10 border-2 border-[#304156] shadow-xl transform hover:-translate-y-1 transition-all flex flex-col">
              <div className="absolute top-0 right-0 bg-[#304156] text-white text-xs font-bold px-4 py-2 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
                🌏 ASEAN
              </div>
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="p-3 bg-[#304156]/10 rounded-xl">
                  <Globe className="w-6 h-6 text-[#304156]" />
                </div>
                <h3 className="text-xl font-bold text-[#304156]">SEA Youths (Non-Indo)</h3>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1 text-[#304156]">
                  <span className="text-lg font-bold text-[#304156]/60">USD</span>
                  <span className="text-5xl font-black text-[#304156]">450</span>
                </div>
                <p className="text-sm text-gray-500 mt-2 font-medium">One-time program fee</p>
              </div>
              <ul className="space-y-3 mb-10 flex-1">
                {benefits.map((b) => (
                  <li key={b.text} className="flex items-center gap-3 text-sm md:text-base text-gray-700 font-medium">
                    <CheckCircle className="w-5 h-5 text-[#304156] shrink-0" />
                    {b.text}
                  </li>
                ))}
              </ul>
              
              <div className="space-y-3">
                <a href={links.register} target="_blank" rel="noopener noreferrer" className="w-full bg-[#304156] hover:bg-[#233040] text-white py-4 rounded-xl font-bold flex items-center justify-center transition-colors shadow-lg">
                  Register Now <ExternalLink className="w-4 h-4 ml-2" />
                </a>
                <a href={links.sea} target="_blank" rel="noopener noreferrer" className="w-full bg-white border-2 border-gray-100 hover:border-[#304156]/30 hover:bg-gray-50 text-[#304156] py-3.5 rounded-xl font-bold flex items-center justify-center transition-colors">
                  Download Guidebook <Download className="w-4 h-4 ml-2" />
                </a>
              </div>

              <div className="mt-5 text-xs text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100 text-center flex items-center justify-center gap-2">
                <Plane className="w-4 h-4 text-gray-400" /> Flights not included.
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ===================================================
          TIMELINE
      =================================================== */}
      <section className="py-20 overflow-hidden bg-gray-50">
        <div className="text-center mb-12 px-6">
          <h2 className="text-3xl font-extrabold text-[#304156] mb-3">Program Roadmap</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            From registration to impact — your GIF Batch 2 journey at a glance.
          </p>
        </div>

        <div className="relative max-w-[1400px] mx-auto">
          <div className="absolute left-0 right-0 top-1/2 h-[6px] bg-[#914D4D]/20 rounded-full -translate-y-1/2" />
          <div className="pointer-events-none absolute left-0 top-0 h-full w-12 lg:w-28 bg-gradient-to-r from-gray-50 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 lg:w-28 bg-gradient-to-l from-gray-50 to-transparent z-10" />

          <div className="overflow-x-auto scrollbar-none px-6 lg:px-24">
            <div className="flex gap-8 w-max py-8 mx-auto">
              {timeline.map((item, i) => (
                <div key={i} className="group relative min-w-[300px] max-w-[300px] rounded-3xl bg-white p-8 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-[#914D4D]/30">
                  <p className="text-xs font-black text-[#914D4D] mb-3 uppercase tracking-widest">{item.phase}</p>
                  <h3 className="text-lg font-bold text-[#304156] mb-2">{item.title}</h3>
                  <div className="inline-block px-3 py-1.5 bg-[#304156]/5 text-[#304156] text-xs font-bold rounded-lg mb-4">{item.date}</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          CTA SECTION
      =================================================== */}
      <section className="relative bg-gradient-to-r from-[#2F4055] to-[#914D4D] py-24 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#914D4D]/30 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <Image src="/images/logos/events/gif.png" alt="GIF" width={220} height={60}
              className="h-14 w-auto brightness-0 invert opacity-90 mx-auto" />
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-6">
            Ready to Create Impact? <br />
            <span className="text-[#FFD1D1]">Batch 2 is Calling.</span>
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-10 leading-relaxed text-lg font-light">
            Southeast Asia open. Self-funded. Your project, your impact, your legacy — starting at NUS.
          </p>

          <div className="flex flex-col items-center gap-4 justify-center mb-12">
            <a href={links.register} target="_blank" rel="noopener noreferrer"
              className="bg-white text-[#914D4D] font-bold px-10 py-4 rounded-xl hover:bg-gray-100 transition-all shadow-xl flex items-center justify-center gap-2 text-lg">
              Register Now <ExternalLink className="w-5 h-5" />
            </a>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-2">
              <a href={links.indo} target="_blank" rel="noopener noreferrer"
                className="bg-transparent border border-white/30 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm">
                Guidebook (Indonesia) <Download className="w-4 h-4" />
              </a>
              <a href={links.sea} target="_blank" rel="noopener noreferrer"
                className="bg-transparent border border-white/30 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm">
                Guidebook (SEA Youth) <Download className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="inline-flex items-center gap-4 text-sm text-white/90 bg-white/10 border border-white/20 p-5 rounded-2xl backdrop-blur-md shadow-lg">
            <div className="bg-[#FFD1D1]/20 p-3 rounded-full">
              <MessageCircle className="w-6 h-6 text-[#FFD1D1]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-base">Payment & Registration Questions?</p>
              <p className="text-white/80 mt-0.5">Contact Keysha: <a href="https://api.whatsapp.com/send/?phone=6282119889911" target="_blank" rel="noopener noreferrer" className="text-[#FFD1D1] hover:underline font-bold">+62 821-1988-9911</a></p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}