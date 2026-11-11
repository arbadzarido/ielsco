"use client";

import { useEffect, useRef, useState } from "react";
import { OfficialDeadline } from "@/components/time/LocalTime";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { RECRUITMENT } from "@/data/careers/recruitment";
import { POPUP_NEVER_KEY, POPUP_SESSION_KEY, popupAllowedOn, shouldShowPopup } from "@/lib/careers/popup";

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2";
const read = (s: Storage | undefined, k: string) => { try { return s?.getItem(k) === "1"; } catch { return false; } };
const write = (s: Storage | undefined, k: string) => { try { s?.setItem(k, "1"); } catch { /* storage blocked: closing still works */ } };

// Open Recruitment 2027 poster, shown once per browser session after a short pause, on the public site and the
// IELSco dashboard (never on careers pages, the application, sign-in, checkout, tests, calls, the OS or admin).
// "Apply now" goes through /careers/apply, which sends signed-in people to the application and everyone else to /careers.
export function RecruitmentPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [never, setNever] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) return;
    const ok = () => shouldShowPopup({
      now: Date.now(), opensAt: Date.parse(RECRUITMENT.opensAt), closesAt: Date.parse(RECRUITMENT.closesAt),
      never: read(window.localStorage, POPUP_NEVER_KEY), closedThisSession: read(window.sessionStorage, POPUP_SESSION_KEY),
      pathname: pathname ?? "", host: window.location.host,
    });
    if (!ok()) return;
    // Wait a moment, and never on top of another dialog (e.g. the dashboard tour) or while someone is typing in a field:
    // check again every few seconds on the same page until it's free.
    let t = 0;
    const attempt = (n: number) => {
      t = window.setTimeout(() => {
        if (!ok()) return;
        const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (!typing && !document.querySelector("[role=dialog][aria-modal=true]")) { setOpen(true); track("recruitment_popup_shown", { path: pathname ?? "" }); }
        else if (n < 40) attempt(n + 1);
      }, n === 0 ? 6000 : 4000);
    };
    attempt(0);
    return () => window.clearTimeout(t);
  }, [pathname, open]);

  // Navigating to a page where it shouldn't be (e.g. into the application) closes it.
  useEffect(() => { if (open && !popupAllowedOn(pathname, window.location.host)) setOpen(false); }, [pathname, open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function dismiss() {
    write(window.sessionStorage, POPUP_SESSION_KEY);
    if (never) write(window.localStorage, POPUP_NEVER_KEY);
    track("recruitment_popup_closed", { never });
    setOpen(false);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1A2534]/55 p-3 sm:items-center sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }} data-testid="recruitment-popup">
      <div role="dialog" aria-modal="true" aria-labelledby="recruit-popup-title" className="relative grid max-h-[92vh] w-full max-w-[780px] overflow-y-auto rounded-[24px] bg-white shadow-[0_24px_60px_rgba(26,37,52,0.3)] sm:grid-cols-[320px_1fr] sm:items-center">
        <button ref={closeRef} type="button" onClick={dismiss} aria-label="Close" data-testid="recruitment-popup-close"
          className={cn("absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1A2534] shadow hover:bg-white", focus)}><X size={18} aria-hidden="true" /></button>
        {/* The published Instagram poster at its own 4:5 proportions (never cropped or stretched). */}
        <div className="flex justify-center bg-[#EEF1F5] sm:block sm:bg-transparent">
          <Image src={RECRUITMENT.poster} alt="Open Recruitment 2027 poster: now open, application period 9–29 November 2026 at ielsco.com/careers, for 1st–3rd year university students" width={1080} height={1350}
            sizes="(min-width: 640px) 320px, 70vw" className="h-[38vh] max-h-[400px] w-auto sm:h-auto sm:max-h-none sm:w-full" data-testid="recruitment-popup-poster" />
        </div>
        <div className="flex flex-col overflow-y-auto p-6 sm:p-8">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#577E90]">IELSco &amp; Elco AI</p>
          <h2 id="recruit-popup-title" className="mt-2 text-[26px] font-bold leading-tight text-[#1A2534] [font-family:var(--font-heading)]">Open Recruitment 2027 is open</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#2F4157]/80">Join the team behind IELSco and Elco AI: 17 roles in 7 divisions, fully remote.</p>
          <ul className="mt-4 space-y-1.5 text-[15px] text-[#1A2534]">
            <li><span className="font-semibold">Who:</span> 1st–3rd year university students</li>
            <li><span className="font-semibold">Apply by:</span> <OfficialDeadline value={RECRUITMENT.closesAt} /></li>
          </ul>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {/* A full page load on purpose: /careers/apply is a route handler that redirects by sign-in state. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/careers/apply" onClick={() => { write(window.sessionStorage, POPUP_SESSION_KEY); track("recruitment_popup_apply", {}); }}
              className={cn("inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-[#2F4157] px-6 text-[16px] font-semibold text-white hover:bg-[#1A2534]", focus)} data-testid="recruitment-popup-apply">
              Apply now <ArrowRight size={18} aria-hidden="true" />
            </a>
            <button type="button" onClick={dismiss} className={cn("inline-flex min-h-[46px] items-center justify-center rounded-full border border-[#D5DBE3] px-6 text-[16px] font-semibold text-[#2F4157] hover:border-[#2F4157]", focus)}>Not now</button>
          </div>
          <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-[14px] text-[#2F4157]/75">
            <input type="checkbox" checked={never} onChange={(e) => setNever(e.target.checked)} className="h-4 w-4 accent-[#2F4157]" data-testid="recruitment-popup-never" />
            Don&apos;t show this again
          </label>
        </div>
      </div>
    </div>
  );
}
