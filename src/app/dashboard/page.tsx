"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import GoalDashboardWidget from "@/components/goals/GoalDashboardWidget";
import PricingModal from '@/components/subscription/PricingModal';
import { createBrowserClient } from "@supabase/ssr";
import GIFPopup from "@/components/GIFPopup";
import { eventsData } from "@/data/events"; // <--- IMPORT PENTING INI
import {
  Calendar,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  CheckCircle2,
  Crown,
  Lock,
  Zap,
  MoreHorizontal,
  LogOut,
  ChevronRight,
  MapPin,
  ExternalLink,
  Target
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- TYPES ---

// --- TYPES (Updated) ---
type GoalTask = {
  id: string;
  title: string;
  weight: number;
  is_completed: boolean;
  task_type: 'system' | 'self_track' | 'mentor_assessed';
};
type ActiveGoal = {
  id: string;
  objective: string;
  destination: string;
  target_deadline: string;
  overall_progress: number;
  tasks: GoalTask[];
} | null;

// --- TYPES (Updated) ---
type DashboardData = {
  user: {
    id: string;
    name: string;
    tier: "explorer" | "insider" | "visionary"; // <--- GANTI INI
    avatar: string;
    institution: string;
    batch: string;
  };
  stats: {
    events_attended: number;
    contributions: number;
    hours: number;
    streak: number;
  };
  activeGoal: ActiveGoal;
  upcomingEvents: any[];
  recentActivity: any[];
};

// --- MICRO COMPONENTS ---

const StatCard = ({ label, value, icon: Icon, variant, delay }: any) => {
  // Mapping style berdasarkan variant warna
  const styles: any = {
    blue: {
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      hoverBorder: "hover:border-blue-200",
      shadow: "shadow-blue-100",
    },
    green: {
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      hoverBorder: "hover:border-green-200",
      shadow: "shadow-green-100",
    },
    yellow: {
      iconBg: "bg-yellow-50",
      iconColor: "text-yellow-600",
      hoverBorder: "hover:border-yellow-200",
      shadow: "shadow-yellow-100",
    },
    orange: {
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      hoverBorder: "hover:border-orange-200",
      shadow: "shadow-orange-100",
    },
  };

  const theme = styles[variant] || styles.blue;

  return (
    <div 
      className={cn(
        "group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg", // Efek naik & shadow besar
        theme.hoverBorder, // Border berubah warna saat hover
        "flex flex-col justify-between h-32 cursor-default relative overflow-hidden"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className={cn(
          "p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110", // Icon membal
          theme.iconBg, 
          theme.iconColor
        )}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        
        {/* Dekorasi kecil di kanan atas saat hover */}
        <div className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
          theme.iconColor
        )}>
          <TrendingUp size={16} />
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="text-3xl font-bold text-[#2F4157] tracking-tight group-hover:translate-x-1 transition-transform duration-300">
          {value}
        </h3>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1 group-hover:text-gray-500 transition-colors">
          {label}
        </p>
      </div>

      {/* Background Gradient Halus saat Hover (Optional decorative) */}
      <div className={cn(
        "absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-0 group-hover:opacity-20 transition-all duration-500 blur-xl",
        theme.iconBg
      )} />
    </div>
  );
};
const ActionButton = ({ icon: Icon, label, subLabel, href, isLocked, onClick }: any) => {
  const content = (
    <div className={cn(
      "relative overflow-hidden group w-full p-4 rounded-2xl border transition-all duration-200 text-left",
      isLocked 
        ? "bg-gray-50 border-gray-200 opacity-80" 
        : "bg-white border-gray-100 hover:border-[#E56668]/30 hover:shadow-md active:scale-[0.98]"
    )}>
      <div className="flex items-center gap-4 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors",
          isLocked ? "bg-gray-200 text-gray-400" : "bg-[#F5F7FA] text-[#2F4157] group-hover:bg-[#E56668] group-hover:text-white"
        )}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h4 className={cn("font-bold text-sm", isLocked ? "text-gray-500" : "text-[#2F4157]")}>
            {label}
          </h4>
          <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{subLabel}</p>
        </div>
        {isLocked ? (
          <Lock size={16} className="text-gray-300" />
        ) : (
          <ChevronRight size={16} className="text-gray-300 group-hover:text-[#E56668] group-hover:translate-x-1 transition-transform" />
        )}
      </div>
    </div>
  );

  if (isLocked) return <button onClick={onClick} className="w-full">{content}</button>;
  return <Link href={href} className="w-full block">{content}</Link>;
};

