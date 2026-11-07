"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquarePlus, Send } from "lucide-react";
import { AiActionCard, type AiAction } from "@/components/os/AiActionCard";
import { useOsMe } from "@/components/os/OsProvider";
import { useQuery } from "@/components/os/data";
import { ErrorLine, PageTitle, Select, Tabs, btn, btnPrimary, input, muted, panel, ring } from "@/components/os/ui";
import { WORKSPACES, fmtDateTime } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

const AGENTS = [
  { key: "assistant", label: "Company Assistant", hint: "Ask about anything you have access to: projects, tasks, documents, KPIs, the timeline." },
  { key: "operations", label: "Operations", hint: "Overdue and blocked work, deadlines, weekly review prep." },
  { key: "partnerships", label: "Partnerships", hint: "Pipeline, follow-ups due, outreach drafts." },
  { key: "growth", label: "Growth", hint: "Campaign calendar, content ideas, growth KPIs." },
] as const;
type Msg = { id: number | string; role: string; content: string; model?: string | null; created_at?: string };
type Action = AiAction;

export default function AssistantPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { supabase } = useOsMe();
  const agent = (AGENTS.find((a) => a.key === params.get("agent"))?.key ?? "assistant") as (typeof AGENTS)[number]["key"];
  const conv = params.get("c");
  const convs = useQuery<{ id: string; title: string | null; updated_at: string; company_code: string | null }[]>((s) => s.from("os_ai_conversations").select("id, title, updated_at, company_code").eq("agent", agent).order("updated_at", { ascending: false }).limit(30), [agent]);
  const budget = useQuery<{ budget_usd: number; spent_usd: number; enabled: boolean }[]>((s) => s.rpc("os_ai_budget"), []);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [text, setText] = useState("");
  const [company, setCompany] = useState("");
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conv) { setMsgs([]); setActions([]); return; }
    Promise.all([
      supabase.from("os_ai_messages").select("id, role, content, model, created_at").eq("conversation_id", conv).in("role", ["user", "assistant"]).order("created_at"),
      supabase.from("os_ai_actions").select("id, action_type, preview, status, result, details").eq("conversation_id", conv).order("created_at"),
    ]).then(([m, a]) => { setMsgs((m.data ?? []) as Msg[]); setActions((a.data ?? []) as Action[]); });
  }, [conv, supabase]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, actions.length]);

  async function send() {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true); setErr(null); setText("");
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", content: message }]);
    try {
      const r = await fetch("/os/api/ai/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ agent, conversation_id: conv ?? undefined, company_code: conv ? undefined : company || null, message, deep }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(j.error ?? "The agent didn't answer."); if (j.conversation_id && !conv) router.replace(`/os/assistant?agent=${agent}&c=${j.conversation_id}`); }
      else {
        setMsgs((m) => [...m, { id: `a${Date.now()}`, role: "assistant", content: j.reply, model: j.model }]);
        setActions((a) => [...a, ...j.actions.map((x: Action) => ({ ...x, status: "proposed" }))]);
        if (!conv) router.replace(`/os/assistant?agent=${agent}&c=${j.conversation_id}`);
        convs.reload(); budget.reload();
      }
    } catch { setErr("Couldn't reach the server."); }
    setBusy(false);
  }
  const b = budget.data?.[0];
  const info = AGENTS.find((a) => a.key === agent)!;
  return (
    <div>
      <PageTitle title="Assistant" description="Four agents that read only what you can open, and change nothing until you confirm." />
      <Tabs label="Agents" current={agent} hrefFor={(k) => `/os/assistant?agent=${k}`} tabs={AGENTS.map((a) => ({ key: a.key, label: a.label }))} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1">
          <button type="button" className={cn(btn, "mb-2 w-full")} onClick={() => { setErr(null); router.push(`/os/assistant?agent=${agent}`); }}><MessageSquarePlus size={15} aria-hidden="true" />New conversation</button>
          <ul className="space-y-0.5 text-sm">
            {(convs.data ?? []).map((c) => (
              <li key={c.id}><a href={`/os/assistant?agent=${agent}&c=${c.id}`} onClick={(e) => { e.preventDefault(); router.push(`/os/assistant?agent=${agent}&c=${c.id}`); }}
                className={cn("block truncate rounded-md px-2 py-1.5 hover:bg-[#EEF1F5]", ring, c.id === conv && "bg-[#EEF1F5] font-medium")}>{c.title ?? "Conversation"}</a></li>
            ))}
            {convs.data && !convs.data.length && <li className={cn("px-2 text-xs", muted)}>No conversations yet.</li>}
          </ul>
          {b && <p className={cn("mt-4 text-xs", muted)} data-testid="os-ai-budget">AI budget this month: US${Number(b.spent_usd).toFixed(2)} of US${Number(b.budget_usd).toFixed(2)} used{!b.enabled && " (paused)"}.</p>}
        </aside>
        <section className={cn(panel, "order-1 flex min-h-[60vh] flex-col lg:order-2")} aria-label={`${info.label} conversation`}>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="os-ai-thread">
            {!msgs.length && <div className={cn("text-sm", muted)}><p className="font-medium text-[#1F2D3D]">{info.label}</p><p className="mt-1">{info.hint}</p></div>}
            {msgs.map((m) => (
              <div key={m.id} className={cn("max-w-[92%] rounded-xl px-3 py-2 text-sm", m.role === "user" ? "ml-auto bg-[#2F4157] text-white" : "bg-[#F5F7FA] text-[#1F2D3D]")}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {m.created_at && <p className={cn("mt-1 text-[11px]", m.role === "user" ? "text-white/70" : muted)}>{fmtDateTime(m.created_at)}</p>}
              </div>
            ))}
            {actions.map((a) => <AiActionCard key={a.id} action={a} onChange={(next) => setActions((list) => list.map((x) => (x.id === next.id ? next : x)))} />)}
            {busy && <p className={cn("text-sm", muted)} role="status">Thinking…</p>}
            <div ref={endRef} />
          </div>
          <div className="border-t border-[#E6E9EE] p-3">
            <ErrorLine message={err} />
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {!conv && <Select ariaLabel="Company context" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All my companies" className="w-44" />}
              <label className="flex min-h-10 items-center gap-2 text-xs text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={deep} onChange={(e) => setDeep(e.target.checked)} />Deeper analysis (uses more budget)</label>
            </div>
            <div className="mt-2 flex gap-2">
              <textarea aria-label="Message" rows={2} className={cn(input, "flex-1 resize-none")} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Ask ${info.label}…`} data-testid="os-ai-input" />
              <button type="button" className={btnPrimary} onClick={send} disabled={busy || !text.trim()} aria-label="Send"><Send size={16} aria-hidden="true" /></button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
