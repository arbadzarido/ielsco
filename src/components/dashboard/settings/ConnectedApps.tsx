"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link2 } from "lucide-react";
import { btnSecondary, cardGloss, tag } from "../ui";
import { ELCO_URL } from "@/lib/elco";
import { isMissingRelation } from "@/lib/dashboard/profile";
import { cn } from "@/lib/utils";

interface Link { id: string; scopes: string[]; created_at: string }
interface Summary { level_estimate: string | null; focus_skills: string[]; practice_count_30d: number; last_active_at: string | null; updated_at: string }
type State = { s: "loading" } | { s: "unavailable" } | { s: "error"; message: string } | { s: "ready"; link: Link | null; summary: Summary | null };

const LEVEL: Record<string, string> = { beginner: "Beginner", elementary: "Elementary", intermediate: "Intermediate", upper_intermediate: "Upper-intermediate", advanced: "Advanced" };
const SCOPE: Record<string, string> = { "goals:read": "Reads your goals", "summary:write": "Shares your progress" };

// Elco account link (Phase 5). Linking always starts in Elco; IELSco shows the status and can unlink.
export function ConnectedApps({ supabase }: { supabase: SupabaseClient }) {
  const [state, setState] = useState<State>({ s: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([
      supabase.from("elco_account_links").select("id, scopes, created_at").is("revoked_at", null).maybeSingle(),
      supabase.from("elco_learning_summaries").select("level_estimate, focus_skills, practice_count_30d, last_active_at, updated_at").maybeSingle(),
    ]);
    if (l.error && isMissingRelation(l.error)) return setState({ s: "unavailable" });
    if (l.error) return setState({ s: "error", message: l.error.message });
    setState({ s: "ready", link: l.data as Link | null, summary: s.error ? null : (s.data as Summary | null) });
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const unlink = async () => {
    if (!window.confirm("Unlink Elco from your IELSco account? Elco will stop reading your goals and sharing progress.")) return;
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/integrations/elco/link", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setNotice("Couldn't unlink right now. Please try again.");
    setNotice("Elco is unlinked.");
    load();
  };

  return (
    <section id="connected-apps" aria-labelledby="connected-apps-title" className={cn(cardGloss, "scroll-mt-24 p-6 md:p-8")} data-testid="settings-connected-apps">
      <div className="mb-6 flex items-start gap-3">
        <Link2 size={22} className="mt-0.5 text-[#577E90]" aria-hidden="true" />
        <div>
          <h2 id="connected-apps-title" className="text-xl font-bold">Connected apps</h2>
          <p className="mt-1 text-base text-[#2F4157]/65">Elco AI is a separate app with its own account. Connecting is optional.</p>
        </div>
      </div>

      {state.s === "loading" && <p className="text-base text-[#2F4157]/60">Loading…</p>}
      {state.s === "unavailable" && <p className="text-base text-[#2F4157]/70" data-testid="connected-apps-unavailable">Connecting Elco isn&apos;t switched on yet.</p>}
      {state.s === "error" && <p role="alert" className="text-base text-[#C04C4E]">Couldn&apos;t load connected apps: {state.message}</p>}
      {state.s === "ready" && !state.link && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid="elco-not-linked">
          <p className="text-base text-[#2F4157]/70">Not connected. To connect, open Elco → Settings → Connect IELSco.</p>
          <a href={`${ELCO_URL}/settings`} className={btnSecondary}>Open Elco</a>
        </div>
      )}
      {state.s === "ready" && state.link && (
        <div className="space-y-4" data-testid="elco-linked">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Elco AI</span>
            <span className={tag}>Connected {new Date(state.link.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            {state.link.scopes.map((s) => <span key={s} className={tag}>{SCOPE[s] ?? s}</span>)}
          </div>
          {state.summary && (
            <div className="rounded-xl border border-[#E3E7ED] bg-[#F7F8FA] p-4" data-testid="elco-summary">
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-[#577E90]">Your progress with Elco (estimate)</p>
              <p className="text-base">
                {state.summary.level_estimate ? `Level: ${LEVEL[state.summary.level_estimate] ?? state.summary.level_estimate}. ` : ""}
                {state.summary.practice_count_30d} practice sessions in the last 30 days.
                {state.summary.focus_skills.length > 0 && ` Focus: ${state.summary.focus_skills.join(", ")}.`}
              </p>
              <a href={`${ELCO_URL}/progress`} className="text-base font-semibold text-[#577E90] underline-offset-4 hover:underline">See details in Elco</a>
            </div>
          )}
          <button type="button" data-testid="elco-unlink" disabled={busy} onClick={unlink} className={btnSecondary}>{busy ? "Unlinking…" : "Unlink Elco"}</button>
        </div>
      )}
      {notice && <p role="status" className="mt-4 text-base text-[#577E90]">{notice}</p>}
    </section>
  );
}
