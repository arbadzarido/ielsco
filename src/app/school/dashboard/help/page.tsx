"use client";

// =============================================================================
// app/school/dashboard/help/page.tsx
// Dedicated Help & Support Center Page for IELS School Portal Dashboard
// Optimized Layout: Expanded container width to prevent cramped content grids
// =============================================================================

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Mail, ChevronDown, Bug, Target, GraduationCap, 
  Users, School, ShieldAlert, CheckCircle2, LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- DEDICATED SCHOOL PORTAL FAQ DATA ---
const schoolFaqCategories = [
  {
    id: "classes",
    title: "Class Management",
    icon: <School size={18} />,
    questions: [
      { q: "How do I create a new class layout?", a: "Navigate to the 'Classes' management tab from your sidebar, click the 'Add New Class' button, fill in the class name, schedule block, and assign an active mentor." },
      { q: "Can I merge two different school batches?", a: "Currently, batch splitting and merging are locked to protect historical analytical data. Please request structural changes via school-support@ielsco.com." },
      { q: "How can I archive a completed semester group?", a: "Go to Class Settings > Status > Archive. This moves the class database into archival storage while saving all student performance records intact." }
    ]
  },
  {
    id: "students",
    title: "Student Tracking",
    icon: <Users size={18} />,
    questions: [
      { q: "How do I invite students to the platform?", a: "Under the 'Students' page, click 'Manage Roster' where you can generate an automatic unique signup link or batch-upload rows via a standardized CSV spreadsheet." },
      { q: "Why are some student prediction test ranks not updating?", a: "Ranks automatically recalibrate every Sunday at 00:00 WIB. If a student recently finished a verified assessment, wait for the global sync cycle." },
      { q: "Can I override or manually adjust a student score?", a: "Platform rules forbid direct modifications of automated AI band scores to preserve reporting transparency for institutions." }
    ]
  },
  {
    id: "mentors",
    title: "Mentor Assignment",
    icon: <GraduationCap size={18} />,
    questions: [
      { q: "How do I reassign a primary class mentor?", a: "Go to your Class Overview list, click 'Edit Details' on the chosen group, select the dropdown menu under 'Assigned Instructor', and swap profiles instantly." },
      { q: "Where can mentors log their session feedback?", a: "Mentors can access their own view of the dashboard to enter real-time logs, tracking individual student strengths and weak target areas directly." }
    ]
  },
  {
    id: "analytics",
    title: "Analytics & Export",
    icon: <Target size={18} />,
    questions: [
      { q: "How do I export class reports for school boards?", a: "Open the 'Reports' dashboard, configure your data filters (date range, specific batch, performance level), and click the 'Export PDF / Excel' button." },
      { q: "What does the 'Cohort Vulnerability Rate' imply?", a: "It tracks the percentage of assigned students whose simulated writing/speaking band score trends fall below a critical 5.5 path threshold." }
    ]
  }
];

