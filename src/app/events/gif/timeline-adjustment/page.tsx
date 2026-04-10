"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare,
  PlaneTakeoff,
  Lightbulb
} from "lucide-react";

export default function TimelineAdjustmentPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] font-geologica text-[#304156] pb-24">
      
      <div className="max-w-4xl mx-auto px-6 pt-12">
        

        {/* TITLE SECTION */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-[#914D4D]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-[#914D4D]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            Important Update:<br/>
            <span className="text-[#914D4D]">GIF Singapore Timeline</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            A comprehensive clarification regarding the shift in our departure schedule from May to July 2026.
          </p>
        </div>

        {/* LETTER SECTION */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 mb-12 relative overflow-hidden"
        >
          {/* Decorative Quote Mark */}
          <div className="absolute top-8 right-10 text-[120px] font-serif leading-none text-gray-50 opacity-50 pointer-events-none">
            "
          </div>

          <div className="prose prose-lg max-w-none text-gray-600 space-y-6 relative z-10">
            <p className="text-xl font-bold text-[#304156]">
              Hi IELScout, this is Arba, the Principal of IELS.
            </p>
            
            <p>
              First and foremost, I want to express my deepest gratitude for your overwhelming enthusiasm toward the Global Impact Fellowship (GIF) 2026. Building this program has been a labor of love, and seeing so many brilliant future leaders apply gives us immense hope for Indonesia's future. However, building a high-quality program also means making difficult but necessary executive decisions to protect that quality.
            </p>

            <p>
              As you may be aware, the escalating geopolitical conflict between Iran and the USA has created significant instability in global aviation. This has caused aviation fuel prices to skyrocket, leading to mass international flight cancellations and a massive, unexpected spike in airline ticket prices. To give you some perspective, a standard flight from Jakarta to Singapore that normally costs around IDR 600,000 has recently surged to IDR 2,400,000—a fourfold increase. As an organization that independently covers the full flight expenses for <strong>30 individuals</strong> (20 delegates + 10 core committee members), absorbing a 400% price hike would mean severely cutting budgets for our core incubation programs, accommodations, and learning facilities.
            </p>

            <p>
              I refuse to let that happen. We will not compromise or downgrade the quality of your learning experience just to chase a timeline. Our priority is to ensure that every delegate experiences the premium, international-standard program that we promised from day one, without any hidden cutbacks.
            </p>

            <p>
              Before finalizing this decision, our team engaged in extensive discussions with our partners at the National University of Singapore (NUS). We wanted to ensure that this adjustment was a wise, calculated move rather than a rushed reaction. Thankfully, they completely understand our position and have graciously agreed to accommodate our schedule change, guaranteeing that our premium campus dormitories and facilities remain secured for the new dates.
            </p>

            <p>
              Therefore, we have officially decided to adjust the Singapore departure to <strong>July 7 – 13, 2026</strong>. I sincerely apologize for any disruption this may cause to your personal plans, but I assure you this is the best step to guarantee your safety, comfort, and the uncompromising standard of the GIF program. Thank you for your continued trust and understanding.
            </p>

            <div className="pt-6 mt-8 border-t border-gray-100 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-gray-100 bg-gray-100">
                <Image 
                  src="/images/people/directors/arba.png" 
                  alt="Arbadza Rido Adzariyat" 
                  width={56} 
                  height={56} 
                  className="object-cover w-full h-full"
                />
              </div>
              <div>
                <p className="font-bold text-[#304156] mb-0.5">Arbadza Rido Adzariyat</p>
                <p className="text-sm text-gray-500">Founder & Principal of Operations, IELS</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* VISUAL TIMELINE COMPARISON */}
        <h3 className="text-2xl font-black text-[#304156] mb-6 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-[#914D4D]" />
          Visual Timeline Adjustment
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* PREVIOUS */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 relative opacity-70 grayscale">
            <div className="absolute top-4 right-4 bg-gray-200 text-gray-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Previous
            </div>
            <div className="text-gray-400 mb-2 font-bold text-sm">Original Departure</div>
            <div className="text-2xl font-black text-gray-600 mb-1 line-through">May 5 - 12, 2026</div>
            <p className="text-sm text-gray-500">Singapore Residency Phase</p>
          </div>

          {/* NEW */}
          <div className="bg-white border-2 border-[#914D4D] rounded-2xl p-6 relative shadow-lg transform md:-translate-y-2">
            <div className="absolute top-4 right-4 bg-[#914D4D]/10 text-[#914D4D] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Updated Final
            </div>
            <div className="text-[#914D4D] mb-2 font-bold text-sm flex items-center gap-2">
              <PlaneTakeoff className="w-4 h-4" /> New Departure
            </div>
            <div className="text-3xl font-black text-[#304156] mb-1">July 7 - 13, 2026</div>
            <p className="text-sm font-medium text-gray-600">Singapore Residency Phase</p>
          </div>
        </div>

        {/* WHAT'S GOOD SECTION */}
        <h3 className="text-2xl font-black text-[#304156] mb-6 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          The Silver Lining (Why This is Good)
        </h3>
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-12">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="mt-1">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-2">More Preparation Time</h4>
                <p className="text-sm text-gray-600 leading-relaxed">With the extra two months, delegates have significantly more time to refine their social project concepts, conduct local research, and build team chemistry before flying.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-2">Better Flight & Accommodation</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Securing logistics early for July means we avoid the chaotic May re-bookings, ensuring smoother travel arrangements and premium campus dormitory placements.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="mt-1">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-2">Solidified Execution Phase</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Returning in mid-July perfectly aligns the 4-month Project Execution Phase (Aug-Nov) with the standard Indonesian academic semester, making it easier to recruit volunteers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CONCERN & SUPPORT SECTION */}
        <div className="bg-[#304156] rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Background Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#914D4D]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-black mb-3">Schedule Conflict in July?</h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                We understand that a shift to July might clash with your prior commitments (e.g., university exams, internships, or work). We don't want you to lose this opportunity over a timeline change. 
                <br/><br/>
                If you have a strict scheduling conflict, please reach out to me personally. We have prepared several alternative solutions and flexible arrangements for affected candidates.
              </p>
            </div>
            
            <div className="w-full md:w-auto shrink-0">
              <a 
                href="https://wa.me/6288297253491"
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full md:w-auto bg-[#914D4D] hover:bg-[#7a3e3e] text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
              >
                <MessageSquare className="w-5 h-5 mr-3" />
                Discuss with Arba
              </a>
              <p className="text-center text-xs text-gray-400 mt-3">Direct line for timeline concerns</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}