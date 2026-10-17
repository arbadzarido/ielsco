"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { focusRing } from "./ui";
import { cn } from "@/lib/utils";

// Phone/tablet bottom sheet, the same interaction as Elco's "More" sheet: slides up from the bottom over a dimmed
// backdrop, rounded top corners, a visible close button, safe-area padding. Modal dialog: focus moves in, Tab stays
// inside, Esc / backdrop / route change close it, focus returns to the opener. Only one sheet can be open at a time
// (opening one closes any other). Rendered in a portal on <body>: an ancestor with backdrop-filter (the glass header)
// would otherwise become the containing block for position:fixed and pin the sheet to the header.
const OPEN_EVENT = "iels:sheet-open";

export function BottomSheet({
  open, onClose, title, returnFocusTo, children, testId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  testId?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useRef(Math.random().toString(36).slice(2));
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  const [shown, setShown] = useState(false); // drives the slide-in transition after mount

  useEffect(() => {
    if (open && pathname !== firstPath.current) onClose();
    firstPath.current = pathname;
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) { setShown(false); return; }
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id.current }));
    const onOther = (e: Event) => { if ((e as CustomEvent<string>).detail !== id.current) onClose(); };
    window.addEventListener(OPEN_EVENT, onOther);
    const opener = returnFocusTo?.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      setShown(true);
      panel.current?.querySelector<HTMLElement>("a[href], button:not([disabled]), select")?.focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), select")];
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(OPEN_EVENT, onOther);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, [open, onClose, returnFocusTo]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-hidden="true" tabIndex={-1} onClick={onClose}
        className={cn("absolute inset-0 bg-[#1A2534]/40 transition-opacity duration-200 motion-reduce:transition-none", shown ? "opacity-100" : "opacity-0")} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[min(85dvh,720px)] flex-col rounded-t-[28px] bg-white shadow-[0_-12px_40px_rgba(26,37,52,0.18)] transition-transform duration-[250ms] ease-out motion-reduce:transition-none",
          shown ? "translate-y-0" : "translate-y-full"
        )}
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex justify-center pt-[10px]" aria-hidden="true"><span className="h-[4px] w-[40px] rounded-full bg-[#D5DCE5]" /></div>
        <div className="flex items-center justify-between px-[20px] pb-[8px] pt-[6px]">
          <p className="text-[17px] font-bold text-[#1A2534]">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" data-testid={testId ? `${testId}-close` : undefined}
            className={cn("flex h-[40px] w-[40px] items-center justify-center rounded-full text-[#2F4157]/70 hover:bg-[#F1F4F8]", focusRing)}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-[16px] pb-[8px]">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// One row in a sheet: icon, label, 48px touch target.
export const sheetRow = cn(
  "flex min-h-[48px] w-full items-center gap-[14px] rounded-[14px] px-[12px] text-left text-[16px] text-[#1A2534] hover:bg-[#F1F4F8]",
  focusRing
);
export const sheetRowActive = "bg-[#E8EEF3] font-semibold";
