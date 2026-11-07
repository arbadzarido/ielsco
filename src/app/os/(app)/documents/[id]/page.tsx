"use client";

import Link from "next/link";
import { use, useState } from "react";
import { AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { DivisionSelect, PersonSelect } from "@/components/os/pickers";
import { Badge, Empty, ErrorLine, Field, KeyValue, Loading, PageTitle, Section, Select, Sheet, StatusBadge, btn, btnPrimary, input, linkCls, muted, panel } from "@/components/os/ui";
import { DOC_STATUSES, DOC_TYPES, SENSITIVITIES, companyName, fmtDate, fmtDateTime, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Doc = {
  id: string; reference_number: string | null; title: string; company_code: string; division_id: string | null; doc_type: string; category: string | null;
  status: string; sensitivity: string; owner_person_id: string | null; approver_person_id: string | null; approved_at: string | null; version: string | null;
  next_review_date: string | null; notes: string | null; drive_file_id: string | null; drive_url: string | null; drive_mime_type: string | null;
  template_file_id: string | null; drive_modified_at: string | null; drive_checked_at: string | null; created_at: string; updated_at: string;
  drift_findings: { code: string; severity: "high" | "medium" | "low"; message: string }[];
};
const ENTITY_HREF: Record<string, (id: string) => string | null> = {
  project: (id) => `/os/projects/${id}`, task: (id) => `/os/tasks/${id}`, partnership: (id) => `/os/partnerships?open=${id}`,
  campaign: (id) => `/os/campaigns?open=${id}`, objective: () => "/os/okrs", kpi: (id) => `/os/kpis/${id}`, meeting: () => "/os/w/hq?tab=meetings", decision: () => "/os/w/hq?tab=decisions",
};

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const doc = useQuery<Doc | null>((s) => s.from("os_documents").select("*").eq("id", id).maybeSingle(), [id]);
  const links = useQuery<{ entity_type: string; entity_id: string }[]>((s) => s.from("os_document_links").select("entity_type, entity_id").eq("document_id", id), [id]);
  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  if (doc.loading && !doc.data) return <Loading />;
  const d = doc.data;
  if (!d) return <Empty title="Document not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/documents" className={btn}>Back to documents</Link>} />;

  async function setStatus(status: string) {
    setErr(null);
    const { data, error } = await supabase.from("os_documents").update({ status }).eq("id", id).select("id").maybeSingle();
    if (error || !data) setErr(error ? friendlyError(error.message) : "You can't change this document.");
    doc.reload();
  }
  async function check() {
    setChecking(true); setErr(null); setCheckMsg(null);
    try {
      const r = await fetch(`/os/api/documents/${encodeURIComponent(id)}/check`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error ?? "The access check didn't run."); else setCheckMsg(j.findings?.length ? null : "No access findings. Sharing matches the document's sensitivity.");
    } catch { setErr("Couldn't reach the server."); }
    setChecking(false); doc.reload();
  }
  const typeLabel = DOC_TYPES.find((t) => t.code === d.doc_type)?.label ?? d.doc_type;

  return (
    <div>
      <PageTitle title={d.title} crumbs={[{ href: "/os/documents", label: "Documents" }]}
        description={`${d.reference_number ?? d.id} · ${companyName(d.company_code)}${d.division_id ? ` · ${dir?.divisionById.get(d.division_id)?.name ?? d.division_id}` : ""}`}
        actions={<>
          <Select ariaLabel="Status" value={d.status} onChange={setStatus} options={DOC_STATUSES} className="w-36" />
          <button type="button" className={btn} onClick={() => setEditing(true)}>Edit</button>
          {d.drive_url && <a href={d.drive_url} target="_blank" rel="noopener noreferrer" className={btnPrimary}><ExternalLink size={15} aria-hidden="true" />Open in Drive</a>}
        </>} />
      <ErrorLine message={err} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Section title="Access check" action={d.drive_file_id ? <button type="button" className={btn} onClick={check} disabled={checking} data-testid="os-doc-check"><ShieldCheck size={15} aria-hidden="true" />{checking ? "Checking…" : "Check access"}</button> : undefined}>
            {!d.drive_file_id ? <p className={cn("text-sm", muted)}>No Drive file is attached, so there&apos;s nothing to check.</p>
              : d.drift_findings?.length ? (
                <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-doc-findings">
                  {d.drift_findings.map((f) => (
                    <li key={f.code} className="flex items-start gap-2 px-3 py-2 text-sm">
                      <AlertTriangle size={15} className={cn("mt-0.5 shrink-0", f.severity === "high" ? "text-[#A12D2F]" : "text-[#B4690E]")} aria-hidden="true" />
                      <span className="flex-1">{f.message}</span><Badge tone={f.severity === "high" ? "red" : f.severity === "medium" ? "amber" : "neutral"}>{f.severity}</Badge>
                    </li>
                  ))}
                  <li className={cn("px-3 py-2 text-xs", muted)}>Company OS only reports this. Fix the sharing in Google Drive; the next check will clear it.</li>
                </ul>
              ) : <p className={cn("text-sm", muted)}>{checkMsg ?? (d.drive_checked_at ? `No findings at the last check (${fmtDateTime(d.drive_checked_at)}).` : "Not checked yet.")}</p>}
          </Section>
          {d.notes && <Section title="Notes"><p className={cn(panel, "whitespace-pre-wrap p-4 text-sm")}>{d.notes}</p></Section>}
          <Section title="Linked to">
            {links.data?.length ? (
              <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>
                {links.data.map((l) => { const href = ENTITY_HREF[l.entity_type]?.(l.entity_id); return (
                  <li key={`${l.entity_type}:${l.entity_id}`} className="flex items-center gap-2 px-3 py-2">
                    <span className="w-24 text-xs capitalize text-[#66768A]">{l.entity_type}</span>
                    {href ? <Link href={href} className={linkCls}>{l.entity_id}</Link> : <span>{l.entity_id}</span>}
                  </li>); })}
              </ul>
            ) : <p className={cn("text-sm", muted)}>Not linked to any project, task, meeting or partnership yet. Link it from that record&apos;s Documents section.</p>}
          </Section>
          <EntityFeed type="document" id={d.id} />
        </div>
        <aside>
          <section className={cn(panel, "p-4")}>
            <KeyValue items={[
              { label: "Type", value: `${d.doc_type} · ${typeLabel}` },
              { label: "Category", value: d.category ?? "—" },
              { label: "Sensitivity", value: <StatusBadge value={d.sensitivity} /> },
              { label: "Owner", value: personLabel(people, d.owner_person_id) },
              { label: "Approved", value: d.approved_at ? `${personLabel(people, d.approver_person_id)}, ${fmtDate(d.approved_at.slice(0, 10))}` : "—" },
              { label: "Version", value: d.version ?? "—" },
              { label: "Next review", value: fmtDate(d.next_review_date) },
              { label: "From template", value: d.template_file_id ? "Yes" : "No" },
              { label: "Drive edited", value: d.drive_modified_at ? fmtDateTime(d.drive_modified_at) : "—" },
              { label: "Registered", value: fmtDateTime(d.created_at) },
            ]} />
          </section>
        </aside>
      </div>
      {editing && <EditDocument doc={d} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); doc.reload(); }} />}
    </div>
  );
}

