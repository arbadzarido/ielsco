"use client";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect } from "react";
// ... import lain biarkan saja
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  Search, 
  MessageCircle, 
  Mail, 
  Book, 
  FileText, 
  Video, 
  ChevronDown, 
  ExternalLink,
  LifeBuoy,
  ShieldCheck,
  Zap,
  Bug,
  Target,
  GraduationCap,
  Library,
  Download,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- CATEGORIZED FAQ DATA ---
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

  export default function HelpCenterPage() {
  // --- TAMBAHAN KODE MULAI DARI SINI ---
    const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
 // --- GANTI STATE AWAL ---
const [userData, setUserData] = useState({
  name: "Learner",
  tier: "explorer" as "explorer" | "insider" | "visionary",
  avatar: ""
});

useEffect(() => {
  const getUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Ambil data Membership langsung (Source of Truth)
    const { data: dbMembership } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2. Ambil data User (Nama & Profile)
    const { data: dbUser } = await supabase
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Mapping Tier (Standard IELS)
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("goals");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Filter Logic: If searching, search ALL questions. If not, show active category.
  const displayFaqs = searchQuery 
    ? faqCategories.flatMap(cat => cat.questions.map(q => ({ ...q, category: cat.title })))
        .filter(q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) || q.a.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqCategories.find(cat => cat.id === activeCategory)?.questions || [];

  return (
    // GANTI BAGIAN INI:
// --- GANTI BAGIAN RETURN INI ---
<DashboardLayout 
  userName={userData.name} 
  userTier={userData.tier} 
  userAvatar={userData.avatar}
>
      <div className="min-h-screen bg-[#FDFDFD] pb-20">
        
        {/* === HERO SECTION === */}
        <div className="bg-[#304156] text-white py-16 px-4 lg:px-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E56668] rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              </div>
              <h1 className="text-4xl md:text-5xl font-black font-geologica tracking-tighter">
                How can we support your journey?
              </h1>
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#577E90]" size={20} />
                <input 
                  type="text"
                  placeholder="Search keywords (e.g. 'certificate', 'speaking', 'reset')..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white border-none rounded-2xl text-[#304156] text-sm focus:ring-4 focus:ring-[#CB2129]/20 transition-all shadow-2xl shadow-black/20 font-medium placeholder:text-[#CDC6BC]"
                />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 lg:px-12 -mt-8 relative z-20">
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* === LEFT SIDEBAR: CATEGORIES === */}
            <aside className="lg:w-64 flex-shrink-0 space-y-2 hidden lg:block">
              <p className="text-xs font-black text-[#577E90] uppercase tracking-widest px-4 mb-2">Categories</p>
              {faqCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setActiveCategory(cat.id); setSearchQuery(""); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300",
                    activeCategory === cat.id && !searchQuery
                      ? "bg-[#577E90]  text-white shadow-lg translate-x-1" 
                      : "text-[#577E90] hover:bg-[#F6F3EF]"
                  )}
                >
                  <span className={cn(activeCategory === cat.id && !searchQuery ? "text-[#CB2129]" : "opacity-50")}>{cat.icon}</span>
                  {cat.title}
                </button>
              ))}
            </aside>

            {/* === MAIN CONTENT: ACCORDION === */}
            <div className="flex-1 space-y-8">
              
              {/* Mobile Category Select */}
              <div className="lg:hidden overflow-x-auto flex gap-2 pb-2 no-scrollbar">
                {faqCategories.map((cat) => (
                   <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setSearchQuery(""); }}
                    className={cn(
                      "flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all",
                      activeCategory === cat.id && !searchQuery
                        ? "bg-[#E56668] text-white border-[#E56668]"
                        : "bg-white text-[#577E90] border-[#CDC6BC]"
                    )}
                   >
                     {cat.title}
                   </button>
                ))}
              </div>

              <div className="bg-white rounded-[32px] border border-[#CDC6BC]/40 shadow-sm p-6 lg:p-10 min-h-[500px]">
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-2xl font-black text-[#304156]">
                    {searchQuery ? `Search Results for "${searchQuery}"` : faqCategories.find(c => c.id === activeCategory)?.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {displayFaqs.length > 0 ? displayFaqs.map((faq, idx) => (
                    <div 
                      key={idx}
                      className="border-b border-[#F6F3EF] last:border-0 pb-4 last:pb-0"
                    >
                      <button 
                        onClick={() => setOpenFaq(openFaq === String(idx) ? null : String(idx))}
                        className="w-full py-3 flex items-start justify-between text-left group"
                      >
                        <h4 className="font-bold text-[#304156] text-base group-hover:text-[#CB2129] transition-colors pr-8">
                          {faq.q}
                        </h4>
                        <ChevronDown 
                          size={20} 
                          className={cn("text-[#CDC6BC] flex-shrink-0 transition-transform duration-300 mt-1", openFaq === String(idx) && "rotate-180 text-[#CB2129]")} 
                        />
                      </button>
                      <AnimatePresence>
                        {openFaq === String(idx) && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-sm text-[#577E90] leading-relaxed font-medium"
                          >
                            {faq.a}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )) : (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-[#F6F3EF] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-[#CDC6BC]" size={24} />
                      </div>
                      <p className="text-[#304156] font-bold">No answers found.</p>
                      <p className="text-xs text-[#577E90]">Try adjusting your search terms.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* === RIGHT: CONTACT SIDEBAR === */}
            <aside className="lg:w-80 space-y-6">
              <div className="bg-[#E56668] p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
                <Bug className="absolute -top-4 -right-4 text-white/10 w-24 h-24 rotate-12" />
                
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2 italic">Found a bug?</h3>
                  <p className="text-white/80 text-xs mb-6 leading-relaxed">
                    Something not working right? Let our engineering team know directly.
                  </p>

                  <div className="space-y-3">
                    <a href="mailto:support@ielsco.com" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all cursor-pointer">
                      <Mail size={16} />
                      <div>
                        <p className="text-xs font-bold">General Support</p>
                        <p className="text-[10px] opacity-70">support@ielsco.com</p>
                      </div>
                    </a>
                    <a href="mailto:arbadza@ielsco.com" className="flex items-center gap-3 p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all cursor-pointer">
                      <ShieldCheck size={16} />
                      <div>
                        <p className="text-xs font-bold">Direct to Founder</p>
                        <p className="text-[10px] opacity-70">arbadza@ielsco.com</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="bg-white border border-[#CDC6BC]/40 p-6 rounded-[24px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#304156]">System Operational</h4>
                    <p className="text-[10px] text-[#577E90]">Last checked: 1 min ago</p>
                  </div>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}