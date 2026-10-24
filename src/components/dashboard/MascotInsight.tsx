"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { 
  Sparkles, Quote, Activity, Target, Zap, Ghost, Moon, Trophy,
  Coffee, Brain, Flame, TrendingUp, TrendingDown, 
  MessageCircle, BookOpen, Mic, FileText, Headphones,
  AlertTriangle, CheckCircle2, Calendar, BarChart3
} from "lucide-react";
import type { GoalAnalytics, GoalWithTasks } from "@/types/goals";

interface MascotInsightProps {
  analytics: GoalAnalytics;
  goal: GoalWithTasks;
  userName: string;
}

// ==========================================
// 🎭 MASCOT MOOD CONFIGURATION
// ==========================================
const MASCOT_MOODS = {
  happy: "/images/contents/mascot/poses/happy.png",
  excited: "/images/contents/mascot/poses/wink-jump.png", 
  concerned: "/images/contents/mascot/poses/stressed.png",
  strict: "/images/contents/mascot/poses/neutral.png",
  shocked: "/images/contents/mascot/poses/tumble.png",
  sleepy: "/images/contents/mascot/poses/relaxed.png",
  proud: "/images/contents/mascot/poses/proud.png",
  thinking: "/images/contents/mascot/poses/relaxed.png",
  celebrating: "/images/contents/mascot/poses/cheer.png",
  coffee: "/images/contents/mascot/poses/relaxed.png"
};

interface InsightData {
  mood: keyof typeof MASCOT_MOODS;
  title: string;
  message: string;
  icon: React.ReactNode;
  gradient: string;
  actionTip?: string;
  categoryFocus?: string;
}