function EditDocument({ doc, onClose, onSaved }: { doc: Doc; onClose: () => void; onSaved: () => void }) {
  const { supabase } = useOsMe();
  const [f, setF] = useState({ title: doc.title, division_id: doc.division_id ?? "", category: doc.category ?? "", sensitivity: doc.sensitivity, owner_person_id: doc.owner_person_id ?? "", version: doc.version ?? "", next_review_date: doc.next_review_date ?? "", notes: doc.notes ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  async function save() {
    const patch = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === "title" || k === "sensitivity" ? v : v.trim() || null]));
    const { data, error } = await supabase.from("os_documents").update(patch).eq("id", doc.id).select("id").maybeSingle();
    if (error || !data) setErr(error ? friendlyError(error.message) : "You can't change this document."); else onSaved();
  }
  return (
    <Sheet open onClose={onClose} title="Edit document" footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={save} disabled={!f.title.trim()}>Save</button></>}>
      <div className="space-y-4">
        <ErrorLine message={err} />
        <p className={cn("text-xs", muted)}>This changes the register only. The file name and sharing in Drive stay as they are.</p>
        <Field label="Title">{(id) => <input id={id} className={input} value={f.title} onChange={(e) => set("title")(e.target.value)} maxLength={300} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Division">{(id) => <DivisionSelect id={id} value={f.division_id} onChange={set("division_id")} />}</Field>
          <Field label="Sensitivity">{(id) => <Select id={id} value={f.sensitivity} onChange={set("sensitivity")} options={SENSITIVITIES} />}</Field>
          <Field label="Owner">{(id) => <PersonSelect id={id} value={f.owner_person_id} onChange={set("owner_person_id")} />}</Field>
          <Field label="Category">{(id) => <input id={id} className={input} value={f.category} onChange={(e) => set("category")(e.target.value)} />}</Field>
          <Field label="Version">{(id) => <input id={id} className={input} value={f.version} onChange={(e) => set("version")(e.target.value)} />}</Field>
          <Field label="Next review">{(id) => <input id={id} type="date" className={input} value={f.next_review_date} onChange={(e) => set("next_review_date")(e.target.value)} />}</Field>
        </div>
        <Field label="Notes">{(id) => <textarea id={id} rows={4} className={input} value={f.notes} onChange={(e) => set("notes")(e.target.value)} />}</Field>
      </div>
    </Sheet>
  );
}
