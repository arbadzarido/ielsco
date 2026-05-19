"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  User, Mail, Building2, Calendar, Target, Edit2, Save,
  Crown, Loader2, Camera, MapPin, Phone, Linkedin, Instagram,
  Briefcase, GraduationCap, Sparkles, AlertCircle, X, CheckCircle2, Info, ChevronDown
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// --- TYPES ---
type TierType = "explorer" | "insider" | "visionary";

interface UserData {
  id: string;
  name: string;
  email: string;
  tier: TierType;
  avatar: string;
  user_id_code: string;
}

interface FormData {
  gender: string;
  birth_date: string;
  phone: string;
  domicile: string;
  occupation: string;
  institution_name: string;
  institution_role: string;
  instagram: string;
  linkedin: string;
  english_level: string;
  goals: string;
}

// --- 🎭 PERSONA GENERATOR ---
const getUserPersona = (data: FormData & { tier: TierType }) => {
  const isExclusive = data.tier === "visionary";
  const isPro = data.tier === "insider";

  let title = "The Educator 🎒";
  let desc = "Guiding students to global opportunities.";
  let color = "bg-blue-50 text-blue-600 border-blue-100";

  if (data.occupation === "Student") {
    title = isPro ? "Academic Weapon 📚" : "Campus Explorer 🎓";
    desc = isPro ? "GPA stonks going up! 📈" : "Surviving deadlines & coffee.";
  } else if (data.occupation === "Worker" || data.occupation === "Teacher") {
    title = isPro ? "Master Mentor 💼" : "Dedicated Teacher ☕";
    desc = isPro ? "Shaping the future, one class at a time." : "Inspiring minds daily.";
  }

  if (isExclusive) {
    title = "The Visionary 👑";
    color = "bg-yellow-100 text-yellow-800 border-yellow-200 shadow-sm";
    desc = "Main Character Energy. Leading the way.";
  } else if (isPro) {
    title = `Insider: ${title}`;
    color = "bg-[#E56668]/10 text-[#E56668] border-[#E56668]/20 shadow-sm";
  }

  return { title, color, desc };
};

