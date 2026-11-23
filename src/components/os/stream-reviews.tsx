"use client";

// Stream review: records the move to business streams could not settle from the data alone (an Elco partnership on a
// GIF project, an IELSco project called "GIF …", Master Timeline workstreams that name no stream). Nothing here was
// guessed: each record keeps its old unit's stream until a founder or manager applies the suggestion, keeps it, or
// picks other streams. Settling is done by os_stream_review_resolve(), which checks who is asking and audits it.
import Link from "next/link";
import { useMemo, useState } from "react";
import { friendlyError, useQuery } from "./data";
import { useOsMe } from "./OsProvider";
import { StreamBadges, StreamPicker } from "./streams";
import { Empty, ErrorLine, Loading, Section, Select, btn, btnPrimary, linkCls, muted, panel } from "./ui";
import { REVIEW_REASON_LABEL, type StreamCode } from "@/lib/os/streams";
import { cn } from "@/lib/utils";

type Review = { id: number; entity_type: string; entity_id: string; title: string | null; reason: string; detail: string; current_streams: string[]; suggested_streams: string[]; status: string };

const HREF: Record<string, (id: string) => string> = {
  project: (id) => `/os/projects/${id}`, task: (id) => `/os/tasks/${id}`, document: (id) => `/os/documents/${id}`, kpi: (id) => `/os/kpis/${id}`,
  timeline: (id) => `/os/timeline/${id}`, partnership: () => "/os/partnerships", campaign_plan: (id) => `/os/campaigns/${id}`, campaign: () => "/os/campaigns",
  transaction: (id) => `/os/finance/${id}`, event: (id) => `/os/calendar?event=${id}`, request: (id) => `/os/requests/${id}`, objective: () => "/os/okrs",
};
const TYPE_LABEL: Record<string, string> = { project: "Project", task: "Task", document: "Document", kpi: "KPI", timeline: "Milestone", partnership: "Partnership",
  campaign_plan: "Campaign", campaign: "Content", transaction: "Transaction", budget: "Budget", event: "Event", request: "Request", objective: "Objective",
  decision: "Decision", meeting: "Meeting", announcement: "Announcement", product: "Product item", letter: "Letter", agreement: "Agreement" };

export function StreamReviews({ canResolve }: { canResolve: boolean }) {
  const { supabase } = useOsMe();
  const rows = useQuery<Review[]>((s) => s.from("os_stream_reviews").select("id, entity_type, entity_id, title, reason, detail, current_streams, suggested_streams, status")
    .eq("status", "open").order("reason").order("entity_type").order("entity_id").limit(500), []);
  const [reason, setReason] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [other, setOther] = useState<StreamCode[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = useMemo(() => (rows.data ?? []).filter((r) => !reason || r.reason === reason), [rows.data, reason]);
  const reasons = [...new Set((rows.data ?? []).map((r) => r.reason))];
  const toggle = (id: number) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function act(action: "apply" | "keep" | "change") {
    if (!picked.size) return;
    if (action === "change" && !other.length) return setErr("Pick at least one stream, or keep the current ones.");
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("os_stream_review_resolve", { p_ids: [...picked], p_action: action, p_streams: action === "change" ? other : null });
    setBusy(false);
    if (error) return setErr(friendlyError(error.message));
    setPicked(new Set()); rows.reload();
  }

  if (rows.loading && !rows.data) return <Loading />;
  return (
    <Section title="Stream review" action={<span className={cn("text-xs", muted)}>{rows.data?.length ?? 0} open</span>}>
      <p className={cn("mb-3 text-sm", muted)}>
        When the Company OS moved to business streams, every record got the stream its data supports. These are the ones the data
        couldn&apos;t settle. Each keeps its old unit&apos;s stream until someone decides.{!canResolve && " Founders and managers settle them."}
      </p>
      <ErrorLine message={rows.error ?? err} />
      {!rows.data?.length ? <Empty compact title="Nothing to review" body="Every record has a settled stream." /> : <>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select ariaLabel="Reason" value={reason} onChange={(v) => { setReason(v); setPicked(new Set()); }} placeholder="All reasons" className="sm:w-80"
            options={reasons.map((r) => ({ value: r, label: REVIEW_REASON_LABEL[r] ?? r }))} />
          {canResolve && <button type="button" className={btn} onClick={() => setPicked(picked.size === list.length ? new Set() : new Set(list.map((r) => r.id)))}>
            {picked.size === list.length ? "Clear selection" : `Select all ${list.length}`}</button>}
        </div>
        {canResolve && picked.size > 0 && (
          <div className={cn(panel, "mb-3 space-y-2 p-3")} data-testid="os-stream-review-actions">
            <p className="text-sm font-medium">{picked.size} selected</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={busy} onClick={() => act("apply")}>Apply suggestion</button>
              <button type="button" className={btn} disabled={busy} onClick={() => act("keep")}>Keep current streams</button>
            </div>
            <div className="flex flex-wrap items-center gap-2"><StreamPicker value={other} onChange={setOther} label="Set these streams instead" />
              <button type="button" className={btn} disabled={busy || !other.length} onClick={() => act("change")}>Set these streams</button></div>
          </div>
        )}
        <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
          {list.map((r) => (
            <li key={r.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              {canResolve && <input type="checkbox" className="mt-1 h-4 w-4" checked={picked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.entity_id}`} />}
              <div className="min-w-0 flex-1">
                <p className="truncate"><span className={cn("text-xs", muted)}>{TYPE_LABEL[r.entity_type] ?? r.entity_type} {r.entity_id} · </span>
                  {HREF[r.entity_type] ? <Link href={HREF[r.entity_type](r.entity_id)} className={linkCls}>{r.title ?? r.entity_id}</Link> : (r.title ?? r.entity_id)}</p>
                <p className={cn("text-xs", muted)}>{r.detail}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                <span className="flex items-center gap-1"><span className={muted}>Now</span> <StreamBadges streams={r.current_streams} /></span>
                <span className="flex items-center gap-1"><span className={muted}>Suggested</span> <StreamBadges streams={r.suggested_streams} /></span>
              </div>
            </li>
          ))}
        </ul>
      </>}
    </Section>
  );
}
