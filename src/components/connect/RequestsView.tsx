"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { EmptyState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, focusRing } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import type { IntroRequest } from "@/lib/connect/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, PersonCard, SafetyMenu, useLoad, when } from "./shared";

const STATUS: Record<IntroRequest["status"], string> = { pending: "Waiting for an answer", accepted: "Accepted · you're connected", declined: "Declined", cancelled: "Cancelled" };

function RequestCard({ ctx, r, onChange }: { ctx: DashboardCtx; r: IntroRequest; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const act = async (fn: () => Promise<string>, after: string) => {
    setBusy(true); setError(null);
    try { await fn(); setDone(after); onChange(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  if (!r.person) return null;
  const person = r.person;
  return (
    <div data-testid={`request-${r.id}`} className="space-y-0">
      <PersonCard person={person} compact footer={
        <div className="w-full space-y-3">
          <blockquote className="whitespace-pre-line rounded-xl bg-[#F7F8FA] p-3 text-base">{r.message}</blockquote>
          {(r.reason || r.common || r.topic) && (
            <dl className="grid grid-cols-1 gap-1 text-sm">
              {r.reason && <div><dt className="inline font-semibold">Why: </dt><dd className="inline">{r.reason}</dd></div>}
              {r.common && <div><dt className="inline font-semibold">In common: </dt><dd className="inline">{r.common}</dd></div>}
              {r.topic && <div><dt className="inline font-semibold">Would like to talk about: </dt><dd className="inline">{r.topic}</dd></div>}
            </dl>
          )}
          <p className="text-sm text-[#2F4157]/55">{when(r.created_at)}{r.box === "outgoing" && ` · ${STATUS[r.status]}`}</p>
          {error && <p role="alert" className="text-sm text-[#B4383A]">{error}</p>}
          {done ? <p role="status" className="text-base font-semibold text-[#577E90]">{done}</p> : (
            <div className="flex flex-wrap items-center gap-2">
              {r.box === "incoming" && (
                <>
                  <button type="button" disabled={busy} className={btnPrimary} data-testid="request-accept"
                    onClick={() => act(async () => { const x = await connectApi.respond(ctx.supabase, r.id, true); track("connect_intro_answered", { accepted: true }); return x; }, "Accepted. You're now connected.")}>Accept</button>
                  <button type="button" disabled={busy} className={btnSecondary} data-testid="request-decline"
                    onClick={() => act(async () => { const x = await connectApi.respond(ctx.supabase, r.id, false); track("connect_intro_answered", { accepted: false }); return x; }, "Declined. They won't be told why.")}>Decline</button>
                  <SafetyMenu supabase={ctx.supabase} person={person} context="request" contextId={r.id} onBlocked={onChange} />
                </>
              )}
              {r.box === "outgoing" && r.status === "pending" && (
                <button type="button" disabled={busy} className={btnSecondary} onClick={() => act(() => connectApi.cancelIntro(ctx.supabase, r.id), "Intro cancelled.")}>Cancel intro</button>
              )}
              {r.box === "outgoing" && r.status === "accepted" && <Link href={`/dashboard/connect/messages/${person.id}`} className={btnPrimary}>Message</Link>}
            </div>
          )}
        </div>
      } />
    </div>
  );
}

export function RequestsView(ctx: DashboardCtx) {
  const params = useSearchParams();
  const [box, setBox] = useState<"incoming" | "outgoing">(params?.get("box") === "outgoing" ? "outgoing" : "incoming");
  const data = useLoad(() => connectApi.requests(ctx.supabase, box), [ctx.supabase, box]);
  return (
    <ConnectFrame title="Letter Intros" description="Introductions from members who'd like to connect with you. You're connected only if you accept.">
      <div role="tablist" aria-label="Intro box" className="flex gap-2">
        {(["incoming", "outgoing"] as const).map((b) => (
          <button key={b} role="tab" type="button" aria-selected={box === b} onClick={() => setBox(b)}
            className={cn("rounded-full px-4 py-2 text-base font-semibold", focusRing, box === b ? "bg-[#2F4157] text-white" : "border border-[#E3E7ED] bg-white")}>
            {b === "incoming" ? "Received" : "Sent"}
          </button>
        ))}
      </div>
      <LoadGate state={data.state} onRetry={data.reload} label="Loading intros…" />
      {data.state.s === "ready" && data.state.data.length === 0 && (
        <EmptyState title={box === "incoming" ? "No intros waiting" : "You haven't sent any intros recently"}
          body={box === "incoming" ? "When someone introduces themselves, it appears here." : "Find someone in Discover and introduce yourself."}
          action={<Link href="/dashboard/connect/discover" className={btnPrimary}>Discover people</Link>} />
      )}
      {data.state.s === "ready" && data.state.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{data.state.data.map((r) => <RequestCard key={r.id} ctx={ctx} r={r} onChange={data.reload} />)}</div>
      )}
    </ConnectFrame>
  );
}
