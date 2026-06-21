"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare,
  PlaneTakeoff,
  Lightbulb,
  Users,
  BookOpen,
  MapPin,
  Building2
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
            <span className="text-[#914D4D]">Introducing GIF Batch 2</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            A transparent clarification regarding our strategic capacity split and your departure timeline to November 2026.
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
              Hi IELScout, this is Arba.
            </p>
            
            <p>
              I want to speak to you with absolute transparency. The Global Impact Fellowship (GIF) 2026 is IELS’s first-ever international event of this scale. Our initial ambition was simple: to provide the most affordable, high-quality global opportunities for as many of you as possible. However, as a growing organization, I must honestly admit that we did not fully mitigate the impact of several unexpected internal and external variables.
            </p>

            <p>
              Behind the scenes, we faced significant shifts. <strong>Economically</strong>, the SGD exchange rate surged drastically from IDR 10,900 to IDR 14,000. <strong>Internally</strong>, IELS officially transitioned from an NGO into a corporate entity (PT English Space Berkah Indonesia). While this restructuring guarantees a much stronger and secure ecosystem for your projects moving forward, it took considerable time and impacted our initial preparation timeline. Furthermore, we noticed many delegates genuinely needed more time to process their passports and secure travel funds.
            </p>

            <p>
              We realized that trying to force everyone into a single departure under these unmitigated pressures would mean compromising the quality of your NUS experience, your accommodation, or your project support. <strong>I refuse to let that happen.</strong>
            </p>

            <p>
              Because of this, we have made the strategic decision to split the departures. <strong>Batch 1 (July 7-13, 2026)</strong> has officially reached its maximum capacity and is strictly prioritized for delegates whose documents are 100% ready. To ensure we deliver the uncompromising premium experience we promised, we are officially directing our Funded delegates to join <strong>GIF Batch 2, departing on November 17 - 21, 2026.</strong>
            </p>

            <p>
              This was a massive learning curve for us, and we are continually learning to serve you better. Thank you for your trust, your patience, and your understanding as we build a stronger IELS for you.
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
                <p className="text-sm text-gray-500">Founder & COO, IELS</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* VISUAL TIMELINE COMPARISON */}
        <h3 className="text-2xl font-black text-[#304156] mb-6 flex items-center gap-2">
          <PlaneTakeoff className="w-6 h-6 text-[#914D4D]" />
          The Strategic Split
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* BATCH 1 */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 relative opacity-80">
            <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Full Capacity
            </div>
            <div className="text-gray-500 mb-2 font-bold text-sm">Batch 1</div>
            <div className="text-2xl font-black text-gray-600 mb-1">July 7 - 13, 2026</div>
            <p className="text-sm text-gray-500">For delegates with 100% ready documents.</p>
          </div>

          {/* BATCH 2 */}
          <div className="bg-white border-2 border-[#914D4D] rounded-2xl p-6 relative shadow-lg transform md:-translate-y-2">
            <div className="absolute top-4 right-4 bg-[#914D4D]/10 text-[#914D4D] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
              Your Slot
            </div>
            <div className="text-[#914D4D] mb-2 font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Batch 2
            </div>
            <div className="text-3xl font-black text-[#304156] mb-1">Nov 17 - 21, 2026</div>
            <p className="text-sm font-medium text-gray-600">Expanded regional network & preparation.</p>
          </div>
        </div>

        {/* WHAT'S GOOD SECTION */}
        <h3 className="text-2xl font-black text-[#304156] mb-6 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          Why Batch 2 is a Massive Upgrade
        </h3>
        
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-12">
          <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-2">Southeast Asian Network</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Batch 2 is going regional! You will incubate your projects at NUS alongside top youth delegates from Malaysia, Philippines, Thailand, Vietnam, and Cambodia.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-2">Free Online Mentoring</h4>
                <p className="text-sm text-gray-600 leading-relaxed">Arrive in SG 100% ready. You’ll receive exclusive mentoring (Aug-Oct) covering the "A-B-C Framework" to refine your project blueprint before stepping foot in NUS.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#304156] mb-2">The Full NUS Experience</h4>
                <p className="text-sm text-gray-600 leading-relaxed">You retain all core benefits: 4x Project Incubation at NUS, staying directly at the NUS Dorms, and receiving comprehensive leadership modules.</p>
              </div>
            </div>
          </div>
        </div>

        {/* TEASER SECTION */}
        <div className="bg-gradient-to-r from-blue-900 to-[#304156] rounded-2xl p-6 md:p-8 text-white shadow-lg mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="inline-block bg-blue-500/20 text-blue-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-3 border border-blue-500/30">
              Coming Soon 2027
            </div>
            <h3 className="text-xl md:text-2xl font-black mb-2 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-red-400" />
              Next Stop: Thailand!
            </h3>
            <p className="text-blue-100 text-sm md:text-base max-w-lg">
              For those looking ahead, we are officially preparing our Batch 3 expansion in collaboration with <strong>Chulalongkorn University, Thailand</strong>. Stay tuned for more details!
            </p>
          </div>
        </div>

        {/* CONCERN & SUPPORT SECTION */}
        <div className="bg-[#304156] rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
          {/* Background Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#914D4D]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-black mb-3">Have a Schedule Conflict?</h3>
              <p className="text-gray-300 leading-relaxed text-sm md:text-base">
                We understand that a shift to November might clash with your academic or work commitments. We do not want you to lose this opportunity over a timeline change. 
                <br/><br/>
                If you have a strict scheduling conflict, please reach out to me. We can provide official letters for your institution or discuss alternative solutions.
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