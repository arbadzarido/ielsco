"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import PricingModal from "@/components/subscription/PricingModal";
import { createBrowserClient } from "@supabase/ssr";
import {
  Briefcase, Plus, ExternalLink, Share2, Download, Crown, Lock, Edit2, 
  Trash2, Link as LinkIcon, Sparkles, Palette, Globe, EyeOff, Eye, 
  Calendar, Loader2, Settings, CheckCircle2, AlertTriangle, X, MessageCircle, Linkedin, Twitter
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
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

export default function PortfolioPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // User & Data State
  const [userData, setUserData] = useState({
    id: "",
    name: "",
    username: "",
    tier: "explorer" as UserTier,
    avatar: "",
    isPublic: false
  });
  
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State Modals
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUrlSettings, setShowUrlSettings] = useState(false);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  
  // Custom Toast State
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error' | 'info'}>({ show: false, msg: '', type: 'success' });

  // Form States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");

  const [formData, setFormData] = useState({
    project_name: "",
    category: "Content & Writing",
    role: "",
    description: "",
    output_link: "", 
    tags: "", 
    date: new Date().toISOString().split('T')[0]
  });

  const categories = ["Content & Writing", "Public Speaking", "Event Management", "Design & Media", "Leadership", "Other"];

  // --- HELPER: TOAST NOTIFICATION ---
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3500);
  };

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchPortfolioData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbUser } = await supabase
        .from("users")
        .select("full_name, avatar_url, username, is_portfolio_public")
        .eq("id", user.id)
        .maybeSingle();

      const { data: dbMembership } = await supabase
        .from("memberships")
        .select("tier")
        .eq("user_id", user.id)
        .maybeSingle();

      const dbTier = dbMembership?.tier;
      let uiTier: UserTier = "explorer";
      if (dbTier === "pro") uiTier = "insider";
      else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";

      const fetchedUsername = dbUser?.username || user.id.substring(0, 8);

   setUserData({
  id: user.id,
  name: dbUser?.full_name || user.user_metadata?.full_name || "Member",
  username: fetchedUsername, 
  // 👇 Tambahin .picture di sini
  avatar: dbUser?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
  tier: uiTier,
  isPublic: dbUser?.is_portfolio_public || false
});
      setNewUsername(fetchedUsername);

      if (uiTier === "insider" || uiTier === "visionary") {
        const { data: contribs } = await supabase
          .from("contributions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });
          
        if (contribs) setContributions(contribs);
      }
      setLoading(false);
    };
    fetchPortfolioData();
  }, [supabase]);

  const hasAccess = userData.tier === "insider" || userData.tier === "visionary";
  const portfolioLink = `https://ielsco.com/portfolio/${userData.username}`;

  // --- ACTIONS ---
  const handleCopyLink = () => {
    navigator.clipboard.writeText(portfolioLink);
    showToast("Portfolio link copied to clipboard!");
  };

  const handleToggleVisibility = async () => {
    const newStatus = !userData.isPublic;
    setUserData(prev => ({ ...prev, isPublic: newStatus })); 
    await supabase.from("users").update({ is_portfolio_public: newStatus }).eq("id", userData.id);
    showToast(newStatus ? "Portfolio is now Live & Public! 🌍" : "Portfolio is hidden. 🔒", "info");
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameError("");
    setIsSubmitting(true);
    
    // Normalize string: lowercase, no spaces, only alphanumeric and underscore
    const formattedUsername = newUsername.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setNewUsername(formattedUsername);

    if (formattedUsername.length < 4) {
      setUsernameError("Username must be at least 4 characters.");
      setIsSubmitting(false);
      return;
    }

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", formattedUsername)
      .neq("id", userData.id)
      .maybeSingle();

    if (existingUser) {
      setUsernameError("Username is already taken. Try another one.");
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase.from("users").update({ username: formattedUsername }).eq("id", userData.id);
    
    if (!error) {
      setUserData(prev => ({ ...prev, username: formattedUsername }));
      setShowUrlSettings(false);
      showToast("Custom URL successfully claimed! 🎉");
    } else {
      setUsernameError("Failed to update URL. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleSubmitContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newContrib = {
      user_id: userData.id,
      project_name: formData.project_name,
      category: formData.category,
      role: formData.role,
      description: formData.description,
      output_links: formData.output_link ? [formData.output_link] : [],
      tags: formData.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      date: formData.date
    };

    const { data, error } = await supabase.from("contributions").insert([newContrib]).select().single();

    if (!error && data) {
      setContributions([data, ...contributions]);
      setShowAddModal(false);
      setFormData({ project_name: "", category: "Content & Writing", role: "", description: "", output_link: "", tags: "", date: new Date().toISOString().split('T')[0] });
      showToast("Project successfully added to portfolio!");
    } else {
      showToast("Failed to save project.", "error");
    }
    setIsSubmitting(false);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const idToDelete = deleteModal;
    setDeleteModal(null);
    setContributions(prev => prev.filter(c => c.id !== idToDelete)); 
    await supabase.from("contributions").delete().eq("id", idToDelete);
    showToast("Project deleted successfully.");
  };

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="animate-spin text-[#E56668]" size={40} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
    <DashboardLayout userTier={userData.tier} userName={userData.name} userAvatar={userData.avatar}>
      <div className="min-h-screen bg-[#F7F8FA] relative">
        
        {/* --- CUSTOM TOAST NOTIFICATION --- */}
        {toast.show && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10000] animate-in slide-in-from-top-5 fade-in duration-300">
            <div className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-full shadow-2xl border font-semibold text-sm",
              toast.type === 'success' ? "bg-green-50 text-green-700 border-green-200" : 
              toast.type === 'error' ? "bg-red-50 text-red-700 border-red-200" : 
              "bg-blue-50 text-blue-700 border-blue-200"
            )}>
              {toast.type === 'success' ? <CheckCircle2 size={18} className="text-green-500" /> : 
               toast.type === 'error' ? <AlertTriangle size={18} className="text-red-500" /> : 
               <Globe size={18} className="text-blue-500" />}
              {toast.msg}
            </div>
          </div>
        )}

        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-24">

          {!hasAccess ? (
            /* === LOCKED STATE === */
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#2F4157] to-[#1e2a38] text-white p-8 lg:p-16 text-center shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#E56668] blur-[120px] opacity-20 rounded-full pointer-events-none"></div>
              <div className="relative z-10 max-w-3xl mx-auto">
                <div className="w-20 h-20 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner">
                  <Lock className="text-white/80" size={40} />
                </div>
                <h1 className="text-3xl lg:text-5xl font-black mb-6 tracking-tight">Your Work Deserves an Audience</h1>
                <p className="text-white/70 text-lg mb-12 leading-relaxed max-w-2xl mx-auto">
                  Upgrade to Insider to unlock your dynamic portfolio. Claim your custom URL, showcase global projects, and stand out to international recruiters.
                </p>
                <button 
                  onClick={() => setShowPricingModal(true)}
                  className="px-8 py-4 bg-[#E56668] text-white rounded-xl font-bold text-lg hover:bg-[#d45b5d] hover:-translate-y-1 transition-all inline-flex items-center gap-3 shadow-lg shadow-red-500/20"
                >
                  <Crown size={20} /> Unlock Portfolio Feature
                </button>
              </div>
            </div>
          ) : (
            /* === UNLOCKED STATE === */
            <>
              {/* Header & Visibility Toggle */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-4">
                <div>
                  <h1 className="text-3xl font-black text-[#2F4157] mb-2 flex items-center gap-3">
                    My Portfolio <Sparkles className="text-yellow-500" size={24} fill="currentColor" />
                  </h1>
                  <p className="text-gray-500 font-medium">
                    Curate your professional journey and build your personal brand.
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* The Privacy Toggle */}
                  <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-sm font-bold text-gray-600">Visibility:</span>
                    <button 
                      onClick={handleToggleVisibility}
                      className={cn(
                        "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300",
                        userData.isPublic ? "bg-green-500" : "bg-gray-300"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm",
                        userData.isPublic ? "translate-x-8" : "translate-x-1"
                      )} />
                    </button>
                    <span className={cn("text-xs font-bold uppercase tracking-wider w-16", userData.isPublic ? "text-green-600" : "text-gray-400")}>
                      {userData.isPublic ? "Live" : "Hidden"}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#2F4157] text-white rounded-xl font-bold hover:bg-[#1e2a38] transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <Plus size={18} /> Add Project
                  </button>
                </div>
              </div>

              {/* Action Banner (URL Claimer) */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-5 w-full md:w-auto">
                  <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500", userData.isPublic ? "bg-green-50 text-green-600 ring-4 ring-green-50" : "bg-gray-100 text-gray-400")}>
                    {userData.isPublic ? <Globe size={28} /> : <EyeOff size={28} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#2F4157] text-lg">
                        {userData.isPublic ? "Your portfolio is live to the world!" : "Your portfolio is currently hidden."}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                      <LinkIcon size={14} className="shrink-0" /> 
                      <span className="font-mono text-[#E56668] truncate">{portfolioLink}</span>
                      <button onClick={() => setShowUrlSettings(true)} className="ml-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-md font-bold transition-colors flex items-center gap-1">
                        <Settings size={12}/> Edit URL
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto shrink-0">
                  <button
                    onClick={handleCopyLink}
                    disabled={!userData.isPublic}
                    className="flex-1 md:flex-none px-6 py-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    disabled={!userData.isPublic}
                    className="flex-1 md:flex-none px-6 py-3 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d45b5d] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-500/20 hover:-translate-y-0.5"
                  >
                    Share Profile
                  </button>
                </div>
              </div>

              {/* Contributions Grid */}
              <div className="mt-8">
                {contributions.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {contributions.map((contribution) => (
                      <div key={contribution.id} className="bg-white rounded-2xl border border-gray-100 p-6 lg:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group relative overflow-hidden">
                        
                        {/* Subtle Category Gradient Top Border */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E56668]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex justify-between items-start mb-5">
                          <div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F4157] bg-gray-100 px-2.5 py-1 rounded-md">
                                {contribution.category}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E56668] bg-[#E56668]/10 px-2.5 py-1 rounded-md">
                                {contribution.role}
                              </span>
                            </div>
                            <h3 className="text-xl font-black text-[#2F4157] line-clamp-2 group-hover:text-[#E56668] transition-colors">
                              {contribution.project_name}
                            </h3>
                          </div>
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setDeleteModal(contribution.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm leading-relaxed mb-6 flex-1">
                          {contribution.description}
                        </p>

                        <div className="space-y-5 pt-5 border-t border-gray-50">
                          {contribution.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {contribution.tags.map((tag, idx) => (
                                <span key={idx} className="text-[11px] font-bold text-gray-400 border border-gray-200 px-2.5 py-1 rounded-lg">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {contribution.output_links.map((link, idx) => (
                                <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors">
                                  <ExternalLink size={14} /> View Work
                                </a>
                              ))}
                            </div>
                            <span className="text-xs text-gray-400 font-bold flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg">
                              <Calendar size={14} /> {new Date(contribution.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-16 border-2 border-dashed border-gray-200 text-center">
                    <div className="w-24 h-24 rounded-full bg-[#E56668]/10 flex items-center justify-center mx-auto mb-6">
                      <Briefcase className="text-[#E56668]" size={40} />
                    </div>
                    <h3 className="text-2xl font-black text-[#2F4157] mb-3">
                      Your Canvas is Empty
                    </h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
                      Record your first language project, volunteer experience, or major assignment to start building your global footprint.
                    </p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#2F4157] text-white rounded-xl font-bold hover:bg-[#1e2a38] hover:shadow-xl hover:-translate-y-1 transition-all"
                    >
                      <Plus size={20} /> Add Your First Project
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
</DashboardLayout>
      {/* --- MODALS --- */}

      {/* 1. URL Settings Modal */}
      {showUrlSettings && hasAccess && (
        <div className="fixed inset-0 bg-[#2F4157]/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => setShowUrlSettings(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
            <h2 className="text-2xl font-black text-[#2F4157] mb-2">Claim Custom URL</h2>
            <p className="text-sm text-gray-500 mb-6">Personalize your portfolio link so it's easy to remember and share.</p>
            
            <form onSubmit={handleUpdateUsername}>
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Your Link</label>
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#E56668] transition-colors bg-gray-50">
                  <span className="px-4 text-gray-400 text-sm font-mono border-r border-gray-200 bg-gray-100 shrink-0">ielsco.com/portfolio/</span>
                  <input 
                    type="text" 
                    value={newUsername} 
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full px-3 py-3 bg-transparent outline-none text-sm font-bold text-[#2F4157]"
                    placeholder="username"
                  />
                </div>
                {usernameError && <p className="text-red-500 text-xs mt-2 flex items-center gap-1 font-medium"><AlertTriangle size={12}/> {usernameError}</p>}
                <p className="text-xs text-gray-400 mt-2">Only letters, numbers, and underscores allowed.</p>
              </div>

              <button type="submit" disabled={isSubmitting || newUsername === userData.username} className="w-full py-3.5 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d45b5d] transition-all disabled:opacity-50 flex justify-center items-center shadow-md">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Save Custom URL"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Custom Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-[#2F4157]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>
            <h3 className="text-xl font-black text-[#2F4157] mb-2">Delete Project?</h3>
            <p className="text-gray-500 text-sm mb-8">This action cannot be undone. Are you sure you want to remove this project from your portfolio?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-md">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Campaignable Share Modal */}
      {showShareModal && hasAccess && (
        <div className="fixed inset-0 bg-[#2F4157]/80 backdrop-blur-md z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 relative shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-white hover:text-white/80 bg-black/20 p-2 rounded-full backdrop-blur-sm transition-colors z-20">
              <X size={16} />
            </button>
            
            {/* The Digital ID Card Preview */}
            <div className="bg-gradient-to-br from-[#2F4157] to-[#1e2a38] rounded-3xl p-8 text-white relative overflow-hidden mb-6 shadow-xl">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#E56668]/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                {userData.avatar ? (
                  <img src={userData.avatar} alt="Profile" className="w-24 h-24 rounded-full border-4 border-white/10 shadow-lg mb-4 object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#E56668] border-4 border-white/10 shadow-lg mb-4 flex items-center justify-center text-3xl font-bold">
                    {userData.name.charAt(0)}
                  </div>
                )}
                <h3 className="text-2xl font-black tracking-tight mb-1">{userData.name}</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#E56668] bg-white px-3 py-1 rounded-full mb-6 shadow-sm">
                  IELS {userData.tier} Member
                </span>
                
                <div className="w-full bg-white/10 rounded-xl p-3 border border-white/10 flex items-center justify-center gap-2">
                  <Globe size={16} className="text-blue-300" />
                  <span className="font-mono text-sm tracking-tight text-white/90">ielsco.com/portfolio/{userData.username}</span>
                </div>
              </div>
            </div>

            <h4 className="text-center font-bold text-[#2F4157] mb-4">Share your portfolio</h4>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button onClick={() => { handleCopyLink(); setShowShareModal(false); }} className="col-span-2 py-3.5 bg-gray-50 border-2 border-dashed border-gray-200 text-[#2F4157] rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                <LinkIcon size={18} /> Copy Link
              </button>
              <a href={`https://wa.me/?text=Check out my professional portfolio on IELS! ${portfolioLink}`} target="_blank" rel="noreferrer" className="py-3 bg-[#25D366] text-white rounded-2xl font-bold hover:bg-[#20b858] transition-all flex justify-center items-center shadow-md shadow-green-500/20 gap-2">
                <MessageCircle size={18} /> WhatsApp
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${portfolioLink}`} target="_blank" rel="noreferrer" className="py-3 bg-[#0A66C2] text-white rounded-2xl font-bold hover:bg-[#0958a8] transition-all flex justify-center items-center shadow-md shadow-blue-500/20 gap-2">
                <Linkedin size={18} /> LinkedIn
              </a>
            </div>
          </div>
        </div>
      )}
{/* 4. Add Contribution Modal */}
      {showAddModal && hasAccess && (
        <div className="fixed inset-0 bg-[#2F4157]/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative overflow-y-auto max-h-[90vh]">
            <button 
              type="button"
              onClick={() => setShowAddModal(false)} 
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-black text-[#2F4157] mb-6 flex items-center gap-2 pr-10">
               Log New Project <Sparkles className="text-[#E56668]" size={20} />
            </h2>
            
            <form onSubmit={handleSubmitContribution} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Project / Event Name</label>
                  <input required value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} type="text" placeholder="e.g. TOEFL Mentoring Program" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E56668] outline-none transition-all font-bold text-[#2F4157]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Category</label>
                  <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E56668] outline-none transition-all font-bold text-[#2F4157] appearance-none">
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Your Role</label>
                <input required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} type="text" placeholder="e.g. Lead Coordinator, Speaker, Writer" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E56668] outline-none transition-all font-bold text-[#2F4157]" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Detailed Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} placeholder="What did you do? What was the impact? Use action verbs." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E56668] outline-none transition-all font-medium text-gray-600 resize-none leading-relaxed" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  {/* LABEL GUE GANTI BIAR JELAS */}
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Link To Your Work / Proof <span className="text-gray-400 normal-case font-normal">(Optional)</span></label>
                  <input value={formData.output_link} onChange={e => setFormData({...formData, output_link: e.target.value})} type="url" placeholder="e.g. Google Drive, Medium, YouTube link" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E56668] outline-none transition-all text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Completion Date</label>
                  <input required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E56668] outline-none transition-all text-sm font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Skills Gained / Tags</label>
                <input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} type="text" placeholder="e.g. Public Speaking, Leadership, IELTS (Comma separated)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#E56668] outline-none transition-all text-sm font-medium" />
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-8 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-[#2F4157] text-white rounded-xl font-bold hover:bg-[#1e2a38] transition-all flex justify-center items-center shadow-xl hover:-translate-y-1">
                  {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : "Publish to Portfolio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricingModal && <PricingModal onClose={() => setShowPricingModal(false)} />}
      </>
    
  );
}