"use client";

// Division meetings: schedule one, write the agenda and minutes, send the minutes for review, and turn action items into
// tasks. Status moves only through os_meeting_act, and an action item becomes a task once (os_meeting_action_to_task).
import Link from "next/link";
import { useState } from "react";
import { useOsMe } from "./OsProvider";
import { friendlyError, useDirectory, useQuery } from "./data";
import { EntityFeed } from "./feed";
import { LinkedDocuments } from "./linked-docs";
import { CompanySelect, PersonSelect, useDefaultCompany } from "./pickers";
import { Badge, Empty, ErrorLine, Field, KeyValue, Loading, RowList, Section, Select, Sheet, btn, btnGhost, btnPrimary, input, linkCls, muted, panel } from "./ui";
import { fmtDate, personLabel, todayJakarta } from "@/lib/os/meta";
import { MEETING_COLUMNS, MEETING_TONE, MEETING_TYPES, STEP_LABEL, meetingSteps, type ActionRow, type MeetingRow, type MeetingStep } from "@/lib/os/meetings";
import type { MyWorkspace } from "@/lib/os/workspaces";
import { cn } from "@/lib/utils";

const OWN = /^(Meeting not found|That step isn't available for this meeting|Write the minutes before sending them for review|Approved minutes can't be changed\. Reopen them first\.|Action item not found)$/;
const meetingError = (m: string | null | undefined) => (!m ? null : OWN.test(m) ? m : friendlyError(m));

export function WorkspaceMeetings({ ws }: { ws: MyWorkspace }) {
  const dir = useDirectory();
  const rows = useQuery<MeetingRow[]>((s) => s.from("os_meetings").select(MEETING_COLUMNS).eq("division_id", ws.division_id).order("held_on", { ascending: false }).limit(200), [ws.division_id]);
  const [open, setOpen] = useState(false);
  return (
    <Section title="Meetings and minutes" action={ws.access === "edit" ? <button type="button" className={btnPrimary} onClick={() => setOpen(true)} data-testid="os-meeting-new">New meeting</button> : undefined}>
      <ErrorLine message={rows.error} />
      {rows.loading && !rows.data ? <Loading /> : (
        <RowList rows={rows.data ?? []} rowKey={(m) => m.id} rowHref={(m) => `/os/meetings/${m.id}`} testId="os-meetings"
          empty={<Empty compact title="No meetings yet" body="Schedule a meeting with its agenda. After it's held, write the minutes here and turn action items into tasks." />}
          columns={[
            { key: "t", label: "Meeting", primary: true, className: "w-[40%]", render: (m) => <span className="truncate">{m.title}</span> },
            { key: "d", label: "Date", className: "w-28", render: (m) => fmtDate(m.held_on) },
            { key: "k", label: "Type", className: "w-36", hideOnMobile: true, render: (m) => m.meeting_type },
            { key: "s", label: "Minutes", className: "w-32", render: (m) => <Badge tone={MEETING_TONE[m.status]}>{m.status}</Badge> },
            { key: "f", label: "Facilitator", className: "w-32", hideOnMobile: true, render: (m) => personLabel(dir?.peopleById ?? new Map(), m.facilitator_person_id, "Not set") },
          ]} />
      )}
      <MeetingSheet open={open} onClose={() => setOpen(false)} divisionId={ws.division_id} onSaved={rows.reload} />
    </Section>
  );
}

