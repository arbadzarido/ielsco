"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { createBrowserClient } from "@supabase/ssr";
import {
  User, Mail, Building2, Calendar, Target, Edit2, Save,
  Crown, Loader2, Camera, MapPin, Phone, Linkedin, Instagram,
  Briefcase, GraduationCap, Sparkles, HelpCircle, AlertCircle,
  X, CheckCircle2, Info
} from "lucide-react";
import Image from "next/image";

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
  occupation: "Student" | "Worker" | "Job Seeker" | "Other";
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

  let title = "Learning Nomad 🎒";
  let desc = "Exploring the world, one word at a time.";
  let color = "bg-blue-50 text-blue-600 border-blue-100";

  if (data.occupation === "Student") {
    title = isPro ? "Academic Weapon 📚" : "Campus Explorer 🎓";
    desc = isPro ? "GPA stonks going up! 📈" : "Surviving deadlines & coffee.";
  } else if (data.occupation === "Worker") {
    title = isPro ? "Corporate Hustler 💼" : "9-to-5 Survivor ☕";
    desc = isPro ? "Securing the bag & the English skills." : "Working for the weekend.";
  } else if (data.occupation === "Job Seeker") {
    title = "Future CEO 🚀";
    desc = "Manifesting that dream job.";
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
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
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
    gender: "", birth_date: "", phone: "", domicile: "", occupation: "Student",
    institution_name: "", institution_role: "", instagram: "", linkedin: "",
    english_level: "", goals: ""
  });

  // --- SINKRONISASI TIER & DATA ---
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: dbMembership } = await supabase
        .from("memberships")
        .select("tier")
        .eq("user_id", authUser.id)
        .maybeSingle();

      const { data: dbUser } = await supabase
        .from("users")
        .select("*") 
        .eq("id", authUser.id)
        .maybeSingle();

      const dbTier = dbMembership?.tier;
      let uiTier: TierType = "explorer";

      if (dbTier === "pro") uiTier = "insider";
      else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";

      setUser({
        id: authUser.id,
        name: dbUser?.full_name || authUser.user_metadata?.full_name || "Student",
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
        occupation: dbUser?.occupation || "Student",
        institution_name: dbUser?.institution_name || dbUser?.institution || "",
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
    // Otomatis tutup setelah 4 detik kecuali error
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
        "You are now officially a 'Grandmaster of English' (Just kidding, keep studying!)", 
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
    } catch (err) {
      console.error("Failed to update profile:", err);
      showPopup("Save Failed", "Failed to save profile changes. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userTier="explorer" userName="Loading..." userAvatar="">
        <div className="flex items-center justify-center h-screen bg-[#F7F8FA]">
          <Loader2 className="animate-spin text-[#E56668]" size={48} />
        </div>
      </DashboardLayout>
    );
  }

  const persona = getUserPersona({ ...formData, tier: user.tier });

  return (
    <DashboardLayout userTier={user.tier === 'visionary' ? 'visionary' : user.tier === 'insider' ? 'insider' : 'explorer'} userName={user.name} userAvatar={user.avatar}>
      <div className="min-h-screen bg-[#F7F8FA] pb-12 relative">
        
        {/* --- CUSTOM IELS POP-UP MODAL --- */}
        {popup.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#2F4157]/40 backdrop-blur-sm transition-all duration-300 animate-in fade-in zoom-in-95">
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
                <h3 className="text-xl font-black text-[#2F4157] mb-2">{popup.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">{popup.message}</p>
                <button 
                  onClick={() => setPopup(prev => ({ ...prev, show: false }))}
                  className="w-full py-3 bg-[#2F4157] text-white rounded-xl font-bold hover:bg-[#435770] transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- HEADER BANNER --- */}
        <div className="h-48 bg-gradient-to-r from-[#2F4157] via-[#435770] to-[#2F4157] relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
          
          {/* --- PROFILE CARD UTAMA --- */}
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
            
            {/* Dekorasi Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E56668]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

            {/* AVATAR SECTION */}
            <div className="flex-shrink-0 relative group mx-auto md:mx-0">
              <div 
                onClick={handleAvatarClick}
                className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-2xl overflow-hidden relative bg-gray-200 ${isEditing ? "cursor-pointer hover:ring-4 hover:ring-[#E56668]/20 transition-all" : ""}`}
              >
                {user.avatar ? (
                  <Image src={user.avatar} alt="Profile" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#2F4157] text-white text-4xl font-bold">
                    {user.name.charAt(0)}
                  </div>
                )}
                
                {/* Overlay Edit Icon */}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    <Camera className="text-white" size={32} />
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} accept="image/*" />
            </div>

            {/* INFO & ACTIONS */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                        <input 
                            type="text" 
                            value={user.name}
                            onChange={(e) => setUser({...user, name: e.target.value})}
                            className="text-2xl md:text-3xl font-bold text-[#2F4157] border-b-2 border-gray-200 focus:border-[#E56668] focus:outline-none bg-transparent w-full"
                        />
                    ) : (
                        <h1 className="text-3xl font-bold text-[#2F4157]">{user.name}</h1>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* BADGE TIER */}
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5
                      ${user.tier === 'insider' 
                        ? 'bg-[#E56668]/10 text-[#E56668] border-[#E56668]/20' 
                        : (user.tier === 'visionary' 
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-blue-50 text-blue-600 border-blue-100')
                      }
                    `}>
                      {user.tier === 'insider' && <Sparkles size={12} fill="currentColor" />}
                      {user.tier === 'visionary' && <Crown size={12} fill="currentColor" />}
                      {user.tier === 'explorer' && <MapPin size={12} />}
                      
                      {user.tier === 'visionary' ? 'Visionary' : 
                       user.tier === 'insider' ? 'Insider' : 'Explorer'}
                    </span>

                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <Mail size={14} /> {user.email}
                    </span>
                    
                    {/* USER ID BADGE */}
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-mono border border-gray-200">
                      #{user.user_id_code}
                    </span>
                  </div>
                </div>

                {/* Edit/Save Buttons */}
                <div>
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 text-[#2F4157] rounded-xl font-bold hover:border-[#E56668] hover:text-[#E56668] transition-all shadow-sm"
                    >
                      <Edit2 size={16} /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d65557] transition-all shadow-lg shadow-red-200"
                      >
                        <Save size={16} /> Save Changes
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* INTERACTIVE PERSONA BADGE */}
              <div 
                onClick={handlePersonaClick}
                className={`
                  inline-flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all select-none border
                  ${easterEggActive ? "bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white animate-pulse border-transparent" : persona.color}
                `}
              >
                <div className={`p-1.5 rounded-full ${easterEggActive ? "bg-white/20" : "bg-white"}`}>
                  {easterEggActive ? <Crown size={18} /> : <Sparkles size={18} />}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Current Persona</p>
                  <p className="font-bold text-sm leading-tight">{easterEggActive ? "Grandmaster of IELS 👑" : persona.title}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 italic pl-1">
                "{easterEggActive ? "You unlocked the secret rank!" : persona.desc}"
              </p>
            </div>
          </div>

          {/* --- CONTENT GRID --- */}
          <div className="grid lg:grid-cols-3 gap-8 mt-8">
            
            {/* LEFT COL: Personal Info (2/3 width on large) */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 1. BIODATA */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 relative">
                <div className={`absolute top-0 left-0 w-1 h-full bg-[#E56668] rounded-l-2xl transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0'}`}></div>
                <h3 className="text-lg font-bold text-[#2F4157] mb-6 flex items-center gap-2">
                  <User className="text-[#E56668]" size={20} /> Personal Information
                </h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <InputGroup label="Gender" isEditing={isEditing}>
                    <select 
                      className={cn(
                        "w-full p-3 rounded-xl border transition-all appearance-none",
                        isEditing 
                            ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                            : "bg-gray-50 border-gray-100 text-gray-600"
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
                  </InputGroup>

                  <InputGroup label="Date of Birth" isEditing={isEditing}>
                    <div className="relative">
                      <input 
                        type="date"
                        className={cn(
                            "w-full p-3 pl-10 rounded-xl border transition-all",
                            isEditing 
                                ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                                : "bg-gray-50 border-gray-100 text-gray-600"
                        )}
                        value={formData.birth_date}
                        onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                        disabled={!isEditing}
                      />
                      <Calendar className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                  </InputGroup>

                  <InputGroup label="Phone Number" isEditing={isEditing}>
                    <div className="relative">
                      <input 
                        type="tel"
                        placeholder="+62..."
                        className={cn(
                            "w-full p-3 pl-10 rounded-xl border transition-all",
                            isEditing 
                                ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                                : "bg-gray-50 border-gray-100 text-gray-600"
                        )}
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        disabled={!isEditing}
                      />
                      <Phone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                  </InputGroup>

                  <InputGroup label="Domicile (City, Country)" isEditing={isEditing}>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="e.g. Jakarta, Indonesia"
                        className={cn(
                            "w-full p-3 pl-10 rounded-xl border transition-all",
                            isEditing 
                                ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                                : "bg-gray-50 border-gray-100 text-gray-600"
                        )}
                        value={formData.domicile}
                        onChange={(e) => setFormData({...formData, domicile: e.target.value})}
                        disabled={!isEditing}
                      />
                      <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                  </InputGroup>
                </div>
              </section>

              {/* 2. ACADEMIC / PROFESSIONAL */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 relative">
                 <div className={`absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-2xl transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0'}`}></div>
                <h3 className="text-lg font-bold text-[#2F4157] mb-6 flex items-center gap-2">
                  <Briefcase className="text-[#E56668]" size={20} /> Occupation & Education
                </h3>

                <div className="space-y-6">
                  {/* Occupation Selector */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Student", "Worker", "Job Seeker", "Other"].map((type) => (
                      <button
                        key={type}
                        onClick={() => isEditing && setFormData({...formData, occupation: type as any})}
                        disabled={!isEditing}
                        className={`
                          py-3 px-4 rounded-xl text-sm font-bold border transition-all
                          ${formData.occupation === type 
                            ? "bg-[#2F4157] text-white border-[#2F4157] shadow-md" 
                            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}
                          ${!isEditing && formData.occupation !== type ? "opacity-50 cursor-default" : ""}
                        `}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* Dynamic Fields */}
                  <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <InputGroup 
                      label={formData.occupation === "Worker" ? "Company / Organization" : "School / University"} 
                      isEditing={isEditing}
                    >
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder={formData.occupation === "Worker" ? "e.g. GoTo, Google" : "e.g. Universitas Indonesia"}
                          className={cn(
                            "w-full p-3 pl-10 rounded-xl border transition-all",
                            isEditing 
                                ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                                : "bg-gray-100 border-transparent text-gray-600"
                          )}
                          value={formData.institution_name}
                          onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
                          disabled={!isEditing}
                        />
                        <Building2 className="absolute left-3 top-3.5 text-gray-400" size={18} />
                      </div>
                    </InputGroup>

                    <InputGroup 
                      label={formData.occupation === "Worker" ? "Job Title / Role" : "Major / Field of Study"} 
                      isEditing={isEditing}
                    >
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder={formData.occupation === "Worker" ? "e.g. Product Manager" : "e.g. International Relations"}
                          className={cn(
                            "w-full p-3 pl-10 rounded-xl border transition-all",
                            isEditing 
                                ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                                : "bg-gray-100 border-transparent text-gray-600"
                          )}
                          value={formData.institution_role}
                          onChange={(e) => setFormData({...formData, institution_role: e.target.value})}
                          disabled={!isEditing}
                        />
                        <GraduationCap className="absolute left-3 top-3.5 text-gray-400" size={18} />
                      </div>
                    </InputGroup>
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT COL: Socials & Settings (1/3 width) */}
            <div className="space-y-8">
              
              {/* SOCIALS */}
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
                 <div className={`absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-2xl transition-opacity ${isEditing ? 'opacity-100' : 'opacity-0'}`}></div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#2F4157] flex items-center gap-2">
                    <Target className="text-[#E56668]" size={20} /> Socials
                  </h3>
                  <div className="group relative">
                    <HelpCircle size={16} className="text-gray-400 cursor-help" />
                    <div className="absolute right-0 top-6 w-48 bg-[#2F4157] text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      Complete your socials to network with other members!
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <InputGroup label="Instagram Username" isEditing={isEditing}>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="@username"
                        className={cn(
                            "w-full p-3 pl-10 rounded-xl border transition-all",
                            isEditing 
                                ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                                : "bg-gray-50 border-gray-100 text-gray-600"
                        )}
                        value={formData.instagram}
                        onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                        disabled={!isEditing}
                      />
                      <Instagram className="absolute left-3 top-3.5 text-pink-500" size={18} />
                    </div>
                  </InputGroup>

                  <InputGroup label="LinkedIn URL" isEditing={isEditing}>
                    <div className="relative">
                      <input 
                        type="text"
                        placeholder="linkedin.com/in/..."
                        className={cn(
                            "w-full p-3 pl-10 rounded-xl border transition-all",
                            isEditing 
                                ? "bg-white border-gray-300 focus:ring-2 focus:ring-[#E56668]/20 focus:border-[#E56668]" 
                                : "bg-gray-50 border-gray-100 text-gray-600"
                        )}
                        value={formData.linkedin}
                        onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                        disabled={!isEditing}
                      />
                      <Linkedin className="absolute left-3 top-3.5 text-blue-600" size={18} />
                    </div>
                  </InputGroup>
                </div>
              </section>

              {/* LEARNING GOALS (READ ONLY FOR NOW) */}
              <section className="bg-gradient-to-br from-[#2F4157] to-[#1e2b3a] rounded-2xl shadow-lg border border-[#2F4157] p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                  <Target className="text-yellow-400" size={20} /> Learning Profile
                </h3>
                
                {isEditing ? (
                    <div className="space-y-4 relative z-10">
                        <div>
                            <label className="text-white/60 text-xs uppercase tracking-wide mb-1 block">Current Goal</label>
                            <input 
                                type="text"
                                className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white placeholder-white/30 focus:outline-none focus:border-white/50"
                                placeholder="e.g. Master IELTS Speaking"
                                value={formData.goals}
                                onChange={(e) => setFormData({...formData, goals: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-white/60 text-xs uppercase tracking-wide mb-1 block">English Level</label>
                            <select 
                                className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-white focus:outline-none focus:border-white/50 [&>option]:text-gray-900"
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
                        <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Current Goal</p>
                        <p className="font-semibold text-lg">{formData.goals || "No active goal set"}</p>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                        <p className="text-white/60 text-xs uppercase tracking-wide mb-1">Self-Assessed Level</p>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">{formData.english_level || "Not set"}</span>
                            {formData.english_level && <div className="px-2 py-0.5 bg-green-500/20 text-green-300 text-[10px] rounded border border-green-500/30">Verified</div>}
                        </div>
                    </div>
                    </div>
                )}
                
                {!isEditing && (
                    <div className="mt-6 flex items-center gap-2 text-xs text-white/40">
                        <AlertCircle size={12} />
                        <span>Click "Edit Profile" to update goals</span>
                    </div>
                )}
              </section>

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

// --- HELPER COMPONENT ---
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

const InputGroup = ({ label, children, isEditing }: { label: string, children: React.ReactNode, isEditing: boolean }) => (
  <div className={`transition-all duration-300 ${!isEditing ? "opacity-80 hover:opacity-100" : "opacity-100"}`}>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
      {label}
    </label>
    {children}
  </div>
);