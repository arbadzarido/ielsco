"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PricingModal from "@/components/subscription/PricingModal";
import { createBrowserClient } from "@supabase/ssr";
import {
  Target,
  Briefcase,
  GraduationCap,
  Users,
  ExternalLink,
  Clock,
  MapPin,
  Crown,
  Lock,
  Filter,
  Search,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- MOCK DATA FOR OPPORTUNITIES (Content Placeholder) ---
const MOCK_OPPORTUNITIES = [
  {
    id: "1",
    title: "Chevening Scholarship 2026",
    type: "scholarship" as const,
    organization: "UK Government",
    description:
      "Fully funded master's scholarship to study in the UK for students from around the world with leadership potential.",
    deadline: "2026-03-15",
    location: "United Kingdom",
    requirements: "IELTS 6.5+, Bachelor's degree, 2 years work experience",
    link: "https://chevening.org",
    featured: true
  },
  {
    id: "2",
    title: "Google STEP Internship",
    type: "internship" as const,
    organization: "Google",
    description:
      "Software engineering internship program for first and second-year university students interested in tech.",
    deadline: "2026-02-28",
    location: "Remote/Multiple locations",
    requirements: "Computer Science major, Programming skills",
    link: "https://careers.google.com",
    featured: true
  },
  {
    id: "3",
    title: "IELS Community Lead Position",
    type: "leadership" as const,
    organization: "IELS",
    description:
      "Lead a team of volunteers to organize events, manage community engagement, and support learners.",
    deadline: "2026-02-20",
    location: "Remote",
    requirements: "6+ months IELS membership, Event attendance 80%+",
    link: "#",
    featured: false
  },
  {
    id: "4",
    title: "Fulbright Scholarship",
    type: "scholarship" as const,
    organization: "US Embassy",
    description:
      "Graduate study scholarship to pursue master's or PhD programs in the United States.",
    deadline: "2026-04-30",
    location: "United States",
    requirements: "TOEFL 90+, Bachelor's degree with GPA 3.0+",
    link: "https://fulbright.org",
    featured: false
  },
  {
    id: "5",
    title: "Microsoft Internship Program",
    type: "internship" as const,
    organization: "Microsoft",
    description:
      "12-week internship working on real projects with mentorship from senior engineers.",
    deadline: "2026-03-10",
    location: "Seattle, USA / Remote",
    requirements: "CS/Engineering major, Strong coding skills",
    link: "https://careers.microsoft.com",
    featured: false
  },
  {
    id: "6",
    title: "LPDP Scholarship",
    type: "scholarship" as const,
    organization: "Indonesian Government",
    description:
      "Full scholarship for Indonesian students to pursue master's or doctoral degrees abroad.",
    deadline: "2026-05-15",
    location: "Worldwide",
    requirements: "Indonesian citizen, IELTS 6.5+, GPA 3.0+",
    link: "https://lpdp.kemenkeu.go.id",
    featured: false
  }
];

// --- TYPE DEFINITIONS ---
type UserTier = "explorer" | "insider" | "visionary";

export default function OpportunitiesPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // State
  const [userData, setUserData] = useState<{
    id: string;
    name: string;
    tier: UserTier;
    avatar: string;
  }>({ 
    id: "", 
    name: "", 
    tier: "explorer", 
    avatar: "" 
  });
  
  const [loading, setLoading] = useState(true);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "scholarship" | "internship" | "leadership">("all");
  const [opportunities] = useState(MOCK_OPPORTUNITIES);

  // --- SINKRONISASI TIER & DATA ---
useEffect(() => {
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Ambil data Membership langsung (Source of Truth Tier)
    const { data: dbMembership } = await supabase
      .from("memberships")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // 2. Ambil data Profile (Nama & Avatar terbaru dari tabel users)
    const { data: dbUser } = await supabase
      .from("users")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    // 3. Mapping Tier (Mapping premium/visionary -> visionary)
    const dbTier = dbMembership?.tier;
    let uiTier: UserTier = "explorer";

    if (dbTier === "pro") {
      uiTier = "insider";
    } else if (dbTier === "premium" || dbTier === "visionary") {
      uiTier = "visionary";
    }

    setUserData({
      id: user.id, // Simpan ID auth ke state
      name: dbUser?.full_name || user.user_metadata?.full_name || "Member",
      avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || "",
      tier: uiTier,
    });
    
    setLoading(false);
  };

  fetchUser();
}, [supabase]);
  // Logic: Siapa yang bisa lihat? Insider & Visionary
  const hasAccess = userData.tier === "insider" || userData.tier === "visionary";

  const filteredOpportunities = filter === "all"
    ? opportunities
    : opportunities.filter((o) => o.type === filter);

  // Helper Functions for UI
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "scholarship": return GraduationCap;
      case "internship": return Briefcase;
      case "leadership": return Users;
      default: return Target;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "scholarship": return "bg-blue-100 text-blue-600";
      case "internship": return "bg-green-100 text-green-600";
      case "leadership": return "bg-purple-100 text-purple-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-8 flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E56668]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      userTier={userData.tier}
      userName={userData.name}
      userAvatar={userData.avatar}
    >
      <div className="min-h-screen bg-[#F7F8FA]">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
          
          {/* === LOCKED STATE (EXPLORER) === */}
          {!hasAccess ? (
            <div className="relative rounded-3xl overflow-hidden bg-[#2F4157] text-white p-8 lg:p-16 text-center shadow-2xl">
              {/* Background Glow */}
              <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#E56668] blur-[100px] opacity-20 rounded-full"></div>
              
              <div className="relative z-10 max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-lg">
                  <Lock className="text-white" size={40} />
                </div>
                
                <h1 className="text-3xl lg:text-5xl font-bold mb-6">
                  Unlock Exclusive Opportunities
                </h1>
                
                <p className="text-white/80 text-lg lg:text-xl mb-10 leading-relaxed">
                  Get access to a curated list of scholarships, internships, and leadership roles verified by IELS. 
                  Don't miss out on your next big break.
                </p>

                {/* Sneak Peek Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
                   <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3 mb-2 text-[#E56668]">
                         <GraduationCap size={24} />
                         <span className="font-bold text-2xl text-white">6+</span>
                      </div>
                      <p className="text-sm text-white/70">Scholarships Available</p>
                   </div>
                   <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3 mb-2 text-green-400">
                         <Briefcase size={24} />
                         <span className="font-bold text-2xl text-white">4+</span>
                      </div>
                      <p className="text-sm text-white/70">Global Internships</p>
                   </div>
                   <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3 mb-2 text-purple-400">
                         <Users size={24} />
                         <span className="font-bold text-2xl text-white">Active</span>
                      </div>
                      <p className="text-sm text-white/70">Leadership Roles</p>
                   </div>
                </div>

                <button 
                  onClick={() => setShowPricingModal(true)}
                  className="px-8 py-4 bg-white text-[#2F4157] rounded-full font-bold text-lg hover:scale-105 transition-transform inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Crown size={20} className="text-[#E56668]" />
                  Upgrade to Insider Access
                </button>
              </div>
            </div>
          ) : (
            
            /* === UNLOCKED STATE (INSIDER / VISIONARY) === */
            <>
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-[#2F4157] mb-2 flex items-center gap-3">
                    Opportunities Board <Sparkles className="text-yellow-400" fill="currentColor" />
                  </h1>
                  <p className="text-gray-600 max-w-xl">
                    Curated exclusively for our premium members. Find your next scholarship, internship, or leadership role here.
                  </p>
                </div>
                
                {/* Search / Filter Placeholder (Visual only for now) */}
                <div className="relative">
                   <input 
                     type="text" 
                     placeholder="Search opportunities..." 
                     className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E56668] w-full md:w-64"
                   />
                   <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                   { label: "Scholarships", icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50", count: opportunities.filter(o => o.type === "scholarship").length },
                   { label: "Internships", icon: Briefcase, color: "text-green-600", bg: "bg-green-50", count: opportunities.filter(o => o.type === "internship").length },
                   { label: "Leadership", icon: Users, color: "text-purple-600", bg: "bg-purple-50", count: opportunities.filter(o => o.type === "leadership").length },
                   { label: "Total Active", icon: Target, color: "text-[#E56668]", bg: "bg-red-50", count: opportunities.length },
                 ].map((stat, idx) => (
                   <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", stat.bg)}>
                        <stat.icon size={22} className={stat.color} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-[#2F4157]">{stat.count}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{stat.label}</p>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2 pt-4">
                {["all", "scholarship", "internship", "leadership"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t as any)}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-sm font-bold capitalize transition-all",
                      filter === t 
                        ? "bg-[#2F4157] text-white shadow-md" 
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Grid Content */}
              <div className="grid lg:grid-cols-2 gap-6">
                {filteredOpportunities.map((opportunity) => {
                  const Icon = getTypeIcon(opportunity.type);
                  const iconStyle = getTypeColor(opportunity.type);
                  const daysLeft = getDaysUntilDeadline(opportunity.deadline);
                  const isUrgent = daysLeft <= 14;

                  return (
                    <div
                      key={opportunity.id}
                      className={cn(
                        "group bg-white rounded-2xl border transition-all duration-300 hover:shadow-lg flex flex-col relative overflow-hidden",
                        opportunity.featured ? "border-[#E56668]/30" : "border-gray-100"
                      )}
                    >
                      {opportunity.featured && (
                         <div className="absolute top-0 right-0 bg-[#E56668] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider z-10">
                           Featured
                         </div>
                      )}

                      <div className="p-6 flex-1">
                        <div className="flex items-start gap-4 mb-4">
                           <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0", iconStyle)}>
                              <Icon size={24} />
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-opacity-10 border-opacity-20", iconStyle.replace('bg-', 'border-').replace('text-', 'border-'))}>
                                  {opportunity.type}
                                </span>
                              </div>
                              <h3 className="font-bold text-[#2F4157] text-lg leading-tight group-hover:text-[#E56668] transition-colors">
                                {opportunity.title}
                              </h3>
                              <p className="text-sm text-gray-500 font-medium">{opportunity.organization}</p>
                           </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-6 line-clamp-2 leading-relaxed">
                          {opportunity.description}
                        </p>

                        <div className="space-y-3 mb-6">
                           <div className="flex items-center gap-3 text-sm text-gray-600">
                              <MapPin size={16} className="text-gray-400" />
                              {opportunity.location}
                           </div>
                           <div className="flex items-center gap-3 text-sm text-gray-600">
                              <Clock size={16} className={isUrgent ? "text-red-500" : "text-gray-400"} />
                              <span>
                                Deadline: {new Date(opportunity.deadline).toLocaleDateString()} 
                                {isUrgent && <span className="text-red-500 font-bold ml-1">({daysLeft} days left)</span>}
                              </span>
                           </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 border border-gray-100">
                           <span className="font-bold text-gray-700 block mb-1">Requirements:</span>
                           {opportunity.requirements}
                        </div>
                      </div>

                      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                        <a
                           href={opportunity.link}
                           target="_blank"
                           rel="noopener noreferrer" 
                           className="flex-1 py-2.5 bg-[#2F4157] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#1e2b3a] transition-all"
                        >
                           Apply Now <ExternalLink size={14} />
                        </a>
                        <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">
                           Save
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredOpportunities.length === 0 && (
                <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center shadow-sm">
                  <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
                    <Search className="text-gray-300" size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-[#2F4157] mb-2">No opportunities found</h3>
                  <p className="text-gray-500">Try adjusting your filters to see more results.</p>
                  <button onClick={() => setFilter("all")} className="mt-6 text-[#E56668] font-bold text-sm hover:underline">
                    Clear all filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pricing Modal for Upgrades */}
      {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
    </DashboardLayout>
  );
}