"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Compass, Search, X } from "lucide-react";
import { sectionFor } from "@/components/dashboard/nav";
import { btnPrimary, btnSecondary, focusRing, inputClass } from "@/components/dashboard/ui";
import { createClient } from "@/lib/supabase/client";
import { quickMatchStatus, searchTopics, topicsFor, type HelpTopic } from "@/lib/copilot";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { ElcoMascot } from "./ElcoMascot";

// Elco's ElcoAvatar composition for the cap (head and shoulders cropped in a circle), filling the button.
function HelpFace({ animate }: { animate: boolean }) {
  return (
    <span className="elco-help-face relative block h-full w-full overflow-hidden rounded-full" style={{ background: "#E7F1FC" }} data-move={animate ? "idle" : undefined} aria-hidden="true" data-accessory="cap">
      <img src="/images/contents/mascot/kit/neutral.png" alt="" draggable="false" className="absolute max-w-none" style={{ width: "100%", left: "-1%", top: "34%" }} />
      <img src="/images/contents/mascot/kit/cap.png" alt="" draggable="false" className="absolute max-w-none" style={{ width: "74%", left: "8%", top: "6%" }} />
      {/* Elco's idle "breathe" (index.css elco-breathe), scoped here so no global style changes; off for reduced motion. */}
      <style>{`.elco-help-face{transform-origin:50% 100%}.elco-help-face[data-move="idle"]{animation:elco-help-breathe 3.4s ease-in-out infinite}
@keyframes elco-help-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.015)}}
@media (prefers-reduced-motion: reduce){.elco-help-face{animation:none!important}}`}</style>
    </span>
  );
}

// Elco Help (formerly Elco Copilot): the in-product guide (not Elco AI, the English practice app). A floating Elco button on
// dashboard pages opens a panel with the product tour and help for the page you're on. Answers are fixed text from
// lib/copilot.ts that link to real pages; nothing is sent anywhere and nothing is changed on the member's behalf.
// The button copies Elco's Coach companion button (elco-app frontend/src/components/ElcoCompanion.jsx): same white circle,
// size (72px, 96px from md, 108px from lg), bottom-right position, shadow, hover/press scale and calm idle "breathe".
// Its face is the cap-wearing Elco from the official mascot kit, composed exactly as Elco's own Elco Help avatar
// (ElcoAvatar.jsx, accessory "cap"): public/images/contents/mascot/kit/{neutral,cap}.png.
// Hidden on conversation pages so it never covers the message box.
const HIDDEN_ON = [/^\/dashboard\/connect\/messages\/[^/]+/];

export function ElcoCopilot() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [qmEnabled, setQmEnabled] = useState<boolean | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const section = sectionFor(pathname);
  const topics = useMemo(() => (query.trim() ? searchTopics(query) : topicsFor(pathname, section?.id ?? (pathname === "/dashboard" ? "home" : "more"))), [query, pathname, section]);

  useEffect(() => { setOpen(false); setQuery(""); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("input, button, a")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    // Quick Match's answer depends on whether it's switched on (read-only check, once per opening).
    createClient().rpc("quick_match_poll").then(({ data, error }) => setQmEnabled(error ? null : !!data?.enabled));
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (HIDDEN_ON.some((r) => r.test(pathname))) return null;

  const toggle = () => {
    setOpen((v) => {
      if (!v) track("copilot_opened", { section: section?.id ?? "home" });
      return !v;
    });
  };
  const tour = () => {
    setOpen(false);
    router.push("/dashboard?tour=1");
  };

  return (
    <>
      <button ref={button} type="button" onClick={toggle} aria-expanded={open} aria-controls="elco-copilot" data-testid="copilot-button"
        aria-label={open ? "Close Elco Help" : "Open Elco Help: help and product tour"}
        className={cn("fixed right-[calc(env(safe-area-inset-right)+10px)] z-40 flex h-[72px] w-[72px] items-end justify-center rounded-full border border-[#E3E7ED] bg-white shadow-[0_12px_30px_rgba(26,37,52,0.22)] transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none md:bottom-[20px] md:right-[20px] md:h-[96px] md:w-[96px] lg:h-[108px] lg:w-[108px]", "bottom-[calc(96px+env(safe-area-inset-bottom))]", focusRing)}>
        <HelpFace animate={!open} />
      </button>
      {open && (
        <div ref={panel} id="elco-copilot" role="dialog" aria-modal="false" aria-labelledby="elco-copilot-title" data-testid="copilot-panel"
          className="fixed inset-x-3 bottom-[calc(180px+env(safe-area-inset-bottom))] z-50 flex max-h-[min(70vh,40rem)] flex-col overflow-hidden rounded-3xl border border-[#E3E7ED] bg-white shadow-[0_24px_60px_rgba(26,37,52,0.22)] sm:left-auto sm:right-4 sm:w-[24rem] md:bottom-[128px] md:right-[20px] lg:bottom-[140px]">
          <div className="flex items-start gap-3 bg-gradient-to-br from-[#EAEFF5] via-white to-white p-4">
            <ElcoMascot mood="happy" size={52} animate={false} />
            <div className="min-w-0 flex-1">
              <h2 id="elco-copilot-title" className="text-lg font-semibold">Elco Help</h2>
              <p className="text-sm text-[#2F4157]/70">Help with {section ? t(section.key) : pathname === "/dashboard" ? "Home" : "this page"}. For English practice and test preparation, open Elco AI.</p>
            </div>
            <button type="button" onClick={() => { setOpen(false); button.current?.focus(); }} aria-label="Close Elco Help" className={cn("rounded-full p-1.5 hover:bg-[#F1F4F8]", focusRing)}><X size={18} /></button>
          </div>
          <div className="space-y-3 overflow-y-auto p-4">
            <button type="button" onClick={tour} className={cn(btnPrimary, "w-full")} data-testid="copilot-tour"><Compass size={18} aria-hidden="true" /> Take a tour</button>
            <div className="relative">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#2F4157]/45" />
              <label htmlFor="copilot-search" className="sr-only">Search help</label>
              <input id="copilot-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about a feature, e.g. scholarships" className={cn(inputClass, "py-2 pl-9 text-base")} />
            </div>
            {query.trim() && topics.length === 0 ? (
              <p className="rounded-xl bg-[#F7F8FA] p-3 text-sm text-[#2F4157]/75" data-testid="copilot-no-answer">
                I don&apos;t have an answer for that yet. Try other words, or see <Link href="/dashboard/help" className="font-semibold underline">Help</Link>.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="copilot-topics">
                {topics.slice(0, query.trim() ? 5 : 6).map((topic, i) => <Topic key={topic.id} topic={topic} open={i === 0 && !!query.trim()} qm={topic.id === "quickmatch" ? quickMatchStatus(qmEnabled) : null} />)}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Topic({ topic, open, qm }: { topic: HelpTopic; open: boolean; qm: string | null }) {
  return (
    <li>
      <details open={open} className="group rounded-xl border border-[#E3E7ED] bg-white" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track("copilot_help_opened", { topic: topic.id })}>
        <summary className={cn("flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[15px] font-semibold", focusRing)}>
          {topic.q}
          <ArrowRight size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
        </summary>
        <div className="space-y-2 px-3 pb-3 text-sm text-[#2F4157]/80">
          {qm && <p className="font-semibold text-[#8A5A00]" data-testid="copilot-qm-status">{qm}</p>}
          <p>{topic.a}</p>
          <Link href={topic.href} className={cn(btnSecondary, "px-3 py-1.5 text-sm")}>{topic.cta}</Link>
        </div>
      </details>
    </li>
  );
}
