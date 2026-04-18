"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Lock, 
  Mail, 
  LayoutDashboard, 
  Plus, 
  Calendar, 
  MapPin, 
  Users, 
  Image as ImageIcon, 
  Save, 
  LogOut,
  Globe,
  Tag,
  Loader2,
  CheckCircle2
} from "lucide-react";

export default function IELSAdminEventsPage() {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- FORM STATE ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    type: "Fellowship",
    location: "",
    startDate: "",
    endDate: "",
    quota: "",
    status: "Draft",
    coverUrl: ""
  });

  // --- MOCK DATA (Events List) ---
  const [eventsList, setEventsList] = useState([
    { id: 1, title: "Global Impact Fellowship 2026", type: "Fellowship", location: "NUS, Singapore", status: "Published" },
    { id: 2, title: "IELS English Mentoring Batch 4", type: "Mentoring", location: "Online (Zoom)", status: "Active" },
  ]);

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    // Simulate Supabase Auth delay
    setTimeout(() => {
      setIsLoggingIn(false);
      setIsAuthenticated(true);
    }, 1500);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail("");
    setPassword("");
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate Database Insert delay
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      setEventsList([{ id: Date.now(), ...eventForm }, ...eventsList]);
      
      // Reset after showing success
      setTimeout(() => {
        setShowSuccess(false);
        setEventForm({ title: "", type: "Fellowship", location: "", startDate: "", endDate: "", quota: "", status: "Draft", coverUrl: "" });
      }, 3000);
    }, 1500);
  };

  // =========================================================================
  // VIEW: LOGIN PAGE
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] font-sans flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#304156] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-[#304156]">IELS Admin Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Authorized personnel only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#304156] mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition"
                  placeholder="admin@ielsco.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#304156] mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#914D4D] hover:bg-[#7a3e3e] text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center shadow-md disabled:opacity-70"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Secure Login"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: DASHBOARD
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F7F8FA] font-sans text-[#304156]">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#304156] p-2 rounded-lg"><LayoutDashboard className="w-5 h-5 text-white" /></div>
            <span className="font-black text-xl tracking-tight">IELS<span className="text-[#914D4D]">Admin</span></span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Event Management</h1>
          <p className="text-gray-500">Create, edit, and publish IELS events directly to the main website database.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT: FORM INPUT */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                <Plus className="w-5 h-5 text-[#914D4D]" /> Create New Event
              </h2>

              {showSuccess && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-green-50 text-green-700 border border-green-200 p-4 rounded-xl flex items-center gap-3 text-sm font-bold">
                  <CheckCircle2 className="w-5 h-5 text-green-600" /> Event successfully inserted into database!
                </motion.div>
              )}

              <form onSubmit={handleSaveEvent} className="space-y-6">
                {/* Row 1: Title & Type */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Event Title <span className="text-red-500">*</span></label>
                    <input type="text" required value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition" placeholder="e.g. Global Impact Fellowship" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Event Type</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <select value={eventForm.type} onChange={(e) => setEventForm({...eventForm, type: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] outline-none appearance-none">
                        <option value="Fellowship">Fellowship</option>
                        <option value="Mentoring">Mentoring Class</option>
                        <option value="Webinar">Webinar / Talkshow</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Row 2: Location & Quota */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Location <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input type="text" required value={eventForm.location} onChange={(e) => setEventForm({...eventForm, location: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition" placeholder="NUS, Singapore / Zoom" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max Quota</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input type="number" value={eventForm.quota} onChange={(e) => setEventForm({...eventForm, quota: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] focus:ring-1 focus:ring-[#914D4D] outline-none transition" placeholder="e.g. 30" />
                    </div>
                  </div>
                </div>

                {/* Row 3: Dates */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input type="date" value={eventForm.startDate} onChange={(e) => setEventForm({...eventForm, startDate: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input type="date" value={eventForm.endDate} onChange={(e) => setEventForm({...eventForm, endDate: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] outline-none" />
                    </div>
                  </div>
                </div>

                {/* Row 4: Cover & Status */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cover Image URL</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <input type="url" value={eventForm.coverUrl} onChange={(e) => setEventForm({...eventForm, coverUrl: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] outline-none" placeholder="https://..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Publish Status</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <select value={eventForm.status} onChange={(e) => setEventForm({...eventForm, status: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-[#914D4D] outline-none appearance-none">
                        <option value="Draft">Draft (Hidden)</option>
                        <option value="Published">Published (Live)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setEventForm({ title: "", type: "Fellowship", location: "", startDate: "", endDate: "", quota: "", status: "Draft", coverUrl: "" })} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition text-sm">
                    Clear
                  </button>
                  <button type="submit" disabled={isSubmitting} className="bg-[#304156] hover:bg-[#1f2a38] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 text-sm shadow-md transition disabled:opacity-70">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save to Database
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT: LIVE PREVIEW / RECENT LIST */}
          <div className="space-y-6">
            <div className="bg-[#914D4D]/10 rounded-3xl p-6 border border-[#914D4D]/20">
              <h3 className="font-black text-[#914D4D] mb-2">Live Database</h3>
              <p className="text-sm text-[#304156]/70 mb-4">Recent events injected into the system.</p>
              
              <div className="space-y-3">
                {eventsList.map((event, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${event.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {event.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">{event.type}</span>
                    </div>
                    <h4 className="font-bold text-sm text-[#304156] leading-tight mb-1">{event.title || "Untitled Event"}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}