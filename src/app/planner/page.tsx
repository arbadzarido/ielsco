"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  Sparkles, 
  Calendar as CalendarIcon, 
  Clock, 
  Utensils, 
  ArrowRight, 
  ChevronLeft, 
  Zap,
  Camera,
  MapPin,
  Ticket,
  Navigation
} from "lucide-react";
import { cn } from "@/lib/utils";

// CSS Color System
const colors = {
  primary: "#ec4899",      // Vibrant hot pink
  primaryLight: "#f472b6", // Lighter pink
  primaryDark: "#be123c",  // Darker rose
  accent: "#fb7185",       // Coral pink
  softBg: "#fce7f3",       // Very light pink
  softBg2: "#fbf1f9",      // Ultra light lavender pink
  textDark: "#831843",     // Deep rose text
  textLight: "#be123c",    // Medium rose text
  white: "#ffffff",
};

const ACTIVITY_OPTIONS = [
  { id: "museum", label: "Museum MACAN Date 🎨", desc: "Appreciating modern art, deep talks, and taking aesthetic pics of you.", loc: "Kebon Jeruk", mapQuery: "Museum+MACAN+Jakarta" },
  { id: "aquarium", label: "Jakarta Aquarium 🐠", desc: "Walking through beautiful underwater tunnels like a movie scene.", loc: "Neo Soho", mapQuery: "Jakarta+Aquarium+Safari" },
  { id: "pik", label: "Sunset Walk by the Sea 🌅", desc: "Enjoying the ocean breeze, golden hour, and sweet treats.", loc: "Cove at Batavia PIK", mapQuery: "Cove+at+Batavia+PIK" },
  { id: "arcade", label: "Competitive Arcade Fun 👾", desc: "Claw machines, photobooths, and endless laughs together.", loc: "Timezone Senayan Park", mapQuery: "Timezone+Senayan+Park" },
  { id: "library", label: "Taman Literasi Chill 📚", desc: "Cozy reading, relaxed vibes, and coffee in the park.", loc: "Blok M", mapQuery: "Taman+Literasi+Martha+Tiahahu" },
  { id: "citylights", label: "City Lights & Skyline 🌃", desc: "Looking at Jakarta's gorgeous skyline from above.", loc: "SKYE / Bundaran HI", mapQuery: "SKYE+Bar+Jakarta" }
];

const FOOD_OPTIONS = [
  { id: "sushi", label: "Sushi Hiro 🍣", desc: "A sophisticated dining experience to match your elegant taste.", loc: "Senopati", mapQuery: "Sushi+Hiro+Senopati" },
  { id: "italian", label: "Osteria Gia 🍝", desc: "Fine pasta and deep conversations to unwind that genius brain.", loc: "SCBD", mapQuery: "Osteria+Gia+SCBD" },
  { id: "coffee", label: "Aesthetic Cafe & Dessert ☕🍰", desc: "A sweet, relaxed cafe session celebrating your achievements.", loc: "Menteng", mapQuery: "Menteng+Cafe+Jakarta" },
  { id: "ramen", label: "Echigoya Ramen 🍜", desc: "Warm, rich comforting broth perfect for a cozy night out.", loc: "Little Tokyo Blok M", mapQuery: "Echigoya+Ramen+Blok+M" },
  { id: "pizza", label: "Artisanal Pizza Night 🍕", desc: "Relaxed, casual, and endlessly fun pizza date with zero stress.", loc: "Kemang", mapQuery: "Pizza+Place+Kemang" },
  { id: "burger", label: "Premium Burgers & Shakes 🍔", desc: "Fun, classic, and completely indulgent comfort food.", loc: "PIK", mapQuery: "Ask+For+Patty+PIK" }
];

const TIME_OPTIONS = [
  { id: "morning", label: "Morning Sunshine ☀️", desc: "Fresh artisanal coffee & bright morning walks" },
  { id: "afternoon", label: "Afternoon Stroll 🌤️", desc: "A well-deserved mid-day study/work break together" },
  { id: "evening", label: "Golden Hour & Dinner 🌙", desc: "Enjoying the sunset fading into an elegant dinner" },
  { id: "night", label: "Late Night & City Lights ✨", desc: "Quiet night enjoying Jakarta's beautiful skyline" }
];

