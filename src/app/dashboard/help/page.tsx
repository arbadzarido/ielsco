"use client";

// =============================================================================
// app/dashboard/help/page.tsx
// Refactored Premium Help Center for Users/Students Dashboard Layout
// Fixed layout compression using a relaxed 12-column grid and edge-to-edge hero lines
// =============================================================================

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Mail, ChevronDown, Bug, Target, GraduationCap, 
  Library, Download, Users, FileText, CheckCircle2, ShieldCheck, LifeBuoy
} from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

// --- CATEGORIZED STUDENT FAQ DATA ---
const faqCategories = [
  {
    id: "goals",
    title: "Goals & Assignment",
    icon: <Target size={18} />,
    questions: [
      { q: "How do I set my weekly learning goal?", a: "Navigate to the 'My Goals' page from the dashboard sidebar. Click 'Set New Goal', choose your focus area (e.g., Speaking, Writing), and set your target hours." },
      { q: "Where can I find my pending assignments?", a: "All pending tasks from your enrolled courses will appear in the 'My Learning' dashboard widget. You can also view them under the 'Assignments' tab in each specific course page." },
      { q: "Can I reset my progress?", a: "Progress resets are handled manually to ensure data integrity. Please contact support@ielsco.com if you wish to restart a course module." }
    ]
  },
  {
    id: "test",
    title: "IELS Test",
    icon: <FileText size={18} />,
    questions: [
      { q: "Is the Prediction Test score accurate?", a: "Our AI scoring model is trained on thousands of official IELTS results, providing a band score accuracy of ±0.5 compared to the real test." },
      { q: "How long does it take to get my results?", a: "Listening and Reading scores are instant. Writing and Speaking assessments (AI-evaluated) are typically generated within 5-10 minutes." },
      { q: "Can I retake a test?", a: "Yes. Basic members get 1 free retake per month. Pro members enjoy unlimited retakes to track their improvement over time." }
    ]
  },
  {
    id: "courses",
    title: "IELS Courses",
    icon: <GraduationCap size={18} />,
    questions: [
      { q: "Are the courses self-paced?", a: "Yes, all our Masterclasses are pre-recorded and self-paced. However, we recommend following the weekly schedule provided in the course syllabus for best results." },
      { q: "Do I get a certificate after completion?", a: "Absolutely. Upon completing 100% of the modules and passing the final quiz, a verifiable digital certificate will be issued to your profile." }
    ]
  },
  {
    id: "library",
    title: "IELS Library",
    icon: <Library size={18} />,
    questions: [
      { q: "Can I download the e-books?", a: "Most resources in the library are available for download in PDF format. Some premium video content is stream-only to protect intellectual property." },
      { q: "How often is the library updated?", a: "We add new study materials, including fresh IELTS speaking topics and writing samples, on a bi-weekly basis." }
    ]
  },
  {
    id: "resources",
    title: "Resources & Tools",
    icon: <Download size={18} />,
    questions: [
      { q: "Where can I find the Writing Templates?", a: "Go to 'IELS Resources' > 'Templates'. We offer band 9.0 structures for both Task 1 and Task 2." },
      { q: "Do you have a vocabulary list?", a: "Yes, our 'Essential 500' vocabulary deck is available in the Resources section, categorized by common IELTS topics (Environment, Education, Technology, etc.)." }
    ]
  },
  {
    id: "community",
    title: "Community",
    icon: <Users size={18} />,
    questions: [
      { q: "How do I join the Speaking Club?", a: "Check the 'Community' page for the weekly schedule. Click the 'Join Session' button 10 minutes before the start time to enter the Zoom/Discord room." },
      { q: "Is the WhatsApp group open for everyone?", a: "The 'Inner Circle' WhatsApp group is exclusive to Pro members to ensure high-quality, focused mentorship. Basic members can join our global Discord server." }
    ]
  }
];

