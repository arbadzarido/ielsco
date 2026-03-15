"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Rocket, 
  Calendar, 
  Clock, 
  Target, 
  Video,
  PlayCircle,
  AlertCircle,
  Mic,
  ArrowRight,
  Linkedin
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GIFInsightTalksPage() {
  // --- DYNAMIC BUTTON LOGIC ---
  const [isTalk1Past, setIsTalk1Past] = useState(false);
  const [isTalk2Past, setIsTalk2Past] = useState(false);

  useEffect(() => {
    // Waktu selesai acara (WIB / GMT+7)
    const TALK_1_END_TIME = new Date("2026-03-07T15:00:00+07:00");
    const TALK_2_END_TIME = new Date("2026-03-14T15:00:00+07:00");
    const now = new Date();

    setIsTalk1Past(now > TALK_1_END_TIME);
    setIsTalk2Past(now > TALK_2_END_TIME);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-[#304156]">
      
      {/* ================= HERO SECTION ================= */}
      <div className="bg-[#304156] text-[#FFFFFF] pt-24 pb-32 relative overflow-hidden">
        
        {/* Background Image & Overlays */}
        <div className="absolute inset-0 bg-[url('/images/contents/stories/member-stories/banner/singapore-banner.png')] bg-cover bg-center opacity-30 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2F4055]/95 via-[#914D4D]/80 to-[#304156]/95" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#914D4D] opacity-20 blur-[80px] rounded-full -translate-x-1/3 translate-y-1/3" />
        
        <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
          
          <div className="flex items-center justify-center mb-6">
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
            Insight Talks
          </h1>
          <p className="mt-2 max-w-3xl mx-auto text-lg text-white/90 leading-relaxed font-light">
            Still having doubts about the fellowship? Unsure how to build a winning project? 
            Before you fly to Singapore, you need a solid foundation. 
            Join our exclusive sessions to align your mindset and strategy.
          </p>
        </div>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className="max-w-5xl mx-auto px-6 -mt-16 relative z-20 pb-24 space-y-10">

        {/* --- WHY ATTEND (The Purpose) --- */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 border border-gray-100 shadow-lg flex flex-col md:flex-row items-center gap-8">
          <div className="md:w-1/3">
            <h2 className="text-2xl font-bold text-[#304156] leading-tight">
              Why You Can't <br className="hidden md:block"/> Miss This.
            </h2>
            <p className="text-[#304156]/70 mt-3 text-sm">
              These sessions are designed to set serious candidates apart from the rest.
            </p>
          </div>
          <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <Target className="w-6 h-6 text-[#914D4D] mb-2" />
              <h4 className="font-bold text-[#304156] text-sm mb-1">Clear the Doubts</h4>
              <p className="text-xs text-gray-500">Understand exactly what the evaluators want and how the selection funnel works.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <Rocket className="w-6 h-6 text-[#914D4D] mb-2" />
              <h4 className="font-bold text-[#304156] text-sm mb-1">Project Readiness</h4>
              <p className="text-xs text-gray-500">Learn practical frameworks to design an SDG 4 project that actually makes sense.</p>
            </div>
          </div>
        </div>

        {/* --- TALK 1: BEYOND TRAVEL --- */}
        <div className="bg-[#FFFFFF] rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-xl overflow-hidden relative">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            
            {/* POSTER 3:4 (Left) */}
            <div className="md:col-span-5 relative group">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 relative shadow-md">
                <Image 
                  src="/images/contents/events/giftalk1.png" 
                  alt="Insight Talk 1 Poster" 
                  fill 
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[#304156]/10 group-hover:bg-transparent transition-colors"></div>
              </div>
            </div>

            {/* DETAILS (Right) */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-[#914D4D]/10 text-[#914D4D] px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 border border-[#914D4D]/20">
                  <Video className="w-3 h-3" /> Online Zoom
                </span>
                <span className="text-gray-500 text-sm font-semibold flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Mar 7, 2026
                </span>
                <span className="text-gray-500 text-sm font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 13:00 - 15:00 WIB
                </span>
              </div>

              <h3 className="text-3xl font-extrabold text-[#304156] mb-3 leading-tight">
                Insight Talk 1: <br />
                Understanding GIF & Global Readiness
              </h3>
              
              <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                Exchange is not about tourism; it’s about taking responsibility. Join this interactive session to dissect the Global Impact Fellowship structure, clarify the selection funnel, and shift your mindset to prepare for international exposure. Check the poster for the detailed topics we will explore!
              </p>

              {/* Highlight Speakers (No Photos) */}
              <div className="mb-8">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3">Featured Speakers</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Speaker 1 */}
                  <div className="bg-gray-50 border-l-4 border-[#914D4D] p-4 rounded-r-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-[#304156] text-sm md:text-base">Arbadza Rido Adzariyat</p>
                      <Link href="https://linkedin.com/in/arbadzarido" target="_blank">
                        <Linkedin className="w-4 h-4 text-[#0077b5] hover:opacity-80 transition-opacity" />
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Founder & Operations Principal of IELS
                    </p>
                  </div>
                  {/* Speaker 2 */}
                  <div className="bg-gray-50 border-l-4 border-[#304156] p-4 rounded-r-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-[#304156] text-sm md:text-base">Fadhila Qurotul Aini</p>
                      <Link href="https://linkedin.com/in/fadhilaqa" target="_blank">
                        <Linkedin className="w-4 h-4 text-[#0077b5] hover:opacity-80 transition-opacity" />
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Co-Founder & Growth Principal of IELS
                    </p>
                  </div>
                </div>
              </div>

              {/* DYNAMIC BUTTON LOGIC FOR TALK 1 */}
              <div className="pt-2">
                {isTalk1Past ? (
                  <Button asChild className="gap-2 font-bold text-[#304156] py-3 px-6 h-auto border border-gray-300 bg-white w-full sm:w-auto hover:bg-gray-50 shadow-sm rounded-full">
                    <Link href="https://drive.google.com/file/d/1Cny3ztVHtm0WFozjbg8A4NWFzlW1pkZW/view?usp=sharing" target="_blank">
                      <PlayCircle className="w-5 h-5" /> Watch Recording
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="gap-2 bg-[#914D4D] hover:bg-[#7a3e3e] py-3 px-6 h-auto text-white font-bold shadow-[0_8px_20px_rgba(145,77,77,0.25)] w-full sm:w-auto transition-all hover:-translate-y-1 rounded-full">
                    <Link href="https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=NThkaWVsZXZ2aXJ2MmxsdTc5aGpnNTNoamcgaWVscy5jb21tdW5pdHlAbQ&tmsrc=iels.community%40gmail.com" target="_blank">
                      <AlertCircle className="w-5 h-5" /> Set Reminder
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- TALK 2: LOCAL TO GLOBAL --- */}
        <div className="bg-[#FFFFFF] rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-xl overflow-hidden relative">
          <div className="grid md:grid-cols-12 gap-8 items-center">
            
            {/* POSTER 3:4 (Left) */}
            <div className="md:col-span-5 relative group">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 relative shadow-md">
                <Image 
                  src="/images/contents/events/giftalk2.png" 
                  alt="Insight Talk 2 Poster" 
                  fill 
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[#304156]/10 group-hover:bg-transparent transition-colors"></div>
              </div>
            </div>

            {/* DETAILS (Right) */}
            <div className="md:col-span-7 flex flex-col justify-center">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-[#914D4D]/10 text-[#914D4D] px-3 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 border border-[#914D4D]/20">
                  <Video className="w-3 h-3" /> Online Zoom
                </span>
                <span className="text-gray-500 text-sm font-semibold flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Mar 14, 2026
                </span>
                <span className="text-gray-500 text-sm font-semibold flex items-center gap-1">
                  <Clock className="w-4 h-4" /> 13:00 - 15:00 WIB
                </span>
              </div>

              <h3 className="text-3xl font-extrabold text-[#304156] mb-3 leading-tight">
                Insight Talk 2: <br />
                Build a Project That Solves a Real Problem
              </h3>
              
              <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                An exclusive collaborative workshop with AIESEC. Learn how to transform broad education gaps into structured, feasible, and scalable project ideas aligned with SDG 4 and international volunteership values.
              </p>

              {/* Highlight Speakers (No Photos) */}
              <div className="mb-8">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3">Featured Speakers</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Speaker 1 */}
                  <div className="bg-gray-50 border-l-4 border-[#914D4D] p-4 rounded-r-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-[#304156] text-sm md:text-base">Syifa Hana Nabila</p>
                      <Link href="https://linkedin.com/in/syifahana" target="_blank">
                        <Linkedin className="w-4 h-4 text-[#0077b5] hover:opacity-80 transition-opacity" />
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                      Talent Principal of IELS
                    </p>
                  </div>
                  {/* Speaker 2 (AIESEC) */}
                  <div className="bg-[#037Ef3]/5 border-l-4 border-[#037Ef3] p-4 rounded-r-xl hover:bg-[#037Ef3]/10 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-[#304156] text-sm md:text-base">Garcia Aprilia Noya</p>
                      <Link href="https://linkedin.com/in/garcia-aprilia-noya-241288213" target="_blank">
                        <Linkedin className="w-4 h-4 text-[#0077b5] hover:opacity-80 transition-opacity" />
                      </Link>
                    </div>
                    <p className="text-xs text-[#304156]/70 font-medium leading-relaxed">
                      Chief Product Officer of Incoming Volunteer at AIESEC in Surabaya
                    </p>
                  </div>
                </div>
              </div>

              {/* DYNAMIC BUTTON LOGIC FOR TALK 2 */}
              <div className="pt-2">
                {isTalk2Past ? (
                  <Button asChild className="gap-2 font-bold text-[#304156] py-3 px-6 h-auto border border-gray-300 bg-white w-full sm:w-auto hover:bg-gray-50 shadow-sm rounded-full">
                    <Link href="https://drive.google.com/file/d/1ivb871hSRk_9ZqnAzoPrYZOJ4Z-hscty/view?usp=sharing" target="_blank">
                      <PlayCircle className="w-5 h-5" /> Watch Recording
                    </Link>
                  </Button>
                ) : (
                  <Button asChild className="gap-2 bg-[#914D4D] hover:bg-[#7a3e3e] py-3 px-6 h-auto text-white font-bold shadow-[0_8px_20px_rgba(145,77,77,0.25)] w-full sm:w-auto transition-all hover:-translate-y-1 rounded-full">
                    <Link href="https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=NGVhcnJmN212bHYyc2VnNDBhb2dta2FtM2ggaWVscy5jb21tdW5pdHlAbQ&tmsrc=iels.community%40gmail.com" target="_blank">
                      <AlertCircle className="w-5 h-5" /> Set Reminder
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- CTA BOTTOM --- */}
        <div className="bg-gradient-to-r from-[#2F4055] via-[#914D4D] to-[#304156] rounded-3xl p-8 md:p-12 text-[#FFFFFF] text-center relative overflow-hidden shadow-xl mt-12">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-overlay pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Join our WhatsApp Group Community!</h2>
            <p className="text-white/80 leading-relaxed text-lg mb-8">
              No need to hustle filling out long registration forms. Just create an account, open the dashboard, and join our official WhatsApp group to get all the access links directly.
            </p>

            <Button asChild className="bg-[#FFFFFF] text-[#914D4D] hover:bg-gray-100 font-bold py-3 px-10 rounded-full text-lg shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-transform hover:-translate-y-1 w-full sm:w-auto">
              <Link href="/dashboard/gif" className="flex items-center justify-center gap-2">
                Enter Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}