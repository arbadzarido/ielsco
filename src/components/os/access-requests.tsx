"use client";

// Access requests: ask for a workspace, project or document; the person who runs it approves or declines. Every step is
// a database function (os_request_access, os_decide_access_request, os_withdraw_access_request) that checks who may
// do it, so these forms only collect input.
import { useState } from "react";
import { useOsMe } from "./OsProvider";
import { useDirectory, useQuery } from "./data";
import { Badge, Empty, ErrorLine, Field, Select, btn, btnDanger, btnPrimary, input, muted, panel } from "./ui";
import { addDays, fmtDate, fmtDateTime, personLabel, todayJakarta } from "@/lib/os/meta";
import { MAX_ACCESS_DAYS } from "@/lib/os/workspaces";
import { cn } from "@/lib/utils";

export interface AccessRequestRow {
  id: string; requester_person_id: string; resource_type: "division" | "project" | "document"; resource_id: string;
  level: "view" | "edit"; reason: string; until: string; status: "pending" | "approved" | "declined" | "withdrawn";
  decided_by: string | null; decided_at: string | null; decision_note: string | null; created_at: string;
}
export const ACCESS_REQUEST_COLUMNS = "id, requester_person_id, resource_type, resource_id, level, reason, until, status, decided_by, decided_at, decision_note, created_at";

const KNOWN = /^(Access ends within 90 days|You already have this access|Nothing to ask access for|This request is not open|This request has expired|You can't decide your own request|Only Company OS staff can ask for access)$/;
/** The database's own refusals are already written for people; anything else becomes one generic line. */
export function accessError(message: string | undefined | null): string | null {
  if (!message) return null;
  if (KNOWN.test(message)) return message;
  if (/duplicate key|unique/i.test(message)) return "You already have an open request for this.";
  if (/reason|check constraint/i.test(message)) return "Say in a few words why you need access.";
  return "That couldn't be done. Please try again.";
}

const TONE = { pending: "amber", approved: "green", declined: "red", withdrawn: "neutral" } as const;
const TYPE_LABEL = { division: "Workspace", project: "Project", document: "Document" } as const;

export function RequestAccessForm({ type, id, label, onDone }: { type: AccessRequestRow["resource_type"]; id: string; label: string; onDone?: () => void }) {
  const { supabase } = useOsMe();
  const today = todayJakarta();
  const [level, setLevel] = useState<"view" | "edit">("view");
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState(addDays(today, 30));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  if (sent) return <p className={cn(panel, "p-3 text-sm")} role="status" data-testid="os-access-sent">Request {sent} sent. You&apos;ll get a notification when it&apos;s decided.</p>;
  const submit = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("os_request_access", { p_type: type, p_id: id, p_level: level, p_reason: reason, p_until: until });
    setBusy(false);
    if (error) return setErr(accessError(error.message));
    setSent(String(data)); onDone?.();
  };
  return (
    <form className={cn(panel, "space-y-3 p-4 text-left")} onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="os-access-form">
      <p className="text-sm font-medium">Ask for access to {label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Access">{(fid) => <Select id={fid} value={level} onChange={(v) => setLevel(v as "view" | "edit")} options={[{ value: "view", label: "View" }, { value: "edit", label: "Edit" }]} />}</Field>
        <Field label="Until" hint={`Up to ${MAX_ACCESS_DAYS} days.`}>{(fid) => <input id={fid} type="date" className={input} value={until} min={today} max={addDays(today, MAX_ACCESS_DAYS)} onChange={(e) => setUntil(e.target.value)} required />}</Field>
      </div>
      <Field label="Why you need it">{(fid) => <textarea id={fid} className={cn(input, "min-h-20")} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} required minLength={3} />}</Field>
      <ErrorLine message={err} />
      <button type="submit" className={btnPrimary} disabled={busy || reason.trim().length < 3}>{busy ? "Sending…" : "Send request"}</button>
    </form>
  );
}

/** Requests in a list. Pending ones the viewer may decide get Approve and Decline; their own pending ones get Withdraw.
 * Whether a row appears at all is RLS: requesters see theirs, deciders see the ones they may decide. */
