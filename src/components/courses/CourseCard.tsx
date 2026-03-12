"use client";
// src/components/courses/CourseCard.tsx

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CoursePackage, Mentor, TRACK_META, CourseTrack, PRICE_PER_SESSION, GOOGLE_FORM_URL } from "@/data/courses";
import { Check } from "lucide-react";

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

interface CourseCardProps {
  trackId: CourseTrack;
  mentor: Mentor;
  intensive: CoursePackage;
  extensive: CoursePackage;
  onViewCurriculum: (trackId: CourseTrack) => void;
}

export default function CourseCard({ trackId, mentor, intensive, extensive, onViewCurriculum }: CourseCardProps) {
  // State saklar: true = Intensive, false = Extensive
  const [isIntensive, setIsIntensive] = useState(true);
  
  const activePackage = isIntensive ? intensive : extensive;
  const trackMeta = TRACK_META[trackId];

  return (
    <div className="bg-white rounded-[24px] border border-[#2F4157]/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden h-full">
      
      {/* ── HEADER (Navy IELS) ── */}
      <div className="bg-[#2F4157] p-6 text-white relative overflow-hidden flex flex-col">
        {/* Emoji Background (samar-samar) */}
        <div className="absolute -right-2 -top-2 text-7xl opacity-10">{trackMeta.emoji}</div>
        
        <div className="relative z-10 flex flex-col flex-1">
          {/* Tag yang dobel udah dihapus. Dikasih min-h-[56px] biar simetris memanjang */}
          <h3 className="text-xl font-black leading-tight mb-5 pr-8 min-h-[56px] line-clamp-2 mt-1">
            {activePackage.name.replace(/ Intensive| Extensive/gi, "").trim()}
          </h3>
          
          {/* Mentor Profile */}
          <div className="flex items-center gap-3 mt-auto">
            <div className="w-10 h-10 rounded-full overflow-hidden relative border-2 border-[#E56668] shrink-0">
              <Image src={mentor.image} alt={mentor.name} fill className="object-cover object-top" />
            </div>
            <div>
              <p className="text-xs text-white/60 font-medium tracking-wide">Mentored by</p>
              <p className="text-sm font-bold">{mentor.name.split(" ")[0]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── SAKLAR TOGGLE (INTENSIVE VS EXTENSIVE) ── */}
      <div className="p-4 bg-gray-50 border-b border-[#2F4157]/5">
        <div className="flex bg-white rounded-xl p-1 border border-[#2F4157]/10 shadow-sm relative">
          {/* Background slider yang gerak-gerak */}
          <div 
            className="absolute inset-y-1 left-1 bg-[#2F4157] rounded-lg transition-transform duration-300 ease-in-out"
            style={{ 
              width: 'calc(50% - 4px)', 
              transform: isIntensive ? 'translateX(0)' : 'translateX(100%)' 
            }}
          />
          <button 
            onClick={() => setIsIntensive(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg relative z-10 transition-colors ${isIntensive ? 'text-white' : 'text-gray-500 hover:text-[#2F4157]'}`}
          >
            Intensive (8x)
          </button>
          <button 
            onClick={() => setIsIntensive(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg relative z-10 transition-colors ${!isIntensive ? 'text-white' : 'text-gray-500 hover:text-[#2F4157]'}`}
          >
            Extensive (21x)
          </button>
        </div>
      </div>

      {/* ── COURSE DETAILS ── */}
      <div className="p-6 flex-1 flex flex-col bg-white">
        <div className="mb-6 flex-1">
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 mb-5">
            {activePackage.description}
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 text-sm text-[#2F4157] font-medium">
              <span className="bg-[#E56668]/10 p-1 rounded-md shrink-0">
                <Check size={14} className="text-[#E56668]" />
              </span>
              {activePackage.type === 'intensive' ? '1 Month Duration' : '3 Months Duration'}
            </li>
            <li className="flex items-start gap-3 text-sm text-[#2F4157] font-medium">
              <span className="bg-[#E56668]/10 p-1 rounded-md shrink-0">
                <Check size={14} className="text-[#E56668]" />
              </span>
              Free Placement Test & Cert
            </li>
          </ul>
        </div>

        {/* ── PRICE & BUTTONS ── */}
        <div className="mt-auto">
          <div className="flex flex-col mb-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-1 line-through">
              {formatIDR(PRICE_PER_SESSION * (isIntensive ? 8 : 21) * 1.5)}
            </p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-black text-[#2F4157]">
                {formatIDR(PRICE_PER_SESSION * (isIntensive ? 8 : 21))}
              </p>
              <p className="text-[10px] font-bold text-[#E56668] bg-[#E56668]/10 px-2.5 py-1.5 rounded-lg">
                {formatIDR(PRICE_PER_SESSION)} / session
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => onViewCurriculum(trackId)}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-[#2F4157] font-bold text-xs rounded-xl transition-colors"
            >
              Curriculum
            </button>
            <Link 
              href={GOOGLE_FORM_URL} 
              target="_blank"
              className="flex-1 py-3 px-4 bg-[#2F4157] hover:bg-[#1e2a38] text-white font-bold text-xs rounded-xl transition-colors text-center flex items-center justify-center shadow-md hover:shadow-lg"
            >
              Enroll Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}