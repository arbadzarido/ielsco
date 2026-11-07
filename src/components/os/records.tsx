"use client";

// Small create/edit sheets and lists for HQ records (announcements, decisions, meetings) and Elco product items.
// Everything is written with the signed-in person's session; the database decides who may write what.
import { useState, type ReactNode } from "react";
import { Pin } from "lucide-react";
import { friendlyError, useDirectory, useQuery } from "./data";
import { useOsMe } from "./OsProvider";
import { DivisionSelect, PersonSelect } from "./pickers";
import { Empty, ErrorLine, Field, RowList, Section, Select, Sheet, StatusBadge, btn, btnGhost, btnPrimary, input, muted, panel } from "./ui";
import { DECISION_STATUSES, PRODUCT_ITEM_TYPES, PRODUCT_STATUSES, SENSITIVITIES, fmtDate, fmtDateTime, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type FieldDef = { key: string; label: string; kind?: "text" | "textarea" | "date" | "person" | "division" | "select" | "checkbox"; options?: readonly (string | { value: string; label: string })[]; required?: boolean; hint?: string; full?: boolean };

/** A generic record form. Only the listed fields are sent, so it can never write a column the person can't. */
export function RecordSheet({ open, title, table, fields, record, defaults, onClose, onSaved, idColumn = "id", extra }: {
  open: boolean; title: string; table: string; fields: FieldDef[]; record?: Record<string, unknown> | null; defaults?: Record<string, unknown>; idColumn?: string; extra?: ReactNode;
  onClose: () => void; onSaved: (id: string) => void;
}) {
  const { supabase } = useOsMe();
  const init = () => Object.fromEntries(fields.map((f) => [f.key, (record?.[f.key] ?? defaults?.[f.key] ?? (f.kind === "checkbox" ? false : f.key === "sensitivity" ? "Internal" : "")) as unknown]));
  const [v, setV] = useState<Record<string, unknown>>(init);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) { setLastOpen(open); if (open) { setV(init()); setErr(null); } }
  const set = (k: string, x: unknown) => setV((o) => ({ ...o, [k]: x }));
  const missing = fields.some((f) => f.required && !String(v[f.key] ?? "").trim());

  async function save() {
    setBusy(true); setErr(null);
    const payload: Record<string, unknown> = {};
    for (const f of fields) { const x = v[f.key]; payload[f.key] = typeof x === "string" ? (x.trim() || null) : x; }
    const q = record ? supabase.from(table).update(payload).eq(idColumn, record[idColumn] as string) : supabase.from(table).insert({ ...defaults, ...payload });
    const { data, error } = await q.select(idColumn).maybeSingle();
    setBusy(false);
    if (error || !data) return setErr(error ? friendlyError(error.message) : "You can't change this record.");
    onSaved(String((data as unknown as Record<string, unknown>)[idColumn]));
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={save} disabled={missing || busy} data-testid="os-record-save">{busy ? "Saving…" : "Save"}</button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorLine message={err} /></div>
        {fields.map((f) => (
          <Field key={f.key} label={f.required ? f.label : `${f.label} (optional)`} hint={f.hint} className={cn((f.full || f.kind === "textarea" || !f.kind || f.kind === "text") && "sm:col-span-2")}>
            {(id) => {
              const val = String(v[f.key] ?? "");
              switch (f.kind) {
                case "textarea": return <textarea id={id} rows={4} className={input} value={val} onChange={(e) => set(f.key, e.target.value)} />;
                case "date": return <input id={id} type="date" className={input} value={val} onChange={(e) => set(f.key, e.target.value)} />;
                case "person": return <PersonSelect id={id} value={val} onChange={(x) => set(f.key, x)} />;
                case "division": return <DivisionSelect id={id} value={val} onChange={(x) => set(f.key, x)} />;
                case "select": return <Select id={id} value={val} onChange={(x) => set(f.key, x)} options={f.options ?? []} placeholder={f.required ? undefined : "—"} />;
                case "checkbox": return <input id={id} type="checkbox" className="h-4 w-4" checked={Boolean(v[f.key])} onChange={(e) => set(f.key, e.target.checked)} />;
                default: return <input id={id} className={input} value={val} onChange={(e) => set(f.key, e.target.value)} />;
              }
            }}
          </Field>
        ))}
        {extra && <div className="border-t border-[#E6E9EE] pt-4 sm:col-span-2">{extra}</div>}
      </div>
    </Sheet>
  );
}

const SENS = { key: "sensitivity", label: "Sensitivity", kind: "select" as const, options: SENSITIVITIES, required: true };