export function AccessRequestList({ rows, labels, onChange, focus, testId }: {
  rows: AccessRequestRow[]; labels?: Map<string, string>; onChange: () => void; focus?: string | null; testId?: string;
}) {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<{ id: string; msg: string } | null>(null);
  const act = async (id: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => {
    setBusy(id); setErr(null);
    const { error } = await fn();
    setBusy(null);
    if (error) return setErr({ id, msg: accessError(error.message) ?? "" });
    onChange();
  };
  if (!rows.length) return <Empty compact title="No requests" />;
  return (
    <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid={testId}>
      {rows.map((r) => {
        const mine = r.requester_person_id === me.person.id;
        const target = labels?.get(`${r.resource_type}:${r.resource_id}`) ?? r.resource_id;
        return (
          <li key={r.id} id={r.id} className={cn("space-y-2 px-3 py-3 text-sm", focus === r.id && "bg-[#F3F7FC]")} data-testid={`os-acr-${r.id}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONE[r.status]}>{r.status[0].toUpperCase() + r.status.slice(1)}</Badge>
              <span className="font-medium">{mine ? "You" : personLabel(people, r.requester_person_id, "Someone")}</span>
              <span>asked to {r.level} {TYPE_LABEL[r.resource_type].toLowerCase()} <span className="font-medium">{target}</span> until {fmtDate(r.until)}</span>
              <span className={cn("ml-auto text-xs", muted)}>{r.id} · {fmtDateTime(r.created_at)}</span>
            </div>
            <p className={cn("break-words", muted)}>&ldquo;{r.reason}&rdquo;</p>
            {r.status !== "pending" && r.decided_by && (
              <p className={cn("text-xs", muted)}>{r.status === "approved" ? "Approved" : "Declined"} by {personLabel(people, r.decided_by, "someone")} {fmtDateTime(r.decided_at)}{r.decision_note ? `: ${r.decision_note}` : ""}</p>
            )}
            {r.status === "pending" && !mine && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input aria-label={`Note for ${r.id}`} className={cn(input, "sm:flex-1")} placeholder="Note (optional)" maxLength={1000}
                  value={notes[r.id] ?? ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                <div className="flex gap-2">
                  <button type="button" className={btnPrimary} disabled={busy === r.id} data-testid={`os-acr-approve-${r.id}`}
                    onClick={() => act(r.id, () => supabase.rpc("os_decide_access_request", { p_id: r.id, p_approve: true, p_note: notes[r.id] || null }))}>Approve</button>
                  <button type="button" className={btnDanger} disabled={busy === r.id} data-testid={`os-acr-decline-${r.id}`}
                    onClick={() => act(r.id, () => supabase.rpc("os_decide_access_request", { p_id: r.id, p_approve: false, p_note: notes[r.id] || null }))}>Decline</button>
                </div>
              </div>
            )}
            {r.status === "pending" && mine && (
              <button type="button" className={btn} disabled={busy === r.id} onClick={() => act(r.id, () => supabase.rpc("os_withdraw_access_request", { p_id: r.id }))}>Withdraw</button>
            )}
            {err?.id === r.id && <ErrorLine message={err.msg} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Names for the resources in a set of requests, from what the viewer can read (a requester may see only the id). */
export function useRequestLabels(rows: AccessRequestRow[] | null): Map<string, string> {
  const dir = useDirectory();
  const ids = (t: string) => [...new Set((rows ?? []).filter((r) => r.resource_type === t).map((r) => r.resource_id))];
  const key = (rows ?? []).map((r) => r.id).join(",");
  const projects = useQuery<{ id: string; name: string }[]>((s) => s.from("os_projects").select("id, name").in("id", ids("project").length ? ids("project") : ["-"]), [key]);
  const docs = useQuery<{ id: string; title: string }[]>((s) => s.from("os_documents").select("id, title").in("id", ids("document").length ? ids("document") : ["-"]), [key]);
  const m = new Map<string, string>();
  (dir?.divisions ?? []).forEach((d) => m.set(`division:${d.id}`, d.name));
  (projects.data ?? []).forEach((p) => m.set(`project:${p.id}`, p.name));
  (docs.data ?? []).forEach((d) => m.set(`document:${d.id}`, d.title));
  return m;
}

/** Shown under a "not found" page: staff can ask for access without learning anything about the record. */
export function AskForAccess({ type, id }: { type: "project" | "document"; id: string }) {
  const { me } = useOsMe();
  const [open, setOpen] = useState(false);
  if (me.person.org_role === "guest" || !/^[A-Z]{2,4}-[0-9]{3,}$/.test(id)) return null;
  return (
    <div className="mx-auto mt-4 max-w-lg">
      {open ? <RequestAccessForm type={type} id={id} label={`${type} ${id}`} />
        : <div className="text-center"><button type="button" className={btn} onClick={() => setOpen(true)} data-testid="os-ask-access">Ask for access</button></div>}
    </div>
  );
}
