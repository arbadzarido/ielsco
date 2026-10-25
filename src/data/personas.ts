// src/data/personas.ts
export type PersonaId =
  | "yankee"
  | "british"
  | "aussie"
  | "german"
  | "samurai"
  | "kwave"
  | "maple"
  | "parisian";

export interface Trait {
  name: string;
  stars: number;
}

export interface Persona {
  id: PersonaId;
  title: string;
  hashtags: string[];
  description: string;
  traits: Trait[];
  classes: string[];
  image?: string; // optional image / animation
  theme: { bg: string; text: string; accent: string };
}

export const PERSONAS: Persona[] = [
  {
    id: "yankee",
    title: "THE YANKEE DREAMER 🇺🇸",
    hashtags: ["#AmericanDream", "#BigGoals", "#GlobalAchiever"],
    description:
      "Bold, ambitious, and always ready to chase the big opportunities the world offers. You love taking calculated risks, dreaming bigger than your comfort zone, and exploring new ways to grow your career or studies abroad. With the right English skills, nothing stops you from pitching ideas, networking globally, and creating your own success story.",
    traits: [
      { name: "Confidence", stars: 5 },
      { name: "Networking", stars: 4 },
      { name: "Risk-Taking", stars: 4 },
      { name: "Adaptability", stars: 4 },
      { name: "Communication", stars: 5 },
    ],
    classes: [
      "Business English for Global Pitches",
      "Interview & Networking Masterclass",
      "Advanced Speaking for Career Growth",
    ],
    image: "/images/contents/quiz/usa.png",
    theme: { bg: "bg-red-50", text: "text-red-900", accent: "text-red-600" },
  },
  {
    id: "british",
    title: "THE BRITISH STORYTELLER 🇬🇧",
    hashtags: ["#ElegantEnglish", "#CulturalThinker", "#StudyAbroadUK"],
    description:
      "Witty, expressive, and deeply thoughtful — you love meaningful conversations and the beauty of well-crafted ideas. The UK fits your intellectual curiosity and love for cultural depth. With strong English fluency, you’ll thrive in academic discussions, creative writing, and presenting your thoughts with style and precision.",
    traits: [
      { name: "Storytelling", stars: 5 },
      { name: "Critical Thinking", stars: 5 },
      { name: "Academic Writing", stars: 4 },
      { name: "Presentation", stars: 4 },
      { name: "Research Skills", stars: 3 },
    ],
    classes: [
      "IELTS Academic Writing Workshop",
      "Creative & Academic Storytelling",
      "Debating & Persuasive Speaking",
    ],
    image: "/images/contents/quiz/uk.png",
    theme: { bg: "bg-blue-50", text: "text-blue-900", accent: "text-blue-600" },
  },
  {
    id: "aussie",
    title: "THE AUSSIE EXPLORER 🇦🇺",
    hashtags: ["#AdventureSeeker", "#FriendlyExplorer", "#StudyInAustralia"],
    description:
      "Open-hearted, adventurous, and ready for new challenges — you thrive on exploring new places and making friends along the way. Your journey will be full of opportunities to connect with diverse people and cultures. English is your passport to enjoy every adventure while staying confident in studies and work abroad.",
    traits: [
      { name: "Curiosity", stars: 5 },
      { name: "Adaptability", stars: 5 },
      { name: "Social Skills", stars: 5 },
      { name: "Confidence", stars: 4 },
      { name: "Self-Motivation", stars: 4 },
    ],
    classes: [
      "Travel & Culture English",
      "Conversation Club",
      "Global Social Networking",
    ],
    image: "/images/contents/quiz/aussie.png",
    theme: { bg: "bg-amber-50", text: "text-amber-900", accent: "text-amber-600" },
  },
  {
    id: "german",
    title: "THE GERMAN STRATEGIST 🇩🇪",
    hashtags: ["#StructuredMind", "#EfficientLearner", "#GlobalPlanner"],
    description:
      "Precise, disciplined, and highly organized — you love making plans that lead to real results. Your approach to learning is methodical, and you thrive when your path is clear. With the right English strategies, you’ll excel in professional settings, academic excellence, and long-term career building.",
    traits: [
      { name: "Goal Setting", stars: 5 },
      { name: "Planning", stars: 5 },
      { name: "Persistence", stars: 4 },
      { name: "Analytical Thinking", stars: 4 },
      { name: "Leadership", stars: 3 },
    ],
    classes: [
      "IELTS Academic Mastery",
      "Business Strategy in English",
      "Professional Writing for Planners",
    ],
    image: "/images/contents/quiz/german.png",
    theme: { bg: "bg-gray-50", text: "text-gray-900", accent: "text-gray-600" },
  },
  {
    id: "samurai",
    title: "THE SAMURAI CONNECTOR 🇯🇵",
    hashtags: ["#RespectfulLeader", "#GlobalHarmony", "#TeamBuilder"],
    description:
      "Respectful, thoughtful, and deeply team-oriented — you build trust wherever you go. You value harmony and connection while still aiming for big dreams. With confident English communication, you’ll inspire collaboration and lead meaningful projects in international settings.",
    traits: [
      { name: "Empathy", stars: 5 },
      { name: "Teamwork", stars: 5 },
      { name: "Confidence", stars: 4 },
      { name: "Adaptability", stars: 4 },
      { name: "Networking", stars: 4 },
    ],
    classes: [
      "Leadership in English",
      "Global Community Building",
      "Effective Team Communication",
    ],
    image: "/images/contents/quiz/japan.png",
    theme: { bg: "bg-rose-50", text: "text-rose-900", accent: "text-rose-600" },
  },
  {
    id: "kwave",
    title: "THE K-WAVE CHALLENGER 🇰🇷",
    hashtags: ["#Trendsetter", "#AmbitiousSpirit", "#InnovationDriven"],
    description:
      "Hardworking, trend-savvy, and full of ambition — you love staying ahead of trends and setting new standards. With determination and modern English communication, you can innovate, lead, and connect with the fast-paced global industry.",
    traits: [
      { name: "Ambition", stars: 5 },
      { name: "Trend Awareness", stars: 5 },
      { name: "Adaptability", stars: 4 },
      { name: "Networking", stars: 4 },
      { name: "Confidence", stars: 4 },
    ],
    classes: [
      "Business English for Innovators",
      "Interview & Pitching Mastery",
      "Modern Communication Trends",
    ],
    image: "/images/contents/quiz/korea.png",
    theme: { bg: "bg-pink-50", text: "text-pink-900", accent: "text-pink-600" },
  },
  {
    id: "maple",
    title: "THE MAPLE DREAMER 🇨🇦",
    hashtags: ["#FriendlyDreamer", "#InclusiveMind", "#BalancedLife"],
    description:
      "Friendly, inclusive, and curious about the world — you love balance and meaningful relationships. You seek growth but also want a fulfilling, well-rounded life. Mastering English opens doors for you to connect with diverse cultures while building a sustainable global career or academic journey.",
    traits: [
      { name: "Friendliness", stars: 5 },
      { name: "Inclusivity", stars: 5 },
      { name: "Adaptability", stars: 4 },
      { name: "Consistency", stars: 4 },
      { name: "Networking", stars: 4 },
    ],
    classes: [
      "Global Conversation Skills",
      "Inclusive Communication Workshop",
      "Balanced Career English",
    ],
    image: "/images/contents/quiz/canada.png",
    theme: { bg: "bg-cyan-50", text: "text-cyan-900", accent: "text-cyan-600" },
  },
  {
    id: "parisian",
    title: "THE PARISIAN CREATOR 🇫🇷",
    hashtags: ["#ArtisticVoice", "#GlobalStoryteller", "#StylishEnglish"],
    description:
      "Passionate, artistic, and full of creative energy — you love expressing yourself with beauty and meaning. English is your canvas to share stories, art, and innovation with a global audience. Your vision and style can inspire communities and influence trends.",
    traits: [
      { name: "Creativity", stars: 5 },
      { name: "Storytelling", stars: 5 },
      { name: "Confidence", stars: 4 },
      { name: "Networking", stars: 4 },
      { name: "Digital Skills", stars: 4 },
    ],
    classes: [
      "Digital Storytelling",
      "Creative Writing for Global Audience",
      "Content Creator English",
    ],
    image: "/images/contents/quiz/france.png",
    theme: { bg: "bg-purple-50", text: "text-purple-900", accent: "text-purple-600" },
  },
];