// --- SKELETON LOADER ---
const DashboardSkeleton = () => (
  <div className="p-6 max-w-7xl mx-auto space-y-8 animate-pulse">
    <div className="h-64 bg-gray-200 rounded-3xl w-full" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl" />)}
    </div>
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 h-96 bg-gray-200 rounded-2xl" />
      <div className="h-96 bg-gray-200 rounded-2xl" />
    </div>
  </div>
);

// --- MAIN PAGE COMPONENT ---

export default function DashboardPage() {
  
// ... (di dalam component DashboardPage) ...


  const router = useRouter();
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
);

  // --- STATE DECLARATIONS ---
  const [loading, setLoading] = useState(true);
  const [showProModal, setShowProModal] = useState(false);
  
// Dashboard Data State
  const [data, setData] = useState<DashboardData>({
    user: { id: "", name: "", tier: "explorer", avatar: "", institution: "-", batch: "-" },
    stats: { events_attended: 0, contributions: 0, hours: 0, streak: 0 },
    activeGoal: null, // <--- TAMBAHKAN INI
    upcomingEvents: [],
    recentActivity: []
  });

 // --- DATA FETCHING & LOGIC INTEGRATION ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. Cek User Login
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/sign-in");
        return;
      }

      // 2. Ambil Data User Profile (untuk Nama & Batch)
      const { data: dbUser } = await supabase
        .from("users")
        .select(`*, user_profiles(*), memberships(tier)`)
        .eq("id", authUser.id)
        .single();

      // 3. Ambil Data Registrasi dari Database
      // Kita butuh tau event mana saja yang user ini sudah daftar
      const { data: registrations } = await supabase
        .from("event_registrations")
        .select(`event_id, attended`)
        .eq("user_id", authUser.id);

      const now = new Date();

      // --- CORE LOGIC: INTEGRASI EVENTS.TS ---

      // A. Logic "Upcoming / Open Events"
      // Syarat:
      // 1. Ambil SEMUA event dari events.ts
      // 2. Filter: Deadline registrasi belum lewat (masih bisa daftar/sedang running)
      // 3. Cek Status: Apakah user sudah terdaftar di DB? (untuk nentuin tombol Register/View)
      const upcoming = eventsData
        .filter(ev => {
          const deadline = new Date(ev.registrationDateDeadline);
          // Set deadline ke akhir hari (23:59:59) agar event hari ini tetap muncul
          deadline.setHours(23, 59, 59); 
          return deadline >= now; 
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) // Urutkan dari yang terdekat
        .map(ev => {
          // Cek apakah ID event ini ada di daftar registrasi user
          const isRegistered = registrations?.some(r => r.event_id === ev.id);

          return {
            id: ev.id,
            title: ev.title,
            date: ev.startDate, 
            type: "Bootcamp", // Bisa disesuaikan jika di events.ts ada field type
            registrationLink: ev.registrationLink,
            isRegistered: isRegistered // Flag penting untuk UI (Tombol Hijau/Merah)
          };
        });

      // B. Logic "Learning Log / History"
      // Syarat:
      // 1. Deadline registrasi SUDAH lewat
      // 2. WAJIB: User sudah terdaftar (isRegistered = true). 
      //    (Kita ga mau nampilin event masa lalu yang user gak ikut)
      const history = eventsData
        .filter(ev => {
          const deadline = new Date(ev.registrationDateDeadline);
          deadline.setHours(23, 59, 59);
          
          const isRegistered = registrations?.some(r => r.event_id === ev.id);
          
          // Hanya masuk history jika sudah lewat DAN user terdaftar
          return deadline < now && isRegistered; 
        })
        .map(ev => {
          // Ambil status kehadiran (attended) dari DB
          const regData = registrations?.find(r => r.event_id === ev.id);
          return {
            id: ev.id,
            title: ev.title,
            date: ev.startDate,
            type: "attendance",
            // Visualisasi: Centang Hijau jika 'attended: true', Jam Abu-abu jika absen
            icon: regData?.attended ? CheckCircle2 : Clock,
            color: regData?.attended ? "text-green-600 bg-green-50" : "text-gray-400 bg-gray-50"
          };
        });

      // C. Logic Statistik (Murni dari Database)
      // Statistik harus berdasarkan data valid yang tercatat di sistem
      const eventsAttendedCount = registrations?.filter(r => r.attended).length || 0;
      const learningHours = eventsAttendedCount * 2; // Asumsi 1 event = 2 jam
 // ... logic fetch events sebelumnya ...

      // --- LOGIC MAPPING TIER BARU ---
      const dbTier = dbUser?.memberships?.[0]?.tier;
      let uiTier: "explorer" | "insider" | "visionary" = "explorer";

      if (dbTier === "pro") {
        uiTier = "insider"; // Mapping lama "pro" ke "insider"
      } else if (dbTier === "premium" || dbTier === "visionary") {
        uiTier = "visionary";
      } else {
        uiTier = "explorer";
      }
      
      // Update State Dashboard
      setData({
        user: {
          id: authUser.id,
          name: dbUser?.full_name || authUser.user_metadata?.full_name || "Learner",
          tier: uiTier, // <--- PAKAI HASIL MAPPING DI ATAS
          avatar: authUser.user_metadata?.avatar_url || "",
          institution: dbUser?.user_profiles?.[0]?.institution || "IELS Community",
          batch: dbUser?.user_profiles?.[0]?.batch || "2026 Cohort"
        },
        // ... sisa properti stats, activeGoal, dll biarkan sama ...
        stats: {
          events_attended: eventsAttendedCount,
          contributions: 0, // Bisa diupdate nanti
          hours: learningHours,
          streak: 1 // Placeholder streak
        },
        activeGoal: data.activeGoal, // Pertahankan state goal jika ada
        upcomingEvents: upcoming,
        recentActivity: history.slice(0, 5) // Ambil 5 history terakhir
      });

      setTimeout(() => setLoading(false), 500);
    };

    fetchData();
  }, [router, supabase]); // Dependency array

  // --- ACTIONS ---

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  // --- RENDER ---

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

