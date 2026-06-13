"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Download, RotateCcw, Sun, Moon, Search } from "lucide-react";
import LandingPage from "@/components/planner/sections/LandingPage/page";
import MindsetSection from "@/components/planner/sections/MindsetSection/page";
import KnowYourselfSection from "@/components/planner/sections/KnowYourselfSection/page";
import IelsExperienceSection from "@/components/planner/sections/IelsExperienceSection/page";
import PortfolioMasterySection from "@/components/planner/sections/PortfolioMasterySection/page";
import LawsonResearchSection from "@/components/planner/sections/LawsonResearchSection/page";
import MockInterviewSection from "@/components/planner/sections/MockInterviewSection/page";
import InterviewDayChecklist from "@/components/planner/sections/InterviewDayChecklist/page";
import WorldOfArbaSection from "@/components/planner/sections/WorldofArbaSection/page";
import LetterFromArba from "@/components/planner/sections/LetterFromArba/page";

import ProgressBar from "@/components/planner/ui/ProgressBar/page";
import ConfettiCelebration from "@/components/planner/ui/ConfettiCelebration/page";
import SearchOverlay from "@/components/planner/ui/SearchOverlay/page";

const colors = {
  primary: "#ec4899",
  primaryLight: "#f472b6",
  accent: "#fb7185",
  softBg: "#fce7f3",
  textDark: "#831843",
  textLight: "#be123c",
  white: "#ffffff",
};

interface SectionConfig {
  id: string;
  title: string;
  component: React.ComponentType<{ completed: number; setCompleted: (id: string, val: boolean) => void }>;
}

const SECTIONS: SectionConfig[] = [
  { id: "landing", title: "Welcome", component: LandingPage },
  { id: "mindset", title: "Mindset", component: MindsetSection },
  { id: "know-yourself", title: "Know Yourself", component: KnowYourselfSection },
  { id: "iels", title: "IELS Experience", component: IelsExperienceSection },
  { id: "portfolio", title: "Portfolio Mastery", component: PortfolioMasterySection },
  { id: "lawson-research", title: "Lawson Research", component: LawsonResearchSection },
  { id: "mock-interview", title: "Mock Interview", component: MockInterviewSection },
  { id: "checklist", title: "Interview Checklist", component: InterviewDayChecklist },
  { id: "woa", title: "World of Arba", component: WorldOfArbaSection },
  { id: "letter", title: "Letter from Arba", component: LetterFromArba },
];

export default function Home() {
  const [currentSection, setCurrentSection] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});
  const [showSearch, setShowSearch] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lawson-brief-progress");
    if (saved) {
      setCompletedSections(JSON.parse(saved));
    }
  }, []);

  // Update progress
  useEffect(() => {
    const completed = Object.values(completedSections).filter(Boolean).length;
    const newProgress = Math.round((completed / SECTIONS.length) * 100);
    setProgress(newProgress);

    if (newProgress === 100 && completed > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    localStorage.setItem("lawson-brief-progress", JSON.stringify(completedSections));
  }, [completedSections]);

  const handleSetCompleted = (id: string, value: boolean) => {
    setCompletedSections((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const CurrentComponent = SECTIONS[currentSection].component;

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    if (confirm("Reset all progress?")) {
      setCompletedSections({});
      setCurrentSection(0);
      localStorage.removeItem("lawson-brief-progress");
    }
  };

  return (
    <div style={{ backgroundColor: darkMode ? "#1a1a1a" : colors.softBg }}>
      {showConfetti && <ConfettiCelebration />}

      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b"
        style={{
          borderColor: colors.primaryLight,
          backgroundColor: darkMode ? "rgba(26,26,26,0.95)" : `rgba(255,255,255,0.95)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2 cursor-pointer">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: colors.primary }}
            >
              💼
            </div>
            <div>
              <h1
                className="text-sm md:text-base font-black"
                style={{ color: colors.textDark }}
              >
                Interview Brief
              </h1>
              <p className="text-[10px]" style={{ color: colors.textLight }}>
                For Reghien ❤️
              </p>
            </div>
          </motion.div>

          <div className="hidden md:flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: colors.softBg,
                color: colors.textDark,
              }}
            >
              <Search size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: colors.softBg,
                color: colors.textDark,
              }}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrint}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: colors.softBg,
                color: colors.textDark,
              }}
            >
              <Download size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReset}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: colors.softBg,
                color: colors.textDark,
              }}
            >
              <RotateCcw size={20} />
            </motion.button>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg"
            style={{
              backgroundColor: colors.softBg,
              color: colors.textDark,
            }}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Progress Bar */}
        <ProgressBar progress={progress} />
      </motion.header>

      {/* Main Content */}
      <div className="flex pt-24 min-h-screen">
        {/* Sidebar Navigation */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed md:relative left-0 top-0 h-screen w-64 md:w-72 pt-24 md:pt-0 overflow-y-auto md:flex flex-col z-30 border-r"
              style={{
                borderColor: colors.primaryLight,
                backgroundColor: darkMode ? "#2a2a2a" : colors.white,
              }}
            >
              <div className="p-6 space-y-2 flex-1">
                {SECTIONS.map((section, idx) => (
                  <motion.button
                    key={section.id}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      setCurrentSection(idx);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between group ${
                      currentSection === idx
                        ? "font-bold shadow-lg"
                        : "font-semibold hover:bg-pink-50 dark:hover:bg-gray-700"
                    }`}
                    style={{
                      backgroundColor:
                        currentSection === idx
                          ? colors.softBg
                          : "transparent",
                      color: currentSection === idx ? colors.textDark : colors.textLight,
                    }}
                  >
                    <span>{section.title}</span>
                    {completedSections[section.id] && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-green-500 font-bold"
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.button>
                ))}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-hidden">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 md:p-8 max-w-6xl mx-auto"
          >
            <CurrentComponent
              completed={progress}
              setCompleted={handleSetCompleted}
            />
          </motion.div>
        </main>
      </div>
     <motion.div className="fixed bottom-4 inset-x-4 md:inset-auto md:bottom-8 md:right-8 flex justify-between md:justify-end gap-3 z-20">
  {/* Prev Button */}
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
    disabled={currentSection === 0}
    className="w-12 h-12 md:w-auto md:px-6 md:py-2 rounded-full font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center shadow-lg"
    style={{ backgroundColor: colors.primary }}
  >
    {/* Mobile: Cuma Panah | Desktop: Panah + Prev */}
    <span className="md:hidden">←</span>
    <span className="hidden md:inline">← Prev</span>
  </motion.button>

  {/* Next Button */}
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setCurrentSection((prev) => Math.min(SECTIONS.length - 1, prev + 1))}
    disabled={currentSection === SECTIONS.length - 1}
    className="w-12 h-12 md:w-auto md:px-6 md:py-2 rounded-full font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center shadow-lg"
    style={{ backgroundColor: colors.primary }}
  >
    {/* Mobile: Cuma Panah | Desktop: Next + Panah */}
    <span className="md:hidden">→</span>
    <span className="hidden md:inline">Next →</span>
  </motion.button>
</motion.div>
      {/* Search Overlay */}
      {showSearch && (
        <SearchOverlay
          sections={SECTIONS}
          onSelect={(idx) => {
            setCurrentSection(idx);
            setShowSearch(false);
            setSidebarOpen(false);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}