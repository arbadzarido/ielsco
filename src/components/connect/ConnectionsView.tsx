"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { EmptyState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, focusRing, inputClass } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { labels } from "@/lib/connect/options";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, PersonCard, SafetyMenu, useLoad, when } from "./shared";
import { ThreadView } from "./ThreadView";
import { PeopleTabs } from "./PeopleTabs";

const NONE = <EmptyState title="No connections yet" body="Send a Letter Intro to someone in People. Once they accept, you can message each other in your inbox." action={<Link href="/dashboard/connect/discover" className={btnPrimary}>Discover people</Link>} />;

export function ConnectionsView(ctx: DashboardCtx) {
  const data = useLoad(() => connectApi.connections(ctx.supabase), [ctx.supabase]);
  return (
    <ConnectFrame title="My connections" description="People you're mutually connected with."
      actions={<Link href="/dashboard/connect/safety" className={btnSecondary}>Safety & blocked members</Link>}>
      <PeopleTabs />
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && (data.state.data.length === 0 ? NONE : (
        <div data-testid="connections-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.state.data.map((c) => (
            <PersonCard key={c.person.id} person={c.person}
              reasons={[`Connected ${when(c.connected_at)} via ${c.source === "intro" ? "Letter Intro" : "Quick Match"}`,
                ...(c.person.timezone ? [`Time zone: ${c.person.timezone}`] : []),
                ...(c.person.availability_days.length ? [`Usually free: ${labels("day", c.person.availability_days).join(", ")}`] : [])]}
              footer={c.blocked ? <p className="text-sm text-[#2F4157]/60">Blocked. Messaging is off.</p> : (
                <>
                  <Link href={`/dashboard/connect/messages/${c.person.id}`} className={btnPrimary}>Message{c.unread ? ` (${c.unread})` : ""}</Link>
                  <Link href={`/dashboard/connect/people/${c.person.id}`} className={btnSecondary}>Passport</Link>
                  <SafetyMenu supabase={ctx.supabase} person={c.person} context="profile" onBlocked={data.reload} />
                </>
              )} />
          ))}
        </div>
      ))}
    </ConnectFrame>
  );
}

// Inbox list: conversations newest first, unread badges, a name/message search. Refreshes every 15 s while visible
// so unread counts stay current (an open thread polls on its own).
export function ConversationList({ supabase, activeId }: { supabase: DashboardCtx["supabase"]; activeId?: string }) {
  const data = useLoad(() => connectApi.connections(supabase), [supabase]);
  const [q, setQ] = useState("");
  const { reload } = data;
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") reload(); }, 15_000);
    return () => clearInterval(t);
  }, [reload]);
  if (data.state.s !== "ready") return <LoadGate state={data.state} onRetry={data.reload} />;
  const rows = [...data.state.data].sort((a, b) => (b.last_at ?? b.connected_at).localeCompare(a.last_at ?? a.connected_at));
  if (rows.length === 0) return NONE;
  const term = q.trim().toLowerCase();
  const shown = term ? rows.filter((c) => `${c.person.display_name} ${c.last_body ?? ""}`.toLowerCase().includes(term)) : rows;
  return (
    <div className="space-y-3">
      <label className="relative block">
        <span className="sr-only">Search conversations</span>
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/45" aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" data-testid="inbox-search"
          className={cn(inputClass, "rounded-full py-2.5 pl-11 text-base")} />
      </label>
      {shown.length === 0 ? <p className="px-2 py-6 text-center text-[15px] text-[#2F4157]/60">No conversation matches that search.</p> : (
        <ul data-testid="conversation-list" className={cn(card, "divide-y divide-[#E3E7ED] overflow-hidden")}>
          {shown.map((c) => (
            <li key={c.person.id}>
              <Link href={`/dashboard/connect/messages/${c.person.id}`} aria-current={activeId === c.person.id ? "page" : undefined}
                className={cn("flex items-center gap-3 p-4 hover:bg-[#F7F8FA]", focusRing, activeId === c.person.id && "bg-[#EAEFF5] hover:bg-[#EAEFF5]")}>
                <Avatar name={c.person.display_name} url={c.person.avatar_url} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-base", c.unread ? "font-bold" : "font-semibold")}>{c.person.display_name}</span>
                    <span className="shrink-0 text-sm text-[#2F4157]/55">{when(c.last_at ?? c.connected_at)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-[#2F4157]/65">{c.blocked ? "Blocked" : c.last_body ? `${c.last_mine ? "You: " : ""}${c.last_body}` : "Say hello"}</span>
                    {c.unread > 0 && <span className="rounded-full bg-[#E56668] px-2 py-0.5 text-xs font-bold text-white" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Inbox: the conversation list, plus the open thread beside it on desktop (lg+). Phones show one or the other:
// /messages is the list, /messages/[id] the thread with a back link.
export function InboxView(ctx: DashboardCtx & { id?: string }) {
  return (
    <ConnectFrame title="Inbox" description="Private conversations with your connections. Only the two of you can read them.">
      <div className="grid gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
        <div className={cn(ctx.id && "hidden lg:block")}><ConversationList supabase={ctx.supabase} activeId={ctx.id} /></div>
        {ctx.id ? <ThreadView {...ctx} id={ctx.id} embedded /> : (
          <div className="hidden lg:flex lg:min-h-[24rem] lg:items-center lg:justify-center lg:rounded-2xl lg:border lg:border-dashed lg:border-[#E3E7ED] lg:bg-white/60" data-testid="inbox-empty-pane">
            <p className="max-w-xs text-center text-[16px] text-[#2F4157]/60">Choose a conversation to read and reply. New connections appear here after an intro is accepted.</p>
          </div>
        )}
      </div>
    </ConnectFrame>
  );
}

// Kept for older imports: the Inbox without an open thread.
export function MessagesView(ctx: DashboardCtx) {
  return <InboxView {...ctx} />;
}