// ... (sebelum return) ...

  const isExplorer = data.user.tier === "explorer";
  const isInsider = data.user.tier === "insider";
  const isVisionary = data.user.tier === "visionary";
  
  // Helper: Punya akses premium? (Insider ATAU Visionary)
  const hasPremiumAccess = isInsider || isVisionary; 

  return (
    // Pastikan userTier dikirim ke Layout
        <>
    <DashboardLayout userTier={data.user.tier} userName={data.user.name} userAvatar={data.user.avatar}>
      
      <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8">
        
{/* --- 1. HERO SECTION --- */}
        <div className="relative rounded-[32px] overflow-hidden bg-[#304156] text-white shadow-lg border border-[#CDC6BC]/20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#CB2129] opacity-10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#577E90] opacity-10 blur-[80px] rounded-full -translate-x-1/3 translate-y-1/3" />

          <div className="relative z-10 p-8 lg:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                {/* LOGIKA BADGE UDAH DIBENERIN 👇 */}
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  !isExplorer ? "bg-white/10 border-[#CB2129] text-[#CB2129]" : "bg-white/10 border-[#CDC6BC]/30 text-[#CDC6BC]"
                )}>
                  {!isExplorer ? "Insider Member" : "Explorer"}
                </span>
                <span className="text-white/40 text-xs">•</span>
                <span className="text-[#CDC6BC] text-xs font-bold tracking-widest uppercase">{data.user.batch}</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black leading-tight">
                Welcome back, {data.user.name.split(" ")[0]}!
              </h1>
              <p className="text-[#CDC6BC] max-w-lg text-sm lg:text-base leading-relaxed">
                Your learning journey continues. Track your progress and achieve your goals.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* LOGIKA TOMBOL UDAH DIBENERIN 👇 */}
              {isExplorer && (
                <button 
                  onClick={() => setShowProModal(true)}
                  className="
                    flex items-center justify-center gap-2 
                    px-8 py-4 rounded-2xl 
                    bg-[#CB2129] text-white font-bold 
                    shadow-lg shadow-[#CB2129]/20
                    transition-all duration-200 ease-out
                    hover:bg-[#a81b22]
                    hover:scale-[1.02] hover:-translate-y-0.5
                    active:scale-[0.96]
                    group
                  "
                >
                  <Crown size={18} className="group-hover:rotate-12 transition-transform duration-300" />
                  Upgrade to Insider
                </button>
              )}
            </div>
          </div>
        </div>

{/* --- 2. STATS GRID --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard 
            label="Events Attended" 
            value={data.stats.events_attended} 
            icon={Calendar} 
            variant="blue" 
            delay={0} 
          />
          <StatCard 
            label="Contributions" 
            value={data.stats.contributions} 
            icon={Star} 
            variant="yellow" 
            delay={100} 
          />
          <StatCard 
            label="Learning Hours" 
            value={`${data.stats.hours}h`} 
            icon={Clock} 
            variant="green" 
            delay={200} 
          />
          <StatCard 
            label="Current Streak" 
            value={`${data.stats.streak} Day`} 
            icon={Zap} 
            variant="orange" 
            delay={300} 
          />
        </div>

        {/* --- 3. MAIN CONTENT SPLIT --- */}
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: CONTENT (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* ✨ GOALS WIDGET - INTEGRATED HERE ✨ */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-[#2F4157] flex items-center gap-2">
                  <Target size={24} className="text-[#E56668]" />
                  My Learning Goal
                </h2>
                <Link href="/dashboard/goals" className="text-sm font-semibold text-[#E56668] hover:underline">
                  Manage Goals
                </Link>
              </div>
              <GoalDashboardWidget userId={data.user.id} userTier={data.user.tier} />
            </div>
{/* UPCOMING / OPEN EVENTS (Clean UI Update) */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#2F4157]">Upcoming Schedule</h2>
                <Link 
                  href="/dashboard/events" 
                  className="text-sm font-semibold text-[#E56668] hover:text-[#d65557] hover:underline flex items-center gap-1 transition-colors"
                >
                  See Calendar <ArrowRight size={14} />
                </Link>
              </div>

              {data.upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  {data.upcomingEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="group relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#E56668]/20 transition-all duration-300 flex items-start gap-6"
                    >
                      {/* Left: Modern Date Badge */}
{/* --- DATE BADGE: SQUARE & SPACIOUS --- */}
                      <div className="flex-shrink-0 w-20 h-20 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col shadow-sm group-hover:border-[#E56668]/30 transition-colors">
                        {/* Month Header */}
                        <div className="bg-[#FFF5F5] h-7.5 flex items-center justify-center border-b border-[#FFE0E0]">
                           <span className="text-[13px] font-extrabold text-[#E56668] uppercase tracking-widest">
                             {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                           </span>
                        </div>
                        {/* Day Number */}
                        <div className="flex-1 flex items-center justify-center bg-white group-hover:bg-[#FFFDFD] transition-colors">
                           <span className="text-3xl font-bold text-[#2F4157] tracking-tight">
                             {new Date(event.date).getDate()}
                           </span>
                        </div>
                      </div>
                      
                      {/* Middle: Content Info */}
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`
                            px-2 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border
                            ${event.type === 'Workshop' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                              event.type === 'Webinar' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              'bg-gray-50 text-gray-600 border-gray-200'}
                          `}>
                            {event.type}
                          </span>
                          
                          {event.isRegistered ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                              <CheckCircle2 size={10} /> Registered
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1.5 rounded-full border border-gray-100">
                              Open
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-[#2F4157] text-base md:text-lg leading-snug mb-1.5 group-hover:text-[#E56668] transition-colors line-clamp-1 pr-8">
                          {event.title}
                        </h3>
                        
                <div className="flex items-center gap-3 text-xs mt-2 text-gray-500">
                          {/* Ubah gap-1.5 jadi gap-2 di sini */}
                          <span className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                             <Clock size={12} className="text-gray-400" /> 
                             {new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          
                          {/* Ubah gap-1.5 jadi gap-2 di sini juga */}
                          <span className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-full">
                             <MapPin size={12} className="text-gray-400" /> Online
                          </span>
                        </div>
                      </div>

                      {/* Right: Action Arrow (Circle Button) */}
                      <div className="hidden sm:flex self-center ml-auto">
                         {event.isRegistered ? (
                           <Link 
                             href={`/dashboard/events/${event.id}`} 
                             className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#E56668] group-hover:text-white group-hover:border-[#E56668] transition-all duration-300"
                           >
                              <ArrowRight size={18} />
                           </Link>
                         ) : (
                           <a 
                             href={event.registrationLink} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-[#E56668] group-hover:text-white group-hover:border-[#E56668] transition-all duration-300"
                           >
                              <ExternalLink size={18} />
                           </a>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Empty State (Clean)
                <div className="bg-gray-50/50 rounded-2xl p-10 text-center border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-sm border border-gray-100">
                    <Calendar size={28} />
                  </div>
                  <h3 className="font-bold text-[#2F4157] text-lg mb-1">No upcoming events</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto leading-relaxed">
                    It's quiet for now. Check back later or browse our full calendar.
                  </p>
                  <Link 
                    href="/dashboard/events" 
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-[#2F4157] rounded-full text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    View Calendar
                  </Link>
                </div>
              )}
            </div>
            {/* RECENT ACTIVITY 
            <div>
              <h2 className="text-xl font-bold text-[#2F4157] mb-5">Learning Log</h2>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
                {data.recentActivity.length > 0 ? (
                   data.recentActivity.map((act) => (
                    <div key={act.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors border-b last:border-0 border-gray-50">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0"><CheckCircle2 size={14} /></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#2F4157]">{act.title}</p>
                        <p className="text-xs text-gray-400">{new Date(act.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                   ))
                ) : (
                  <p className="text-center py-6 text-sm text-gray-400">No recent activity recorded.</p>
                )}
              </div>
            </div>*/}

          </div>

          {/* RIGHT: SIDEBAR (1/3) */}
          <div className="space-y-6">
            
            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Command Center</h3>
              <div className="space-y-3">
                <ActionButton icon={Target} label="My Goals" subLabel="Track your learning journey" href="/dashboard/goals" />
                <ActionButton icon={Star} label="My Portfolio" subLabel="Manage your verifiable CV" href="/dashboard/portfolio" isLocked={!isExplorer} onClick={() => setShowProModal(true)} />
                <ActionButton icon={Calendar} label="Book Mentorship" subLabel="1-on-1 with experts" href="/dashboard/mentorship" isLocked={!isExplorer} onClick={() => setShowProModal(true)} />
                <ActionButton icon={MoreHorizontal} label="Resources Hub" subLabel="Access guidelines & tools" href="/dashboard/resources" />
              </div>
              <div className="mt-6 pt-6 border-t border-gray-100">
                <button 
                  onClick={handleSignOut}
                  className="
                    w-full flex items-center justify-center gap-2 
                    py-3 rounded-full font-bold text-sm
                    bg-[#E56668] text-white hover:bg-[#d65557]
                    transition-all duration-200 ease-out
                    hover:scale-[1.02] hover:shadow-md hover:shadow-red-900/10
                    active:scale-[0.96] active:brightness-95
                  "
                >
                  <LogOut size={18} /> Sign Out
                </button>
              </div>
            </div>

 {/* Pro Promo Card */}
            {!isExplorer && (
              <div className="relative overflow-hidden rounded-2xl bg-[#2F4157] text-white p-6 shadow-xl group cursor-pointer" onClick={() => setShowProModal(true)}>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#E56668] blur-[60px] opacity-40 rounded-full group-hover:opacity-60 transition-opacity" />
                 <div className="relative z-10">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm">
                      <Crown className="text-yellow-400" size={20} />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Why limit your growth?</h3>
                    <p className="text-sm text-white/70 mb-4 leading-relaxed">Pro members get access to locked opportunities and priority mentorship.</p>
                    <button 
                      className="w-full py-2.5 rounded-full bg-white text-[#2F4157] font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Unlock Pro Access
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
        {/* --- 4. GIF SINGAPORE PROMO SECTION (UPDATED PALETTE) --- */}
        {/* Gradient Linear -> #2F4055 #914D4D #304156 */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2F4055] via-[#914D4D] to-[#304156] text-white shadow-2xl group ring-1 ring-white/10 font-geologica">
          
          {/* Background Decor Effects (Aligned with Palette) */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#914D4D] opacity-20 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:opacity-30 transition-opacity duration-500" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#304156] opacity-30 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3" />
          {/* Subtle Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />

          <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            
            {/* Left Content */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left flex-1">
              
{/* Logo Container with Glassmorphism */}
<div className="w-32 h-32 md:w-40 md:h-40 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0 p-4 shadow-lg transform group-hover:scale-105 transition-transform duration-300">
    <img 
        src="/images/logos/events/gifsgp.png" 
        alt="GIF Singapore" 
        className="max-w-full max-h-full object-contain drop-shadow-md" 
        /* Note: Filter brightness-0 invert dihapus agar warna asli logo muncul.
           Pindah class centering (flex items-center justify-center) ke parent <div>.
        */
    />
</div>

              <div className="space-y-3 max-w-2xl">
                 {/* Badge: Muted Red Background */}
                 <div className="inline-flex items-center gap-2 bg-[#914D4D] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mx-auto md:mx-0 shadow-lg shadow-[#914D4D]/20 border border-white/20">
                   <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                   </span>
                   Registration Open
                 </div>
                 
                 <h3 className="text-2xl md:text-3xl font-black leading-tight">
                   Ready for Singapore? <span className="text-[#FFD1D1]">🇸🇬</span>
                 </h3>
                 
                 <p className="text-white/90 text-sm md:text-base leading-relaxed font-light">
                   Join <strong>Global Impact Fellowship 2026</strong>. Benchmark directly to <strong>NUS & Glints HQ</strong>. 
                   Get a chance for <span className="text-[#FFD1D1] font-bold underline decoration-[#FFD1D1]/50 underline-offset-4">Fully Funded</span> & exclusive mentoring from IELS Founders.
                 </p>
              </div>
            </div>

            {/* Right Action */}
            <div className="shrink-0 w-full md:w-auto">
               <Link href="/dashboard/gif" className="block w-full">
                 <button className="w-full md:w-auto group/btn relative px-8 py-3 bg-white text-[#304156] font-bold rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden">
                    <span className="uppercase tracking-wide text-sm relative z-10">Start Application</span>
                    {/* Icon Circle: NightFall Blue -> Muted Red on Hover */}
                    <div className="bg-[#304156] text-white p-1.5 rounded-full group-hover/btn:bg-[#914D4D] transition-colors relative z-10">
                      <ArrowRight size={16} />
                    </div>
                    {/* Hover Shine Effect */}
                    <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover/btn:animate-shine" />
                 </button>
               </Link>
               <p className="text-white/60 text-[10px] text-center mt-3 font-medium tracking-wide">
                 *Limited slots available for Fast Track
               </p>
            </div>

          </div>
        </div>
      </div>
      
<GIFPopup/>
      {/* --- MODAL DI RENDER DI SINI (SEBELUM TUTUP LAYOUT) --- */}
      {showProModal && (
        <PricingModal onClose={() => setShowProModal(false)} />
      )}
    </DashboardLayout>
<GIFPopup />
    </>
);
}