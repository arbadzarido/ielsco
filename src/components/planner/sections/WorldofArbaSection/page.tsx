"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";
import { WORLD_OF_ARBA } from "@/data/planner/content";

export default function WorldOfArbaSection({ setCompleted }: SectionProps) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const nextQuote = () => {
    setCurrentIdx((prev) => (prev + 1) % WORLD_OF_ARBA.length);
  };

  const prevQuote = () => {
    setCurrentIdx((prev) =>
      prev === 0 ? WORLD_OF_ARBA.length - 1 : prev - 1
    );
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
          World of Arba
        </h1>
        <p className="text-lg mb-2" style={{ color: colors.textLight }}>
          Wisdom from someone who believes in you
        </p>
        <p className="text-sm" style={{ color: colors.textLight }}>
          {currentIdx + 1} of {WORLD_OF_ARBA.length} quotes
        </p>
      </motion.div>

      {/* Quote Carousel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl p-8 md:p-12 border-2 shadow-xl min-h-[300px] flex flex-col justify-center"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center space-y-4"
        >
          {/* Quote */}
          <p
            className="text-2xl md:text-3xl font-black leading-snug"
            style={{ color: colors.textDark }}
          >
            "{WORLD_OF_ARBA[currentIdx]}"
          </p>

          {/* Heart */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Heart
              size={32}
              fill={colors.primary}
              color={colors.primary}
              className="mx-auto"
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center gap-4"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={prevQuote}
          className="p-3 rounded-full text-white transition-all"
          style={{ backgroundColor: colors.primary }}
        >
          <ChevronLeft size={24} />
        </motion.button>

        {/* Dots */}
        <div className="flex gap-2">
          {WORLD_OF_ARBA.map((_, idx) => (
            <motion.button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className="h-2 rounded-full transition-all"
              animate={{
                width: currentIdx === idx ? 32 : 8,
                backgroundColor:
                  currentIdx === idx ? colors.primary : colors.primaryLight,
              }}
            />
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={nextQuote}
          className="p-3 rounded-full text-white transition-all"
          style={{ backgroundColor: colors.primary }}
        >
          <ChevronRight size={24} />
        </motion.button>
      </motion.div>

      {/* Quote Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-black mb-6" style={{ color: colors.textDark }}>
          All {WORLD_OF_ARBA.length} Quotes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WORLD_OF_ARBA.map((quote, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + idx * 0.02 }}
              onClick={() => setCurrentIdx(idx)}
              className="p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg"
              style={{
                backgroundColor:
                  currentIdx === idx ? colors.softBg : colors.white,
                borderColor:
                  currentIdx === idx ? colors.primary : colors.primaryLight,
              }}
            >
              <p
                className="text-sm leading-relaxed italic"
                style={{ color: colors.textDark }}
              >
                "{quote}"
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => setCompleted("woa", true)}
          className="px-6 py-3 rounded-full font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ Wisdom Absorbed
        </button>
      </motion.div>
    </div>
  );
}