const APPRECIATION_MESSAGES = [
  { title: "Your Brain 🧠", text: "Honestly the smartest person I know, Ginnie. The way you solve problems is honestly insane. I could listen to you explain literally anything for hours." },
  { title: "Your Ambition 🎯", text: "The way you chase your dreams with zero hesitation? Absolutely inspiring. I'm obsessed with your work ethic, it's unmatched." },
  { title: "Your Laugh ✨", text: "That laugh of yours genuinely lights up my entire day. I'd do anything just to hear it one more time." },
  { title: "Your Vibe 🌸", text: "You make everything better just by being in the room, Ginnie. Seriously. The energy you bring is magnetic and absolutely addictive." },
  { title: "Your Heart 💖", text: "So incredibly caring and thoughtful. You remember little things about people that matter. You're the kind of person the world needs." },
];

const ROAST_MESSAGES = [
  "You work SO hard I forget you're actually human sometimes. Get some rest, queen 👑",
  "The way you organize your life puts mine to shame. Can you adopt me? I need this energy 💅",
  "Lowkey your biggest fan. OK maybe not lowkey, completely obvious actually.",
  "You're so brilliant it's actually unfair. Some of us are just trying to keep up 😅",
  "The dedication you have? Unhinged in the best way possible. I'm living for it.",
];

const DAYS_IN_JUNE = Array.from({ length: 30 }, (_, i) => i + 1);
const JUNE_1ST_WEEKDAY_INDEX = 1; // June 1st, 2026 is Monday

// TypeScript Interface Props for Calendar
interface CalendarGridProps {
  selectedDay: number | null;
  setSelectedDay: (day: number) => void;
}

// Inline grid style fallback to absolute override layout issue
const grid7ColumnsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
};

