"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2,
  MapPin, 
  Calendar, 
  Clock, 
  GraduationCap, 
  Briefcase, 
  Compass, 
  Sparkles,
  PlaneTakeoff,
  Award,
  Lightbulb,
  Microscope,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ItineraryPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-[#304156] pb-24">
      
      {/* ================= HERO SECTION ================= */}
      <div className="bg-gradient-to-br from-[#2F4055] via-[#914D4D] to-[#304156] text-[#FFFFFF] pt-24 pb-32 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            The Incubation <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD1D1] to-[#FFFFFF]">Masterclass.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed font-light">
            Why fly 900 kilometers to Singapore? Because systemic problems require global benchmarks. Join Asia's top intellectual powerhouse at NUS to engineer data-driven solutions for Indonesia.
          </p>
        </div>
      </div>

      {/* ================= NARRATIVE INTRODUCTION ================= */}
      <div className="max-w-4xl mx-auto px-6 -mt-12 md:-mt-16 relative z-20 mb-16 md:mb-20 text-center">
        <div className="bg-[#FFFFFF] rounded-3xl p-8 md:p-12 shadow-2xl border border-gray-100">
          <Sparkles className="w-10 h-10 text-[#914D4D] mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#304156] mb-4 tracking-tight">Not a Study Tour. A Policy Laboratory.</h2>
          <p className="text-[#304156]/70 leading-relaxed text-lg font-medium">
            This is a rigorous, structured incubation boot camp. You arrive with a raw idea; you leave with a validated, execution-ready blueprint built alongside NUS Faculty and founders.
          </p>
        </div>
      </div>

      {/* ================= THE ITINERARY (TIMELINE) ================= */}
      <div className="max-w-6xl mx-auto px-6 space-y-16 md:space-y-20">

        {/* --- DAY 1: ARRIVAL --- */}
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
          <div className="lg:w-5/12 flex flex-col justify-center h-full">
            <div className="text-[#914D4D] font-bold tracking-widest uppercase text-xs mb-3">Day 1 • Tuesday, July 7</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#304156] mb-5 tracking-tight leading-tight">Arrival &<br/>Onboarding</h2>
            <p className="text-[#304156]/70 leading-relaxed mb-8 text-lg">
              Touch down in the Lion City. We begin with cultural immersion at Jewel Changi, followed by dormitory check-in at the National University of Singapore.
            </p>
            
            <div className="space-y-6 text-sm font-medium">
              <div className="flex items-start gap-4">
                <div className="bg-[#914D4D]/10 p-2 rounded-full shrink-0 mt-1"><Clock className="w-5 h-5 text-[#914D4D]" /></div>
                <div className="text-[#304156]">
                  <strong className="text-[#914D4D] block mb-1">11:55 - 14:45 | Flight CGK to SIN</strong>
                  <span className="text-gray-500">Pre-departure preparation at 08:30. Flight to Singapore.</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#914D4D]/10 p-2 rounded-full shrink-0 mt-1"><MapPin className="w-5 h-5 text-[#914D4D]" /></div>
                <div className="text-[#304156]">
                  <strong className="text-[#914D4D] block mb-1">15:00 - 18:30 | Airport to Campus</strong>
                  <span className="text-gray-500">Explore Changi Airport, then commute to NUS via MRT & Bus.</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#914D4D]/10 p-2 rounded-full shrink-0 mt-1"><CheckCircle2 className="w-5 h-5 text-[#914D4D]" /></div>
                <div className="text-[#304156]">
                  <strong className="text-[#914D4D] block mb-1">18:30 - 21:30 | Check-in & Dinner</strong>
                  <span className="text-gray-500">Settle into NUS Dorm. First dinner and networking with the IELS team.</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:w-7/12 grid grid-cols-2 gap-4 md:gap-6 relative h-full items-center">
            <div className="rounded-[2.5rem] overflow-hidden shadow-2xl aspect-square relative z-10 border-4 border-white transform -translate-y-6">
              <img src="https://images.unsplash.com/photo-1565967511849-76a60a516170?q=80&w=1000&auto=format&fit=crop" alt="Jewel Changi" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 hover:scale-110" />
            </div>
            <div className="rounded-[2.5rem] overflow-hidden shadow-xl aspect-square border-4 border-white transform translate-y-6">
              <img src="https://images.unsplash.com/photo-1543884877-c918ee08e6ff?q=80&w=1000&auto=format&fit=crop" alt="NUS Campus" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 hover:scale-110" />
            </div>
          </div>
        </div>

        {/* --- DAY 2: DISCOVERY (NUS LECTURE & STUDENT) --- */}
        <div className="flex flex-col xl:flex-row items-stretch gap-10 bg-[#FFFFFF] p-8 md:p-12 rounded-[3rem] shadow-lg border border-gray-100">
          <div className="xl:w-1/2 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 bg-[#304156]/10 text-[#304156] px-3 py-1 rounded-full text-xs font-bold mb-4 w-max"><Lightbulb className="w-4 h-4" /> Academic Core: Day 1</div>
            <div className="text-[#914D4D] font-bold tracking-widest uppercase text-sm mb-2">Day 2 • Wednesday, July 8</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#304156] mb-4">The Discovery Phase</h2>
            <p className="text-[#304156]/80 leading-relaxed mb-6">
              <strong>Mastering Step 1 & 2 (Empathize & Design).</strong> How did Singapore transform its education system in just one generation? We dissect Singapore's policy frameworks and apply them to map the root causes of Indonesia's SDG 4 challenges.
            </p>
            <div className="space-y-4 text-sm mb-8">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="font-bold text-[#304156] mb-1">08:00 - Welcoming Ceremony</div>
                <div className="text-[#304156]/70">Official opening of the Global Impact Fellowship at NUS.</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 border-l-4 border-l-[#304156]">
                <div className="font-bold text-[#304156] mb-1">09:00 - Incubation 1: Systemic Empathy</div>
                <div className="text-[#304156]/70">Learning to identify root causes using macro-policy analysis.</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 border-l-4 border-l-[#914D4D]">
                <div className="font-bold text-[#304156] mb-1">14:00 - Incubation 2: Design Workshop</div>
                <div className="text-[#304156]/70">Translating national problems into localized, actionable project designs.</div>
              </div>
            </div>
          </div>
          
          <div className="xl:w-1/2 relative bg-[#304156] rounded-[2.5rem] p-6 pt-12 overflow-visible border-4 border-[#FFFFFF] shadow-2xl flex flex-col justify-end min-h-[400px]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] rounded-[2.5rem] opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex justify-center items-end h-64 gap-4 px-4">
              <div className="relative w-1/2 h-full flex items-end justify-center group">
                <img src="https://www.svgrepo.com/show/295333/businessman-man.svg" alt="NUS Faculty" className="h-[110%] w-auto object-contain object-bottom drop-shadow-2xl opacity-30 invert transition-all duration-300 group-hover:opacity-50 group-hover:scale-105" />
                <div className="absolute -bottom-4 -left-4 bg-[#2F4055] border-l-4 border-[#914D4D] p-3 shadow-xl z-20 w-[110%]">
                  <p className="text-[#FFFFFF] font-extrabold text-sm md:text-base leading-tight">Assoc. Prof. (TBA)</p>
                  <p className="text-[#FFFFFF]/70 text-[10px] md:text-xs font-medium">NUS Public Policy Faculty</p>
                </div>
              </div>
              <div className="relative w-1/2 h-full flex items-end justify-center group">
                <img src="https://www.svgrepo.com/show/295334/businesswoman-woman.svg" alt="NUS Student" className="h-[110%] w-auto object-contain object-bottom drop-shadow-2xl opacity-30 invert transition-all duration-300 group-hover:opacity-50 group-hover:scale-105" />
                <div className="absolute -bottom-4 -right-4 bg-[#914D4D] border-r-4 border-[#2F4055] p-3 shadow-xl z-20 w-[110%] text-right">
                  <p className="text-[#FFFFFF] font-extrabold text-sm md:text-base leading-tight">NUS Scholar (TBA)</p>
                  <p className="text-[#FFFFFF]/80 text-[10px] md:text-xs font-medium">Social Impact Lead, NUS</p>
                </div>
              </div>
            </div>

            <div className="relative z-30 bg-[#FFFFFF] text-[#304156] p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] mt-12 w-[95%] mx-auto transform -rotate-2 border-l-8 border-[#914D4D]">
               <p className="text-sm font-bold italic">
                 "Learn directly from policymakers and student leaders who turn complex data into grassroots solutions."
               </p>
            </div>
          </div>
        </div>

        {/* --- DAY 3: RESEARCH CORE (NUS LECTURE & STUDENT) --- */}
        <div className="flex flex-col xl:flex-row-reverse items-stretch gap-10 bg-[#FFFFFF] p-8 md:p-12 rounded-[3rem] shadow-lg border border-gray-100">
          <div className="xl:w-1/2 flex flex-col justify-center">
             <div className="inline-flex items-center gap-2 bg-[#304156]/10 text-[#304156] px-3 py-1 rounded-full text-xs font-bold mb-4 w-max"><Microscope className="w-4 h-4" /> Academic Core: Day 2</div>
            <div className="text-[#914D4D] font-bold tracking-widest uppercase text-sm mb-2">Day 3 • Thursday, July 9</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#304156] mb-4">The Research Core</h2>
            <p className="text-[#304156]/80 leading-relaxed mb-6">
              <strong>Mastering Step 3 (Ideate).</strong> Good intentions are useless without proof. We visit NUS Research Labs to master "Evidence-Based Impact." You will learn how to structure Pre-Test/Post-Test metrics.
            </p>
            <div className="space-y-4 text-sm mb-8">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 border-l-4 border-l-[#304156]">
                <div className="font-bold text-[#304156] mb-1">09:00 - Incubation 1: Data for Good</div>
                <div className="text-[#304156]/70">Translating field data into universally accepted academic metrics.</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 border-l-4 border-l-[#914D4D]">
                <div className="font-bold text-[#304156] mb-1">14:00 - Incubation 2: Lab Immersion</div>
                <div className="text-[#304156]/70">Witnessing how researchers process raw social data into policy recommendations.</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="font-bold text-[#304156] mb-1">19:15 - Dinner & Networking</div>
                <div className="text-[#304156]/70">Evening free time followed by dinner with the fellowship cohort.</div>
              </div>
            </div>
          </div>
          
          <div className="xl:w-1/2 relative bg-[#304156] rounded-[2.5rem] p-6 pt-12 overflow-visible border-4 border-[#FFFFFF] shadow-2xl flex flex-col justify-end min-h-[400px]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] rounded-[2.5rem] opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex justify-center items-end h-64 gap-4 px-4">
              <div className="relative w-1/2 h-full flex items-end justify-center group">
                <img src="https://www.svgrepo.com/show/295334/businesswoman-woman.svg" alt="NUS Researcher" className="h-[110%] w-auto object-contain object-bottom drop-shadow-2xl opacity-30 invert transition-all duration-300 group-hover:opacity-50 group-hover:scale-105" />
                <div className="absolute -bottom-4 -left-4 bg-[#914D4D] border-l-4 border-[#2F4055] p-3 shadow-xl z-20 w-[110%]">
                  <p className="text-[#FFFFFF] font-extrabold text-sm md:text-base leading-tight">Lead Researcher (TBA)</p>
                  <p className="text-[#FFFFFF]/80 text-[10px] md:text-xs font-medium">NUS Social Research Lab</p>
                </div>
              </div>
              <div className="relative w-1/2 h-full flex items-end justify-center group">
                <img src="https://www.svgrepo.com/show/295333/businessman-man.svg" alt="NUS Data Student" className="h-[110%] w-auto object-contain object-bottom drop-shadow-2xl opacity-30 invert transition-all duration-300 group-hover:opacity-50 group-hover:scale-105" />
                <div className="absolute -bottom-4 -right-4 bg-[#2F4055] border-r-4 border-[#914D4D] p-3 shadow-xl z-20 w-[110%] text-right">
                  <p className="text-[#FFFFFF] font-extrabold text-sm md:text-base leading-tight">Master Candidate (TBA)</p>
                  <p className="text-[#FFFFFF]/70 text-[10px] md:text-xs font-medium">Data Science, NUS</p>
                </div>
              </div>
            </div>

            <div className="relative z-30 bg-[#FFFFFF] text-[#304156] p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] mt-12 w-[95%] mx-auto transform rotate-1 border-r-8 border-[#304156]">
               <p className="text-sm font-bold italic text-right">
                 "Bridge the gap between idealistic goals and hardcore, measurable academic proof."
               </p>
            </div>
          </div>
        </div>

        {/* --- DAY 4: EXECUTION BLUEPRINT (NUS ENTERPRISE & FOUNDER) --- */}
        <div className="flex flex-col xl:flex-row items-stretch gap-10 bg-[#FFFFFF] p-8 md:p-12 rounded-[3rem] shadow-lg border border-gray-100">
          <div className="xl:w-1/2 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 bg-[#304156]/10 text-[#304156] px-3 py-1 rounded-full text-xs font-bold mb-4 w-max"><Rocket className="w-4 h-4" /> Academic Core: Day 3</div>
            <div className="text-[#914D4D] font-bold tracking-widest uppercase text-sm mb-2">Day 4 • Friday, July 10</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#304156] mb-4">Execution Blueprint</h2>
            <p className="text-[#304156]/80 leading-relaxed mb-6">
              <strong>Mastering Step 4 & 5 (Prototype & Test).</strong> Ideas are cheap; execution is everything. We visit <em>The Hangar</em> (NUS Enterprise) to learn how startups build MVPs. 
            </p>
            <div className="space-y-4 text-sm mb-8">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 border-l-4 border-l-[#304156]">
                <div className="font-bold text-[#304156] mb-1">09:00 - Incubation 1: The Blueprint</div>
                <div className="text-[#304156]/70">Frameworks for building a Minimum Viable Project (MVP) with zero initial capital.</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 border-l-4 border-l-[#914D4D]">
                <div className="font-bold text-[#304156] mb-1">14:00 - Incubation 2: Live Stress Test</div>
                <div className="text-[#304156]/70">Presenting your drafted project to mentors and surviving the technical Q&A.</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="font-bold text-[#304156] mb-1">19:15 - Dinner & Networking</div>
                <div className="text-[#304156]/70">Relax and celebrate the completion of the 3-day core academic phase.</div>
              </div>
            </div>
          </div>
          
          <div className="xl:w-1/2 relative bg-[#304156] rounded-[2.5rem] p-6 pt-12 overflow-visible border-4 border-[#FFFFFF] shadow-2xl flex flex-col justify-end min-h-[400px]">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:24px_24px] rounded-[2.5rem] opacity-50 pointer-events-none"></div>
            
            <div className="relative z-10 flex justify-center items-end h-64 gap-4 px-4">
              <div className="relative w-1/2 h-full flex items-end justify-center group">
                <img src="https://www.svgrepo.com/show/295333/businessman-man.svg" alt="NUS Enterprise" className="h-[110%] w-auto object-contain object-bottom drop-shadow-2xl opacity-30 invert transition-all duration-300 group-hover:opacity-50 group-hover:scale-105" />
                <div className="absolute -bottom-4 -left-4 bg-[#2F4055] border-l-4 border-[#914D4D] p-3 shadow-xl z-20 w-[110%]">
                  <p className="text-[#FFFFFF] font-extrabold text-sm md:text-base leading-tight">Director (TBA)</p>
                  <p className="text-[#FFFFFF]/70 text-[10px] md:text-xs font-medium">NUS Enterprise</p>
                </div>
              </div>
              <div className="relative w-1/2 h-full flex items-end justify-center group">
                <img src="https://www.svgrepo.com/show/295334/businesswoman-woman.svg" alt="NUS Founder" className="h-[110%] w-auto object-contain object-bottom drop-shadow-2xl opacity-30 invert transition-all duration-300 group-hover:opacity-50 group-hover:scale-105" />
                <div className="absolute -bottom-4 -right-4 bg-[#914D4D] border-r-4 border-[#2F4055] p-3 shadow-xl z-20 w-[110%] text-right">
                  <p className="text-[#FFFFFF] font-extrabold text-sm md:text-base leading-tight">Student Founder (TBA)</p>
                  <p className="text-[#FFFFFF]/80 text-[10px] md:text-xs font-medium">EdTech Startup, NUS</p>
                </div>
              </div>
            </div>

            <div className="relative z-30 bg-[#FFFFFF] text-[#304156] p-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] mt-12 w-[95%] mx-auto transform -rotate-1 border-l-8 border-[#914D4D]">
               <p className="text-sm font-bold italic">
                 "Understand the gritty reality of execution from founders who built solutions inside The Hangar."
               </p>
            </div>
          </div>
        </div>

        {/* --- DAY 5: WEEKEND TRIP (COMBINED SATURDAY) --- */}
        <div className="space-y-10">
          <div className="text-center pt-10 border-t border-gray-200">
             <Compass className="w-12 h-12 text-[#914D4D] mx-auto mb-4" />
             <h2 className="text-4xl font-extrabold text-[#304156] mb-4">Day 5: Weekend Impact Trip</h2>
             <p className="text-[#304156]/70 max-w-2xl mx-auto text-lg">A full day dedicated to cultural benchmarking, exploring heritage, understanding urbanization, and team bonding.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
             {/* Morning - Heritage */}
             <div className="bg-[#FFFFFF] rounded-3xl p-8 border border-gray-100 shadow-lg group hover:border-[#914D4D]/30 transition-all">
               <div className="h-48 mb-6 rounded-2xl overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1620216508316-24dfbc52bc23?q=80&w=1000&auto=format&fit=crop" alt="Kampong Glam" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
               </div>
               <div className="text-[#914D4D] font-bold tracking-widest uppercase text-sm mb-2">Saturday, July 11 (Morning)</div>
               <h3 className="text-2xl font-bold text-[#304156] mb-4">Heritage & Identity</h3>
               <ul className="space-y-3 text-sm text-[#304156]/80">
                 <li className="flex gap-2"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]" /> <strong>09:00:</strong> Bus & MRT from NUS to Bugis</li>
                 <li className="flex gap-2"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]" /> <strong>10:00:</strong> Explore Haji Lane & Kampong Glam</li>
                 <li className="flex gap-2"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]" /> <strong>12:30:</strong> Lunch at Albert Centre Hawker</li>
               </ul>
             </div>

             {/* Afternoon - Urbanization */}
             <div className="bg-[#FFFFFF] rounded-3xl p-8 border border-gray-100 shadow-lg group hover:border-[#914D4D]/30 transition-all">
               <div className="h-48 mb-6 rounded-2xl overflow-hidden">
                 <img src="https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=1000&auto=format&fit=crop" alt="Marina Bay Sands" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
               </div>
               <div className="text-[#914D4D] font-bold tracking-widest uppercase text-sm mb-2">Saturday, July 11 (Afternoon)</div>
               <h3 className="text-2xl font-bold text-[#304156] mb-4">Future of Urbanization</h3>
               <ul className="space-y-3 text-sm text-[#304156]/80">
                 <li className="flex gap-2"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]" /> <strong>14:30:</strong> Merlion Park & Marina Bay Walk</li>
                 <li className="flex gap-2"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]" /> <strong>17:30:</strong> Dinner at Lau Pa Sat</li>
                 <li className="flex gap-2"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]" /> <strong>20:30:</strong> Garden Rhapsody Light Show</li>
               </ul>
             </div>
          </div>
        </div>

        {/* --- DAY 6: INDUSTRY DAY & GALA --- */}
        <div className="flex flex-col lg:flex-row items-stretch gap-10 bg-gradient-to-r from-[#2F4055] to-[#304156] text-[#FFFFFF] p-8 md:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#914D4D] opacity-30 blur-[100px] rounded-full"></div>
          
          <div className="lg:w-1/2 flex flex-col justify-center relative z-10">
            <div className="inline-flex items-center gap-2 bg-[#FFFFFF]/10 text-[#FFFFFF] px-3 py-1 rounded-full text-xs font-bold mb-4 w-max border border-[#FFFFFF]/20"><Briefcase className="w-4 h-4" /> Professional Exposure</div>
            <div className="text-[#914D4D] font-bold tracking-widest uppercase text-sm mb-2">Day 6 • Sunday, July 12</div>
            <h2 className="text-4xl font-extrabold mb-4">Global Industry Day & Gala</h2>
            <p className="text-white/70 leading-relaxed mb-6">
              Transition from academia to the professional world. We meet with startup leaders to understand global career pathways. The day ends with the Final Impact Presentation and Farewell Gala.
            </p>
            <div className="space-y-4 text-sm mb-8">
              <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-[#914D4D] shrink-0" /> <span><strong>10:00:</strong> Startup Ecosystem Visit / Workshop</span></div>
              <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-[#914D4D] shrink-0" /> <span><strong>14:00:</strong> Final Impact Presentation</span></div>
              <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-[#914D4D] shrink-0" /> <span><strong>18:00:</strong> Farewell Gala & Award Ceremony</span></div>
              <div className="flex items-start gap-3"><Clock className="w-5 h-5 text-[#914D4D] shrink-0" /> <span><strong>20:45:</strong> Reflection Night & Bonding at NUS</span></div>
            </div>
          </div>
          <div className="lg:w-1/2 grid grid-rows-2 gap-4 relative z-10">
            <div className="bg-[#FFFFFF] rounded-3xl p-6 text-[#304156] flex items-center gap-6 shadow-xl h-full">
               <div className="w-16 h-16 bg-[#F7F8FA] rounded-full flex items-center justify-center shrink-0 border border-gray-200 overflow-hidden">
                 <img src="https://glints.com/images/glints-logo-black.png" alt="Glints" className="w-10 object-contain" />
               </div>
               <div>
                 <p className="text-xs text-[#914D4D] font-bold tracking-widest uppercase mb-1">Industry Exposure</p>
                 <h4 className="text-xl font-bold mb-1">Global HQ Network</h4>
                 <p className="text-sm text-[#304156]/70">Networking with experts on global employability.</p>
               </div>
            </div>
            <div className="bg-[#914D4D] rounded-3xl p-6 text-[#FFFFFF] flex items-center gap-6 shadow-xl h-full">
               <div className="w-16 h-16 bg-[#FFFFFF]/10 rounded-full flex items-center justify-center shrink-0 border border-[#FFFFFF]/20">
                 <Award className="w-8 h-8 text-[#FFFFFF]" />
               </div>
               <div>
                 <p className="text-xs text-[#FFFFFF]/70 font-bold tracking-widest uppercase mb-1">Graduation</p>
                 <h4 className="text-xl font-bold mb-1">The Fellowship Gala</h4>
                 <p className="text-sm text-[#FFFFFF]/80">International Certificate Distribution.</p>
               </div>
            </div>
          </div>
        </div>

        {/* --- DAY 7: DEPARTURE --- */}
        <div className="bg-[#FFFFFF] rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#914D4D]/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          
          <div className="md:w-2/3 text-center md:text-left">
            <div className="text-[#914D4D] font-bold tracking-widest uppercase text-xs mb-3">Day 7 • Monday, July 13</div>
            <h3 className="text-3xl font-extrabold text-[#304156] mb-4">Departure</h3>
            
            <div className="space-y-3 text-sm text-[#304156]/80 max-w-xl mx-auto md:mx-0 mb-4">
              <div className="flex gap-3 items-center"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]"/> <span><strong>08:00:</strong> Morning Briefing & Checkout</span></div>
              <div className="flex gap-3 items-center"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]"/> <span><strong>08:30:</strong> Commute to Changi Airport (MRT + Bus)</span></div>
              <div className="flex gap-3 items-center"><Clock className="w-4 h-4 shrink-0 text-[#914D4D]"/> <span><strong>13:00:</strong> Departure Flight to Indonesia</span></div>
            </div>
          </div>
          
          <div className="md:w-1/3 flex flex-col items-center md:items-end text-center md:text-right border-t md:border-t-0 md:border-l border-gray-200 pt-6 md:pt-0 md:pl-8">
             <PlaneTakeoff className="w-12 h-12 text-[#914D4D] mb-4" />
             <p className="text-sm font-bold text-[#304156] uppercase tracking-widest leading-relaxed">
               The Singapore chapter ends.<br/>
               <span className="text-[#914D4D]">The Indonesia impact begins.</span>
             </p>
          </div>
        </div>

      </div>

    </div>
  );
}