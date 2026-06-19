"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Crown,
  Sparkles,
  Users,
  MessageCircle,
  MessageSquare,
  Mail,
  Calendar,
  Target,
  Award,
  Gift,
  Zap,
  ExternalLink,
  Globe,
  Trophy,
  Heart,
  Star,
  Video,
  BookOpen,
  Settings,
  CreditCard,
  Bell,
  FileText,
  Camera,
  Mic,
  Send
} from "lucide-react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { cn } from "@/lib/utils";

// --- TYPES ---
type UserTier = "explorer" | "insider" | "visionary";

// --- TEAM DATA ---
const TEAM_MEMBERS = [
  {
    name: "Fahri Hamdani",
    role: "Community Experience",
    avatar: "/images/team/fahri.jpg",
    bio: "Making sure everyone feels welcome"
  },
  {
    name: "Dinda Amalia",
    role: "Community Growth",
    avatar: "/images/team/dinda.jpg",
    bio: "Building connections that last"
  }
];

// --- SLIDE COMPONENTS ---

// Slide 1: Welcome
const WelcomeSlide = ({ userName }: { userName: string }) => (
  <div className="flex flex-col items-center justify-center min-h-full text-center px-6 md:px-8 py-28">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", duration: 0.8 }}
      className="mb-6 md:mb-8"
    >
      <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#304156] to-[#577E90] rounded-full flex items-center justify-center shadow-2xl shadow-[#304156]/50">
        <Crown size={48} className="text-white md:hidden" strokeWidth={2.5} />
        <Crown size={64} className="text-white hidden md:block" strokeWidth={2.5} />
      </div>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col items-center"
    >
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#304156] to-[#577E90] mb-3 md:mb-4 leading-tight">
        Welcome to
      </h1>
      
      <div className="mb-4 md:mb-6 flex justify-center">
        <Image 
          src="/images/logos/events/lounge_blue.png" 
          alt="IELS Lounge Logo" 
          width={400} 
          height={120} 
          className="h-12 md:h-16 lg:h-24 w-auto object-contain"
          priority
        />
      </div>

      <p className="text-lg md:text-2xl text-gray-600 font-medium max-w-2xl mx-auto mb-6 md:mb-8">
        Hey {userName}! 👋<br />
        You're now part of something special.
      </p>
      
      <div className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 bg-[#577E90]/10 text-[#304156] rounded-full font-bold text-base md:text-lg">
        <Sparkles size={18} fill="currentColor" />
        Your journey starts here
      </div>
    </motion.div>
  </div>
);

// Slide 2: Welcome by Principals
const PrincipalsSlide = ({ userName }: { userName: string }) => {
  const firstName = userName.split(" ")[0] || "there";

  return (
    <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
      <div className="max-w-5xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 md:mb-10"
        >
          <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
            A Message from Our Principals
          </h2>
          <p className="text-base md:text-xl text-gray-600">
            The minds behind IELS Community
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 lg:p-12 shadow-xl border border-gray-100 mb-6 md:mb-8 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#577E90]/10 to-transparent rounded-bl-full pointer-events-none" />

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="w-full md:w-2/5 flex justify-center relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-[#304156]/20 to-[#577E90]/20 rounded-full blur-2xl transform scale-90" />
            
            <Image 
              src="/images/people/directors/principals1.png" 
              alt="IELS Principals" 
              width={500} 
              height={500} 
              className="relative z-10 w-68 h-68 md:w-74 md:h-74 lg:w-98 lg:h-98 object-contain drop-shadow-2xl"
              priority
            />
          </motion.div>

          <div className="w-full md:w-3/5 space-y-4 md:space-y-6 relative z-10">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-[#304156]">
              Hi {firstName}! 👋
            </h3>
            
            <div className="space-y-3 md:space-y-4 text-base md:text-lg lg:text-xl text-gray-600 leading-relaxed font-medium">
              <p>
                We're excited to welcome you to IELS Lounge! We created this program to give you a space to practice English, connect with others, and have fun while learning.
              </p>
              <p>
                Our hope is that you'll grow your skills, gain confidence, and enjoy exploring new opportunities together. Let's learn and support each other every day!
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-[#577E90]/10 to-[#304156]/10 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-[#577E90]/20"
        >
          <p className="text-center text-sm md:text-base text-gray-700 font-medium">
            <Heart size={18} className="inline-block text-[#577E90] mb-1" /> We built this space because we believe in you. Let's make great things happen!
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// Slide 3: What is IELS Lounge
const AboutLoungeSlide = () => (
  <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
    <div className="max-w-5xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
          What is IELS Lounge?
        </h2>
        <p className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto">
          More than just English classes — it's your launchpad to global opportunities
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {[
          {
            icon: Users,
            title: "Community First",
            desc: "6,800+ learners supporting each other daily",
            color: "from-[#304156] to-[#577E90]"
          },
          {
            icon: Target,
            title: "Goal-Oriented",
            desc: "Track progress toward your dream university or job",
            color: "from-[#304156] to-[#577E90]"
          },
          {
            icon: Globe,
            title: "Real Opportunities",
            desc: "Scholarships, internships, and global connections",
            color: "from-[#304156] to-[#577E90]"
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1 }}
            className="bg-white rounded-[20px] md:rounded-[24px] p-6 md:p-8 text-center border border-gray-100 shadow-lg"
          >
            <div className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 bg-gradient-to-br",
              item.color
            )}>
              <item.icon size={24} className="text-white md:hidden" strokeWidth={2.5} />
              <item.icon size={32} className="text-white hidden md:block" strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-lg md:text-xl text-[#304156] mb-2 md:mb-3">{item.title}</h3>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 md:mt-12 text-center"
      >
        <div className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#304156] to-[#577E90] text-white rounded-full font-bold text-base md:text-lg shadow-xl">
          <Trophy size={20} className="md:hidden" />
          <Trophy size={24} className="hidden md:block" />
          <span>Your success story starts here</span>
        </div>
      </motion.div>
    </div>
  </div>
);

// Slide 4: Community Activities
const ActivitiesSlide = () => (
  <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
    <div className="max-w-6xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 md:mb-10"
      >
        <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
          What You'll Get Inside
        </h2>
        <p className="text-base md:text-xl text-gray-600">
          Weekly activities designed to boost your English fluency
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {[
          {
            day: "Monday",
            title: "Speaking Class",
            time: "19:00 WIB",
            desc: "Practice session with dedicated mentors to improve fluency",
            icon: Video,
            color: "bg-[#304156]",
            isPremium: true
          },
          {
            day: "Wednesday",
            title: "Daily Conversation Club",
            time: "20:00 WIB",
            desc: "Topic-based practice for natural daily conversations",
            icon: MessageCircle,
            color: "bg-[#577E90]",
            isPremium: true
          },
          {
            day: "Friday",
            title: "Open Thought Discussion",
            time: "19:30 WIB",
            desc: "Free-talk session to share thoughts in English",
            icon: Sparkles,
            color: "bg-[#304156]",
            isPremium: false
          },
          {
            day: "Saturday",
            title: "Talk Room: Community Spotlight",
            time: "14:00 WIB",
            desc: "Hear real stories from fellow IELS students",
            icon: Award,
            color: "bg-[#577E90]",
            isPremium: true
          }
        ].map((activity, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            className="bg-white rounded-[20px] md:rounded-[24px] p-5 md:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className="flex items-start gap-3 md:gap-4">
              <div className={cn("p-3 md:p-4 rounded-xl md:rounded-2xl text-white shrink-0", activity.color)}>
                <activity.icon size={22} className="md:hidden" strokeWidth={2.5} />
                <activity.icon size={28} className="hidden md:block" strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                  <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{activity.day}</span>
                  <span className="text-xs font-bold text-[#304156]">{activity.time}</span>
                  {!activity.isPremium && (
                    <span className="text-[10px] font-black bg-[#577E90]/20 text-[#304156] px-2 py-0.5 rounded-full">FREE</span>
                  )}
                </div>
                <h3 className="font-black text-base md:text-lg text-[#304156] mb-1">{activity.title}</h3>
                <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{activity.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-[#577E90]/10 to-[#304156]/10 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-[#577E90]/20 text-center"
      >
        <p className="text-sm md:text-base text-gray-700 font-medium mb-1 md:mb-2">
          <Bell size={16} className="inline-block text-[#577E90] mb-1" /> <strong>Pro Tip:</strong> Add all sessions to your Google Calendar
        </p>
        <p className="text-xs md:text-sm text-gray-600">Links available on each session card in your dashboard</p>
      </motion.div>
    </div>
  </div>
);
// Slide 5: Platform Features
const FeaturesSlide = () => (
  <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
    <div className="max-w-5xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
          Powerful Features at Your Fingertips
        </h2>
        <p className="text-base md:text-xl text-gray-600">
          Tools to track, learn, and showcase your progress
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
        {[
          {
            icon: Target,
            title: "Learning Goals Tracker",
            desc: "Set SMART goals and track your progress with visual dashboards. Get mentor feedback on key milestones.",
            link: "/dashboard/goals",
            color: "from-[#304156] to-[#577E90]"
          },
          {
            icon: BookOpen,
            title: "IELS Inspire: Success Stories",
            desc: "Read inspiring journeys from 800+ members who achieved their dreams. Share your own story too!",
            link: "https://ielsco.com/stories",
            color: "from-[#577E90] to-[#304156]"
          },
          {
            icon: Trophy,
            title: "Digital Portfolio",
            desc: "Build a professional portfolio showcasing your achievements. Share it with universities and employers.",
            link: "/dashboard/portfolio",
            color: "from-[#304156] to-[#577E90]"
          },
          {
            icon: Video,
            title: "1-on-1 Mentorship",
            desc: "Book personalized consultation sessions with expert mentors (Insider/Visionary exclusive).",
            link: "/dashboard/mentorship",
            color: "from-[#577E90] to-[#304156]"
          }
        ].map((feature, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            className="bg-white rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-lg hover:shadow-xl transition-all group"
          >
            <div className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 bg-gradient-to-br",
              feature.color
            )}>
              <feature.icon size={24} className="text-white md:hidden" strokeWidth={2.5} />
              <feature.icon size={28} className="text-white hidden md:block" strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-lg md:text-xl text-[#304156] mb-2 md:mb-3">{feature.title}</h3>
            <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-3 md:mb-4">{feature.desc}</p>
            <a
              href={feature.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#577E90] font-bold text-sm hover:gap-3 transition-all"
            >
              Explore <ArrowRight size={16} />
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

// Slide 6: Community Rules
const RulesSlide = () => (
  <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
    <div className="max-w-4xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#304156] to-[#577E90] rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <FileText size={24} className="text-white md:hidden" strokeWidth={2.5} />
          <FileText size={32} className="text-white hidden md:block" strokeWidth={2.5} />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
          Simple Community Rules
        </h2>
        <p className="text-base md:text-xl text-gray-600">
          To keep this space positive and productive for everyone
        </p>
      </motion.div>

      <div className="space-y-3 md:space-y-4">
        {[
          {
            rule: "Be Respectful & Kind",
            detail: "Treat everyone with respect. No bullying, hate speech, or discrimination."
          },
          {
            rule: "Stay On Topic",
            detail: "Keep discussions focused on English learning and personal growth."
          },
          {
            rule: "No Spam or Self-Promotion",
            detail: "Avoid excessive promotion of external products or services without permission."
          },
          {
            rule: "Participate Actively",
            detail: "Engage in sessions, help others, and contribute to the community spirit."
          },
          {
            rule: "Use English (Mostly)",
            detail: "Practice makes perfect! Try to communicate in English whenever possible."
          },
          {
            rule: "Protect Privacy",
            detail: "Don't share personal information (yours or others') publicly."
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="flex items-start gap-3 md:gap-4 p-4 md:p-5 bg-white rounded-[16px] md:rounded-[20px] border border-gray-100 shadow-sm hover:shadow-md transition-all"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 bg-[#577E90]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[#304156] font-black text-sm">{idx + 1}</span>
            </div>
            <div>
              <h3 className="font-black text-sm md:text-base text-[#304156] mb-0.5 md:mb-1">{item.rule}</h3>
              <p className="text-xs md:text-sm text-gray-600 leading-relaxed">{item.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 md:mt-8 bg-gradient-to-r from-[#577E90]/10 to-[#304156]/10 rounded-[20px] md:rounded-[24px] p-4 md:p-6 border border-[#577E90]/20 text-center"
      >
        <p className="text-sm md:text-base text-gray-700 font-medium">
          <Heart size={16} className="inline-block text-[#577E90] mb-1" /> Breaking these rules may result in warnings or removal from the community. Let's keep this space amazing together!
        </p>
      </motion.div>
    </div>
  </div>
);

// Slide 7: Manage Subscription
const SubscriptionSlide = () => (
  <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
    <div className="max-w-4xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-[#304156] to-[#577E90] rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <CreditCard size={24} className="text-white md:hidden" strokeWidth={2.5} />
          <CreditCard size={32} className="text-white hidden md:block" strokeWidth={2.5} />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
          Manage Your Membership
        </h2>
        <p className="text-base md:text-xl text-gray-600">
          Everything you need to manage your subscription
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
        {[
          {
            icon: CheckCircle2,
            title: "Check Status",
            desc: "View your current plan and benefits"
          },
          {
            icon: Zap,
            title: "Renew / Upgrade",
            desc: "Extend or upgrade your membership"
          },
          {
            icon: Settings,
            title: "Update Plan",
            desc: "Change payment method or billing info"
          }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            className="bg-white rounded-[16px] md:rounded-[20px] p-4 md:p-6 text-center border border-gray-100 shadow-sm"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#577E90]/10 rounded-lg md:rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
              <item.icon size={20} className="text-[#577E90] md:hidden" />
              <item.icon size={24} className="text-[#577E90] hidden md:block" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-[#304156] mb-1 md:mb-2">{item.title}</h3>
            <p className="text-xs md:text-sm text-gray-600 hidden md:block">{item.desc}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-[#577E90]/10 to-[#304156]/10 rounded-[20px] md:rounded-[24px] p-6 md:p-8 border-2 border-[#577E90]/20 text-center"
      >
        <h3 className="font-black text-xl md:text-2xl text-[#304156] mb-4">Quick Access</h3>
        <a
          href="/dashboard/settings/membership"
          target="_blank"
            rel="noopener noreferrer"
          className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-[#304156] text-white rounded-xl font-bold text-base md:text-lg hover:bg-[#577E90] transition-all shadow-lg"
        >
          <Settings size={20} className="md:hidden" />
          <Settings size={24} className="hidden md:block" />
          Go to Membership Settings
        </a>
        <p className="text-xs md:text-sm text-gray-600 mt-3 md:mt-4">
          ielsco.com/dashboard/settings/membership
        </p>
      </motion.div>
    </div>
  </div>
);

// Slide 8: Onboarding Checklist
const ChecklistSlide = () => {
  const [checks, setChecks] = useState({
    discord: false,
    whatsapp: false,
    introduce: false,
    speaking: false
  });

  return (
    <div className="flex flex-col items-center justify-start min-h-full px-6 md:px-8 py-16 md:py-28">
      <div className="max-w-4xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
            Your Onboarding Checklist
          </h2>
          <p className="text-base md:text-xl text-gray-600">
            Complete these steps to get the full IELS experience
          </p>
        </motion.div>

        {/* Step 1: Join Platforms */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-lg mb-4 md:mb-6"
        >
          <h3 className="font-black text-xl md:text-2xl text-[#304156] mb-4 md:mb-6 flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#577E90]/10 rounded-lg md:rounded-xl flex items-center justify-center text-[#304156] font-black text-sm md:text-base">1</div>
            Join Our Platforms
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="p-4 md:p-5 bg-[#577E90]/10 rounded-[16px] md:rounded-[20px] border border-[#577E90]/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#304156] rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle size={20} className="text-white md:hidden" />
                  <MessageCircle size={24} className="text-white hidden md:block" />
                </div>
                <div>
                  <h4 className="font-black text-sm md:text-base text-[#304156]">Join Discord</h4>
                  <p className="text-xs text-gray-600">Global community server</p>
                </div>
              </div>
              <a
                href="https://s.id/Lounge-DC"
                target="_blank"
                onClick={() => setChecks({...checks, discord: true})}
                className="block w-full text-center py-2.5 md:py-3 bg-[#304156] text-white rounded-xl font-bold text-sm md:text-base hover:bg-[#577E90] transition-all"
              >
                Open Discord
              </a>
            </div>

            <div className="p-4 md:p-5 bg-[#304156]/10 rounded-[16px] md:rounded-[20px] border border-[#304156]/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#577E90] rounded-lg md:rounded-xl flex items-center justify-center shrink-0">
                  <MessageCircle size={20} className="text-white md:hidden" />
                  <MessageCircle size={24} className="text-white hidden md:block" />
                </div>
                <div>
                  <h4 className="font-black text-sm md:text-base text-[#304156]">Join WhatsApp</h4>
                  <p className="text-xs text-gray-600">Insider exclusive group</p>
                </div>
              </div>
              <a
                href="https://chat.whatsapp.com/JHjrP9w7iXAII1I2JtGlrw"
                target="_blank"
                onClick={() => setChecks({...checks, whatsapp: true})}
                className="block w-full text-center py-2.5 md:py-3 bg-[#577E90] text-white rounded-xl font-bold text-sm md:text-base hover:bg-[#304156] transition-all"
              >
                Join Group
              </a>
            </div>
          </div>
        </motion.div>

        {/* Step 2: Introduce Yourself */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-lg mb-4 md:mb-6"
        >
          <h3 className="font-black text-xl md:text-2xl text-[#304156] mb-3 md:mb-4 flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#577E90]/10 rounded-lg md:rounded-xl flex items-center justify-center text-[#304156] font-black text-sm md:text-base">2</div>
            Introduce Yourself
          </h3>
          
          <div className="bg-[#577E90]/10 rounded-[16px] md:rounded-[20px] p-4 md:p-6 border border-[#577E90]/30 mb-4 md:mb-6">
            <p className="text-sm md:text-base text-gray-700 mb-3 md:mb-4 leading-relaxed">
              Post a quick 3-liner on our Padlet:
            </p>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#304156] shrink-0 mt-0.5" />
                <span>Your name & campus/city</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#304156] shrink-0 mt-0.5" />
                <span>Why you joined IELS</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#304156] shrink-0 mt-0.5" />
                <span>One English goal for this month</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[#304156] shrink-0 mt-0.5" />
                <span>Your dream country</span>
              </li>
              <li className="flex items-start gap-2">
                <Star size={14} className="text-[#577E90] shrink-0 mt-0.5" />
                <span>Bonus: A fun fact about you!</span>
              </li>
            </ul>
          </div>

          <a
            href="https://padlet.com/ielscommunity/personal-goals-dream-countries-iels-co-zy8ufwl9upkpuvec"
            target="_blank"
            onClick={() => setChecks({...checks, introduce: true})}
            className="flex items-center justify-center gap-2 w-full py-2.5 md:py-3 bg-[#304156] text-white rounded-xl font-bold text-sm md:text-base hover:bg-[#577E90] transition-all"
          >
            <Send size={16} />
            Upload on Padlet
          </a>
        </motion.div>

        {/* Step 3: Speaking Club */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-gray-100 shadow-lg"
        >
          <h3 className="font-black text-xl md:text-2xl text-[#304156] mb-3 md:mb-4 flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-[#304156]/10 rounded-lg md:rounded-xl flex items-center justify-center text-[#577E90] font-black text-sm md:text-base">3</div>
            Join Speaking Club
          </h3>

          <div className="bg-[#304156]/10 rounded-[16px] md:rounded-[20px] p-4 md:p-6 border border-[#304156]/30 mb-4 md:mb-6">
            <p className="text-sm md:text-base text-gray-700 mb-3 md:mb-4 leading-relaxed">
              <strong>Imagine having a speaking buddy every single night.</strong> You log in, someone asks "How's your day?" and suddenly… you're speaking English without realizing it.
            </p>
            
            <div className="space-y-2 md:space-y-3 mb-3 md:mb-4">
              <p className="text-xs md:text-sm text-gray-700">
                <Mic size={14} className="inline-block text-[#577E90] mr-2" />
                At IELS Speaking Club, we keep things <strong>light and silly</strong> — so you don't freeze or overthink.
              </p>
              
              <div className="bg-white rounded-xl p-3 md:p-4 space-y-2">
                <p className="text-xs md:text-sm text-gray-600 font-medium">Fun prompts like:</p>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {[
                    "🥣 Team bubur diaduk or tidak?",
                    "🏖️ Beach or mountains?",
                    "🙅‍♀️ What if Mondays didn't exist?"
                  ].map((prompt, idx) => (
                    <span key={idx} className="text-[10px] md:text-xs bg-[#577E90]/10 text-[#304156] px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg font-medium">
                      {prompt}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs md:text-sm text-[#304156] mb-1.5 md:mb-2">
              <Clock size={13} />
              <span><strong>Every night at 08:00 PM GMT+7</strong> till we get sleepy 😴</span>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-[#304156]">
              <Globe size={13} />
              <span>Only at IELS Discord Voice Channel</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#304156] to-[#577E90] rounded-[16px] md:rounded-[20px] p-4 md:p-6 text-white">
            <p className="text-xs md:text-sm mb-3 md:mb-4">
              <Sparkles size={14} className="inline-block mr-2" />
              <strong>Bonus:</strong> You can also learn to be a moderator here and gain leadership experience!
            </p>
            <button
              onClick={() => setChecks({...checks, speaking: true})}
              className="w-full py-2.5 md:py-3 bg-white text-[#304156] rounded-xl font-bold text-sm md:text-base hover:bg-gray-100 transition-all"
            >
              I'm Ready to Join!
            </button>
          </div>
        </motion.div>

        {/* Progress Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 md:mt-8 bg-gray-50 rounded-[16px] md:rounded-[20px] p-4 md:p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-xs md:text-sm font-bold text-gray-600">Your Progress</span>
            <span className="text-xs md:text-sm font-bold text-[#304156]">
              {Object.values(checks).filter(Boolean).length}/4 completed
            </span>
          </div>
          <div className="w-full bg-gray-200 h-2.5 md:h-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#304156] to-[#577E90] rounded-full transition-all duration-500"
              style={{ width: `${(Object.values(checks).filter(Boolean).length / 4) * 100}%` }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Slide 9: Rewards & Recognition
const RewardsSlide = () => (
  <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
    <div className="max-w-5xl w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 md:mb-12"
      >
        <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#304156] to-[#577E90] rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
          <Trophy size={32} className="text-white md:hidden" strokeWidth={2.5} />
          <Trophy size={40} className="text-white hidden md:block" strokeWidth={2.5} />
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
          Rewards & Recognition
        </h2>
        <p className="text-base md:text-xl text-gray-600">
          Great rewards await active members!
        </p>
      </motion.div>

      <div className="grid grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
        {[
          {
            icon: Gift,
            title: "Gopay Balance",
            value: "up to Rp100K",
            color: "from-[#304156] to-[#577E90]"
          },
          {
            icon: Crown,
            title: "1 Month Free",
            value: "IELS Lounge Access",
            color: "from-[#577E90] to-[#304156]"
          },
          {
            icon: Sparkles,
            title: "Exclusive Mentoring",
            value: "with IELS Founders",
            color: "from-[#304156] to-[#577E90]"
          }
        ].map((reward, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + idx * 0.1, type: "spring" }}
            className="bg-white rounded-[20px] md:rounded-[24px] p-4 md:p-8 text-center border border-gray-100 shadow-xl hover:shadow-2xl transition-all"
          >
            <div className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-6 bg-gradient-to-br",
              reward.color
            )}>
              <reward.icon size={24} className="text-white md:hidden" strokeWidth={2.5} />
              <reward.icon size={32} className="text-white hidden md:block" strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-sm md:text-xl text-[#304156] mb-1 md:mb-2">{reward.title}</h3>
            <p className="text-xs md:text-base text-gray-600 font-bold hidden md:block">{reward.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-[#577E90]/10 to-[#304156]/10 rounded-[20px] md:rounded-[24px] p-5 md:p-8 border-2 border-[#577E90]/20"
      >
        <h3 className="font-black text-xl md:text-2xl text-[#304156] mb-3 md:mb-4 text-center">
          How to Earn Rewards?
        </h3>
        
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
          {[
            { icon: Calendar, text: "Show up to sessions" },
            { icon: MessageCircle, text: "Participate actively" },
            { icon: CheckCircle2, text: "Complete tasks" }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col md:flex-row items-center gap-2 md:gap-3 bg-white rounded-xl p-3 md:p-4 text-center md:text-left">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-[#304156]/10 rounded-full flex items-center justify-center shrink-0">
                <item.icon size={16} className="text-[#304156] md:hidden" />
                <item.icon size={20} className="text-[#304156] hidden md:block" />
              </div>
              <span className="text-xs md:text-sm font-bold text-gray-700">{item.text}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-sm md:text-base text-gray-700 font-medium">
          <Star size={16} className="inline-block text-[#577E90] mb-1" /> We're tracking the most active members — <strong>your effort brings real impact!</strong>
        </p>
      </motion.div>
    </div>
  </div>
);

// Slide 10: Meet Your Buddies
const TeamSlide = () => {
  // Data tim IELS ditaruh di sini biar gampang di-edit
  const TEAM_MEMBERS = [
    {
      name: "Nia Kristin Sianturi",
      role: "Manager of Community Experience",
      avatar: "/images/people/leaders/nia.png",
      bio: "Your go-to buddies for anything about your learning journey and events. Need help with Speaking Club, Daily Tasks, or project participation? Mention them in the group or DM directly.",
      wa: "https://wa.me/6282164592237",
      discord: "https://discord.com/channels/@me/1123546230836965476" // <-- Taruh link discord Nia di sini
    },
    {
      name: "Ridho Septian (Lavin)",
      role: "Manager of Community Growth",
      avatar: "/images/people/leaders/ridho.png",
      bio: "These are the tech-savvy buddies who make sure everything runs smoothly. Having issues with Discord, checking your Premium ID, or membership access? Ping them!",
      wa: "https://wa.me/6281315638661",
      discord: "https://discord.com/channels/@me/1416057098051129364" // <-- Taruh link discord Ridho di sini
    }
  ];

  return (
    <div className="flex flex-col items-center justify-start md:justify-center min-h-full px-6 md:px-8 py-16 md:py-28">
      <div className="max-w-5xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-black text-[#304156] mb-3 md:mb-4">
            Meet Your Buddies
          </h2>
          <p className="text-base md:text-xl text-gray-600">
            The people making IELS Lounge amazing
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 mb-8 md:mb-12">
          {TEAM_MEMBERS.map((member, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.1, type: "spring" }}
              className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-gray-100 shadow-xl text-center flex flex-col h-full"
            >
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#304156] to-[#577E90] rounded-full mx-auto mb-4 md:mb-6 overflow-hidden border-4 border-white shadow-lg shrink-0 relative">
                <Image 
                  src={member.avatar} 
                  alt={member.name} 
                  fill
                  className="object-cover"
                />
              </div>
              
              <div className="flex-grow">
                <h3 className="font-black text-xl md:text-2xl text-[#304156] mb-1 md:mb-2">{member.name}</h3>
                <p className="text-[#577E90] font-bold text-sm md:text-base mb-3 md:mb-4">{member.role}</p>
                <p className="text-sm md:text-base text-gray-600 italic leading-relaxed">"{member.bio}"</p>
              </div>

              {/* Tombol Kontak WA & Discord */}
              <div className="flex items-center justify-center gap-3 mt-6 pt-6 border-t border-gray-100">
                <a 
                  href={member.wa} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#25D366]/10 text-[#25D366] rounded-xl font-bold text-sm hover:bg-[#25D366]/20 transition-all"
                >
                  <MessageCircle size={18} />
                  WhatsApp
                </a>
                <a 
                  href={member.discord} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-[#5865F2]/10 text-[#5865F2] rounded-xl font-bold text-sm hover:bg-[#5865F2]/20 transition-all"
                >
                  <MessageSquare size={18} />
                  Discord
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-[#577E90]/10 to-[#304156]/10 rounded-[20px] md:rounded-[24px] p-6 md:p-8 border border-[#577E90]/20 text-center"
        >
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="flex items-center gap-2 font-bold text-[#304156] bg-white px-4 py-2 rounded-xl shadow-sm">
              <Mail size={18} className="text-[#577E90]" />
              community@ielsco.com
            </div>
            <p className="text-sm md:text-base text-gray-700 font-medium max-w-lg">
              Have questions or need help regarding your experience? Feel free to email us or reach out to your buddies!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Final Slide: Ready to Start
const FinalSlide = ({ onComplete }: { onComplete: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-full text-center px-6 md:px-8 py-16 md:py-28">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", duration: 0.8 }}
      className="mb-6 md:mb-8"
    >
      <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-[#304156] to-[#577E90] rounded-full flex items-center justify-center shadow-2xl shadow-[#304156]/50">
        <CheckCircle2 size={48} className="text-white md:hidden" strokeWidth={2.5} />
        <CheckCircle2 size={64} className="text-white hidden md:block" strokeWidth={2.5} />
      </div>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#304156] via-[#577E90] to-[#304156] mb-4 md:mb-6 leading-tight">
        You're All Set!
      </h1>
      <p className="text-lg md:text-2xl text-gray-600 font-medium max-w-2xl mx-auto mb-8 md:mb-12">
        Welcome to the IELS family! 🎉<br />
        Your English mastery journey starts now.
      </p>

      <button
        onClick={onComplete}
        className="inline-flex items-center gap-2 md:gap-3 px-8 md:px-10 py-3 bg-gradient-to-r from-[#304156] to-[#577E90] text-white rounded-full font-black text-lg shadow-2xl hover:scale-105 transition-all"
      >
        <Sparkles size={22} fill="currentColor" className="md:hidden" />
        <Sparkles size={28} fill="currentColor" className="hidden md:block" />
        Go to Dashboard
        <ArrowRight size={22} className="md:hidden" />
        <ArrowRight size={28} className="hidden md:block" />
      </button>

      <p className="text-xs md:text-sm text-gray-500 mt-6 md:mt-8">
        You can revisit this guide anytime from your community dashboard
      </p>
    </motion.div>
  </div>
);

// === MAIN COMPONENT ===
export default function OnboardingPage() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [currentSlide, setCurrentSlide] = useState(0);
  const [userName, setUserName] = useState("Member");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/sign-in");
        return;
      }

      const { data: dbUser } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(dbUser?.full_name || user.user_metadata?.full_name || "Member");
      setLoading(false);
    };

    fetchUser();
  }, [router, supabase]);

  const slides = [
    <WelcomeSlide key="welcome" userName={userName} />,
    <PrincipalsSlide key="principals" userName={userName} />,
    <AboutLoungeSlide key="about" />,
    <ActivitiesSlide key="activities" />,
    <FeaturesSlide key="features" />,
    <RulesSlide key="rules" />,
    <SubscriptionSlide key="subscription" />,
    <ChecklistSlide key="checklist" />,
    <RewardsSlide key="rewards" />,
    <TeamSlide key="team" />,
    <FinalSlide key="final" onComplete={() => router.push("/dashboard/community")} />
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#577E90]/30 border-t-[#304156] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Preparing your welcome...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#F7F8FA] to-white overflow-hidden">
      {/* Slide Content — scrollable on both mobile and desktop */}
      <div className="h-full w-full overflow-y-auto pb-24 pt-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="min-h-full w-full"
          >
            {slides[currentSlide]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-white/90 via-white/70 to-transparent pt-6 pb-4 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={cn(
                  "h-1.5 md:h-2 rounded-full transition-all",
                  idx === currentSlide
                    ? "w-5 md:w-8 bg-[#304156]"
                    : "w-1.5 md:w-2 bg-gray-300 hover:bg-gray-400"
                )}
              />
            ))}
          </div>

          {/* Navigation Buttons — icon only on mobile, icon + text on desktop */}
          <div className="flex items-center gap-2 md:gap-4">
            {currentSlide > 0 && (
              <button
                onClick={prevSlide}
                className="flex items-center gap-2 px-3 py-2.5 md:px-6 md:py-3 bg-white border-2 border-gray-200 rounded-full font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-lg"
                aria-label="Previous slide"
              >
                <ArrowLeft size={18} />
                <span className="hidden md:inline">Back</span>
              </button>
            )}
            
            {currentSlide < slides.length - 1 && (
              <button
                onClick={nextSlide}
                className="flex items-center gap-2 px-3 py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-[#304156] to-[#577E90] text-white rounded-full font-bold hover:scale-105 transition-all shadow-xl"
                aria-label="Next slide"
              >
                <span className="hidden md:inline">Next</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

{/* Identity Logo (Top Left) */}
    <div className="fixed top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 bg-white/50 backdrop-blur-md border border-white/20 rounded-full z-50 shadow-sm">
      <Image 
        src="/images/logos/iels_blue1.png" 
        alt="IELS Logo" 
        width={60} 
        height={20} 
        className="h-3.5 md:h-5 w-auto object-contain"
      />
      <div className="w-px h-3 md:h-4 bg-[#304156]/20" /> {/* Separator line */}
      <Image 
        src="/images/logos/events/lounge_blue.png" 
        alt="IELS Lounge Logo" 
        width={80} 
        height={20} 
        className="h-3.5 md:h-5 w-auto object-contain"
      />
    </div>

    {/* Skip Button (Top Right) */}
    <button
      onClick={() => router.push("/dashboard/community")}
      className="fixed top-4 right-4 md:top-8 md:right-8 px-3 py-1.5 md:px-4 md:py-2 bg-white/50 backdrop-blur-md border border-white/20 rounded-full font-medium text-gray-600 hover:bg-white transition-all text-xs md:text-sm z-50 shadow-sm"
    >
      Skip for now
    </button>
    </div>
  );
}