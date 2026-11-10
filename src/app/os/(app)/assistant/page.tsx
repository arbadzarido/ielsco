"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { AssistantChat } from "@/components/os/assistant/AssistantChat";
import { useAssistantPageInput } from "@/components/os/assistant/ElcoAssistant";
import { useQuery } from "@/components/os/data";
import { PageTitle, Select, Tabs, btn, muted, panel, ring } from "@/components/os/ui";
import { WORKSPACES } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

// The full-page Elco Assistant, for longer conversations and planning. The same assistant opens from every page in a
// side panel (ElcoAssistant); conversations started there continue here. Elco Assistant is the Company OS assistant,
// not the Elco AI company.
const AGENTS = [
  { key: "assistant", label: "Elco Assistant", hint: "Ask about anything you can open, or tell it what to create or change." },
  { key: "operations", label: "Operations focus", hint: "Overdue and blocked work, deadlines, weekly review prep." },
  { key: "partnerships", label: "Partnerships focus", hint: "Pipeline, follow-ups due, outreach drafts." },
  { key: "growth", label: "Growth focus", hint: "Campaign calendar, content ideas, growth KPIs." },
] as const;

export default function AssistantPage() {
  const params = useSearchParams();
  const router = useRouter();
  const page = useAssistantPageInput();
  const agent = (AGENTS.find((a) => a.key === params.get("agent"))?.key ?? "assistant") as (typeof AGENTS)[number]["key"];
  const conv = params.get("c");
  const convs = useQuery<{ id: string; title: string | null; updated_at: string; company_code: string | null }[]>((s) => s.from("os_ai_conversations").select("id, title, updated_at, company_code").eq("agent", agent).order("updated_at", { ascending: false }).limit(30), [agent]);
  const budget = useQuery<{ budget_usd: number; spent_usd: number; enabled: boolean }[]>((s) => s.rpc("os_ai_budget"), []);
  const [company, setCompany] = useState("");
  const [deep, setDeep] = useState(false);
  const b = budget.data?.[0];
  const info = AGENTS.find((a) => a.key === agent)!;
  return (
    <div>
      <PageTitle title="Elco Assistant" description="Your work assistant across Company OS. It reads only what you can open; ordinary changes you ask for are made at once and listed, bigger ones wait for you. Also available from every page (Ctrl+J)." />
      <Tabs label="Focus" current={agent} hrefFor={(k) => `/os/assistant?agent=${k}`} tabs={AGENTS.map((a) => ({ key: a.key, label: a.label }))} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="order-2 lg:order-1">
          <button type="button" className={cn(btn, "mb-2 w-full")} onClick={() => router.push(`/os/assistant?agent=${agent}`)}><MessageSquarePlus size={15} aria-hidden="true" />New conversation</button>
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
          {!conv && (
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E6E9EE] px-3 py-2">
              <Select ariaLabel="Company context" value={company} onChange={setCompany} options={WORKSPACES.map((w) => ({ value: w.code, label: w.name }))} placeholder="All my companies" className="w-44" />
              <span className={cn("text-xs", muted)}>{info.hint}</span>
            </div>
          )}
          <AssistantChat key={agent} agent={agent} conversationId={conv} variant="page" page={page} company={company || null} deep={deep}
            onConversation={(id) => router.replace(`/os/assistant?agent=${agent}&c=${id}`)} onSent={() => { convs.reload(); budget.reload(); }} />
          <label className="flex min-h-9 items-center gap-2 border-t border-[#E6E9EE] px-3 text-xs text-[#3A4B60]"><input type="checkbox" className="h-4 w-4" checked={deep} onChange={(e) => setDeep(e.target.checked)} />Deeper analysis with the stronger model (uses more budget)</label>
        </section>
      </div>
    </div>
  );
}
