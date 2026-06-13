"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, RefreshCw } from "lucide-react";
import confetti from 'canvas-confetti';
import { useState } from "react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";
import { ARBA_LETTER } from "@/data/planner/content";
import Image from "next/image";

export default function LetterFromArba({ setCompleted }: SectionProps) {
  const [showPopup, setShowPopup] = useState(false);

  const handleAceThis = () => {
    // Trigger confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
    setShowPopup(true);
    setCompleted("letter", true);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex justify-center mb-5">
          <div className="relative">
            {/* Foto Arba */}
            <Image
              src="/images/people/directors/arba.png"
              alt="Arba"
              width={88}
              height={88}
              className="rounded-full object-cover border-4 shadow-md"
              style={{ borderColor: colors.softBg }}
            />
            {/* Icon Heart Kecil di Pojok Foto */}
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-sm">
              <Heart size={20} fill={colors.primary} color={colors.primary} />
            </div>
          </div>
        </div>
        <h1 className="text-4xl font-black mb-3" style={{ color: colors.textDark }}>
          Letter from Arba
        </h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          Words from someone who believes in you more than you know
        </p>
      </motion.div>

      {/* Letter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 md:p-10 border-2 shadow-lg"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="prose prose-sm md:prose-base max-w-none"
          style={{ color: colors.textDark }}
        >
          {ARBA_LETTER.split("\n\n").map((paragraph, idx) => (
            <motion.p
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.05 }}
              className="mb-4 leading-relaxed text-base whitespace-pre-wrap"
              style={{
                color: paragraph.includes("—") ? colors.textLight : colors.textDark,
                fontStyle: paragraph.includes("—") ? "italic" : "normal",
                fontWeight: paragraph.includes("—") ? "bold" : "normal",
              }}
            >
              {paragraph}
            </motion.p>
          ))}
        </motion.div>
      </motion.div>

      {/* Key Takeaways */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-2xl font-black mb-6" style={{ color: colors.textDark }}>
          Remember This...
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "You're Already Enough",
              content: "You've proven yourself through your work. That's not luck. That's skill and effort.",
            },
            {
              title: "Nervousness is Good",
              content: "It means you care. It means this matters to you. That shows in a good way.",
            },
            {
              title: "Uniqueness is Strength",
              content: "Your painting background, your leadership, your journey - that's YOUR edge.",
            },
            {
              title: "They Want You to Win",
              content: "Interviewers want to find great candidates. They're rooting for you to be great.",
            },
            {
              title: "Confidence > Perfection",
              content: "Show them a confident person who's willing to learn. That beats a perfect person who's rigid.",
            },
            {
              title: "You've Got This",
              content: "Not because it's guaranteed. Because you've prepared, you've got the skills, and you're ready.",
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className="p-4 rounded-lg border-2"
              style={{
                backgroundColor: colors.softBg,
                borderColor: colors.primaryLight,
              }}
            >
              <p className="font-black mb-2" style={{ color: colors.primary }}>
                {item.title}
              </p>
              <p className="text-sm" style={{ color: colors.textDark }}>
                {item.content}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Final CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="rounded-2xl p-8 text-center border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primary }}
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mb-4"
        >
          <Heart
            size={48}
            fill={colors.primary}
            color={colors.primary}
            className="mx-auto"
          />
        </motion.div>
        <p
          className="text-2xl font-black mb-4"
          style={{ color: colors.textDark }}
        >
          You're Ready
        </p>
        <p className="mb-6 text-base" style={{ color: colors.textLight }}>
          Go show Lawson what they're looking for.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleAceThis}
          className="px-8 py-3 rounded-full font-bold text-white inline-flex items-center gap-2"
          style={{ backgroundColor: colors.primary }}
        >
          <Send size={20} />
          I'm Ready to Ace This
        </motion.button>
      </motion.div>

      {/* Signature */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <p
          className="text-lg font-black italic"
          style={{ color: colors.primary }}
        >
          — Arba ❤️
        </p>
      </motion.div>

      {/* Pop-up Celebration */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              <div className="flex gap-2 justify-center mb-6">
                {/* Menampilkan dua foto dengan object-cover biar proporsional */}
                <Image src="/images/people/ginnie/ginnie4.jpeg" alt="Ginnie" width={100} height={100} className="rounded-2xl object-cover" />
                <Image src="/images/people/ginnie/ginnie5.jpeg" alt="Ginnie" width={100} height={100} className="rounded-2xl object-cover" />
              </div>
              
              <h2 className="text-3xl font-black mb-4" style={{ color: colors.textDark }}>
                Let's go!
              </h2>
              <p className="mb-6 text-gray-600 font-medium">
                Now you are ready to conquer the interview!
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setShowPopup(false)}
                  className="w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: colors.primary }}
                >
                  Continue
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-3 rounded-xl font-bold border-2 transition-colors hover:bg-gray-50"
                  style={{ borderColor: colors.primary, color: colors.primary }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw size={18} /> Review from start
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}