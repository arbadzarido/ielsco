"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, Brain, Zap } from "lucide-react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";
import { MINDSET_CARDS, CONFIDENCE_FRAMEWORK } from "@/data/planner/content";

export default function MindsetSection({ setCompleted }: SectionProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [readyText, setReadyText] = useState("");

  const imposterKillerAnswer =
    "If Lawson invited you to interview, they already saw something worth exploring. Your job isn't to prove you're perfect. Your job is to show them who you are.";

  return (
    <div className="space-y-12">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Brain size={32} style={{ color: colors.primary }} />
          <h1 className="text-4xl font-black" style={{ color: colors.textDark }}>
            Mindset
          </h1>
        </div>
        <p className="text-lg" style={{ color: colors.textLight }}>
          Before we tackle the technical stuff, let's get your head right.
        </p>
      </motion.div>

      {/* What Lawson Wants Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 md:p-8 border-2 shadow-lg"
        style={{
          backgroundColor: colors.white,
          borderColor: colors.primaryLight,
        }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Zap size={28} style={{ color: colors.accent }} />
          What Lawson Actually Wants
        </h2>
        <p className="mb-6 text-base" style={{ color: colors.textLight }}>
          Spoiler: It's not what you think.
        </p>

        <div className="space-y-4">
          {MINDSET_CARDS[0].points.map((point, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
              className="flex gap-4 items-start"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm mt-1"
                style={{ backgroundColor: colors.primary }}
              >
                {idx + 1}
              </div>
              <div>
                <p className="font-bold" style={{ color: colors.textDark }}>
                  {point.split(" - ")[0]}
                </p>
                <p className="text-sm mt-1" style={{ color: colors.textLight }}>
                  {point.split(" - ")[1]}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-4 rounded-lg"
          style={{ backgroundColor: colors.softBg }}
        >
          <p className="font-bold italic text-sm" style={{ color: colors.textDark }}>
            💡 Key takeaway: {MINDSET_CARDS[0].note}
          </p>
        </motion.div>
      </motion.div>

      {/* Imposter Syndrome Killer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{
          backgroundColor: colors.softBg2,
          borderColor: colors.primaryLight,
        }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Heart size={28} style={{ color: colors.primary }} />
          Imposter Syndrome Killer
        </h2>

        <div className="bg-white rounded-lg p-6 mb-4">
          <p className="text-lg font-bold mb-3" style={{ color: colors.textDark }}>
            "What if I'm not good enough?"
          </p>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <p className="text-base leading-relaxed" style={{ color: colors.textLight }}>
              {imposterKillerAnswer}
            </p>
            <div className="pt-3 border-t" style={{ borderColor: colors.primaryLight }}>
              <p className="text-sm italic" style={{ color: colors.textDark }}>
                Because here's what's also true:
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li style={{ color: colors.textLight }}>✓ You've won competitive art awards (PEKSIMIDA, PEKSIMINAS Top 6)</li>
                <li style={{ color: colors.textLight }}>✓ You've led people as HIMA DKV Chairperson</li>
                <li style={{ color: colors.textLight }}>✓ You've delivered real creative work at IELS with measurable impact</li>
                <li style={{ color: colors.textLight }}>✓ You're articulate, thoughtful, and genuinely interested in growth</li>
              </ul>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-lg text-center"
          style={{ backgroundColor: colors.softBg }}
        >
          <p className="font-black text-base" style={{ color: colors.primary }}>
            You belong in that interview room. ❤️
          </p>
        </motion.div>
      </motion.div>

      {/* Confidence Framework */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Zap size={28} style={{ color: colors.accent }} />
          Confidence Framework
        </h2>

        <div className="space-y-3">
          {CONFIDENCE_FRAMEWORK.map((phase, phaseIdx) => (
            <motion.button
              key={phase.phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + phaseIdx * 0.1 }}
              onClick={() => setExpandedPhase(expandedPhase === phase.phase ? null : phase.phase)}
              className="w-full text-left rounded-xl border-2 overflow-hidden"
              style={{
                borderColor: expandedPhase === phase.phase ? colors.primary : colors.primaryLight,
                backgroundColor: expandedPhase === phase.phase ? colors.softBg : colors.white,
              }}
            >
              <div className="p-4 flex items-center justify-between">
                <h3 className="font-black text-lg" style={{ color: colors.textDark }}>
                  {phase.phase}
                </h3>
                <motion.div
                  animate={{
                    rotate: expandedPhase === phase.phase ? 180 : 0,
                  }}
                >
                  <ChevronDown size={24} style={{ color: colors.primary }} />
                </motion.div>
              </div>

              <AnimatePresence>
                {expandedPhase === phase.phase && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t px-4 py-4"
                    style={{ borderColor: colors.primaryLight }}
                  >
                    <ul className="space-y-2">
                      {phase.items.map((item, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex gap-3 text-sm"
                          style={{ color: colors.textLight }}
                        >
                          <span className="font-bold">→</span>
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Mark as Complete */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-3 justify-center pt-8"
      >
        <button
          onClick={() => setCompleted("mindset", true)}
          className="px-6 py-3 rounded-full font-bold text-white transition-all"
          style={{
            backgroundColor: colors.primary,
          }}
        >
          ✓ Section Complete
        </button>
      </motion.div>
    </div>
  );
}