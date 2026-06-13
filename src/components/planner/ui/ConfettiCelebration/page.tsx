"use client";

import { motion } from "framer-motion";
import { colors } from "@/lib/utils";

export default function ConfettiCelebration() {
  const confetti = Array.from({ length: 50 }, (_, i) => i);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {confetti.map((i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * window.innerWidth,
            y: -20,
            opacity: 1,
            rotate: 0,
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 20,
            opacity: 0,
            rotate: 360,
          }}
          transition={{
            duration: 2 + Math.random() * 1,
            ease: "easeIn",
          }}
          className="fixed w-2 h-2 rounded-full"
          style={{
            backgroundColor: [
              colors.primary,
              colors.primaryLight,
              colors.accent,
              "#fbbf24",
              "#ec4899",
            ][Math.floor(Math.random() * 5)],
          }}
        />
      ))}
      
      {/* Heart confetti */}
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={`heart-${i}`}
          initial={{
            x: Math.random() * window.innerWidth,
            y: -40,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 40,
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 2.5 + Math.random() * 1.5,
            ease: "easeIn",
          }}
          className="fixed text-2xl"
        >
          ❤️
        </motion.div>
      ))}
    </div>
  );
}