export default function SchoolHelpPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("classes");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const displayFaqs = searchQuery 
    ? schoolFaqCategories.flatMap(cat => cat.questions.map(q => ({ ...q, category: cat.title })))
        .filter(q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : schoolFaqCategories.find(cat => cat.id === activeCategory)?.questions || [];

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20 relative -mt-6">
      
      {/* === HERO BANNER SECTION === */}
      <div className="bg-[#1A2534] text-white py-16 px-4 lg:px-12 relative overflow-hidden rounded-b-[32px] -mx-6">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#E56668]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E56668]/10 text-[#E56668] border border-[#E56668]/20 rounded-full text-[10px] font-black uppercase tracking-[0.18em]">
              <LifeBuoy size={12} /> School Support Center
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight max-w-2xl mx-auto">
              How can we help manage your institution today?
            </h1>
            <div className="relative max-w-2xl mx-auto pt-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Search portal guidelines (e.g., 'archive', 'roster', 'export')...."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-6 py-3.5 bg-white border-none rounded-2xl text-[#1A2534] text-[13px] focus:ring-4 focus:ring-[#E56668]/20 transition-all shadow-xl font-medium placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* === MAIN CORE GRID - Lebar dinaikkan ke max-w-7xl & gap diperluas === */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 relative z-20">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* === LEFT SIDEBAR: CATEGORIES (Menempati 2 dari 12 Kolom) === */}
          <aside className="lg:col-span-2 space-y-1 hidden lg:block">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Roster & Modules</p>
            {schoolFaqCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearchQuery(""); setOpenFaq(null); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 text-left",
                  activeCategory === cat.id && !searchQuery
                    ? "bg-[#1A2534] text-white shadow-md translate-x-1" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#1A2534]"
                )}
              >
                <span className={cn(activeCategory === cat.id && !searchQuery ? "text-[#E56668]" : "text-slate-400")}>
                  {cat.icon}
                </span>
                {cat.title}
              </button>
            ))}
          </aside>

          {/* === MIDDLE CONTENT: FAQ LIST (Menempati 7 dari 12 Kolom - Paling Luas) === */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Mobile Horizontal Carousel Filter */}
            <div className="lg:hidden flex gap-2 pb-1 overflow-x-auto no-scrollbar">
              {schoolFaqCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSearchQuery(""); setOpenFaq(null); }}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all",
                    activeCategory === cat.id && !searchQuery
                      ? "bg-[#1A2534] text-white border-[#1A2534]"
                      : "bg-white text-slate-500 border-gray-200"
                  )}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            {/* Accordion List Wrapper */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6 md:p-8 min-h-[420px]">
              <h2 className="text-lg font-black text-[#1A2534] mb-6 tracking-tight">
                {searchQuery ? `Search Results for "${searchQuery}"` : schoolFaqCategories.find(c => c.id === activeCategory)?.title}
              </h2>

              <div className="space-y-1">
                {displayFaqs.length > 0 ? displayFaqs.map((faq, idx) => (
                  <div 
                    key={idx}
                    className="border-b border-gray-50 last:border-0 pb-3.5 last:pb-0 pt-1"
                  >
                    <button 
                      onClick={() => setOpenFaq(openFaq === String(idx) ? null : String(idx))}
                      className="w-full py-2.5 flex items-start justify-between text-left group focus:outline-none"
                    >
                      <h4 className="font-bold text-[#1A2534] text-[14px] group-hover:text-[#E56668] transition-colors pr-6 leading-snug">
                        {faq.q}
                      </h4>
                      <ChevronDown 
                        size={16} 
                        className={cn(
                          "text-slate-400 flex-shrink-0 transition-transform duration-300 mt-0.5 group-hover:text-[#1A2534]", 
                          openFaq === String(idx) && "rotate-180 text-[#E56668] group-hover:text-[#E56668]"
                        )} 
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === String(idx) && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-[13px] text-slate-500 leading-relaxed font-medium pt-1 pb-2 pl-0.5">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )) : (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="text-slate-400" size={20} />
                    </div>
                    <p className="text-[#1A2534] font-bold text-sm">No institutional records found.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Double-check your parameters or key phrases.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === RIGHT SIDEBAR: EMERGENCY HELPDESK (Menempati 3 dari 12 Kolom) === */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-[#1A2534] p-6 rounded-[24px] text-white border border-white/10 relative overflow-hidden group shadow-md">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -mr-4 -mt-4"></div>
              <Bug className="absolute -bottom-3 -right-3 text-white/5 w-20 h-20 rotate-12" />
              
              <div className="relative z-10">
                <h3 className="text-md font-black mb-1.5 tracking-tight flex items-center gap-2">
                  <ShieldAlert className="text-[#E56668]" size={16} /> Portal Emergency?
                </h3>
                <p className="text-white/60 text-[11px] mb-5 leading-relaxed font-medium">
                  Roster errors, batch syncing gaps, or platform bugs? Open an engineering report line immediately.
                </p>

                <div className="space-y-2">
                  <a href="mailto:school-support@ielsco.com" className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5">
                    <Mail size={14} className="text-[#E56668]" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white leading-none">School Helpdesk</p>
                      <p className="text-[9px] text-white/40 font-medium truncate mt-1">support@ielsco.com</p>
                    </div>
                  </a>
                  <a href="mailto:arbadza@ielsco.com" className="flex items-center gap-3 p-2.5 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/5">
                    <GraduationCap size={14} className="text-blue-400" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white leading-none">Direct Founder Route</p>
                      <p className="text-[9px] text-white/40 font-medium truncate mt-1">arbadza@ielsco.com</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Live Operational Status */}
            <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
              </div>
              <div className="min-w-0">
                <h4 className="text-[10px] font-black uppercase text-[#1A2534] tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-500" /> API Systems Normal
                </h4>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">All school shard nodes syncing efficiently.</p>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}