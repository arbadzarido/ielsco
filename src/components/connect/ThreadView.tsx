"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Send } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { EmptyState, ErrorState, LoadingState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, focusRing, inputClass } from "@/components/dashboard/ui";
import { connectApi, isUnavailable } from "@/lib/connect/api";
import type { ConnectionRow, Message } from "@/lib/connect/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ConnectFrame, SafetyMenu, UnavailableNotice, when } from "./shared";

const POLL_MS = 5000;

// Conversation with one connection. New messages arrive by polling every 5 s while the tab is visible (no realtime
// service needed); older messages load page by page.
export function ThreadView(ctx: DashboardCtx & { id: string }) {
  const { supabase, id } = ctx;
  const [conn, setConn] = useState<ConnectionRow | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]); // oldest first
  const [state, setState] = useState<"loading" | "ready" | "error" | "unavailable" | "not_connected">("loading");
  const [error, setError] = useState("");
  const [hasOlder, setHasOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottom = useRef<HTMLLIElement>(null);

  const merge = useCallback((incoming: Message[]) => setMessages((prev) => {
    const map = new Map(prev.map((m) => [m.id, m]));
    incoming.forEach((m) => map.set(m.id, m));
    return [...map.values()].sort((a, b) => a.id - b.id);
  }), []);

  const loadLatest = useCallback(async (first = false) => {
    try {
      const page = await connectApi.messages(supabase, id, null, 30);
      merge(page);
      if (first) setHasOlder(page.length === 30);
      await connectApi.markRead(supabase, id);
      setState("ready");
    } catch (e) {
      if (isUnavailable(e)) return setState("unavailable");
      if (/only message mutual connections/.test((e as Error).message)) return setState("not_connected");
      if (first) { setError((e as Error).message); setState("error"); }
    }
  }, [supabase, id, merge]);

  useEffect(() => {
    connectApi.connections(supabase).then((rows) => setConn(rows.find((r) => r.person.id === id) ?? null)).catch(() => setConn(null));
    loadLatest(true);
    const t = setInterval(() => { if (document.visibilityState === "visible") loadLatest(); }, POLL_MS);
    return () => clearInterval(t);
  }, [supabase, id, loadLatest]);

  const lastId = messages.at(-1)?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [lastId]);

  const loadOlder = async () => {
    const page = await connectApi.messages(supabase, id, messages[0]?.id ?? null, 30);
    merge(page);
    setHasOlder(page.length === 30);
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true); setSendError(null);
    try {
      await connectApi.send(supabase, id, draft);
      track("connect_message_sent");
      setDraft("");
      await loadLatest();
    } catch (err) {
      setSendError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const name = conn?.person.display_name ?? "Conversation";
  return (
    <ConnectFrame title={name}>
      <Link href="/dashboard/connect/messages" className={cn(btnSecondary, "w-max px-4 py-2 text-sm")}><ArrowLeft size={16} /> All messages</Link>
      {state === "unavailable" && <UnavailableNotice />}
      {state === "loading" && <LoadingState label="Loading conversation…" />}
      {state === "error" && <ErrorState message={error} onRetry={() => loadLatest(true)} />}
      {state === "not_connected" && (
        <EmptyState title="You're not connected with this member" body="Messages are only for mutual connections. Send a Letter Intro first." action={<Link href={`/dashboard/connect/people/${id}`} className={btnPrimary}>View Passport</Link>} />
      )}
      {state === "ready" && (
        <section className={cn(card, "flex h-[min(70vh,44rem)] flex-col")} aria-label={`Conversation with ${name}`}>
          <header className="flex items-center gap-3 border-b border-[#E3E7ED] p-4">
            <Avatar name={name} url={conn?.person.avatar_url} size={40} />
            <Link href={`/dashboard/connect/people/${id}`} className={cn("flex-1 font-bold hover:underline", focusRing)}>{name}</Link>
            {conn && <SafetyMenu supabase={supabase} person={conn.person} context="message" contextId={messages.at(-1)?.id?.toString() ?? null}
              onBlocked={() => setConn({ ...conn, blocked: true })} />}
          </header>
          <ol data-testid="message-list" className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
            {hasOlder && <li className="text-center"><button type="button" onClick={loadOlder} className={cn(btnSecondary, "px-3 py-1.5 text-sm")}>Load older messages</button></li>}
            {messages.length === 0 && <li className="py-10 text-center text-[#2F4157]/60">No messages yet. Say hello!</li>}
            {messages.map((m) => (
              <li key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-2", m.mine ? "bg-[#2F4157] text-white" : "bg-[#F1F4F8]")}>
                  <p className="whitespace-pre-line break-words text-base">{m.body}</p>
                  <p className={cn("mt-0.5 text-xs", m.mine ? "text-white/70" : "text-[#2F4157]/55")}><time dateTime={m.created_at}>{when(m.created_at)}</time></p>
                </div>
              </li>
            ))}
            <li ref={bottom} aria-hidden="true" />
          </ol>
          {conn?.blocked ? (
            <p className="border-t border-[#E3E7ED] p-4 text-base text-[#2F4157]/65">Messaging is off because one of you blocked the other.</p>
          ) : (
            <form onSubmit={send} className="flex items-end gap-2 border-t border-[#E3E7ED] p-3">
              <label htmlFor="thread-input" className="sr-only">Message</label>
              <textarea id="thread-input" rows={1} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                className={cn(inputClass, "max-h-40 resize-none")} placeholder="Write a message" />
              <button type="submit" disabled={sending || !draft.trim()} className={btnPrimary} aria-label="Send message" data-testid="thread-send"><Send size={18} /></button>
            </form>
          )}
          {sendError && <p role="alert" className="px-4 pb-3 text-sm text-[#B4383A]">{sendError}</p>}
        </section>
      )}
    </ConnectFrame>
  );
}
