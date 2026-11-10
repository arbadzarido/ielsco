"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { PersonSelect } from "@/components/os/pickers";
import { requestError, useRequestScope, useRequestTypes } from "@/components/os/requests";
import { Badge, Empty, ErrorLine, Field, KeyValue, Loading, PageTitle, Section, Select, StatusBadge, btn, btnDanger, btnPrimary, input, muted, panel } from "@/components/os/ui";
import { PRIORITIES, companyName, fmtDate, fmtDateTime, personLabel, todayJakarta } from "@/lib/os/meta";
import { APPROVAL_LABEL, EVENT_LABEL, REQUEST_COLUMNS, requestActions, requestStage, type RequestAction, type RequestRow } from "@/lib/os/requests";
import { cn } from "@/lib/utils";

type Event = { id: number; at: string; actor_person_id: string | null; action: string; note: string | null };
type Approval = { id: string; approver_person_id: string; decision: string; note: string | null; decided_at: string };
type LinkedTask = { id: string; title: string; status: string; owner_person_id: string | null; due_date: string | null };

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const req = useQuery<RequestRow | null>((s) => s.from("os_requests").select(REQUEST_COLUMNS).eq("id", id).maybeSingle(), [id]);
  const events = useQuery<Event[]>((s) => s.from("os_request_events").select("id, at, actor_person_id, action, note").eq("request_id", id).order("id"), [id]);
  const approvals = useQuery<Approval[]>((s) => s.from("os_approvals").select("id, approver_person_id, decision, note, decided_at").eq("entity_type", "request").eq("entity_id", id).order("decided_at"), [id]);
  const tasks = useQuery<LinkedTask[]>((s) => s.from("os_tasks").select("id, title, status, owner_person_id, due_date").eq("request_id", id).order("created_at"), [id]);
  const types = useRequestTypes();
  const scope = useRequestScope();
  const reload = () => { req.reload(); events.reload(); approvals.reload(); tasks.reload(); };

  if (req.loading && !req.data) return <Loading />;
  const r = req.data;
  if (!r) return <Empty title="Request not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/requests" className={btn}>Back to requests</Link>} />;
  const div = (d: string) => dir?.divisionById.get(d)?.name ?? d;
  const stage = requestStage(r);
  const type = (types.data ?? []).find((t) => t.code === r.type_code);
  const actions = scope.ready ? requestActions(r, { personId: me.person.id, leadTo: scope.leads.has(r.to_division_id), leadFrom: scope.leads.has(r.from_division_id) }) : [];

  return (
    <div data-testid="os-request-page">
      <PageTitle crumbs={[{ href: "/os/requests", label: "Requests" }]} title={r.title}
        description={<span>{r.id} · {type?.name ?? r.type_code} · {div(r.from_division_id)} → {div(r.to_division_id)} · {companyName(r.company_code)}</span>}
        actions={<Badge tone={stage.tone}>{stage.label}</Badge>} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Section title="Brief">
            <p className={cn(panel, "whitespace-pre-wrap break-words p-4 text-sm")} data-testid="os-request-brief">{r.brief}</p>
          </Section>
          {actions.length > 0 && <Actions r={r} actions={actions} onDone={reload} />}
          <Section title="Tasks">
            {tasks.data?.length ? (
              <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-request-tasks">
                {tasks.data.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <Link href={`/os/tasks/${t.id}`} className="min-w-0 basis-full truncate font-medium hover:underline sm:flex-1 sm:basis-auto">{t.title}</Link>
                    <StatusBadge value={t.status} />
                    <span className={cn("text-xs", muted)}>{personLabel(people, t.owner_person_id, "Unassigned")} · {fmtDate(t.due_date)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className={cn("text-sm", muted)}>{["accepted", "in_progress"].includes(r.status) ? "No tasks yet. The owner adds them when the work needs tracking." : "No tasks."}</p>}
          </Section>
          <LinkedDocuments type="request" id={r.id} />
          <EntityFeed type="request" id={r.id} />
        </div>
        <aside className="space-y-6">
          <KeyValue items={[
            { label: "Requester", value: personLabel(people, r.requester_person_id) },
            { label: "Owner", value: personLabel(people, r.owner_person_id, "Not assigned") },
            { label: "Priority", value: r.priority },
            { label: "Deadline", value: fmtDate(r.due_date) },
            { label: "Approval", value: APPROVAL_LABEL[r.approval_status] },
            { label: "Revision rounds", value: r.revision_rounds },
            { label: "Sent", value: fmtDateTime(r.created_at) },
            ...(r.delivered_at ? [{ label: "Delivered", value: fmtDateTime(r.delivered_at) }] : []),
            ...(r.closed_at ? [{ label: "Closed", value: fmtDateTime(r.closed_at) }] : []),
          ]} />
          {!!approvals.data?.length && (
            <Section title="Approvals">
              <ul className="space-y-2 text-sm">
                {approvals.data.map((a) => <li key={a.id}><span className="font-medium">{personLabel(people, a.approver_person_id)}</span> {a.decision} · {fmtDateTime(a.decided_at)}{a.note ? <span className={cn("block text-xs", muted)}>{a.note}</span> : null}</li>)}
              </ul>
            </Section>
          )}
          <Section title="History">
            <ol className="space-y-2 text-sm" data-testid="os-request-history">
              {(events.data ?? []).map((e) => (
                <li key={e.id}>
                  <p><span className="font-medium">{personLabel(people, e.actor_person_id, "Someone")}</span> {EVENT_LABEL[e.action] ?? e.action}</p>
                  {e.note && <p className={cn("break-words text-xs", muted)}>{e.note}</p>}
                  <p className={cn("text-xs", muted)}>{fmtDateTime(e.at)}</p>
                </li>
              ))}
            </ol>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Actions({ r, actions, onDone }: { r: RequestRow; actions: RequestAction[]; onDone: () => void }) {
  const { supabase } = useOsMe();
  const has = (a: RequestAction) => actions.includes(a);
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState(r.owner_person_id ?? "");
  const [taskTitle, setTaskTitle] = useState("");
  const [editing, setEditing] = useState(r.status === "info_needed");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    if (error) return setErr(requestError(error.message));
    setNote(""); setTaskTitle(""); setEditing(false); onDone();
  };
  const noteBox = (label: string) => <Field label={label}>{(id) => <textarea id={id} className={cn(input, "min-h-16")} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} data-testid="os-request-note" />}</Field>;
  const act = (action: string) => run("os_request_act", { p_id: r.id, p_action: action, p_note: note || null, p_owner: action === "assign" ? owner : null });
  const needsNote = has("approve") || has("triage") || has("deliver") || has("accept") || has("cancel");

  return (
    <Section title="Next step">
      <div className={cn(panel, "space-y-3 p-4")} data-testid="os-request-actions">
        {has("approve") && <p className="text-sm">You lead the requesting division. Approve this before it goes to the receiving division, or decline it with a reason.</p>}
        {has("triage") && <p className="text-sm">Accept it and choose an owner, ask for more information, or decline it with a reason.</p>}
        {has("accept") && <p className="text-sm">The work is delivered. Accept it, or send it back and say what needs to change.</p>}
        {(has("triage") || has("assign")) && (
          <Field label="Owner" className="max-w-sm">{(id) => <PersonSelect id={id} value={owner} onChange={setOwner} placeholder="Choose the owner" />}</Field>
        )}
        {needsNote && !editing && noteBox("Note")}
        <div className="flex flex-wrap gap-2">
          {has("approve") && <>
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => run("os_request_approve", { p_id: r.id, p_approve: true, p_note: note || null })} data-testid="os-request-approve">Approve</button>
            <button type="button" className={btnDanger} disabled={busy || !note.trim()} onClick={() => run("os_request_approve", { p_id: r.id, p_approve: false, p_note: note })}>Decline</button>
          </>}
          {has("triage") && <>
            <button type="button" className={btnPrimary} disabled={busy || !owner} onClick={() => run("os_request_triage", { p_id: r.id, p_action: "accept", p_owner: owner, p_note: note || null })} data-testid="os-request-triage-accept">Accept</button>
            <button type="button" className={btn} disabled={busy || !note.trim()} onClick={() => run("os_request_triage", { p_id: r.id, p_action: "info", p_note: note })} data-testid="os-request-triage-info">Ask for information</button>
            <button type="button" className={btnDanger} disabled={busy || !note.trim()} onClick={() => run("os_request_triage", { p_id: r.id, p_action: "decline", p_note: note })}>Decline</button>
          </>}
          {has("assign") && owner && owner !== r.owner_person_id && <button type="button" className={btn} disabled={busy} onClick={() => act("assign")}>Change owner</button>}
          {has("start") && <button type="button" className={btn} disabled={busy} onClick={() => act("start")} data-testid="os-request-start">Start work</button>}
          {has("deliver") && <button type="button" className={btnPrimary} disabled={busy} onClick={() => act("deliver")} data-testid="os-request-deliver">Mark delivered</button>}
          {has("accept") && <>
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => act("accept")} data-testid="os-request-accept">Accept the work</button>
            <button type="button" className={btn} disabled={busy || !note.trim()} onClick={() => act("send_back")} data-testid="os-request-sendback">Send back</button>
          </>}
          {has("edit") && !editing && <button type="button" className={btn} onClick={() => setEditing(true)}>Edit request</button>}
          {has("cancel") && <button type="button" className={btnDanger} disabled={busy} onClick={() => act("cancel")}>Cancel request</button>}
        </div>
        {has("add_task") && (
          <form className="flex flex-col gap-2 border-t border-[#F0F2F5] pt-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); run("os_request_create_task", { p_id: r.id, p_title: taskTitle }); }}>
            <Field label="Add a task for this request" className="flex-1">{(id) => <input id={id} className={input} value={taskTitle} maxLength={300} onChange={(e) => setTaskTitle(e.target.value)} data-testid="os-request-task-title" />}</Field>
            <button type="submit" className={btn} disabled={busy || !taskTitle.trim()} data-testid="os-request-task-add">Add task</button>
          </form>
        )}
        {editing && <EditRequest r={r} onDone={() => { setEditing(false); onDone(); }} />}
        <ErrorLine message={err} />
      </div>
    </Section>
  );
}

