"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil, X } from "lucide-react";
import { btn, btnGhost, btnPrimary, input, muted } from "@/components/os/ui";
import { syncEvent } from "./EventSheet";
import { cn } from "@/lib/utils";

// The confirmation card for an action the assistant proposed. Records described in words (tasks, events, milestones,
// assignments) show every resolved field; names that matched several records or none become a choice the person
// makes here. Nothing is created until they press Confirm & Create, and the server checks everything again then.

type Draft = Record<string, unknown>;
interface Issue { field: string; query?: string; kind: string; message: string; choices?: { value: string; label: string }[] }
interface Item { kind: string; draft: Draft; fields: { label: string; value: string }[]; issues: Issue[]; warnings: string[] }
export interface Created { id: string; kind: string; title: string; assignee: string | null; deadline: string | null; link: string; push?: string[] }
export interface AiAction { id: string; action_type: string; preview: string; status: string; details?: { items: Item[] } | null; result?: { ref?: string; error?: string; created?: Created[] } | null }

const EDITABLE: Record<string, { key: string; label: string; type: string }[]> = {
  task: [{ key: "title", label: "Title", type: "text" }, { key: "due_date", label: "Deadline", type: "date" }, { key: "priority", label: "Priority", type: "priority" }],
  event: [{ key: "title", label: "Title", type: "text" }, { key: "date", label: "Date", type: "date" }, { key: "start_time", label: "Starts", type: "time" }, { key: "end_time", label: "Ends", type: "time" }, { key: "location", label: "Location", type: "text" }],
  milestone: [{ key: "title", label: "Milestone", type: "text" }, { key: "due_date", label: "Date", type: "date" }],
  assignment: [],
  campaign: [{ key: "name", label: "Campaign", type: "text" }, { key: "start_date", label: "Starts", type: "date" }, { key: "end_date", label: "Ends", type: "date" }],
  content: [{ key: "title", label: "Content", type: "text" }, { key: "from", label: "From", type: "date" }, { key: "to", label: "To", type: "date" }, { key: "time", label: "Publish time", type: "time" }, { key: "channel", label: "Channel", type: "text" }],
  move: [{ key: "to_date", label: "New date", type: "date" }, { key: "start_time", label: "New start", type: "time" }],
  invitation: [],
};
const ARRAY_FIELDS = new Set(["assignees", "attendees", "people", "tasks", "invite_groups", "groups"]);
const fmtWhen = (c: Created) => (c.deadline ? (c.kind === "event" || c.kind === "move" ? new Date(c.deadline).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : c.deadline) : null);

/** Apply a choice to a draft: replace the ambiguous name in a list, or set the field. "" removes it. */
function choose(d: Draft, issue: Issue, value: string): Draft {
  if (ARRAY_FIELDS.has(issue.field)) {
    const list = (d[issue.field] as string[] | undefined) ?? [];
    const next = list.flatMap((x) => (x === issue.query ? (value ? [value] : []) : [x]));
    return { ...d, [issue.field]: next };
  }
  const out: Draft = { ...d, [issue.field]: value || undefined };
  if (Array.isArray(d.unclear)) out.unclear = (d.unclear as string[]).filter((f) => f !== issue.field);
  return out;
}

