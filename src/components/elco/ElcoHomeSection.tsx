import Image from "next/image";
import { ArrowUpRight, Compass, MessageCircleHeart, Repeat, LineChart } from "lucide-react";
import { ELCO_ENABLED, ELCO_MASCOT, elcoHref } from "@/lib/elco";

// Homepage introduction to Elco AI (ai.ielsco.com). Describes only what Elco actually does today.
const POINTS = [
  { icon: Compass, title: "Guided Learning", body: "A personal plan from your goals and a short baseline check. Elco picks today's activity and tells you why." },
  { icon: MessageCircleHeart, title: "Free Practice", body: "Chat with Elco: daily conversation, interview preparation, academic English, roleplay or writing review." },
  { icon: Repeat, title: "Feedback you can act on", body: "What went well, the most important corrections, and one thing to try again." },
  { icon: LineChart, title: "Progress you can trust", body: "Elco remembers repeated mistakes and marks a skill as improving only when later answers show it." },
];

export function ElcoHomeSection() {
  if (!ELCO_ENABLED) return null;
  return (
    <section id="elco-ai" data-testid="home-elco-section" className="bg-white px-6 py-16 sm:px-12 lg:px-[100px] lg:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <div className="relative flex aspect-square max-h-[420px] w-full items-center justify-center overflow-hidden rounded-[2rem] border border-[#E3E7ED] bg-[#F7F8FA] shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_18px_44px_rgba(47,65,87,0.10)]">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#E56668]/10" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#2F4157]/[0.06]" aria-hidden="true" />
            <Image src={ELCO_MASCOT} alt="Elco, the IELS mascot" width={240} height={235} className="relative h-48 w-auto sm:h-60" />
          </div>
        </div>
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#E56668]/30 bg-[#FDEEEE] px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-[#C04C4E]">
            New · Elco AI
          </span>
          <h2 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-[#1A2534] sm:text-5xl">
            Practise English with Elco,<br />
            <span className="text-[#E56668]">your AI learning companion.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-[#2F4157]/75">
            IELS connects you with people, resources and programs. Elco helps you practise every day between them, with
            feedback and a plan that adapts to you.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3 rounded-2xl border border-[#E3E7ED] bg-white p-4">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-[#577E90]" aria-hidden="true" />
                <div>
                  <p className="font-bold text-[#2F4157]">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#2F4157]/70">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={elcoHref("home")}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="home-elco-cta"
              className="inline-flex items-center gap-2 rounded-full bg-[#E56668] px-8 py-3.5 text-lg font-bold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_12px_30px_rgba(229,102,104,0.25)] transition-colors hover:bg-[#C04C4E]"
            >
              Try Elco AI <ArrowUpRight size={20} />
            </a>
            <p className="text-sm text-[#2F4157]/60">Free to start at ai.ielsco.com · separate Elco account</p>
          </div>
        </div>
      </div>
    </section>
  );
}
