"use client";

import { useState } from "react";
import { PlayCircle, Clock, BookOpen, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Pagination from "@/components/Pagination";

interface MasterClassSectionProps {
  className?: string;
}

const masterClassVideos = [
  {
    id: 1,
    title: "Episode 1: IELTS Foundations & Essential Tips",
    description: "A comprehensive overview of the mental preparation and practical planning needed to succeed in the IELTS test.",
    duration: "12 mins",
    instructor: "Christopher Pell",
    youtubeId: "5BJmUQFt0FI",
    completed: false,
  },
  {
    id: 2,
    title: "Episode 2: The Ultimate Listening Strategy",
    description: "Master the core techniques required to handle all Listening question types and stay focused during the exam.",
    duration: "13 mins",
    instructor: "Christopher Pell",
    youtubeId: "gfTqr_9BMjs",
    completed: false,
  },
  {
    id: 3,
    title: "Episode 3: Reading Tricks & Time Management",
    description: "Learn how to effectively skim and scan academic texts while avoiding common traps in the Reading section.",
    duration: "15 mins",
    instructor: "Christopher Pell",
    youtubeId: "G8Y2liwGRl8",
    completed: false,
  },
  {
    id: 4,
    title: "Episode 4: Mastering Writing Task 2",
    description: "A deep dive into essay structuring, argumentation, and meeting the specific criteria for a Band 7+ score.",
    duration: "43 mins",
    instructor: "Christopher Pell",
    youtubeId: "ROmQsqmeUB8",
    completed: false,
  },
  {
    id: 5,
    title: "Episode 5: Speaking Secrets & Confidence",
    description: "Unlock the secrets to natural delivery and learn how to provide high-level responses in all three Speaking parts.",
    duration: "11 mins",
    instructor: "Christopher Pell",
    youtubeId: "ELxGmf9f_ZM",
    completed: false,
  },
];

const getYoutubeThumbnail = (id: string) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;

export default function MasterClassSection({ className }: MasterClassSectionProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 2; // Set how many videos to show per page

  // Pagination Logic
  const offset = currentPage * itemsPerPage;
  const currentVideos = masterClassVideos.slice(offset, offset + itemsPerPage);
  const pageCount = Math.ceil(masterClassVideos.length / itemsPerPage);

  const handlePageChange = ({ selected }: { selected: number }) => {
    setCurrentPage(selected);
    // Optional: Scroll back to top of section when page changes
    const element = document.getElementById("master-class-grid");
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className={cn("mb-12", className)}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#E56668] font-bold text-sm uppercase tracking-wider mb-2">
            <Sparkles size={16} />
            Premium Access
          </div>
          <h2 className="text-3xl font-bold text-[#304156] font-geologica">
            IELTS Master Class
          </h2>
          <p className="text-gray-500 mt-1">
            Expert-led video lessons to boost your IELTS score.
          </p>
        </div>
        <div className="px-4 py-2 bg-[#F7F8FA] border border-[#E3E7ED] rounded-full">
          <p className="text-sm font-bold text-[#553223]">
            {masterClassVideos.length} Modules Available
          </p>
        </div>
      </div>

      {/* Video Grid */}
      <div id="master-class-grid" className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
        {currentVideos.map((video) => (
          <div
            key={video.id}
            className="bg-white rounded-2xl border border-[#E3E7ED]/50 shadow-sm hover:shadow-xl transition-all overflow-hidden group flex flex-col"
          >
            {/* Thumbnail Box */}
            <div className="relative aspect-video overflow-hidden">
              <img 
                src={getYoutubeThumbnail(video.youtubeId)} 
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-[#304156]/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircle size={60} className="text-white drop-shadow-2xl" />
              </div>
              
              <div className="absolute top-3 right-3 px-3 py-1 bg-[#304156]/80 backdrop-blur-md rounded-lg text-white text-xs font-bold flex items-center gap-1">
                <Clock size={12} />
                {video.duration}
              </div>

              {video.completed && (
                <div className="absolute top-3 left-3 px-3 py-1 bg-[#E56668] rounded-lg text-white text-xs font-bold flex items-center gap-1 shadow-lg">
                  <CheckCircle2 size={12} />
                  Completed
                </div>
              )}
            </div>

            {/* Content Box */}
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-[#304156] mb-3 line-clamp-2 leading-tight group-hover:text-[#E56668] transition-colors">
                {video.title}
              </h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed">
                {video.description}
              </p>

              <div className="mt-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#F7F8FA] rounded-full flex items-center justify-center border border-[#E3E7ED]">
                    <BookOpen size={16} className="text-[#553223]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-tighter text-gray-400 font-bold">Instructor</p>
                    <p className="text-sm font-bold text-[#304156]">{video.instructor}</p>
                  </div>
                </div>

                <a
                  href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d65557] shadow-md hover:shadow-red-200 transition-all active:scale-95"
                >
                  <PlayCircle size={18} />
                  Watch
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Component */}
      {pageCount > 1 && (
        <Pagination 
          pageCount={pageCount} 
          onPageChange={handlePageChange} 
          currentPage={currentPage} 
        />
      )}

      {/* Custom IELS Style Banner */}
      <div className="mt-12 p-8 bg-[#304156] rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-full bg-[#577E90]/20 skew-x-12 translate-x-20 transition-transform group-hover:translate-x-10 duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-[#E56668] rounded-2xl flex items-center justify-center shadow-xl rotate-3">
            <PlayCircle size={32} className="text-white" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-xl font-bold text-white mb-1 font-geologica">
              Unlock Your Potential with IELS Weekly Updated Classes
            </h4>
            <p className="text-[#577E90] font-medium">
              We add new materials every week to ensure you get the best preparation.
            </p>
          </div>
          <button className="px-8 py-3 bg-[#E56668] text-white rounded-xl font-bold hover:bg-[#d65557] transition-all shadow-lg hover:shadow-red-900/40">
            Notify Me
          </button>
        </div>
      </div>
    </div>
  );
}