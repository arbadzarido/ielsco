"use client";

import Header from "@/components/header";
import Footer from "@/components/footer";
import Image from "next/image";
import CountUp from "react-countup";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GIFPopup from "@/components/GIFPopup";
import { ArrowRight, GraduationCap, Briefcase, TrendingUp, Star, CheckCircle, Users } from "lucide-react";

export default function Home() {
  // Placeholder partner logos
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

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-[#E56668] selection:text-white overflow-x-hidden">
      <Header />
      <main className="flex flex-col w-full">
        
        {/* =========================================
            1️⃣ HERO SECTION
        ========================================= */}
        <section className="relative px-6 sm:px-12 lg:px-[100px] flex flex-col lg:flex-row items-center justify-center w-full gap-8 lg:gap-16 pt-28 sm:pt-32 lg:pt-36 pb-20 lg:pb-28 bg-white overflow-hidden">
          
          {/* Subtle Decorative Elements */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#E56668] rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#1A2534] rounded-full blur-[120px]"></div>
          </div>

          {/* Mascot */}
          <div className="order-1 lg:order-none flex justify-center items-center w-full lg:w-1/2 z-10 animate-fadeIn">
            <Image
              src="/images/contents/general/Hi!.svg"
              alt="IELS Mascot"
              width={700}
              height={700}
              priority
              className="w-[280px] sm:w-[400px] lg:w-[600px] h-auto object-contain mx-auto drop-shadow-2xl hover:scale-105 transition-transform duration-700"
            />
          </div>

          {/* Text Section */}
          <div className="order-2 lg:order-none flex flex-col justify-center items-center lg:items-start text-center lg:text-left w-full lg:w-1/2 space-y-6 z-10">
            
            {/* Headline */}
            <div className="text-[36px] sm:text-[48px] lg:text-[64px] text-[#1A2534] font-light leading-[1.1] tracking-tight animate-fadeIn">
              <p>
                <span className="font-extrabold">Your Launchpad to</span>
              </p>
              <p className="mt-2">
                <span className="font-extrabold text-[#E56668]">
                  Global Opportunities.
                </span>
              </p>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-[#2F4157]/80 max-w-xl leading-relaxed animate-fadeIn" style={{ animationDelay: "200ms" }}>
              Join 6,800+ ambitious Indonesian students building English skills, gaining global exposure, 
              and unlocking scholarships, remote careers, and international programs.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full sm:w-auto animate-fadeIn" style={{ animationDelay: "400ms" }}>
              <Button asChild className="bg-[#E56668] text-white font-bold px-10 py-3 text-lg hover:bg-[#C04C4E] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-full group w-full sm:w-auto">
                <Link href="/welcome/start" className="flex items-center justify-center gap-2">
                  Start Now
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
              </Button>

              <Button asChild className="border-2 border-[#1A2534] text-[#1A2534] font-bold px-10 py-3 text-lg hover:bg-[#1A2534] hover:text-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-full w-full sm:w-auto">
                <Link href="/about" className="flex items-center justify-center">
                  Learn More
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* =========================================
            2️⃣ STATS SECTION
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-10 border-y border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
                <p className="text-4xl sm:text-5xl font-black text-[#E56668] mb-2 tracking-tighter">
                  <CountUp end={6800} duration={2.5} separator="," enableScrollSpy />+
                </p>
                <p className="text-base sm:text-lg font-bold text-[#2F4157]">Active Members</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Growing daily</p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
                <p className="text-4xl sm:text-5xl font-black text-[#1A2534] mb-2 tracking-tighter">
                  <CountUp end={810} duration={2.5} enableScrollSpy />+
                </p>
                <p className="text-base sm:text-lg font-bold text-[#2F4157]">Success Stories</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Scholarships & awards</p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
                <p className="text-4xl sm:text-5xl font-black text-[#E56668] mb-2 tracking-tighter">
                  <CountUp end={135} duration={2.5} enableScrollSpy />+
                </p>
                <p className="text-base sm:text-lg font-bold text-[#2F4157]">Global Careers</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Remote jobs & interns</p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center sm:text-left">
                <p className="text-4xl sm:text-5xl font-black text-[#1A2534] mb-2 tracking-tighter">
                  <CountUp end={35} duration={2.5} enableScrollSpy />+
                </p>
                <p className="text-base sm:text-lg font-bold text-[#2F4157]">Study Abroad</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">International programs</p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            3️⃣ PATHS SECTION (STUDY VS WORK)
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-10 lg:py-12 bg-white">
          <div className="max-w-7xl mx-auto">
            
            {/* Section Header */}
            <div className="text-center space-y-4 mb-16">
              <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
                Your Path Awaits
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A2534] tracking-tight">
                Study or Work.<br />
                <span className="text-[#E56668]">We'll Get You There.</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose your goal. We provide the structure, community, and connections to make it happen.
              </p>
            </div>

            {/* Two Paths Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-16">
              
              {/* Study Path */}
              <div className="relative bg-gradient-to-br from-[#1A2534] to-[#2F4157] rounded-[40px] p-10 lg:p-14 text-white overflow-hidden group hover:shadow-2xl hover:shadow-[#1A2534]/20 transition-all duration-500">
                <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                  <GraduationCap size={300} className="text-white" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-[#E56668] rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500">
                    <GraduationCap size={32} className="text-white" />
                  </div>
                  
                  <h3 className="text-3xl font-extrabold mb-4">Study Abroad</h3>
                  <p className="text-white/80 mb-10 leading-relaxed text-lg">
                    Win scholarships, ace standardized tests, and secure admission to top universities worldwide. 
                    We guide you from English proficiency to application success.
                  </p>

                  <div className="space-y-4 mb-10 mt-auto">
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <div className="w-10 h-10 rounded-full bg-[#E56668]/20 flex items-center justify-center shrink-0">
                        <CheckCircle size={20} className="text-[#E56668]" />
                      </div>
                      <span className="text-sm font-semibold">Direct access to 9+ world-class university networks</span>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <p className="text-xs text-white/50 mb-4 uppercase tracking-widest font-bold">Partner Universities</p>
                   <div className="grid grid-cols-4 gap-3">
  {studyPartners.map((partner, index) => (
    <div key={index} className="bg-white backdrop-blur-md rounded-xl h-14 flex items-center justify-center p-2 overflow-hidden">
      <Image
        src={partner.logo}
        alt={partner.name}
        width={80}
        height={40}
        className="object-contain max-h-full opacity-80 group-hover:opacity-100 transition-opacity"
      />
    </div>
  ))}
</div>
                  </div>
                </div>
              </div>

              {/* Work Path */}
              <div className="relative bg-gradient-to-br from-[#E56668] to-[#c94f51] rounded-[40px] p-10 lg:p-14 text-white overflow-hidden group hover:shadow-2xl hover:shadow-[#E56668]/30 transition-all duration-500">
                <div className="absolute -right-10 -top-10 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                  <Briefcase size={300} className="text-white" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="w-16 h-16 bg-[#1A2534] rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500">
                    <Briefcase size={32} className="text-white" />
                  </div>
                  
                  <h3 className="text-3xl font-extrabold mb-4">Global Careers</h3>
                  <p className="text-white/90 mb-10 leading-relaxed text-lg">
                    Land remote jobs, secure international internships, and build professional careers with global companies. 
                    From interview prep to job placement.
                  </p>

                  <div className="space-y-4 mb-10 mt-auto">
                    <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
                      <div className="w-10 h-10 rounded-full bg-[#1A2534]/20 flex items-center justify-center shrink-0">
                        <CheckCircle size={20} className="text-[#1A2534]" />
                      </div>
                      <span className="text-sm font-semibold">Strategic career pipeline to 30+ MNCs in Asia Pacific</span>
                    </div>
                  </div>

                  <div className="border-t border-white/20 pt-6">
                    <p className="text-xs text-white/60 mb-4 uppercase tracking-widest font-bold">Partner Companies</p>
             <div className="grid grid-cols-4 gap-3">
  {workPartners.map((partner, index) => (
    <div key={index} className="bg-white backdrop-blur-md rounded-xl h-14 flex items-center justify-center p-2 overflow-hidden">
      <Image 
        src={partner.logo} 
        alt={partner.name} 
        width={80} 
        height={40} 
        className="object-contain max-h-full opacity-70 group-hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
      />
    </div>
  ))}
</div>     </div>
                </div>
              </div>

            </div>


          </div>
        </section>

     {/* =========================================
            4️⃣ MEMBER STORIES (NEW PREMIUM SECTION)
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-10 lg:py-12 bg-[#1A2534] relative overflow-hidden">
          {/* Subtle Glow Backgrounds */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E56668]/20 blur-[150px] rounded-full pointer-events-none"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#ffffff]/5 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-24 relative z-10">
            
            {/* Narrative - Left Side */}
            <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left order-1 lg:order-none">
              <div className="inline-block border border-[#E56668]/30 bg-[#E56668]/10 text-[#E56668] px-5 py-2 rounded-full font-bold text-sm tracking-widest uppercase">
                Social Proof
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
                They made it. <br/>
                <span className="text-[#E56668]">You're next.</span>
              </h2>
              <p className="text-white/70 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
                From academic exchanges at Tohoku University to international programs in the Philippines. Our members are actively proving that with the right ecosystem, Indonesian talent is absolutely unstoppable.
              </p>
              
              <div className="pt-4">
                <Button asChild className="bg-[#E56668] text-white font-bold hover:bg-[#c94f51] rounded-full px-10 py-3 text-lg group w-full sm:w-auto shadow-2xl shadow-[#E56668]/20 hover:-translate-y-1 transition-all duration-300">
                  <Link href="/stories" className="flex items-center justify-center gap-3">
                    Discover Their Stories
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Visual Cards - Right Side */}
            <div className="w-full lg:w-1/2 order-2 lg:order-none">
              
              {/* --- DESKTOP VIEW (OVERLAPPING CARDS) --- */}
              <div className="hidden lg:block relative w-full h-[550px]">
                
                {/* Card 1: Jo (Philippines) */}
                <div className="absolute top-8 right-8 w-[320px] bg-white rounded-[32px] p-6 shadow-2xl transform rotate-3 hover:rotate-0 hover:scale-105 hover:z-40 transition-all duration-500 z-20 cursor-default border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm relative">
                      <Image 
                        src="/images/contents/stories/member-stories/profile/jo.png" 
                        alt="George Abraham" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-[#1A2534] text-base leading-tight">George "Jo" Abraham</p>
                      <p className="text-[10px] text-[#E56668] font-black uppercase tracking-wider mt-0.5">ISUFST, Philippines</p>
                    </div>
                  </div>
                  <p className="text-[#2F4157] text-sm font-medium italic leading-relaxed">
                    "English isn't just a subject—it's a passport. If you have the willingness to learn and the courage to use it, the world becomes a lot closer."
                  </p>
                </div>

                {/* Card 2: Dzakwaan (Japan) */}
                <div className="absolute bottom-12 left-0 w-[340px] bg-white rounded-[32px] p-6 shadow-2xl transform -rotate-3 hover:rotate-0 hover:scale-105 hover:z-40 transition-all duration-500 z-30 cursor-default border border-gray-100">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-[#1A2534] rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm relative">
                      <Image 
                        src="/images/contents/stories/member-stories/profile/dzakwan.png" 
                        alt="Ahmad Zakwaan" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-[#1A2534] text-base leading-tight">Ahmad Zakwaan</p>
                      <p className="text-[10px] text-[#E56668] font-black uppercase tracking-wider mt-0.5">Tohoku Univ, Japan</p>
                    </div>
                  </div>
                  <p className="text-[#2F4157] text-sm font-medium italic leading-relaxed">
                    "Studying in an international space robotics lab was a dream. English skills are the absolute key to unlocking global opportunity."
                  </p>
                </div>

                {/* Card 3: Stats Badge */}
                <div className="absolute top-[45%] left-[10%] w-[260px] bg-gradient-to-br from-[#E56668] to-[#c94f51] rounded-[32px] p-6 shadow-2xl transform -translate-y-1/2 rotate-[-6deg] hover:rotate-0 hover:scale-105 transition-all duration-500 z-10 text-white cursor-default">
                  <div className="flex items-center gap-1.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} fill="currentColor" className="text-yellow-300 w-5 h-5" />
                    ))}
                  </div>
                  <p className="font-black text-4xl mb-1 tracking-tighter">110+</p>
                  <p className="text-sm text-white/90 font-medium leading-tight">Success stories written by our amazing community members.</p>
                </div>

              </div>

              {/* --- MOBILE VIEW (STACKED CARDS) --- */}
              <div className="flex flex-col gap-6 lg:hidden mt-8">
                
                {/* Stats Badge (Mobile) */}
                <div className="bg-gradient-to-br from-[#E56668] to-[#c94f51] rounded-[24px] p-6 text-white text-center shadow-lg mx-auto w-full max-w-sm">
                  <div className="flex justify-center items-center gap-1.5 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} fill="currentColor" className="text-yellow-300 w-4 h-4" />
                    ))}
                  </div>
                  <p className="font-black text-3xl mb-1">110+</p>
                  <p className="text-sm text-white/90">Global Success Stories</p>
                </div>

                {/* Card 1: Jo (Mobile) */}
                <div className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 mx-auto w-full max-w-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm relative shrink-0">
                      <Image 
                        src="/images/contents/stories/member-stories/profile/jo.png" 
                        alt="George Abraham" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-[#1A2534] text-sm leading-tight">George "Jo" Abraham</p>
                      <p className="text-[10px] text-[#E56668] font-black uppercase tracking-wider mt-0.5">ISUFST, Philippines</p>
                    </div>
                  </div>
                  <p className="text-[#2F4157] text-sm font-medium italic leading-relaxed">
                    "English isn't just a subject—it's a passport. If you have the willingness to learn, the world becomes a lot closer."
                  </p>
                </div>

                {/* Card 2: Dzakwaan (Mobile) */}
                <div className="bg-white rounded-[24px] p-6 shadow-xl border border-gray-100 mx-auto w-full max-w-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-[#1A2534] rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm relative shrink-0">
                      <Image 
                        src="/images/contents/stories/member-stories/profile/dzakwan.png" 
                        alt="Ahmad Zakwaan" 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-[#1A2534] text-sm leading-tight">Ahmad Zakwaan</p>
                      <p className="text-[10px] text-[#E56668] font-black uppercase tracking-wider mt-0.5">Tohoku Univ, Japan</p>
                    </div>
                  </div>
                  <p className="text-[#2F4157] text-sm font-medium italic leading-relaxed">
                    "Studying in an international space robotics lab was a dream. English skills are the absolute key to unlocking global opportunity."
                  </p>
                </div>

              </div>

            </div>
          </div>
        </section>

        {/* =========================================
            5️⃣ HOW IT WORKS (SIMPLE 4 STEPS)
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
                Simple Process
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1A2534] tracking-tight">
                Four Steps to<br />
                <span className="text-[#E56668]">Global Success</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              
              {/* Desktop Connector Line */}
              <div className="hidden lg:block absolute top-[60px] left-[10%] right-[10%] h-[2px] bg-gray-200 z-0 border-t border-dashed border-gray-300"></div>

              {/* Step 1 */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10">
                <div className="w-14 h-14 bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-[#E56668]/20">
                  <span className="text-2xl font-black text-white">1</span>
                </div>
                <h3 className="font-bold text-xl text-[#1A2534] mb-3">Set Your Goal</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Define what you want: scholarship, remote job, or study abroad.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10">
                <div className="w-14 h-14 bg-[#1A2534] rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-[#1A2534]/20">
                  <span className="text-2xl font-black text-white">2</span>
                </div>
                <h3 className="font-bold text-xl text-[#1A2534] mb-3">Learn & Practice</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Join structured programs, daily practice, and expert mentorship.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10">
                <div className="w-14 h-14 bg-[#E56668] rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-[#E56668]/20">
                  <span className="text-2xl font-black text-white">3</span>
                </div>
                <h3 className="font-bold text-xl text-[#1A2534] mb-3">Track Progress</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Get tested, receive feedback, and see exactly where you stand.
                </p>
              </div>

              {/* Step 4 */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10">
                <div className="w-14 h-14 bg-[#1A2534] rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-[#1A2534]/20">
                  <span className="text-2xl font-black text-white">4</span>
                </div>
                <h3 className="font-bold text-xl text-[#1A2534] mb-3">Achieve & Inspire</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Reach your goal and inspire thousands with your success story.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            6️⃣ IELS LOUNGE CTA
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-12 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-[#1A2534] to-[#2F4157] rounded-[48px] p-10 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 overflow-hidden relative shadow-2xl">
              
              {/* Decorative Glow */}
              <div className="absolute right-[-10%] top-[-20%] w-[500px] h-[500px] bg-white/90 blur-[120px] rounded-full pointer-events-none"></div>

              <div className="relative z-10 text-center lg:text-left max-w-2xl">
                <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm mb-4 block">
                  Daily Practice
                </span>
                <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
                  Speak English<br />
                  <span className="text-[#E56668]">Every Night</span> at IELS Lounge
                </h2>
                <p className="text-white/80 text-lg mb-10 leading-relaxed">
                  Join 6,800+ members practicing English in real conversations. 
                  Build confidence, make friends, and improve naturally through daily speaking sessions.
                </p>
                <Button asChild className="bg-[#E56668] text-white font-bold hover:bg-[#c94f51] rounded-full px-10 py-3 text-lg group w-full sm:w-auto shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <Link href="/iels-lounge" className="flex items-center justify-center gap-3">
                    Join the Community
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                  </Link>
                </Button>
              </div>

        <div className="relative z-10 flex-shrink-0 group">
  <Image
    src="/images/contents/general/landing_page_3.png"
    alt="IELS Lounge"
    width={400}
    height={400}
    className="w-[280px] sm:w-[350px] lg:w-[400px] h-auto object-contain transition-transform duration-700 group-hover:scale-105"
    // Pake style inline buat drop-shadow putih yang bold (stroke effect)
    style={{ 
      filter: 'drop-shadow(0 0 2px #fff) drop-shadow(0 0 10px rgba(229, 102, 104, 0.5))' 
    }}
  />
  
  {/* Glow halus di belakang biar makin pop-out */}
  <div className="absolute inset-0 bg-[#E56668]/10 blur-[80px] rounded-full -z-10 opacity-50"></div>
</div>
            </div>
          </div>
        </section>

        {/* =========================================
            7️⃣ PRODUCTS QUICK LINKS
        ========================================= */}
        <section className="px-6 sm:px-12 lg:px-[100px] py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              
              {/* English Test */}
              <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-[#E56668]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#E56668] transition-colors duration-500">
                  <TrendingUp size={32} className="text-[#E56668] group-hover:text-white transition-colors duration-500" />
                </div>
                <h3 className="font-bold text-2xl text-[#1A2534] mb-4">IELS English Test</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Measure your real communication skills and get personalized recommendations for improvement.
                </p>
                <Link href="/test" className="inline-flex items-center gap-2 text-[#E56668] font-bold hover:gap-4 transition-all uppercase tracking-wide text-sm">
                  Take the Test <ArrowRight size={18} />
                </Link>
              </div>

              {/* Events */}
              <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-[#1A2534]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#1A2534] transition-colors duration-500">
                  <Star size={32} className="text-[#1A2534] group-hover:text-white transition-colors duration-500" />
                </div>
                <h3 className="font-bold text-2xl text-[#1A2534] mb-4">Global Events</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Join workshops, bootcamps, and speaking clubs guided by global mentors and industry experts.
                </p>
                <Link href="/events" className="inline-flex items-center gap-2 text-[#1A2534] font-bold hover:gap-4 transition-all uppercase tracking-wide text-sm">
                  See What's On <ArrowRight size={18} />
                </Link>
              </div>

              {/* Resources */}
              <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                <div className="w-16 h-16 bg-[#E56668]/10 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#E56668] transition-colors duration-500">
                  <GraduationCap size={32} className="text-[#E56668] group-hover:text-white transition-colors duration-500" />
                </div>
                <h3 className="font-bold text-2xl text-[#1A2534] mb-4">Free Resources</h3>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  Access a vast library of e-books, grammar guides, and study materials — completely free.
                </p>
                <Link href="/products/resources" className="inline-flex items-center gap-2 text-[#E56668] font-bold hover:gap-4 transition-all uppercase tracking-wide text-sm">
                  Access Library <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            8️⃣ FINAL CTA & FOOTER WAVE
        ========================================= */}
        <section className="w-full bg-white text-center pt-12 pb-16 px-6 sm:px-12 lg:px-[100px] overflow-hidden relative">
          <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-8 relative z-10">
            <div className="space-y-6">
              <h2 className="text-[40px] sm:text-[56px] lg:text-[72px] font-extrabold leading-[1.1] text-[#1A2534] tracking-tight">
                Ready to Go <span className="text-[#E56668]">Global?</span>
              </h2>
              <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Join thousands of ambitious Indonesian students building their path to scholarships, 
                remote careers, and international opportunities today.
              </p>
            </div>
            
            <Button asChild className="bg-[#E56668] text-white font-bold px-12 py-3 text-xl hover:bg-[#C04C4E] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-full group mt-4">
              <Link href="/welcome/start" className="flex items-center justify-center gap-3">
                Start Now!
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={24} />
              </Link>
            </Button>

            <p className="text-sm text-gray-400 font-medium uppercase tracking-widest mt-2">
              No credit card required • Join 6,800+ members
            </p>
          </div>

  
        </section>

      </main>

      <Footer />
      <GIFPopup />

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        
        /* Custom scrollbar hide for cleaner horizontal scrolls if needed */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}