"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Briefcase,
  Calendar,
  ExternalLink,
  GraduationCap,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  Share2,
  FileText,
  Video,
  ArrowRight,
  EyeOff
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- TYPES ---
type UserTier = "explorer" | "insider" | "visionary";

interface Contribution {
  id: string;
  project_name: string;
  category: string;
  role: string;
  description: string;
  output_links: string[];
  date: string;
  tags: string[];
}

interface PortfolioData {
  user: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
    tier: UserTier;
    bio: string | null;
    location: string | null;
    email: string | null;
    linkedin_url: string | null;
    website_url: string | null;
    institution: string | null;
    batch: string | null;
    created_at: string;
  };
  contributions: Contribution[];
  stats: {
    events_attended: number;
    consultations_completed: number;
    learning_hours: number;
    member_since: string;
  };
}

// --- TIER BADGE ---
const TierBadge = ({ tier }: { tier: UserTier }) => {
  const config = {
    explorer: { label: "Explorer", bg: "bg-white/10", text: "text-white", border: "border-white/20" },
    insider: { label: "Insider", bg: "bg-[#E56668]/20", text: "text-[#E56668]", border: "border-[#E56668]/30" },
    visionary: { label: "Visionary", bg: "bg-yellow-400/20", text: "text-yellow-400", border: "border-yellow-400/30" }
  };
  const { label, bg, text, border } = config[tier];

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border backdrop-blur-sm shadow-lg", bg, text, border)}>
      <Sparkles size={12} fill="currentColor" /> {label}
    </span>
  );
};

