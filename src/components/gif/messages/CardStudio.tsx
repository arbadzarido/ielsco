"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, RotateCcw, Share2, X } from "lucide-react";
import { btnPrimary, btnSecondary, focusRing } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { BACKGROUNDS, DECOR, DEFAULT_DESIGN, H, LAYOUTS, THEMES, TYPE, W, drawCard, ensureFonts, renderToBlob, type CardInput, type Design } from "./cardDesign";

const storeKey = (seed: string) => `gif-card-design:${seed}`;
const load = (seed: string): Design => {
  try { const v = localStorage.getItem(storeKey(seed)); return v ? { ...DEFAULT_DESIGN, ...JSON.parse(v) } : DEFAULT_DESIGN; } catch { return DEFAULT_DESIGN; }
};

// Lightweight story-card personalisation: predefined themes, backgrounds, layouts, type and accents. The preview canvas
// is drawn by the same function as the export, at full 1080 × 1920 resolution and scaled with CSS.
export function CardStudio({ input, onClose }: { input: CardInput; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [d, setD] = useState<Design>(() => load(input.seed));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [msg, setMsg] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => { ensureFonts().then(() => setReady(true)); }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && ready) drawCard(ctx, input, d);
    try { localStorage.setItem(storeKey(input.seed), JSON.stringify(d)); } catch { /* private mode */ }
  }, [d, ready, input]);
  useEffect(() => {
    try { setCanShare(typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files: [new File([new Blob()], "x.png", { type: "image/png" })] })); }
    catch { setCanShare(false); }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const file = async () => new File([await renderToBlob(input, d)], "gif-2026-message.png", { type: "image/png" });
  const download = async () => {
    setBusy("download"); setMsg("");
    try {
      const f = await file();
      const url = URL.createObjectURL(f);
      const a = document.createElement("a"); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setMsg("Saved. Add it to your Instagram Story from your photos.");
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(null); }
  };
  const share = async () => {
    setBusy("share"); setMsg("");
    try { await navigator.share({ files: [await file()], title: "A message from GIF 2026" }); }
    catch (e) { if ((e as Error).name !== "AbortError") setMsg("Sharing isn't available here. Use Download instead."); }
    finally { setBusy(null); }
  };
  const set = <K extends keyof Design>(k: K, v: Design[K]) => setD((p) => ({ ...p, [k]: v }));
  const chip = (active: boolean) => cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold", focusRing, active ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157]");

  if (typeof document === "undefined") return null;
  // Portal to <body> so the sheet sits above the dashboard header, bottom navigation and mascot.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Design your story card" className="fixed inset-0 z-[2147483000] flex items-end justify-center bg-[#151821]/60 sm:items-center sm:p-4" data-testid="gif-card-studio">
      <div className="flex max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-[#FAFAF8] sm:max-h-[92vh] sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#E3E7ED] px-4 py-3 sm:px-6">
          <p className="font-semibold">Make it yours</p>
          <button type="button" onClick={onClose} aria-label="Close" className={cn("rounded-full p-2 hover:bg-[#EEF1F5]", focusRing)}><X size={20} /></button>
        </div>
        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-[minmax(0,320px)_1fr] md:overflow-hidden">
          <div className="flex items-start justify-center bg-[#EEF0F3] p-4 md:overflow-y-auto">
            <div className="relative w-[min(100%,300px)]" style={{ aspectRatio: `${W} / ${H}` }}>
              {!ready && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-[#577E90]" /></div>}
              <canvas ref={canvas} width={W} height={H} className="h-full w-full rounded-2xl shadow-[0_18px_50px_rgba(20,25,35,0.25)]" aria-label="Story card preview" data-testid="gif-card-canvas" />
            </div>
          </div>
          <div className="min-w-0 space-y-5 p-4 sm:p-6 md:overflow-y-auto" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <section>
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[#2F4157]/60">Colours</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-9 md:grid-cols-5 lg:grid-cols-9">
                {THEMES.map((t) => (
                  <button key={t.key} type="button" onClick={() => set("theme", t.key)} aria-pressed={d.theme === t.key} title={`${t.name} · ${t.group}`} data-testid={`gif-theme-${t.key}`}
                    className={cn("aspect-square rounded-full border-2", focusRing, d.theme === t.key ? "border-[#2F4157] ring-2 ring-[#2F4157]/20" : "border-white")}
                    style={{ background: `linear-gradient(135deg, ${t.bg[0]}, ${t.bg[1]})` }}>
                    <span className="sr-only">{t.name}</span>
                  </button>
                ))}
              </div>
            </section>
            {([["Background", "background", BACKGROUNDS], ["Layout", "layout", LAYOUTS], ["Lettering", "type", TYPE], ["Accents", "decor", DECOR]] as const).map(([label, key, list]) => (
              <section key={key}>
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-[#2F4157]/60">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {list.map((o) => <button key={o.key} type="button" aria-pressed={d[key] === o.key} onClick={() => set(key, o.key)} className={chip(d[key] === o.key)}>{o.name}</button>)}
                </div>
              </section>
            ))}
            {input.recipientFirstName !== undefined && (
              <label className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" className="h-5 w-5 accent-[#2F4157]" checked={d.showName} onChange={(e) => set("showName", e.target.checked)} /> Show my first name on the card
              </label>
            )}
            <div className="flex flex-col gap-2 border-t border-[#E3E7ED] pt-4 sm:flex-row sm:flex-wrap">
              <button type="button" className={cn(btnPrimary, "w-full sm:w-auto")} disabled={!ready || busy !== null} onClick={() => void download()} data-testid="gif-card-download">
                {busy === "download" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Download Story
              </button>
              {canShare && (
                <button type="button" className={cn(btnSecondary, "w-full sm:w-auto")} disabled={!ready || busy !== null} onClick={() => void share()}>
                  {busy === "share" ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />} Share
                </button>
              )}
              <button type="button" className={cn(btnSecondary, "w-full sm:w-auto")} onClick={() => setD(DEFAULT_DESIGN)}><RotateCcw size={16} /> Reset</button>
            </div>
            {msg && <p role="status" className="text-[14px] text-[#2F4157]/75">{msg}</p>}
            <p className="text-[12px] text-[#2F4157]/55">The card shows only the message and GIF 2026 branding. The sender stays anonymous.</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
