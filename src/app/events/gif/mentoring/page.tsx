"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Rocket, ShieldCheck, Star, Zap, CheckCircle, XCircle } from "lucide-react";

type CurriculumItem = {
  date: string;
  title: string;
  desc: string;
  output: string;
};


const curriculum: CurriculumItem[] = [
  {
    date: "25 Mar 2026",
    title: "Session 01: Micro-Problem Identification",
    desc: "Narrowing down broad education issues into a specific, data-backed problem statement focused on SDG 4 (Quality Education).",
    output: "Validated SDG 4 problem statement.",
  },
  {
    date: "29 Mar 2026",
    title: "Session 02: Building the MVP - Solution Architecture",
    desc: "Designing a Minimum Viable Project. Learning how to build a creative yet feasible solution framework for absolute beginners.",
    output: "Initial project concept note.",
  },
  {
    date: "02 Apr 2026",
    title: "Session 03: Operational Blueprint",
    desc: "Mapping out the technical 'how-to' of your project. Creating a step-by-step workflow, timeline, and resource requirements.",
    output: "Technical operational flowchart.",
  },
  {
    date: "06 Apr 2026",
    title: "Session 04: Impact Logic & Measurement",
    desc: "Learning the Theory of Change. Defining how your project creates real impact and how to measure success using clear indicators.",
    output: "Impact M&E framework.",
  },
  {
    date: "09 Apr 2026",
    title: "Session 05: Stress-Testing & Final Refinement",
    desc: "Final logic check and risk mitigation. Sharpening the technical project specs to ensure it's bulletproof for final selection.",
    output: "Final project specification.",
  },
  {
    date: "11 Apr 2026",
    title: "DEADLINE: Final Project Deck Submission",
    desc: "The final gate. Submitting your complete project deck and technical specs for the Global Impact Fellowship selection.",
    output: "Submitted Golden Ticket application.",
  },
];


const DEADLINE = new Date("2026-03-25T11:59:59+07:00");

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
    return <span className="text-[#914D4D] font-bold">Registration Closed</span>;
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="flex gap-3 justify-center text-center">
      {[["Days", days], ["Hours", hours], ["Min", minutes], ["Sec", seconds]].map(
        ([label, value]) => (
          <div key={label} className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10">
            <div className="text-2xl font-extrabold text-white">{value}</div>
            <p className="text-xs uppercase tracking-wide text-white/80">
              {label}
            </p>
          </div>
        )
      )}
    </div>
  );
}

