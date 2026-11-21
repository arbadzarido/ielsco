"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { GIF_PATHWAYS, GIF_PROGRAMME, GIF_SITE_URL, gifApplyHref, pathwayOpen, pathwayStatus } from "@/lib/gif-summer-2027";
import { GIF_POPUP, GIF_POPUP_KEY, GIF_POPUP_SESSION_KEY, OTHER_POPUP_SESSION_KEYS, gifPopupAllowedOn, shouldShowGifPopup, snoozeUntil } from "@/lib/gif/recruit-popup";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// GIF Summer 2027 recruitment popup for the public IELSco site (rules: lib/gif/recruit-popup.ts).
// Shown at most once per session, only after engagement (time on page or scrolling), never on top of another dialog,
// never in a session where the Open Recruitment 2027 popup appeared, and not again for 7 days after closing (30 after
// clicking through). Turn it off with GIF_POPUP.enabled.
const AMBER = "#B8862E", AMBER_SOFT = "#E0B865", NIGHTFALL = "#304156";
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0B865] focus-visible:ring-offset-2";

const safe = <T,>(f: () => T, fallback: T): T => { try { return f(); } catch { return fallback; } };

export function GifRecruitPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  const eligible = () => shouldShowGifPopup({
    now: Date.now(), pathname: pathname ?? "", host: window.location.host,
    snoozedUntil: safe(() => Number(JSON.parse(window.localStorage.getItem(GIF_POPUP_KEY) ?? "{}").until) || 0, 0),
    seenThisSession: safe(() => window.sessionStorage.getItem(GIF_POPUP_SESSION_KEY) === "1", false),
    otherPopupThisSession: safe(() => OTHER_POPUP_SESSION_KEYS.some((k) => window.sessionStorage.getItem(k) === "1"), false),
  });

  // Engagement trigger: after GIF_POPUP.delayMs on the page or once the visitor scrolls GIF_POPUP.scrollShare of it.
  useEffect(() => {
    if (open || !eligible()) return;
    let fired = false, retry = 0;
    const show = () => {
      if (fired || !eligible()) return;
      const typing = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (typing || document.querySelector("[role=dialog][aria-modal=true]")) { retry = window.setTimeout(show, 5000); return; }
      fired = true;
      opener.current = document.activeElement;
      safe(() => window.sessionStorage.setItem(GIF_POPUP_SESSION_KEY, "1"), undefined);
      setOpen(true);
      track("gif_popup_shown", { path: pathname ?? "" });
    };
    const timer = window.setTimeout(show, GIF_POPUP.delayMs);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 200 && window.scrollY / max >= GIF_POPUP.scrollShare) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.clearTimeout(retry); window.removeEventListener("scroll", onScroll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, open]);

  // Leaving for a page where it must not appear closes it.
  useEffect(() => { if (open && !gifPopupAllowedOn(pathname, window.location.host)) setOpen(false); }, [pathname, open]);

  // Focus management: focus the close button, keep Tab inside the dialog, Escape closes, focus returns afterwards.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close("dismiss"); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])"));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close(action: "dismiss" | "clicked", cta?: "explore" | "apply") {
    safe(() => window.localStorage.setItem(GIF_POPUP_KEY, JSON.stringify({ until: snoozeUntil(Date.now(), action) })), undefined);
    track(cta === "apply" ? "gif_popup_apply" : cta === "explore" ? "gif_popup_explore" : "gif_popup_closed", {});
    if (action === "dismiss") {
      setOpen(false);
      const o = opener.current as HTMLElement | null;
      if (o && typeof o.focus === "function") o.focus();
    }
  }

  if (!open) return null;
  const now = Date.now();
  const anyOpen = GIF_PATHWAYS.some((p) => pathwayOpen(p, now));
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1A2534]/55 p-3 sm:items-center sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) close("dismiss"); }} data-testid="gif-popup">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="gif-popup-title" aria-describedby="gif-popup-desc"
        className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_24px_60px_rgba(26,37,52,0.32)]">
        <button ref={closeRef} type="button" onClick={() => close("dismiss")} aria-label="Close" data-testid="gif-popup-close"
          className={cn("absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#1A2534] shadow hover:bg-white", focus)}>
          <X size={18} aria-hidden="true" />
        </button>

        {/* Photo band with the programme identity */}
        <div className="relative h-[112px] shrink-0 sm:h-[176px]" style={{ background: NIGHTFALL }}>
          <Image src="/images/gif/museum-group.jpg" alt="" fill sizes="560px" className="object-cover opacity-70" style={{ objectPosition: "center 35%" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(48,65,86,0.15) 0%, rgba(48,65,86,0.92) 92%)" }} aria-hidden="true" />
          <div className="absolute bottom-4 left-5 right-14 flex items-end gap-3">
            <span className="inline-flex h-11 shrink-0 items-center rounded-xl bg-white px-3 sm:h-12"><Image src={GIF_PROGRAMME.logo} alt="Global Impact Fellowship" width={238} height={87} className="h-8 w-auto sm:h-9" /></span>
            <p className="pb-1 text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: AMBER_SOFT }}><span className="hidden sm:inline">{GIF_PROGRAMME.name} · </span>{GIF_PROGRAMME.edition}</p>
          </div>
        </div>

        <div className="overflow-y-auto p-5 pb-4 sm:p-7">
          <h2 id="gif-popup-title" className="text-[23px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#1A2534] [font-family:var(--font-heading)] sm:text-[28px]">
            Take your ideas beyond borders.
          </h2>
          <p id="gif-popup-desc" className="mt-2 text-[14px] leading-relaxed text-[#2F4157]/80 sm:text-[15px]">
            Eight days, three countries and young changemakers from across Southeast Asia. Bring a project idea for your community and grow it with peers and mentors.
          </p>
          <div className="mt-3 flex flex-col gap-0.5 text-[14px] font-semibold text-[#1A2534] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
            <span>{GIF_PROGRAMME.dates}</span>
            <span className="hidden h-1 w-1 rounded-full sm:inline-block" style={{ background: AMBER }} aria-hidden="true" />
            <span>{GIF_PROGRAMME.route.join(" · ")}</span>
          </div>

          <ul className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-3" aria-label="Three ways to join">
            {GIF_PATHWAYS.map((p, i) => {
              const isOpen = pathwayOpen(p, now);
              return (
                <li key={p.key} className="flex items-center justify-between gap-3 rounded-2xl border border-[#E6E9EE] bg-[#FAFBFC] px-3.5 py-2.5 sm:flex-col sm:items-stretch sm:justify-start sm:gap-0 sm:p-3.5">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: i === 0 ? AMBER : NIGHTFALL }} aria-hidden="true">{i + 1}</span>
                    <span className="text-[15px] font-bold text-[#1A2534]">{p.name}</span>
                  </span>
                  <span className="mt-1.5 hidden flex-1 text-[13px] leading-snug text-[#2F4157]/75 sm:block">{p.line}</span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:mt-2 sm:self-start", isOpen ? "bg-[#E8F3EE] text-[#2E6B4F]" : "bg-[#FBF3E4] text-[#8C6420]")}>{pathwayStatus(p, now)}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[12px] text-[#2F4157]/60">Each pathway has its own requirements and process. Partial Funded places come from the Fully Funded selection.</p>

          <div className="mt-5 flex flex-col gap-2 sm:mt-6 sm:flex-row">
            <a href={GIF_SITE_URL} onClick={() => close("clicked", "explore")} data-testid="gif-popup-explore"
              className={cn("inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold text-white hover:opacity-95", focus)} style={{ background: NIGHTFALL }}>
              Explore GIF Summer 2027 <ArrowUpRight size={18} aria-hidden="true" />
            </a>
            {anyOpen && (
              <a href={gifApplyHref()} onClick={() => close("clicked", "apply")} data-testid="gif-popup-apply"
                className={cn("inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#D5DBE3] px-6 text-[16px] font-semibold text-[#1A2534] hover:border-[#2F4157]", focus)}>
                Apply now <ArrowRight size={18} aria-hidden="true" />
              </a>
            )}
          </div>
          <button type="button" onClick={() => close("dismiss")} className={cn("mx-auto mt-3 block rounded text-[13px] font-medium text-[#2F4157]/60 underline-offset-4 hover:underline", focus)}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
