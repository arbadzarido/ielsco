"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Trash2 } from "lucide-react";
import { DashboardPage, type DashboardCtx } from "@/components/dashboard/DashboardPage";
import { EmptyState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, cardGloss, focusRing, inputClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { dateWib } from "@/lib/format";
import { track } from "@/lib/analytics";
import { CATEGORY_LABEL, deadlineState, type Category } from "@/lib/opportunities";
import { FREE_TRACKER_LIMIT } from "@/data/membership";

// Application tracker: the member's saved opportunities (public.opportunity_tracker, owner-only RLS) with a status,
// their own deadline and notes. The free limit is enforced by a database trigger; this page only shows the count.
type Row = { opportunity_id: string; status: string; personal_deadline: string | null; notes: string | null; updated_at: string };
type Opp = { id: string; slug: string; title: string; organizer: string; category: Category; deadline: string | null; official_url: string };

const STATUSES: [string, string][] = [
  ["saved", "Saved"], ["preparing", "Preparing"], ["applied", "Applied"], ["accepted", "Accepted"], ["not_selected", "Not selected"], ["withdrawn", "Withdrawn"],
];

function Tracker({ supabase, user }: DashboardCtx) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [opps, setOpps] = useState<Record<string, Opp>>({});
  const [isMember, setIsMember] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data, error: e }, m] = await Promise.all([
      supabase.from("opportunity_tracker").select("opportunity_id, status, personal_deadline, notes, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
      supabase.rpc("is_active_member"),
    ]);
    if (e) { setError("Couldn't load your tracker. Please try again."); setRows([]); return; }
    setIsMember(m.data === true);
    const list = (data as Row[]) ?? [];
    setRows(list);
    if (list.length) {
      const { data: o } = await supabase.from("opportunities").select("id, slug, title, organizer, category, deadline, official_url").in("id", list.map((r) => r.opportunity_id));
      setOpps(Object.fromEntries(((o as Opp[]) ?? []).map((x) => [x.id, x])));
    }
  }, [supabase, user.id]);
  useEffect(() => { load(); }, [load]);

  const update = async (id: string, patch: Partial<Row>) => {
    setRows((rs) => rs?.map((r) => (r.opportunity_id === id ? { ...r, ...patch } : r)) ?? null);
    const { error: e } = await supabase.from("opportunity_tracker").update({ ...patch, updated_at: new Date().toISOString() }).eq("user_id", user.id).eq("opportunity_id", id);
    if (e) setError("Couldn't save that change. Please try again.");
    else if (patch.status) track("opportunity_status_changed", { status: patch.status });
  };
  const remove = async (id: string) => {
    setRows((rs) => rs?.filter((r) => r.opportunity_id !== id) ?? null);
    await supabase.from("opportunity_tracker").delete().eq("user_id", user.id).eq("opportunity_id", id);
  };

  const dueSoon = useMemo(() => (rows ?? []).filter((r) => {
    const d = r.personal_deadline ?? opps[r.opportunity_id]?.deadline ?? null;
    return ["saved", "preparing"].includes(r.status) && deadlineState(d) === "soon";
  }), [rows, opps]);

  if (rows === null) return <LoadingState />;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14" data-testid="opportunity-tracker">
      <PageHeader title="My opportunities" description="Everything you've saved, where each application stands, and your own deadlines.">
        <Link href="/opportunities" className={btnSecondary}>Browse the board <ArrowRight size={16} aria-hidden="true" /></Link>
      </PageHeader>
      <p className="mb-6 text-base text-[#2F4157]/70" data-testid="tracker-count">
        {isMember ? `${rows.length} tracked (members: no limit).` : `${rows.length} of ${FREE_TRACKER_LIMIT} on a free account.`}
        {!isMember && rows.length >= FREE_TRACKER_LIMIT - 2 && <> <Link href="/dashboard/membership" className="font-semibold text-[#577E90] underline">Members track without a limit.</Link></>}
      </p>
      {error && <p className="mb-6 rounded-xl bg-[#FDF1F1] px-4 py-3 text-base text-[#A23B3D]" role="alert">{error}</p>}
      {dueSoon.length > 0 && (
        <div className="mb-6 rounded-2xl border border-[#F2D7A6] bg-[#FFF8EB] p-4 text-base text-[#7A5310]" data-testid="tracker-due-soon">
          <strong>Due within 3 weeks:</strong> {dueSoon.map((r) => opps[r.opportunity_id]?.title).filter(Boolean).join(", ")}
        </div>
      )}
      {rows.length === 0 ? (
        <EmptyState title="Nothing saved yet" body="Save opportunities from the board to track your applications and deadlines here."
          action={<Link href="/opportunities" className={btnPrimary}>Browse opportunities</Link>} />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => {
            const o = opps[r.opportunity_id];
            const d = r.personal_deadline ?? o?.deadline ?? null;
            return (
              <li key={r.opportunity_id} className={cn(cardGloss, "p-5")} data-testid={`tracked-${o?.slug ?? r.opportunity_id}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    {o && <span className="text-sm font-semibold text-[#577E90]">{CATEGORY_LABEL[o.category]}</span>}
                    <p className="text-lg font-bold text-[#1A2534]">{o ? <Link href={`/opportunities/${o.slug}`} className={cn("rounded hover:underline", focusRing)}>{o.title}</Link> : "Opportunity no longer listed"}</p>
                    {o && <p className="text-sm text-[#2F4157]/65">{o.organizer}</p>}
                    {d && <span className={cn(tag, "mt-2", deadlineState(d) === "soon" && "bg-[#FFF3E0] text-[#8A5A00]")}>{r.personal_deadline ? "My deadline" : "Deadline"}: {dateWib(d)}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {o && <a href={o.official_url} target="_blank" rel="noopener noreferrer" className={cn(btnSecondary, "px-3 py-2 text-sm")} aria-label={`Official page for ${o.title}`}><ExternalLink size={16} aria-hidden="true" /></a>}
                    <button type="button" onClick={() => remove(r.opportunity_id)} className={cn(btnSecondary, "px-3 py-2 text-sm")} aria-label="Remove from tracker"><Trash2 size={16} aria-hidden="true" /></button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[180px_180px_1fr]">
                  <label className="block text-sm font-semibold text-[#2F4157]">Status
                    <select value={r.status} onChange={(e) => update(r.opportunity_id, { status: e.target.value })} className={cn(inputClass, "mt-1 py-2 text-base")}>
                      {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-[#2F4157]">My deadline
                    <input type="date" value={r.personal_deadline ?? ""} onChange={(e) => update(r.opportunity_id, { personal_deadline: e.target.value || null })} className={cn(inputClass, "mt-1 py-2 text-base")} />
                  </label>
                  <label className="block text-sm font-semibold text-[#2F4157]">Notes
                    <input defaultValue={r.notes ?? ""} maxLength={2000} placeholder="Documents to prepare, contacts…" onBlur={(e) => e.target.value !== (r.notes ?? "") && update(r.opportunity_id, { notes: e.target.value })} className={cn(inputClass, "mt-1 py-2 text-base")} />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function OpportunitiesTrackerPage() {
  return <DashboardPage>{(ctx) => <Tracker {...ctx} />}</DashboardPage>;
}
