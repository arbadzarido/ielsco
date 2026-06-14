import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="fixed inset-0 z-[9999] min-h-screen bg-white flex flex-col items-center justify-center p-6 overflow-hidden">
      
      {/* ── MAIN CONTAINER ── */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 max-w-5xl w-full">
        
        {/* ── LEFT: INTERACTIVE MASCOT ── */}
        <div className="relative flex flex-col items-center shrink-0">
          
          {/* Zzz Animation Effects */}
          <div className="absolute -top-6 -right-2 text-blue-300 font-bold text-xl animate-[ping_3s_ease-in-out_infinite_1s]">z</div>
          <div className="absolute -top-10 right-4 text-blue-400 font-bold text-2xl animate-[ping_3s_ease-in-out_infinite_0.5s]">Z</div>
          <div className="absolute -top-16 right-10 text-blue-500 font-bold text-3xl animate-[ping_3s_ease-in-out_infinite]">Z</div>

          {/* Mascot Image (No bounce, just sitting there) */}
          <div className="w-53 h-53 md:w-72 md:h-72 relative z-10">
            <Image 
              src="/images/contents/mascot/sleepy.svg" 
              alt="Sleepy IELS Mascot"
              fill
              className="object-contain drop-shadow-xl"
            />
          </div>
          
          {/* Platform / Soft Shadow (Static) */}
          <div className="w-[80%] h-6 bg-[#2F4157]/5 rounded-[100%] absolute -bottom-2 z-0" />
        </div>

        {/* ── RIGHT: TEXT CONTENT ── */}
        <div className="flex flex-col text-center md:text-left space-y-6 max-w-[420px] animate-in fade-in slide-in-from-right-8 duration-700">
          
          {/* Header Title */}
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black text-[#2F4157] tracking-tight">
              Error 404
            </h1>
            <h2 className="text-xl md:text-2xl font-bold text-[#E56668]">
              Looks like this page is gone...
            </h2>
          </div>
          
          {/* Main Body Text */}
          <div className="text-[#64748B] text-base md:text-[17px] leading-relaxed space-y-4">
            <p>
              Arbadza just pulled this page. Head back to the{' '}
              <Link href="/" className="font-bold text-[#2F4157] hover:text-[#E56668] transition-colors underline decoration-2 underline-offset-4 decoration-[#E56668]/30 hover:decoration-[#E56668]">
                Homepage
              </Link>
              , or catch our latest updates on{' '}
              <a 
                href="https://instagram.com/iels_co" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-[#2F4157] hover:text-[#E56668] transition-colors underline decoration-2 underline-offset-4 decoration-blue-500/30 hover:decoration-blue-500"
              >
                Instagram
              </a>{' '}
              and{' '}
              <a 
                href="https://www.linkedin.com/company/iels-co/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-[#2F4157] hover:text-[#E56668] transition-colors underline decoration-2 underline-offset-4 decoration-blue-500/30 hover:decoration-blue-500"
              >
                LinkedIn
              </a>.
            </p>
          </div>

          {/* ── TINY TEXT (DEVELOPER NOTE) ── */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-slate-400 font-medium tracking-wide leading-relaxed">
              (Psst... If you need more info or think this is a mistake, just reach out to{' '}
              <a 
                href="mailto:arbadza@ielsco.com" 
                className="font-bold text-[#2F4157] hover:text-[#E56668] transition-colors underline decoration-1 underline-offset-2 decoration-gray-300 hover:decoration-[#E56668]"
              >
                arbadza@ielsco.com
              </a> 
              {' '}🛠️)
            </p>
          </div>

        </div>
      </div>

    </main>
  );
}