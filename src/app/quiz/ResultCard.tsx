// src/app/quiz/ResultCard.tsx
"use client";

import React, { forwardRef } from "react";
import type { Persona } from "@/data/personas";

type Props = {
  persona: Persona;
  onRestart: () => void;
};

const ResultCard = forwardRef<HTMLDivElement, Props>(({ persona, onRestart }, ref) => {
  return (
    <div className="max-w-3xl mx-auto">
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .animate-slideInUp { animation: slideInUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>

      <div
        ref={ref}
        className="animate-slideInUp bg-white rounded-3xl overflow-hidden shadow-2xl relative border border-gray-100"
      >
        {/* Navy IELS top header */}
        <div className="h-4 bg-[#2F4157]"></div>

        {/* 2. KARAKTER BESAR (Zoomed & Cropped Cover) */}
        {persona.image && (
          <div className="relative h-64 md:h-80 w-full overflow-hidden border-b-4 border-[#2F4157]">
            {/* Trik Zoom: Ukuran container h-64/h-80.
              Fotonya dibikin cover, di-scale 1.5x (zoom in), 
              lalu diposisikan top agar wajah/badan atas yang kelihatan.
            */}
            <img
              src={persona.image}
              alt={persona.title}
              className="w-full h-full object-cover object-top transform scale-150 origin-top drop-shadow-lg"
            />
            {/* Suble overlay biar teks logo di atasnya kebaca */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            
            {/* Logo IELS di pojok kanan atas karakter */}
            <div className="absolute top-6 right-6 p-2 bg-white/10 backdrop-blur-sm rounded-xl">
                <img
                    src="/images/logos/iels_blue.png"
                    alt="IELS Logo"
                    className="w-16 h-12 object-contain"
                />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8 md:p-12 relative z-10 bg-white">
          {/* 1. WARNA KONTRAS (Navy & Red only) */}
          <div className="mb-10 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-4">
                  <span className="inline-block px-4 py-2 bg-[#E56668]/10 text-[#E56668] text-xs font-black rounded-full border-2 border-[#E56668]/20">
                    🏆 CONGRATULATIONS!
                  </span>
                  <p className="text-gray-600 font-bold text-base mt-1">
                    You found your IELS Superpower! 🌟
                  </p>
              </div>

              <h2 className="text-4xl md:text-6xl font-black text-[#2F4157] mb-2 leading-none">
                {persona.title}
              </h2>
          </div>

          {/* Hashtags - Kontras High */}
          <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-10">
            {persona.hashtags.map((tag, idx) => (
              <span
                key={tag}
                className="text-xs font-black px-4 py-2.5 rounded-full bg-[#2F4157]/5 text-[#2F4157] border border-gray-200"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Description - Kontras High */}
          <div className="mb-12 pb-10 border-b border-gray-100">
            <p className="text-[#2F4157]/80 text-lg md:text-xl leading-relaxed font-semibold">
              {persona.description}
            </p>
          </div>

          {/* Key Traits Section - Navy Headers */}
          <div className="mb-12">
            <h3 className="text-2xl font-black text-[#2F4157] mb-6 flex items-center justify-center md:justify-start gap-2 border-l-4 border-[#E56668] pl-3">
              ⭐ Traits & Superpowers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {persona.traits.map((t) => (
                <div
                  key={t.name}
                  className="bg-[#F7F8FA] rounded-2xl px-6 py-5 border border-gray-100 shadow-sm"
                >
                  <div className="relative z-10 flex items-center justify-between gap-2">
                    <span className="font-black text-[#2F4157] text-base">{t.name}</span>
                    <span className="text-2xl shrink-0" aria-label={`${t.stars} stars`}>
                      {"⭐".repeat(t.stars)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Classes Section - Navy Headers */}
          <div className="mb-12">
            <h3 className="text-2xl font-black text-[#2F4157] mb-6 flex items-center justify-center md:justify-start gap-2 border-l-4 border-[#E56668] pl-3">
              🎓 Recommended Paths
            </h3>
            <div className="space-y-3">
              {persona.classes.map((c, idx) => (
                <div
                  key={c}
                  className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm"
                >
                  <span className="text-white font-black text-lg flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#2F4157]">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-[#2F4157]/90 font-bold leading-relaxed text-base md:text-lg">{c}</span>
                </div>
              ))}
            </div>
          </div>

  {/* CTA Section - Single Strong Call to Action */}
          <div className="pt-8 border-t border-gray-100 mt-12">
            <div className="bg-[#2F4157]/5 rounded-3xl p-6 md:p-8 text-center border border-gray-100">
              <h4 className="text-xl md:text-2xl font-black text-[#2F4157] mb-3">
                Ready to level up your English?
              </h4>
              <p className="text-gray-600 font-medium mb-6 max-w-md mx-auto">
                Join our supportive community, get access to free resources, and start learning with your new persona!
              </p>
              
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center w-full md:w-auto px-10 py-5 rounded-2xl bg-[#E56668] hover:bg-[#C04C4E] text-white font-black text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 active:scale-95 group"
              >
                🚀 Create Free Account & Join Lounge
              </a>
              <p className="text-xs text-gray-500 font-bold mt-4 uppercase tracking-widest">
                Takes less than 1 minute
              </p>
            </div>
          </div>      </div>

      </div>

      {/* Footer message */}
      <div className="text-center mt-8 px-4">
        <p className="text-white font-black text-base drop-shadow-md bg-black/40 backdrop-blur-md px-6 py-3 rounded-full inline-block">
          🎉 Share your result & get friends to discover their persona! 🌟
        </p>
      </div>
    </div>
  );
});

ResultCard.displayName = "ResultCard";
export default ResultCard;