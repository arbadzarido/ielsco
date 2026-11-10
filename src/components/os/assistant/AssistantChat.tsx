"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCheck, Send, Sparkles } from "lucide-react";
import { AiActionCard, type AiAction } from "@/components/os/AiActionCard";
import { useOsMe } from "@/components/os/OsProvider";
import { announceDataChanged } from "@/components/os/data";
import { ErrorLine, btn, btnPrimary, input, muted } from "@/components/os/ui";
import { fmtDateTime } from "@/lib/os/meta";
import { parsePage, suggestionsFor, type PageInput } from "@/lib/os/ai-page";
import { cn } from "@/lib/utils";

// The conversation itself, shared by the dedicated Assistant page and the panel that opens on every page. Ordinary
// changes the person asks for run at once (the server decides which; see autoRunnable) and come back as results;
// anything else comes back as a card to confirm.

type Msg = { id: number | string; role: string; content: string; model?: string | null; created_at?: string };
const AUTO_KEY = "os-elco-auto";
const readAuto = () => { try { return localStorage.getItem(AUTO_KEY) !== "0"; } catch { return true; } };

export function AssistantChat({ agent, conversationId, onConversation, variant, page, company, deep, onSent }: {
  agent: string; conversationId: string | null; onConversation: (id: string) => void; variant: "page" | "panel";
  page?: PageInput | null; company?: string | null; deep?: boolean; onSent?: () => void;
}) {
  const { supabase } = useOsMe();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [actions, setActions] = useState<AiAction[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(true);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const local = useRef<string | null>(null); // a conversation this component just started: don't reload over it

  useEffect(() => { setAuto(readAuto()); }, []);
  useEffect(() => {
    if (local.current && local.current === conversationId) return; // just started here: keep what's on screen
    local.current = null;
    setErr(null);
    if (!conversationId) { setMsgs([]); setActions([]); return; }
    let live = true;
    Promise.all([
      supabase.from("os_ai_messages").select("id, role, content, model, created_at").eq("conversation_id", conversationId).in("role", ["user", "assistant"]).order("created_at"),
      supabase.from("os_ai_actions").select("id, action_type, preview, status, result, details, created_at").eq("conversation_id", conversationId).order("created_at"),
    ]).then(([m, a]) => { if (live) { setMsgs((m.data ?? []) as Msg[]); setActions((a.data ?? []) as AiAction[]); } });
    return () => { live = false; };
  }, [conversationId, supabase]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, actions.length, busy]);

  const send = useCallback(async (raw?: string) => {
    const message = (raw ?? text).trim();
    if (!message || busy) return;
    setBusy(true); setErr(null); if (!raw) setText("");
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", content: message }]);
    try {
      const r = await fetch("/os/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ agent, conversation_id: conversationId ?? undefined, company_code: conversationId ? undefined : company || null, message, deep: Boolean(deep), auto, page: page ?? undefined }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error ?? "Elco Assistant didn't answer."); if (j.conversation_id && !conversationId) { local.current = j.conversation_id; onConversation(j.conversation_id); } }
      else {
        setMsgs((m) => [...m, { id: `a${Date.now()}`, role: "assistant", content: j.reply, model: j.model }]);
        setActions((a) => [...a, ...(j.actions as AiAction[])]);
        if ((j.actions as AiAction[]).some((x) => x.status === "executed")) announceDataChanged();
        if (!conversationId) { local.current = j.conversation_id; onConversation(j.conversation_id); }
        onSent?.();
      }
    } catch { setErr("Couldn't reach the server."); }
    setBusy(false);
  }, [text, busy, agent, conversationId, company, deep, auto, page, onConversation, onSent]);

  // Confirm every open card in the order they were proposed (projects come first, so their tasks resolve).
  async function confirmAll() {
    setConfirmingAll(true); setErr(null);
    for (const a of actions.filter((x) => x.status === "proposed")) {
      const r = await fetch(`/os/api/ai/actions/${a.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "confirm" }) }).catch(() => null);
      const j = r ? await r.json().catch(() => ({})) : {};
      setActions((list) => list.map((x) => (x.id !== a.id ? x : j.details ? { ...x, details: j.details, preview: j.preview ?? x.preview } : { ...x, status: j.status ?? x.status, result: j.created ? { created: j.created, failed: j.failed } : j.error ? { error: j.error, failed: j.failed } : x.result })));
    }
    setConfirmingAll(false);
    announceDataChanged();
  }
  const open = actions.filter((a) => a.status === "proposed");
  const pc = parsePage(page ?? null);
  const panel = variant === "panel";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("min-h-0 flex-1 space-y-3 overflow-y-auto", panel ? "p-3" : "p-4")} data-testid="os-ai-thread">
        {!msgs.length && (
          <div className={cn("text-sm", muted)} data-testid="os-ai-empty">
            <p className="font-medium text-[#1F2D3D]">{pc && pc.kind !== "assistant" ? `On ${pc.label}` : "Elco Assistant"}</p>
            <p className="mt-1">Ask about anything you can open, or tell me what to create or change. Ordinary changes are made straight away and listed here; anything bigger waits for your confirmation.</p>
            <div className="mt-3 flex flex-wrap gap-1.5" data-testid="os-ai-suggestions">
              {suggestionsFor(pc).map((s) => (
                <button key={s} type="button" className="rounded-full border border-[#D9E2EA] bg-white px-3 py-1.5 text-xs text-[#2F4157] hover:bg-[#F2F5F8]"
                  onClick={() => (s.endsWith("…") || s.endsWith("…?") ? setText(s.replace(/…\??$/, "")) : send(s))}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={cn("max-w-[92%] rounded-xl px-3 py-2 text-sm", m.role === "user" ? "ml-auto bg-[#2F4157] text-white" : "bg-[#F5F7FA] text-[#1F2D3D]")} data-testid={m.role === "assistant" ? "os-ai-reply" : undefined}>
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
            {m.created_at && <p className={cn("mt-1 text-[11px]", m.role === "user" ? "text-white/70" : muted)}>{fmtDateTime(m.created_at)}</p>}
          </div>
        ))}
        {actions.map((a) => <AiActionCard key={a.id} action={a} onChange={(next) => { setActions((list) => list.map((x) => (x.id === next.id ? next : x))); if (next.status === "executed") announceDataChanged(); }} />)}
        {busy && <p className={cn("flex items-center gap-1.5 text-sm", muted)} role="status"><Sparkles size={14} aria-hidden="true" />Working on it…</p>}
        <div ref={endRef} />
      </div>
      <div className={cn("border-t border-[#E6E9EE]", panel ? "p-2.5" : "p-3")}>
        <ErrorLine message={err} />
        {open.length > 1 && (
          <button type="button" className={cn(btn, "mb-2 w-full")} disabled={confirmingAll || busy} onClick={confirmAll} data-testid="os-ai-confirm-all">
            <CheckCheck size={15} aria-hidden="true" />{confirmingAll ? "Confirming…" : `Confirm all ${open.length} suggestions`}
          </button>
        )}
        <div className="flex gap-2">
          <textarea aria-label="Message" rows={panel ? 2 : 2} className={cn(input, "flex-1 resize-none")} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask Elco Assistant…" data-testid="os-ai-input" />
          <button type="button" className={btnPrimary} onClick={() => send()} disabled={busy || !text.trim()} aria-label="Send"><Send size={16} aria-hidden="true" /></button>
        </div>
        <label className="mt-1.5 flex min-h-8 items-center gap-2 text-xs text-[#3A4B60]">
          <input type="checkbox" className="h-4 w-4" checked={!auto} onChange={(e) => { setAuto(!e.target.checked); try { localStorage.setItem(AUTO_KEY, e.target.checked ? "0" : "1"); } catch { /* private mode */ } }} data-testid="os-ai-ask-first" />
          Ask me before every change
        </label>
      </div>
    </div>
  );
}