// -------------------- Scenes (Questions) --------------------

export interface Scene {
  id: number;
  title: string;
  prompt: string;
  image?: string;
  options: { label: string; score: Partial<Record<PersonaId, number>> }[];
}

export const SCENES: Scene[] = [
  {
    id: 1,
    title: "The Dream ☀️",
    prompt:
      "You wake up to a new day feeling inspired — today you decide to take your English to the next level. What do you dream of the most?",
    options: [
      {
        label: "🎓 Studying at a top university abroad",
        score: { british: 2, german: 2, maple: 1 },
      },
      {
        label: "🌐 Landing a global remote job",
        score: { yankee: 2, kwave: 2, german: 1 },
      },
      {
        label: "🚀 Leveling up my career",
        score: { yankee: 2, german: 1, kwave: 1 },
      },
      {
        label: "🌏 Exploring cultures and meeting people worldwide",
        score: { aussie: 2, samurai: 1, parisian: 1 },
      },
    ],
  },
  {
    id: 2,
    title: "Destination Map",
    prompt: "You imagine yourself abroad — where does your heart take you? 🗺️",
    options: [
      { label: "🇬🇧 UK", score: { british: 3 } },
      { label: "🇺🇸 USA", score: { yankee: 3 } },
      { label: "🇦🇺 Australia", score: { aussie: 3 } },
      { label: "🇩🇪 Germany", score: { german: 3 } },
      { label: "🇯🇵 Japan", score: { samurai: 3 } },
      { label: "🇰🇷 Korea", score: { kwave: 3 } },
      { label: "🇨🇦 Canada", score: { maple: 3 } },
      { label: "🇫🇷 France", score: { parisian: 3 } },
    ],
  },
  {
    id: 3,
    title: "Your First Step",
    prompt:
      "🚶 You’re standing at the starting line of your journey. What’s the first thing you’d do?",
    options: [
      { label: "Join an online English community to meet people", score: { samurai: 2, aussie: 2, maple: 1 } },
      { label: "Take a placement test & set a clear goal", score: { german: 3, british: 1 } },
      { label: "Watch inspiring global success stories", score: { parisian: 2, yankee: 2, aussie: 1 } },
      { label: "Enroll in a structured course or mentorship", score: { british: 3, german: 1 } },
    ],
  },
  {
    id: 4,
    title: "Learning Style",
    prompt:
      "When learning something new, you prefer to...",
    options: [
      { label: "Study quietly and independently", score: { german: 3, british: 2, maple: 1 } },
      { label: "Work with a mentor or coach", score: { yankee: 3, samurai: 1, british: 1 } },
      { label: "Join group classes or clubs", score: { aussie: 3, samurai: 2, maple: 1 } },
      { label: "Dive in and learn by doing & experimenting", score: { kwave: 3, parisian: 2 } },
    ],
  },
  {
    id: 5,
    title: "Your Motivation 🔥",
    prompt:
      "You picture your future self fluent in English. What keeps you going?",
    options: [
      { label: "🎓 Scholarships & academic excellence", score: { british: 3, german: 2 } },
      { label: "💼 Building a global career & income", score: { yankee: 3, kwave: 2 } },
      { label: "🌏 Meeting inspiring people worldwide", score: { aussie: 2, samurai: 2, maple: 1 } },
      { label: "🌟 Personal growth & unlocking opportunities", score: { parisian: 2, maple: 2 } },
    ],
  },
  {
    id: 6,
    title: "Challenge Mode",
    prompt:
      "🧗 On this journey, you hit challenges. How do you usually respond?",
    options: [
      { label: "Plan carefully & stay organized", score: { german: 3, british: 1 } },
      { label: "Jump in & adapt as things change", score: { kwave: 2, yankee: 2, aussie: 1 } },
      { label: "Ask for advice & network with others", score: { samurai: 2, maple: 2, yankee: 1 } },
      { label: "Research deeply before acting", score: { british: 2, german: 2 } },
    ],
  },
  {
    id: 7,
    title: "Practice Habit",
    prompt:
      "🎧 When practicing English, you love...",
    options: [
      { label: "🎬 Watching movies & shows", score: { parisian: 2, kwave: 2, aussie: 1 } },
      { label: "✍️ Writing journals or essays", score: { british: 3, german: 1 } },
      { label: "🗣️ Speaking with people", score: { samurai: 3, maple: 2, aussie: 1 } },
      { label: "📚 Reading articles & books", score: { german: 2, british: 2 } },
    ],
  },
  {
    id: 8,
    title: "Consistency Hack",
    prompt:
      "To stay consistent with your learning, you like to...",
    options: [
      { label: "Track progress & milestones", score: { german: 3, british: 1 } },
      { label: "Be part of a supportive community", score: { samurai: 3, maple: 2, aussie: 1 } },
      { label: "Reward yourself for achievements", score: { kwave: 2, parisian: 1, yankee: 1 } },
      { label: "Set strict deadlines & challenges", score: { yankee: 2, german: 2 } },
    ],
  },
  {
    id: 9,
    title: "Your Hero Story 🌟",
    prompt:
      "Whose journey inspires you the most?",
    options: [
      { label: "🎓 Someone who got a scholarship abroad", score: { british: 3, german: 2 } },
      { label: "🌐 Someone who built a remote global career", score: { yankee: 3, kwave: 2 } },
      { label: "🚀 Someone who climbed the corporate ladder globally", score: { german: 2, yankee: 2 } },
      { label: "🌏 Someone who travels & connects across cultures", score: { aussie: 3, samurai: 2, parisian: 1 } },
    ],
  },
  {
    id: 10,
    title: "Grand Finale",
    prompt:
      "🎉 You finally reach your dream! How do you feel?",
    options: [
      { label: "Proud and academically accomplished", score: { british: 3, german: 2 } },
      { label: "Free and globally connected", score: { aussie: 2, samurai: 2, maple: 2 } },
      { label: "Confident and career-ready", score: { yankee: 3, kwave: 2 } },
      { label: "Alive and culturally enriched", score: { parisian: 3, aussie: 2 } },
    ],
  },
];


// Utility: get persona by id
export const getPersona = (id: PersonaId) => PERSONAS.find(p => p.id === id)!;
