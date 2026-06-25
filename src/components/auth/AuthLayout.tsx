"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA] px-4 md:px-6 py-12 font-sans">
      
      {/* Container Card Putih */}
      <div className="relative w-full max-w-7xl bg-white rounded-3xl shadow-xl p-7 md:p-14 overflow-hidden">
        
        {/* BUTTON X - Pojok Kiri Atas Card */}
        <button 
          onClick={() => router.push("/")}
          className="absolute top-5 left-5 md:top-8 md:left-8 p-2.5 bg-[#F7F8FA] text-[#2F4157] hover:bg-[#EAEAEA] rounded-full transition-all active:scale-90 z-50 border border-gray-100 shadow-sm"
          title="Back to Home"
        >
          <X size={20} className="md:w-6 md:h-6" />
        </button>

        {/* ---------------------------- */}
        {/* TITLE            */}
        {/* ---------------------------- */}
        <div className="text-center mb-10 mt-4 md:mt-0">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#2F4157] leading-snug">
            Let&apos;s begin your journey ✨
          </h1>

          <p className="text-gray-600 text-base md:text-lg mt-2">
            I&apos;m excited to help you unlock global opportunities.
          </p>
        </div>

        {/* ---------------------------- */}
        {/* RESPONSIVE CONTAINER    */}
        {/* ---------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

          {/* ---------------------------- */}
          {/* MASCOT             */}
          {/* ---------------------------- */}
          <div className="hidden md:flex justify-center md:justify-start w-full">
            <div className="relative w-full h-64 md:h-96 select-none pointer-events-none">
              <Image
                src="/images/contents/mascot/elco.svg"
                alt="IELS Mascot"
                fill
                className="object-contain drop-shadow-xl"
              />
            </div>
          </div>

          {/* ---------------------------- */}
          {/* FORM             */}
          {/* ---------------------------- */}
          <div className="w-full max-w-md mx-auto md:mx-0">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
}