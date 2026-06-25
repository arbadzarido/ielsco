// src/app/welcome/start/page.tsx
"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QUESTIONS, DAILY_TARGET } from "@/data/quizdata";
import { generateAchievement, getRecommendedPrograms } from "@/data/quizdata";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

// ─────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────
function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
        <span>Question {step + 1} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
        <motion.div
          className="h-full bg-[#E56668] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// QUESTION CARD
// ─────────────────────────────────────────────
function QuestionCard({
  title,
  prompt,
  options,
  selectedIndex,
  onSelect,
}: {
  title: string;
  prompt: string;
  options: { id: string; label: string; emoji?: string }[];
  selectedIndex: number | null;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="bg-[#F7F8FA] border border-gray-200 rounded-3xl p-6 md:p-10 shadow-sm text-left">
      <h2 className="text-xl md:text-2xl font-extrabold text-[#1A2534] mb-2">{title}</h2>
      <p className="text-sm text-gray-500 mb-6 font-medium">{prompt}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isSelected = selectedIndex === i;
          return (
            <button
              key={opt.id + i}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 text-left font-semibold text-sm transition-all duration-200 group
                ${isSelected
                  ? "bg-[#1A2534] border-[#1A2534] text-white shadow-[4px_4px_0px_#E56668]"
                  : "bg-white border-gray-200 text-[#1A2534] hover:border-[#1A2534] hover:shadow-[4px_4px_0px_#1A2534] hover:-translate-y-0.5"
                }`}
            >
              {opt.emoji && (
                <span className="text-xl shrink-0">{opt.emoji}</span>
              )}
              <span className="flex-1 leading-snug">{opt.label}</span>
              {isSelected && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#E56668] flex items-center justify-center">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RESULT VIEW (inline, no page redirect)
// ─────────────────────────────────────────────
function ResultView({
  scoreMap,
  dailyTarget,
  onRestart,
}: {
  scoreMap: Record<string, number>;
  dailyTarget: number;
  onRestart: () => void;
}) {
  const achievement = generateAchievement(scoreMap);
  const programs    = getRecommendedPrograms(scoreMap);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto space-y-6"
    >
      {/* Hero result card */}
      <div className="bg-[#1A2534] rounded-3xl overflow-hidden border-2 border-[#1A2534] shadow-[8px_8px_0px_#E56668]">
        {/* Mascot */}
        <div className="flex justify-center pt-8 pb-3 bg-[#1A2534]">
          <Image
            src="/images/contents/mascot/elco.svg"
            alt="Elco IELS Mascot"
            width={140}
            height={140}
            className="drop-shadow-2xl"
          />
        </div>

        <div className="px-8 pb-8 text-white text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            {achievement.title}
          </h2>
          <p className="text-white/80 text-base leading-relaxed max-w-md mx-auto">
            {achievement.text}
          </p>

          {/* Daily commitment badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-5 py-2 text-sm font-bold text-white mt-2">
            ⏱️ Your daily commitment: {dailyTarget} min/day
          </div>
        </div>
      </div>

      {/* Recommended programs */}
      <div>
        <h3 className="text-lg font-extrabold text-[#1A2534] mb-3 text-center uppercase tracking-widest text-xs">
          Recommended for You
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {programs.map((prog) => (
            <Link
              key={prog.href}
              href={prog.href}
              className={`${prog.accent} rounded-2xl p-5 text-white border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#E56668] transition-all duration-300 flex flex-col gap-3 group`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/15 border border-white/20 px-3 py-1 rounded-full w-fit">
                {prog.tag}
              </span>
              <h4 className="font-extrabold text-lg leading-tight">{prog.name}</h4>
              <p className="text-white/80 text-xs leading-relaxed flex-1">{prog.desc}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-white/70 group-hover:text-white group-hover:gap-2 transition-all">
                Learn more <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Auth CTAs */}
      <div className="bg-[#F7F8FA] border border-gray-200 rounded-3xl p-6 text-center space-y-4">
        <p className="text-[#1A2534] font-bold text-lg">
          Ready to start your journey?
        </p>
        <p className="text-gray-500 text-sm">
          Create your IELS account to track your goals, join programs, and celebrate every milestone.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E56668] text-white font-extrabold px-8 py-3 border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] hover:shadow-[6px_6px_0px_#1A2534] hover:-translate-y-1 transition-all duration-300 group"
          >
            Create an Account
            <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-full bg-white text-[#1A2534] font-extrabold px-8 py-3 border-2 border-[#1A2534] shadow-[4px_4px_0px_#1A2534] hover:bg-[#1A2534] hover:text-white hover:shadow-[6px_6px_0px_#E56668] hover:-translate-y-1 transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
        <button
          onClick={onRestart}
          className="text-xs text-gray-400 hover:text-[#E56668] transition-colors font-medium underline underline-offset-4 mt-2 inline-block"
        >
          Retake the quiz
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// DAILY COMMITMENT SLIDER
// ─────────────────────────────────────────────
function DailySlider({
  dailyTarget,
  setDailyTarget,
  onBack,
  onFinish,
}: {
  dailyTarget: number;
  setDailyTarget: (v: number) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  const label =
    dailyTarget < 60
      ? `${dailyTarget} minutes`
      : dailyTarget === 60
      ? "1 hour"
      : `${Math.floor(dailyTarget / 60)}h ${dailyTarget % 60 > 0 ? `${dailyTarget % 60}min` : ""}`.trim();

  return (
    <motion.div
      key="slider"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="bg-[#F7F8FA] border border-gray-200 rounded-3xl p-6 md:p-10 shadow-sm">
        <div className="text-center space-y-2 mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1A2534]">
            Your Daily Learning Commitment
          </h2>
          <p className="text-gray-500 text-sm font-medium max-w-sm mx-auto">
            Small, consistent effort beats motivation. Choose a target you can realistically stick to — even on busy days.
          </p>
        </div>

        {/* Value display */}
        <div className="text-center mb-8">
          <p className="text-5xl sm:text-6xl font-black text-[#E56668] leading-none tracking-tighter">
            {label}
          </p>
          <p className="text-sm text-gray-400 mt-2 font-medium">per day</p>
        </div>

        {/* Slider */}
        <div className="px-2">
          <input
            type="range"
            min={DAILY_TARGET.min}
            max={DAILY_TARGET.max}
            step={DAILY_TARGET.step}
            value={dailyTarget}
            onChange={(e) => setDailyTarget(Number(e.target.value))}
            className="
              w-full appearance-none bg-transparent cursor-pointer
              [&::-webkit-slider-runnable-track]:h-3
              [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-runnable-track]:bg-gray-200
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-7
              [&::-webkit-slider-thumb]:h-7
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-4
              [&::-webkit-slider-thumb]:border-[#E56668]
              [&::-webkit-slider-thumb]:shadow-[2px_2px_0px_#1A2534]
              [&::-webkit-slider-thumb]:-mt-[8px]
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110
              [&::-moz-range-track]:h-3
              [&::-moz-range-track]:rounded-full
              [&::-moz-range-track]:bg-gray-200
              [&::-moz-range-thumb]:w-7
              [&::-moz-range-thumb]:h-7
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-4
              [&::-moz-range-thumb]:border-[#E56668]
              [&::-moz-range-thumb]:cursor-pointer
            "
          />
          {/* Tick labels */}
          <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-3 px-1">
            <span>15 min</span>
            <span>1 hour</span>
            <span>3 hours</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 font-medium">
          💡 Even 15–30 minutes daily compounds into real, measurable progress.
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center rounded-full border-2 border-[#1A2534] bg-white text-[#1A2534] font-bold px-8 py-3 shadow-[3px_3px_0px_#1A2534] hover:bg-[#1A2534] hover:text-white transition-all duration-200 active:scale-[0.97]"
        >
          Back
        </button>
        <button
          onClick={onFinish}
          className="inline-flex items-center justify-center rounded-full bg-[#E56668] text-white font-bold px-8 py-3 border-2 border-[#1A2534] shadow-[3px_3px_0px_#1A2534] hover:shadow-[5px_5px_0px_#1A2534] hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97]"
        >
          See My Results
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function StartPage() {
  const total = QUESTIONS.length;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(total).fill(null));
  const [dailyTarget, setDailyTarget] = useState<number>(30);
  const [scoreMap, setScoreMap] = useState<Record<string, number> | null>(null);

  // PHASE: "quiz" | "slider" | "result"
  const phase =
    scoreMap !== null ? "result" : step < total ? "quiz" : "slider";

  const handleSelect = (index: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = index;
      return next;
    });
  };

  const onNext = () => {
    if (answers[step] === null) return;
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      setStep(total); // go to slider
    }
  };

  const onBack = () => {
    if (phase === "slider") {
      setStep(total - 1);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  };

  const onFinish = () => {
    const scores: Record<string, number> = {};
    QUESTIONS.forEach((q, qi) => {
      const sel = answers[qi];
      if (sel === null) return;
      const points = q.options[sel].points ?? {};
      Object.entries(points).forEach(([k, v]) => {
        scores[k] = (scores[k] || 0) + (v ?? 0);
      });
    });
    setScoreMap(scores);
  };

  const onRestart = () => {
    setStep(0);
    setAnswers(Array(total).fill(null));
    setDailyTarget(30);
    setScoreMap(null);
  };

  return (
    // Dihapus 'justify-center' agar konten sejajar wajar dari atas, 'pt-[120px]' diganti jadi 'pt-24 md:pt-32'
    <main className="min-h-screen flex flex-col items-center bg-white text-[#1A2534] px-6 pt-14 md:pt-20 pb-25">
      <div className="w-full max-w-2xl">

        {/* Header — only during quiz / slider */}
        {phase !== "result" && (
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 leading-tight">
              Let's Find Your{" "}
              <span className="text-[#E56668]">English Journey!</span>
            </h1>
            <p className="text-base text-gray-500 max-w-xl mx-auto font-medium">
              Answer a few friendly questions — takes under 2 minutes.
              Your result will be <strong className="text-[#1A2534]">personalized</strong> to your actual goals.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── QUIZ PHASE ── */}
          {phase === "quiz" && (
            <motion.div
              key={`q-${step}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28 }}
              className="space-y-6"
            >
              <ProgressBar step={step} total={total} />

              <QuestionCard
                title={`${QUESTIONS[step].id}. ${QUESTIONS[step].title}`}
                prompt={QUESTIONS[step].prompt}
                options={QUESTIONS[step].options}
                selectedIndex={answers[step]}
                onSelect={handleSelect}
              />

              <div className="flex gap-3 justify-center">
                <button
                  onClick={onBack}
                  className="inline-flex items-center justify-center rounded-full border-2 border-[#1A2534] bg-white text-[#1A2534] font-bold px-8 py-3 shadow-[3px_3px_0px_#1A2534] hover:bg-[#1A2534] hover:text-white transition-all duration-200 active:scale-[0.97]"
                >
                  Back
                </button>
                <button
                  onClick={onNext}
                  disabled={answers[step] === null}
                  className="inline-flex items-center justify-center rounded-full bg-[#E56668] text-white font-bold px-8 py-3 border-2 border-[#1A2534] shadow-[3px_3px_0px_#1A2534] hover:shadow-[5px_5px_0px_#1A2534] hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0px_#1A2534]"
                >
                  {step === total - 1 ? "Next" : "Next"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SLIDER PHASE ── */}
          {phase === "slider" && (
            <DailySlider
              dailyTarget={dailyTarget}
              setDailyTarget={setDailyTarget}
              onBack={onBack}
              onFinish={onFinish}
            />
          )}

          {/* ── RESULT PHASE ── */}
          {phase === "result" && scoreMap !== null && (
            <ResultView
              scoreMap={scoreMap}
              dailyTarget={dailyTarget}
              onRestart={onRestart}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}