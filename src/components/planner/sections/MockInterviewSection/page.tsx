"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Copy, Check } from "lucide-react";
import { colors } from "@/lib/utils";
import { SectionProps } from "@/data/planner/index";
import { MOCK_INTERVIEW_QUESTIONS } from "@/data/planner/questions";

const CATEGORIES = {
  hr: "HR Questions",
  creative: "Creative Questions",
  portfolio: "Portfolio Questions",
  behavioral: "Behavioral Questions",
  lawson: "Lawson-Specific Questions",
};

export default function MockInterviewSection({ setCompleted }: SectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<"hr" | "creative" | "portfolio" | "behavioral" | "lawson">("hr");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categoryQuestions = MOCK_INTERVIEW_QUESTIONS.filter(
    (q) => q.category === selectedCategory
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryColor = (category: string) => {
    const colors_map: Record<string, string> = {
      hr: "#ec4899",
      creative: "#fb7185",
      portfolio: "#f472b6",
      behavioral: "#be123c",
      lawson: "#fbbf24",
    };
    return colors_map[category] || colors.primary;
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
          Mock Interview
        </h1>
        <p className="text-lg" style={{ color: colors.textLight }}>
          50 potential interview questions with suggested answers
        </p>
      </motion.div>

      {/* Category Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap"
      >
        {(Object.entries(CATEGORIES) as [typeof selectedCategory, string][]).map(
          ([key, label]) => (
            <motion.button
              key={key}
              onClick={() => setSelectedCategory(key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all ${
                selectedCategory === key ? "text-white shadow-lg" : ""
              }`}
              style={{
                backgroundColor: selectedCategory === key ? getCategoryColor(key) : colors.softBg,
                color: selectedCategory === key ? "white" : colors.textDark,
              }}
            >
              {label}
              <span className="ml-2 font-bold">
                ({MOCK_INTERVIEW_QUESTIONS.filter((q) => q.category === key).length})
              </span>
            </motion.button>
          )
        )}
      </motion.div>

      {/* Questions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {categoryQuestions.map((question, idx) => (
          <motion.button
            key={question.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.05 }}
            onClick={() =>
              setExpandedId(expandedId === question.id ? null : question.id)
            }
            className="w-full text-left rounded-xl border-2 overflow-hidden transition-all"
            style={{
              borderColor:
                expandedId === question.id ? getCategoryColor(question.category) : colors.primaryLight,
              backgroundColor:
                expandedId === question.id ? colors.softBg : colors.white,
            }}
          >
            <div className="p-4 flex items-center justify-between">
              <h3 className="font-bold pr-4 flex-1" style={{ color: colors.textDark }}>
                {idx + 1}. {question.question}
              </h3>
              <motion.div animate={{ rotate: expandedId === question.id ? 180 : 0 }}>
                <ChevronDown
                  size={24}
                  style={{ color: getCategoryColor(question.category) }}
                />
              </motion.div>
            </div>

            <AnimatePresence>
              {expandedId === question.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t px-4 py-4 space-y-4"
                  style={{ borderColor: colors.primaryLight }}
                >
                  {/* Suggested Answer */}
                  <div>
                    <p
                      className="font-bold text-sm uppercase tracking-wider mb-2"
                      style={{ color: colors.textLight }}
                    >
                      Suggested Answer
                    </p>
                    <p
                      className="text-base leading-relaxed mb-3"
                      style={{ color: colors.textDark }}
                    >
                      {question.suggestedAnswer}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(question.suggestedAnswer, question.id);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all"
                      style={{
                        backgroundColor:
                          copiedId === question.id
                            ? "#22c55e"
                            : colors.softBg,
                        color:
                          copiedId === question.id
                            ? "white"
                            : colors.textDark,
                      }}
                    >
                      {copiedId === question.id ? (
                        <>
                          <Check size={14} /> Copied
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copy Answer
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Arba Notes */}
                  {question.arbaNotes && (
                    <div
                      className="p-3 rounded-lg border-l-4"
                      style={{
                        backgroundColor: colors.softBg2,
                        borderColor: getCategoryColor(question.category),
                      }}
                    >
                      <p
                        className="font-bold text-sm mb-1"
                        style={{
                          color: getCategoryColor(question.category),
                        }}
                      >
                        💡 Arba's Note:
                      </p>
                      <p
                        className="text-sm"
                        style={{ color: colors.textDark }}
                      >
                        {question.arbaNotes}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl p-6 md:p-8 border-2"
        style={{ backgroundColor: colors.softBg, borderColor: colors.primaryLight }}
      >
        <p className="font-black mb-4" style={{ color: colors.textDark }}>
          💡 Interview Strategy Tips:
        </p>
        <ul className="space-y-2 text-sm" style={{ color: colors.textDark }}>
          <li>✓ Don't memorize answers word-for-word. Memorize the structure instead.</li>
          <li>✓ Pause and think for a moment before answering. Shows you're thoughtful.</li>
          <li>✓ Use specific examples from your IELS and HIMA experiences.</li>
          <li>✓ Listen carefully to the full question before answering.</li>
          <li>✓ Ask clarifying questions if you don't understand.</li>
          <li>✓ Keep answers concise - 1-2 minutes per answer is ideal.</li>
        </ul>
      </motion.div>

      <motion.div className="flex gap-3 justify-center pt-8">
        <button
          onClick={() => setCompleted("mock-interview", true)}
          className="px-6 py-3 rounded-full font-bold text-white"
          style={{ backgroundColor: colors.primary }}
        >
          ✓ Questions Reviewed
        </button>
      </motion.div>
    </div>
  );
}