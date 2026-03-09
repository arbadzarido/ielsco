"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createBrowserClient } from "@supabase/ssr";
import {
  MessageCircle,
  Shield,
  Users,
  Award,
  Crown,
  Sparkles,
  Heart,
  ExternalLink,
  X,
  Plus,
  ArrowRight,
  Bell,
  CheckCircle,
  Clock,
  Zap,
  Calendar,
  Gift,
  Star,
  Video,
  BookOpen,
  Target,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Image from "next/image";
import PricingModal from "@/components/subscription/PricingModal";
import OnboardingModal from "@/components/community/OnboardingModal";
import { memberStoriesData } from "@/data/member-stories";
import { generateSlug } from "@/utils/slug";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
type UserTier = "explorer" | "insider" | "visionary";

interface MembershipData {
  tier: UserTier;
  status: "active" | "expired" | "trial";
  startDate: string;
  endDate: string;
  daysRemaining: number;
  autoRenew: boolean;
}

// 1. PISAHIN LOGIKA UTAMA KE DALAM KOMPONEN BARU
function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [userData, setUserData] = useState<{
    id: string;
    name: string;
    email: string;
    tier: UserTier;
    avatar: string;
  }>({ 
    id: "", 
    name: "", 
    email: "", 
    tier: "explorer",
    avatar: "" 
  });

  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [counts, setCounts] = useState({ members: 0, stories: 0, careers: 0, abroad: 0 });
  const [todayActivity, setTodayActivity] = useState<any>(null);

  const TierBadge = ({ tier }: { tier: UserTier }) => {
  const config = {
    explorer: { icon: Shield, label: "Explorer", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
    insider: { icon: Zap, label: "Insider", bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300" },
    visionary: { icon: Crown, label: "Visionary", bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300" }
  };
  const { icon: Icon, label, bg, text, border } = config[tier];
  
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border-2", bg, text, border)}>
      <Icon size={14} strokeWidth={3} />
      {label}
    </span>
  );
};
  // Check for payment success
  useEffect(() => {
    const paymentSuccess = searchParams.get('payment');
    const newMember = searchParams.get('new');
    
    if (paymentSuccess === 'success' && newMember === 'true') {
      setShowOnboarding(true);
    }
  }, [searchParams]);

  // Data Initialization & Auth
  useEffect(() => {
   const initData = async () => {
  setLoading(true);
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    router.push("/sign-in");
    return;
  }

  // TEMBAK LANGSUNG KE TABEL MEMBERSHIPS
  const { data: dbMembership, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", user.id) // Pakai user_id sesuai kolom di SQL tadi
    .maybeSingle(); // Pakai maybeSingle biar nggak error kalau datanya emang belum ada

  // Mapping Tier
  const dbTier = dbMembership?.tier;
  let uiTier: UserTier = "explorer";

  if (dbTier === "pro") {
    uiTier = "insider";
  } else if (dbTier === "visionary" || dbTier === "premium") {
    uiTier = "visionary";
  } else {
    uiTier = "explorer";
  }

  setUserData({
    id: user.id,
    name: user.user_metadata?.full_name || "Member",
    email: user.email || "",
    tier: uiTier,
    avatar: user.user_metadata?.avatar_url || ""
  });

  if (dbMembership) {
    const endDate = new Date(dbMembership.end_date);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    setMembership({
      tier: uiTier,
      status: dbMembership.status,
      startDate: dbMembership.start_date,
      endDate: dbMembership.end_date,
      daysRemaining: daysRemaining,
      autoRenew: dbMembership.auto_renew || false,
    });
  }

  setLoading(false);
};
    initData();
  }, [router, supabase]);

  // Count-up animation
  useEffect(() => {
    if (loading) return;
    const targets = { members: 6800, stories: 810, careers: 135, abroad: 35 };
    const duration = 2000;
    const steps = 60;
    const stepTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      setCounts({
        members: Math.floor(targets.members * progress),
        stories: Math.floor(targets.stories * progress),
        careers: Math.floor(targets.careers * progress),
        abroad: Math.floor(targets.abroad * progress)
      });
      if (currentStep >= steps) {
        clearInterval(timer);
        setCounts(targets);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [loading]);

  // Check today's activity
  useEffect(() => {
    const weeklyActivities = [
      {
        day: "Monday",
        title: "Speaking Class",
        time: "19:00 WIB",
        desc: "Practice session with a dedicated mentor to improve fluency and pronunciation.",
        color: "bg-[#577E90]",
        icon: <Users size={20} />,
        requiresPremium: true,
      },
      {
        day: "Wednesday",
        title: "Daily Conversation Club",
        time: "20:00 WIB",
        desc: "Master real-life English! Topic-based practice for daily natural speaking.",
        color: "bg-[#304156]",
        icon: <MessageCircle size={20} />,
        requiresPremium: true,
      },
      {
        day: "Friday",
        title: "Open Thought Discussion",
        time: "19:30 WIB",
        desc: "A free-talk session to share your thoughts and critical thinking in English.",
        color: "bg-[#577E90]",
        icon: <Sparkles size={20} />,
        requiresPremium: false,
      },
      {
        day: "Saturday",
        title: "Talk Room: Community Spotlight",
        time: "14:00 WIB",
        desc: "Empowering our members. Hear real stories and insights from fellow IELS students.",
        color: "bg-[#304156]",
        icon: <Award size={20} />,
        requiresPremium: true,
      }
    ];

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];
    const activity = weeklyActivities.find(a => a.day === today);
    
    if (activity) {
      setTodayActivity(activity);
    }
  }, []);

  const weeklyActivities = [
    {
      day: "Monday",
      title: "Speaking Class",
      time: "19:00 WIB",
      desc: "Practice session with a dedicated mentor to improve fluency and pronunciation.",
      color: "bg-[#577E90]",
      icon: <Users size={20} />,
      gCalLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=IELS+Speaking+Class",
      requiresPremium: true,
    },
    {
      day: "Wednesday",
      title: "Daily Conversation Club",
      time: "20:00 WIB",
      desc: "Master real-life English! Topic-based practice for daily natural speaking.",
      color: "bg-[#304156]",
      icon: <MessageCircle size={20} />,
      gCalLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=IELS+Conversation+Club",
      requiresPremium: true,
    },
    {
      day: "Friday",
      title: "Open Thought Discussion",
      time: "19:30 WIB",
      desc: "A free-talk session to share your thoughts and critical thinking in English.",
      color: "bg-[#577E90]",
      icon: <Sparkles size={20} />,
      gCalLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=IELS+Free+Talk",
      requiresPremium: false,
    },
    {
      day: "Saturday",
      title: "Talk Room: Community Spotlight",
      time: "14:00 WIB",
      desc: "Empowering our members. Hear real stories and insights from fellow IELS students.",
      color: "bg-[#304156]",
      icon: <Award size={20} />,
      gCalLink: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=IELS+Talk+Room",
      requiresPremium: true,
    }
  ];

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="p-12 flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CB2129]"></div>
        </div>
      </DashboardLayout>
    );
  }

  const isExplorer = userData.tier === "explorer";
  const hasPremiumAccess = userData.tier === "insider" || userData.tier === "visionary";

  const insiderBenefits = [
    {
      icon: <Video size={20} />,
      title: "4 Weekly Live Sessions",
      desc: "Mon, Wed, Fri, Sat - Unlimited access to all speaking practice sessions"
    },
    {
      icon: <MessageCircle size={20} />,
      title: "WhatsApp Inner Circle",
      desc: "Priority mentoring, exclusive resources, and direct mentor access"
    },
    {
      icon: <BookOpen size={20} />,
      title: "Learning Resources Library",
      desc: "Premium study materials, practice tests, and vocabulary guides"
    },
    {
      icon: <Target size={20} />,
      title: "Certificate of Participation",
      desc: "Official certificate upon completion for your portfolio"
    }
  ];

  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F6F3EF]">
        
      {/* ── HERO: COMMUNITY HUB ─────────────────────────────────────── */}
<div className="relative bg-[#304156] text-white overflow-hidden py-12 lg:py-16 px-4 sm:px-8 lg:px-12">
  {/* Decorative blurs */}
  <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
  <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#577E90]/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

  <div className="max-w-7xl mx-auto relative z-10">
    <div className="text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6">
        <Users size={16} />
        <span>IELS LOUNGE</span>
      </div>
      
      <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
        Practice and Connect
      </h1>
      
      <p className="text-white/80 text-base lg:text-lg leading-relaxed">
       Grow together with ambitious peers in our safe space for daily activities.
      </p>
    </div>
  </div>
</div>

        <div className="max-w-7xl mx-auto px-4 lg:px-12 py-12">
          
          {/* ===== UPGRADE CTA FOR FREE USERS ===== */}
          {isExplorer && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 bg-gradient-to-br from-[#304156] to-[#3d4f66] rounded-[32px] overflow-hidden shadow-sm"
            >
              <div className="p-8 md:p-10">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  {/* Left: Headline */}
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#CB2129] rounded-full text-white text-xs font-bold mb-4">
                      <Crown size={14} />
                      UPGRADE TO INSIDER
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                      Unlock Your Full Potential
                    </h2>
                    <p className="text-white/70 text-lg mb-8">
                      Get unlimited access to all weekly sessions, priority mentoring, and exclusive resources to accelerate your English mastery.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-6">
                      <button
                        onClick={() => setShowPricingModal(true)}
                        className="px-8 py-4 bg-[#CB2129] text-white rounded-2xl font-bold hover:bg-[#a81b22] transition-all shadow-lg flex items-center gap-2"
                      >
                        See Insider Benefits
                        <ArrowRight size={20} />
                      </button>
                    </div>

                    <div className="inline-flex items-baseline gap-2 text-white">
                      <span className="text-sm opacity-60">Starting from</span>
                      <span className="text-3xl font-bold">Rp50k</span>
                      <span className="text-sm opacity-60 line-through">Rp75K</span>
                      <span className="text-xs bg-[#CB2129] px-2 py-1 rounded-full font-bold ml-2">First Three Months</span>
                    </div>
                  </div>

                  {/* Right: Benefits Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {insiderBenefits.map((benefit, idx) => (
                      <div 
                        key={idx}
                        className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5"
                      >
                        <div className="w-10 h-10 bg-[#577E90] rounded-xl flex items-center justify-center text-white mb-3">
                          {benefit.icon}
                        </div>
                        <h3 className="font-bold text-white mb-1 text-sm">{benefit.title}</h3>
                        <p className="text-white/60 text-xs leading-relaxed">{benefit.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

{/* ACTIVE MEMBERSHIP STATUS */}
{hasPremiumAccess && membership && (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mb-12"
  >
    <div className={cn(
      "rounded-[32px] p-6 md:p-8 shadow-sm relative overflow-hidden border",
      membership.status === "active" && membership.daysRemaining > 7
        ? "bg-gradient-to-br from-[#304156] to-[#3d4f66] text-white border-[#304156]"
        : "bg-gradient-to-br from-[#CB2129] to-[#a81b22] text-white border-[#CB2129]"
    )}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24" />
      
      <div className="relative z-10 grid lg:grid-cols-3 gap-6 items-center">
        {/* Status Info */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
              {membership.status === "active" && membership.daysRemaining > 7 ? (
                <CheckCircle size={24} />
              ) : (
                <Clock size={24} />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold capitalize">
                {userData.tier} Membership {membership.status === "active" && membership.daysRemaining > 7 ? "Active" : "Expiring Soon"}
              </h3>
              <p className="text-white/70 text-sm">
                {membership.daysRemaining > 7
                  ? `Valid until ${new Date(membership.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`
                  : `Only ${membership.daysRemaining} days remaining`
                }
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1">Days Remaining</p>
              <p className="text-3xl font-bold">{membership.daysRemaining}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1">Auto-Renew</p>
              <p className="text-3xl font-bold">{membership.autoRenew ? "ON" : "OFF"}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {membership.daysRemaining <= 7 && (
            <button
              onClick={() => setShowPricingModal(true)}
              className="w-full px-6 py-4 bg-white text-[#304156] rounded-2xl font-bold hover:bg-gray-100 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Zap size={18} />
              Renew Now
            </button>
          )}
          <Link
            href="/dashboard/settings/membership"
            className="w-full text-center px-6 py-3 border-2 border-white/30 rounded-2xl font-semibold hover:bg-white/10 transition-all"
          >
            Manage Membership
          </Link>
          {/* 🔁 Replaced WhatsApp button with onboarding guide link */}
          <Link
            href="/dashboard/community/start"
            className="w-full text-center px-6 py-3 bg-[#577E90] rounded-2xl font-bold hover:bg-[#4a6d7d] transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            View Onboarding Guide
          </Link>
        </div>
      </div>
    </div>
  </motion.div>
)}

          {/* TODAY'S ACTIVITY REMINDER */}
          {todayActivity && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-12 bg-white border border-[#CDC6BC] rounded-[24px] p-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("p-4 rounded-2xl text-white shadow-sm", todayActivity.color)}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase text-[#CB2129] tracking-widest">TODAY'S SESSION</span>
                      {!todayActivity.requiresPremium && (
                        <span className="text-[10px] font-bold bg-[#577E90] text-white px-2 py-0.5 rounded-full">FREE</span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-[#304156]">{todayActivity.title}</h3>
                    <p className="text-[#CB2129] font-bold text-sm">{todayActivity.time}</p>
                  </div>
                </div>
                
                {(!todayActivity.requiresPremium || hasPremiumAccess) ? (
                  <a
                    href="https://discord.gg/ak6nYUME"
                    target="_blank"
                    className="px-8 py-3 bg-[#304156] text-white rounded-2xl font-bold hover:bg-[#304156]/90 transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <ExternalLink size={16} />
                    Join Session
                  </a>
                ) : (
                  <button
                    onClick={() => setShowPricingModal(true)}
                    className="px-8 py-3 bg-[#304156] text-white rounded-2xl font-bold hover:bg-[#253344] transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    Upgrade to Join
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Main Layout Grid */}
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Content: Activities & Channels */}
            <div className="flex-1 space-y-8">
              
              {/* Weekly Segments Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#304156]">Weekly Activity Segments</h2>
                  <div className="h-px flex-1 mx-6 bg-[#CDC6BC] hidden md:block" />
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  {weeklyActivities.map((act, idx) => {
                    const isLocked = act.requiresPremium && !hasPremiumAccess;
                    
                    return (
                      <motion.div 
                        whileHover={{ scale: isLocked ? 1 : 1.02 }}
                        key={idx} 
                        className={cn(
                          "relative bg-white border border-[#CDC6BC] rounded-[24px] p-6 transition-all overflow-hidden",
                          isLocked ? "opacity-60" : "hover:shadow-sm"
                        )}
                      >
                        {isLocked && (
                          <div className="absolute inset-0 bg-[#F6F3EF]/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-[24px]">
                            <div className="text-center">
                              <div className="w-12 h-12 bg-[#304156] rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Crown size={24} className="text-white" />
                              </div>
                              <p className="text-sm font-bold text-[#304156]">Insider Access Required</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between mb-4">
                          <div className={cn("p-3 rounded-2xl text-white shadow-sm", act.color)}>
                            {act.icon}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs font-bold text-[#577E90] bg-[#F6F3EF] px-3 py-1 rounded-full">{act.day}</span>
                            {!act.requiresPremium && (
                              <span className="text-[9px] font-bold text-white bg-[#577E90] px-2 py-0.5 rounded-full">FREE</span>
                            )}
                          </div>
                        </div>
                        <h4 className="text-lg font-bold text-[#304156] mb-1">{act.title}</h4>
                        <p className="text-[#CB2129] text-xs font-bold mb-3">{act.time}</p>
                        <p className="text-[#577E90] text-sm leading-relaxed mb-6">{act.desc}</p>
                        
                        {!isLocked && (
                          <a 
                            href={act.gCalLink} 
                            target="_blank" 
                            className="flex items-center gap-2 text-xs font-bold text-[#304156] hover:text-[#CB2129] transition-colors"
                          >
                            <Bell size={14} />
                            Add to Calendar
                          </a>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </section>

            </div>

        {/* ===== RIGHT SIDEBAR ===== */}
<aside className="lg:w-1/3 space-y-6">
  <div className="sticky top-24 space-y-6">

    {/* Member Spotlight + Share Your Journey — ONE unified card */}
    <div className="bg-white border border-gray-200 rounded-[24px] overflow-hidden shadow-sm">
      
      {/* Header area */}
      <div className="p-6 pb-0">
        <Image
          src="/images/contents/general/iels_insight.png"
          alt="IELS Insight"
          width={180}
          height={40}
          className="mb-6"
        />
        <h3 className="text-xl font-bold text-[#304156] mb-4 border-b border-gray-100 pb-4">
          Member Spotlight
        </h3>
      </div>

      {/* Stories list */}
      <div className="px-6 space-y-5 pb-6">
        {memberStoriesData.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex gap-4 items-start group">
            <div className="relative w-[72px] h-[72px] rounded-2xl overflow-hidden flex-shrink-0 border-2 border-gray-100 shadow-sm">
              <Image
                src={item.author.avatar}
                alt={item.author.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="text-[10px] font-black uppercase text-[#577E90] tracking-widest">
                {item.location}
              </p>
              <p className="font-bold text-[#304156] leading-tight line-clamp-2 text-sm group-hover:text-[#577E90] transition-colors">
                {item.title}
              </p>
              <Link
                href={`https://ielsco.com/stories/${generateSlug(item.title)}`}
                target="_blank"
                className="text-[10px] font-bold text-[#577E90] hover:underline mt-1 flex items-center gap-1"
              >
                Read More <ArrowRight size={10} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Explore All Stories button */}
      <div className="px-6 pb-6">
        <Link
          href="https://ielsco.com/stories"
          target="_blank"
          className="flex items-center justify-center gap-2 w-full py-3 bg-[#304156] text-white rounded-2xl font-bold text-xs hover:bg-[#253344] transition-all"
        >
          Explore All Stories
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t border-gray-100" />

      {/* Share Your Journey — same card, different bg */}
      <div className="p-6 bg-[#304156] relative overflow-hidden">
        {/* Decorative circle */}
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#577E90]/30 rounded-full" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Heart size={16} fill="white" className="text-white" />
            Share Your Journey
          </h3>
          <p className="text-white/70 text-xs leading-relaxed mb-5">
            Did you ace your IELTS or get a scholarship? Inspire 6,800+ members!
          </p>
          <button
            onClick={() => setShowStoryModal(true)}
            className="w-full py-3 bg-white text-[#304156] rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Submit Story
          </button>
        </div>
      </div>

    </div>
    {/* end unified card */}

  </div>
</aside>
            
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showStoryModal && (
          <div className="fixed inset-0 bg-[#304156]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] max-w-xl w-full p-8 shadow-sm relative"
            >
              <button onClick={() => setShowStoryModal(false)} className="absolute top-6 right-6 p-2 hover:bg-[#F6F3EF] rounded-full transition-colors">
                <X size={20} />
              </button>
              <h3 className="text-2xl font-bold text-[#304156] mb-2">Inspire the Community</h3>
              <p className="text-[#577E90] mb-8">Share your learning journey and get featured on IELS Insight.</p>
              
              <form className="space-y-4">
                 <div>
                   <label className="text-xs font-black uppercase tracking-widest text-[#577E90] block mb-2">Story Title</label>
                   <input type="text" placeholder="How I landed my first scholarship..." className="w-full bg-[#F6F3EF] border border-[#CDC6BC] rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#CB2129] focus:border-transparent outline-none" />
                 </div>
                 <div>
                   <label className="text-xs font-black uppercase tracking-widest text-[#577E90] block mb-2">Description</label>
                   <textarea rows={4} className="w-full bg-[#F6F3EF] border border-[#CDC6BC] rounded-2xl p-4 text-sm focus:ring-2 focus:ring-[#CB2129] focus:border-transparent outline-none resize-none" />
                 </div>
                 <button type="button" onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSdpfik-xAviTLsauSN_h4yVI-Af19ydbRC6-nM0QGDmuPEWIA/viewform')} className="w-full bg-[#304156] text-white py-4 rounded-2xl font-bold shadow-sm hover:bg-[#a81b22] transition-all">
                    Proceed to Official Form
                 </button>
              </form>
            </motion.div>
          </div>
        )}

        {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} userTier={userData.tier} />}
        {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
      </AnimatePresence>
    </DashboardLayout>
  );
}

// 2. FUNGSI UTAMA YANG NGEBUNGKUS PAKE SUSPENSE
export default function CommunityPage() {
  return (
    <Suspense fallback={
      <div className="p-12 flex items-center justify-center min-h-screen bg-[#F6F3EF]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CB2129]"></div>
      </div>
    }>
      <CommunityContent />
    </Suspense>
  );
}