type Ann = { id: string; title: string; body: string; pinned: boolean; sensitivity: string; expires_at: string | null; created_by: string | null; created_at: string };
export function Announcements({ company, canPost }: { company: string; canPost: boolean }) {
  const dir = useDirectory();
  const { supabase } = useOsMe();
  const rows = useQuery<Ann[]>((s) => s.from("os_announcements").select("id, title, body, pinned, sensitivity, expires_at, created_by, created_at").eq("company_code", company).order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(50), [company]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Ann | null>(null);
  const now = new Date().toISOString();
  const live = (rows.data ?? []).filter((a) => !a.expires_at || a.expires_at > now);
  return (
    <Section title="Announcements" action={canPost ? <button type="button" className={btnGhost} onClick={() => setOpen(true)}>Post</button> : undefined}>
      <ErrorLine message={rows.error} />
      {live.length ? (
        <ul className="space-y-2">
          {live.map((a) => (
            <li key={a.id} className={cn(panel, "p-3")}>
              <div className="flex items-start gap-2">
                {a.pinned && <Pin size={14} className="mt-0.5 shrink-0 text-[#577E90]" aria-label="Pinned" />}
                <h3 className="flex-1 text-sm font-semibold">{a.title}</h3>
                {canPost && <button type="button" className={btnGhost} onClick={() => setEdit(a)}>Edit</button>}
                {canPost && <button type="button" className={btnGhost} onClick={async () => { if (confirm("Remove this announcement?")) { await supabase.from("os_announcements").delete().eq("id", a.id); rows.reload(); } }}>Remove</button>}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#3A4B60]">{a.body}</p>
              <p className={cn("mt-1.5 text-xs", muted)}>{personLabel(dir?.peopleById ?? new Map(), a.created_by)} · {fmtDateTime(a.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : <p className={cn("text-sm", muted)}>No announcements.{canPost ? " Founders and managers can post one for everyone in this workspace." : ""}</p>}
      <RecordSheet open={open || !!edit} title={edit ? "Edit announcement" : "New announcement"} table="os_announcements" record={edit} defaults={{ company_code: company }}
        fields={[{ key: "title", label: "Title", required: true }, { key: "body", label: "Message", kind: "textarea", required: true }, { key: "pinned", label: "Pin to the top", kind: "checkbox" }, SENS]}
        onClose={() => { setOpen(false); setEdit(null); }} onSaved={() => { setOpen(false); setEdit(null); rows.reload(); }} />
    </Section>
  );
}

type Decision = { id: string; decision: string; rationale: string | null; changes: string | null; decided_by: string | null; decided_on: string | null; status: string; source_link: string | null; project_id: string | null; division_id: string | null; sensitivity: string };
export function Decisions({ company }: { company: string }) {
  const dir = useDirectory();
  const rows = useQuery<Decision[]>((s) => s.from("os_decisions").select("id, decision, rationale, changes, decided_by, decided_on, status, source_link, project_id, division_id, sensitivity").eq("company_code", company).order("decided_on", { ascending: false, nullsFirst: true }), [company]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Decision | null>(null);
  return (
    <Section title="Decision log" action={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>Record decision</button>}>
      <ErrorLine message={rows.error} />
      <RowList rows={rows.data ?? []} rowKey={(d) => d.id}
        empty={<Empty compact title="No decisions recorded" body="Record decisions with their rationale so the team can find why something changed." />}
        columns={[
          { key: "d", label: "Decision", primary: true, className: "w-[45%]", render: (d) => <button type="button" className="text-left hover:underline" onClick={() => setEdit(d)}>{d.decision}</button> },
          { key: "id", label: "ID", className: "w-24", render: (d) => <span className="text-xs text-[#66768A]">{d.id}</span> },
          { key: "s", label: "Status", className: "w-28", render: (d) => <StatusBadge value={d.status} /> },
          { key: "by", label: "Decided by", className: "w-32", render: (d) => personLabel(dir?.peopleById ?? new Map(), d.decided_by) },
          { key: "on", label: "On", className: "w-28", render: (d) => <span className="text-xs">{fmtDate(d.decided_on)}</span> },
        ]} />
      <RecordSheet open={open || !!edit} title={edit ? `Decision ${edit.id}` : "Record a decision"} table="os_decisions" record={edit} defaults={{ company_code: company }}
        fields={[{ key: "decision", label: "Decision", kind: "textarea", required: true }, { key: "rationale", label: "Rationale", kind: "textarea" }, { key: "changes", label: "What changes", kind: "textarea" },
          { key: "decided_by", label: "Decided by", kind: "person" }, { key: "decided_on", label: "Decided on", kind: "date" }, { key: "status", label: "Status", kind: "select", options: DECISION_STATUSES, required: true },
          { key: "division_id", label: "Division", kind: "division" }, { key: "source_link", label: "Source link" }, SENS]}
        onClose={() => { setOpen(false); setEdit(null); }} onSaved={() => { setOpen(false); setEdit(null); rows.reload(); }} />
    </Section>
  );
}

type Meeting = { id: string; meeting_type: string | null; title: string; held_on: string | null; facilitator_person_id: string | null; attendees: string | null; notes: string | null; division_id: string | null; sensitivity: string };
export function Meetings({ company }: { company: string }) {
  const dir = useDirectory();
  const rows = useQuery<Meeting[]>((s) => s.from("os_meetings").select("id, meeting_type, title, held_on, facilitator_person_id, attendees, notes, division_id, sensitivity").eq("company_code", company).order("held_on", { ascending: false }), [company]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Meeting | null>(null);
  return (
    <Section title="Meetings" action={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>Log meeting</button>}>
      <ErrorLine message={rows.error} />
      <RowList rows={rows.data ?? []} rowKey={(m) => m.id}
        empty={<Empty compact title="No meetings logged" body="Log a meeting with its notes; minutes documents can be linked from the Documents hub." />}
        columns={[
          { key: "t", label: "Meeting", primary: true, className: "w-[40%]", render: (m) => <button type="button" className="text-left hover:underline" onClick={() => setEdit(m)}>{m.title}</button> },
          { key: "k", label: "Type", className: "w-32", render: (m) => m.meeting_type ?? "—" },
          { key: "on", label: "Held", className: "w-28", render: (m) => <span className="text-xs">{fmtDate(m.held_on)}</span> },
          { key: "f", label: "Facilitator", className: "w-32", render: (m) => personLabel(dir?.peopleById ?? new Map(), m.facilitator_person_id) },
        ]} />
      <RecordSheet open={open || !!edit} title={edit ? `Meeting ${edit.id}` : "Log a meeting"} table="os_meetings" record={edit} defaults={{ company_code: company }}
        fields={[{ key: "title", label: "Title", required: true }, { key: "meeting_type", label: "Type", hint: "For example Weekly sync, Monthly review." }, { key: "held_on", label: "Held on", kind: "date" },
          { key: "facilitator_person_id", label: "Facilitator", kind: "person" }, { key: "attendees", label: "Attendees" }, { key: "notes", label: "Notes", kind: "textarea" }, { key: "division_id", label: "Division", kind: "division" }, SENS]}
        onClose={() => { setOpen(false); setEdit(null); }} onSaved={() => { setOpen(false); setEdit(null); rows.reload(); }} />
    </Section>
  );
}

type Product = { id: string; item_type: string; title: string; status: string; version: string | null; severity: string | null; owner_person_id: string | null; planned_date: string | null; actual_date: string | null; link: string | null; notes: string | null; division_id: string | null; sensitivity: string };
export function ProductItems({ company }: { company: string }) {
  const dir = useDirectory();
  const [type, setType] = useState("");
  const rows = useQuery<Product[]>((s) => s.from("os_product_items").select("id, item_type, title, status, version, severity, owner_person_id, planned_date, actual_date, link, notes, division_id, sensitivity").eq("company_code", company).order("planned_date", { nullsFirst: false }), [company]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const list = (rows.data ?? []).filter((r) => !type || r.item_type === type);
  return (
    <Section title="Product: releases, features, defects and pilots" action={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>Add item</button>}>
      <div className="mb-3 w-full sm:w-48"><Select ariaLabel="Item type" value={type} onChange={setType} options={PRODUCT_ITEM_TYPES} placeholder="All types" /></div>
      <ErrorLine message={rows.error} />
      <RowList rows={list} rowKey={(r) => r.id}
        empty={<Empty compact title="No product items" body="Track Elco AI releases, features, defects and pilot cohorts here." />}
        columns={[
          { key: "t", label: "Item", primary: true, className: "w-[38%]", render: (r) => <button type="button" className="text-left hover:underline" onClick={() => setEdit(r)}>{r.title}</button> },
          { key: "k", label: "Type", className: "w-28", render: (r) => r.item_type },
          { key: "s", label: "Status", className: "w-28", render: (r) => <StatusBadge value={r.status} /> },
          { key: "v", label: "Version", className: "w-24", render: (r) => r.version ?? "—" },
          { key: "o", label: "Owner", className: "w-32", render: (r) => personLabel(dir?.peopleById ?? new Map(), r.owner_person_id) },
          { key: "d", label: "Planned", className: "w-28", render: (r) => <span className="text-xs">{fmtDate(r.planned_date)}</span> },
        ]} />
      <RecordSheet open={open || !!edit} title={edit ? `${edit.item_type} ${edit.id}` : "New product item"} table="os_product_items" record={edit} defaults={{ company_code: company }}
        fields={[{ key: "title", label: "Title", required: true }, { key: "item_type", label: "Type", kind: "select", options: PRODUCT_ITEM_TYPES, required: true }, { key: "status", label: "Status", kind: "select", options: PRODUCT_STATUSES, required: true },
          { key: "version", label: "Version" }, { key: "severity", label: "Severity (defects)", kind: "select", options: ["Critical", "High", "Medium", "Low"] }, { key: "owner_person_id", label: "Owner", kind: "person" },
          { key: "planned_date", label: "Planned", kind: "date" }, { key: "actual_date", label: "Actual", kind: "date" }, { key: "link", label: "Link" }, { key: "notes", label: "Notes", kind: "textarea" }, { key: "division_id", label: "Division", kind: "division" }, SENS]}
        onClose={() => { setOpen(false); setEdit(null); }} onSaved={() => { setOpen(false); setEdit(null); rows.reload(); }} />
    </Section>
  );
}
