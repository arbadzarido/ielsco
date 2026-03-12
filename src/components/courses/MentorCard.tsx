"use client";
// src/components/courses/MentorCard.tsx

import Image from "next/image";
import Link from "next/link";
import { Mentor, TRACK_META, CourseTrack } from "@/data/courses";
import { ArrowRight, Instagram, Linkedin } from "lucide-react";

interface MentorCardProps {
  mentor: Mentor;
  onSelectTrack?: (track: CourseTrack) => void;
}

export default function MentorCard({ mentor, onSelectTrack }: MentorCardProps) {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col group h-full">
      
      {/* ── PHOTO CONTAINER ── */}
      <div className="relative h-72 sm:h-80 bg-gradient-to-br from-[#2F4157] to-[#1e2a38] overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 z-0"
          style={{ backgroundImage: "radial-gradient(circle at 70% 80%, #E56668 0%, transparent 60%)" }} 
        />
        
        <Image
          src={mentor.image}
          alt={mentor.name}
          fill
          className="object-cover object-top scale-100 group-hover:scale-105 transition-transform duration-500 z-10"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e2a38]/90 via-[#1e2a38]/20 to-transparent z-20" />
        <div className="absolute bottom-4 left-5 right-5 z-30">
          <p className="font-black text-white text-xl sm:text-2xl leading-tight mb-1">{mentor.name}</p>
          <p className="text-xs sm:text-sm text-white/80 font-medium tracking-wide">{mentor.role}</p>
        </div>
      </div>

          <div className="p-5 flex-1 flex flex-col">
        <ul className="space-y-2 mb-4 flex-1">
          {mentor.highlights.map((h, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-gray-600 leading-relaxed">
              <span className="shrink-0">{h.emoji}</span>{h.text}
            </li>
          ))}
        </ul>

    

        <div className="space-y-2 mb-6 mt-auto">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 pl-1">Teaches</p>
          {mentor.tracks.map((trackId) => {
            const t = TRACK_META[trackId];
            return (
              <button
                key={trackId}
                onClick={() => onSelectTrack?.(trackId)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-[#E56668]/40 hover:bg-[#E56668]/5 transition-all text-left group/track shadow-sm"
              >
                <span className="text-lg">{t.emoji}</span>
                <span className="flex-1 text-xs sm:text-sm font-bold text-gray-700">{t.label}</span>
                <ArrowRight size={14} className="text-gray-300 group-hover/track:text-[#E56668] group-hover/track:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Link href={mentor.instagram} target="_blank" className="flex-1 py-2.5 bg-gray-50 hover:bg-pink-50 border border-gray-100 hover:border-pink-200 rounded-xl text-[11px] font-bold text-gray-500 hover:text-pink-600 flex items-center justify-center gap-2 transition-all group/socmed">
            <Instagram size={14} className="group-hover/socmed:scale-110 transition-transform" />
            Instagram
          </Link>
          <Link href={mentor.linkedin} target="_blank" className="flex-1 py-2.5 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl text-[11px] font-bold text-gray-500 hover:text-blue-600 flex items-center justify-center gap-2 transition-all group/socmed">
            <Linkedin size={14} className="group-hover/socmed:scale-110 transition-transform" />
            LinkedIn
          </Link>
        </div>
      </div>
    </div>
  );
}