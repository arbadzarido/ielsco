"use client";

import {
  Plane, Building2, Utensils, MessageCircle, Info, Download, Briefcase,
  Lightbulb, Award, Gift, ExternalLink, Clock, Rocket, FileText,
  ArrowRight, CheckCircle, XCircle, Calendar, ShieldCheck, Gem, Users,
  Globe, BookOpen, Target, Sparkles, Star, ChevronDown, GraduationCap,
  TrendingUp, Handshake, Layers, Heart, Map, Zap,
} from "lucide-react";
import Header  from "@/components/header";
import Footer  from "@/components/footer";
import Image   from "next/image";
import Link    from "next/link";
import { Button } from "@/components/ui/button";

// ============================================================
// DATA
// ============================================================

const timeline = [
  { phase: "Registration",  title: "Self-Funded Registration Opens",  date: "August 2026",          desc: "Applications open to youth across Southeast Asia (ages 15–23). Spots are limited to 12 participants; secure yours early." },
  { phase: "Onboarding",    title: "Pre-Departure Onboarding",        date: "September – October 2026", desc: "Receive the A-B-C onboarding pack: logistics guide, Foundations of Impact pre-reading, and the Blueprint worksheet for your project idea." },
  { phase: "Milestone",     title: "Registration Closes",              date: "October 2026",          desc: "Final deadline to secure your spot. Onboarding materials dispatched to all confirmed delegates." },
  { phase: "Execution",     title: "GIF Singapore Residency",          date: "November 2026",         desc: "4 days of intensive Project Incubation sessions at NUS, campus tours, NUS Dorm stay, city & cultural exploration." },
  { phase: "Post-Program",  title: "Impact Follow-Through",            date: "December 2026 onwards", desc: "Continue building your NGO/project with structured support from IELS. Publish your impact report within 90 days of returning home." },
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

const onboardingABC = [
  {
    letter: "A",
    title: "The Logistics",
    desc: "A comprehensive guide on NUS dorm life, Singapore transit maps, packing essentials, and a 'what to expect' manual for living on campus. No surprises.",
    icon: Map,
  },
  {
    letter: "B",
    title: "The Leadership Mindset",
    desc: "A curated pre-reading list and short online 'Foundations of Impact' course. Everyone lands in Singapore with a shared vocabulary — ready to go deep from Session 1.",
    icon: BookOpen,
  },
  {
    letter: "C",
    title: "The Blueprint",
    desc: "A structured worksheet where you define your organizational goals before arriving. Show up prepared for your NUS consultation — it makes every minute 10× more valuable.",
    icon: FileText,
  },
];

const benefitsIndonesia = [
  { icon: Building2,    text: "Accommodation at NUS Dormitory" },
  { icon: Lightbulb,   text: "Leadership & Project Incubation Workshop" },
  { icon: Utensils,    text: "3× Meals per Day" },
  { icon: GraduationCap, text: "NUS Campus Tour" },
  { icon: Award,       text: "International Certificate" },
  { icon: Gift,        text: "Exclusive Merchandise" },
];

const benefitsASEAN = [
  { icon: Building2,    text: "Accommodation at NUS Dormitory" },
  { icon: Lightbulb,   text: "Leadership & Project Incubation Workshop" },
  { icon: Utensils,    text: "3× Meals per Day" },
  { icon: GraduationCap, text: "NUS Campus Tour" },
  { icon: Award,       text: "International Certificate" },
  { icon: Gift,        text: "Exclusive Merchandise" },
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
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-[#304156]">
        <div className="absolute inset-0">
          <Image
            src="/images/backgrounds/singapore-bg.jpg"
            alt="Singapore Skyline"
            fill className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2F4055]/96 via-[#914D4D]/82 to-[#304156]/96" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center">

          {/* BATCH 2 badge */}
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#FFD1D1]" /> Batch 2 — Now Open
          </div>

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#914D4D] blur-[30px] opacity-30 rounded-full" />
              <Image
                src="/images/logos/events/gifsgp.png"
                alt="Global Impact Fellowship Singapore"
                width={200} height={80}
                className="relative h-auto w-[240px] md:w-[380px] drop-shadow-xl"
                priority
              />
            </div>
          </div>

          {/* Departure badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white font-bold text-sm mb-4 shadow-sm">
            <Calendar className="w-4 h-4 text-[#FFD1D1]" />
            Departure: November 2026 · Singapore
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
            Lead. Build. <span className="text-[#FFD1D1]">Impact.</span>
          </h1>

          <p className="text-base md:text-lg text-gray-200 max-w-2xl mx-auto leading-relaxed mb-6 font-light">
            A leadership & project incubation residency at the National University of Singapore — built for youth change-makers aged 15–23 across Southeast Asia.
          </p>

          {/* Target audience chips */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {[
              { icon: Globe,    label: "Open to Southeast Asia" },
              { icon: Users,    label: "Ages 15 – 23" },
              { icon: Briefcase, label: "Self-Funded Only" },
              { icon: Target,   label: "12 Delegate Quota" },
            ].map((chip) => (
              <div key={chip.label} className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-sm text-white font-medium">
                <chip.icon className="w-4 h-4 text-[#FFD1D1]" />
                {chip.label}
              </div>
            ))}
          </div>

          {/* Registration CTA card */}
          <div className="bg-[#304156]/50 border border-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#914D4D] rounded-full blur-[70px] opacity-25 pointer-events-none" />

            <h3 className="text-xl font-black text-white mb-2 flex items-center justify-center gap-2">
              <Rocket className="w-5 h-5 text-white" />
              Registration Opening Soon
            </h3>
            <p className="text-white/70 text-sm mb-6">
              Join the interest list now and be the first to receive the registration link, scholarship info, and guidebook.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 relative z-10">
              <a
                href="https://forms.gle/Xe6JTRNL9MFQ1uVw8"
                target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-[#914D4D] hover:bg-[#7a3e3e] text-white py-3.5 px-5 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg text-sm"
              >
                Join Interest List <ExternalLink className="w-4 h-4 ml-2" />
              </a>
              <a
                href="https://drive.google.com/file/d/1PA6ubLekEa-SZMjQt8UWYlepYywzBTvE/view?usp=drivesdk"
                target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3.5 px-5 rounded-xl font-bold flex items-center justify-center transition-all text-sm"
              >
                Download Guidebook <Download className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          WHAT IS GIF BATCH 2
      =================================================== */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-[#914D4D]/10 text-[#914D4D] px-4 py-1.5 rounded-full text-sm font-bold border border-[#914D4D]/20">
                <GraduationCap className="w-4 h-4" /> About GIF Batch 2
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#304156] leading-tight">
                Where Southeast Asia's Next Leaders Learn to Build.
              </h2>
              <div className="h-1 w-20 bg-[#914D4D] rounded-full" />
              <p className="text-gray-600 text-lg leading-relaxed">
                The Global Impact Fellowship is a leadership and project incubation program for Southeast Asian youth.
                It provides an immersive platform for aspiring changemakers to enhance their capacity in building impactful NGOs
                and social projects focused on <strong>SDG 4: Quality Education</strong>.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Participants receive direct consultation and constructive feedback from esteemed lecturers and students at
                the <strong>National University of Singapore (NUS)</strong> — bridging theoretical knowledge with real,
                on-the-ground execution.
              </p>
              <p className="text-gray-600 leading-relaxed">
                This is your foundation to lead, scale, and sustain a future-ready organization, backed by the IELS ecosystem.
              </p>
            </div>

            {/* What makes it different */}
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#304156] text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                THE IELS STANDARD
              </div>
              <h3 className="text-xl font-bold text-[#304156] mb-6">More Than Just a Campus Visit.</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 opacity-50">
                  <XCircle className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
                  <span className="text-gray-500 line-through decoration-gray-400">A sightseeing trip with a badge</span>
                </li>
                {[
                  "4× live Project Incubation sessions with NUS access",
                  "Mandatory SDG 4 project brought from home",
                  "Accountability to post-program impact outcomes",
                  "Long-term IELS ecosystem support beyond Singapore",
                  "Open to all Southeast Asian youth — not just Indonesians",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#914D4D] mt-1 shrink-0" />
                    <span className="text-gray-700 font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          HIGHLIGHT PROGRAM — 4 PILLARS
      =================================================== */}
      <section className="py-16 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#304156]/10 text-[#304156] px-4 py-1.5 rounded-full text-sm font-bold border border-[#304156]/15 mb-4">
              <Star className="w-4 h-4" /> Highlight Program
            </div>
            <h2 className="text-3xl font-extrabold text-[#304156] mb-3">What You'll Experience</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Four core pillars that define the GIF residency experience in Singapore.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Layers,        num: "01", title: "4× Project Incubation at NUS",    desc: "Direct consultation sessions with NUS faculty & mentors on your real SDG project." },
              { icon: GraduationCap, num: "02", title: "NUS Campus Tour",                 desc: "Explore one of Asia's top-ranked research universities and its world-class facilities." },
              { icon: Building2,     num: "03", title: "Stay at NUS Dormitory",           desc: "Live on campus for a full immersive academic experience — not a hotel tourist experience." },
              { icon: Globe,         num: "04", title: "City & Cultural Exploration",      desc: "Curated city exploration sessions to experience Singapore's multicultural identity firsthand." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg hover:border-[#914D4D]/20 transition-all">
                <div className="text-[10px] font-black text-[#914D4D] tracking-widest mb-3">{item.num}</div>
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
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-[#304156] mb-3">
              Transparent Pricing. <span className="text-[#914D4D]">Zero Hidden Fees.</span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              GIF Batch 2 is a Self-Funded program open to all Southeast Asian youth. Pricing varies by nationality to ensure accessibility.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-10">

            {/* Indonesian */}
            <div className="relative bg-white rounded-3xl p-8 border-2 border-[#914D4D] shadow-2xl transform hover:-translate-y-1 transition-all flex flex-col">
              <div className="absolute top-0 right-0 bg-[#914D4D] text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
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
                  <span className="text-4xl font-black text-[#914D4D]">6,999</span>
                  <span className="text-2xl font-bold text-[#304156]/40">,000</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">One-time program fee (excl. flight)</p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {benefitsIndonesia.map((b) => (
                  <li key={b.text} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-[#914D4D] shrink-0" />
                    {b.text}
                  </li>
                ))}
              </ul>
              <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 border border-gray-100">
                ✈️ Flights not included. Delegates arrange own travel to Singapore.
              </div>
            </div>

            {/* ASEAN / International */}
            <div className="relative bg-white rounded-3xl p-8 border-2 border-[#304156] shadow-xl transform hover:-translate-y-1 transition-all flex flex-col">
              <div className="absolute top-0 right-0 bg-[#304156] text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
                🌏 ASEAN
              </div>
              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="p-3 bg-[#304156]/10 rounded-xl">
                  <Globe className="w-6 h-6 text-[#304156]" />
                </div>
                <h3 className="text-xl font-bold text-[#304156]">Non-Indonesian (ASEAN)</h3>
              </div>
              <div className="mb-2">
                <div className="flex items-baseline gap-1 text-[#304156]">
                  <span className="text-lg font-bold text-[#304156]/60">IDR</span>
                  <span className="text-4xl font-black text-[#304156]">7,650</span>
                  <span className="text-2xl font-bold text-[#304156]/40">,000</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">≈ <strong className="text-[#304156]">USD 470</strong> (subject to exchange rate)</p>
                <p className="text-xs text-gray-400 mt-1 mb-5">One-time program fee (excl. flight)</p>
              </div>
              <ul className="space-y-2.5 mb-8 flex-1">
                {benefitsASEAN.map((b) => (
                  <li key={b.text} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-[#304156] shrink-0" />
                    {b.text}
                  </li>
                ))}
              </ul>
              <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 border border-gray-100">
                ✈️ Flights not included. Delegates arrange own travel to Singapore.
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="max-w-3xl mx-auto px-5 py-4 bg-[#304156]/5 border border-[#304156]/10 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-[#304156]/60 mt-0.5 shrink-0" />
            <p className="text-sm text-[#304156]/80 leading-relaxed">
              <strong>Quota is strictly limited to 12 delegates.</strong> Spots are allocated on a first-come, first-served basis upon registration confirmation and payment. The USD equivalent for ASEAN pricing is indicative and will be confirmed at time of invoice.
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          CURRICULUM — 4 MODULES
      =================================================== */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#2F4055] to-[#304156] text-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 px-4 py-1.5 rounded-full text-sm font-bold mb-4 text-white/80">
              <BookOpen className="w-4 h-4 text-[#FFD1D1]" /> The Curriculum
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-3">Leadership & Organizational Strategy</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Four core modules focused on the meta-skills of leadership — not just project management. Real frameworks, real application.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-14">
            {modules.map((m) => (
              <div key={m.num} className="bg-white/8 border border-white/10 rounded-2xl p-7 hover:bg-white/12 transition-all">
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="text-[10px] font-black text-[#FFD1D1] tracking-widest mb-2">{m.num}</div>
                    <div className="bg-white/10 p-2.5 rounded-xl">
                      <m.icon className="w-5 h-5 text-[#FFD1D1]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base mb-2">{m.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Daily Rundown */}
          <div className="bg-white/8 border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-[#FFD1D1]" />
              <h3 className="font-bold text-white text-lg">General Daily Rundown — 1 Hour 45 Minutes</h3>
            </div>
            <div className="space-y-4">
              {dailyRundown.map((slot, i) => (
                <div key={slot.time} className="flex items-start gap-5">
                  <div className="shrink-0 w-32 text-xs font-bold text-[#FFD1D1] pt-0.5">{slot.time}</div>
                  <div className="flex-1 pb-4 border-b border-white/10 last:border-0 last:pb-0">
                    <div className="font-bold text-white text-sm mb-1">{slot.label}</div>
                    <div className="text-xs text-white/60 leading-relaxed">{slot.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          PRE-DEPARTURE — A-B-C FRAMEWORK
      =================================================== */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#914D4D]/10 text-[#914D4D] px-4 py-1.5 rounded-full text-sm font-bold border border-[#914D4D]/20 mb-4">
              <Rocket className="w-4 h-4" /> Pre-Departure & Onboarding
            </div>
            <h2 className="text-3xl font-extrabold text-[#304156] mb-3">The A-B-C Framework</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Three onboarding packs delivered before departure to ensure every delegate arrives in Singapore ready — not just physically, but mentally and strategically.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {onboardingABC.map((item) => (
              <div key={item.letter} className="relative bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-lg hover:border-[#304156]/20 transition-all">
                <div className="absolute -top-4 left-6 w-10 h-10 bg-gradient-to-br from-[#2F4055] to-[#914D4D] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-lg font-black text-white">{item.letter}</span>
                </div>
                <div className="mt-6 mb-4">
                  <div className="bg-[#304156]/8 p-2.5 rounded-xl w-fit mb-3">
                    <item.icon className="w-5 h-5 text-[#304156]" />
                  </div>
                  <h3 className="font-bold text-[#304156] text-base mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================
          TIMELINE
      =================================================== */}
      <section className="py-16 overflow-hidden bg-gray-50">
        <div className="text-center mb-10 px-6">
          <h2 className="text-3xl font-extrabold text-[#304156] mb-3">Program Timeline</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            From registration to impact — your GIF Batch 2 journey at a glance.
          </p>
        </div>

        <div className="relative max-w-[1400px] mx-auto">
          <div className="absolute left-0 right-0 top-1/2 h-[6px] bg-[#914D4D]/25 rounded-full -translate-y-1/2" />
          <div className="pointer-events-none absolute left-0 top-0 h-full w-12 lg:w-28 bg-gradient-to-r from-gray-50 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 lg:w-28 bg-gradient-to-l from-gray-50 to-transparent z-10" />

          <div className="overflow-x-auto scrollbar-none px-6 lg:px-24">
            <div className="flex gap-8 w-max py-8 mx-auto">
              {timeline.map((item, i) => (
                <div key={i} className="group relative min-w-[280px] max-w-[280px] rounded-3xl bg-white p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-[#914D4D]/30">
                  <p className="text-xs font-black text-[#914D4D] mb-2 uppercase tracking-widest">{item.phase}</p>
                  <h3 className="text-base font-bold text-[#304156] mb-2">{item.title}</h3>
                  <div className="inline-block px-3 py-1 bg-[#304156]/5 text-[#304156] text-xs font-bold rounded-md mb-3">{item.date}</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 text-sm text-gray-400 max-w-3xl mx-auto px-6 text-center">
          Exact dates will be communicated to confirmed delegates. Timeline subject to minor adjustments.
        </p>
      </section>

      {/* ===================================================
          ELIGIBILITY & WHO SHOULD APPLY
      =================================================== */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">

            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 bg-[#304156]/10 text-[#304156] px-4 py-1.5 rounded-full text-sm font-bold border border-[#304156]/15">
                <Users className="w-4 h-4" /> Who Should Apply
              </div>
              <h2 className="text-3xl font-bold text-[#304156] leading-tight">
                Built for Youth Across Southeast Asia.
              </h2>
              <p className="text-gray-600 leading-relaxed">
                GIF Batch 2 is designed for young people who are already building something — or have a clear vision for what they want to build. You don't need to have a finished project; you need the drive to start one.
              </p>
              <ul className="space-y-3">
                {[
                  "Aged 15 – 23 years old",
                  "From any Southeast Asian country",
                  "Able to communicate in English (written & verbal)",
                  "Have an idea for an NGO, social project, or SDG-aligned initiative",
                  "Committed to executing a post-program impact activity",
                  "Able to fund your own participation and flight to Singapore",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-[#914D4D] mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Expectation box */}
            <div className="bg-gradient-to-br from-[#2F4055] to-[#304156] text-white rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Lightbulb className="w-6 h-6 text-[#FFD1D1]" />
                <h3 className="font-bold text-lg">What We Expect From You</h3>
              </div>
              <ul className="space-y-4">
                {[
                  { title: "Show Up Prepared",    desc: "Complete the Blueprint worksheet (Onboarding Pack C) before arriving. Your NUS consultation time is precious — use it." },
                  { title: "Engage Fully",         desc: "Attend all 4 incubation sessions, participate in discussions, and bring your real project challenges to the table." },
                  { title: "Build Post-Program",   desc: "Within 90 days of returning, publish an impact report on what you executed or learned from your NGO/project work." },
                  { title: "Represent Your Region",desc: "Carry the responsibility of being a Southeast Asian youth leader with dignity. You're not just here for yourself." },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FFD1D1] mt-2 shrink-0" />
                    <div>
                      <div className="font-bold text-white text-sm">{item.title}</div>
                      <div className="text-white/60 text-xs leading-relaxed mt-0.5">{item.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          ALSO REFERENCE: GIF BATCH 1
      =================================================== */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border border-[#304156]/10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm">
            <div className="bg-[#304156]/10 p-4 rounded-2xl shrink-0">
              <Info className="w-6 h-6 text-[#304156]" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-[#304156] text-lg mb-1">GIF Batch 1 Participants</h3>
              <p className="text-sm text-[#304156]/70 leading-relaxed">
                If you were selected in GIF Batch 1 (Fully Funded, Partial Funded, or Self-Funded — July 2026 departure), please refer to the dedicated finance and onboarding page for your batch details, payment deadlines, and delegate-specific information.
              </p>
            </div>
            <Link href="/events/gif/finance" className="shrink-0">
              <Button className="px-6 py-2.5 rounded-xl font-bold bg-[#304156] hover:bg-[#2F4055] text-white shadow-md flex items-center gap-2">
                GIF Batch 1 Finance <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================
          CTA SECTION
      =================================================== */}
      <section className="relative bg-gradient-to-r from-[#2F4055] to-[#914D4D] py-20 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#914D4D]/30 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="mb-6">
            <Image src="/images/logos/events/gif.png" alt="GIF" width={220} height={60}
              className="h-12 w-auto brightness-0 invert opacity-90 mx-auto" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
            Ready to Lead from Singapore? <br />
            <span className="text-[#FFD1D1]">Batch 2 — November 2026</span>
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8 leading-relaxed text-lg">
            12 spots. Southeast Asia open. Self-funded. Your project, your impact, your legacy — starting at NUS.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <a href="https://forms.gle/Xe6JTRNL9MFQ1uVw8" target="_blank" rel="noopener noreferrer"
              className="bg-white text-[#914D4D] font-bold px-8 py-3.5 rounded-xl hover:bg-gray-100 transition-all shadow-lg flex items-center justify-center gap-2">
              Register Now <ExternalLink className="w-4 h-4" />
            </a>
            <a href="https://drive.google.com/file/d/1PA6ubLekEa-SZMjQt8UWYlepYywzBTvE/view?usp=drivesdk" target="_blank" rel="noopener noreferrer"
              className="bg-transparent border border-white/30 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Download Guidebook <Download className="w-4 h-4" />
            </a>
          </div>

          {/* Contact */}
          <div className="inline-flex items-center gap-4 text-sm text-white/90 bg-white/10 border border-white/20 p-4 rounded-2xl backdrop-blur-sm">
            <div className="bg-[#FFD1D1]/20 p-2 rounded-full">
              <MessageCircle className="w-5 h-5 text-[#FFD1D1]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white">Questions about Batch 2?</p>
              <p>Contact Dhila: <a href="https://api.whatsapp.com/send/?phone=6285770024261" target="_blank" rel="noopener noreferrer" className="text-[#FFD1D1] hover:underline font-bold">+62 857-7002-4261</a></p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="max-w-4xl mx-auto px-6 mt-16">
          <div className="relative rounded-3xl border border-[#914D4D]/30 bg-[#FFF7F7] p-8 md:p-10 shadow-sm">
            <div className="absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full bg-[#914D4D]" />
            <div className="pl-5 space-y-3 text-gray-700">
              <p className="font-extrabold text-[#304156] text-lg">GIF is a selective, limited-capacity program.</p>
              <p className="text-sm leading-relaxed font-medium">
                Even for self-funded participants, every delegate is expected to demonstrate readiness, commitment, clarity of purpose, and orientation toward long-term impact. This is not a casual trip — it's a leadership commitment.
              </p>
              <p className="text-sm leading-relaxed font-medium">
                Follow official updates on Instagram{" "}
                <a href="https://instagram.com/iels_co" target="_blank" rel="noopener noreferrer" className="font-bold text-[#914D4D] hover:underline">@iels_co</a>{" "}
                or revisit this page regularly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}