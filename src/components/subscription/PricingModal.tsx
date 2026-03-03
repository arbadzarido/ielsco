"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Crown, Zap, Target } from 'lucide-react';

// === TAMBAHAN TYPESCRIPT DISINI ===
interface PricingModalProps {
  onClose: () => void;
  isPreAuth?: boolean;
}

const PricingModal = ({ onClose, isPreAuth }: PricingModalProps) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      
      {/* BACKDROP */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-[#2F4157]/90 backdrop-blur-sm animate-in fade-in duration-300"
      />

      {/* MODAL CARD */}
      <div className="
        relative z-10 w-full max-w-6xl 
        bg-white 
        rounded-t-[2rem] sm:rounded-[2.5rem] 
        shadow-2xl 
        flex flex-col 
        max-h-[90dvh] sm:max-h-[85vh]
        overflow-hidden
        animate-in slide-in-from-bottom-10 fade-in duration-300
      ">
        
        {/* === STICKY HEADER === */}
        <div className="shrink-0 border-b border-gray-100 bg-white z-20 px-6 pt-6 pb-4 text-center relative">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition active:scale-90 text-gray-500"
          >
            <X size={20} />
          </button>

          <h2 className="text-2xl md:text-3xl font-bold text-[#2F4157] mb-1">
            Invest in Your Future 🚀
          </h2>
          <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto">
            Choose the plan that fits your learning journey
          </p>

          <div className="flex justify-center mt-4 items-center gap-3 select-none">
            <span 
              className={`text-sm font-bold cursor-pointer transition-colors ${billingCycle === 'monthly' ? 'text-[#2F4157]' : 'text-gray-400'}`} 
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </span>
            <button 
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="w-14 h-7 bg-gray-200 rounded-full p-1 relative transition-colors duration-300 focus:outline-none cursor-pointer hover:bg-gray-300"
            >
              <div className={`w-5 h-5 bg-[#8B5CF6] rounded-full shadow-md transform transition-transform duration-300 ${billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'}`} />
            </button>
            <span 
              className={`text-sm font-bold cursor-pointer transition-colors ${billingCycle === 'yearly' ? 'text-[#2F4157]' : 'text-gray-400'}`} 
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly <span className="text-purple-600 text-[10px] uppercase font-bold bg-purple-50 px-2 py-0.5 rounded-full ml-1 border border-purple-100">Save 33%</span>
            </span>
          </div>
        </div>

        {/* === SCROLLABLE CONTENT === */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* TIER 1: EXPLORER (FREE) */}
            <div className="bg-white rounded-3xl p-6 border border-gray-200 hover:border-gray-300 transition-all hover:shadow-lg">
              <div className="mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3 text-gray-500">
                  <Target size={20} />
                </div>
                <h3 className="text-lg font-bold text-gray-700">🎒 Explorer</h3>
                <p className="text-3xl font-bold text-[#2F4157] mt-2">Free</p>
                <p className="text-xs text-gray-400 mt-1">Forever access</p>
              </div>
              <ul className="space-y-3 mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Start Your Journey:</p>
                <FeatureItem text="1 Active Learning Goal" />
                <FeatureItem text="Basic Progress Dashboard" />
                <FeatureItem text="1x Weekly Speaking Club" />
                <FeatureItem text="Community Discord (Read-only)" />
                <FeatureItem text="Self-tracked Tasks Only" />
                <FeatureItem text="Mentor Feedback" active={false} />
                <FeatureItem text="Assignment Submission" active={false} />
              </ul>
              <button 
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition text-sm"
              >
                Current Plan
              </button>
            </div>

            {/* TIER 2: INSIDER (PREMIUM) */}
            <div className="bg-white rounded-3xl p-6 border-2 border-[#8B5CF6] shadow-xl relative transform md:-translate-y-2">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#8B5CF6] text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm uppercase tracking-wide">
                Most Popular
              </div>
              <div className="mb-6">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3 text-[#8B5CF6]">
                  <Zap size={20} />
                </div>
                <h3 className="text-lg font-bold text-[#8B5CF6]">⚡ Insider</h3>
                <div className="flex items-end gap-1 mt-2">
                  <p className="text-3xl font-bold text-[#2F4157]">
                    {billingCycle === 'monthly' ? 'Rp 25k' : 'Rp 200k'}
                  </p>
                  <span className="text-gray-400 mb-1 text-xs font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <p className="text-[10px] text-green-600 font-bold mt-1 bg-green-50 inline-block px-2 py-0.5 rounded">
                   {billingCycle === 'yearly' ? 'Save Rp 100k/year' : 'Cancel anytime'}
                </p>
              </div>
              <ul className="space-y-3 mb-6">
                <p className="text-xs font-bold text-[#8B5CF6] uppercase tracking-wider mb-2">Accelerate Growth:</p>
                <FeatureItem text="Unlimited Learning Goals" highlight />
                <FeatureItem text="Daily Speaking Club (Mon-Fri)" highlight />
                <FeatureItem text="2x Monthly Group Mentoring" highlight />
                <FeatureItem text="Submit Assignments for Feedback" />
                <FeatureItem text="1-on-1 Mentor Consultation/mo" />
                <FeatureItem text="Advanced Analytics & Reports" />
                <FeatureItem text="Insider Discord Channels" />
                <FeatureItem text="Verified Insider Badge" />
              </ul>
              
              {/* UPDATED BUTTON FOR INSIDER */}
              <button 
                onClick={() => {
                  // Direct to Mayar Payment Link
                  const paymentUrl = billingCycle === 'monthly' 
                    ? 'https://ielsco.myr.id/m/iels-lounge-premium' // Monthly Link
                    : 'https://ielsco.myr.id/m/iels-lounge-premium'; // Ganti dengan Link Tahunan jika ada
                  
                  window.open(paymentUrl, '_blank');
                }}
                className="w-full py-2.5 rounded-xl bg-[#8B5CF6] text-white font-bold hover:bg-[#7C3AED] hover:shadow-lg transition transform active:scale-95 text-sm"
              >
                {billingCycle === 'monthly' ? 'Start Monthly Plan' : 'Get Yearly Access'}
              </button>
            </div>

            {/* TIER 3: VISIONARY (LIFETIME) */}
            <div className="bg-[#2F4157] rounded-3xl p-6 border border-gray-600 text-white relative overflow-hidden hover:border-yellow-500/50 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="mb-6 relative z-10">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-3 text-yellow-400">
                  <Crown size={20} fill="currentColor" />
                </div>
                <h3 className="text-lg font-bold text-yellow-400">👑 Visionary</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <p className="text-3xl font-bold text-white">Rp 500k</p>
                </div>
                <p className="text-xs text-gray-300 mt-1">Pay Once, Own Forever</p>
              </div>
              <ul className="space-y-3 mb-6 relative z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">The Inner Circle:</p>
                <FeatureItem text="LIFETIME Access to Everything" darkTheme />
                <FeatureItem text="1-on-1 Strategy w/ Founders" darkTheme highlight />
                <FeatureItem text="Priority Scholarship Review" darkTheme />
                <FeatureItem text="VIP Discord Channel" darkTheme />
                <FeatureItem text="Direct Alumni Network Access" darkTheme />
                <FeatureItem text="Exclusive Gold Badge" darkTheme />
                <FeatureItem text="All Future Features Unlocked" darkTheme />
              </ul>

              {/* UPDATED BUTTON FOR VISIONARY */}
              <button 
                onClick={() => {
                  // Direct to Mayar Payment Link for Visionary
                  // Ganti URL ini dengan link checkout Mayar khusus paket Visionary/Lifetime
                  window.open('https://ielsco.myr.id/m/iels-lounge-premium', '_blank'); 
                }}
                className="w-full py-2.5 rounded-xl bg-yellow-400 text-[#2F4157] font-bold hover:bg-yellow-500 hover:shadow-lg hover:shadow-yellow-400/20 active:scale-95 transition relative z-10 text-sm"
              >
                Become Visionary
              </button>
            </div>
          </div>
          
          <div className="text-center mt-8 pb-4 text-gray-400 text-xs">
            <p>Secure payment via QRIS / Bank Transfer. Questions? <a href="#" className="underline hover:text-[#8B5CF6]">Chat with us</a></p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Helper Item Component
const FeatureItem = ({ 
  text, 
  active = true, 
  highlight = false, 
  darkTheme = false 
}: { 
  text: string;
  active?: boolean;
  highlight?: boolean;
  darkTheme?: boolean;
}) => {
  return (
    <li className={`flex items-start gap-3 text-sm ${!active ? 'opacity-40' : ''}`}>
      <div className={`
        mt-0.5 shrink-0 rounded-full p-0.5 
        ${active 
          ? (highlight 
              ? 'bg-green-500 text-white' 
              : (darkTheme ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600')
            ) 
          : 'bg-gray-100 text-gray-400'}
      `}>
        {active ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
      </div>
      <span className={`
        text-xs sm:text-sm leading-tight
        ${active 
          ? (highlight 
              ? (darkTheme ? 'text-yellow-300 font-medium' : 'text-[#2F4157] font-semibold') 
              : (darkTheme ? 'text-gray-200' : 'text-gray-600')
            ) 
          : 'text-gray-400 line-through decoration-gray-300'}
      `}>
        {text}
      </span>
    </li>
  );
};

export default PricingModal;