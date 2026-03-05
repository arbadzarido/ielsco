"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  User, Lock, Bell, Globe, Shield, 
  CreditCard, Camera, Trash2, Check, Crown,
  Languages, Clock, Moon, Eye, EyeOff,
  AlertCircle, Loader2, CheckCircle2, X
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("preferences");
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("WIB");
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Notifications
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch user data & membership
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      // 2. Fetch Membership (SINKRONISASI DI SINI)
      const { data: membership } = await supabase
        .from('memberships')
        .select('tier')
        .eq('user_id', user.id)
        .maybeSingle();

      // Mapping logic tier DB ke UI
      const dbTier = membership?.tier;
      let uiTier = "explorer";
      if (dbTier === "pro") uiTier = "insider";
      else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";
      
      if (profile) {
        setUserData({ 
          ...user, 
          ...profile, 
          uiTier // Masukin tier hasil sinkronisasi ke state
        });
        setLanguage(profile.language || "en");
        setTimezone(profile.timezone || "WIB");
      }
      setLoading(false);
    };
    fetchUserData();
  }, [supabase]);

  // Show message helper
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };


    // Save preferences
  const handleSavePreferences = async () => {
    if (!userData) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          language: language,
          timezone: timezone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userData.id);

      if (error) throw error;

      showMessage('success', 'Preferences updated successfully!');
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
  if (!currentPassword) {
    showMessage('error', 'Please enter your current password first');
    return;
  }

  if (!newPassword || !confirmPassword) {
    showMessage('error', 'Please fill in all password fields');
    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage('error', 'New passwords do not match');
    return;
  }

  if (newPassword.length < 6) {
    showMessage('error', 'Password must be at least 6 characters');
    return;
  }

  setSaving(true);
  try {
    // Re-authenticate dulu dengan current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData?.email,
      password: currentPassword,
    });

    if (signInError) {
      showMessage('error', 'Current password is incorrect');
      setSaving(false);
      return;
    }

    // Baru update ke password baru
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showMessage('success', 'Password changed successfully!');
  } catch (error: any) {
    showMessage('error', error.message || 'Failed to change password');
  } finally {
    setSaving(false);
  }
};

  // Request password reset email
  const handleForgotPassword = async () => {
    if (!userData?.email) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userData.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      showMessage('success', `Password reset email sent to ${userData.email}`);
    } catch (error: any) {
      showMessage('error', error.message || 'Failed to send reset email');
    } finally {
      setSaving(false);
    }
  };

  const menuItems = [
    { id: "preferences", label: "Preferences", icon: Globe },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  if (loading) {
    return (
      <DashboardLayout userName="User" userTier="explorer" userAvatar="">
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E56668]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
<DashboardLayout 
      userName={userData?.full_name?.split(' ')[0] || "User"} 
      userTier={userData?.uiTier || "explorer"} // SEKARANG SUDAH DINAMIS
      userAvatar={userData?.avatar_url}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 pb-20">
        
        {/* Notification Toast */}
        {message && (
          <div className={cn(
            "fixed top-24 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-5",
            message.type === 'success' 
              ? "bg-green-50 border-green-200" 
              : "bg-red-50 border-red-200"
          )}>
            {message.type === 'success' ? (
              <CheckCircle2 className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-red-600" size={20} />
            )}
            <p className={cn(
              "font-bold text-sm",
              message.type === 'success' ? "text-green-800" : "text-red-800"
            )}>
              {message.text}
            </p>
            <button onClick={() => setMessage(null)}>
              <X className="text-gray-400 hover:text-gray-600" size={18} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-br from-[#2F4157] to-[#1e2b3a] pt-16 pb-32 px-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-96 h-96 bg-[#E56668] rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          </div>
          
          <div className="max-w-7xl text-center mx-auto relative z-10">
            <h1 className="text-4xl font-extrabold text-white mb-2">Settings</h1>
            <p className="text-blue-200">Manage your preferences</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Sidebar */}
            <aside className="lg:w-64 space-y-3">
              <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg p-3">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all mb-2 last:mb-0",
                      activeTab === item.id 
                        ? "bg-[#E56668] text-white shadow-lg" 
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </div>
            </aside>

            {/* Main Panel */}
            <main className="flex-1 bg-white rounded-3xl border-2 border-gray-100 shadow-2xl p-8">
              
  
 {/* Preferences Tab */}
{activeTab === "preferences" && (
  <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-3 px-1">
    <div className="border-b border-gray-100 pb-6">
      <h2 className="text-xl sm:text-2xl font-bold text-[#2F4157] flex items-center gap-2">
        <Globe className="text-[#E56668]" size={24} />
        App Preferences
      </h2>
      <p className="text-gray-500 text-sm mt-1">Customize your IELS experience</p>
    </div>

    <div className="space-y-4">
      {/* 0. Current Membership Info - Tambahin di paling atas Preferences */}
<div className="p-4 sm:p-6 bg-gradient-to-br from-[#2F4157] to-[#1e2b3a] rounded-2xl border border-white/10 text-white mb-6 shadow-xl relative overflow-hidden">
  <div className="absolute top-0 right-0 p-3 opacity-20">
    <Crown size={60} />
  </div>
  <div className="relative z-10">
    <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-1">Your Current Tier</p>
    <div className="flex items-center gap-3">
       <h3 className="text-2xl font-black capitalize tracking-tight">
         {userData?.uiTier || "Explorer"}
       </h3>
       <span className="px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-bold uppercase">
         Active
       </span>
    </div>
    <p className="text-xs text-white/60 mt-2">
      {userData?.uiTier === "explorer" 
        ? "Upgrade to unlock public portfolio & certificates" 
        : "All premium features unlocked"}
    </p>
  </div>
</div>
      {/* 1. Language - Stack on Mobile, Row on Tablet/Desktop */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50/30 rounded-2xl border border-blue-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-white rounded-xl shadow-sm shrink-0">
              <Languages className="text-[#2F4157]" size={20} />
            </div>
            <div>
              <p className="font-bold text-[#2F4157] mb-1">Language</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Choose your preferred language for the dashboard
              </p>
            </div>
          </div>
          
          {/* w-full on mobile, min-w-180 on desktop */}
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full sm:w-auto bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#E56668] transition-colors sm:min-w-[180px]"
          >
            <option value="en">🇬🇧 English (UK)</option>
            <option value="id">🇮🇩 Bahasa Indonesia</option>
          </select>
        </div>
      </div>

      {/* 2. Timezone - Stack on Mobile */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50/30 rounded-2xl border border-green-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-white rounded-xl shadow-sm shrink-0">
              <Clock className="text-[#2F4157]" size={20} />
            </div>
            <div>
              <p className="font-bold text-[#2F4157] mb-1">Timezone</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sync schedules with your local time
              </p>
            </div>
          </div>
          
          <select 
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full sm:w-auto bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-[#E56668] transition-colors sm:min-w-[180px]"
          >
            <option value="WIB">WIB (UTC+7)</option>
            <option value="WITA">WITA (UTC+8)</option>
            <option value="WIT">WIT (UTC+9)</option>
          </select>
        </div>
      </div>

      {/* 3. Dark Mode - Coming Soon */}
      <div className="p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-slate-50/30 rounded-2xl border border-gray-100 opacity-70">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-3 bg-white rounded-xl shadow-sm shrink-0">
              <Moon className="text-[#2F4157]" size={20} />
            </div>
            <div>
              <p className="font-bold text-[#2F4157] mb-1">Dark Mode</p>
              <p className="text-sm text-gray-600">Easier on the eyes during late night study</p>
            </div>
          </div>
          
          <div className="relative w-full sm:w-auto flex justify-end sm:block">
            <div className="w-12 h-6 bg-gray-200 rounded-full cursor-not-allowed" />
            <span className="absolute -bottom-5 right-0 text-[10px] font-black text-[#577E90] uppercase tracking-wider">
              Coming Soon
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Save Button */}
    <div className="pt-4">
      <button
        onClick={handleSavePreferences}
        disabled={saving}
        className="w-full sm:w-auto px-10 py-4 bg-[#CB2129] text-white rounded-xl font-bold hover:bg-[#A81B22] transition-all shadow-lg shadow-red-900/10 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
        {saving ? "Saving Changes..." : "Save Preferences"}
      </button>
    </div>
  </div>
)}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-3">
                  <div className="border-b border-gray-100 pb-6">
                    <h2 className="text-2xl font-bold text-[#2F4157] flex items-center gap-2">
                      <Shield className="text-[#E56668]" size={24} />
                      Security & Privacy
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Manage your password and account security</p>
                  </div>

                  {/* Change Password */}
                  <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50/30 rounded-2xl border border-red-100">
                    <h3 className="font-bold text-[#2F4157] mb-4 flex items-center gap-2">
                      <Lock size={18} />
                      Change Password
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Current Password — tambah DI ATAS field "New Password" */}
<div>
  <label className="block text-sm font-bold text-[#2F4157] mb-2">
    Current Password
  </label>
  <div className="relative">
    <input
      type={showCurrentPassword ? "text" : "password"}
      value={currentPassword}
      onChange={(e) => setCurrentPassword(e.target.value)}
      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-[#E56668] focus:outline-none transition-colors font-medium"
      placeholder="Enter your current password"
    />
    <button
      type="button"
      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>
</div>
                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-bold text-[#2F4157] mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-[#E56668] focus:outline-none transition-colors font-medium"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm Password */}
                      <div>
                        <label className="block text-sm font-bold text-[#2F4157] mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#E56668] focus:outline-none transition-colors font-medium"
                          placeholder="Confirm new password"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleChangePassword}
                          disabled={saving || !newPassword || !confirmPassword}
                          className="flex-1 px-6 py-3 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d65557] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="animate-spin" size={18} />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Lock size={18} />
                              Update Password
                            </>
                          )}
                        </button>
                        <Link
                          href="/sign-in/forgot"
                          className="px-6 py-3 bg-white border-2 border-gray-200 text-[#2F4157] rounded-xl font-bold hover:border-[#E56668] hover:text-[#E56668] transition-all text-center"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Security Info */}
                  <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                    <h3 className="font-bold text-[#2F4157] mb-3 flex items-center gap-2">
                      <AlertCircle size={18} className="text-blue-600" />
                      Password Requirements
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        At least 6 characters long
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        Contains letters and numbers recommended
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        Avoid using common passwords
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-3">
                  <div className="border-b border-gray-100 pb-6">
                    <h2 className="text-2xl font-bold text-[#2F4157] flex items-center gap-2">
                      <Bell className="text-[#E56668]" size={24} />
                      Notification Preferences
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Control how you receive updates</p>
                  </div>

                  <div className="p-8 bg-gradient-to-br from-yellow-50 to-amber-50/30 rounded-2xl border border-yellow-100 text-center">
                    <Bell className="mx-auto text-yellow-600 mb-4" size={48} />
                    <h3 className="font-bold text-[#2F4157] mb-2">Coming Soon</h3>
                    <p className="text-gray-600 text-sm max-w-md mx-auto">
                      Notification preferences will be available in the next update. You'll be able to customize email, push, and in-app notifications.
                    </p>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}