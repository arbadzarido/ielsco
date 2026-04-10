"use client";

import React from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Rocket, 
  Users, 
  MapPin, 
  Calendar, 
  Target, 
  BarChart, 
  FileText, 
  ShieldCheck, 
  Leaf, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ProjectRealizationPage() {
  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-[#304156]">

      
      {/* ================= HERO SECTION ================= */}
      <div className="bg-[#304156] text-[#FFFFFF] pt-20 pb-32 relative overflow-hidden">
        
        {/* Decorative Background */}
        {/* BACKGROUND IMAGE */}
        <div className="absolute inset-0 bg-[url('/images/contents/stories/member-stories/banner/singapore-banner.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2F4055]/95 via-[#914D4D]/80 to-[#304156]/95" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#2F4055] opacity-30 blur-[80px] rounded-full -translate-x-1/3 translate-y-1/3" />
        
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          
          <div className="inline-flex items-center gap-2 bg-[#914D4D]/20 border border-[#914D4D]/30 text-[#FFFFFF] px-4 py-1.5 rounded-full text-sm font-bold mb-6 tracking-wide uppercase">
            <Rocket className="w-4 h-4" /> Post-Residency Phase
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            Project Realization Guidelines
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl leading-relaxed">
            The Singapore incubation is just the blueprint. From June to November 2026, you will return to Indonesia to execute your SDG 4 project on the ground. Here is everything you need to know about team dynamics, timeline, and the final Impact Report.
          </p>
        </div>
      </div>

    {/* ================= MAIN CONTENT ================= */}
      <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-20 pb-24 space-y-8">

        {/* --- SECTION 1: CORE PRINCIPLES (The "How It Works") --- */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 md:p-10 border border-gray-100 shadow-lg">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-[#304156]">
            <Target className="w-6 h-6 text-[#914D4D]" /> Core Execution Model
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-[#914D4D]/30 transition-colors">
              <Users className="w-8 h-8 text-[#304156] mb-4" />
              <h3 className="font-bold text-lg mb-2 text-[#304156]">Groups of 5</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                This is a collaborative journey. The 20 final delegates will be matched into <strong>4 core teams</strong> post-announcement, based on professional background and project idea similarity.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-[#914D4D]/30 transition-colors">
              <MapPin className="w-8 h-8 text-[#914D4D] mb-4" />
              <h3 className="font-bold text-lg mb-2 text-[#304156]">Geo-Specific Target</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Projects must solve a localized SDG 4 issue. You and your team will select one specific region/city in Indonesia to deploy the intervention.
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 hover:border-[#914D4D]/30 transition-colors">
              <Calendar className="w-8 h-8 text-[#2F4055] mb-4" />
              <h3 className="font-bold text-lg mb-2 text-[#304156]">2-3 Weeks Intensive</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                While the monitoring lasts 4 months, teams are required to conduct a <strong>2-3 weeks intensive offline volunteership</strong> in the target area to kickstart the project.
              </p>
            </div>
          </div>

          {/* IELS Support Alert */}
          <div className="mt-8 bg-[#304156]/5 border border-[#304156]/10 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="bg-[#FFFFFF] p-3 rounded-full shrink-0 shadow-sm">
              <ShieldCheck className="w-6 h-6 text-[#304156]" />
            </div>
            <div>
              <h4 className="font-bold text-[#304156] mb-1">IELS Institutional Support</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Need more manpower? You are allowed to recruit volunteers from the <strong>IELS Community Pool (2,800+ members)</strong>. Need to collaborate? Partnerships with local NGOs or student organizations (like AIESEC) are highly encouraged. IELS will also provide baseline project funding to support the execution.
              </p>
            </div>
          </div>
        </div>

        {/* --- SECTION 2: THE 4-MONTH TIMELINE --- */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 md:p-10 border border-gray-100 shadow-lg">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-[#304156]">
            <Calendar className="w-6 h-6 text-[#914D4D]" /> 4-Month Realization Timeline
          </h2>

          <div className="relative border-l-2 border-gray-200 ml-4 md:ml-6 space-y-10 py-4">
            
            {/* Step 1 */}
            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-[11px] top-1 w-5 h-5 bg-[#304156] rounded-full border-4 border-[#FFFFFF] shadow-sm" />
              <div className="bg-gray-50 inline-block px-3 py-1 rounded-md text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide border border-gray-200">July 2026</div>
              <h3 className="text-xl font-bold text-[#304156] mb-2">Phase 1: Ground Preparation & Recruitment</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Post-Singapore mapping. Teams finalize their target area, secure permits, contact local partners, and if necessary, recruit additional volunteers from the IELS member pool to prepare for offline execution.
              </p>
            </div>

            {/* Step 2 (Highlight) */}
            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-[11px] top-1 w-5 h-5 bg-[#914D4D] rounded-full border-4 border-[#FFFFFF] shadow-sm ring-4 ring-[#914D4D]/20" />
              <div className="bg-[#914D4D]/10 inline-block px-3 py-1 rounded-md text-xs font-bold text-[#914D4D] mb-2 uppercase tracking-wide border border-[#914D4D]/20">August - September 2026</div>
              <h3 className="text-xl font-bold text-[#304156] mb-2">Phase 2: Intensive Offline Execution</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                The core action phase. Teams must be physically present in the target area for a mandatory <strong>2-3 weeks intensive volunteership</strong>. During this time, you will:
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#914D4D] mt-0.5 shrink-0" /> Launch the educational intervention directly to beneficiaries.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#914D4D] mt-0.5 shrink-0" /> Conduct Pre-Test and Post-Test for impact measurement.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#914D4D] mt-0.5 shrink-0" /> Collect field data for the Academic Research paper.</li>
              </ul>
            </div>

            {/* Step 3 */}
            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-[11px] top-1 w-5 h-5 bg-[#304156] rounded-full border-4 border-[#FFFFFF] shadow-sm" />
              <div className="bg-gray-50 inline-block px-3 py-1 rounded-md text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide border border-gray-200">October 2026</div>
              <h3 className="text-xl font-bold text-[#304156] mb-2">Phase 3: Remote Maintenance & Monitoring</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                You can return to your respective universities/internships. The project shifts to a remote monitoring phase. You will maintain contact with local PICs, evaluate the sustained impact, and begin drafting your research data.
              </p>
            </div>

            {/* Step 4 */}
            <div className="relative pl-8 md:pl-12">
              <div className="absolute -left-[11px] top-1 w-5 h-5 bg-[#304156] rounded-full border-4 border-[#FFFFFF] shadow-sm" />
              <div className="bg-gray-50 inline-block px-3 py-1 rounded-md text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide border border-gray-200">November 2026</div>
              <h3 className="text-xl font-bold text-[#304156] mb-2">Phase 4: Synthesis & Reporting</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Data collection closes. Teams synthesize all findings, analyze the success/failure metrics of the intervention, and finalize the <strong>Project Impact Report</strong>.
              </p>
            </div>

          </div>
        </div>

        {/* --- SECTION 3: THE FINAL OUTPUT (IMPACT REPORT) --- */}
        <div className="bg-[#FFFFFF] rounded-3xl p-8 md:p-10 border border-gray-100 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-[#304156]">
              <FileText className="w-6 h-6 text-[#914D4D]" /> Final Deliverable: The Impact Report
            </h2>
            <div className="bg-[#914D4D]/10 text-[#914D4D] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-[#914D4D]/20">
              <AlertCircle className="w-4 h-4" /> Deadline: December 2026
            </div>
          </div>

          <p className="text-gray-600 mb-8 leading-relaxed">
            We do not accept simple "activity logs". The final output must be a comprehensive <strong>Impact Report</strong> that proves your project actually worked, backed by data. This report will be published and serves as your professional portfolio.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-[#FFFFFF]">
              <div className="w-10 h-10 bg-[#304156]/10 text-[#304156] rounded-lg flex items-center justify-center font-bold mb-4">1</div>
              <h4 className="font-bold text-[#304156] mb-2">Problem Validation</h4>
              <p className="text-sm text-gray-500">A clear breakdown of the educational gap you found in your target area before the intervention started.</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-[#FFFFFF]">
              <div className="w-10 h-10 bg-[#304156]/10 text-[#304156] rounded-lg flex items-center justify-center font-bold mb-4">2</div>
              <h4 className="font-bold text-[#304156] mb-2">Intervention Logic (ToC)</h4>
              <p className="text-sm text-gray-500">Mapping your project using the Theory of Change: What was the Input, Output, and ultimate Outcome.</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-[#FFFFFF]">
              <div className="w-10 h-10 bg-[#304156]/10 text-[#304156] rounded-lg flex items-center justify-center font-bold mb-4">3</div>
              <h4 className="font-bold text-[#304156] mb-2">Evidence of Impact</h4>
              <p className="text-sm text-gray-500">Quantitative data (e.g., test score improvements) and Qualitative data (e.g., beneficiary testimonials & case studies).</p>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-[#914D4D]/5 border-[#914D4D]/20">
              <div className="w-10 h-10 bg-[#914D4D] text-[#FFFFFF] rounded-lg flex items-center justify-center font-bold mb-4">4</div>
              <h4 className="font-bold text-[#914D4D] mb-2">Legacy & Sustainability</h4>
              <p className="text-sm text-gray-600">The most critical part. A detailed plan on how the project will survive or be handed over after you leave the location.</p>
            </div>
          </div>
        </div>

        {/* --- SECTION 4: SUSTAINABILITY VISION --- */}
        {/* USING GRADIENT LINEAR #2F4055 #914D4D #304156 */}
        <div className="bg-gradient-to-r from-[#2F4055] via-[#914D4D] to-[#304156] rounded-3xl p-8 md:p-10 text-[#FFFFFF] text-center relative overflow-hidden shadow-xl">
          
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none" />
          
          <div className="relative z-10">
            <Leaf className="w-12 h-12 text-[#FFFFFF] mx-auto mb-6 opacity-90" />
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Building a Lasting Legacy</h2>
            <p className="text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
              At IELS, we don't build projects just to look good on a CV. We build ecosystems. The most successful projects from GIF 2026 will not end in December. They will be integrated into the <strong>IELS Official Portfolio</strong> and continued by the next generation of delegates in 2027.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
               {/* USING GRADIENT LINEAR #2F4055 #914D4D */}
               <Button asChild className="w-full sm:w-auto bg-gradient-to-r from-[#2F4055] to-[#914D4D] hover:opacity-90 text-[#FFFFFF] font-bold py-4 px-8 rounded-2xl text-md shadow-lg border-none transition-all">
                 <Link href="/events/gif">
                   Back to GIF Main Page
                 </Link>
               </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}