"use client";
import { Plane, Building2, Utensils, MessageCircle, Info, Download, Briefcase, Lightbulb, Award, Gift, ExternalLink, Clock, Search, Rocket, FileText, ArrowRight, CheckCircle, XCircle, Calendar, ShieldCheck, Gem, Users } from 'lucide-react';
import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type TimelineItem = {
  phase: string;
  date: string;
  title: string;
  desc: string;
};

const timeline = [
    {
      phase: "Phase 1",
      title: "Administration Screening",
      date: "15 Feb – 23 Mar 2026",
      desc: "Initial screening of motivation, background, and readiness to join a global exposure program."
    },
    {
      phase: "Milestone",
      title: "Phase 1 Announcement",
      date: "3 April 2026",
      desc: "Official announcement of candidates advancing to the next stage of the selection process."
    },
    {
      phase: "Phase 2",
      title: "Essay & Project Submission",
      date: "4 – 20 April 2026",
      desc: "Deep dive into your ideas. Candidates submit essays and project concepts addressing specific SDG challenges."
    },
    {
      phase: "Milestone",
      title: "Phase 2 Announcement",
      date: "27 April 2026",
      desc: "Shortlisted candidates who successfully passed the essay and project review are revealed."
    },
    {
      phase: "Phase 3",
      title: "Video Pitch Submission",
      date: "10 – 29 May 2026",
      desc: "The final gate. Pitch your project to our panel by submitting a comprehensive and compelling video presentation."
    },
    {
      phase: "Self-Funded",
      title: "Registration Closes",
      date: "29 May 2026",
      desc: "Final deadline for general delegates to secure their spot through the self-funded pathway."
    },
    {
      phase: "Milestone",
      title: "Final Selection Announcement",
      date: "1 June 2026",
      desc: "The ultimate reveal of the Global Impact Fellowship delegates across all funding tracks."
    },
    {
      phase: "Preparation",
      title: "Onboarding & Project Prep",
      date: "13 June – Late June 2026",
      desc: "Official onboarding on June 6, followed by team bonding, project preparation, and pre-departure socialization."
    },
    {
      phase: "Execution",
      title: "Departure to Singapore",
      date: "7 – 13 July 2026",
      desc: "The core fellowship! A week of intensive campus visits, HQ tours, networking, and executing your project."
    }
  ];