export default function StudentHelpCenterPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [userData, setUserData] = useState({
    name: "Learner",
    tier: "explorer" as "explorer" | "insider" | "visionary",
    avatar: ""
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("goals");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbMembership } = await supabase
        .from("memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: dbUser } = await supabase
        .from("users")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const dbTier = dbMembership?.tier;
      let uiTier: "explorer" | "insider" | "visionary" = "explorer";

      if (dbTier === "pro") {
        uiTier = "insider";
      } else if (dbTier === "premium" || dbTier === "visionary") {
        uiTier = "visionary";
      }

      setUserData({
        name: dbUser?.full_name || user.user_metadata?.full_name || "Learner",
        tier: uiTier,
        avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || ""
      });
    };
    
    getUserData();
  }, [supabase]);

  const displayFaqs = searchQuery 
    ? faqCategories.flatMap(cat => cat.questions.map(q => ({ ...q, category: cat.title })))
        .filter(q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqCategories.find(cat => cat.id === activeCategory)?.questions || [];

  return (
    <DashboardLayout 
      userName={userData.name} 
      userTier={userData.tier} 
      userAvatar={userData.avatar}
    >
      <div className="min-h-screen bg-[#FDFDFD] pb-20 relative -mt-6">
        
        {/* === HERO BANNER SECTION (Full Bleed to prevent container breaking) === */}
        <div className="bg-[#2F4157] text-white py-16 px-4 lg:px-12 relative overflow-hidden rounded-b-[32px] -mx-6 lg:-mx-12">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#E56668]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E56668]/10 text-[#E56668] border border-[#E56668]/20 rounded-full text-[10px] font-black uppercase tracking-[0.18em]">
                <LifeBuoy size={12} /> Student Help Center
              </div>
              <h1 className="text-3xl md:text-4xl font-black font-geologica tracking-tight max-w-2xl mx-auto">
                How can we support your learning journey?
              </h1>
              <div className="relative max-w-2xl mx-auto pt-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search space guidelines (e.g., 'certificate', 'speaking', 'retake')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-6 py-3.5 bg-white border-none rounded-2xl text-[#2F4157] text-[13px] focus:ring-4 focus:ring-[#E56668]/20 transition-all shadow-xl font-medium placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* === MAIN UN-CRAMPED GRID SYSTEM === */}
        <div className="max-w-7xl mx-auto px-2 lg:px-4 mt-10 relative z-20">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* === LEFT SIDEBAR: CATEGORIES (2 Columns) === */}
            <aside className="lg:col-span-2 space-y-1 hidden lg:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">Categories</p>
              {faqCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSearchQuery(""); setOpenFaq(null); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 text-left",
                    activeCategory === cat.id && !searchQuery
                      ? "bg-[#2F4157] text-white shadow-md translate-x-1" 
                      : "text-[#577E90] hover:bg-[#F6F3EF] hover:text-[#2F4157]"
                  )}
                >
                  <span className={cn(activeCategory === cat.id && !searchQuery ? "text-[#E56668]" : "text-slate-400")}>
                    {cat.icon}
                  </span>
                  {cat.title}
                </button>
              ))}
            </aside>

            {/* === MIDDLE CONTENT: FAQS (7 Columns - Giving Maximum Space) === */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Mobile Carousel Filter Tabs */}
              <div className="lg:hidden flex gap-2 pb-1 overflow-x-auto no-scrollbar">
                {faqCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setSearchQuery(""); setOpenFaq(null); }}
                    className={cn(
                      "flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all",
                      activeCategory === cat.id && !searchQuery
                        ? "bg-[#2F4157] text-white border-[#2F4157]"
                        : "bg-white text-slate-500 border-gray-200"
                    )}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>

              {/* FAQ Accordion Base Card */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-6 md:p-8 min-h-[420px]">
                <h2 className="text-lg font-black text-[#2F4157] mb-6 tracking-tight">
                  {searchQuery ? `Search Results for "${searchQuery}"` : faqCategories.find(c => c.id === activeCategory)?.title}
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
                        <h4 className="font-bold text-[#2F4157] text-[14px] group-hover:text-[#E56668] transition-colors pr-6 leading-snug">
                          {faq.q}
                        </h4>
                        <ChevronDown 
                          size={16} 
                          className={cn(
                            "text-slate-400 flex-shrink-0 transition-transform duration-300 mt-0.5 group-hover:text-[#2F4157]", 
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
                      <p className="text-[#2F4157] font-bold text-sm">No answers found.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search filters.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* === RIGHT SIDEBAR: HOTLINES (3 Columns) === */}
            <aside className="lg:col-span-3 space-y-4">
              <div className="bg-[#E56668] p-6 rounded-[24px] text-white relative overflow-hidden group shadow-md">
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-xl -mr-4 -mt-4"></div>
                <Bug className="absolute -bottom-3 -right-3 text-white/5 w-20 h-20 rotate-12" />
                
                <div className="relative z-10">
                  <h3 className="text-md font-bold mb-1.5 tracking-tight italic">Found a bug?</h3>
                  <p className="text-white/80 text-[11px] mb-5 leading-relaxed font-medium">
                    Something not working right inside your study station? Let our team handle it right away.
                  </p>

                  <div className="space-y-2">
                    <a href="mailto:support@ielsco.com" className="flex items-center gap-3 p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all border border-white/5">
                      <Mail size={14} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-white leading-none">General Support</p>
                        <p className="text-[9px] text-white/70 font-medium truncate mt-1">support@ielsco.com</p>
                      </div>
                    </a>
                    <a href="mailto:arbadza@ielsco.com" className="flex items-center gap-3 p-2.5 bg-white/10 rounded-xl hover:bg-white/20 transition-all border border-white/5">
                      <ShieldCheck size={14} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-white leading-none">Direct to Founder</p>
                        <p className="text-[9px] text-white/70 font-medium truncate mt-1">arbadza@ielsco.com</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Operational Heartbeat Status */}
              <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[10px] font-black uppercase text-[#2F4157] tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-500" /> Space Operational
                  </h4>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">All core dashboard components are live and running smooth.</p>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}