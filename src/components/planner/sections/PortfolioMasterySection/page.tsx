"use client";

import { motion } from "framer-motion";
import { Palette, Award } from "lucide-react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";

const PORTFOLIO_FRAMEWORK = [
  { step: "Objective", desc: "What was the goal of the project?" },
  { step: "Audience", desc: "Who was this designed for?" },
  { step: "Challenge", desc: "What problem needed solving?" },
  { step: "Decision", desc: "What design decisions did you make and why?" },
  { step: "Outcome", desc: "What was the result or impact?" },
];
const PEKSIMIDA_STORY = "PEKSIMIDA adalah kompetisi melukis bergengsi di tingkat regional. Untuk karya saya, saya membuat lukisan yang mengeksplorasi persimpangan antara elemen visual tradisional Indonesia dengan pemikiran abstrak kontemporer. Lukisan ini berfokus pada harmoni warna dan penyampaian cerita yang emosional - saya menggunakan nada warna yang hangat dan pekat untuk menciptakan kedalaman dan pergerakan. Hal yang membuatnya menonjol adalah karya ini tidak hanya kuat secara teknis; melainkan juga mengomunikasikan narasi yang jelas tentang identitas budaya dan interpretasi modern. Memenangkan penghargaan ini menunjukkan kepada saya bahwa audiens merespons ketika sebuah karya visual memiliki keterampilan teknis sekaligus konsep yang bermakna. Pelajaran tersebut berhubungan langsung dengan desain komersial - estetika ditambah tujuan sama dengan dampak yang kuat.";

const PEKSIMINAS_STORY = "PEKSIMINAS adalah kompetisi melukis tingkat nasional, dan berhasil masuk dalam Top 6 adalah salah satu pencapaian yang paling saya banggakan. Bersaing dengan ratusan karya lainnya, karya saya berhasil memikat para juri. Hal ini mengajarkan saya beberapa pelajaran: Pertama, bahwa pilihan kreatif yang berani sering kali lebih menonjol daripada pilihan yang aman. Kedua, pengembangan keterampilan yang konsisten itu penting - saya tidak sekadar ikut serta sekali; saya menyempurnakan pendekatan saya berdasarkan masukan (feedback). Ketiga, kesuksesan dalam skala besar membutuhkan pemahaman tentang apa yang direspons oleh audiens secara emosional, bukan sekadar estetika. Untuk Lawson, ini berarti saya memahami cara menciptakan karya yang berkinerja baik di skala yang lebih besar dan beresonansi di berbagai audiens yang beragam.";

const PAINTING_DESIGNER = "Latihan melukis membuat saya menjadi seorang desainer yang lebih baik dalam beberapa hal. Pertama, melukis mengajarkan saya teori warna pada tingkat yang mendalam - bukan hanya aturan teknis, tetapi bagaimana warna berinteraksi secara emosional. Kedua, ini mengajarkan saya tentang komposisi dan hierarki visual. Setiap lukisan mengharuskan audiens untuk tahu apa yang harus dilihat pertama, kedua, dan ketiga. Itulah tepatnya fungsi dari desain yang baik. Ketiga, melukis mengajarkan saya bahwa batasan justru memicu kreativitas - bekerja dengan warna terbatas atau di dalam sebuah bingkai membutuhkan pemecahan masalah yang kreatif, sama seperti bekerja dengan pedoman merek (brand guidelines) atau batasan anggaran. Terakhir, melukis mengajarkan saya untuk bereksperimen tanpa rasa takut dan belajar dari kegagalan. Anda tidak bisa melukis tanpa membuat kesalahan lalu berkembang. Itu jugalah pola pikir (mindset) desain saya.";
export default function PortfolioMasterySection({ setCompleted }: SectionProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-black mb-3" style={{ color: colors.textDark }}>
          Portfolio Mastery
        </h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          How to present any project with confidence
        </p>
      </motion.div>

      {/* Framework */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-6 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Palette size={28} style={{ color: colors.accent }} />
          The Framework
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PORTFOLIO_FRAMEWORK.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + idx * 0.1 }}
              className="rounded-lg p-4"
              style={{ backgroundColor: colors.white }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                  style={{ backgroundColor: colors.primary }}
                >
                  {idx + 1}
                </div>
                <div>
                  <p className="font-black mb-1" style={{ color: colors.textDark }}>
                    {item.step}
                  </p>
                  <p className="text-sm" style={{ color: colors.textLight }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 rounded-lg"
          style={{ backgroundColor: colors.white }}
        >
          <p className="text-sm font-bold" style={{ color: colors.textDark }}>
            💡 Tip: Every project has these elements. Use this framework whether you're presenting or answering interview questions.
          </p>
        </motion.div>
      </motion.div>

      {/* PEKSIMIDA Story */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Award size={28} style={{ color: colors.accent }} />
          Your PEKSIMIDA Win
        </h2>
        <p className="leading-relaxed" style={{ color: colors.textDark }}>
          {PEKSIMIDA_STORY}
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-4 rounded-lg"
          style={{ backgroundColor: colors.softBg }}
        >
          <p className="text-sm font-bold" style={{ color: colors.textDark }}>
            🎯 Interview angle: "Winning PEKSIMIDA taught me that good design combines technical skill with meaningful concept."
          </p>
        </motion.div>
      </motion.div>

      {/* PEKSIMINAS Story */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.white, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4 flex items-center gap-2" style={{ color: colors.textDark }}>
          <Award size={28} style={{ color: colors.accent }} />
          Your PEKSIMINAS Top 6
        </h2>
        <p className="leading-relaxed" style={{ color: colors.textDark }}>
          {PEKSIMINAS_STORY}
        </p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 p-4 rounded-lg"
          style={{ backgroundColor: colors.softBg }}
        >
          <p className="text-sm font-bold" style={{ color: colors.textDark }}>
            🎯 Interview angle: "Competing nationally taught me what resonates at scale and the importance of consistent skill development."
          </p>
        </motion.div>
      </motion.div>

      {/* Painting Makes Better Designer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <h2 className="text-2xl font-black mb-4" style={{ color: colors.textDark }}>
          Why Painting Makes You a Better Designer
        </h2>
        <p className="leading-relaxed" style={{ color: colors.textDark }}>
          {PAINTING_DESIGNER}
        </p>
      </motion.div>

      <motion.div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => setCompleted("portfolio", true)}
          className="px-6 py-3 rounded-full font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ Portfolio Strategy Clear
        </button>
      </motion.div>
    </div>
  );
}