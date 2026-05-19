"use client";

// =============================================================================
// app/school/settings/page.tsx — Account & system settings
// =============================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { 
  Settings, Lock, Bell, Globe, Shield, LogOut,
  Languages, Clock, Moon, Eye, EyeOff,
  AlertCircle, Loader2, CheckCircle2, X, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  
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

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/school/sign-in");
        return;
      }

      // Ambil data profil dari public.users (termasuk language & timezone)
      const { data: dbUser } = await supabase
        .from("users")
        .select(`email, language, timezone`)
        .eq("id", authUser.id)
        .maybeSingle();

      // Update Form States
      setLanguage(dbUser?.language || "en");
      setTimezone(dbUser?.timezone || "WIB");

      // Set internal state
      setUserData({
        id: authUser.id,
        email: dbUser?.email || authUser.email, 
      });

      setLoading(false);
    };

    fetchData();
  }, [router, supabase]);

  // Show message helper
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Save App Preferences
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
      router.refresh();
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

      // Update ke password baru
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
        redirectTo: `${window.location.origin}/school/sign-in/reset-password`,
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E56668]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
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
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings size={13} className="text-[#E56668]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">System</p>
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">Settings</h1>
        <p className="text-slate-500 text-[13px] mt-1">
          Manage your system preferences and account security
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Sidebar Nav */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold transition-all mb-2 last:mb-0",
                  activeTab === item.id 
                    ? "bg-[#1A2534] text-white shadow-md" 
                    : "text-slate-500 hover:bg-gray-50 hover:text-[#1A2534]"
                )}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-bold text-[#E56668] hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 bg-white rounded-[20px] border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-8">
          
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
                {/* 1. Language */}
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

                {/* 2. Timezone */}
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
            <div className="space-y-8 animate-in fade-in slide-in-from-right-3 px-1">
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
                  {/* Current Password */}
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

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
                    <button
                      onClick={handleForgotPassword}
                      disabled={saving}
                      className="px-6 py-3 bg-white border-2 border-gray-200 text-[#2F4157] rounded-xl font-bold hover:border-[#E56668] hover:text-[#E56668] transition-all text-center"
                    >
                      Forgot Password?
                    </button>
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
            <div className="space-y-8 animate-in fade-in slide-in-from-right-3 px-1">
              <div className="border-b border-gray-100 pb-6">
                <h2 className="text-xl font-black text-[#1A2534] flex items-center gap-2">
                  <Bell className="text-[#E56668]" size={22} />
                  Notifications
                </h2>
                <p className="text-slate-500 text-[13px] mt-1.5">Control how you receive updates and alerts</p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Student at-risk alerts",           sub: "Get notified when a student's GRS drops below 30", enabled: true  },
                  { label: "Weekly class progress digest",     sub: "Weekly email summary of class performance",        enabled: true  },
                  { label: "Goal completion notifications",    sub: "Alerts when a student completes a learning goal",  enabled: false },
                  { label: "New student enrollment",           sub: "Alert when a new student is added to your class",  enabled: true  },
                ].map(({ label, sub, enabled }) => (
                  <div key={label} className="p-5 bg-white rounded-[16px] border border-gray-200 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[13px] font-bold text-[#1A2534]">{label}</p>
                      <p className="text-[12px] text-slate-500 mt-0.5">{sub}</p>
                    </div>
                    <div
                      className={`w-10 h-5.5 rounded-full flex-shrink-0 flex items-center p-0.5 transition-colors cursor-not-allowed opacity-70 ${
                        enabled ? "bg-[#E56668]" : "bg-gray-200"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        enabled ? "translate-x-4.5" : "translate-x-0"
                      }`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                <p className="text-[12px] font-semibold text-amber-700">
                  Notification toggles are currently locked. This feature will be enabled in the next system update.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}