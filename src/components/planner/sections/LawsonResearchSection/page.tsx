"use client";

import { motion } from "framer-motion";
import { Info, Lightbulb, Users } from "lucide-react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";
import {
  LAWSON_ABOUT,
  LAWSON_BRAND,
  LAWSON_CREATIVE_TEAM,
  LAWSON_IMPROVE,
} from "@/data/planner/content";

const LAWSON_FITS_REGHIEN = "Lawson is looking for creative interns who understand that retail design is about solving customer problems, not just making things pretty. Your background is perfect for this. Your painting wins show you can create work that resonates emotionally. Your IELS experience shows you can translate business objectives into visual solutions. Your design thinking shows you ask 'why' before you execute. That combination - artistic foundation + business thinking + genuine curiosity - is exactly what Lawson needs. Plus, you're coachable, reliable, and genuinely interested in growth. That's the mindset that matters most in an internship.";

export default function LawsonResearchSection({ setCompleted }: SectionProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black mb-3" style={{ color: colors.textDark }}>
          Lawson Research
        </h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          Know who you're interviewing with
        </p>
      </motion.div>

      {/* About Lawson */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Info size={28} style={{ color: colors.accent }} />
          About Lawson Indonesia
        </h2>
        <div className="space-y-4">
          <div>
            <p className="font-bold mb-2" style={{ color: colors.textLight }}>Overview:</p>
            <p style={{ color: colors.textDark }}>{LAWSON_ABOUT.overview}</p>
          </div>
          <div>
            <p className="font-bold mb-2" style={{ color: colors.textLight }}>Mission:</p>
            <p style={{ color: colors.textDark }}>{LAWSON_ABOUT.mission}</p>
          </div>
          <div>
            <p className="font-bold mb-2" style={{ color: colors.textLight }}>Core Values:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {LAWSON_ABOUT.values.map((val, i) => (
                <div
                  key={i}
                  className="p-2 rounded-lg text-center text-sm font-bold"
                  style={{ backgroundColor: colors.softBg, color: colors.textDark }}
                >
                  {val}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Brand Personality */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Lightbulb size={28} style={{ color: colors.accent }} />
          Brand Personality
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LAWSON_BRAND.personality.map((trait, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="p-4 rounded-lg"
              style={{ backgroundColor: colors.white }}
            >
              <p className="font-bold" style={{ color: colors.primary }}>
                {trait.split(" - ")[0]}
              </p>
              <p className="text-sm mt-1" style={{ color: colors.textDark }}>
                {trait.split(" - ")[1]}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* What Creative Team Does */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Users size={28} style={{ color: colors.accent }} />
          What Lawson's Creative Team Does
        </h2>
        <p className="leading-relaxed" style={{ color: colors.textDark }}>
          {LAWSON_CREATIVE_TEAM}
        </p>
      </motion.div>

      {/* If Asked to Improve */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4" style={{ color: colors.textDark }}>
          If They Ask: "What Would You Improve?"
        </h2>
        <p className="leading-relaxed mb-4" style={{ color: colors.textDark }}>
          {LAWSON_IMPROVE}
        </p>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: colors.white, borderLeft: `4px solid ${colors.primary}` }}
        >
          <p className="text-sm font-bold" style={{ color: colors.textDark }}>
            ⚠️ Strategy: Be thoughtful, not prescriptive. Show you'd research first. Show respect for their existing work.
          </p>
        </div>
      </motion.div>

      {/* Why Lawson Fits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4" style={{ color: colors.textDark }}>
          Why Lawson Fits You (& Why You Fit Lawson)
        </h2>
        <p className="leading-relaxed" style={{ color: colors.textDark }}>
          {LAWSON_FITS_REGHIEN}
        </p>
      </motion.div>

      <motion.div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => setCompleted("lawson-research", true)}
          className="px-6 py-3 rounded-full font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ Lawson Research Complete
        </button>
      </motion.div>
    </div>
  );
}