export default function ProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- STATE DECLARATIONS ---
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom Pop-up State
  const [popup, setPopup] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' | 'info' | 'easter' }>({
    show: false, title: "", message: "", type: "info"
  });

  // Easter Egg
  const [clickCount, setClickCount] = useState(0);
  const [easterEggActive, setEasterEggActive] = useState(false);

  // User State
  const [user, setUser] = useState<UserData>({
    id: "", name: "", email: "", tier: "explorer", avatar: "", user_id_code: "IELS-NEW"
  });

  // Form State
  const [formData, setFormData] = useState<FormData>({
    gender: "", birth_date: "", phone: "", domicile: "", occupation: "Teacher",
    institution_name: "", institution_role: "", instagram: "", linkedin: "",
    english_level: "", goals: ""
  });

  // --- SINKRONISASI DATA ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: dbUser } = await supabase
        .from("users")
        .select("*") 
        .eq("id", authUser.id)
        .maybeSingle();

      const uiTier: TierType = (dbUser?.subscription_role?.toLowerCase() as TierType) || "explorer";

      setUser({
        id: authUser.id,
        name: dbUser?.full_name || authUser.user_metadata?.full_name || "Teacher",
        email: authUser.email || "",
        tier: uiTier,
        avatar: dbUser?.avatar_url || authUser.user_metadata?.avatar_url || "",
        user_id_code: dbUser?.user_id_code || "IELS-MEMBER"
      });

      setFormData({
        gender: dbUser?.gender || "",
        birth_date: dbUser?.birth_date || "",
        phone: dbUser?.phone || "",
        domicile: dbUser?.domicile || "",
        occupation: dbUser?.occupation || "Teacher",
        institution_name: dbUser?.institution_name || "",
        institution_role: dbUser?.institution_role || "",
        instagram: dbUser?.instagram || "",
        linkedin: dbUser?.linkedin || "",
        english_level: dbUser?.english_level || "",
        goals: dbUser?.goals || ""
      });

      setLoading(false);
    };

    fetchUser();
  }, [supabase]);

  // --- HANDLERS ---
  const showPopup = (title: string, message: string, type: 'success' | 'error' | 'info' | 'easter') => {
    setPopup({ show: true, title, message, type });
    if (type !== 'error') {
      setTimeout(() => setPopup(prev => ({ ...prev, show: false })), 4000);
    }
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showPopup(
        "Upload Feature Locked", 
        "Avatar upload logic needs Supabase Storage configured. We'll build this soon!", 
        "info"
      );
    }
  };

  const handlePersonaClick = () => {
    setClickCount(prev => prev + 1);
    if (clickCount + 1 === 5) {
      setEasterEggActive(true);
      showPopup(
        "🎉 EASTER EGG FOUND!", 
        "You are now officially a 'Grandmaster of English' (Just kidding, keep inspiring!)", 
        "easter"
      );
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const sanitize = (val: string) => (val === "" ? null : val);

      const updates = {
        gender: sanitize(formData.gender),
        birth_date: sanitize(formData.birth_date),
        phone: sanitize(formData.phone),
        domicile: sanitize(formData.domicile),
        occupation: sanitize(formData.occupation),
        institution_name: sanitize(formData.institution_name),
        institution_role: sanitize(formData.institution_role),
        instagram: sanitize(formData.instagram),
        linkedin: sanitize(formData.linkedin),
        english_level: sanitize(formData.english_level),
        goals: sanitize(formData.goals),
        full_name: user.name,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('users') 
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;
      
      setIsEditing(false);
      showPopup("Profile Updated", "Your profile changes have been successfully saved.", "success");
      
      window.location.reload();
    } catch (err) {
      console.error("Failed to update profile:", err);
      showPopup("Save Failed", "Failed to save profile changes. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="animate-spin text-[#E56668]" size={36} />
      </div>
    );
  }

  const persona = getUserPersona({ ...formData, tier: user.tier });

  return (
    <div className="pb-16 relative">
      
      {/* --- CUSTOM IELS POP-UP MODAL --- */}
      {popup.show && (
        <div className="fixed inset-0 bg-[#1A2534]/40 backdrop-blur-sm z-50 flex items-center justify-center px-4 transition-all duration-300 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative border border-gray-100">
            <button 
              onClick={() => setPopup(prev => ({ ...prev, show: false }))}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center text-center mt-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                popup.type === 'success' ? 'bg-green-100 text-green-600' :
                popup.type === 'error' ? 'bg-red-100 text-red-600' :
                popup.type === 'easter' ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {popup.type === 'success' ? <CheckCircle2 size={32} /> :
                 popup.type === 'error' ? <AlertCircle size={32} /> :
                 popup.type === 'easter' ? <Crown size={32} /> :
                 <Info size={32} />}
              </div>
              <h3 className="text-xl font-black text-[#1A2534] mb-2">{popup.title}</h3>
              <p className="text-gray-600 text-[13px] leading-relaxed mb-6">{popup.message}</p>
              <button 
                onClick={() => setPopup(prev => ({ ...prev, show: false }))}
                className="w-full py-3 bg-[#1A2534] text-white rounded-xl font-bold hover:bg-[#2F4157] transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER BANNER --- */}
      <div className="h-44 bg-gradient-to-r from-[#1A2534] via-[#2F4157] to-[#1A2534] rounded-2xl relative overflow-hidden mb-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        
        {/* --- PROFILE CARD UTAMA --- */}
        <div className="bg-white rounded-3xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#E56668]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

          {/* AVATAR SECTION */}
          <div className="flex-shrink-0 relative group">
            <div 
              onClick={handleAvatarClick}
              className={cn(
                "w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white shadow-md overflow-hidden relative bg-[#F7F8FA] flex items-center justify-center",
                isEditing ? "cursor-pointer hover:ring-4 hover:ring-[#E56668]/20 transition-all" : ""
              )}
            >
              {user.avatar ? (
                <Image src={user.avatar} alt="Profile" fill className="object-cover" />
              ) : (
                <span className="text-[#1A2534] text-3xl md:text-4xl font-black">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
              
              {isEditing && (
                <div className="absolute inset-0 bg-[#1A2534]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Camera className="text-white" size={28} />
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*" />
          </div>

          {/* INFO & ACTIONS */}
          <div className="flex-1 w-full text-center md:text-left">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4 mb-4">
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={user.name}
                      onChange={(e) => setUser({...user, name: e.target.value})}
                      className="text-xl md:text-2xl font-black text-[#1A2534] border-b-2 border-gray-200 focus:border-[#E56668] focus:outline-none bg-transparent w-full max-w-sm text-center md:text-left"
                    />
                  ) : (
                    <h1 className="text-2xl md:text-3xl font-black text-[#1A2534] tracking-tight">{user.name}</h1>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1",
                    user.tier === 'insider' 
                      ? 'bg-[#E56668]/10 text-[#E56668] border-[#E56668]/20' 
                      : (user.tier === 'visionary' 
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-blue-50 text-blue-600 border-blue-100')
                  )}>
                    {user.tier === 'insider' && <Sparkles size={10} fill="currentColor" />}
                    {user.tier === 'visionary' && <Crown size={10} fill="currentColor" />}
                    {user.tier}
                  </span>

                  <span className="text-slate-400 text-[12px] flex items-center gap-1 font-medium">
                    <Mail size={13} /> {user.email}
                  </span>
                  
                  <span className="px-2.5 py-0.5 bg-[#F7F8FA] text-slate-500 rounded-full text-[10px] font-mono tracking-wider border border-gray-100">
                    #{user.user_id_code}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 pt-1">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#1A2534] rounded-xl font-bold hover:border-[#E56668] hover:text-[#E56668] transition-all shadow-sm text-[12px]"
                  >
                    <Edit2 size={13} /> Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3.5 py-2 bg-[#F7F8FA] text-slate-600 rounded-xl font-bold hover:bg-gray-200 transition-all text-[12px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1A2534] text-white rounded-xl font-bold hover:bg-[#2F4157] transition-all shadow-md text-[12px]"
                    >
                      <Save size={13} /> Save Changes
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* INTERACTIVE PERSONA BADGE */}
            <div className="flex flex-col items-center md:items-start">
              <div 
                onClick={handlePersonaClick}
                className={cn(
                  "inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl cursor-pointer transition-all select-none border mt-1",
                  easterEggActive ? "bg-gradient-to-r from-[#E56668] to-orange-500 text-white animate-pulse border-transparent" : persona.color
                )}
              >
                <div className={cn("p-1 rounded-full", easterEggActive ? "bg-white/20" : "bg-white shadow-sm")}>
                  {easterEggActive ? <Crown size={14} /> : <Sparkles size={14} />}
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] opacity-75">Current Persona</p>
                  <p className="font-bold text-[12px] leading-none mt-0.5">{easterEggActive ? "Grandmaster of IELS 👑" : persona.title}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 italic">
                "{easterEggActive ? "You unlocked the secret rank!" : persona.desc}"
              </p>
            </div>
          </div>
        </div>

        {/* --- CONTENT GRID --- */}
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. BIODATA */}
            <section className="bg-white rounded-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 relative overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-1.5 h-full bg-[#E56668] transition-opacity", isEditing ? 'opacity-100' : 'opacity-0')}></div>
              <h3 className="text-[14px] font-black text-[#1A2534] mb-6 flex items-center gap-2 uppercase tracking-wider">
                <User className="text-[#E56668]" size={16} /> Personal Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-5">
                <InputGroup label="Gender" isEditing={isEditing}>
                  <div className="relative">
                    <select 
                      className={cn(
                        "w-full p-2.5 rounded-xl border transition-all text-[13px] outline-none appearance-none font-medium",
                        isEditing 
                            ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                            : "bg-[#F7F8FA] border-transparent text-slate-600"
                      )}
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      disabled={!isEditing}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </InputGroup>

                <InputGroup label="Date of Birth" isEditing={isEditing}>
                  <div className="relative">
                    <input 
                      type="date"
                      className={cn(
                          "w-full p-2.5 pl-10 rounded-xl border transition-all text-[13px] outline-none font-medium",
                          isEditing 
                              ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                              : "bg-[#F7F8FA] border-transparent text-slate-600"
                      )}
                      value={formData.birth_date}
                      onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                      disabled={!isEditing}
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  </div>
                </InputGroup>

                <InputGroup label="Phone Number" isEditing={isEditing}>
                  <div className="relative">
                    <input 
                      type="tel"
                      placeholder="+62..."
                      className={cn(
                          "w-full p-2.5 pl-10 rounded-xl border transition-all text-[13px] outline-none font-medium",
                          isEditing 
                              ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                              : "bg-[#F7F8FA] border-transparent text-slate-600"
                      )}
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      disabled={!isEditing}
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  </div>
                </InputGroup>

                <InputGroup label="Domicile (City, Country)" isEditing={isEditing}>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="e.g. Jakarta, Indonesia"
                      className={cn(
                          "w-full p-2.5 pl-10 rounded-xl border transition-all text-[13px] outline-none font-medium",
                          isEditing 
                              ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                              : "bg-[#F7F8FA] border-transparent text-slate-600"
                      )}
                      value={formData.domicile}
                      onChange={(e) => setFormData({...formData, domicile: e.target.value})}
                      disabled={!isEditing}
                    />
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  </div>
                </InputGroup>
              </div>
            </section>

            {/* 2. ACADEMIC / PROFESSIONAL */}
            <section className="bg-white rounded-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 relative overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-1.5 h-full bg-blue-500 transition-opacity", isEditing ? 'opacity-100' : 'opacity-0')}></div>
              <h3 className="text-[14px] font-black text-[#1A2534] mb-6 flex items-center gap-2 uppercase tracking-wider">
                <Briefcase className="text-[#E56668]" size={16} /> Occupation & Education
              </h3>

              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {["Student", "Teacher", "Worker", "Other"].map((type) => (
                    <button
                      key={type}
                      onClick={() => isEditing && setFormData({...formData, occupation: type})}
                      disabled={!isEditing}
                      className={cn(
                        "py-2 px-3 rounded-xl text-[12px] font-bold border transition-all",
                        formData.occupation === type 
                          ? "bg-[#1A2534] text-white border-[#1A2534] shadow-sm" 
                          : "bg-white text-slate-500 border-gray-200 hover:bg-gray-50",
                        !isEditing && formData.occupation !== type ? "opacity-40 cursor-default" : ""
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-5 p-5 bg-[#F7F8FA] rounded-[16px] border border-gray-100">
                  <InputGroup 
                    label={formData.occupation === "Worker" || formData.occupation === "Teacher" ? "Company / Organization" : "School / University"} 
                    isEditing={isEditing}
                  >
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder={formData.occupation === "Worker" ? "e.g. GoTo, Google" : "e.g. SMAN 1 Malang"}
                        className={cn(
                          "w-full p-2.5 pl-10 rounded-xl border transition-all text-[13px] outline-none font-medium",
                          isEditing 
                              ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                              : "bg-white border-transparent text-slate-600"
                        )}
                        value={formData.institution_name}
                        onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
                        disabled={!isEditing}
                      />
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    </div>
                  </InputGroup>

                  <InputGroup 
                    label={formData.occupation === "Worker" || formData.occupation === "Teacher" ? "Job Title / Role" : "Major / Field of Study"} 
                    isEditing={isEditing}
                  >
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder={formData.occupation === "Teacher" ? "e.g. English Teacher" : "e.g. Science"}
                        className={cn(
                          "w-full p-2.5 pl-10 rounded-xl border transition-all text-[13px] outline-none font-medium",
                          isEditing 
                              ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                              : "bg-white border-transparent text-slate-600"
                        )}
                        value={formData.institution_role}
                        onChange={(e) => setFormData({...formData, institution_role: e.target.value})}
                        disabled={!isEditing}
                      />
                      <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    </div>
                  </InputGroup>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COL: Socials & Settings */}
          <div className="space-y-6">
            
            {/* SOCIALS */}
            <section className="bg-white rounded-[24px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-gray-100 p-6 relative overflow-hidden">
              <div className={cn("absolute top-0 left-0 w-1.5 h-full bg-purple-500 transition-opacity", isEditing ? 'opacity-100' : 'opacity-0')}></div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[14px] font-black text-[#1A2534] flex items-center gap-2 uppercase tracking-wider">
                  <Target className="text-[#E56668]" size={15} /> Socials
                </h3>
              </div>

              <div className="space-y-4">
                <InputGroup label="Instagram Username" isEditing={isEditing}>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="@username"
                      className={cn(
                          "w-full p-2.5 pl-10 rounded-xl border transition-all text-[13px] outline-none font-medium",
                          isEditing 
                              ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                              : "bg-[#F7F8FA] border-transparent text-slate-600"
                      )}
                      value={formData.instagram}
                      onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                      disabled={!isEditing}
                    />
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500" size={15} />
                  </div>
                </InputGroup>

                <InputGroup label="LinkedIn URL" isEditing={isEditing}>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="linkedin.com/in/..."
                      className={cn(
                          "w-full p-2.5 pl-10 rounded-xl border transition-all text-[13px] outline-none font-medium",
                          isEditing 
                              ? "bg-white border-gray-200 focus:ring-1 focus:ring-[#E56668] focus:border-[#E56668]" 
                              : "bg-[#F7F8FA] border-transparent text-slate-600"
                      )}
                      value={formData.linkedin}
                      onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                      disabled={!isEditing}
                    />
                    <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={15} />
                  </div>
                </InputGroup>
              </div>
            </section>

            {/* LEARNING GOALS */}
            <section className="bg-[#1A2534] rounded-[24px] shadow-lg border border-[#2F4157] p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              <h3 className="text-[13px] font-black mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Target className="text-[#E56668]" size={15} /> Professional Profile
              </h3>
              
              {isEditing ? (
                  <div className="space-y-4 relative z-10">
                      <div>
                          <label className="text-white/50 text-[9px] font-bold uppercase tracking-widest mb-1.5 block">Current Goal</label>
                          <input 
                              type="text"
                              className="w-full bg-white/10 border border-white/10 rounded-xl p-2.5 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#E56668]"
                              placeholder="e.g. Master IELTS for Teaching"
                              value={formData.goals}
                              onChange={(e) => setFormData({...formData, goals: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="text-white/50 text-[9px] font-bold uppercase tracking-widest mb-1.5 block">English Level</label>
                          <select 
                              className="w-full bg-white/10 border border-white/10 rounded-xl p-2.5 text-[13px] text-white focus:outline-none focus:border-[#E56668] [&>option]:text-gray-900"
                              value={formData.english_level}
                              onChange={(e) => setFormData({...formData, english_level: e.target.value})}
                          >
                              <option value="">Select Level</option>
                              <option value="Beginner">Beginner (A1-A2)</option>
                              <option value="Intermediate">Intermediate (B1-B2)</option>
                              <option value="Advanced">Advanced (C1-C2)</option>
                          </select>
                      </div>
                  </div>
              ) : (
                  <div className="space-y-4 relative z-10">
                    <div>
                        <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mb-1">Current Goal</p>
                        <p className="font-semibold text-[13px]">{formData.goals || "No active goal set"}</p>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                        <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mb-1">Assessed Level</p>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-[13px]">{formData.english_level || "Not set"}</span>
                            {formData.english_level && <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-widest rounded border border-emerald-500/30">Verified</div>}
                        </div>
                    </div>
                  </div>
              )}
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- HELPER COMPONENT ---
const InputGroup = ({ label, children, isEditing }: { label: string, children: React.ReactNode, isEditing: boolean }) => (
  <div className={cn("transition-all duration-300", !isEditing ? "opacity-85 hover:opacity-100" : "opacity-100")}>
    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
      {label}
    </label>
    {children}
  </div>
);