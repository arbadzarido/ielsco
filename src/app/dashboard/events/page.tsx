"use client";

import { useState, useEffect, Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createBrowserClient } from "@supabase/ssr";
import { eventsData, EventData } from "@/data/events";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, ExternalLink, CheckCircle2, CalendarDays,
  Filter, Loader2, Star, Trophy, AlertCircle, PlusCircle, MessageSquare, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- NOTE: Pastikan path import komponen ini benar sesuai struktur folder lu ---
import GIFPopup from "@/components/GIFPopup"; 
import { Schedule } from "@mui/icons-material";

// --- TYPES ---
type UserTier = "explorer" | "insider" | "visionary";

type MergedEvent = EventData & {
  db_status: "registered" | "attended" | null;
  is_past: boolean;
  eventDateObj: Date;
};

// --- HELPER: GOOGLE CALENDAR LINK ---
const getGoogleCalendarLink = (event: MergedEvent) => {
  const title = encodeURIComponent(event.title);
  const start = new Date(event.startDate);
  start.setHours(19, 0, 0); 
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); 

  const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDate(start)}/${formatDate(end)}&details=Join+this+event+by+IELS!&sf=true&output=xml`;
};

// --- KOMPONEN LOGIKA UTAMA ---
function EventsContent() {
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
    name: "Loading...", 
    email: "", 
    tier: "explorer",
    avatar: "" 
  });

  const [loading, setLoading] = useState(true);
  const [mergedEvents, setMergedEvents] = useState<MergedEvent[]>([]);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- 1. FETCH & MERGE DATA ---
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // SET USER DATA BIAR HEADER GAK KOSONG
   // --- GANTI DENGAN INI ---
// 1. Ambil data Membership langsung (Source of Truth Tier)
const { data: dbMembership } = await supabase
  .from("memberships")
  .select("*")
  .eq("user_id", user.id)
  .maybeSingle();

// 2. Ambil data User (Nama & Avatar)
const { data: dbUser } = await supabase
  .from("users")
  .select("full_name, avatar_url")
  .eq("id", user.id)
  .maybeSingle();

// 3. Mapping Tier (Samain dengan Dashboard & Community)
const dbTier = dbMembership?.tier;
let uiTier: UserTier = "explorer";

if (dbTier === "pro") {
  uiTier = "insider";
} else if (dbTier === "premium" || dbTier === "visionary") {
  uiTier = "visionary";
}

setUserData({
  id: user.id,
  name: dbUser?.full_name || user.user_metadata?.full_name || "Member",
  email: user.email || "",
  tier: uiTier,
  avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || ""
});

        const { data: registrations } = await supabase
          .from("event_registrations")
          .select("event_id, attended")
          .eq("user_id", user.id);

        const now = new Date();
        
        const processed = eventsData.map((staticEv) => {
          const userReg = registrations?.find((r) => r.event_id === staticEv.id);
          
          let status: "registered" | "attended" | null = null;
          if (userReg) {
            status = userReg.attended ? "attended" : "registered"; 
          }

          const eventDate = new Date(staticEv.startDate);
          
          return {
            ...staticEv,
            db_status: status,
            is_past: eventDate < now,
            eventDateObj: eventDate
          };
        });

        processed.sort((a, b) => a.eventDateObj.getTime() - b.eventDateObj.getTime());
        setMergedEvents(processed);
      }
      setLoading(false);
    };

    initData();
  }, [supabase, refreshTrigger]);

  // --- ACTIONS ---
  const handleRegister = async (event: MergedEvent) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("event_registrations")
      .upsert({
        user_id: user.id,
        event_id: event.id, 
        name: user.user_metadata.full_name,
        email: user.email,
        attended: false,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id, event_id' });

    if (!error) setRefreshTrigger(prev => prev + 1);
    window.open(event.registrationLink, "_blank");
  };

  const handleMarkAttended = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (window.confirm("Confirm your attendance? This will update your learning stats.")) {
      const { error } = await supabase
        .from("event_registrations")
        .upsert({
           user_id: user.id,
           event_id: eventId,
           attended: true,
           updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, event_id' });

      if (!error) setRefreshTrigger(prev => prev + 1);
    }
  };

  // --- STATS CALCULATION ---
  const totalEvents = mergedEvents.length;
  const attendedCount = mergedEvents.filter(e => e.db_status === "attended").length;
  const upcomingCount = mergedEvents.filter(e => !e.is_past).length;

  const displayEvents = mergedEvents.filter(ev => {
    if (filter === "upcoming") return !ev.is_past;
    if (filter === "past") return ev.is_past;
    return true;
  });

  const heroEvent = mergedEvents.find(e => !e.is_past);

  return (
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F6F3EF]">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
          
          {/* --- HEADER Dashboard Events & STATS --- */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 bg-gradient-to-br from-[#304156] to-[#1e2a38] rounded-[32px] p-8 md:p-10 text-white relative overflow-hidden shadow-lg border border-[#CDC6BC]/20">
               <div className="inline-flex items-left gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-6">
                                <CalendarDays size={16} />
                                <span>My Schedule</span>
                              </div>
                              <div className="relative z-10">
                 
                  <h1 className="text-3xl md:text-4xl font-black mb-3">Event Journey</h1>
                  <p className="text-[#CDC6BC] max-w-xl text-sm md:text-base leading-relaxed">
                    Track your participation, register for exclusive workshops, and build your global portfolio.
                  </p>
                  <div className="flex gap-8 mt-8">
                     <div>
                        <p className="text-4xl font-black text-white">{attendedCount}</p>
                        <p className="text-xs text-[#577E90] uppercase tracking-widest font-bold mt-1">Completed</p>
                     </div>
                     <div className="w-px bg-white/10 h-14"></div>
                     <div>
                        <p className="text-4xl font-black text-white">{upcomingCount}</p>
                        <p className="text-xs text-[#577E90] uppercase tracking-widest font-bold mt-1">Upcoming</p>
                     </div>
                  </div>
               </div>
               <div className="absolute top-0 right-0 w-80 h-80 bg-[#577E90]/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 mix-blend-screen"></div>
            </div>

            {/* Quick Stat Card */}
            <div className="bg-white border border-[#CDC6BC] rounded-[32px] p-6 shadow-sm flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 bg-[#F6F3EF] rounded-2xl flex items-center justify-center mb-4 border border-[#CDC6BC]/50">
                  <Trophy className="text-[#304156]" size={32} />
               </div>
               <p className="text-[#577E90] font-bold text-xs uppercase tracking-widest">Participation</p>
               <p className="text-4xl font-black text-[#CB2129] mt-1">
                 {totalEvents > 0 ? Math.round((attendedCount / totalEvents) * 100) : 0}%
               </p>
            </div>
          </div>

          {/* --- GIF SINGAPORE PROMO SECTION --- */}
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#2F4055] via-[#914D4D] to-[#304156] text-white shadow-xl group ring-1 ring-white/10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#914D4D] opacity-20 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:opacity-30 transition-opacity duration-500" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#304156] opacity-30 blur-[60px] rounded-full -translate-x-1/3 translate-y-1/3" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />

            <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left flex-1">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0 p-4 shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                  <img src="/images/logos/events/gifsgp.png" alt="GIF Singapore" className="max-w-full max-h-full object-contain drop-shadow-md" />
                </div>
                <div className="space-y-3 max-w-2xl">
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

              <div className="shrink-0 w-full md:w-auto">
                 <Link href="/dashboard/gif" className="block w-full">
                   <button className="w-full md:w-auto group/btn relative px-8 py-4 bg-white text-[#304156] font-bold rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden">
                      <span className="uppercase tracking-wide text-sm relative z-10">Start Application</span>
                      <div className="bg-[#304156] text-white p-2 rounded-full group-hover/btn:bg-[#914D4D] transition-colors relative z-10">
                        <ArrowRight size={16} />
                      </div>
                      <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover/btn:animate-shine" />
                   </button>
                 </Link>
                 <p className="text-white/60 text-[10px] text-center mt-3 font-bold tracking-widest uppercase">
                   *Limited slots for Fast Track
                 </p>
              </div>
            </div>
          </div>

          {/* --- TABS --- */}
          <div className="flex items-center gap-6 border-b border-[#CDC6BC]">
             {(['upcoming', 'past', 'all'] as const).map((t) => (
               <button
                 key={t}
                 onClick={() => setFilter(t)}
                 className={cn(
                   "pb-4 font-bold text-sm tracking-wide transition-all relative uppercase",
                   filter === t ? "text-[#CB2129]" : "text-[#577E90] hover:text-[#304156]"
                 )}
               >
                 {t}
                 {filter === t && (
                   <div className="absolute bottom-0 left-0 w-full h-1 bg-[#CB2129] rounded-t-full"></div>
                 )}
               </button>
             ))}
          </div>

          {loading ? (
             <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#CB2129]" size={40}/></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              
              {/* --- HERO EVENT (If filter is Upcoming & Hero exists) --- */}
              {filter === "upcoming" && heroEvent && (
                 <div className="col-span-full mb-4">
                    <div className="group relative rounded-[32px] overflow-hidden bg-white border border-[#CDC6BC] shadow-sm hover:shadow-xl transition-all duration-300">
                       <div className="grid md:grid-cols-5 h-full">
                          {/* Image Side */}
                          <div className="relative h-72 md:h-auto md:col-span-2 overflow-hidden bg-[#304156]">
                             <Image 
                               src={heroEvent.poster} 
                               alt={heroEvent.title}
                               fill
                               className="object-cover transition-transform duration-700 group-hover:scale-105"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-[#304156]/80 to-transparent md:hidden"></div>
                             <div className="absolute top-6 left-6 bg-[#CB2129] px-4 py-2 rounded-xl text-xs font-black text-white uppercase tracking-widest shadow-lg">
                               Featured
                             </div>
                          </div>

                          {/* Content Side */}
                          <div className="p-8 md:p-10 flex flex-col justify-center md:col-span-3">
                             <div className="flex items-center gap-3 mb-4">
                                <span className="text-xs font-black text-[#577E90] bg-[#F6F3EF] px-3 py-1.5 rounded-lg tracking-widest uppercase">
                                  {heroEvent.eventDateObj.toLocaleDateString("en-US", { weekday: 'long', day: 'numeric', month: 'long' })}
                                </span>
                             </div>
                             
                             <h2 className="text-3xl md:text-4xl font-black text-[#304156] mb-4 leading-tight">{heroEvent.title}</h2>
                             
                             <div 
                               className="text-[#577E90] line-clamp-3 mb-8 prose prose-sm"
                               dangerouslySetInnerHTML={{ __html: heroEvent.description }} 
                             />

                             <div className="flex flex-wrap gap-4">
                                {heroEvent.db_status === "registered" ? (
                                  <button className="px-8 py-4 bg-[#F6F3EF] text-[#304156] border border-[#CDC6BC] rounded-2xl font-bold flex items-center gap-2 cursor-default">
                                     <CheckCircle2 size={20} className="text-green-600"/> Registered
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleRegister(heroEvent)}
                                    className="px-8 py-4 bg-[#CB2129] text-white rounded-2xl font-bold hover:bg-[#a81b22] hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
                                  >
                                    Register Now <ExternalLink size={18}/>
                                  </button>
                                )}
                                
                                {/* Reminder Button */}
                                <a 
                                  href={getGoogleCalendarLink(heroEvent)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-6 py-4 bg-white border border-[#CDC6BC] text-[#304156] rounded-2xl font-bold hover:bg-[#F6F3EF] transition-colors flex items-center gap-2"
                                >
                                  <PlusCircle size={18}/> Add Reminder
                                </a>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {/* --- STANDARD EVENT CARDS --- */}
              {displayEvents.filter(e => e.id !== heroEvent?.id || filter !== 'upcoming').map((event) => (
                <div 
                  key={event.id} 
                  className={cn(
                    "bg-white rounded-[32px] border flex flex-col overflow-hidden transition-all duration-300 group",
                    event.is_past ? "border-[#CDC6BC]/50 opacity-80 hover:opacity-100" : "border-[#CDC6BC] hover:shadow-xl hover:-translate-y-1 hover:border-[#577E90]"
                  )}
                >
                  {/* Poster Image */}
                  <div className="relative h-56 w-full bg-[#304156] overflow-hidden">
                     {event.poster ? (
                        <Image 
                          src={event.poster} 
                          alt={event.title} 
                          fill
                          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${event.is_past ? 'grayscale' : ''}`}
                        />
                     ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#304156] to-[#577E90]"></div>
                     )}
                     
                     <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-2 text-center min-w-[60px] shadow-sm border border-[#CDC6BC]/50">
                        <p className="text-[10px] font-black text-[#CB2129] uppercase tracking-widest">
                          {event.eventDateObj.toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-2xl font-black text-[#304156] leading-none mt-1">
                          {event.eventDateObj.getDate()}
                        </p>
                     </div>

                     {event.db_status === 'attended' && (
                        <div className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">
                           <Star size={12} fill="white"/> Completed
                        </div>
                     )}
                  </div>

                  {/* Content */}
                  <div className="p-8 flex-1 flex flex-col">
                     <h3 className="text-xl font-bold text-[#304156] mb-4 line-clamp-2 group-hover:text-[#CB2129] transition-colors leading-snug">
                       {event.title}
                     </h3>
                     
                     <div className="flex items-center gap-4 text-xs font-bold text-[#577E90] mb-6">
                        <div className="flex items-center gap-1.5 bg-[#F6F3EF] px-3 py-1.5 rounded-lg">
                           <Clock size={14}/> 
                           {event.eventDateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#F6F3EF] px-3 py-1.5 rounded-lg">
                           <MapPin size={14}/> Online
                        </div>
                     </div>

                     <div className="mt-auto pt-6 border-t border-[#CDC6BC]/50 flex items-center justify-between">
                        {!event.is_past ? (
                           event.db_status === 'registered' ? (
                              <div className="flex gap-3 w-full">
                                 <button 
                                   onClick={() => window.open(event.registrationLink, "_blank")}
                                   className="flex-1 py-3 bg-[#F6F3EF] text-[#304156] text-sm font-bold rounded-xl hover:bg-[#CDC6BC]/50 transition border border-[#CDC6BC]"
                                 >
                                   Open Link
                                 </button>
                                 <a 
                                   href={getGoogleCalendarLink(event)}
                                   target="_blank"
                                   className="p-3 border border-[#CDC6BC] text-[#304156] rounded-xl hover:bg-[#F6F3EF]"
                                   title="Add to Calendar"
                                 >
                                   <PlusCircle size={18}/>
                                 </a>
                              </div>
                           ) : (
                              <button 
                                onClick={() => handleRegister(event)}
                                className="w-full py-3 bg-[#304156] text-white text-sm font-bold rounded-xl hover:bg-[#1e2a38] transition shadow-md"
                              >
                                Register Now
                              </button>
                           )
                        ) : (
                           event.db_status === 'attended' ? (
                              <button className="w-full py-3 border border-[#CDC6BC] text-[#577E90] text-sm font-bold rounded-xl hover:bg-[#F6F3EF] flex items-center justify-center gap-2 transition">
                                 <MessageSquare size={16}/> Give Feedback
                              </button>
                           ) : (
                              <div className="w-full flex items-center justify-between gap-2 bg-[#F6F3EF] p-2 rounded-xl border border-[#CDC6BC]">
                                 <p className="text-[10px] text-[#577E90] font-bold uppercase tracking-widest pl-2">Joined this?</p>
                                 <button 
                                   onClick={() => handleMarkAttended(event.id)}
                                   className="px-4 py-2 bg-white text-[#304156] text-xs font-bold rounded-lg hover:text-[#CB2129] shadow-sm transition"
                                 >
                                   Count Me In
                                 </button>
                              </div>
                           )
                        )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && displayEvents.length === 0 && (
             <div className="text-center py-20 border-2 border-dashed border-[#CDC6BC] rounded-[32px]">
                <div className="inline-block p-4 bg-[#F6F3EF] rounded-full mb-4">
                   <AlertCircle className="text-[#577E90]" size={32}/>
                </div>
                <p className="text-[#304156] font-bold">No events found in this category.</p>
             </div>
          )}

        </div>
      </div>
      
      {/* Komponen Popup GIF */}
      <GIFPopup />
    </DashboardLayout>
  );
}

// --- FUNGSI UTAMA (MEMBUNGKUS DENGAN SUSPENSE) ---
export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="p-12 flex items-center justify-center min-h-screen bg-[#F6F3EF]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#CB2129]"></div>
      </div>
    }>
      <EventsContent />
    </Suspense>
  );
}