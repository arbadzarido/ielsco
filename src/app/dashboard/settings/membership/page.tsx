"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PricingModal from '@/components/subscription/PricingModal';
import { 
  CreditCard, Crown, Zap, Shield, 
  Calendar, CheckCircle2, 
  History, AlertCircle, Loader2,
  ExternalLink, AlertTriangle, RefreshCcw, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
type UserTier = "explorer" | "insider" | "visionary";

interface SubscriptionData {
  tier: UserTier;
  status: string;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  totalDays: number;
}

export default function SubscriptionSettings() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [sub, setSub] = useState<SubscriptionData | null>(null);
  
  // Modals state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- DATA FETCHING (ALIGNED DENGAN SETTINGS) ---
  useEffect(() => {
    const fetchSubData = async () => {
      setLoading(true);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/sign-in");
        return;
      }

      // 1. Tembak langsung ke Memberships
      const { data: dbMembership } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      // 2. Ambil Profil buat Full Name dan Avatar
      const { data: dbUser } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      // 3. Mapping Logic Tier DB ke UI
      const dbTier = dbMembership?.tier;
      let uiTier: UserTier = "explorer";
      
      if (dbTier === "pro") {
        uiTier = "insider";
      } else if (dbTier === "premium" || dbTier === "visionary") {
        uiTier = "visionary";
      }

      // 4. Update Header User Data
      setUserData({
        full_name: dbUser?.full_name || authUser.user_metadata?.full_name || "User",
        avatar_url: dbUser?.avatar_url || authUser.user_metadata?.avatar_url || "",
        uiTier: uiTier
      });
      
      // 5. Build Subscription Logic Data
      if (dbMembership && dbMembership.start_date && dbMembership.end_date) {
        const start = new Date(dbMembership.start_date);
        const end = new Date(dbMembership.end_date);
        const today = new Date();
        
        const diffTime = end.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        setSub({
          tier: uiTier,
          status: diffDays <= 0 ? "expired" : dbMembership.status,
          startDate: dbMembership.start_date,
          endDate: dbMembership.end_date,
          daysRemaining: Math.max(diffDays, 0),
          totalDays: totalDays || 365
        });
      } else {
        // Fallback Explorer
        setSub({
          tier: "explorer",
          status: "active",
          startDate: null,
          endDate: null,
          daysRemaining: 0,
          totalDays: 1
        });
      }
      setLoading(false);
    };
    fetchSubData();
  }, [router, supabase]);

  if (loading) return (
    <DashboardLayout userName="Loading..." userTier="explorer" userAvatar="">
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#E56668]" />
      </div>
    </DashboardLayout>
  );

  // Status Checkers
  const isVisionary = sub?.tier === "visionary";
  const isInsider = sub?.tier === "insider";
  const isExplorer = sub?.tier === "explorer";
  const isExpired = sub?.status === "expired" || sub?.daysRemaining === 0;
  
  const progress = sub && sub.totalDays > 0 
    ? Math.min(Math.max(((sub.totalDays - sub.daysRemaining) / sub.totalDays) * 100, 0), 100) 
    : 0;

  return (
    <>
      <DashboardLayout 
        userName={userData?.full_name?.split(' ')[0] || "User"} 
        userTier={userData?.uiTier || "explorer"}
        userAvatar={userData?.avatar_url}
      >
        <div className="min-h-screen bg-[#FDFDFD] pb-24 font-sans">
          
     {/* HERO HEADER */}
          <div className="bg-gradient-to-br from-[#2F4157] to-[#1e2b3a] pt-16 pb-32 px-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#E56668] rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
            </div>
            
            {/* Kontainer ini yang dibikin items-center dan justify-center */}
            <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center justify-center gap-4 text-center">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Subscription</h1>
                <p className="text-blue-200 font-medium">Manage your IELS Lounge access and billing</p>
              </div>
              
              {isExpired && !isExplorer && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-100 px-4 py-2 rounded-xl flex items-center justify-center gap-2 backdrop-blur-sm animate-pulse">
                  <AlertCircle size={18} />
                  <span className="text-sm font-bold">Your subscription has expired</span>
                </div>
              )}
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-20 space-y-8">
            
            {/* 1. MASTER PLAN CARD */}
            <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-2xl overflow-hidden">
              <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                  
                  {/* Left: Tier Info */}
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl",
                      isVisionary ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" :
                      isInsider ? "bg-gradient-to-br from-[#E56668] to-[#CB2129] text-white" :
                      "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500"
                    )}>
                      {isVisionary ? <Crown size={40} /> : isInsider ? <Zap size={40} /> : <Shield size={40} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Current Plan</p>
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-black text-[#2F4157] capitalize tracking-tight">
                          IELS {sub?.tier}
                        </h2>
                        <span className={cn(
                          "px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider border",
                          isExpired && !isExplorer ? "bg-red-50 text-red-600 border-red-200" :
                          "bg-green-50 text-green-600 border-green-200"
                        )}>
                          {isExpired && !isExplorer ? "Expired" : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right: Call to Action */}
                  <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                    {isExplorer ? (
                      <button onClick={() => setShowPricingModal(true)} className="px-8 py-4 bg-[#E56668] text-white rounded-2xl font-bold hover:bg-[#d65557] transition-all shadow-lg shadow-red-900/20 group flex items-center justify-center gap-2">
                        <Zap size={18} /> Upgrade to Insider
                      </button>
                    ) : isInsider ? (
                      <>
<a 
  href="https://ielsco.myr.id/pay-membership"
  target="_blank"
  rel="noopener noreferrer"
  className="px-6 py-4 bg-white border-2 border-gray-200 text-[#2F4157] rounded-2xl font-bold hover:border-[#E56668] hover:text-[#E56668] transition-all flex items-center justify-center gap-2 group"
>
  <RefreshCcw size={18} className="group-hover:rotate-180 transition-transform duration-500" /> 
  {isExpired ? "Renew Now" : "Extend Plan"}
</a>
                        <button onClick={() => setShowPricingModal(true)} className="px-8 py-4 bg-[#2F4157] text-white rounded-2xl font-bold hover:bg-[#1e2b3a] transition-all flex items-center justify-center gap-2 group shadow-lg">
                          <Crown size={18} className="text-yellow-400" /> Upgrade to Visionary
                        </button>
                      </>
                    ) : isVisionary ? (
                      <div className="px-6 py-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-2xl font-bold text-sm flex items-center gap-2 cursor-default">
                        <Sparkles size={18} className="text-yellow-500" /> Lifetime Access Granted
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Progress Bar & Time */}
                {!isExplorer && !isVisionary && (
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <p className="text-sm font-bold text-[#2F4157] flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" /> Billing Cycle
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          {sub?.startDate && new Date(sub.startDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})} 
                          <span className="mx-2 text-gray-300">→</span> 
                          {sub?.endDate && new Date(sub.endDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-3xl font-black", isExpired ? "text-red-500" : "text-[#2F4157]")}>
                          {sub?.daysRemaining}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Days Left</p>
                      </div>
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          isExpired ? "bg-red-500" : "bg-[#E56668]"
                        )} 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                )}

                {/* Visionary Special Display */}
                {isVisionary && (
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-200">
                     <p className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-2">
                        <Crown size={16} className="text-yellow-600" /> Principals' Inner Circle
                      </p>
                      <p className="text-xs text-yellow-700/80 font-medium">
                        Your account is set to permanent access. No renewals needed. Enjoy unrestricted mentoring and portfolio management.
                      </p>
                  </div>
                )}
              </div>
              
{/* BENEFITS MATRIX */}
              <div className="bg-white border-t-2 border-gray-100 p-8 md:p-12">
                <h3 className="text-lg font-black text-[#2F4157] mb-6">Your Lounge Access</h3>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                   {/* Level 1: Explorer (Base Features) - Active for everyone */}
                   <BenefitItem label="Goal System" desc="Define, Execute, Consult" active={true} />
                   <BenefitItem label="Public Portfolio" desc="Verifiable digital CV" active={true} />
                   
                   {/* Level 2: Insider Features - Active for Insider & Visionary (Kalo Insider expired, ini ke-lock) */}
                   <BenefitItem label="Community Access" desc="Engage in IELS Lounge" active={(isInsider && !isExpired) || isVisionary} />
                   <BenefitItem label="Priority Events" desc="Fast-track registration" active={(isInsider && !isExpired) || isVisionary} />
                   
                   {/* Level 3: Visionary Features - Only for Visionary */}
                   <BenefitItem label="Official Assessment" desc="Pre & Post Tests" active={isVisionary} />
                   <BenefitItem label="1-on-1 Mentoring" desc="Direct principal access" active={isVisionary} />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* 2. PAYMENT & BILLING (Hides for Explorer to push upgrade instead) */}
              {!isExplorer && (
                <div className="bg-white rounded-[2rem] border-2 border-gray-100 p-8 shadow-sm flex flex-col">
                  <h3 className="text-xl font-black text-[#2F4157] mb-2 flex items-center gap-2">
                    <CreditCard className="text-[#E56668]" size={24} /> Payment & Billing
                  </h3>
                  <p className="text-sm text-gray-500 mb-8">Manage your cards, receipts, and billing history via our secure payment partner.</p>
                  
                  <div className="flex-1 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 relative">
                      <img src="https://mayar.id/assets/images/logo/mayar-logo.png" alt="Mayar" className="h-6 opacity-60 grayscale hover:grayscale-0 transition-all absolute z-10" onError={(e) => e.currentTarget.style.opacity = '0'} />
                      <ExternalLink size={24} className="text-gray-300" />
                    </div>
                    <h4 className="font-bold text-[#2F4157] mb-1">Customer Portal</h4>
                    <p className="text-xs text-gray-500 mb-6 max-w-[200px]">Update your payment details or download past invoices.</p>
                    {/* UPDATED MAYAR LINK */}
                    <a href="https://ielsco.myr.id/portal" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white border-2 border-gray-200 text-[#2F4157] rounded-xl text-sm font-bold hover:border-[#E56668] hover:text-[#E56668] transition-all w-full sm:w-auto">
                      Open Billing Portal
                    </a>
                  </div>
                </div>
              )}

              {/* 3. RECENT ACTIVITY / SYNC LOG */}
              <div className="bg-white rounded-[2rem] border-2 border-gray-100 p-8 shadow-sm flex flex-col">
                <h3 className="text-xl font-black text-[#2F4157] mb-6 flex items-center gap-2">
                  <History className="text-[#E56668]" size={24} /> Subscription Logs
                </h3>
                <div className="space-y-3 flex-1">
                  {!isExplorer ? (
                    <>
                      <HistoryItem 
                        title={`IELS ${sub?.tier} Activation`} 
                        date={sub?.startDate ? new Date(sub.startDate).toLocaleDateString() : "System Sync"} 
                        amount="Active" 
                        status="success" 
                      />
                      {isExpired && (
                        <HistoryItem 
                          title="Membership Expired" 
                          date={sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : "Recent"} 
                          amount="Action Needed" 
                          status="neutral" 
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-500">You are currently on the free Explorer tier. Upgrade to unlock history.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. DANGER ZONE - Only for Insiders (Visionary is lifetime, Explorer has nothing to cancel) */}
            {isInsider && !isExpired && (
              <div className="mt-12 text-center pb-8">
                <button 
                  onClick={() => setShowCancelModal(true)}
                  className="text-sm font-bold text-gray-400 hover:text-red-500 underline underline-offset-4 transition-colors"
                >
                  I want to cancel my subscription
                </button>
              </div>
            )}

          </div>
        </div>
      </DashboardLayout>

      {/* RENDER MODAL PRICING KALO DIPANGGIL */}
      {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}

      {/* CANCELLATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2F4157]/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 flex items-start gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-red-500">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-red-900 mb-1">Are you sure?</h3>
                <p className="text-sm text-red-700/80 leading-relaxed">
                  If you cancel now, your plan won't renew at the end of the billing cycle. You will lose access to your Public Portfolio and the Goal System.
                </p>
              </div>
            </div>
            <div className="p-6 bg-white space-y-4">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="w-full py-4 bg-[#2F4157] text-white rounded-xl font-bold hover:bg-[#1e2b3a] transition-all"
              >
                Nevermind, keep my access
              </button>
              
              {/* UPDATED MAYAR LINK */}
              <a 
                href="https://ielsco.myr.id/portal" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setShowCancelModal(false)}
                className="w-full flex justify-center py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-xl font-bold hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                Proceed to Mayar Portal
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- Micro Components ---

function BenefitItem({ label, desc, active }: { label: string, desc: string, active: boolean }) {
  return (
    <div className={cn("flex items-start gap-3 p-4 rounded-2xl transition-all", active ? "bg-blue-50/50" : "opacity-40 grayscale")}>
      <CheckCircle2 size={20} className={cn("mt-0.5 shrink-0", active ? "text-blue-500" : "text-gray-400")} />
      <div>
        <span className="text-sm font-bold text-[#2F4157] block">{label}</span>
        <span className="text-xs text-gray-500 block mt-0.5">{desc}</span>
      </div>
      {!active && <LockIcon />}
    </div>
  );
}

function HistoryItem({ title, date, amount, status }: { title: string, date: string, amount: string, status: 'success'|'neutral' }) {
  return (
    <div className="flex justify-between items-center p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors cursor-default">
      <div>
        <p className="text-sm font-bold text-[#2F4157]">{title}</p>
        <p className="text-xs text-gray-400 mt-1">{date}</p>
      </div>
      <div className={cn(
        "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
        status === 'success' ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
      )}>
        {amount}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <div className="ml-auto bg-gray-100 p-1.5 rounded-md">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    </div>
  );
}