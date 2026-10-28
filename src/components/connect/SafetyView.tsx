"use client";

import { useState } from "react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { btnSecondary, card, cardGloss } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { cn } from "@/lib/utils";
import { GUIDELINES } from "./PassportForm";
import { ConnectFrame, LoadGate, useLoad, when } from "./shared";

export function SafetyView({ supabase }: DashboardCtx) {
  const data = useLoad(() => connectApi.blocks(supabase), [supabase]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unblock = async (id: string) => {
    setBusy(id); setError(null);
    try { await connectApi.unblock(supabase, id); await data.reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  return (
    <ConnectFrame title="Safety" description="How Connect keeps members safe, and the people you've blocked.">
      <section className={cn(cardGloss, "space-y-3 p-6")}>
        <h2 className="text-xl font-bold">Community guidelines</h2>
        <ul className="list-disc space-y-1 pl-5 text-base text-[#2F4157]/75">{GUIDELINES.map((g) => <li key={g}>{g}</li>)}</ul>
        <ul className="space-y-1 text-base text-[#2F4157]/75">
          <li>• Connect is for members aged 18 and over.</li>
          <li>• You can only message people who accepted your intro (or both said yes after a Quick Match).</li>
          <li>• Quick Match calls are never recorded. Your camera stays off unless you turn it on.</li>
          <li>• Reports go to the IELSco team only; the other person isn&apos;t told who reported them.</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Blocked members</h2>
        <LoadGate state={data.state} onRetry={data.reload} />
        {error && <p role="alert" className="text-[#B4383A]">{error}</p>}
        {data.state.s === "ready" && (data.state.data.length === 0 ? (
          <p className="text-base text-[#2F4157]/60">You haven&apos;t blocked anyone.</p>
        ) : (
          <ul data-testid="blocked-list" className={cn(card, "divide-y divide-[#E3E7ED]")}>
            {data.state.data.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 p-4">
                <span><span className="font-semibold">{b.display_name}</span> <span className="text-sm text-[#2F4157]/55">· blocked {when(b.blocked_at)}</span></span>
                <button type="button" disabled={busy === b.id} onClick={() => unblock(b.id)} className={cn(btnSecondary, "px-4 py-2 text-sm")}>Unblock</button>
              </li>
            ))}
          </ul>
        ))}
      </section>
    </ConnectFrame>
  );
}