const CalendarGrid = ({ selectedDay, setSelectedDay }: CalendarGridProps) => {
  const emptySlots = Array.from({ length: JUNE_1ST_WEEKDAY_INDEX }).map((_, i) => i);
  
  return (
    <div className="bg-white rounded-2xl p-5 border border-pink-100 shadow-sm w-full max-w-sm mx-auto">
      <div className="text-center font-bold text-rose-950 mb-4 text-base tracking-wide">
        June 2026
      </div>
      
      {/* Calendar header with safe layout styling */}
      <div style={grid7ColumnsStyle} className="gap-2 text-center text-xs font-bold text-rose-800/70 mb-3">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>
      
      {/* Calendar days with safe layout styling */}
      <div style={grid7ColumnsStyle} className="gap-2">
        {emptySlots.map((_, idx) => (
          <div key={`empty-${idx}`} className="h-10" />
        ))}
        
        {DAYS_IN_JUNE.map((day) => (
          <motion.button
            key={day}
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedDay(day)}
            className={cn(
              "h-10 w-full rounded-lg font-semibold text-sm transition-all relative flex items-center justify-center",
              selectedDay === day 
                ? "bg-pink-500 text-white shadow-lg shadow-pink-300" 
                : "text-pink-700 hover:bg-pink-100 border border-pink-50"
            )}
          >
            {day}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// Reusable Aesthetic Placeholder Photo Component
interface PolaroidProps {
  src: string;
  caption: string;
  rotate?: string;
}

const PolaroidPhoto = ({ src, caption, rotate = "rotate-1" }: PolaroidProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("bg-white p-3 pb-5 shadow-xl rounded-sm border border-gray-100 max-w-[200px] mx-auto inline-block text-center transform transition-transform hover:rotate-0 hover:scale-105 duration-300", rotate)}
    >
      <div className="relative w-full aspect-square bg-pink-50 rounded-sm overflow-hidden flex flex-col items-center justify-center border border-pink-100/50">
        {src.startsWith("/") ? (
          <img src={src} alt="Ginnie Aesthetic" className="object-cover w-full h-full" />
        ) : (
          <div className="p-4 text-center flex flex-col items-center text-pink-400">
            <Camera size={24} className="mb-1" />
            <span className="text-[10px] font-medium leading-tight">Ginnie's Pretty Photo Placeholder</span>
          </div>
        )}
      </div>
      <p className="text-[11px] font-serif mt-3 text-rose-900 tracking-wide font-bold italic">{caption}</p>
    </motion.div>
  );
};

export default function DatePlanner() {
  const [step, setStep] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [appreciationIndex, setAppreciationIndex] = useState<number>(0);
  const [roastIndex, setRoastIndex] = useState<number>(0);
  const [noBtnPos, setNoBtnPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [noCount, setNoCount] = useState<number>(0);

  const handleNoHoverOrClick = () => {
    const randomX = Math.floor(Math.random() * 200) - 100;
    const randomY = Math.floor(Math.random() * 200) - 100;
    setNoBtnPos({ x: randomX, y: randomY });
    setNoCount((prev) => prev + 1);
  };

  const getNoButtonText = () => {
    const messages = [
      "No 🥺",
      "Are you sure? 💔",
      "Error: Option invalid ❌",
      "Ginnie... click YES 🤨",
      "Come onnnnn 😭",
      "I'm gonna sit here forever",
    ];
    return messages[Math.min(noCount, messages.length - 1)];
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans overflow-x-hidden relative select-none"
      style={{ background: `linear-gradient(135deg, ${colors.softBg2} 0%, ${colors.softBg} 50%, #fef2f7 100%)` }}
    >
      {/* Decorative Floating Hearts & Stars Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ y: [0, -15, 0] }} 
          transition={{ repeat: Infinity, duration: 4 }}
          className="absolute top-10 left-8 text-pink-300/20 blur-sm"
        >
          <Heart size={80} fill="currentColor" />
        </motion.div>
        <motion.div 
          animate={{ y: [0, 15, 0] }} 
          transition={{ repeat: Infinity, duration: 5 }}
          className="absolute bottom-20 right-12 text-rose-300/20 blur-sm"
        >
          <Sparkles size={100} />
        </motion.div>
      </div>

      {/* Main Responsive Wrapper */}
      <div className="w-full max-w-2xl relative z-10">
        <AnimatePresence mode="wait">
          
          {/* STEP 0: Special Invitation Screen */}
          {step === 0 && (
            <motion.div
              key="step0"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-6"
            >
              <div 
                className="rounded-3xl shadow-2xl p-6 md:p-10 border-2"
                style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
              >
                {/* Photo Placeholders Section at Top */}
                <div className="flex justify-center gap-4 mb-6 flex-wrap">
                  {/* Ganti URL string kosong "" di bawah ini dengan link foto asli Ginnie besok */}
                  <PolaroidPhoto src="/images/people/ginnie/ginnie1.jpeg" caption="Most Gorgeous 🌸" rotate="-rotate-3" />
                  <PolaroidPhoto src="/images/people/ginnie/ginnie2.jpeg" caption="Unmatched Genius ✨" rotate="rotate-3" />
                </div>

                <div className="text-center mb-4">
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1] }} 
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="inline-block"
                  >
                    <Heart size={56} fill={colors.primary} color={colors.primary} />
                  </motion.div>
                </div>

                <h1 
                  className="text-3xl md:text-5xl font-black text-center mb-2 tracking-tight"
                  style={{ color: colors.textDark }}
                >
                  Hey Ginnie, I Have a Question...
                </h1>
                <p 
                  className="text-center text-base md:text-lg mb-6"
                  style={{ color: colors.textLight }}
                >
                  (And I really, really hope your answer is yes)
                </p>

                {/* Appreciation Box */}
                <div className="mb-6 bg-gradient-to-br from-pink-50/80 to-rose-50/80 rounded-2xl p-5 border border-pink-100 min-h-[160px] flex flex-col justify-between">
                  <motion.div
                    key={appreciationIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-2"
                  >
                    <h3 className="text-xl font-black" style={{ color: colors.primary }}>
                      {APPRECIATION_MESSAGES[appreciationIndex].title}
                    </h3>
                    <p className="text-sm md:text-base leading-relaxed italic" style={{ color: colors.textDark }}>
                      {APPRECIATION_MESSAGES[appreciationIndex].text}
                    </p>
                  </motion.div>
                  
                  <div className="flex gap-2 mt-4 justify-center">
                    {APPRECIATION_MESSAGES.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAppreciationIndex(idx)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          appreciationIndex === idx ? "w-8 bg-pink-600" : "w-2 bg-pink-300"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-center font-bold text-base" style={{ color: colors.textDark }}>
                    Will you go on a special date with me? 💖
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 relative justify-center items-center min-h-[60px]">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStep(1)}
                      className="w-full sm:flex-1 py-4 px-6 rounded-full font-black text-white text-lg transition-all shadow-lg"
                      style={{ 
                        backgroundColor: colors.primary,
                        boxShadow: `0 10px 25px ${colors.primary}40`
                      }}
                    >
                      YES! Let's Go ✨
                    </motion.button>

                    <motion.button
                      type="button"
                      animate={{ x: noBtnPos.x, y: noBtnPos.y }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      onMouseEnter={handleNoHoverOrClick}
                      onClick={handleNoHoverOrClick}
                      className="w-auto px-6 py-3 rounded-full font-bold text-sm border-2 bg-white transition-all whitespace-nowrap"
                      style={{ 
                        borderColor: colors.primaryLight,
                        color: colors.textLight
                      }}
                    >
                      {getNoButtonText()}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 1: Perfect Date Scheduler Layout */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-2"
              style={{ borderColor: colors.primaryLight }}
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CalendarIcon size={26} color={colors.primary} />
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: colors.textDark }}>
                    When Are You Free?
                  </h2>
                </div>
                <p style={{ color: colors.textLight }} className="font-semibold text-sm">
                  Let's pick an open slot in your brilliant, busy schedule 🗓️
                </p>
              </div>

              {/* Fixed Clean Grid Grid Calendar */}
              <div className="mb-6">
                <CalendarGrid selectedDay={selectedDay} setSelectedDay={setSelectedDay} />
              </div>

              <div className="space-y-3 mb-6">
                <p className="font-bold text-xs uppercase tracking-wider" style={{ color: colors.textDark }}>
                  Pick Your Vibe & Time 💫
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TIME_OPTIONS.map((time) => (
                    <button
                      key={time.id}
                      type="button"
                      onClick={() => setSelectedTime(time.label)}
                      className={cn(
                        "text-left p-4 rounded-2xl border-2 transition-all block w-full",
                        selectedTime === time.label
                          ? "border-pink-500 bg-pink-50"
                          : "border-pink-100 bg-white hover:border-pink-300"
                      )}
                    >
                      <h4 className="font-black text-sm" style={{ color: colors.textDark }}>
                        {time.label}
                      </h4>
                      <p className="text-xs mt-1" style={{ color: colors.textLight }}>
                        {time.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex items-center gap-2 font-bold transition-all text-sm hover:scale-105"
                  style={{ color: colors.textLight }}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!selectedDay || !selectedTime}
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-black text-white transition-all text-sm disabled:opacity-50"
                  style={{ 
                    backgroundColor: colors.primary,
                    cursor: !selectedDay || !selectedTime ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Activity Selection (NEW) */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-2"
              style={{ borderColor: colors.primaryLight }}
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Ticket size={26} color={colors.primary} />
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: colors.textDark }}>
                    What Are We Doing?
                  </h2>
                </div>
                <p style={{ color: colors.textLight }} className="font-semibold text-sm">
                  Pick our main adventure around Jakarta! 🚗
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[360px] overflow-y-auto pr-1">
                {ACTIVITY_OPTIONS.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    onClick={() => setSelectedActivity(activity)}
                    className={cn(
                      "text-left p-4 rounded-2xl border-2 transition-all block w-full relative",
                      selectedActivity?.id === activity.id
                        ? "border-pink-500 bg-pink-50"
                        : "border-pink-100 bg-white hover:border-pink-300"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-black text-sm pr-4" style={{ color: colors.textDark }}>
                        {activity.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-pink-600 mb-2">
                      <MapPin size={12} /> {activity.loc}
                    </div>
                    <p className="text-xs" style={{ color: colors.textLight }}>
                      {activity.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 font-bold transition-all text-sm hover:scale-105"
                  style={{ color: colors.textLight }}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!selectedActivity}
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-black text-white text-sm transition-all disabled:opacity-50"
                  style={{ 
                    backgroundColor: colors.primary,
                    cursor: !selectedActivity ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Food & Cuisine Selection */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-2"
              style={{ borderColor: colors.primaryLight }}
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Utensils size={26} color={colors.primary} />
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: colors.textDark }}>
                    What Are We Eating?
                  </h2>
                </div>
                <p style={{ color: colors.textLight }} className="font-semibold text-sm">
                  Your brilliant brain deserves absolute premium fuel, Ginnie 🍽️
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-h-[360px] overflow-y-auto pr-1">
                {FOOD_OPTIONS.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => setSelectedFood(food)}
                    className={cn(
                      "text-left p-4 rounded-2xl border-2 transition-all block w-full",
                      selectedFood?.id === food.id
                        ? "border-pink-500 bg-pink-50"
                        : "border-pink-100 bg-white hover:border-pink-300"
                    )}
                  >
                    <h3 className="font-black text-sm" style={{ color: colors.textDark }}>
                      {food.label}
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-pink-600 mb-2 mt-1">
                      <MapPin size={12} /> {food.loc}
                    </div>
                    <p className="text-xs" style={{ color: colors.textLight }}>
                      {food.desc}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 font-bold transition-all text-sm hover:scale-105"
                  style={{ color: colors.textLight }}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!selectedFood}
                  onClick={() => setStep(4)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-black text-white text-sm transition-all disabled:opacity-50"
                  style={{ 
                    backgroundColor: colors.primary,
                    cursor: !selectedFood ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Cute Roasting Carousel */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 border-2"
              style={{ borderColor: colors.primaryLight }}
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap size={26} color={colors.primary} />
                  <h2 className="text-2xl md:text-4xl font-black tracking-tight" style={{ color: colors.textDark }}>
                    Real Talk Though...
                  </h2>
                </div>
              </div>
{/* TEMPAT FOTO 3 (Dipasang di atas boks roasting biar makin gemes) */}
              <div className="text-center mb-4">
                <PolaroidPhoto src="/images/people/ginnie/ginnie3.jpeg" caption="Always Productive 🎯" rotate="-rotate-1" />
              </div>
              <motion.div
                key={roastIndex}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border-2 border-yellow-200 min-h-[120px] flex flex-col justify-center text-center"
              >
                <p className="text-lg font-black italic" style={{ color: colors.textDark }}>
                  "{ROAST_MESSAGES[roastIndex]}"
                </p>
              </motion.div>

              <div className="flex gap-2 justify-center mb-6">
                {ROAST_MESSAGES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRoastIndex(idx)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      roastIndex === idx ? "w-8" : "w-2"
                    )}
                    style={{
                      backgroundColor: roastIndex === idx ? colors.primary : colors.primaryLight
                    }}
                  />
                ))}
              </div>

              <div className="text-center mb-6 p-4 rounded-xl" style={{ backgroundColor: colors.softBg }}>
                <p style={{ color: colors.textDark }} className="text-xs md:text-sm font-semibold">
                  You're gonna be absolutely amazing on this date. No pressure though, you always are Ginnie 💕
                </p>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 font-bold transition-all text-sm hover:scale-105"
                  style={{ color: colors.textLight }}
                >
                  <ChevronLeft size={18} /> Back
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(5)}
                  className="flex items-center gap-2 px-6 py-3 rounded-full font-black text-white text-sm transition-all"
                  style={{ backgroundColor: colors.primary }}
                >
                  I'm Ready 🚀 <ArrowRight size={16} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: Success Ticket & Final Photo Confirmation */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 border-2 max-w-lg mx-auto"
              style={{ borderColor: colors.primaryLight }}
            >
              <div className="text-center mb-6 space-y-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex justify-center mb-2"
                >
                  <Heart size={40} fill={colors.primary} color={colors.primary} />
                </motion.div>
                
                <h2 className="text-3xl font-black tracking-tight" style={{ color: colors.textDark }}>
                  It's Official! 🎉
                </h2>
                <p style={{ color: colors.textLight }} className="font-bold text-sm">
                  I can't wait to see you, Ginnie!
                </p>
              </div>

              {/* Ticket details */}
              <div 
                className="rounded-2xl p-5 space-y-4 mb-6 relative overflow-hidden"
                style={{ backgroundColor: colors.softBg, border: `2px dashed ${colors.primary}` }}
              >
                {/* Decorative cutouts */}
                <div className="absolute -left-3 top-1/2 w-6 h-6 bg-white rounded-full transform -translate-y-1/2 border-r-2 border-pink-500" />
                <div className="absolute -right-3 top-1/2 w-6 h-6 bg-white rounded-full transform -translate-y-1/2 border-l-2 border-pink-500" />

                <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: colors.primaryLight }}>
                  <div className="p-2 rounded-lg text-white" style={{ backgroundColor: colors.primary }}>
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Date & Time</p>
                    <p className="text-base font-black" style={{ color: colors.textDark }}>June {selectedDay}, 2026</p>
                    <p className="text-xs font-bold" style={{ color: colors.primary }}>{selectedTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pb-3 border-b" style={{ borderColor: colors.primaryLight }}>
                  <div className="p-2 rounded-lg text-white mt-1" style={{ backgroundColor: colors.accent }}>
                    <Ticket size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Main Activity</p>
                    <p className="text-sm font-black leading-tight" style={{ color: colors.textDark }}>{selectedActivity?.label}</p>
                    <a 
                      href={`https://maps.google.com/?q=${selectedActivity?.mapQuery}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold mt-1 bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full hover:bg-pink-200 transition-colors"
                    >
                      <Navigation size={10} /> View on Maps
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg text-white mt-1" style={{ backgroundColor: colors.primary }}>
                    <Utensils size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textLight }}>Menu Plan</p>
                    <p className="text-sm font-black leading-tight" style={{ color: colors.textDark }}>{selectedFood?.label}</p>
                    <a 
                      href={`https://maps.google.com/?q=${selectedFood?.mapQuery}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold mt-1 bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full hover:bg-pink-200 transition-colors"
                    >
                      <Navigation size={10} /> View on Maps
                    </a>
                  </div>
                </div>
              </div>

              {/* Arba Message Callout */}
              
              <div className="relative z-100 text-center mb-6 !bg-pink-600 text-white p-3 rounded-xl shadow-lg transform -rotate-1 hover:rotate-0 transition-transform">
                <p className="!font-black text-sm tracking-wide">
                  📸 SCREENSHOT THIS AND SEND TO ARBA :)
                </p>
              </div>

              {/* Final aesthetic placeholder picture */}
           {/* TEMPAT FOTO 4 & 5 (Galeri Penutup di Akhir Tiket) */}
              <div className="flex justify-center gap-4 mt-6 flex-wrap">
                <PolaroidPhoto src="/images/people/ginnie/ginnie4.jpeg" caption="Can't Wait! 🥰" rotate="-rotate-3" />
                <PolaroidPhoto src="/images/people/ginnie/ginnie5.jpeg" caption="See You Soon 💖" rotate="rotate-3" />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center space-y-4"
              >
                <p className="font-black text-sm md:text-base italic" style={{ color: colors.textDark }}>
                  "Ginnie, you deserve the absolute world. Leave all the detailed planning to me."
                </p>

                <div className="pt-2 flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(0);
                      setSelectedDay(null);
                      setSelectedTime(null);
                      setSelectedActivity(null);
                      setSelectedFood(null);
                      setAppreciationIndex(0);
                      setRoastIndex(0);
                      setNoCount(0);
                    }}
                    className="px-5 py-2 rounded-full font-bold text-xs text-white transition-all bg-black hover:bg-pink-900"
                  >
                    Reset Plan
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}