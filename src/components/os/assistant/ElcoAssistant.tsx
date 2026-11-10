"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Maximize2, MessageSquarePlus, X } from "lucide-react";
import { useOs } from "@/components/os/OsProvider";
import { btnGhost, ring } from "@/components/os/ui";
import { parsePage, type PageInput } from "@/lib/os/ai-page";
import { cn } from "@/lib/utils";
import { AssistantChat } from "./AssistantChat";
import { cleanFilters, useAssistantPageValue } from "./page-context";

// Elco Assistant on every Company OS page: a button in the corner opens a panel beside the page (a full-screen sheet
// on phones). The page stays where it is and keeps working; the panel knows which page, record, filters and
// selection the person is looking at. Elco Assistant is the Company OS assistant, not the Elco AI company.

const CONV_KEY = "os-elco-panel-conversation";
const OPEN_KEY = "os-elco-panel-open";
const store = { get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } } };

export function useAssistantPageInput(): PageInput {
  const pathname = usePathname();
  const params = useSearchParams();
  const published = useAssistantPageValue();
  const qs = params.toString();
  const filters = JSON.stringify(cleanFilters(published.filters));
  const selection = JSON.stringify(published.selection ?? []);
  return useMemo(() => ({
    path: pathname,
    query: Object.fromEntries(new URLSearchParams(qs).entries()),
    filters: JSON.parse(filters) as Record<string, string>,
    selection: JSON.parse(selection) as string[],
  }), [pathname, qs, filters, selection]);
}

export function ElcoAssistant() {
  const { state } = useOs();
  const pathname = usePathname();
  const page = useAssistantPageInput();
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => { setConv(store.get(CONV_KEY)); setOpen(store.get(OPEN_KEY) === "1" && window.matchMedia("(min-width: 1024px)").matches); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape" && open && window.matchMedia("(max-width: 1023px)").matches) setOpen(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  useEffect(() => { store.set(OPEN_KEY, open ? "1" : "0"); document.documentElement.toggleAttribute("data-elco-panel", open); }, [open]);
  const onConversation = useCallback((id: string) => { setConv(id); store.set(CONV_KEY, id); }, []);
  const fresh = () => { setConv(null); store.set(CONV_KEY, null); setNonce((n) => n + 1); };

  if (state.status !== "ready" || pathname.startsWith("/os/assistant")) return null;
  const pc = parsePage(page);
  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} data-testid="os-elco-open" aria-label="Open Elco Assistant" title="Elco Assistant (Ctrl+J)"
          className={cn("fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-[#2F4157] px-4 text-sm font-semibold text-white shadow-lg hover:bg-[#3B5270]", ring)}>
          <Bot size={18} aria-hidden="true" /><span className="hidden sm:inline">Elco Assistant</span>
        </button>
      )}
      {open && (
        <aside role="complementary" aria-label="Elco Assistant" data-testid="os-elco-panel"
          className="fixed inset-0 z-50 flex flex-col bg-white shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:z-30 lg:w-[400px] lg:border-l lg:border-[#E6E9EE]">
          <div className="flex items-center gap-2 border-b border-[#E6E9EE] px-3 py-2">
            <Bot size={18} className="text-[#2F4157]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1F2D3D]">Elco Assistant</p>
              {pc && <p className="truncate text-[11px] text-[#66768A]" data-testid="os-elco-context">Looking at: {pc.label}</p>}
            </div>
            <button type="button" className={btnGhost} onClick={fresh} aria-label="New conversation" title="New conversation"><MessageSquarePlus size={16} aria-hidden="true" /></button>
            <Link href={conv ? `/os/assistant?agent=assistant&c=${conv}` : "/os/assistant"} className={btnGhost} aria-label="Open the full Assistant page" title="Open the full page"><Maximize2 size={16} aria-hidden="true" /></Link>
            <button type="button" className={btnGhost} onClick={() => setOpen(false)} aria-label="Close Elco Assistant" data-testid="os-elco-close"><X size={18} aria-hidden="true" /></button>
          </div>
          <AssistantChat key={nonce} agent="assistant" conversationId={conv} onConversation={onConversation} variant="panel" page={page} />
        </aside>
      )}
    </>
  );
}