export default function MascotInsight({ analytics, goal, userName }: MascotInsightProps) {
  const [insight, setInsight] = useState<InsightData | null>(null);

  useEffect(() => {
    const firstName = userName.split(" ")[0];
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysUntilDeadline = Math.floor(
      (new Date(goal.target_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Helper: Random picker
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    // Calculate category strengths/weaknesses
    const categoryData = Object.entries(analytics.category_progress)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.percentage - a.percentage);
    
    const strongestCategory = categoryData[0];
    const weakestCategory = categoryData[categoryData.length - 1];
    
    // Task type analysis
    const systemRate = analytics.system_tasks_completed / Math.max(1, goal.tasks.filter(t => t.task_type === 'system').length);
    const selfTrackRate = analytics.self_track_tasks_completed / Math.max(1, goal.tasks.filter(t => t.task_type === 'self_track').length);
    const mentorRate = analytics.mentor_assessed_tasks_completed / Math.max(1, goal.tasks.filter(t => t.task_type === 'mentor_assessed').length);
    
    let result: InsightData = {
      mood: "happy",
      title: "Analyzing...",
      message: "Hold up, processing your vibes...",
      icon: <Activity size={18} />,
      gradient: "from-[#2F4157]/90 to-[#2F4157]"
    };

    // ==========================================
    // 🥚 EASTER EGGS (RARE & FUNNY)
    // ==========================================
    
    // 1. THE NIGHT OWL (1-5 AM)
    if (hour >= 1 && hour < 5 && Math.random() < 0.8) {
      result = {
        mood: "sleepy",
        title: pick([
          "bestie it's literally " + hour + " AM 😭",
          "go to BED challenge (impossible)",
          "sleep is for the weak but you NEED IT"
        ]),
        message: pick([
          `Look ${firstName}, I admire the dedication but your brain cells are literally begging for mercy rn. Sleep = better memory retention. It's science, not me being annoying.`,
          `It's ${hour} AM and you're studying? That's... actually impressive but also concerning. Your future self will hate you tomorrow. Trust.`,
          "Fun fact: studying while sleep-deprived is like trying to charge your phone with a potato. Technically possible but WHY.",
          `Okay ${firstName}, real talk. Go drink water, close your laptop, and get horizontal. The IELTS will still be there in 6 hours.`
        ]),
        icon: <Moon size={18} />,
        gradient: "from-[#2F4157] to-[#2F4157]/95",
        actionTip: "Seriously though, studies show 7-8 hours sleep improves test performance by 20%. That's worth more than this midnight grind."
      };
    }
    
    // 2. THE GHOST (0% after 10+ days)
    else if (goal.overall_progress === 0 && daysSinceCreation >= 10) {
      result = {
        mood: "strict",
        title: pick([
          "hello??? is this thing on???",
          "we need to talk...",
          "*taps mic* testing 1, 2, 3"
        ]),
        message: pick([
          `${firstName}... it's been ${daysSinceCreation} days and we're still at 0%. I'm not mad, I'm just... okay no I'm a little mad. What's going on bestie?`,
          `Look, I get it. Life happens. Motivation dips. But ${daysSinceCreation} days with zero progress? That's giving 'I forgot I had homework' energy.`,
          "This goal isn't gonna achieve itself while you're busy scrolling TikTok. (No judgment, I would too if I had a body.) But fr, let's get moving.",
          `Real talk: ${daysSinceCreation} days of ghosting? Even my ex didn't ghost me this hard. One task. Today. That's all I ask.`
        ]),
        icon: <Ghost size={18} />,
        gradient: "from-[#2F4157]/95 to-[#2F4157]/90",
        actionTip: "Baby steps: Just complete ONE self-track task today. Build momentum, not pressure."
      };
    }
    
    // 3. UNSTOPPABLE STREAK (30+ days)
    else if (analytics.completion_streak >= 30) {
      result = {
        mood: "shocked",
        title: pick([
          analytics.completion_streak + " DAYS??? TOUCH GRASS",
          "okay you're actually insane (compliment)",
          "IS THIS EVEN LEGAL???"
        ]),
        message: pick([
          `${analytics.completion_streak} consecutive days? ${firstName}, I don't even have that kind of consistency and I'm literally coded to be consistent. You're built different fr fr.`,
          `At this point you should be teaching the course. ${analytics.completion_streak} days without missing? That's not discipline, that's OBSESSION (the good kind).`,
          "I've seen a lot of learners but YOU? You're in the top 0.1%. This isn't hype, this is statistical fact. You're HIM/HER.",
          `The streak is ${analytics.completion_streak}. The vibes are IMMACULATE. The dedication is UNMATCHED. ${firstName} is that person. Be like ${firstName}.`
        ]),
        icon: <Flame size={18} />,
        gradient: "from-[#2F4157]/90 to-[#2F4157]/80",
        actionTip: "You've unlocked: Legend Status 🏆 Keep the momentum but don't forget rest days are valid too!"
      };
    }
    
    // 4. SPEED DEMON (50%+ in under 3 days)
    else if (goal.overall_progress >= 50 && daysSinceCreation < 3) {
      result = {
        mood: "shocked",
        title: "SLOW DOWN SPEED RACER",
        message: pick([
          `Wait you're halfway done in ${daysSinceCreation} days? Are you speedrunning education? This isn't Minecraft, ${firstName} 😭`,
          "Okay but like... are you okay? Blink twice if you're being held hostage by your own ambition.",
          `50% in ${daysSinceCreation} days is crazy work. I'm impressed but also mildly concerned. Take a breath challenge (easy).`
        ]),
        icon: <Zap size={18} />,
        gradient: "from-[#2F4157]/95 to-[#2F4157]/85",
        actionTip: "Pro tip: Slow and steady beats burnout. You're crushing it but pace yourself or you'll crash in week 2."
      };
    }
    
    // 5. PROCRASTINATION KING (< 10% with 7+ days left)
    else if (goal.overall_progress < 10 && daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
      result = {
        mood: "strict",
        title: "DEADLINE INCOMING 🚨",
        message: pick([
          `${firstName}, we have ${daysUntilDeadline} days left and you're at ${goal.overall_progress}%. This is giving 'I'll start tomorrow' energy but tomorrow is literally TOMORROW.`,
          `Not to be that person but... ${daysUntilDeadline} days. ${goal.overall_progress}% done. Math ain't mathing bestie. Crisis mode: ACTIVATED.`,
          "You know that feeling when you realize the assignment is due tonight? Yeah. That's where we're headed. Let's NOT do that."
        ]),
        icon: <AlertTriangle size={18} />,
        gradient: "from-[#2F4157] to-[#2F4157]/90",
        actionTip: `Reality check: You need ${Math.ceil((100 - goal.overall_progress) / daysUntilDeadline)}% progress per day. It's doable but you gotta LOCK IN.`
      };
    }
    
    // 6. MONDAY BLUES
    else if (dayOfWeek === 1 && hour < 12) {
      result = {
        mood: "coffee",
        title: "Monday Morning Mood: Not It",
        message: pick([
          `${firstName}, I know it's Monday and everything hurts. But hey, completing one task before noon = small win energy. You got this (maybe).`,
          "Monday mornings hit different. But you're here, you're logged in, and that already counts for something. Baby steps.",
          "If you can survive Monday morning, you can survive IELTS. That's the motivational quote of the day. You're welcome."
        ]),
        icon: <Coffee size={18} />,
        gradient: "from-[#2F4157]/85 to-[#2F4157]/80",
        actionTip: "Start with your easiest task. Build momentum. Mondays don't have to be miserable."
      };
    }
    
    // 7. FRIDAY ENERGY
    else if (dayOfWeek === 5 && hour >= 16) {
      result = {
        mood: "excited",
        title: "FRIDAY AFTERNOON VIBES",
        message: pick([
          "It's Friday evening and you're still grinding? Respect. But also, it's okay to close the laptop and touch grass.",
          `${firstName}, I see you. It's Friday. The vibes are immaculate. Finish this one task then go enjoy your weekend guilt-free.`,
          "Weekend loading... but hey, knocking out one quick task now = less guilt later. Your call though."
        ]),
        icon: <Sparkles size={18} />,
        gradient: "from-[#2F4157]/90 to-[#2F4157]/85"
      };
    }

    // ==========================================
    // 📊 SMART ANALYTICS (SPECIFIC & DETAILED)
    // ==========================================
    else {
      
      // SCENARIO 1: AHEAD + SPECIFIC STRENGTH
      if (analytics.is_ahead_of_schedule && goal.overall_progress >= 30) {
        const velocityEmoji = analytics.average_progress_per_week >= 15 ? "🚀" : "✈️";
        
        result = {
          mood: "proud",
          title: `You're ${Math.round((goal.overall_progress / ((daysSinceCreation / 7) * analytics.average_progress_per_week)) * 100 - 100)}% ahead of schedule ${velocityEmoji}`,
          message: pick([
            `Okay ${firstName}, let's talk numbers. You're progressing at ${analytics.average_progress_per_week}% per week while most people do 8-12%. You're literally carrying. ${strongestCategory ? `Your ${strongestCategory.name} game is at ${strongestCategory.percentage}% which is INSANE.` : ''}`,
            `Real talk: You're ahead of 73% of learners with similar goals. ${strongestCategory ? `Especially your ${strongestCategory.name} skills - ${strongestCategory.completed}/${strongestCategory.total} tasks done?` : ''} That's elite behavior.`,
            `The stats don't lie: ${analytics.average_progress_per_week}%/week velocity, ${analytics.completion_streak} day streak, ${analytics.days_active} active days. You're on DEMON TIME rn.`
          ]),
          icon: <TrendingUp size={18} />,
          gradient: "from-[#2F4157]/95 to-[#2F4157]/90",
          categoryFocus: strongestCategory?.name,
          actionTip: weakestCategory ? `Small note: Your ${weakestCategory.name} is at ${weakestCategory.percentage}%. Not urgent, but maybe give it some love this week?` : undefined
        };
      }
      
      // SCENARIO 2: BEHIND + SPECIFIC WEAKNESS
      else if (!analytics.is_ahead_of_schedule && goal.overall_progress < 50) {
        const gapPercent = Math.abs(Math.round(
          (goal.overall_progress / ((daysSinceCreation / (daysSinceCreation + daysUntilDeadline)) * 100) - 1) * 100
        ));
        
        result = {
          mood: "concerned",
          title: `Let's have a real talk, ${firstName}`,
          message: pick([
            `You're ${gapPercent}% behind where you should be timeline-wise. Not gonna sugarcoat it. ${weakestCategory ? `Your ${weakestCategory.name} is the main bottleneck (${weakestCategory.percentage}%).` : ''} BUT here's the thing - you've got ${daysUntilDeadline} days and it's totally recoverable if we lock in NOW.`,
            `Current velocity: ${analytics.average_progress_per_week}%/week. You need ${Math.ceil((100 - goal.overall_progress) / (daysUntilDeadline / 7))}%/week to hit your deadline. ${weakestCategory ? `Focus on ${weakestCategory.name} - you're at ${weakestCategory.completed}/${weakestCategory.total} tasks there.` : ''} It's tight but doable.`,
            `Okay so here's where we're at: ${goal.overall_progress}% done, ${daysUntilDeadline} days left. ${weakestCategory ? `Your ${weakestCategory.name} needs work (${weakestCategory.percentage}%).` : ''} Not ideal but I've seen people bounce back from worse. You in?`
          ]),
          icon: <TrendingDown size={18} />,
          gradient: "from-[#2F4157]/90 to-[#2F4157]/85",
          categoryFocus: weakestCategory?.name,
          actionTip: `Action plan: Focus ${weakestCategory?.name || 'your weakest'} category. Complete 2-3 tasks there this week. Small wins → momentum → caught up.`
        };
      }
      
      // SCENARIO 3: TASK TYPE IMBALANCE
      else if (selfTrackRate < 0.4 && systemRate > 0.7) {
        result = {
          mood: "thinking",
          title: "I Spotted Something Interesting...",
          message: pick([
            `${firstName}, you're crushing system tasks (${Math.round(systemRate * 100)}% done) but self-track ones are at ${Math.round(selfTrackRate * 100)}%. You're great at showing up to events but the daily grind? That needs attention fr.`,
            `Pattern detected: You complete ${Math.round(systemRate * 100)}% of verified tasks but only ${Math.round(selfTrackRate * 100)}% of self-track ones. Classic 'I'm good when someone's watching' energy. Let's change that.`,
            "Here's the tea: You're reliable with scheduled stuff but self-discipline tasks? Yeah... ${Math.round(selfTrackRate * 100)}% completion. Not judging, just pointing it out so we can fix it."
          ]),
          icon: <Brain size={18} />,
          gradient: "from-[#2F4157]/95 to-[#2F4157]/80",
          actionTip: "Try this: Set phone reminders for self-track tasks. Treat them like appointments. Fake it till you make it."
        };
      }
      
      // SCENARIO 4: MENTOR TASK AVOIDANCE
      else if (mentorRate < 0.3 && selfTrackRate > 0.6) {
        result = {
          mood: "thinking",
          title: "Are You Avoiding Feedback? 👀",
          message: pick([
            `So you're at ${Math.round(selfTrackRate * 100)}% on self-track tasks but only ${Math.round(mentorRate * 100)}% on mentor-assessed ones. ${firstName}, I think you're avoiding feedback. It's okay to be nervous but that's literally where the growth is.`,
            `Quick observation: You're doing great on solo tasks (${Math.round(selfTrackRate * 100)}%) but mentor feedback tasks? ${Math.round(mentorRate * 100)}%. What's up with that? Scared of criticism? Don't be - mentors are there to help, not roast you.`,
            "Real pattern: High self-study completion but low mentor submission rate. Translation: You don't trust the process yet. Spoiler: The feedback is what levels you up."
          ]),
          icon: <MessageCircle size={18} />,
          gradient: "from-[#2F4157]/90 to-[#2F4157]/85",
          actionTip: "Challenge: Submit ONE mentor task this week. The anticipation is worse than the actual feedback. Promise."
        };
      }
      
      // SCENARIO 5: BALANCED + STEADY
      else if (analytics.completion_streak >= 7 && analytics.completion_streak < 20) {
        result = {
          mood: "happy",
          title: `${analytics.completion_streak}-Day Streak! This Is How It's Done`,
          message: pick([
            `${firstName}, you're in that sweet spot. ${analytics.completion_streak} days of consistency, ${analytics.average_progress_per_week}%/week progress. Not flashy, just solid. This is actually the ideal pace - sustainable and effective.`,
            `Your stats are looking healthy: ${analytics.completion_streak} day streak, ${analytics.days_active} active days, ${goal.overall_progress}% complete. ${strongestCategory ? `${strongestCategory.name} at ${strongestCategory.percentage}% is carrying.` : ''} Keep this exact energy.`,
            "Unironically? You're doing it right. Consistent small efforts > occasional big bursts. Your future self at the exam will thank you."
          ]),
          icon: <CheckCircle2 size={18} />,
          gradient: "from-[#2F4157] to-[#2F4157]/95",
          categoryFocus: strongestCategory?.name
        };
      }
      
      // SCENARIO 6: CATEGORY SPECIFIC (Listening/Reading strong, Writing/Speaking weak)
      else if (weakestCategory && weakestCategory.percentage < 30) {
        const categoryEmoji: Record<string, string> = {
          reading: "📖",
          writing: "✍️",
          speaking: "🗣️",
          listening: "👂"
        };
        
        result = {
          mood: "concerned",
          title: `Your ${weakestCategory.name} Needs Some Love ${categoryEmoji[weakestCategory.name] || ''}`,
          message: pick([
            `${firstName}, let's address the elephant in the room: ${weakestCategory.name} is at ${weakestCategory.percentage}% (${weakestCategory.completed}/${weakestCategory.total} tasks). ${strongestCategory ? `Your ${strongestCategory.name} is thriving at ${strongestCategory.percentage}%, so you CAN do this.` : ''} Time to balance the scales.`,
            `Quick audit: ${strongestCategory ? `${strongestCategory.name} (${strongestCategory.percentage}%) = crushing it.` : ''} ${weakestCategory.name} (${weakestCategory.percentage}%) = needs work. The gap is ${strongestCategory && (strongestCategory.percentage - weakestCategory.percentage)}%. Let's close it.`,
            `Not to be dramatic but ${weakestCategory.name} at ${weakestCategory.percentage}% could tank your overall score. ${strongestCategory ? `You're clearly capable (${strongestCategory.name} proves it).` : ''} Just redirect some energy there.`
          ]),
          icon: weakestCategory.name === 'writing' ? <FileText size={18} /> : 
                weakestCategory.name === 'speaking' ? <Mic size={18} /> :
                weakestCategory.name === 'reading' ? <BookOpen size={18} /> : <Headphones size={18} />,
          gradient: "from-[#2F4157]/95 to-[#2F4157]/90",
          categoryFocus: weakestCategory.name,
          actionTip: `This week's mission: Complete 3 ${weakestCategory.name} tasks. That'll bump you from ${weakestCategory.percentage}% to ~${Math.min(100, weakestCategory.percentage + 20)}%. Doable.`
        };
      }
      
      // DEFAULT: GENERAL ENCOURAGEMENT
      else {
        result = {
          mood: "happy",
          title: "Solid Progress, Keep It Up!",
          message: pick([
            `${firstName}, you're at ${goal.overall_progress}% with ${daysUntilDeadline} days to go. Nothing crazy good or bad - just steady work. ${strongestCategory ? `${strongestCategory.name} is your strongest at ${strongestCategory.percentage}%.` : ''} Keep showing up and you'll get there.`,
            `Current status: ${goal.overall_progress}% done, ${analytics.completion_streak} day streak. You're doing fine. Not extraordinary, not struggling - just progressing. And honestly? That's valid.`,
            "You're making progress. Not breaking records, not falling behind. Just... doing the work. And that's literally all it takes."
          ]),
          icon: <Target size={18} />,
          gradient: "from-[#2F4157]/90 to-[#2F4157]/85"
        };
      }
    }

    setInsight(result);
  }, [analytics, goal, userName]);

  if (!insight) return null;

  return (
    <div className="space-y-6">
      {/* MAIN MASCOT INSIGHT CARD */}
      <div className={`
        relative overflow-hidden rounded-3xl p-6 md:p-8 shadow-xl
        bg-gradient-to-br ${insight.gradient}
        text-white transition-all duration-500 hover:shadow-2xl
        border border-white/10
      `}>
        {/* Subtle background pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
          
          {/* MASCOT AVATAR */}
          <div className="shrink-0 relative group">
            <div className="w-28 h-28 md:w-32 md:h-32 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 shadow-2xl backdrop-blur-sm relative overflow-hidden transition-transform duration-300 group-hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
              
              <Image 
                src={MASCOT_MOODS[insight.mood] || MASCOT_MOODS.happy}
                alt="IELS AI Companion"
                width={100}
                height={100}
                className="object-contain drop-shadow-xl transform translate-y-1 relative z-10"
                priority
              />
            </div>
            
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#2F4157] text-white text-[9px] uppercase tracking-[0.15em] font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap">
              Your Buddy
            </div>
          </div>

          {/* SPEECH BUBBLE */}
          <div className="flex-1 w-full">
            <div className="relative bg-white/10 rounded-2xl rounded-tl-sm p-6 backdrop-blur-md border border-white/20 shadow-lg">
              
              <div className="absolute -top-2.5 -left-2.5 bg-[#E56668] text-white p-1.5 rounded-full shadow-md">
                <Quote size={14} fill="currentColor" />
              </div>

              {/* Title */}
              <h3 className="text-lg md:text-xl font-extrabold text-[#E56668] mb-3 flex items-center gap-2 drop-shadow-sm">
                {insight.icon}
                <span className="leading-tight">{insight.title}</span>
                </h3>

              {/* Main Message */}
              <p className="text-white/95 leading-relaxed text-sm md:text-base font-medium tracking-wide">
                {insight.message}
              </p>
              
              {/* Action Tip */}
              {insight.actionTip && (
                <div className="pt-4 ">
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="text-[#E56668] flex-shrink-0 mt-1" />
                    <p className="text-white/80 text-xs md:text-sm italic leading-relaxed">
                      {insight.actionTip}
                    </p>
                  </div>
                </div>
              )}

            
                {analytics.days_active > 0 && (
                  <span className="flex items-center gap-1.5 hover:text-white/80 transition-colors mt-4 text-xs text-white/60">
                    <Calendar size={11} /> {analytics.days_active} active days
                  </span>
                )}
            
            </div>
          </div>
        </div>
      </div>

      {/* QUICK STATS BREAKDOWN */}
      {insight.categoryFocus && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 size={16} />
            Category Breakdown
          </h4>
          
          <div className="space-y-3">
            {Object.entries(analytics.category_progress)
              .sort(([, a], [, b]) => b.percentage - a.percentage)
              .map(([name, data]) => (
                <div key={name} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      name === insight.categoryFocus 
                        ? 'text-[#E56668]' 
                        : 'text-gray-600'
                    }`}>
                      {name}
                    </span>
                    <span className="text-xs font-bold text-[#2F4157]">
                      {data.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        name === insight.categoryFocus
                          ? 'bg-gradient-to-r from-[#E56668] to-[#E56668]/80'
                          : 'bg-gradient-to-r from-[#2F4157] to-[#2F4157]/70'
                      }`}
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-right">
                    {data.completed}/{data.total} tasks
                  </p>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}