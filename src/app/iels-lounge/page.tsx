"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { useState, useEffect } from "react";
import { testimonialsData } from "@/data/testimonials";
import type { Testimonial } from "@/data/testimonials";
import { Button } from "@/components/ui/button";
import GIFPopup from "@/components/GIFPopup";
import PricingModal from "@/components/subscription/PricingModal";
import { ArrowRight, Target, Users, Trophy, Gift, Star, Compass, Megaphone, PlayCircle } from "lucide-react";

export default function LoungePage() {
  // Enhanced Carousel Data
  const carouselData = [
    { 
      src: "/images/contents/careers/iels_team_2.png", 
      title: "Nightly Speaking Club", 
      desc: "Casual, fun, and fear-free English practice every night." 
    },
    { 
      src: "/images/contents/careers/iels_team_0.png", 
      title: "Global Networking", 
      desc: "Connect with ambitious peers and global mentors." 
    },
    { 
      src: "/images/contents/careers/iels_team_3.png", 
      title: "Community Bonding", 
      desc: "Grow together, celebrate wins, and build lifelong friendships." 
    },
  ];
  const [currentImage, setCurrentImage] = useState(0);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const nextSlide = () => {
    setCurrentImage((prev) => (prev === carouselData.length - 1 ? 0 : prev + 1));
  };
  const prevSlide = () => {
    setCurrentImage((prev) => (prev === 0 ? carouselData.length - 1 : prev - 1));
  };

  // Auto-slide effect for carousel
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentImage]);

  return (
    <div className="bg-white min-h-screen font-sans selection:bg-[#E56668] selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex flex-col w-full">
        
    {/* ===== HERO ===== */}
        <section className="px-6 pt-32 pb-16 max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#E56668]/10 text-[#E56668] font-bold text-xs tracking-wide mb-6">
              6,800+ Active Members
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold mb-6 leading-tight text-[#1A2534]">
              Speaking English <br />
              <span className="text-[#E56668]">Every Night.</span>
            </h1>
            
            <p className="text-gray-700 text-lg mb-8 leading-relaxed max-w-lg mx-auto lg:mx-0">
              IELS Lounge is more than just a speaking club. It's a complete ecosystem where we help you build daily English habits, map out your global goals, and grow together.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
              <Button 
                onClick={() => setShowPricingModal(true)}
                className="bg-[#E56668] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#C04C4E] hover:-translate-y-1 hover:shadow-lg transition-all"
              >
                Join IELS Lounge →
              </Button>
            </div>
            <p className="mt-4 text-xs text-gray-500">Secure payment first • Account created after payment</p>
          </div>

          {/* Right Image */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <Image
              src="/images/contents/general/iels_lounge.png"
              alt="IELS Lounge Speaking Club"
              width={500}
              height={400}
              priority
              className="rounded-3xl shadow-2xl object-cover hover:-translate-y-2 transition-transform duration-500"
            />
          </div>
        </section>
        {/* =========================================
            2️⃣ THE MEMBER JOURNEY (HOW WE HELP YOU)
        ========================================= */}
        <section className="py-14 px-6 sm:px-12 lg:px-[100px] border-y border-gray-100">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-20">
              <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
                From IELS, For You
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-[#1A2534] tracking-tight max-w-3xl mx-auto leading-tight">
                We Walk With You. <br />From <span className="text-[#E56668]">Day One</span> to <span className="text-[#E56668]">Your Big Win.</span>
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                We don't just throw you into a zoom room and leave you alone. Here is exactly how we guide you step-by-step until you reach your global dream.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
              {/* Connector Line (Desktop) */}
              <div className="hidden lg:block absolute top-[80px] left-[10%] right-[10%] h-[2px] bg-gray-200 z-0 border-t-2 border-dashed border-[#E56668]/30"></div>

              {/* Step 1: Goal Setting */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 bg-white border-4 border-[#F7F8FA] shadow-lg rounded-full flex items-center justify-center mb-6 mx-auto relative group-hover:scale-110 transition-transform">
                  <Compass size={28} className="text-[#1A2534]" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#E56668] rounded-full text-white text-xs font-bold flex items-center justify-center">1</div>
                </div>
                <h3 className="text-xl font-bold text-[#1A2534] mb-3 text-center">We Set Your Goals</h3>
                <p className="text-gray-600 leading-relaxed text-sm text-center">
                  First, we sit down with you. What's your dream? A scholarship in the UK? A remote job in Singapore? We help you map out a clear, actionable roadmap to get there.
                </p>
              </div>

              {/* Step 2: Practice */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 bg-white border-4 border-[#F7F8FA] shadow-lg rounded-full flex items-center justify-center mb-6 mx-auto relative group-hover:scale-110 transition-transform">
                  <Users size={28} className="text-[#1A2534]" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#E56668] rounded-full text-white text-xs font-bold flex items-center justify-center">2</div>
                </div>
                <h3 className="text-xl font-bold text-[#1A2534] mb-3 text-center">We Practice Together</h3>
                <p className="text-gray-600 leading-relaxed text-sm text-center">
                  Then, the work begins. Join our nightly speaking clubs and weekly TalkRooms. We provide a safe space for you to make mistakes, build confidence, and connect.
                </p>
              </div>

              {/* Step 3: Track & Achieve */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 bg-white border-4 border-[#F7F8FA] shadow-lg rounded-full flex items-center justify-center mb-6 mx-auto relative group-hover:scale-110 transition-transform">
                  <Target size={28} className="text-[#1A2534]" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#E56668] rounded-full text-white text-xs font-bold flex items-center justify-center">3</div>
                </div>
                <h3 className="text-xl font-bold text-[#1A2534] mb-3 text-center">You Achieve It</h3>
                <p className="text-gray-600 leading-relaxed text-sm text-center">
                  Through consistent tracking and mentorship, you execute your roadmap. You pass that interview. You win that scholarship. You finally reach your destination.
                </p>
              </div>

              {/* Step 4: Celebrate & Empower */}
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 bg-white border-4 border-[#F7F8FA] shadow-lg rounded-full flex items-center justify-center mb-6 mx-auto relative group-hover:scale-110 transition-transform">
                  <Megaphone size={28} className="text-[#1A2534]" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#E56668] rounded-full text-white text-xs font-bold flex items-center justify-center">4</div>
                </div>
                <h3 className="text-xl font-bold text-[#1A2534] mb-3 text-center">We Celebrate You</h3>
                <p className="text-gray-600 leading-relaxed text-sm text-center">
                  We write your success story on our platform. We celebrate your win together. And most importantly, we empower you to inspire the next generation of our community.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            3️⃣ WHY IELS SPECIAL (FEATURES)
        ========================================= */}
        <section className="py-14 px-6 max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#1A2534] pb-10 tracking-tight max-w-3xl mx-auto leading-tight">
            Why Learners Love IELS Lounge
          </h2>

          <div className="flex flex-col gap-16">
            {[
              {
                emoji: "💬",
                title: "Daily Speaking Habit",
                desc: "Turn English into your daily rhythm with quick, fun practice sessions that help you build confidence naturally.",
              },
              {
                emoji: "🤝",
                title: "Community & Mentorship",
                desc: "Connect with mentors and peers who encourage growth through collaboration and constant support.",
              },
              {
                emoji: "🌍",
                title: "Global Connections",
                desc: "Join learners from different universities and cities, share stories, and expand your global mindset together.",
              },
              {
                emoji: "🎟",
                title: "IELS Member ID",
                desc: "Get access to exclusive resources, faster event registration, and member-only perks.",
                link: "https://docs.google.com/document/d/IELS_MEMBER_ID_GUIDE/view",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-14 ${
                  i % 2 === 1 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Emoji Section */}
                <div className="flex-shrink-0 text-[70px] md:text-[90px] flex justify-center md:justify-center bg-gray-50 w-32 h-32 md:w-40 md:h-40 rounded-full items-center shadow-inner">
                  <span className="block leading-none">{item.emoji}</span>
                </div>

                {/* Text Section */}
                <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-lg">
                  <h3 className="text-2xl md:text-3xl font-bold mb-3 text-[#1A2534]">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed text-lg">{item.desc}</p>
               
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================
            4️⃣ WEEKLY ROUTINE
        ========================================= */}
        <section className="py-14 px-6 border-y border-gray-100">
          <div className="max-w-6xl mx-auto">

            {/* HEADER */}
            <div className="text-center mb-16">
              <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm block mb-4">
                Consistency is Key
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-[#1A2534] mb-6">
                Your Weekly English Routine
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                Tiny routines, big impact. This is how consistency is built — one small habit at a time, guided by our community.
              </p>
            </div>

            {/* GRID */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { day: "Monday", title: "Word of the Day", desc: "Build vocabulary daily with practical words you'll actually use." },
                { day: "Tuesday", title: "Idiom Practice", desc: "Learn storytelling idioms and sound more natural in conversations." },
                { day: "Wednesday", title: "Listen & Engage", desc: "Short audio or video tasks to train your listening instincts." },
                { day: "Thursday", title: "Grammar Poll & Tip", desc: "Quick grammar check-ins without the boring lectures." },
                { day: "Friday", title: "Weekly Recap Quiz", desc: "Fun review to lock in what you learned this week." },
                { day: "Saturday", title: "Reflection & Journaling", desc: "Slow down, reflect, and track how far you've grown." },
              ].map((item, i) => (
                <div
                  key={i}
                  className="relative rounded-[32px] bg-white p-8 transition-all duration-300 border border-gray-100 hover:border-[#E56668]/30 hover:-translate-y-2 hover:shadow-xl group"
                >
                  {/* RED ACCENT BAR */}
                  <div className="absolute left-0 top-8 bottom-8 w-1.5 rounded-r-full bg-[#E56668]/20 group-hover:bg-[#E56668] transition-colors" />

                  <div className="pl-6 flex flex-col gap-3">
                    <p className="text-xs font-bold text-[#E56668] uppercase tracking-widest">
                      {item.day}
                    </p>
                    <h3 className="text-xl font-bold text-[#1A2534]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* FOOTNOTE */}
            <p className="mt-16 text-center text-[#1A2534] font-medium text-lg max-w-xl mx-auto bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              Just <b className="text-[#E56668]">10–15 minutes a day</b> is enough to build momentum. Consistency beats intensity — every single time.
            </p>
          </div>
        </section>

        {/* =========================================
            5️⃣ INSIDE THE LOUNGE (ENHANCED CAROUSEL)
        ========================================= */}
        <section className="py-14 px-6 sm:px-12 lg:px-[100px] max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            
            {/* Left: Text */}
            <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left">
              <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm">
                A Peek Inside
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-[#1A2534] mb-4 leading-tight">
                Real Connections.<br />Real Growth.
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Swipe through to see what happens when hundreds of ambitious students gather every night to speak, learn, and collaborate.
              </p>
              
              {/* Highlight Badge */}
              <div className="inline-flex items-center gap-3 bg-[#F7F8FA] border border-gray-200 p-4 rounded-2xl w-full sm:w-auto mt-4 shadow-sm">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <PlayCircle size={20} className="text-green-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#1A2534]">Interactive Sessions</p>
                  <p className="text-xs text-gray-500">100% active participation</p>
                </div>
              </div>
            </div>

            {/* Right: Enhanced Carousel */}
            <div className="w-full lg:w-1/2 relative">
              {/* Decorative background element */}
              <div className="absolute -inset-4 bg-gradient-to-br from-[#E56668]/10 to-[#1A2534]/5 rounded-[48px] -z-10 blur-xl"></div>
              
              <div className="relative w-full aspect-[4/3] rounded-[40px] overflow-hidden shadow-2xl border-4 border-white group bg-[#1A2534]">
          {carouselData.map((slide, index) => (
                  <div 
                    key={index} 
                    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                      currentImage === index ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"
                    }`}
                  >
                    <Image
                      src={slide.src}
                      alt={slide.title}
                      fill
                      className={`object-cover ${
                        slide.src === "/images/contents/careers/iels_team_0.png" 
                          ? "grayscale group-hover:grayscale-0 transition-all duration-700" 
                          : ""
                      }`}
                    />
                    {/* Dark Gradient Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A2534]/90 via-[#1A2534]/30 to-transparent"></div>
                    
                    {/* Text Content Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10 transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0 z-20">
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">{slide.title}</h3>
                      <p className="text-white/80 text-sm sm:text-base">{slide.desc}</p>
                    </div>
                  </div>
                ))}

                {/* Navigation Controls */}
                <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-white hover:text-[#1A2534] text-white transition-all opacity-0 group-hover:opacity-100 z-20">
                  <span className="text-2xl font-bold">‹</span>
                </button>
                <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:bg-white hover:text-[#1A2534] text-white transition-all opacity-0 group-hover:opacity-100 z-20">
                  <span className="text-2xl font-bold">›</span>
                </button>

                {/* Dots Indicator */}
                <div className="absolute top-6 right-8 flex gap-2 z-20">
                  {carouselData.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImage(index)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${currentImage === index ? "w-6 bg-[#E56668]" : "w-2 bg-white/50 hover:bg-white"}`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

   {/* =========================================
            6️⃣ GIF COLLABORATION PROMO SECTION
        ========================================= */}
        <section className="py-16 px-6 sm:px-12 lg:px-[100px] bg-white">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#2F4055] via-[#914D4D] to-[#304156] rounded-[48px] p-10 lg:p-14 text-white relative overflow-hidden shadow-2xl group">
            
            {/* Promo Decor - Aligned with IELS palette */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#914D4D] rounded-full blur-[100px] opacity-30 pointer-events-none group-hover:opacity-50 transition-opacity duration-700"></div>
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#304156] rounded-full blur-[80px] opacity-40 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white font-bold text-xs uppercase tracking-widest mb-6 backdrop-blur-md">
                  <Gift size={16} className="text-[#FFD1D1]" /> 
                  GIF 2026 Collaboration
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight tracking-tight">
                  Unlock Your <br className="hidden lg:block" /> GIF Access Today.
                </h2>
                <p className="text-white/80 text-lg mb-0 max-w-md mx-auto md:mx-0 font-light leading-relaxed">
                  Complete your Global Impact Fellowship requirement. Get 3 months full access to IELS Lounge, English proficiency tests, and exclusive learning resources.
                </p>
              </div>
              
              <div className="shrink-0 flex flex-col items-center bg-white/10 p-8 rounded-[40px] border border-white/20 backdrop-blur-xl min-w-[300px] shadow-2xl transform transition-transform group-hover:scale-[1.02]">
                <p className="text-[#FFD1D1] font-black uppercase tracking-widest text-[10px] mb-3">Special GIF Entry Price</p>
                <div className="flex items-end gap-2 mb-5">
                  <span className="text-lg font-bold text-white/40 mb-2 line-through">Rp75k</span>
                  <span className="text-5xl font-black text-white">Rp50k</span>
                  <span className="text-xs font-bold text-[#FFD1D1] mb-2 uppercase ml-1">/ 3mo</span>
                </div>

                {/* PROMO CODE BOX */}
                <div className="bg-white/20 border border-white/30 rounded-xl px-4 py-3 mb-6 w-full text-center backdrop-blur-sm border-dashed">
                  <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold mb-1">Use Promo Code</p>
                  <p className="font-mono text-2xl font-black text-white tracking-widest">GIFSG</p>
                </div>
                
                <div className="w-full space-y-4">
                  <Button asChild className="w-full bg-white text-[#304156] font-extrabold py-3 text-lg hover:bg-gray-100 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3">
                    <Link href="https://ielsco.myr.id/m/iels-lounge-premium" target="_blank">
                      Claim Offer Now <ArrowRight size={20} />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            7️⃣ TESTIMONIALS (CLEAN DESIGN)
        ========================================= */}
        <section id="testimonials" className="py-14 border-t border-gray-100 overflow-hidden">
          <div className="text-center mb-16 px-6">
            <span className="text-[#E56668] font-bold tracking-widest uppercase text-sm block mb-4">
              Community Voices
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#2F4157] mb-4">
              Proven by Our Members
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Read real stories from the IELS community who have successfully built their confidence, achieved their goals, and inspired others.
            </p>
          </div>

          <div className="relative max-w-[1400px] mx-auto">
            {/* GRADIENT FADE */}
            <div className="pointer-events-none absolute left-0 top-0 h-full w-12 md:w-32 bg-gradient-to-r from-[#F7F8FA] to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 md:w-32 bg-gradient-to-l from-[#F7F8FA] to-transparent z-10" />

            {/* SCROLL AREA */}
            <div className="overflow-x-auto scrollbar-hide px-6 md:px-12 pb-10">
              <div className="flex gap-6 w-max py-6 mx-auto snap-x snap-mandatory">
                {testimonialsData.map((t, i) => {
                  const isActive = i === 0;

                  return (
                    <div
                      key={t.id}
                      className={`
                        snap-center relative min-w-[320px] max-w-[360px]
                        rounded-[32px] bg-white p-8 flex flex-col
                        transition-all duration-300
                        ${isActive ? "border-2 border-[#E56668] shadow-xl" : "border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1"}
                      `}
                    >
                      {isActive && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <div className="rounded-full bg-[#E56668] px-4 py-1.5 text-xs font-bold text-white shadow-md flex items-center gap-1.5 whitespace-nowrap">
                            <Star size={12} fill="currentColor" /> Featured Story
                          </div>
                        </div>
                      )}

                      <div className="mb-6 flex gap-1">
                        {[...Array(5)].map((_, idx) => (
                          <Star key={idx} size={16} className="text-yellow-400" fill="currentColor" />
                        ))}
                      </div>

                      <p
                        className="text-sm text-gray-700 leading-relaxed mb-8 flex-grow italic"
                        dangerouslySetInnerHTML={{ __html: t.content }}
                      />

                      <div className="flex items-center gap-4 mt-auto border-t border-gray-100 pt-6">
                        <Image
                          src={t.author.avatar}
                          alt={t.author.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover bg-gray-100"
                        />
                        <div>
                          <p className="font-bold text-[#1A2534] text-sm leading-tight">
                            {t.author.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 font-medium">
                            {t.author.university}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================
            8️⃣ FINAL CTA & FOOTER WAVE
        ========================================= */}
        <section className="w-full bg-white text-center pt-14 pb-14 px-6 sm:px-12 lg:px-[100px] overflow-hidden relative">
          <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-8 relative z-10">
            <div className="space-y-6">
              <h2 className="text-[36px] sm:text-[48px] lg:text-[56px] font-extrabold leading-[1.1] text-[#1A2534] tracking-tight">
                English isn't something you memorize. <br/>
                <span className="text-[#E56668]">It's something you live.</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
                Take the first step. Choose your plan, complete payment, and join a community that actually walks the journey with you.
              </p>
            </div>
            
            <Button 
              onClick={() => setShowPricingModal(true)}
              className="bg-[#E56668] text-white font-bold px-10 py-3 h-auto text-lg hover:bg-[#C04C4E] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 rounded-full group mt-4"
            >
              <span className="flex items-center justify-center gap-3">
                Join IELS Lounge Now
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </span>
            </Button>

            <p className="text-sm text-gray-400 font-medium mt-2">
              Questions? Email <a href="mailto:community@ielsco.com" className="text-[#E56668] hover:underline">community@ielsco.com</a> or WhatsApp <a href="https://wa.me/6288297253491" className="text-[#E56668] hover:underline">+62 882-9725-3491</a>
            </p>
          </div>

        </section>

      </main>

      <Footer />
      <GIFPopup />

      {/* Pricing Modal */}
      {showPricingModal && (
        <PricingModal 
          onClose={() => setShowPricingModal(false)} 
          isPreAuth={true}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        
        /* Custom scrollbar hide for horizontal scrolls */
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