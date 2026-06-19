// src/app/quiz/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QuizStep from "./QuizStep";
import ResultCard from "./ResultCard";
import { SCENES, PERSONAS, type PersonaId, getPersona } from "@/data/personas";
import * as htmlToImage from "html-to-image";

type Phase = "intro" | "quiz" | "result";

export default function QuizPage() {
  const total = SCENES.length;
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>(
    Array(total).fill(null)
  );

  const [scores, setScores] = useState<Record<PersonaId, number>>({
    yankee: 0,
    british: 0,
    aussie: 0,
    german: 0,
    samurai: 0,
    kwave: 0,
    maple: 0,
    parisian: 0,
  });

  const handleSelect = (index: number) => {
    setSelected((prev) => {
      const next = [...prev];
      next[step] = index;
      return next;
    });
  };

  useEffect(() => {
    const newScores: Record<PersonaId, number> = {
      yankee: 0,
      british: 0,
      aussie: 0,
      german: 0,
      samurai: 0,
      kwave: 0,
      maple: 0,
      parisian: 0,
    };

    selected.forEach((choiceIndex, i) => {
      if (choiceIndex === null) return;
      const scene = SCENES[i];
      const picked = scene.options[choiceIndex];
      Object.entries(picked.score).forEach(([pid, pts]) => {
        newScores[pid as PersonaId] += pts || 0;
      });
    });

    setScores(newScores);
  }, [selected]);

  const onNext = () => {
    if (selected[step] === null) return;
    const last = total - 1;
    if (step < last) setStep((s) => s + 1);
    else setPhase("result");
  };

  const onBack = () => step > 0 && setStep((s) => s - 1);
  const onRestart = () => {
    setPhase("intro");
    setStep(0);
    setSelected(Array(total).fill(null));
  };

  const topPersona = useMemo(() => {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [id] = sorted[0] as [PersonaId, number];
    return getPersona(id);
  }, [scores]);

  const cardRef = useRef<HTMLDivElement>(null);
  const onDownload = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = "IELS-Quiz-Result.png";
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Error generating image:", e);
    }
  };

  return (
    // Tambah flex flex-col justify-center biar otomatis rata tengah vertikal
    <div className="min-h-screen bg-[#F7F8FA] relative overflow-hidden flex flex-col justify-center py-12 lg:py-24">
      {/* Animated background shapes - Subtle IELS Colors */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#E56668] rounded-full mix-blend-multiply opacity-10 blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#2F4157] rounded-full mix-blend-multiply opacity-10 blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: "1s" }}></div>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700;800&family=Quicksand:wght@400;500;600;700&display=swap');
        
        * { font-family: 'Quicksand', sans-serif; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Fredoka', sans-serif; }
        
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-slideInUp { animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-bounce-slow { animation: bounce 3s ease-in-out infinite; }
      `}</style>

      {/* Hapus py-8 md:py-12 lama biar ngikutin padding dari parent utamanya aja */}
      <div className="relative z-10 px-4 w-full">
        <div className="max-w-4xl mx-auto">
          
          {/* ================== INTRO ================== */}
          {phase === "intro" && (
            <div className="animate-slideInUp">
              {/* Top Badge */}
              <div className="text-center mb-8">
                <span className="inline-block px-6 py-2 bg-[#2F4157] text-white rounded-full text-sm font-bold shadow-md">
                  🎮 GAME-STYLE PERSONALITY QUIZ
                </span>
              </div>

              {/* Main Header */}
              <div className="text-center mb-10">
                <h1 className="text-5xl md:text-6xl font-black text-[#2F4157] mb-4 drop-shadow-sm leading-tight">
                  🌟 Find Your<br />
                  <span className="inline-block mt-2 px-6 py-2 rounded-[2rem] bg-[#E56668] text-white animate-bounce-slow shadow-lg">
                    IELS PERSONA
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-600 font-bold">
                  Discover Your Learning Superpower! 🚀
                </p>
              </div>

              {/* Main Card (Navy Background) */}
              <div className="bg-[#2F4157] rounded-[32px] shadow-2xl overflow-hidden mb-8 transform hover:scale-[1.01] transition-transform duration-300">
                <div className="p-8 md:p-12">
                  
                  {/* Mascot & Title */}
                  <div className="flex flex-col md:flex-row items-center gap-8 mb-10 text-center md:text-left">
                    <div className="flex-shrink-0 animate-bounce-slow bg-white/10 p-4 rounded-full border border-white/20">
                      <img
                        src="/images/logos/iels_white1.png"
                        alt="Quiz Mascot"
                        className="w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-xl"
                      />
                    </div>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
                        Your Global English Journey Starts Here! 🚀
                      </h2>
                      <p className="text-white/80 text-lg font-medium">
                        Answer 10 fun questions & unlock your unique learning style!
                      </p>
                    </div>
                  </div>

                  {/* Feature List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                    {[
                      { icon: "🎯", text: "10 Quick, Fun Questions" },
                      { icon: "🎨", text: "Discover Your Persona" },
                      { icon: "📚", text: "Personalized Study Path" },
                      { icon: "🌟", text: "Share Your Badge" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#E56668] hover:bg-white/10 transition-all duration-300"
                      >
                        <span className="text-3xl">{item.icon}</span>
                        <p className="text-white font-bold text-base">{item.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button (Red) */}
                  <button
                    onClick={() => setPhase("quiz")}
                    className="w-full px-8 py-5 bg-[#E56668] hover:bg-[#C04C4E] text-white font-black text-xl rounded-2xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 transition-all duration-200"
                  >
                    START QUIZ NOW →
                  </button>
                </div>
              </div>

              {/* Stats Footer */}
              <div className="text-center mt-10">
                <p className="text-[#2F4157] font-black text-lg mb-4">
                  ⭐ Played by 50K+ Students Worldwide
                </p>
                <div className="flex justify-center gap-4 flex-wrap">
                  {["🌍 180+ Countries", "👥 50K+ Players", "⭐ 4.9/5 Rating"].map((badge) => (
                    <span key={badge} className="px-5 py-2 bg-white rounded-full text-[#2F4157] font-bold border border-gray-200 shadow-sm text-sm">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================== QUIZ ================== */}
          {phase === "quiz" && (
            <div className="animate-slideInUp">
              <div className="text-center mb-8">
                <h2 className="text-4xl md:text-5xl font-black text-[#2F4157] mb-2">
                  🎮 Question Time!
                </h2>
                <p className="text-gray-600 text-lg font-bold">
                  Step {step + 1} of {total} — What would you do?
                </p>
              </div>

              <QuizStep
                step={step}
                total={total}
                image={SCENES[step].image}
                title={`${SCENES[step].id}. ${SCENES[step].title}`}
                prompt={SCENES[step].prompt}
                options={SCENES[step].options.map((o) => ({ label: o.label }))}
                selectedIndex={selected[step]}
                onSelect={handleSelect}
                onNext={onNext}
                onBack={onBack}
              />
            </div>
          )}

          {/* ================== RESULT ================== */}
          {phase === "result" && (
            <div className="animate-slideInUp">
              <ResultCard ref={cardRef} persona={topPersona} onRestart={onRestart} />

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <button
                  onClick={onDownload}
                  className="w-full sm:w-auto px-8 py-4 bg-[#E56668] hover:bg-[#C04C4E] text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0"
                >
                  📥 Download Badge
                </button>
                <button
                  onClick={onRestart}
                  className="w-full sm:w-auto px-8 py-4 bg-[#2F4157] hover:bg-[#1e2a38] text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 active:translate-y-0"
                >
                  🔄 Try Again
                </button>
              </div>

              {/* Score breakdown */}
              <div className="max-w-2xl mx-auto mt-10">
                <details className="bg-white rounded-2xl p-6 shadow-md cursor-pointer group border-2 border-gray-100 hover:border-[#2F4157] transition-all">
                  <summary className="font-black text-lg text-[#2F4157] flex items-center justify-between list-none">
                    <span>📊 See Your Full Score Breakdown</span>
                    <span className="text-2xl group-open:rotate-180 transition-transform">↓</span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 border-t border-gray-100 pt-6">
                    {PERSONAS.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#E56668] transition-all"
                      >
                        <span className="text-[#2F4157] font-bold">{p.title}</span>
                        <span className="px-3 py-1 bg-[#2F4157] text-white rounded-lg font-black text-sm shadow-sm">
                          {scores[p.id]} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}