export function MeetingSheet({ open, onClose, divisionId, meeting, onSaved }: { open: boolean; onClose: () => void; divisionId: string | null; meeting?: MeetingRow; onSaved: (id?: string) => void }) {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const company = useDefaultCompany();
  const [f, setF] = useState(() => ({
    company_code: meeting?.company_code ?? company, title: meeting?.title ?? "", meeting_type: meeting?.meeting_type ?? "Division Stand-up", held_on: meeting?.held_on ?? todayJakarta(),
    facilitator_person_id: meeting?.facilitator_person_id ?? me.person.id, reviewer_person_id: meeting?.reviewer_person_id ?? "", agenda: meeting?.agenda ?? "", objectives: meeting?.objectives ?? "",
    attendees: meeting?.attendees ?? [me.person.id], sensitivity: meeting?.sensitivity ?? "Internal",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const staff = (dir?.people ?? []).filter((p) => p.org_role !== "guest" && ["active", "onboarding"].includes(p.status));
  const save = async () => {
    setBusy(true); setErr(null);
    const body = { title: f.title.trim(), meeting_type: f.meeting_type, held_on: f.held_on, facilitator_person_id: f.facilitator_person_id || null,
      reviewer_person_id: f.reviewer_person_id || null, agenda: f.agenda.trim() || null, objectives: f.objectives.trim() || null, attendees: f.attendees, sensitivity: f.sensitivity };
    const q = meeting ? supabase.from("os_meetings").update(body).eq("id", meeting.id).select("id").maybeSingle()
      : supabase.from("os_meetings").insert({ ...body, company_code: f.company_code, division_id: divisionId }).select("id").maybeSingle();
    const { data, error } = await q;
    setBusy(false);
    if (error || !data) return setErr(meetingError(error?.message) ?? "You can't save this meeting.");
    onSaved((data as { id: string }).id); onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={meeting ? "Edit meeting" : "New meeting"} footer={
      <>
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} disabled={busy || f.title.trim().length < 3 || !f.held_on} onClick={save} data-testid="os-meeting-save">{busy ? "Saving…" : "Save meeting"}</button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save(); }} data-testid="os-meeting-form">
        {!meeting && <Field label="Company">{(id) => <CompanySelect id={id} value={f.company_code} onChange={(v) => set("company_code", v)} />}</Field>}
        <Field label="Title">{(id) => <input id={id} className={input} value={f.title} maxLength={200} onChange={(e) => set("title", e.target.value)} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">{(id) => <Select id={id} value={f.meeting_type} onChange={(v) => set("meeting_type", v)} options={MEETING_TYPES} />}</Field>
          <Field label="Date">{(id) => <input id={id} type="date" className={input} value={f.held_on} onChange={(e) => set("held_on", e.target.value)} />}</Field>
          <Field label="Facilitator">{(id) => <PersonSelect id={id} value={f.facilitator_person_id ?? ""} onChange={(v) => set("facilitator_person_id", v)} placeholder="Not set" />}</Field>
          <Field label="Minutes reviewer" hint="Leave empty for the division's lead.">{(id) => <PersonSelect id={id} value={f.reviewer_person_id} onChange={(v) => set("reviewer_person_id", v)} placeholder="Division lead" />}</Field>
        </div>
        <Field label="Objectives">{(id) => <textarea id={id} className={cn(input, "min-h-16")} value={f.objectives} maxLength={2000} onChange={(e) => set("objectives", e.target.value)} />}</Field>
        <Field label="Agenda">{(id) => <textarea id={id} className={cn(input, "min-h-24")} value={f.agenda} maxLength={5000} onChange={(e) => set("agenda", e.target.value)} />}</Field>
        <fieldset>
          <legend className="mb-1 block text-xs font-medium text-[#3A4B60]">Attendees</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {staff.map((p) => (
              <label key={p.id} className="flex min-h-8 items-center gap-1.5 text-sm">
                <input type="checkbox" checked={f.attendees.includes(p.id)} onChange={(e) => set("attendees", e.target.checked ? [...f.attendees, p.id] : f.attendees.filter((x) => x !== p.id))} />
                {p.short_name ?? p.full_name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Who can see it" hint="Internal: everyone in the company. Confidential: this division and people given access.">{(id) => <Select id={id} value={f.sensitivity} onChange={(v) => set("sensitivity", v)} options={["Internal", "Confidential"]} />}</Field>
        <ErrorLine message={err} />
      </form>
    </Sheet>
  );
}

export function MeetingDetail({ id }: { id: string }) {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const meeting = useQuery<MeetingRow | null>((s) => s.from("os_meetings").select(MEETING_COLUMNS).eq("id", id).maybeSingle(), [id]);
  const actions = useQuery<ActionRow[]>((s) => s.from("os_meeting_actions").select("id, meeting_id, body, owner_person_id, due_date, task_id").eq("meeting_id", id).order("id"), [id]);
  const canEdit = useQuery<boolean>((s) => s.rpc("os_meeting_can_edit", { p_id: id }), [id]);
  const lead = useQuery<boolean>((s) => meeting.data?.division_id ? s.rpc("os_workspace_lead", { p_division: meeting.data.division_id }) : Promise.resolve({ data: me.isAdmin, error: null }), [meeting.data?.division_id]);
  const [edit, setEdit] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [a, setA] = useState({ body: "", owner: "", due: "" });
  const m = meeting.data;
  if (meeting.loading && !m) return <Loading />;
  if (!m) return <Empty title="Meeting not found" body="It doesn't exist, or you don't have access to it." />;
  const editor = Boolean(canEdit.data);
  const locked = m.status === "Approved" || m.status === "In review";
  const steps = meetingSteps(m, { personId: me.person.id, editor, lead: Boolean(lead.data), founder: me.isAdmin });
  const division = m.division_id ? dir?.divisionById.get(m.division_id) : null;
  const run = async (key: string, fn: () => PromiseLike<{ error: { message: string } | null }>, after?: () => void) => {
    setBusy(key); setErr(null);
    const { error } = await fn();
    setBusy(null);
    if (error) return setErr(meetingError(error.message));
    after?.(); meeting.reload(); actions.reload();
  };
  const saveMinutes = () => run("minutes", () => supabase.from("os_meetings").update({ notes: (notes ?? m.notes ?? "").trim() || null, decisions: (decisions ?? m.decisions ?? "").trim() || null }).eq("id", id), () => { setNotes(null); setDecisions(null); });
  const step = (s: MeetingStep) => run(s, () => supabase.rpc("os_meeting_act", { p_id: id, p_action: s }));
  const dirty = (notes !== null && notes !== (m.notes ?? "")) || (decisions !== null && decisions !== (m.decisions ?? ""));
  return (
    <div className="space-y-6" data-testid="os-meeting">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("text-xs", muted)}>{division ? <Link className={linkCls} href={`/os/d/${division.code.toLowerCase()}?tab=meetings`}>{division.name} meetings</Link> : "Company meeting"} · {m.id}</p>
          <h1 className="mt-1 break-words text-xl font-bold">{m.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm"><Badge tone={MEETING_TONE[m.status]}>{m.status}</Badge>{fmtDate(m.held_on)} · {m.meeting_type}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editor && !locked && <button type="button" className={btn} onClick={() => setEdit(true)}>Edit details</button>}
          {steps.map((s) => <button key={s} type="button" className={s === "return" || s === "reopen" ? btn : btnPrimary} disabled={busy !== null || (s === "submit" && dirty)} onClick={() => step(s)} data-testid={`os-meeting-${s}`}>{STEP_LABEL[s]}</button>)}
        </div>
      </div>
      <ErrorLine message={err ?? meeting.error} />
      <KeyValue items={[
        { label: "Facilitator", value: personLabel(people, m.facilitator_person_id, "Not set") },
        { label: "Attendees", value: m.attendees.length ? m.attendees.map((p) => personLabel(people, p)).join(", ") : "None listed" },
        { label: "Minutes reviewer", value: personLabel(people, m.reviewer_person_id, "Division lead") },
        ...(m.minutes_approved_by ? [{ label: "Approved by", value: `${personLabel(people, m.minutes_approved_by)}, ${fmtDate(m.minutes_approved_at?.slice(0, 10) ?? null)}` }] : []),
      ]} />
      {(m.objectives || m.agenda) && (
        <Section title="Agenda">
          <div className={cn(panel, "space-y-3 p-4 text-sm")}>
            {m.objectives && <div><p className={cn("text-xs font-medium", muted)}>Objectives</p><p className="whitespace-pre-wrap break-words">{m.objectives}</p></div>}
            {m.agenda && <div><p className={cn("text-xs font-medium", muted)}>Agenda</p><p className="whitespace-pre-wrap break-words">{m.agenda}</p></div>}
          </div>
        </Section>
      )}
      <Section title="Minutes">
        {editor && !locked ? (
          <div className="space-y-3">
            <Field label="Discussion notes">{(fid) => <textarea id={fid} className={cn(input, "min-h-40")} maxLength={20000} value={notes ?? m.notes ?? ""} onChange={(e) => setNotes(e.target.value)} />}</Field>
            <Field label="Decisions">{(fid) => <textarea id={fid} className={cn(input, "min-h-20")} maxLength={5000} value={decisions ?? m.decisions ?? ""} onChange={(e) => setDecisions(e.target.value)} />}</Field>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={btnPrimary} disabled={!dirty || busy !== null} onClick={saveMinutes} data-testid="os-meeting-save-minutes">{busy === "minutes" ? "Saving…" : "Save minutes"}</button>
              {dirty && <span className={cn("text-xs", muted)}>Save before sending for review.</span>}
            </div>
          </div>
        ) : (
          <div className={cn(panel, "space-y-3 p-4 text-sm")}>
            <div><p className={cn("text-xs font-medium", muted)}>Discussion notes</p><p className="whitespace-pre-wrap break-words">{m.notes || "No minutes written yet."}</p></div>
            {m.decisions && <div><p className={cn("text-xs font-medium", muted)}>Decisions</p><p className="whitespace-pre-wrap break-words">{m.decisions}</p></div>}
          </div>
        )}
      </Section>
      <Section title="Action items">
        <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-meeting-actions">
          {(actions.data ?? []).map((x) => (
            <li key={x.id} className="flex flex-col gap-2 px-3 py-2.5 text-sm sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="break-words">{x.body}</p>
                <p className={cn("text-xs", muted)}>{personLabel(people, x.owner_person_id, "No owner")}{x.due_date ? ` · due ${fmtDate(x.due_date)}` : ""}</p>
              </div>
              {x.task_id ? <Link className={linkCls} href={`/os/tasks/${x.task_id}`}>{x.task_id}</Link>
                : editor ? (
                  <div className="flex gap-1">
                    <button type="button" className={btn} disabled={busy !== null} onClick={() => run(`t${x.id}`, () => supabase.rpc("os_meeting_action_to_task", { p_action: x.id }))} data-testid="os-action-to-task">Make task</button>
                    <button type="button" className={btnGhost} disabled={busy !== null} onClick={() => run(`d${x.id}`, () => supabase.from("os_meeting_actions").delete().eq("id", x.id))}>Remove</button>
                  </div>
                ) : null}
            </li>
          ))}
          {actions.data && !actions.data.length && <li className={cn("px-3 py-3 text-sm", muted)}>No action items yet.</li>}
        </ul>
        {editor && (
          <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_11rem_10rem_auto]" onSubmit={(e) => { e.preventDefault(); run("add", () => supabase.from("os_meeting_actions").insert({ meeting_id: id, body: a.body.trim(), owner_person_id: a.owner || null, due_date: a.due || null }), () => setA({ body: "", owner: "", due: "" })); }}>
            <input aria-label="Action item" className={input} placeholder="What was agreed" value={a.body} maxLength={500} onChange={(e) => setA({ ...a, body: e.target.value })} />
            <PersonSelect ariaLabel="Action owner" value={a.owner} onChange={(v) => setA({ ...a, owner: v })} placeholder="Owner" />
            <input aria-label="Action due date" type="date" className={input} value={a.due} onChange={(e) => setA({ ...a, due: e.target.value })} />
            <button type="submit" className={btn} disabled={busy !== null || a.body.trim().length < 3} data-testid="os-action-add">Add</button>
          </form>
        )}
      </Section>
      <LinkedDocuments type="meeting" id={id} />
      <EntityFeed type="meeting" id={id} />
      {edit && <MeetingSheet open onClose={() => setEdit(false)} divisionId={m.division_id} meeting={m} onSaved={() => meeting.reload()} />}
    </div>
  );
}
