"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, MapPin, Rocket, Globe } from "lucide-react";

/* ===== CONFIG ===== */
const IS_ENABLED = true;
// Updated registration deadline to 21 September 2026 23:59
const DEADLINE = new Date("2026-09-21T23:59:59+07:00");
const STORAGE_KEY = "iels-gif-popup-state";

/* ===== COUNTDOWN ===== */
function CountdownTimer() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    setTimeLeft(DEADLINE.getTime() - new Date().getTime());

    const timer = setInterval(() => {
      setTimeLeft(DEADLINE.getTime() - new Date().getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (timeLeft === null) return null; 

  if (timeLeft <= 0) {
    return (
      <span className="text-[#914D4D] font-bold text-sm bg-[#914D4D]/10 px-4 py-2 rounded-full">
        Registration Closed
      </span>
    );
  }

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <div className="flex gap-2 justify-center">
      {[
        ["Days", days],
        ["Hours", hours],
        ["Min", minutes],
        ["Sec", seconds],
      ].map(([label, value]) => (
        <div
          key={label}
          className="bg-[#304156]/5 border border-[#304156]/10 rounded-xl px-3 py-2 w-16 text-center shadow-sm"
        >
          <div className="text-xl font-extrabold text-[#304156]" suppressHydrationWarning>
            {value}
          </div>
          <p className="text-[9px] uppercase tracking-wider text-[#914D4D] font-bold mt-0.5">
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ===== POPUP ===== */
export default function GIFPopup() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // LOGIKA DINAMIS UNTUK LINK CTA
  // Jika dibuka di /dashboard, arahkan ke /dashboard/gif. Selain itu arahkan ke /events/gif/batch2.
  const targetUrl = pathname === "/dashboard" ? "/dashboard/gif" : "/events/gif/batch2";

  useEffect(() => {
    if (!IS_ENABLED) return;
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "minimized") {
      setIsMinimized(true);
    } else if (!saved) {
      setTimeout(() => setIsOpen(true), 1200); // Muncul setelah 1.2 detik
    }
  }, []);

  const minimize = () => {
    setIsOpen(false);
    setIsMinimized(true);
    localStorage.setItem(STORAGE_KEY, "minimized");
  };

  const reopen = () => {
    setIsMinimized(false);
    setIsOpen(true);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!IS_ENABLED) return null;

  return (
    <>
      {/* ===== MODAL ===== */}
      <div
        className={`
          fixed inset-0 z-[100]
          flex items-center justify-center px-4
          transition-all duration-300 ease-out
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
      >
        {/* OVERLAY */}
        <div
          onClick={minimize}
          className={`
            absolute inset-0 bg-[#304156]/60 backdrop-blur-sm
            transition-opacity duration-300
            ${isOpen ? "opacity-100" : "opacity-0"}
          `}
        />

        {/* MODAL CONTAINER */}
        <div
          className={`
            relative z-10 w-full max-w-md max-h-[90vh]
            bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)]
            flex flex-col overflow-hidden border border-white/20
            transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
            ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8"}
          `}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#2F4055] to-[#304156] border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFD1D1]" />
              <p className="text-sm font-bold text-white tracking-wide">
                GIF Singapore Batch 2
              </p>
            </div>
            <button
              onClick={minimize}
              className="text-white/60 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full w-7 h-7 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <Image
              src="/images/contents/events/gif2.png" 
              alt="GIF Singapore Poster"
              width={1080}
              height={1080}
              className="w-full h-auto object-cover"
              priority
            />
            <div className="px-6 py-5 bg-white text-center">
               <div className="inline-flex items-center gap-1.5 bg-[#304156]/10 px-3 py-1 rounded-md mb-3">
                 <Globe className="w-3 h-3 text-[#304156]" />
                 <span className="text-[10px] font-bold text-[#304156] uppercase tracking-wider">Self-Funded • SEA Youth</span>
               </div>
               <h3 className="text-xl font-extrabold text-[#304156] mb-2 leading-tight">
                 Global Impact Fellowship <br/><span className="text-[#914D4D]">Batch 2 in Singapore 🇸🇬</span>
               </h3>
               <p className="text-sm text-gray-600 leading-relaxed mb-4">
                 Join a 4 Days 3 Nights exclusive leadership & project incubation boot camp at the National University of Singapore (NUS). Open for youth across Southeast Asia!
               </p>
               <div className="inline-flex items-center gap-2 bg-[#304156]/5 px-3 py-1.5 rounded-lg border border-[#304156]/10">
                 <MapPin className="w-4 h-4 text-[#914D4D]" />
                 <span className="text-xs font-bold text-[#304156]">17 – 20 Nov 2026</span>
               </div>
            </div>
          </div>

          {/* FOOTER (STICKY) */}
          <div className="border-t border-gray-100 px-6 py-5 bg-white space-y-5 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] relative z-20">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#914D4D] mb-2">
                Registration Closes In:
              </p>
              <CountdownTimer />
            </div>

            <Link
              href={targetUrl}
              onClick={minimize}
              className="
                flex items-center justify-center gap-2 w-full
                rounded-full bg-gradient-to-r from-[#914D4D] to-[#7a3e3e]
                text-white py-3.5 font-bold text-base shadow-lg shadow-[#914D4D]/30
                hover:shadow-xl hover:scale-[1.02] hover:from-[#7a3e3e] hover:to-[#914D4D]
                transition-all duration-300 active:scale-[0.98]
              "
            >
              View Program Details
              <Rocket className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ===== MINIMIZED BUBBLE ===== */}
      <div
        className={`
          fixed bottom-6 right-6 z-[90]
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isMinimized ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}
        `}
      >
        <button
          onClick={reopen}
          className="
            flex items-center gap-3 bg-[#304156] text-white shadow-[0_10px_25px_rgba(48,65,86,0.4)]
            rounded-full px-5 py-3.5 hover:scale-105 active:scale-95 transition-transform border border-white/10 group
          "
        >
          <div className="bg-[#914D4D] rounded-full p-1.5 shadow-inner">
            <Rocket className="w-4 h-4 text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <span className="hidden sm:inline text-sm font-bold tracking-wide">
            GIF Singapore Batch 2
          </span>
          <div className="flex h-3 w-3 relative ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD1D1] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#E56668]"></span>
          </div>
        </button>
      </div>
    </>
  );
}