export function AiActionCard({ action, onChange }: { action: AiAction; onChange: (a: AiAction) => void }) {
  const items = action.details?.items ?? null;
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const current = drafts ?? items?.map((i) => i.draft) ?? [];
  const ready = items ? items.every((i) => i.issues.length === 0) : true;

  async function send(decision: "confirm" | "reject" | "revise", withDrafts?: Draft[]) {
    setBusy(true); setErr(null);
    // Fields the person cleared mean "none", not "keep the old value"; and a field they filled is no longer unclear.
    const clean = withDrafts?.map((d) => Object.fromEntries(Object.entries(d).filter(([, v]) => v !== "" && v !== undefined && v !== null)));
    const r = await fetch(`/os/api/ai/actions/${action.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision, ...(clean ? { drafts: clean } : {}) }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r) return setErr("Couldn't reach the server.");
    if (j.details) { setDrafts(null); onChange({ ...action, status: j.status ?? action.status, preview: j.preview ?? action.preview, details: j.details }); if (r.status === 422) setErr("Some details still need your choice."); else if (decision === "revise") setEditing(false); return; }
    if (!r.ok && !j.status) return setErr(j.error ?? "That didn't work.");
    // A moved event that is in the person's own Google Calendar is sent to Google now (never someone else's copy).
    for (const c of (j.created ?? []) as Created[]) for (const id of c.push ?? []) await syncEvent(id, "push").catch(() => null);
    onChange({ ...action, status: j.status, result: j.created ? { created: j.created, ref: j.ref } : j.ref ? { ref: j.ref } : j.error ? { error: j.error } : null });
  }

  const pick = (n: number, issue: Issue, value: string) => {
    const next = current.map((d, i) => (i === n ? choose(d, issue, value === "__remove" ? "" : value) : d));
    setDrafts(next);
    send("revise", next);
  };
  const setField = (n: number, key: string, value: string) => setDrafts(current.map((d, i) => {
    if (i !== n) return d;
    const out: Draft = { ...d, [key]: value };
    if (Array.isArray(d.unclear)) out.unclear = (d.unclear as string[]).filter((f) => f !== key);
    return out;
  }));

  const created = action.result?.created;
  return (
    <div className="rounded-xl border border-[#D9E2EA] bg-white p-3 text-sm" data-testid="os-ai-action">
      <p className="text-xs font-medium text-[#66768A]">{action.status === "proposed" ? "Suggested change · nothing is created until you confirm" : "Suggested change"}</p>
      <p className="mt-1 font-medium text-[#1F2D3D]" data-testid="os-ai-action-preview">{action.preview}</p>

      {items && action.status === "proposed" && items.map((it, n) => (
        <div key={n} className={cn("mt-2 rounded-lg border p-2", it.issues.length ? "border-[#F1D9A8] bg-[#FFFBF2]" : "border-[#E6E9EE] bg-[#FAFBFC]")} data-testid="os-ai-item">
          {items.length > 1 && <p className="mb-1 text-xs font-semibold text-[#3A4B60]">{n + 1} of {items.length}</p>}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
            {it.fields.map((f) => <div key={f.label} className="contents"><dt className={cn(muted, "text-xs")}>{f.label}</dt><dd className="break-words text-xs text-[#1F2D3D]">{f.value}</dd></div>)}
          </dl>
          {it.warnings.map((w) => <p key={w} className="mt-1 text-xs text-[#865400]">{w}</p>)}
          {it.issues.map((iss, k) => (
            <div key={k} className="mt-2" data-testid="os-ai-issue">
              <p className="text-xs font-medium text-[#865400]">{iss.message}</p>
              {iss.choices && iss.choices.length > 0 && (
                <select aria-label={`Choose ${iss.field}`} className={cn(input, "mt-1")} value="" disabled={busy} onChange={(e) => pick(n, iss, e.target.value)} data-testid="os-ai-choice">
                  <option value="" disabled>Choose…</option>
                  {iss.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  {(ARRAY_FIELDS.has(iss.field) || ["project", "milestone", "division", "owner", "campaign", "partnership", "creator", "reviewer"].includes(iss.field)) && <option value="__remove">Leave it out</option>}
                </select>
              )}
              {!iss.choices?.length && !editing && <button type="button" className={cn(btnGhost, "mt-1 text-xs")} onClick={() => setEditing(true)}>Fill it in</button>}
            </div>
          ))}
          {editing && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(EDITABLE[it.kind] ?? []).map((f) => (
                <label key={f.key} className="text-xs text-[#3A4B60]">{f.label}
                  {f.type === "priority"
                    ? <select className={cn(input, "mt-0.5")} value={String(current[n]?.[f.key] ?? "P3 Normal")} onChange={(e) => setField(n, f.key, e.target.value)}>{["P1 Critical", "P2 High", "P3 Normal", "P4 Low"].map((p) => <option key={p}>{p}</option>)}</select>
                    : <input type={f.type} className={cn(input, "mt-0.5")} value={String(current[n]?.[f.key] ?? "")} onChange={(e) => setField(n, f.key, e.target.value)} data-testid={`os-ai-edit-${f.key}`} />}
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {action.status === "proposed" ? (
        <>
          {err && <p role="alert" className="mt-2 text-xs text-[#A12D2F]">{err}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={busy || (items !== null && !ready && !editing)} onClick={() => send("confirm", drafts ?? undefined)}><Check size={14} aria-hidden="true" />{items ? "Confirm & Create" : "Confirm"}</button>
            <button type="button" className={btnGhost} disabled={busy} onClick={() => send("reject")}><X size={14} aria-hidden="true" />Cancel</button>
            {items && (editing
              ? <button type="button" className={btn} disabled={busy} onClick={() => send("revise", current)}>Check details</button>
              : <button type="button" className={btn} disabled={busy} onClick={() => setEditing(true)}><Pencil size={14} aria-hidden="true" />Edit Details</button>)}
          </div>
        </>
      ) : action.status === "executed" && created?.length ? (
        <ul className="mt-2 space-y-1" data-testid="os-ai-created">
          {created.map((c) => (
            <li key={`${c.kind}-${c.id}`} className="text-xs">
              <Link className="font-medium text-[#2F4157] underline" href={c.link}>{c.id}</Link> {c.title}
              {c.assignee && <span className={muted}> · {c.kind === "event" || c.kind === "invitation" ? "with" : c.kind === "content" ? "by" : "assigned to"} {c.assignee}</span>}
              {fmtWhen(c) && <span className={muted}> · {c.kind === "event" ? "" : c.kind === "move" ? "now " : c.kind === "content" ? "from " : "due "}{fmtWhen(c)}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className={cn("mt-1 text-xs", action.status === "failed" ? "text-[#A12D2F]" : muted)}>{action.status === "executed" ? `Done${action.result?.ref ? `: ${action.result.ref}` : ""}` : action.status === "failed" ? `Not done: ${action.result?.error ?? "not allowed"}` : action.status === "rejected" ? "Cancelled" : action.status}</p>
      )}
    </div>
  );
}
