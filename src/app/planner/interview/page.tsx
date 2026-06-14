"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Download, RotateCcw } from "lucide-react";
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
  const [completedSections, setCompletedSections] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

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

    const currentIndex = SECTIONS.findIndex((section) => section.id === id);

    if (currentIndex !== -1 && currentIndex < SECTIONS.length - 1) {
      setTimeout(() => {
        setCurrentSection(currentIndex + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 400); 
    } else if (currentIndex === SECTIONS.length - 1) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const CurrentComponent = SECTIONS[currentSection].component;

  const handlePrint = () => {
    window.print();
  };

  const confirmReset = () => {
    setCompletedSections({});
    setCurrentSection(0);
    localStorage.removeItem("lawson-brief-progress");
    setShowResetModal(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ backgroundColor: colors.softBg }}>
      {showConfetti && <ConfettiCelebration />}

      {/* Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b"
        style={{
          borderColor: colors.primaryLight,
          backgroundColor: `rgba(255,255,255,0.95)`,
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

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm"
                style={{
                  backgroundColor: colors.white,
                  color: colors.textDark,
                  border: `1px solid ${colors.primaryLight}50`,
                }}
              >
                <Download size={18} />
                <span className="text-sm">Download</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-colors shadow-sm"
                style={{
                  backgroundColor: colors.white,
                  color: colors.textDark,
                  border: `1px solid ${colors.primaryLight}50`,
                }}
              >
                <RotateCcw size={18} />
                <span className="text-sm">Restart</span>
              </motion.button>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{
                backgroundColor: colors.softBg,
                color: colors.textDark,
              }}
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <ProgressBar progress={progress} />
      </motion.header>

      {/* Main Content */}
      <div className="flex pt-24 min-h-screen relative">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed top-0 left-0 h-screen pt-[104px] w-64 md:w-72 flex flex-col z-30 border-r transition-transform duration-300 ease-in-out shadow-2xl md:shadow-xl ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{
            borderColor: colors.primaryLight,
            backgroundColor: colors.white,
          }}
        >
          {/* Custom style untuk hide scrollbar pada list menu */}
          <style jsx>{`
            .scrollable-nav::-webkit-scrollbar {
              display: none;
            }
            .scrollable-nav {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>

          {/* Nav List - Area ini yang bisa discroll (overflow-y-auto) */}
          <div className="scrollable-nav p-6 space-y-3 flex-1 overflow-y-auto pb-6">
            {SECTIONS.map((section, idx) => {
              const isCompleted = completedSections[section.id];
              const isActive = currentSection === idx;

              return (
                <motion.button
                  key={section.id}
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setCurrentSection(idx);
                    setSidebarOpen(false); 
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                    isActive
                      ? "font-bold shadow-md"
                      : "font-semibold hover:bg-pink-50"
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? colors.softBg
                      : isCompleted
                      ? `${colors.softBg}60`
                      : "transparent",
                    color: isActive ? colors.textDark : colors.textLight,
                    border: isCompleted && !isActive 
                      ? `1px solid ${colors.primaryLight}50` 
                      : "1px solid transparent",
                  }}
                >
                  <span className="flex-1 text-sm md:text-base">{section.title}</span>
                  
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm shrink-0 ml-2"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <span className="text-white text-xs font-bold">✓</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Footer Sidebar - Stay at bottom (shrink-0) */}
          <div className="md:hidden p-6 border-t shrink-0" style={{ borderColor: colors.primaryLight, backgroundColor: colors.white }}>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowResetModal(true); setSidebarOpen(false); }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold border-2"
                style={{ borderColor: colors.primaryLight, color: colors.textDark }}
              >
                <RotateCcw size={18} /> Restart
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full overflow-hidden">
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8"
          >
            <CurrentComponent
              completed={progress}
              setCompleted={handleSetCompleted}
            />
          </motion.div>
        </main>
      </div>

      {/* Prev & Next Floating Buttons */}
      <motion.div className="fixed bottom-4 inset-x-4 md:inset-auto md:bottom-8 md:right-8 flex justify-between md:justify-end gap-3 z-20">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentSection((prev) => Math.max(0, prev - 1))}
          disabled={currentSection === 0}
          className="w-12 h-12 md:w-auto md:px-6 md:py-2 rounded-full font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center shadow-lg"
          style={{ backgroundColor: colors.primary }}
        >
          <span className="md:hidden">←</span>
          <span className="hidden md:inline">← Prev</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setCurrentSection((prev) => Math.min(SECTIONS.length - 1, prev + 1))}
          disabled={currentSection === SECTIONS.length - 1}
          className="w-12 h-12 md:w-auto md:px-6 md:py-2 rounded-full font-bold text-white text-sm transition-all disabled:opacity-50 flex items-center justify-center shadow-lg"
          style={{ backgroundColor: colors.primary }}
        >
          <span className="md:hidden">→</span>
          <span className="hidden md:inline">Next →</span>
        </motion.button>
      </motion.div>

      {/* Pop-up Reset Confirmation */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-6 md:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" 
                style={{ backgroundColor: colors.softBg }}
              >
                <RotateCcw size={32} style={{ color: colors.primary }} />
              </div>
              <h2 className="text-2xl font-black mb-2" style={{ color: colors.textDark }}>
                Reset Progress?
              </h2>
              <p className="text-gray-600 mb-8 text-sm md:text-base leading-relaxed">
                Are you sure you want to start over? All your checkmarks and progress will be cleared.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-3 rounded-xl font-bold transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90 shadow-md"
                  style={{ backgroundColor: colors.primary }}
                >
                  Yes, Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}