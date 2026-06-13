"use client";

import { motion } from "framer-motion";
import { Heart, Sparkles, ArrowRight, FileText, Linkedin, Briefcase, ExternalLink } from "lucide-react";
import Image from "next/image";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";

export default function LandingPage({ setCompleted }: SectionProps) {
  // Define links here
  const links = [
    { name: "CV", icon: <FileText size={16} />, href: "https://drive.google.com/file/d/1_0wq4OZg8z3uiFUfsJ4-gATPZxo1Ldu3/view?usp=drive_link" },
    { name: "LinkedIn", icon: <Linkedin size={16} />, href: "https://www.linkedin.com/in/reghienarifa/" },
    { name: "Portfolio", icon: <Briefcase size={16} />, href: "https://drive.google.com/file/d/1AkMg4kMr0SfESFLLikRi0C8ZE1sC8Tks/view?usp=drive_link" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-3xl"
      >
        {/* Profile Image Section */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white shadow-xl ring-4 ring-offset-2" style={{ borderColor: colors.primary }}>
            <Image
              src="/images/people/ginnie/ginnie6.PNG"
              alt="Reghien Arifa Suci"
              fill
              className="object-cover"
              priority
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-black mb-4 tracking-tight"
          style={{ color: colors.textDark }}
        >
          The Interview
          <br />
          <span style={{ color: colors.primary }}>Master Brief</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <span className="text-xl md:text-2xl font-bold" style={{ color: colors.textLight }}>
            For Reghien Arifa Suci
          </span>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Heart size={24} fill={colors.primary} color={colors.primary} />
          </motion.div>
        </motion.div>

        {/* Quick Links Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {links.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all hover:scale-105"
              style={{ backgroundColor: colors.softBg, color: colors.textDark }}
            >
              {link.icon}
              {link.name}
              <ExternalLink size={12} className="opacity-50" />
            </a>
          ))}
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-lg mb-8 leading-relaxed max-w-2xl mx-auto"
          style={{ color: colors.textLight }}
        >
          "This isn't just an interview brief. It's a reminder of who you are, what you've achieved, and why you <b>absolutely deserve</b> to be in that interview room."
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {[
            { icon: "🧠", label: "Mindset" },
            { icon: "💡", label: "Know Yourself" },
            { icon: "🎨", label: "Portfolio" },
            { icon: "🎯", label: "Strategy" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl text-center border border-transparent hover:border-current transition-all"
              style={{ backgroundColor: colors.softBg, borderColor: `${colors.primary}20` }}
            >
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="font-bold text-xs uppercase tracking-wider" style={{ color: colors.textDark }}>
                {item.label}
              </p>
            </div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setCompleted("landing", true)}
          className="w-full md:w-auto px-10 py-4 rounded-full font-bold text-white text-lg flex items-center justify-center gap-2 mx-auto shadow-xl"
          style={{
            backgroundColor: colors.primary,
          }}
        >
          <Sparkles size={20} />
          Start Journey
          <ArrowRight size={20} />
        </motion.button>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-10 text-sm font-medium"
          style={{ color: colors.textLight }}
        >
          Curated with love by Arba ❤️
        </motion.p>
      </motion.div>
    </div>
  );
}