export default function SGTripMentoringPage() {
  return (
    <main className="min-h-screen bg-white text-[#304156] font-geologica">
      <Header />

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-[url('/images/contents/stories/member-stories/banner/singapore-banner.png')] bg-cover bg-center" />
        
        {/* OVERLAY: Gradient Linear -> #2F4055 #914D4D */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2F4055] to-[#914D4D] opacity-90" />

        {/* CONTENT */}
        <div className="relative max-w-6xl mx-auto px-6 pt-8 pb-12 lg:pt-18 lg:pb-18 text-white text-center">
          
          <div className="flex items-center justify-center">
            <Image
              src="/images/logos/events/gifsgp.png"
              alt="Global Impact Fellowship in Singapore"
              width={270}
              height={72}
              className="relative h-auto w-[240px] md:w-[400px] drop-shadow-xl"
              priority
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
            <span className="text-white drop-shadow-md">Project Mentoring</span>
          </h1>

          {/* PRIVILEGE BADGE */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4 text-white text-sm font-semibold tracking-wide backdrop-blur-sm">
            <Zap className="w-4 h-4 fill-white text-white" />
            Fast-Track to Final Selection
          </div>

          <p className="mt-2 max-w-3xl mx-auto text-lg text-white/90 leading-relaxed">
            An intensive 5-session mentoring program to prepare you for 
            the Global Impact Fellowship in Singapore 2026. <strong>Skip the essay screening and go straight to Project Presentation.</strong>
          </p>

          {/* COUNTDOWN (TOP) */}
          <div className="mt-10">
            <p className="text-sm uppercase tracking-widest text-white/70 mb-3">
              <strong>Early Bird Ends In:</strong>
            </p>
            <CountdownTimer />
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Button asChild className="bg-white text-[#914D4D] font-bold px-8 py-3 hover:bg-gray-100 shadow-xl">
              <Link href="https://forms.gle/D4DMBFshr1JeydZC9" target="_blank">
                Apply for Mentoring
              </Link>
            </Button>
            <Button asChild className="bg-transparent border border-white/40 text-white font-semibold px-8 py-3 hover:bg-white/10">
              <Link href="https://wa.me/6288297253491" target="_blank">
                Ask Before Applying
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ================= THE GOLDEN TICKET (FAST TRACK) ================= */}
      <section className="max-w-6xl mx-auto px-6 py-16 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[#304156]">The "Golden Ticket" Privilege</h2>
            <p className="text-gray-600 mt-2">Mentoring participants bypass the early elimination rounds.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            
            {/* REGULAR ROUTE */}
            <div className="space-y-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
              <h3 className="text-center font-bold text-gray-500 uppercase tracking-widest text-sm">Regular Applicant</h3>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="bg-gray-200 p-2 rounded-full"><XCircle className="w-5 h-5 text-gray-500"/></div>
                <div>
                  <p className="font-bold text-gray-700">Phase 1: Administration Screening</p>
                  <p className="text-xs text-gray-500">CV & Documents Check</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="bg-gray-200 p-2 rounded-full"><XCircle className="w-5 h-5 text-gray-500"/></div>
                <div>
                  <p className="font-bold text-gray-700">Phase 2: Essay & Project Submission</p>
                  <p className="text-xs text-gray-500">Project Clarity Motivation</p>
                </div>
              </div>
               <div className="flex items-center gap-4 bg-gray-100 p-4 rounded-xl border border-gray-200 border-dashed">
                <div className="bg-gray-300 p-2 rounded-full"><Rocket className="w-5 h-5 text-gray-500"/></div>
                <div>
                  <p className="font-bold text-gray-600">Phase 3: Project Presentation</p>
                </div>
              </div>
            </div>

            {/* FAST TRACK ROUTE */}
            <div className="relative space-y-4">
              <div className="absolute -top-4 -right-4 bg-[#914D4D] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-6">
                FAST TRACK
              </div>
              <h3 className="text-center font-bold text-[#914D4D] uppercase tracking-widest text-sm">Mentoring Graduate</h3>
              
              <div className="flex items-center gap-4 bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="bg-green-100 p-2 rounded-full"><CheckCircle className="w-5 h-5 text-green-600"/></div>
                <div>
                  <p className="font-bold text-green-800">Phase 1 & 2 Skipped</p>
                  <p className="text-xs text-green-700">Pre-validated via Mentoring</p>
                </div>
              </div>

              {/* NightFall Blue Card */}
              <div className="flex items-center gap-4 bg-[#304156] p-5 rounded-xl border border-[#304156] shadow-lg transform scale-105">
                <div className="bg-white/20 p-2 rounded-full"><Rocket className="w-6 h-6 text-white"/></div>
                <div>
                  <p className="font-bold text-white text-lg">Direct to Phase 3</p>
                  <p className="text-xs text-gray-300">Project Presentation</p>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                *You will present the project you developed during mentoring.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= PROGRAM CONTEXT ================= */}
      <section className="max-w-6xl mx-auto px-6 py-10 space-y-6">
        <h2 className="text-3xl font-bold text-[#304156]">
          About the Global Impact Fellowship in Singapore 2026
        </h2>

        <p className="text-[#304156]/80 max-w-4xl leading-relaxed">
          Global Impact Fellowship in Singapore is an intensive international exposure program
          designed by IELS to equip Indonesian students and young professionals with
          global academic awareness, career readiness, and leadership responsibility.
        </p>

        <p className="text-[#304156]/80 max-w-4xl leading-relaxed">
          This program is <strong>not a sightseeing trip</strong>. It is a learning-
          and impact-driven journey that connects participants directly with
          Singapore&apos;s world-class academic ecosystem through <strong>NUS</strong> and <strong>Glints</strong>.
        </p>

        <div className="pt-5">
          <Button asChild className="bg-[#914D4D] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#7a3e3e] shadow-lg">
            <Link href="/events/gif">Read Full Program Details</Link>
          </Button> 
        </div>
      </section>

  {/* ================= WHAT YOU WILL GET ================= */}
      <section className="relative w-full max-w-6xl mx-auto py-16 px-6">
        
        {/* Decorative Geometric Blocks (Mimicking the Poster) */}
        <div className="absolute left-0 md:left-2 top-32 w-16 md:w-24 h-32 bg-[#304156] -z-10 shadow-lg rounded-r-xl md:rounded-xl"></div>
        <div className="absolute right-8 md:right-12 -bottom-4 w-48 md:w-64 h-24 bg-[#4a3b4e] -z-10 shadow-lg rounded-xl hidden md:block"></div>

        <div className="bg-[#FFFFFF] rounded-[2.5rem] p-10 md:p-16 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
          
          {/* Subtle background texture/watermark */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-5 pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-gray-50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 opacity-70"></div>

          {/* Heading */}
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#304156] mb-16 leading-tight max-w-2xl relative z-10">
            What Will <span className="text-[#914D4D]">You Get</span><br />
            from This Mentoring ?
          </h2>

          {/* 2-Column Grid for Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 relative z-10">
            
            {/* LEFT COLUMN */}
            <div className="space-y-10">
              {/* Item 1 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-1.5 h-6 bg-[#914D4D] rounded-full"></div>
                <h3 className="text-2xl font-bold text-[#304156] mb-3">Strategic Clarity</h3>
                <p className="text-[#304156]/80 text-lg leading-relaxed">
                  A precise, data-backed micro-problem with clear root cause.
                </p>
              </div>

              {/* Item 2 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-1.5 h-6 bg-[#304156] rounded-full"></div>
                <h3 className="text-2xl font-bold text-[#304156] mb-3">Project Direction</h3>
                <p className="text-[#304156]/80 text-lg leading-relaxed">
                  A strong, SDG-aligned project idea refined for feasibility and relevance
                </p>
              </div>

              {/* Item 3 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-1.5 h-6 bg-[#914D4D] rounded-full"></div>
                <h3 className="text-2xl font-bold text-[#304156] mb-3">Executable Framework</h3>
                <p className="text-[#304156]/80 text-lg leading-relaxed">
                  A realistic MVP and structured operational plan
                </p>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-10 md:mt-2">
              {/* Item 4 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-1.5 h-6 bg-[#304156] rounded-full"></div>
                <h3 className="text-2xl font-bold text-[#304156] mb-3">Measurable Impact</h3>
                <p className="text-[#304156]/80 text-lg leading-relaxed">
                  A defensible project design with clear indicators, M&E tools, and scalability logic.
                </p>
              </div>

              {/* Item 5 */}
              <div className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-1.5 h-6 bg-[#914D4D] rounded-full"></div>
                <h3 className="text-2xl font-bold text-[#304156] mb-3">Private Support</h3>
                <p className="text-[#304156]/80 text-lg leading-relaxed">
                  Session recordings, optional 1-on-1 booking, and private consultation access.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
      {/* ================= CURRICULUM ================= */}
      <section className="py-12 overflow-hidden">
        <div className="text-center mb-12 px-6">
          <h2 className="text-3xl font-extrabold text-[#304156] mb-3">
            Mentoring Curriculum & Timeline
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            A structured mentoring journey designed to prepare you strategically,
            academically, and professionally for international selection.
          </p>
        </div>

        <div className="relative max-w-[1400px] mx-auto">
          <div className="absolute left-0 right-0 top-1/2 h-[6px] bg-[#914D4D]/20 rounded-full -translate-y-1/2" />
          <div className="overflow-x-auto scrollbar-none px-12">
            <div className="flex gap-8 w-max py-6 mx-auto">
              {curriculum.map((item, i) => (
                <div key={i} className="relative min-w-[300px] max-w-[300px] rounded-3xl bg-white p-6 border border-gray-200 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <p className="text-sm font-semibold text-[#914D4D] mb-2">{item.date}</p>
                  <h3 className="text-lg font-bold text-[#304156] mb-3">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{item.desc}</p>
                  <div className="text-sm font-semibold text-[#304156]">
                    Output:
                    <span className="block mt-1 font-normal text-gray-600">{item.output}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-10 text-sm text-gray-600 max-w-4xl mx-auto px-6 text-center">
          All sessions are recorded. If you miss a session, you may access the
          recording, book a 1-on-1 mentoring session, and consult privately.
        </p>
      </section>

      {/* ================= SAFETY NET (NO RISK) ================= */}
      <section className="py-12 px-6 border-t border-gray-100">
         <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl font-bold text-[#304156]">
               Is It Worth It If I Don't Get Selected?
            </h2>
            <p className="text-gray-600 text-lg">
               Absolutely. We designed this mentoring to be a <span className="text-[#914D4D] font-bold">"No-Wasted-Effort"</span> investment.
               Even if you are not selected for the Singapore trip, you still receive:
            </p>

            <div className="grid md:grid-cols-3 gap-6 text-left">
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <ShieldCheck className="w-8 h-8 text-[#914D4D] mb-4" />
                  <h4 className="font-bold text-[#304156] mb-2">Project Realization</h4>
                  <p className="text-sm text-gray-600">
                     Your SDG Project will still be supported! You will join the "Project Realization" phase in Indonesia, getting exposure and community support.
                  </p>
               </div>
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <Star className="w-8 h-8 text-[#914D4D] mb-4" />
                  <h4 className="font-bold text-[#304156] mb-2">Priority for Next Batch</h4>
                  <p className="text-sm text-gray-600">
                     Mentoring graduates get "Priority Status" for the next GIF cohort later this year. You won't start from zero.
                  </p>
               </div>
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <Rocket className="w-8 h-8 text-[#914D4D] mb-4" />
                  <h4 className="font-bold text-[#304156] mb-2">NUS-Standard Skillset</h4>
                  <p className="text-sm text-gray-600">
                     The frameworks you learn (Problem Tree, Impact Logic, Pitching) are based on NUS standards—skills you keep for your career forever.
                  </p>
               </div>
            </div>
         </div>
      </section>

      {/* ================= INVESTMENT SECTION (SPLIT LAYOUT) ================= */}
      {/* BACKGROUND: Gradient Linear -> #2F4055 #914D4D #304156 */}
      <section className="w-full bg-gradient-to-br from-[#2F4055] via-[#914D4D] to-[#304156] py-24 px-6 relative overflow-hidden">
        
        {/* Background Decor (Blur Orbs) */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-black/20 rounded-full blur-[100px] pointer-events-none translate-x-1/3 translate-y-1/3"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* COLUMN 1: TEXT & URGENCY (LEFT) */}
            <div className="text-left space-y-8 order-2 lg:order-1">
              <div>
                <div className="inline-block bg-white/10 border border-white/20 text-white px-4 py-1.5 rounded-full text-sm font-bold mb-6 tracking-wide uppercase">
                  Limited Time Offer
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
                  Ready to Fast-Track <br/>
                  Your <span className="text-[#ffcccc]">Global Impact?</span>
                </h2>
                <p className="text-white/80 text-lg leading-relaxed max-w-lg">
                  Don't start from zero. Secure your spot in the mentoring program to get <strong>Direct Entry to the Final Phase</strong> and lifetime access to our incubation ecosystem.
                </p>
              </div>

              {/* Countdown moved here for Context */}
              <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm max-w-md">
                <p className="uppercase tracking-widest text-xs text-white/70 mb-4 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E56668] animate-pulse"></span>
                  Early Bird Ends In:
                </p>
                <CountdownTimer />
              </div>

              {/* Secondary Button */}
              <div className="pt-4">
                 <Button asChild className="bg-white border text-[#304156] font-semibold px-6 py-3 h-auto text-lg rounded-full hover:bg-white/90 w-full sm:w-auto transition-all">
                  <Link href="https://wa.me/6288297253491" target="_blank">
                    Have Questions? Chat Us
                  </Link>
                </Button>
              </div>
            </div>

{/* COLUMN 2: PRICING CARD (RIGHT) - FLOATING & TILTED */}
      <div className="order-1 lg:order-2 flex justify-center lg:justify-end relative">
        
        {/* Decorative Elements behind card */}
        <div className="absolute inset-0 bg-white/10 rounded-[2rem] blur-xl opacity-20 transform rotate-6 scale-95"></div>

        {/* THE CARD */}
        <div className="bg-white text-[#304156] rounded-[2rem] p-8 md:p-10 shadow-2xl relative transform transition-all duration-500 hover:scale-[1.02] hover:-rotate-1 border-4 border-white/10 w-full max-w-md">
          
          {/* Badge */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#304156] text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg border-2 border-white/20 whitespace-nowrap">
            Registration Open
          </div>

          <div className="text-center mt-4">
            <p className="uppercase text-xs tracking-[0.2em] text-gray-400 mb-6 font-bold">Total Investment</p>
            
            {/* Price Block */}
            <div className="flex flex-col items-center justify-center mb-8">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-[#914D4D] -translate-y-4">IDR</span>
                <span className="text-7xl font-extrabold text-[#304156] tracking-tighter">500k</span>
              </div>
              <span className="text-xs text-[#304156] font-bold bg-gray-100 px-3 py-1 rounded-full mt-2">
                Standard Professional Rate
              </span>
            </div>

            {/* Features List */}
            <ul className="text-left space-y-4 mb-8 border-t border-gray-100 pt-6">
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <CheckCircle className="w-5 h-5 text-[#914D4D] shrink-0" />
                <span><strong>5 Intensive</strong> mentoring sessions</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <CheckCircle className="w-5 h-5 text-[#914D4D] shrink-0" />
                <span><strong>Fast-Track Ticket</strong> (Skip Phase 1 & 2)</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <CheckCircle className="w-5 h-5 text-[#914D4D] shrink-0" />
                <span><strong>1-Year Access</strong> IELS Lounge Premium</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <CheckCircle className="w-5 h-5 text-[#914D4D] shrink-0" />
                <span><strong>Direct Interview</strong> with NUS Partners</span>
              </li>
            </ul>

            {/* Main CTA */}
            <Button asChild className="w-full bg-[#914D4D] text-white font-bold py-3 h-auto text-xl rounded-full hover:bg-[#7a3e3e] shadow-[0_10px_20px_rgba(145,77,77,0.3)] hover:shadow-[0_15px_30px_rgba(145,77,77,0.5)] transition-all transform hover:-translate-y-1">
              <Link href="https://ielsco.com/events/gif/mentoring">
                Secure Your Spot Now
              </Link>
            </Button>
            
            <p className="text-xs text-red-500 mt-4 font-bold animate-pulse">
              ⚠️ Limited slots available for May batch
            </p>
          </div>
        </div>
      </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}