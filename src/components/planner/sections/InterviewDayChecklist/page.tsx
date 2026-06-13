"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Circle } from "lucide-react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";

const CHECKLIST_ITEMS = [
  {
    phase: "Day Before",
    items: [
      "Review your portfolio one final time",
      "Get a good night's sleep (7-8 hours)",
      "Prepare your outfit - clean, professional",
      "Charge your phone and devices",
      "Check the location and travel time",
      "Prepare a small notebook and pen",
      "Review key talking points lightly",
      "Eat a proper dinner",
      "Do some light stretching or exercise",
      "Go to bed early",
    ],
  },
  {
    phase: "Morning",
    items: [
      "Wake up early with time to spare",
      "Eat a nutritious breakfast",
      "Shower and groom yourself",
      "Wear your prepared outfit",
      "Do a final appearance check in mirror",
      "Review location and get directions",
      "Put water bottle in bag",
      "Bring multiple copies of your portfolio/CV if needed",
      "Set phone to silent",
      "Leave house 15 minutes earlier than needed",
    ],
  },
  {
    phase: "30 Minutes Before",
    items: [
      "Arrive at the location early",
      "Use the restroom if needed",
      "Check your appearance one more time",
      "Take 3 deep breaths",
      "Review your key bullet points",
      "Silence your phone completely",
      "Put your bag away neatly",
      "Stand up straight and do a quick posture check",
      "Smile and relax your facial muscles",
      "Remind yourself: 'I've prepared for this'",
    ],
  },
];

export default function InterviewDayChecklist({ setCompleted }: SectionProps) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("interview-checklist");
    if (saved) {
      setCheckedItems(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("interview-checklist", JSON.stringify(checkedItems));
  }, [checkedItems]);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const totalItems = CHECKLIST_ITEMS.reduce((sum, phase) => sum + phase.items.length, 0);
  const completedItems = Object.values(checkedItems).filter(Boolean).length;
  const completionPercentage = Math.round((completedItems / totalItems) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black mb-3" style={{ color: colors.textDark }}>
          Interview Day Checklist
        </h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          Your roadmap to interview day success
        </p>
      </motion.div>

      {/* Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 border-2 text-center"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <p className="text-3xl font-black mb-2" style={{ color: colors.primary }}>
          {completionPercentage}%
        </p>
        <div className="w-full bg-pink-200 rounded-full h-3 mb-3 overflow-hidden">
          <motion.div
            className="h-full"
            style={{ backgroundColor: colors.primary }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p style={{ color: colors.textDark }}>
          {completedItems} of {totalItems} items completed
        </p>
      </motion.div>

      {/* Checklist Phases */}
      <div className="space-y-6">
        {CHECKLIST_ITEMS.map((phase, phaseIdx) => (
          <motion.div
            key={phase.phase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + phaseIdx * 0.1 }}
            className="space-y-3"
          >
            <h2
              className="text-xl font-black"
              style={{ color: colors.textDark }}
            >
              {phase.phase}
            </h2>

            <div className="space-y-2">
              {phase.items.map((item, itemIdx) => {
                const id = `${phase.phase}-${itemIdx}`;
                const isChecked = checkedItems[id] || false;

                return (
                  <motion.button
                    key={id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + phaseIdx * 0.1 + itemIdx * 0.05 }}
                    onClick={() => toggleItem(id)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-lg border-2 transition-all"
                    style={{
                      backgroundColor: isChecked ? colors.softBg : colors.white,
                      borderColor: isChecked ? colors.primary : colors.primaryLight,
                    }}
                  >
                    <motion.div
                      animate={{ scale: isChecked ? 1.1 : 1 }}
                      className="flex-shrink-0"
                    >
                      {isChecked ? (
                        <CheckCircle
                          size={24}
                          style={{ color: colors.primary }}
                        />
                      ) : (
                        <Circle
                          size={24}
                          style={{ color: colors.primaryLight }}
                        />
                      )}
                    </motion.div>
                    <span
                      className="flex-1 font-medium"
                      style={{
                        color: colors.textDark,
                        textDecoration: isChecked ? "line-through" : "none",
                        opacity: isChecked ? 0.7 : 1,
                      }}
                    >
                      {item}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Motivation */}
      {completionPercentage === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-6 text-center border-2"
          style={{
            backgroundColor: colors.softBg,
            borderColor: colors.primary,
          }}
        >
          <p className="text-2xl font-black mb-2">🎉</p>
          <p className="font-black" style={{ color: colors.textDark }}>
            You're Fully Prepared!
          </p>
          <p className="text-sm mt-2" style={{ color: colors.textLight }}>
            Now go out there and show them who you are. You've got this! 💪❤️
          </p>
        </motion.div>
      )}

      <motion.div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => setCompleted("checklist", true)}
          className="px-6 py-3 rounded-full font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ Checklist Reviewed
        </button>
      </motion.div>
    </div>
  );
}