function EditRequest({ r, onDone }: { r: RequestRow; onDone: () => void }) {
  const { supabase } = useOsMe();
  const [title, setTitle] = useState(r.title);
  const [brief, setBrief] = useState(r.brief);
  const [priority, setPriority] = useState(r.priority);
  const [due, setDue] = useState(r.due_date);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const today = useMemo(() => todayJakarta(), []);
  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("os_request_update", { p_id: r.id, p_title: title, p_brief: brief, p_priority: priority, p_due: due, p_note: note || null });
    setBusy(false);
    if (error) return setErr(requestError(error.message));
    onDone();
  };
  return (
    <form className="space-y-3 border-t border-[#F0F2F5] pt-3" onSubmit={(e) => { e.preventDefault(); save(); }} data-testid="os-request-edit">
      {r.status === "info_needed" && <p className="text-sm">The receiving division asked for more information. Update the brief and send it back to them.</p>}
      <Field label="Title">{(id) => <input id={id} className={input} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label="Brief">{(id) => <textarea id={id} className={cn(input, "min-h-28")} value={brief} maxLength={5000} onChange={(e) => setBrief(e.target.value)} />}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Priority">{(id) => <Select id={id} value={priority} onChange={setPriority} options={PRIORITIES} />}</Field>
        <Field label="Deadline">{(id) => <input id={id} type="date" className={input} value={due} min={today} onChange={(e) => setDue(e.target.value)} />}</Field>
      </div>
      <Field label="Note for the receiving division">{(id) => <input id={id} className={input} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />}</Field>
      <ErrorLine message={err} />
      <button type="submit" className={btnPrimary} disabled={busy || title.trim().length < 3 || brief.trim().length < 10} data-testid="os-request-edit-save">{r.status === "info_needed" ? "Send back to them" : "Save"}</button>
    </form>
  );
}
