"use client";

import { motion } from "framer-motion";
import { Briefcase, Target, Award } from "lucide-react";
import Image from "next/image";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";
import {
  IELS_ABOUT,
  IELS_REGHIEN_ROLE,
  IELS_PROJECTS,
  IELS_CHALLENGE,
  IELS_ACHIEVEMENT,
  IELS_LESSONS,
} from "@/data/planner/content";

export default function IelsExperienceSection({ setCompleted }: SectionProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center flex flex-col items-center"
      >
        <div className="mb-6 relative w-24 h-24">
          <Image
            src="/images/logos/iels_blue1.png"
            alt="IELS Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl font-black mb-3" style={{ color: colors.textDark }}>
          IELS Experience
        </h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          Your real-world creative work
        </p>
      </motion.div>

      {/* About IELS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4" style={{ color: colors.textDark }}>
          About IELS
        </h2>
        <div className="space-y-4">
          <div>
            <p className="font-bold mb-2" style={{ color: colors.textLight }}>Mission:</p>
            <p style={{ color: colors.textDark }}>{IELS_ABOUT.mission}</p>
          </div>
          <div>
            <p className="font-bold mb-2" style={{ color: colors.textLight }}>What They Do:</p>
            <p style={{ color: colors.textDark }}>{IELS_ABOUT.description}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.softBg }}>
              <p className="font-bold text-sm mb-2" style={{ color: colors.textLight }}>Students:</p>
              <p className="text-sm" style={{ color: colors.textDark }}>{IELS_ABOUT.students}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.softBg }}>
              <p className="font-bold text-sm mb-2" style={{ color: colors.textLight }}>Key Programs:</p>
              <ul className="text-sm space-y-1" style={{ color: colors.textDark }}>
                {IELS_ABOUT.programs.map((prog, i) => <li key={i}>• {prog}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Your Role */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Briefcase size={28} style={{ color: colors.accent }} />
          Your Role: {IELS_REGHIEN_ROLE.title}
        </h2>
        <ul className="space-y-3">
          {IELS_REGHIEN_ROLE.responsibilities.map((resp, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="flex gap-3"
              style={{ color: colors.textDark }}
            >
              <span className="font-bold">✓</span>
              <span>{resp}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-black mb-4" style={{ color: colors.textDark }}>
          Projects You Worked On
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {IELS_PROJECTS.map((proj, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="p-4 rounded-lg border-2"
              style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
            >
              <p className="text-sm" style={{ color: colors.textDark }}>
                {proj}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Challenge (STAR) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4" style={{ color: colors.textDark }}>
          Biggest Challenge (STAR Method)
        </h2>
        <div className="space-y-4">
          {Object.entries(IELS_CHALLENGE).map(([key, value]) => {
            if (key === "situation" || key === "task" || key === "result") {
              return (
                <div key={key}>
                  <p className="font-bold uppercase text-sm mb-2" style={{ color: colors.textLight }}>
                    {key === "situation" && "Situation"}
                    {key === "task" && "Task"}
                    {key === "result" && "Result"}
                  </p>
                  <p style={{ color: colors.textDark }}>{typeof value === "string" ? value : ""}</p>
                </div>
              );
            } else if (key === "action") {
              return (
                <div key={key}>
                  <p className="font-bold uppercase text-sm mb-2" style={{ color: colors.textLight }}>
                    Action
                  </p>
                  <ul className="space-y-2">
                    {(value as string[]).map((action, i) => (
                      <li key={i} className="flex gap-2 text-sm" style={{ color: colors.textDark }}>
                        <span>→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            return null;
          })}
        </div>
      </motion.div>

      {/* Achievement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Award size={28} style={{ color: colors.accent }} />
          Biggest Achievement
        </h2>
        <p className="leading-relaxed" style={{ color: colors.textDark }}>
          {IELS_ACHIEVEMENT}
        </p>
      </motion.div>

      {/* Lessons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-2xl font-black mb-4" style={{ color: colors.textDark }}>
          Key Lessons Learned
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {IELS_LESSONS.map((lesson, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="rounded-lg p-4 border-2"
              style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
            >
              <p className="font-black mb-2" style={{ color: colors.primary }}>
                {lesson.lesson}
              </p>
              <p className="text-sm" style={{ color: colors.textDark }}>
                {lesson.explanation}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => setCompleted("iels", true)}
          className="px-6 py-3 rounded-full font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ IELS Mastered
        </button>
      </motion.div>
    </div>
  );
}