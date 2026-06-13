"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Zap } from "lucide-react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";
import {
  TELL_ABOUT_YOURSELF,
  WHY_DESIGN,
  WHY_LAWSON,
  WHAT_MAKES_YOU_DIFFERENT,
} from "@/data/planner/content";

export default function KnowYourselfSection({ setCompleted }: SectionProps) {
  const [activeTab, setActiveTab] = useState("about-30");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tabs = [
    { id: "about-30", label: "About You (30s)", content: TELL_ABOUT_YOURSELF["30_seconds"] },
    { id: "about-60", label: "About You (60s)", content: TELL_ABOUT_YOURSELF["60_seconds"] },
    { id: "about-90", label: "About You (90s)", content: TELL_ABOUT_YOURSELF["90_seconds"] },
    { id: "why-design", label: "Why Design?", content: WHY_DESIGN },
    { id: "why-lawson", label: "Why Lawson?", content: WHY_LAWSON },
  ];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black mb-3" style={{ color: colors.textDark }}>
          Know Yourself
        </h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          These are your key talking points. Know them well.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap"
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id ? "text-white shadow-lg" : ""
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? colors.primary : colors.softBg,
              color: activeTab === tab.id ? colors.white : colors.textDark,
            }}
          >
            {tab.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{
          backgroundColor: colors.white,
          borderColor: colors.primaryLight,
        }}
      >
        <div className="space-y-4">
          <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap" style={{ color: colors.textDark }}>
            {tabs.find((t) => t.id === activeTab)?.content}
          </p>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const content = tabs.find((t) => t.id === activeTab)?.content || "";
              handleCopy(content, activeTab);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all text-sm mt-4"
            style={{
              backgroundColor: copiedId === activeTab ? "#22c55e" : colors.softBg,
              color: copiedId === activeTab ? "white" : colors.textDark,
            }}
          >
            {copiedId === activeTab ? (
              <>
                <Check size={18} /> Copied!
              </>
            ) : (
              <>
                <Copy size={18} /> Copy to clipboard
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      {/* What Makes You Different */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Zap size={28} style={{ color: colors.accent }} />
          What Makes You Different
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WHAT_MAKES_YOU_DIFFERENT.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="rounded-xl p-6 border-2"
              style={{
                backgroundColor: colors.softBg,
                borderColor: colors.primaryLight,
              }}
            >
              <h3 className="font-black mb-2" style={{ color: colors.textDark }}>
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: colors.textLight }}>
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Mark Complete */}
      <motion.div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => setCompleted("know-yourself", true)}
          className="px-6 py-3 rounded-full font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ Know These Well
        </button>
      </motion.div>
    </div>
  );
}