export default function PublicPortfolioPage() {
  const params = useParams();
  const username = params?.username as string;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);

      // 1. Fetch user data by username
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(`
          id, full_name, username, avatar_url, bio, location, email, 
          linkedin_url, website_url, created_at, is_portfolio_public,
          user_profiles ( institution, batch ),
          memberships ( tier )
        `)
        .eq("username", username)
        .maybeSingle();

      // LOGIC FIX: Check if user exists AND if portfolio is public
      if (userError || !userData || !userData.is_portfolio_public) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Map tier
      const dbTier = userData.memberships?.[0]?.tier;
      let uiTier: UserTier = "explorer";
      if (dbTier === "pro") uiTier = "insider";
      else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";

      // 2. Fetch Contributions (INI LOGIC YANG BENAR)
      const { data: contributionsData } = await supabase
        .from("contributions")
        .select("*")
        .eq("user_id", userData.id)
        .order("date", { ascending: false });

      // 3. Fetch stats (Opsional, tetep gue pertahanin buat sidebar)
      const { data: eventRegistrations } = await supabase.from("event_registrations").select("attended").eq("user_id", userData.id);
      const { data: consultations } = await supabase.from("mentor_consultations").select("id").eq("user_id", userData.id).eq("status", "completed");

      const eventsAttended = eventRegistrations?.filter(e => e.attended).length || 0;
      const learningHours = eventsAttended * 2;
      const memberSince = new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      setPortfolio({
        user: {
          id: userData.id,
          full_name: userData.full_name,
          username: userData.username || username,
          // Handle avatar from metadata just in case
          avatar_url: userData.avatar_url || "", 
          tier: uiTier,
          bio: userData.bio,
          location: userData.location,
          email: userData.email,
          linkedin_url: userData.linkedin_url,
          website_url: userData.website_url,
          institution: userData.user_profiles?.[0]?.institution || null,
          batch: userData.user_profiles?.[0]?.batch || null,
          created_at: userData.created_at
        },
        contributions: contributionsData || [],
        stats: {
          events_attended: eventsAttended,
          consultations_completed: consultations?.length || 0,
          learning_hours: learningHours,
          member_since: memberSince
        }
      });

      setLoading(false);
    };

    if (username) fetchPortfolio();
  }, [username, supabase]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#E56668]/20 border-t-[#E56668] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#2F4157] font-bold animate-pulse">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  // JIKA TIDAK KETEMU ATAU DI-PRIVATE
  if (notFound || !portfolio) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 text-center shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#E56668]"></div>
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <EyeOff className="text-gray-400" size={32} />
          </div>
          <h2 className="text-2xl font-black text-[#2F4157] mb-3">Portfolio Unavailable</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            The portfolio you're looking for doesn't exist or is currently set to private by the owner.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#2F4157] text-white rounded-xl font-bold hover:bg-[#1e2a38] transition-all shadow-lg hover:-translate-y-1">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const { user, contributions, stats } = portfolio;

  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans selection:bg-[#E56668]/20 pb-24 relative">
      
      {/* Background Mesh */}
      <div className="absolute top-0 left-0 w-full h-[500px] overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[100%] bg-[#E56668] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.07]"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[100%] bg-[#2F4157] rounded-full mix-blend-multiply filter blur-[150px] opacity-[0.05]"></div>
      </div>

      {/* Modern Top Nav */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105">
            <Image src="/images/logos/iels-logo.png" alt="IELS" width={100} height={30} className="h-7 w-auto" />
          </Link>
          
          <div className="flex items-center gap-3">
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#2F4157] rounded-full font-bold hover:bg-gray-50 transition-all text-xs shadow-sm">
              {isCopied ? <span className="text-green-600 flex items-center gap-1">Copied!</span> : <><Share2 size={14} /> Share</>}
            </button>
            <Link href="/sign-in" className="flex items-center gap-2 px-5 py-2 bg-[#2F4157] text-white rounded-full font-bold hover:bg-[#1e2a38] transition-all text-xs shadow-md">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        
        {/* --- HERO SECTION (ULTRA PREMIUM) --- */}
        <div className="bg-[#2F4157] rounded-[2rem] p-8 lg:p-12 text-white shadow-2xl mb-10 relative overflow-hidden">
          {/* Subtle Glow inside Hero */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#E56668] blur-[120px] opacity-30 rounded-full pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start gap-8">
            
            {/* Avatar Container */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-[2rem] border-4 border-white/10 shadow-2xl overflow-hidden bg-[#1e2a38] relative backdrop-blur-md">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover absolute inset-0 z-10" onError={(e) => e.currentTarget.style.display = 'none'} />
                ) : null}
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-[#E56668] absolute inset-0">
                  {user.full_name.charAt(0)}
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4">
                <TierBadge tier={user.tier} />
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center lg:text-left pt-2">
              <h1 className="text-4xl lg:text-5xl font-black mb-4 tracking-tight text-white drop-shadow-md">
                {user.full_name}
              </h1>
              
              <p className="text-white/80 text-lg mb-6 max-w-2xl leading-relaxed font-medium">
                {user.bio || "Language enthusiast & global professional building a footprint at IELS Community."}
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-y-3 gap-x-6 mb-8 text-sm font-bold text-white/70">
                {user.institution && <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm"><GraduationCap size={16} className="text-[#E56668]" /> {user.institution}</div>}
                {user.location && <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm"><MapPin size={16} className="text-blue-400" /> {user.location}</div>}
                {user.batch && <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm"><Calendar size={16} className="text-purple-400" /> Cohort {user.batch}</div>}
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                {user.linkedin_url && (
                  <a href={user.linkedin_url} target="_blank" className="flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] hover:bg-[#084e96] text-white rounded-xl font-bold transition-all shadow-lg">
                    <Linkedin size={18} /> LinkedIn
                  </a>
                )}
                {user.email && (
                  <a href={`mailto:${user.email}`} className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold transition-all backdrop-blur-sm">
                    <Mail size={18} /> Email
                  </a>
                )}
                {user.website_url && (
                  <a href={user.website_url} target="_blank" className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold transition-all backdrop-blur-sm">
                    <Globe size={18} /> Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: CONTRIBUTIONS (Projects) */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-black text-[#2F4157] flex items-center gap-3 ml-2">
               Featured Projects <Sparkles size={20} className="text-[#E56668]"/>
            </h2>

            {contributions.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="text-gray-300" size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#2F4157] mb-2">No Projects Yet</h3>
                <p className="text-gray-500 font-medium">{user.full_name.split(' ')[0]} is still building their professional portfolio.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {contributions.map((item) => (
                  <div key={item.id} className="group bg-white rounded-[1.5rem] p-6 lg:p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 relative overflow-hidden">
                    {/* Accent Line */}
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#E56668] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">{item.category}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#E56668] bg-[#E56668]/10 px-3 py-1.5 rounded-lg">{item.role}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                        <Calendar size={14} /> {new Date(item.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-[#2F4157] mb-3 group-hover:text-[#E56668] transition-colors">{item.project_name}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed mb-6">
                      {item.description}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-6 border-t border-gray-50">
                      <div className="flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span key={tag} className="text-[11px] font-bold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {item.output_links.length > 0 && (
                        <div className="flex gap-2">
                          {item.output_links.map((link, idx) => (
                            <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white bg-[#2F4157] hover:bg-black px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 hover:-translate-y-0.5">
                              View Project <ExternalLink size={14} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: SIDEBAR (Stats & CTA) */}
          <div className="space-y-6">
            
            {/* Quick Stats Bento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3"><Briefcase size={18}/></div>
                <p className="text-2xl font-black text-[#2F4157] leading-none mb-1">{contributions.length}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Projects</p>
              </div>
              <div className="bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3"><Sparkles size={18}/></div>
                <p className="text-2xl font-black text-[#2F4157] leading-none mb-1">{new Set(contributions.flatMap(c => c.tags)).size}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Skills</p>
              </div>
              <div className="bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mb-3"><Clock size={18}/></div>
                <p className="text-2xl font-black text-[#2F4157] leading-none mb-1">{stats.learning_hours}h</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Learning</p>
              </div>
              <div className="bg-white rounded-[1.5rem] p-5 border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-3"><Video size={18}/></div>
                <p className="text-2xl font-black text-[#2F4157] leading-none mb-1">{stats.consultations_completed}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sessions</p>
              </div>
            </div>

            {/* Member Card */}
            <div className="bg-white rounded-[1.5rem] p-6 border border-gray-100 shadow-sm">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Account Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                  <span className="text-sm text-gray-500 font-bold">Member Since</span>
                  <span className="text-sm font-black text-[#2F4157]">{stats.member_since}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 font-bold">IELS Tier</span>
                  <span className="text-sm font-black text-[#E56668] capitalize">{user.tier}</span>
                </div>
              </div>
            </div>

            {/* Share Card */}
            <div className="bg-gray-50 rounded-[1.5rem] p-6 border border-gray-200">
              <h3 className="font-black text-[#2F4157] mb-2 flex items-center gap-2">
                <Share2 size={18} /> Share Profile
              </h3>
              <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
                Send this portfolio to recruiters, universities, or your professional network.
              </p>
              <button onClick={handleShare} className="w-full py-3 bg-white border border-gray-200 text-[#2F4157] rounded-xl font-bold hover:bg-gray-100 transition-all text-sm shadow-sm flex items-center justify-center gap-2">
                {isCopied ? <span className="text-green-600">Copied to Clipboard!</span> : "Copy Portfolio Link"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- VIRAL FLOATING CTA --- */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-[320px] animate-in slide-in-from-bottom-10 fade-in duration-700 delay-500">
        <Link 
          href="/sign-up" 
          className="group flex items-center justify-between bg-black/95 backdrop-blur-md text-white p-2 pl-6 rounded-full shadow-2xl border border-white/10 hover:bg-black transition-all hover:scale-105"
        >
          <div className="text-left py-1">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Powered by IELS</p>
            <p className="text-sm font-bold">Build your own portfolio</p>
          </div>
          <div className="w-10 h-10 bg-[#E56668] text-white rounded-full flex items-center justify-center group-hover:rotate-45 transition-transform shadow-inner">
            <ArrowRight size={18} />
          </div>
        </Link>
      </div>

    </div>
  );
}