"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowUpRight, CheckCircle2, Link2 } from "lucide-react";
import { btnPrimary, btnSecondary, cardGloss, tag } from "../ui";
import { ELCO_URL } from "@/lib/elco";
import { EXAM_NAMES, elcoConnectUrl, elcoNextStep, useElcoState } from "@/lib/elco-state";
import { isMissingRelation } from "@/lib/dashboard/profile";
import { dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Link { id: string; scopes: string[]; created_at: string; elco_display_name: string | null }
interface Summary { level_estimate: string | null; focus_skills: string[]; practice_count_30d: number; last_active_at: string | null; updated_at: string }
type State = { s: "loading" } | { s: "unavailable" } | { s: "error"; message: string } | { s: "ready"; link: Link | null; summary: Summary | null };

const LEVEL: Record<string, string> = { beginner: "Beginner", elementary: "Elementary", intermediate: "Intermediate", upper_intermediate: "Upper-intermediate", advanced: "Advanced" };
const SCOPE: Record<string, string> = { "goals:read": "Reads your goals", "summary:write": "Shares your progress" };

// Elco account link. Linking can start here ("Connect Elco account" opens Elco's confirmation page, which runs the same
// signed authorization-code flow and returns here) or in Elco Settings. Unlinking keeps every Elco purchase and record;
// Elco plan benefits on IELSco (Speaking Club, mentoring) pause until an account is connected again.
export function ConnectedApps({ supabase }: { supabase: SupabaseClient }) {
  const [state, setState] = useState<State>({ s: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { elco, reload } = useElcoState(supabase);

  const load = useCallback(async () => {
    const [l, s] = await Promise.all([
      supabase.from("elco_account_links").select("id, scopes, created_at, elco_display_name").is("revoked_at", null).maybeSingle(),
      supabase.from("elco_learning_summaries").select("level_estimate, focus_skills, practice_count_30d, last_active_at, updated_at").maybeSingle(),
    ]);
    if (l.error && isMissingRelation(l.error)) return setState({ s: "unavailable" });
    if (l.error) return setState({ s: "error", message: l.error.message });
    setState({ s: "ready", link: l.data as Link | null, summary: s.error ? null : (s.data as Summary | null) });
  }, [supabase]);

  useEffect(() => {
    load();
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("elco") === "connected") setNotice("Elco is connected.");
  }, [load]);

  const unlink = async () => {
    const benefits = elco?.active ? " Your Elco plan and purchases stay as they are, but its IELSco benefits (Daily Speaking Club, mentoring) pause until you connect an Elco account again." : " Your Elco account and purchases stay as they are.";
    if (!window.confirm(`Disconnect Elco from your IELSco account? Elco will stop reading your goals and sharing progress.${benefits}`)) return;
    setBusy(true);
    setNotice(null);
    const res = await fetch("/api/integrations/elco/link", { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setNotice("Couldn't disconnect right now. Please try again.");
    setNotice("Elco is disconnected.");
    load();
    reload();
  };
  const next = elcoNextStep(elco);

  return (
    <section id="connected-apps" aria-labelledby="connected-apps-title" className={cn(cardGloss, "scroll-mt-24 p-6 md:p-8")} data-testid="settings-connected-apps">
      <div className="mb-6 flex items-start gap-3">
        <Link2 size={22} className="mt-0.5 text-[#577E90]" aria-hidden="true" />
        <div>
          <h2 id="connected-apps-title" className="text-xl font-bold">Connected apps</h2>
          <p className="mt-1 text-base text-[#2F4157]/65">Elco AI is a separate app with its own account. Connecting is optional and never matches accounts by email.</p>
        </div>
      </div>

      {state.s === "loading" && <p className="text-base text-[#2F4157]/60">Loading…</p>}
      {state.s === "unavailable" && <p className="text-base text-[#2F4157]/70" data-testid="connected-apps-unavailable">Connecting Elco isn&apos;t switched on yet.</p>}
      {state.s === "error" && <p role="alert" className="text-base text-[#C04C4E]">Couldn&apos;t load connected apps: {state.message}</p>}
      {state.s === "ready" && !state.link && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid="elco-not-linked">
          <p className="text-base text-[#2F4157]/70">Not connected. Connect to use your Elco plan&apos;s IELSco benefits here and see your Elco progress.</p>
          <a href={elcoConnectUrl()} className={btnPrimary} data-testid="elco-connect">Connect Elco account</a>
        </div>
      )}
      {state.s === "ready" && state.link && (
        <div className="space-y-4" data-testid="elco-linked">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 size={18} className="text-[#2D7A58]" aria-hidden="true" />
            <span className="font-semibold" data-testid="elco-linked-as">Connected to Elco{state.link.elco_display_name ? `: ${state.link.elco_display_name}` : ""}</span>
            <span className={tag}>since {dateWib(state.link.created_at)}</span>
            {state.link.scopes.map((s) => <span key={s} className={tag}>{SCOPE[s] ?? s}</span>)}
          </div>
          {elco && (elco.active || elco.exams.length > 0) && (
            <div className="rounded-xl border border-[#E3E7ED] bg-white p-4 text-base" data-testid="elco-access">
              <p className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-[#577E90]">From your Elco plan</p>
              {elco.active && <p>Elco {elco.tier === "pro" ? "Pro" : "Starter"} until {dateWib(elco.ends_at!)}: {elco.speaking_club_per_month == null ? "Daily Speaking Club" : `${Math.max(0, elco.speaking_club_per_month - (elco.speaking_club_used ?? 0))} of ${elco.speaking_club_per_month} Speaking Club sessions left this month`}{elco.mentoring_per_month ? `, ${Math.max(0, elco.mentoring_per_month - (elco.mentoring_used ?? 0))} of ${elco.mentoring_per_month} mentoring sessions left` : ""}. <a href="/dashboard/membership" className="font-semibold text-[#577E90] underline-offset-4 hover:underline">Book sessions</a></p>}
              {elco.exams.map((e) => <p key={e.ends_at + e.modes.join()}>Exam preparation in Elco: {e.modes.map((m) => EXAM_NAMES[m] || m).join(", ")} until {dateWib(e.ends_at)}.</p>)}
            </div>
          )}
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
          <div className="flex flex-wrap gap-2">
            {next && <a href={next.href} className={btnPrimary} data-testid={`elco-next-${next.id}`}>{next.label} <ArrowUpRight size={16} aria-hidden="true" /></a>}
            <button type="button" data-testid="elco-unlink" disabled={busy} onClick={unlink} className={btnSecondary}>{busy ? "Disconnecting…" : "Disconnect Elco"}</button>
          </div>
        </div>
      )}
      {notice && <p role="status" className="mt-4 text-base text-[#577E90]" data-testid="elco-notice">{notice}</p>}
    </section>
  );
}
