// src/data/quizData.ts
export type Answer = {
  id: string;
  label: string;
  emoji?: string;
  points?: Partial<Record<string, number>>;
};

export type Question = {
  id: number;
  title: string;
  prompt: string;
  options: Answer[];
};

export const QUESTIONS: Question[] = [
  // Q1 — discovery (no points, just tracking)
  {
    id: 1,
    title: "Where did you hear about IELS?",
    prompt: "Choose the platform where you first discovered us.",
    options: [
      { id: "instagram", label: "Instagram", emoji: "📸" },
      { id: "whatsapp", label: "WhatsApp", emoji: "💬" },
      { id: "friends",   label: "Friends or Family", emoji: "👨‍👩‍👧" },
      { id: "media",     label: "Media Partners", emoji: "📰" },
      { id: "other",     label: "Other", emoji: "🔍" },
    ],
  },

  // Q2 — goal (options aligned to IELS Lounge + Course)
  {
    id: 2,
    title: "Why do you want to learn English?",
    prompt: "Choose the option that best fits your dream.",
    options: [
      { id: "study",  label: "To study abroad",     emoji: "🎓", points: { academic: 3 } },
      { id: "work",   label: "To work abroad",       emoji: "🌐", points: { career: 3 } },
      { id: "career", label: "To grow my career",   emoji: "🚀", points: { career: 2 } },
      { id: "social", label: "To meet new people",  emoji: "🌏", points: { social: 3 } },
    ],
  },

  // Q3 — status (REPLACES old "region" question)
  {
    id: 3,
    title: "What's your current status?",
    prompt: "This helps us tailor the right program for you.",
    options: [
      { id: "highschool",  label: "High School Student",  emoji: "🏫", points: { beginner: 1, social: 1 } },
      { id: "university",  label: "University Student",   emoji: "🎒", points: { academic: 2 } },
      { id: "fresh_grad",  label: "Fresh Graduate",       emoji: "🎉", points: { career: 2 } },
      { id: "professional",label: "Working Professional", emoji: "💼", points: { career: 3 } },
    ],
  },

  // Q4 — current level
  {
    id: 4,
    title: "How confident are you in English today?",
    prompt: "Be honest — this helps us recommend the right path.",
    options: [
      { id: "beg1", label: "Just getting started",                              emoji: "🌱", points: { beginner: 3 } },
      { id: "beg2", label: "I understand a bit, but speaking is still hard",   emoji: "🗣️", points: { beginner: 2 } },
      { id: "mid",  label: "I use English sometimes, but want more fluency",   emoji: "📈", points: { intermediate: 2 } },
      { id: "adv",  label: "Comfortable in most situations",                   emoji: "⚡", points: { advanced: 2 } },
    ],
  },

  // Q5 — learning style
  {
    id: 5,
    title: "How do you prefer to learn?",
    prompt: "Pick the style that helps you stay consistent.",
    options: [
      { id: "solo",   label: "By myself",           emoji: "📚", points: { academic: 1 } },
      { id: "mentor", label: "With a mentor",        emoji: "🧑‍🏫", points: { career: 1 } },
      { id: "group",  label: "In a group",           emoji: "👥", points: { social: 2 } },
      { id: "game",   label: "Challenges & games",  emoji: "🎯", points: { beginner: 1, dream: 1 } },
    ],
  },
];

// Daily commitment slider — updated range: 15 min to 180 min (3 hours)
export const DAILY_TARGET = {
  min: 15,
  max: 180,
  step: 15,
};

// ── PROGRAM RECOMMENDATIONS ─────────────────────────────────────────────────
export type Program = {
  name: string;
  tag: string;
  desc: string;
  href: string;
  accent: string; // tailwind bg color token
};

export function getRecommendedPrograms(scores: Record<string, number>): Program[] {
  const highest = Object.entries(scores || {}).sort((a, b) => b[1] - a[1])[0]?.[0];
  const isBeginnerOrSocial = (scores.beginner ?? 0) + (scores.social ?? 0) >= 3;
  const isAcademic        = (scores.academic ?? 0) >= 3;
  const isCareer          = (scores.career ?? 0) >= 3;

  const programs: Program[] = [];

  // Always recommend Lounge for beginners / social learners
  if (isBeginnerOrSocial || highest === "social" || highest === "beginner") {
    programs.push({
      name: "IELS Lounge",
      tag: "Community · Daily Practice",
      desc: "Your judgment-free daily speaking space. Practice English every night with thousands of SEA learners — build real confidence through real conversations.",
      href: "/iels-lounge",
      accent: "bg-[#1A2534]",
    });
  }

  // Recommend course for academic / career oriented
  if (isAcademic || isCareer || highest === "academic" || highest === "career") {
    programs.push({
      name: "IELS Course",
      tag: "IELTS & TOEFL Prep",
      desc: "Structured courses with mock tests and expert mentors. Hit the exact score you need to unlock your dream university or global career.",
      href: "/products/courses",
      accent: "bg-[#E56668]",
    });
  }

  // Always add Events as a third option
  programs.push({
    name: "Global Events",
    tag: "Workshops · Bootcamps",
    desc: "Join speaking clubs, bootcamps, and international workshops guided by global mentors. The fastest way to level up in real-world scenarios.",
    href: "/events",
    accent: "bg-[#2F4157]",
  });

  // Cap at 3
  return programs.slice(0, 3);
}

// ── ACHIEVEMENT GENERATOR ────────────────────────────────────────────────────
export type Achievement = { title: string; text: string };

export function generateAchievement(scores: Record<string, number>): Achievement {
  const highest = Object.entries(scores || {}).sort((a, b) => b[1] - a[1])[0]?.[0];

  switch (highest) {
    case "academic":
      return {
        title: "You're on the Path to Academic Excellence 🎓",
        text: "Your goals point toward global study opportunities. With the right preparation, scholarships and top universities are well within reach.",
      };
    case "career":
      return {
        title: "Your Global Career Starts Here 🌐",
        text: "You're driven by real opportunities — remote roles, international teams, and career growth. Stronger English communication is your biggest unlock.",
      };
    case "social":
      return {
        title: "You'll Connect the World Through English 🌏",
        text: "You thrive on interaction and cultural experiences. English will open doors to global friendships, collaboration, and unforgettable adventures.",
      };
    case "beginner":
      return {
        title: "Every Expert Was Once a Beginner ⚡",
        text: "You're ready to build something real. Small, consistent steps will rapidly grow your confidence and make English feel completely natural.",
      };
    default:
      return {
        title: "Your Journey is Just Getting Started 🌠",
        text: "Your motivation is your superpower. With the right ecosystem and even a small daily habit, you'll unlock global opportunities faster than you think.",
      };
  }
}