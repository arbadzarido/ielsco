// =============================================================================
// app/school/settings/page.tsx — Account & system settings
// =============================================================================

import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Settings, User, Shield, Bell, Building2, LogOut } from "lucide-react";

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/school/sign-in");

  const supabase = await createSupabaseServerClient();
  const { data: school } = user.school_id
    ? await supabase.from("b2b_schools").select("*").eq("id", user.school_id).single()
    : { data: null };

  const initials = user.full_name
    .split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings size={13} className="text-[#E56668]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E56668]">System</p>
        </div>
        <h1 className="text-[26px] font-black text-[#1A2534] tracking-tight">Settings</h1>
        <p className="text-slate-500 text-[13px] mt-1">
          Manage your account and portal preferences
        </p>
      </div>

      <div className="grid grid-cols-12 gap-5">

        {/* LEFT: 8 cols */}
        <div className="col-span-12 lg:col-span-8 space-y-5">

          {/* Profile section */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-5">
              <User size={15} className="text-[#1A2534]" />
              <h2 className="text-[13px] font-black text-[#1A2534] uppercase tracking-widest">
                Account Profile
              </h2>
            </div>

            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
              <div className="w-14 h-14 rounded-2xl bg-[#1A2534] flex items-center justify-center text-white text-xl font-black">
                {initials}
              </div>
              <div>
                <p className="text-[17px] font-black text-[#1A2534]">{user.full_name}</p>
                <p className="text-slate-400 text-[13px]">{user.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[#E56668]/10 text-[#E56668] rounded-full">
                  {user.role.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Full Name",   value: user.full_name,    editable: true  },
                { label: "Email",       value: user.email,         editable: false },
                { label: "Role",        value: user.role.replace("_", " "), editable: false },
                { label: "Subscription", value: user.subscription_role, editable: false },
              ].map(({ label, value, editable }) => (
                <div key={label}>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    {label}
                  </label>
                  <div className={`px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-[#1A2534] ${
                    editable
                      ? "bg-[#F7F8FA] border border-gray-200 border-dashed"
                      : "bg-[#F7F8FA] text-slate-500"
                  }`}>
                    {value}
                    {!editable && (
                      <span className="ml-2 text-[10px] text-slate-400">(managed by admin)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-gray-50 flex gap-3">
              <button
                disabled
                className="px-5 py-2.5 rounded-xl bg-[#1A2534] text-white text-[13px] font-bold hover:bg-[#2F4157] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
              <button
                disabled
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-[#1A2534] text-[13px] font-bold hover:bg-[#F7F8FA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Notification preferences */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 mb-5">
              <Bell size={15} className="text-[#1A2534]" />
              <h2 className="text-[13px] font-black text-[#1A2534] uppercase tracking-widest">
                Notification Preferences
              </h2>
            </div>

            <div className="space-y-4">
              {[
                { label: "Student at-risk alerts",           sub: "Get notified when a student's GRS drops below 30", enabled: true  },
                { label: "Weekly class progress digest",     sub: "Weekly email summary of class performance",         enabled: true  },
                { label: "Goal completion notifications",    sub: "Alerts when a student completes a learning goal",   enabled: false },
                { label: "New student enrollment",           sub: "Alert when a new student is added to your class",  enabled: true  },
              ].map(({ label, sub, enabled }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A2534]">{label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full flex-shrink-0 flex items-center transition-colors cursor-not-allowed ${
                      enabled ? "bg-[#1A2534]" : "bg-gray-200"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ml-0.5 ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: 4 cols */}
        <div className="col-span-12 lg:col-span-4 space-y-5">

          {/* School info */}
          {school && (
            <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2.5 mb-4">
                <Building2 size={14} className="text-[#1A2534]" />
                <p className="text-[12px] font-black text-[#1A2534]">Partner School</p>
              </div>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">School Name</p>
                  <p className="text-[14px] font-black text-[#1A2534]">{school.name}</p>
                </div>
                {school.city && (
                  <div>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest">Location</p>
                    <p className="text-[13px] font-medium text-slate-600">
                      {school.city}{school.province ? `, ${school.province}` : ""}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest">Partner Tier</p>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 bg-[#E56668]/10 text-[#E56668] rounded-full mt-1">
                    {school.partner_tier}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2.5 mb-4">
              <Shield size={14} className="text-[#1A2534]" />
              <p className="text-[12px] font-black text-[#1A2534]">Security</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <p className="text-[11px] font-bold text-emerald-700">✓ Authenticated via Supabase SSR</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Session secured with HTTPOnly cookies</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-[11px] font-bold text-blue-700">✓ Row Level Security active</p>
                <p className="text-[10px] text-blue-600 mt-0.5">Your data is isolated at the DB level</p>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <div className="bg-white rounded-[20px] border border-gray-100 p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] font-black text-[#1A2534] mb-3">Session</p>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-[#E56668] text-[13px] font-bold hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}