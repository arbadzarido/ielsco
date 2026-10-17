"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  CheckCircle, 
  Calendar, 
  MessageCircle, 
  Users, 
  Award,
  ArrowRight,
  Sparkles,
  Crown,
  Gift,
} from "lucide-react";
import Image from "next/image";

interface OnboardingModalProps {
  onClose: () => void;
  userTier: "explorer" | "insider" | "visionary";
}

export default function OnboardingModal({ onClose, userTier }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "🎉 Welcome to IELS Lounge!",
      subtitle: `You're now an ${userTier === "visionary" ? "exclusive Visionary" : "Insider"} member`,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mb-4">
              <Crown size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Your Payment is Confirmed!
            </h3>
            <p className="text-gray-600">
              Thank you for joining our community. Let's get you started with everything you need to know.
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl text-white">
                <Gift size={24} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-2">What You Get:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>Access to all weekly sessions (Mon, Wed, Fri, Sat)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>WhatsApp Inner Circle for priority mentoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>Exclusive resources and learning materials</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>Networking with 6,800+ ambitious learners</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "📅 Weekly Activity Schedule",
      subtitle: "Join live sessions to practice and improve your English",
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 text-center mb-6">
            We have 4 weekly sessions designed to help you master English through consistent practice.
          </p>

          <div className="space-y-3">
            {[
              {
                day: "Monday",
                title: "Speaking Class",
                time: "19:00 WIB",
                color: "bg-red-500",
                icon: <Users size={20} />,
              },
              {
                day: "Wednesday",
                title: "Daily Conversation Club",
                time: "20:00 WIB",
                color: "bg-blue-500",
                icon: <MessageCircle size={20} />,
              },
              {
                day: "Friday",
                title: "Open Thought Discussion",
                time: "19:30 WIB",
                color: "bg-teal-500",
                icon: <Sparkles size={20} />,
              },
              {
                day: "Saturday",
                title: "Community Spotlight",
                time: "14:00 WIB",
                color: "bg-amber-600",
                icon: <Award size={20} />,
              },
            ].map((session, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className={`p-3 ${session.color} rounded-lg text-white`}>
                  {session.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-500">{session.day}</span>
                    <span className="text-xs font-bold text-red-600">{session.time}</span>
                  </div>
                  <h4 className="font-bold text-gray-900">{session.title}</h4>
                </div>
                <CheckCircle size={20} className="text-emerald-500" />
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 mt-6">
            <p className="text-sm text-blue-900">
              <strong>Pro Tip:</strong> Add all sessions to your Google Calendar so you never miss a class. Links are available on each session card.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "💬 Join WhatsApp Inner Circle",
      subtitle: "Connect with mentors and fellow members",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-[#25D366] rounded-full mb-4">
              <MessageCircle size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Your Exclusive Community Awaits
            </h3>
            <p className="text-gray-600">
              Join our WhatsApp group for priority support, networking, and exclusive updates.
            </p>
          </div>

          <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
            <h4 className="font-bold text-gray-900 mb-4">What happens in the group:</h4>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Daily Motivation:</strong> Inspirational content and success stories</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Priority Mentoring:</strong> Direct access to IELS mentors</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Study Resources:</strong> Exclusive materials and practice tests</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Networking:</strong> Connect with peers pursuing similar goals</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Event Updates:</strong> First to know about workshops and webinars</span>
              </li>
            </ul>
          </div>

          <a
            href="https://chat.whatsapp.com/YOUR_EXCLUSIVE_GROUP_LINK"
            target="_blank"
            className="block w-full text-center py-4 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#1ea952] transition-all shadow-lg"
          >
            Join WhatsApp Group Now
          </a>

          <p className="text-xs text-gray-500 text-center">
            You can also access this link anytime from your community dashboard.
          </p>
        </div>
      ),
    },
    {
      title: "🚀 You're All Set!",
      subtitle: "Start your journey to English mastery",
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full mb-4">
              <Sparkles size={40} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Ready to Begin?
            </h3>
            <p className="text-gray-600">
              Here's your quick-start checklist to make the most of your membership.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { text: "Join WhatsApp Inner Circle", done: false },
              { text: "Add weekly sessions to your calendar", done: false },
              { text: "Introduce yourself in Discord", done: false },
              { text: "Attend your first live session", done: false },
            ].map((item, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
              >
                <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                  {item.done && <CheckCircle size={20} className="text-emerald-500" />}
                </div>
                <span className="text-gray-700 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Gift size={20} className="text-purple-600" />
              Referral Bonus
            </h4>
            <p className="text-sm text-gray-700 mb-3">
              Love IELS Lounge? Invite friends and earn <strong>1 month FREE</strong> for every 3 successful referrals!
            </p>
            <button className="text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors">
              Get Your Referral Link →
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-[#E56668] to-[#d63540] text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            Go to Community Dashboard
            <ArrowRight size={20} />
          </button>
        </div>
      ),
    },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-3xl z-10">
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{steps[currentStep].title}</h2>
            <p className="text-gray-500 text-sm">{steps[currentStep].subtitle}</p>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`h-1.5 rounded-full flex-1 transition-all ${
                  idx <= currentStep ? 'bg-[#E56668]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-8 py-6 rounded-b-3xl flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
          
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="px-6 py-2.5 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2.5 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d65557] transition-all flex items-center gap-2"
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2"
              >
                Get Started
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}