// src/app/quiz/QuizStep.tsx
"use client";

import React from "react";

type Props = {
  step: number;
  total: number;
  title: string;
  image?: string;
  prompt: string;
  options: { label: string }[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onNext: () => void;
  onBack: () => void;
};

export default function QuizStep({
  step,
  total,
  title,
  prompt,
  image,
  options,
  selectedIndex,
  onSelect,
  onNext,
  onBack,
}: Props) {
  const progress = Math.round(((step + 1) / total) * 100);

  return (
    <div className="max-w-3xl mx-auto">
      <style>{`
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* Kita taruh animasi muncul di bungkusnya, bukan di tombolnya */
        .option-wrapper {
          animation: slideInFromLeft 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      {/* Progress section - CLEAN IELS STYLE */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black text-[#2F4157] uppercase tracking-wider">
            🎮 Question {step + 1} of {total}
          </span>
          <span className="px-3 py-1 bg-[#E56668]/10 text-[#E56668] font-black rounded-full text-xs tracking-wide">
            {progress}% COMPLETED
          </span>
        </div>
        
        {/* Clean progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 bg-[#E56668] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-4 flex-wrap">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i < step 
                  ? "bg-[#E56668] flex-1" 
                  : i === step 
                  ? "bg-[#2F4157] w-6 animate-pulse" 
                  : "bg-gray-200 w-2"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main content card - WHITE & HIGH CONTRAST */}
      <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-gray-50">
        

        {/* Title and prompt */}
        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black text-[#2F4157] mb-3 leading-tight">
            {title}
          </h2>
          <p className="text-gray-600 text-lg font-semibold leading-relaxed">
            {prompt}
          </p>
        </div>

        {/* Options - CLEAN INTERFACE WITH STRONG CONTRAST */}
        <div className="space-y-3 mb-10">
          {options.map((o, idx) => {
            const isSelected = selectedIndex === idx;

            return (
              <div 
                key={idx} 
                className="option-wrapper" 
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <button
                  onClick={() => onSelect(idx)}
                  className={`group w-full rounded-2xl px-6 py-5 text-left transition-all duration-200 font-bold border-2 text-base md:text-lg ${
                    isSelected
                      ? "bg-[#E56668] border-[#E56668] shadow-md transform scale-[1.02]"
                      : "bg-white border-gray-200 hover:border-[#E56668] hover:bg-gray-50 hover:shadow-sm active:scale-[0.98]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Bulatan Huruf */}
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm shrink-0 transition-colors ${
                      isSelected
                        ? "bg-white text-[#E56668]"
                        : "bg-[#F7F8FA] text-[#2F4157] group-hover:bg-[#E56668]/10 group-hover:text-[#E56668]"
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    
                    {/* Teks Opsi */}
                    <span className={`leading-snug transition-colors ${
                      isSelected 
                        ? "text-white" 
                        : "text-[#2F4157] group-hover:text-[#E56668]"
                    }`}>
                      {o.label}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-100">
          <button
            onClick={onBack}
            disabled={step === 0}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 text-sm md:text-base ${
              step === 0
                ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                : "text-[#2F4157] bg-gray-100 hover:bg-gray-200 active:scale-95"
            }`}
          >
            ← Back
          </button>

          <button
            onClick={onNext}
            disabled={selectedIndex === null}
            className={`px-8 py-3 rounded-xl font-black transition-all duration-200 text-sm md:text-base ${
              selectedIndex === null
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#2F4157] hover:bg-[#1e2a38] text-white shadow-md hover:shadow-lg active:scale-95 transform hover:-translate-y-0.5"
            }`}
          >
            {step + 1 === total ? "See Result →" : "Next →"}
          </button>
        </div>
      </div>

      {/* Motivational tip */}
      <div className="text-center mt-6">
        <p className="text-[#2F4157] font-bold text-sm bg-white border border-gray-200 shadow-sm px-6 py-3 rounded-full inline-block">
          💡 No wrong answers! Just pick what feels right.
        </p>
      </div>
    </div>
  );
}