export default function SGITPage() {
  return (
    <main className="min-h-screen bg-white text-[#304156] font-geologica">
      <Header />

   {/* ================= HERO SECTION ================= */}
      {/* Background set to NightFall Blue fallback, with Gradient Overlay */}
      <section className="relative min-h-[65vh] flex items-center justify-center overflow-hidden bg-[#304156]">
        
        {/* BACKGROUND IMAGE */}
        <div className="absolute inset-0 bg-[url('/images/contents/stories/member-stories/banner/singapore-banner.png')] bg-cover bg-center" />
        
        {/* OVERLAY: Gradient Linear -> #2F4055 #914D4D #304156 */}
        <div className="absolute inset-0 z-0">
           <Image
            src="/images/backgrounds/singapore-bg.jpg" 
            alt="Singapore Skyline"
            fill
            className="object-cover object-center"
            priority
          />
          {/* NEW GRADIENT OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2F4055]/95 via-[#914D4D]/80 to-[#304156]/95" />
        </div>

        {/* CONTENT CONTAINER */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center">
          
          {/* LOGO EVENT */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Glow effect matching the new Red */}
              <div className="absolute inset-0 bg-[#914D4D] blur-[30px] opacity-30 rounded-full"></div>
              <Image
                src="/images/logos/events/gifsgp.png"
                alt="Global Impact Fellowship in Singapore"
                width={200}
                height={80}
                className="relative h-auto w-[240px] md:w-[400px] drop-shadow-xl"
                priority
              />
            </div>
          </div>

          {/* DEPARTURE DATE BADGE */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white font-bold text-sm mb-6 shadow-sm">
            <Calendar className="w-4 h-4 text-[#914D4D]" />
            Departure: July 7 - 13, 2026
          </div>

          {/* SUBHEADLINE */}
          <p className="text-base md:text-lg text-gray-200 max-w-xl mx-auto leading-relaxed mb-8 font-light">
            A high-stakes leadership and project incubation for future leaders to design and execute meaningful projects for Indonesia.
          </p>

          {/* FUNDING BADGES */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-2 text-xs md:text-sm text-white font-medium shadow-sm">
              <CheckCircle className="w-4 h-4 text-[#304156]" /> 
              <span>10 Fully Funded</span>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center gap-2 text-xs md:text-sm text-white font-medium shadow-sm">
              <CheckCircle className="w-4 h-4 text-[#304156]" /> 
              <span>10 Partially Funded</span>
            </div>
          </div>

          {/* SELF FUNDED ANNOUNCEMENT */}
          <div className="mt-4 bg-[#304156]/40 border border-white/10 backdrop-blur-xl rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto shadow-2xl relative overflow-hidden">
            {/* Subtle glow inside the card */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#914D4D] rounded-full blur-[70px] opacity-30 pointer-events-none"></div>
            
            <h3 className="text-xl md:text-2xl font-black text-white mb-2 flex items-center justify-center gap-2">
              <Rocket className="w-6 h-6 text-white" />
              Now Open for Self-Funded Registration!
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6 relative z-10">
              {/* Early Bird */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1">
                <div className="text-white text-xs font-black uppercase tracking-widest mb-1">Early Bird</div>
                <div className="text-white font-bold text-sm">Ends April 25, 2026</div>
              </div>
              {/* Normal Price */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex-1">
                <div className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Normal Price</div>
                <div className="text-white font-bold text-sm">Ends May 20, 2026</div>
              </div>
            </div>

            {/* CALL TO ACTIONS */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 relative z-10">
              <a 
                href="https://forms.gle/Xe6JTRNL9MFQ1uVw8" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-[#914D4D] hover:bg-[#7a3e3e] text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg text-sm"
              >
                Register Now
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
              <a 
                href="https://drive.google.com/file/d/1PA6ubLekEa-SZMjQt8UWYlepYywzBTvE/view?usp=drivesdk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3.5 px-4 rounded-xl font-bold flex items-center justify-center transition-all shadow-sm text-sm"
              >
                See Guidebook
                <Download className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>

        </div>
      </section>

   {/* ================= FUNDING & QUOTA ================= */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#304156] mb-4">
              Merit-Based. Transparent. <br/> <span className="text-[#914D4D]">No Hidden Business Models.</span>
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Unlike commercial programs where "1 Fully Funded" seat is subsidized by hundreds of paid participants, 
              <strong> GIF is genuinely sponsored</strong>. We invest in leaders who have the potential to change Indonesia.
            </p>
          </div>

          {/* === PRICING CARDS === */}
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            
            {/* FULLY FUNDED CARD */}
            <div className="relative bg-white rounded-3xl p-8 border-2 border-[#914D4D] shadow-2xl transform hover:-translate-y-2 transition-all duration-300 flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-[#914D4D] text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
                Top 10 Candidates
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 bg-[#914D4D]/10 rounded-2xl text-[#914D4D]">
                  <Gem className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#304156]">Fully Funded</h3>
                  <p className="text-sm text-[#304156]/60 font-medium">10 Seats Available</p>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center mb-8">
                <div className="text-3xl md:text-4xl font-black text-[#914D4D] leading-tight">
                  100%<br/>Scholarship
                </div>
                <div className="text-sm font-bold text-[#304156]/50 mt-2">All Expenses Covered</div>
              </div>
              
              <div className="mt-auto text-center bg-[#914D4D]/10 text-[#914D4D] py-4 rounded-xl text-sm font-bold">
                By Merit Selection Only
              </div>
            </div>

           {/* PARTIALLY FUNDED CARD */}
            <div className="relative bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:border-[#304156]/30 transform hover:-translate-y-2 transition-all duration-300 flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-[#304156] text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
                Next Top 10
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 bg-[#304156]/10 rounded-2xl text-[#304156]">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#304156]">Partial Funded</h3>
                  <p className="text-sm text-[#304156]/60 font-medium">10 Seats Available</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center mb-8">
                {/* ADJUSTED PRICE FORMAT */}
                <div className="flex items-baseline gap-1 text-[#304156]">
                  <span className="text-base md:text-lg font-bold opacity-80">IDR</span>
                  <span className="text-3xl md:text-4xl font-black">8,999</span>
                  <span className="text-xl md:text-2xl font-bold opacity-50">,000</span>
                </div>
                <div className="text-sm font-bold text-[#304156]/50 mt-2">Scholarship Subsidy</div>
              </div>
              
              <div className="mt-auto text-center bg-gray-50 text-gray-500 py-4 rounded-xl text-sm font-bold border border-gray-100">
                Flight Included
              </div>
            </div>

            {/* SELF FUNDED CARD */}
            <div className="relative bg-white rounded-3xl p-8 border border-gray-200 shadow-lg hover:border-[#304156]/30 transform hover:-translate-y-2 transition-all duration-300 flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-gray-200 text-[#304156] text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl uppercase tracking-wider">
                General
              </div>
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 bg-gray-100 rounded-2xl text-[#304156]">
                  <Rocket className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#304156]">Self Funded</h3>
                  <p className="text-sm text-[#304156]/60 font-medium">Limited Batch Quota</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center mb-8">
                {/* ADJUSTED PRICE FORMAT WITH STRIKETHROUGH */}
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <div className="flex items-baseline gap-1 text-[#304156]">
                    <span className="text-base md:text-lg font-bold opacity-80">IDR</span>
                    <span className="text-3xl md:text-4xl font-black">12,900</span>
                    <span className="text-xl md:text-2xl font-bold opacity-50">,000</span>
                  </div>
                  <div className="text-sm md:text-base text-gray-400 font-bold line-through">
                    15,900,000
                  </div>
                </div>
                <div className="text-sm font-bold text-[#914D4D] mt-2">Early Bird Price</div>
              </div>
              
              <div className="mt-auto">
                <Button 
                  onClick={() => window.open("https://drive.google.com/file/d/1PA6ubLekEa-SZMjQt8UWYlepYywzBTvE/view?usp=drivesdk", "_blank")}
                  className="w-full bg-white text-[#304156] border-2 border-[#304156]/20 hover:bg-[#304156]/5 hover:border-[#304156]/40 py-3 rounded-xl font-bold shadow-sm transition-all"
                >
                  See Guidebook
                  <ExternalLink className="w-3 h-3 ml-2" />
                </Button>
              </div>
            </div>
            
          </div>
{/* === DISCLAIMER NOTE KOUTA === */}
            <div className="max-w-5xl mx-auto mb-16 px-5 py-4 bg-[#304156]/5 border border-[#304156]/10 rounded-xl flex items-start gap-3 shadow-sm">
              <Info className="w-5 h-5 text-[#304156]/70 mt-0.5 shrink-0" />
              <p className="text-sm text-[#304156]/80 leading-relaxed font-medium">
                <strong>*Disclaimer regarding quotas:</strong> The 10 Fully Funded and 10 Partially Funded quotas are subject to change. IELS strictly selects delegates based on actual potential and merit rather than merely fulfilling the quota capacity. All selection decisions made by the committee are final and cannot be contested.
              </p>
            </div>
          {/* === ALL-IN BENEFITS SECTION === */}
          <div className="max-w-5xl mx-auto bg-white rounded-3xl p-8 md:p-12 border border-[#304156]/10 shadow-xl relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#304156]/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="text-center mb-10 relative z-10">
              <h3 className="text-2xl md:text-3xl font-black text-[#304156] mb-2">Program Core Benefits</h3>
              <p className="text-gray-500 font-medium">Comprehensive facilities provided during the fellowship</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 relative z-10">
              {[
                { icon: Plane, title: "Round Trip Airfare*" },
                { icon: Building2, title: "Accommodation at NUS Dorm" },
                { icon: Utensils, title: "3x Meals per Day" },
                { icon: Briefcase, title: "NUS & Glints HQ Tours" },
                { icon: Lightbulb, title: "Project Incubation" },
                { icon: Award, title: "International Certificate" },
                { icon: Gift, title: "Exclusive Merchandise" },
                { icon: ShieldCheck, title: "Travel Insurance*" }
              ].map((benefit, i) => (
                <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center flex flex-col items-center justify-center hover:bg-white hover:border-[#304156]/20 hover:shadow-md transition-all">
                  <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                    <benefit.icon className="w-6 h-6 text-[#304156]" />
                  </div>
                  <span className="text-sm font-bold text-[#304156] leading-tight">
                    {benefit.title}
                  </span>
                </div>
              ))}
            </div>


          </div>

        </div>
      </section>
      {/* ================= WHAT IS GIF (Definition) ================= */}
      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-[#304156]">
              More Than Just <br/> A Visit.
            </h2>
            <div className="h-1 w-20 bg-[#914D4D] rounded-full"></div>
            <p className="text-gray-600 text-lg leading-relaxed">
              The Global Impact Fellowship (GIF) is designed to equip Indonesian students with 
              <strong> global academic awareness</strong>, <strong>career readiness</strong>, and <strong>leadership responsibility</strong>.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We connect participants directly with Singapore’s world-class ecosystem—through 
              <strong> National University of Singapore (NUS)</strong> and <strong>Glints</strong>—to explore how English proficiency and real-world skills intersect in top universities.
            </p>
          </div>
          
          {/* Comparison Card */}
          <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-xl relative overflow-hidden group hover:border-[#914D4D]/30 transition-all">
            <div className="absolute top-0 right-0 bg-[#304156] text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
              THE IELS STANDARD
            </div>
            <h3 className="text-xl font-bold text-[#304156] mb-6">What Makes GIF Different?</h3>
            
            <ul className="space-y-4">
              <li className="flex items-start gap-3 opacity-50">
                <XCircle className="w-5 h-5 text-gray-400 mt-1 shrink-0" />
                <span className="text-gray-500 line-through decoration-gray-400">Just a sightseeing tour</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#914D4D] mt-1 shrink-0" />
                <span className="text-gray-700 font-medium">Mandatory Academic Research & SDG Project</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#914D4D] mt-1 shrink-0" />
                <span className="text-gray-700 font-medium">Accountability to post-trip outcomes</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[#914D4D] mt-1 shrink-0" />
                <span className="text-gray-700 font-medium">Long-term ecosystem guidance by IELS</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

{/* ================= PROGRAM STRUCTURE & TIMELINE ================= */}
      <section className="py-16 overflow-hidden bg-white">
        {/* HEADER */}
        <div className="text-center mb-10 px-6">
          <h2 className="text-3xl font-extrabold text-[#304156] mb-3">
            Program Structure & Timeline
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-6">
            A multi-phase journey — from preparation and selection
            to global exposure and post-trip impact.
          </p>

        {/* TIMELINE ADJUSTMENT NOTE */}
          <div className="max-w-3xl mx-auto px-5 py-4 bg-[#914D4D]/5 border border-[#914D4D]/20 rounded-xl text-left shadow-sm">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#914D4D] mt-0.5 shrink-0" />
              <div className="text-sm text-[#304156]/80 leading-relaxed">
                <strong>Schedule Update:</strong> Due to recent global aviation instability, we have adjusted the Singapore departure to <strong>July 7 - 13, 2026</strong> to ensure the uncompromising quality of your program experience.<br/>
                <Link 
                  href="/events/gif/timeline-adjustment" 
                  className="font-bold text-[#914D4D] hover:text-[#7a3e3e] hover:underline mt-1.5 inline-flex items-center transition-colors"
                >
                  Read the full clarification from our Principal &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* OUTER FRAME */}
        <div className="relative max-w-[1400px] mx-auto">
          {/* TRACK */}
          <div className="absolute left-0 right-0 top-1/2 h-[6px] bg-[#914D4D]/30 rounded-full -translate-y-1/2" />

          {/* GRADIENT FADE */}
          <div className="pointer-events-none absolute left-0 top-0 h-full w-12 lg:w-32 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 h-full w-12 lg:w-32 bg-gradient-to-l from-white to-transparent z-10" />

          {/* SCROLL AREA */}
          <div className="overflow-x-auto scrollbar-none px-6 lg:px-24">
            <div className="flex gap-8 w-max py-6 mx-auto">
              {timeline.map((item, i) => (
                <div
                  key={i}
                  className="group relative min-w-[300px] max-w-[300px] rounded-3xl bg-white p-6 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-[#914D4D]/30"
                >
                  {/* PHASE */}
                  <p className="text-xs font-black text-[#914D4D] mb-2 uppercase tracking-widest">
                    {item.phase}
                  </p>
                  {/* TITLE */}
                  <h3 className="text-lg font-bold text-[#304156] mb-2">
                    {item.title}
                  </h3>
                  {/* DATE */}
                  <div className="inline-block px-3 py-1 bg-[#304156]/5 text-[#304156] text-xs font-bold rounded-md mb-4">
                    {item.date}
                  </div>
                  {/* DESC */}
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTNOTE */}
        <p className="mt-10 text-sm text-gray-500 max-w-4xl mx-auto px-6 text-center font-medium">
          Timeline is subject to refinement. Detailed briefings and
          official instructions will be shared with selected participants.
        </p>
      </section>
{/* ================= POST-RESIDENCY PHASE ================= */}
      <section className="py-12 px-6">
        <div className="max-w-5xl mx-auto">
          
          {/* HEADER SECTION */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#914D4D]/10 text-[#304156] px-4 py-1.5 rounded-full text-sm font-bold mb-4 border border-[#914D4D]/20">
              <Clock className="w-4 h-4 text-[#914D4D]" />
              <span>Post-Residency Phase</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#304156] mb-4">
              The Real Impact Happens <span className="text-[#914D4D]">Back Home</span>
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
              The Singapore trip is just the spark. Upon returning to Indonesia, Fellows enter a 
              <strong> 4-month implementation period</strong> facilitated by IELS to turn their insights into tangible outcomes.
            </p>
          </div>

          {/* SINGLE CONTENT CARD: PROJECT REALIZATION */}
          <Link 
            href="/events/gif/project"
            className="relative bg-white rounded-3xl p-8 md:p-10 border border-gray-200 shadow-sm hover:shadow-xl hover:border-[#914D4D]/30 transition-all duration-300 group block cursor-pointer"
          >
            <div className="flex flex-col md:flex-row gap-10 items-stretch">
              
              {/* LEFT COLUMN: DESCRIPTION */}
              <div className="flex-1 flex flex-col">
                <div className="w-16 h-16 bg-[#914D4D]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#914D4D] transition-colors duration-300">
                  <Rocket className="w-8 h-8 text-[#914D4D] group-hover:text-white transition-colors" />
                </div>

                <h3 className="text-2xl md:text-3xl font-bold text-[#304156] mb-4">Project Realization</h3>
                
                <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                  Execute your proposed social project (SDG 4) in Indonesia. Conducted in <strong>groups of 5</strong>, this phase requires an intensive 2-3 week on-site volunteership in a target region.
                </p>

                {/* ACTION LINK */}
                <div className="mt-auto flex items-center text-[#914D4D] font-bold text-sm md:text-base group-hover:translate-x-2 transition-transform">
                  Read Project Guidelines <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </div>

              {/* RIGHT COLUMN: SUPPORT & NOTES */}
              <div className="flex-1 flex flex-col gap-4">
                {/* IMPORTANT NOTE: GROUP MATCHING */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                  <p className="text-sm text-yellow-800 leading-relaxed">
                    <strong>*Team Formation:</strong> Groups are NOT formed during registration. IELS will match the 20 final delegates into 4 teams based on professional backgrounds and project idea similarity after the final announcement.
                  </p>
                </div>

                {/* IELS SUPPORT BLOCK */}
                <div className="bg-[#F7F8FA] rounded-2xl p-6 border border-gray-100 flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-6 h-6 text-[#304156]" />
                    <span className="text-sm font-bold text-[#304156] uppercase tracking-wide">Facilitated by IELS</span>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-gray-600">
                      <span className="text-[#914D4D] mt-1 text-lg leading-none">•</span>
                      <span>Access to IELS community pool (2,800+ members) for volunteer recruitment.</span>
                    </li>
                    <li className="flex items-start gap-3 text-gray-600">
                      <span className="text-[#914D4D] mt-1 text-lg leading-none">•</span>
                      <span>Monthly progress monitoring & project funding support.</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </Link>

          {/* TIMELINE VISUALIZATION */}
          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-4 text-center text-sm text-gray-500 bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300">
             <span className="font-semibold text-[#304156]">Timeline Overview:</span>
             <span className="bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">July (Singapore Trip)</span>
             <span className="text-gray-300 hidden md:block">→</span>
             <div className="flex flex-col items-center">
               <span className="font-bold text-[#914D4D] bg-[#914D4D]/10 px-3 py-1 rounded-md">Aug - Nov (Project Execution)</span>
               <span className="text-xs text-gray-400 mt-1">*Includes 2-3 weeks intensive volunteership</span>
             </div>
             <span className="text-gray-300 hidden md:block">→</span>
             <span className="bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">Dec (Final Impact Report)</span>
          </div>
          
        </div>
      </section>{/* ================= SELF-FUNDED CTA ================= */}
      {/* Background Gradient Linear: #2F4055 -> #914D4D */}
      <section className="relative bg-gradient-to-r from-[#2F4055] to-[#914D4D] py-20 overflow-hidden">
        
        {/* SUBTLE BACKGROUND GLOW */}
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-[#914D4D]/30 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-[420px] h-[420px] bg-white/10 rounded-full blur-[120px]" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* IMAGE COLLAGE */}
            <div className="relative h-[300px] sm:h-[360px] lg:h-[440px] w-full flex items-center justify-center">
              {/* IMAGE 1 (BACK) */}
              <div className="absolute left-4 sm:left-6 lg:left-0 top-10 sm:top-8 lg:top-10 w-[78%] sm:w-[70%] lg:w-[65%] rotate-[-3deg] lg:rotate-[-6deg] rounded-3xl border-4 border-white shadow-2xl overflow-hidden z-10">
                <Image
                  src="/images/contents/careers/iels_team_2.png"
                  alt="GIF Singapore Activities"
                  width={600}
                  height={420}
                  className="object-cover"
                />
              </div>

              {/* IMAGE 2 (FRONT) */}
              <div className="absolute right-2 sm:right-4 lg:right-0 bottom-6 sm:bottom-4 lg:bottom-8 w-[82%] sm:w-[75%] lg:w-[70%] rotate-[2deg] lg:rotate-[4deg] rounded-3xl border-4 border-white shadow-2xl overflow-hidden z-20">
                <Image
                  src="/images/contents/careers/iels_team_3.png"
                  alt="GIF Group Discussion"
                  width={600}
                  height={420}
                  className="object-cover"
                />
              </div>
            </div>

            {/* CONTENT SIDE */}
            <div className="text-white">
              <div className="mb-6">
                <Image
                  src="/images/logos/events/gif.png"
                  alt="Global Impact Fellowship in Singapore"
                  width={270}
                  height={72}
                  className="h-15 w-auto brightness-0 invert opacity-100"
                  priority
                />
              </div>

              {/* HEADLINE */}
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-6">
                Ready to Make an Impact? <br/>
                <span className="text-[#ffcccc]">Join the Self-Funded Track</span>
              </h2>

              {/* DESCRIPTION */}
              <p className="text-white/90 leading-relaxed max-w-xl mb-8">
                Secure your spot directly in the Global Impact Fellowship. Experience the full Singapore incubation, exclusive campus and HQ tours, and comprehensive project execution without going through the competitive scholarship selection.
              </p>

              {/* PROOF POINTS */}
              <ul className="space-y-3 text-sm text-white/80 mb-8">
                <li>• <strong className="text-white">Limited Quota:</strong> Seats are allocated on a first-come, first-served basis.</li>
                <li>• <strong className="text-white">Early Bird Ends:</strong> April 25, 2026.</li>
                <li>• <strong className="text-white">All-Inclusive:</strong> NUS Accommodation, Meals, Tours, and Project Incubation.</li>
              </ul>

              {/* CTA BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <a 
                  href="https://forms.gle/x1KqxuhZVMsp5yQ36" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-white text-[#914D4D] font-bold px-6 py-3.5 rounded-xl hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl text-center flex items-center justify-center"
                >
                  Register Now
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
                <a 
                  href="https://drive.google.com/file/d/1PA6ubLekEa-SZMjQt8UWYlepYywzBTvE/view?usp=drivesdk" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-transparent border border-white/30 text-white font-bold px-6 py-3.5 rounded-xl hover:bg-white/10 transition-all duration-300 text-center flex items-center justify-center"
                >
                  See Guidebook
                  <Download className="w-4 h-4 ml-2" />
                </a>
              </div>

              {/* CONTACT INFO */}
              <div className="flex items-center gap-4 text-sm text-white/90 bg-white/10 border border-white/20 p-4 rounded-2xl w-fit backdrop-blur-sm">
                <div className="bg-[#ffcccc]/20 p-2 rounded-full">
                  <MessageCircle className="w-5 h-5 text-[#ffcccc]" />
                </div>
                <div>
                  <p className="font-bold text-white mb-0.5">Questions about registration?</p>
                  <p>Contact Dhila: <a href="https://api.whatsapp.com/send/?phone=6285770024261&text=Hi+Dhila%2C+I+would+like+to+know+more+about+Self-Funded+GIF+in+Singapore+Batch+1&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" className="text-[#ffcccc] hover:underline font-bold tracking-wide">+62 857-7002-4261</a></p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ================= FOOTER NOTE ================= */}
        <div className="max-w-6xl mx-auto px-6 py-15 mt-16">
          <div className="relative rounded-3xl border border-[#914D4D]/30 bg-[#FFF7F7] p-8 md:p-10 shadow-sm">
            {/* ACCENT BAR */}
            <div className="absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full bg-[#914D4D]" />

            <div className="pl-4 space-y-4 text-gray-700">
              <p className="font-extrabold text-[#304156] text-lg">
                GIF is a selective and limited-capacity program.
              </p>
              <p className="text-sm leading-relaxed font-medium">
                Even for the Self-Funded pathway, every participant is expected to show readiness, commitment, clarity of purpose, and orientation toward long-term impact.
              </p>
              <p className="text-sm leading-relaxed font-medium">
                This program is designed for future leaders who are willing to execute projects seriously — not just for a casual trip.
              </p>
              {/* SOCIAL */}
              <div className="pt-5 border-t border-[#914D4D]/20 text-sm font-medium mt-4">
                Follow official updates on Instagram{" "}
                <a href="https://instagram.com/iels_co" target="_blank" rel="noopener noreferrer" className="font-bold text-[#914D4D] hover:underline">@iels_co</a>{" "}
                or revisit this page regularly.
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

