"use client";

// A small modal for choices that need an answer before something happens: "this occurrence / this and following /
// the whole series", or "confirm this reschedule". useChoice() returns ask(), which resolves with the chosen key or
// null when dismissed. Escape and the backdrop dismiss it; focus moves into it and back.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { btn, btnPrimary } from "./ui";
import { cn } from "@/lib/utils";

export interface ChoiceOption { key: string; label: string; hint?: string; primary?: boolean; danger?: boolean }
export interface ChoiceRequest { title: string; body?: ReactNode; options: ChoiceOption[]; cancelLabel?: string }
type Ask = (r: ChoiceRequest) => Promise<string | null>;

const Ctx = createContext<Ask | null>(null);

export function ChoiceProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<(ChoiceRequest & { resolve: (k: string | null) => void }) | null>(null);
  const ask = useCallback<Ask>((r) => new Promise((resolve) => setReq({ ...r, resolve })), []);
  const close = useCallback((k: string | null) => { setReq((cur) => { cur?.resolve(k); return null; }); }, []);
  return (
    <Ctx.Provider value={ask}>
      {children}
      {req && <ChoiceDialog req={req} onClose={close} />}
    </Ctx.Provider>
  );
}

/** ask() for components under a ChoiceProvider; falls back to window.confirm when there is none. */
export function useChoice(): Ask {
  const ask = useContext(Ctx);
  return ask ?? (async (r) => (window.confirm(r.title) ? (r.options.find((o) => o.primary) ?? r.options[0]).key : null));
}

function ChoiceDialog({ req, onClose }: { req: ChoiceRequest; onClose: (k: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("[data-primary], button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(null); } };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0F1B2A]/40" onClick={() => onClose(null)} />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-label={req.title} data-testid="os-choice"
        className="relative w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl sm:rounded-2xl">
        <h2 className="text-base font-semibold text-[#1F2D3D]">{req.title}</h2>
        {req.body && <div className="mt-2 text-sm text-[#3A4B60]">{req.body}</div>}
        <div className="mt-4 grid gap-2">
          {req.options.map((o) => (
            <button key={o.key} type="button" data-primary={o.primary ? "" : undefined} data-choice={o.key} onClick={() => onClose(o.key)}
              className={cn(o.primary ? btnPrimary : btn, "h-auto min-h-11 flex-col items-start py-2 text-left", o.danger && "border-[#F1C9CA] text-[#A12D2F]")}>
              <span>{o.label}</span>
              {o.hint && <span className={cn("text-xs font-normal", o.primary ? "text-white/80" : "text-[#66768A]")}>{o.hint}</span>}
            </button>
          ))}
          <button type="button" className={cn(btn, "min-h-11")} onClick={() => onClose(null)} data-choice="cancel">{req.cancelLabel ?? "Cancel"}</button>
        </div>
      </div>
    </div>
  );
}
