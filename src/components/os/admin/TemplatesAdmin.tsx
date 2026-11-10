"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PersonSelect } from "@/components/os/pickers";
import { useDirectory } from "@/components/os/data";
import { Badge, ErrorLine, Field, Select, btn, btnDanger, btnPrimary, input, muted, panel } from "@/components/os/ui";
import { ACCESS_MODES, ELIGIBILITY, LEGAL_LABEL, TEMPLATE_COLUMNS, TEMPLATE_COMPANIES, legalState, resolveStorage, validateTemplateMeta, type DocTemplate } from "@/lib/os/doc-templates";
import { DOC_TYPES, SENSITIVITIES, companyName, personLabel } from "@/lib/os/meta";
import { type FolderRoute } from "@/lib/os/routes";
import { dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";

// Admin → Document templates. The registry that decides what each template is for: companies, divisions, type,
// sensitivity, who may generate it and who may read what it makes, approval, legal status, and the folder it resolves to.
// Founders only (RLS). Nothing here creates a Drive folder or approves a route; missing routes are shown with the
// exact step to take in Drive folder routes.

type Row = DocTemplate;
type DriveTemplate = { id: string; name: string };
type Version = { version: number; changed_at: string; changed_by: string | null };

export function TemplatesAdmin({ supabase }: { supabase: SupabaseClient }) {
  const dir = useDirectory();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [routes, setRoutes] = useState<FolderRoute[]>([]);
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([]);
  const [authorized, setAuthorized] = useState<{ template_id: string; person_id: string }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, r, d, a] = await Promise.all([
      supabase.from("os_doc_templates").select(TEMPLATE_COLUMNS).order("category").order("name"),
      supabase.from("os_folder_routes").select("id, company_code, division_id, doc_type, sensitivity, drive_folder_id, folder_name, status, access_ok").in("status", ["approved", "proposed"]),
      supabase.from("os_divisions").select("id, name").order("id"),
      supabase.from("os_doc_template_authorized").select("template_id, person_id"),
    ]);
    if (t.error) return setMsg({ ok: false, text: "Couldn't load the templates." });
    setRows((t.data as Row[]) ?? []); setRoutes((r.data as FolderRoute[]) ?? []); setDivisions((d.data as { id: string; name: string }[]) ?? []); setAuthorized((a.data as { template_id: string; person_id: string }[]) ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const names = useMemo(() => ({ company: companyName, division: (d: string) => divisions.find((x) => x.id === d)?.name ?? null }), [divisions]);
  const open = rows?.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-6" data-testid="os-templates-admin">
      <p className={cn("text-sm", muted)}>Each template decides its own company, division, document type, sensitivity, who may generate it, who may read the result and where it is filed. People using Documents only fill in the template&apos;s fields.</p>
      {msg && <p role="status" className={cn("rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-[#F1F9F4] text-[#22663F]" : "bg-[#FDF2F2] text-[#A12D2F]")}>{msg.text}</p>}
      {!rows ? <p className={muted}>Loading…</p> : (
        <>
          <section aria-label="Route coverage">
            <h3 className="mb-2 text-sm font-semibold">Route coverage</h3>
            <p className={cn("mb-2 text-xs", muted)}>For every active template and company: the approved folder it resolves to, or what is missing.</p>
            <div className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-tpl-coverage">
              {rows.filter((t) => t.active).flatMap((t) => resolveStorage(t, routes, names).map((r) => (
                <div key={`${t.id}-${r.company}`} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                  <Badge tone="blue">{companyName(r.company)}</Badge>
                  {r.route ? <span className="text-xs text-[#22663F]">→ {r.route.folder_name}</span>
                    : <span className="text-xs text-[#A12D2F]">{r.proposed ? `Waiting for approval: “${r.proposed.folder_name}”` : r.division === null && !t.storage_division_id ? "Depends on the division chosen when generating" : "No route"}</span>}
                  {!r.route && (r.proposed || t.storage_division_id) && <Link href="/os/admin?tab=routes" className="text-xs underline">Open Drive folder routes</Link>}
                </div>
              )))}
              {!rows.some((t) => t.active) && <p className={cn("px-3 py-3 text-sm", muted)}>No active templates.</p>}
            </div>
          </section>

          <section aria-label="Templates">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Templates ({rows.length})</h3>
              <AddDriveTemplate supabase={supabase} existing={rows} onAdded={(id) => { setOpenId(id); load(); }} setMsg={setMsg} />
            </div>
            <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
              {rows.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setOpenId(t.id === openId ? null : t.id)} aria-expanded={t.id === openId} data-testid="os-tpl-row"
                    className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#F5F7FA]">
                    <span className="min-w-0 flex-1 font-medium">{t.name}</span>
                    <Badge>{t.category}</Badge><Badge>{t.sensitivity}</Badge>
                    {!t.active && <Badge tone="red">Inactive</Badge>}
                    {legalState(t) === "internal_draft" && <Badge tone="amber">{LEGAL_LABEL.internal_draft}</Badge>}
                    {legalState(t) === "execution_ready" && <Badge tone="green">{LEGAL_LABEL.execution_ready}</Badge>}
                    <span className={cn("text-xs", muted)}>v{t.version}</span>
                  </button>
                  {t.id === openId && open && <TemplateEditor key={`${open.id}-${open.version}`} t={open} supabase={supabase} routes={routes} divisions={divisions} names={names}
                    authorized={authorized.filter((a) => a.template_id === t.id).map((a) => a.person_id)} people={dir?.peopleById ?? new Map()} onSaved={load} setMsg={setMsg} />}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function AddDriveTemplate({ supabase, existing, onAdded, setMsg }: { supabase: SupabaseClient; existing: Row[]; onAdded: (id: string) => void; setMsg: (m: { ok: boolean; text: string }) => void }) {
  const [list, setList] = useState<DriveTemplate[] | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const known = new Set(existing.map((e) => e.drive_template_file_id));
  async function loadList() {
    const r = await fetch("/os/api/documents/templates"); const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg({ ok: false, text: j.error ?? "The Drive templates couldn't be listed." }); else setList((j.templates as DriveTemplate[]).filter((t) => !known.has(t.id)));
  }
  async function add() {
    const t = list?.find((x) => x.id === pick); if (!t) return;
    setBusy(true);
    // Defaults come from the file name ("HQ-TPL — Meeting Minutes (TPL-D05)"): company from the prefix, everything else a safe default to edit.
    const prefix = /^(HQ|IEL|ELC)-/.exec(t.name)?.[1];
    const clean = t.name.replace(/^[A-Z]+-TPL\s+—\s+/, "").replace(/\s*\(TPL-[A-Z0-9]+\)\s*$/, "");
    const id = `drive-${t.id.slice(0, 10).toLowerCase().replace(/[^a-z0-9]/g, "x")}`;
    const { error } = await supabase.from("os_doc_templates").insert({
      id, name: clean, description: "", category: "General", doc_type: "TPL", sensitivity: "Internal", company_codes: prefix ? [prefix] : ["HQ", "IEL", "ELC"],
      kind: "drive_copy", drive_template_file_id: t.id, eligibility: "staff", access_mode: "standard", active: false, legal_status: "not_required",
    });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: /duplicate/.test(error.message) ? "That Drive template is already in the catalog." : "Couldn't add the template." });
    setMsg({ ok: true, text: `“${clean}” was added as inactive. Check its details, then turn it on.` }); setList(null); setPick(""); onAdded(id);
  }
  if (!list) return <button type="button" className={btn} onClick={loadList}>Add a Drive master template</button>;
  return (
    <div className="flex items-center gap-2">
      <Select ariaLabel="Drive master template" value={pick} onChange={setPick} placeholder="Choose a Drive template…" options={list.map((t) => ({ value: t.id, label: t.name }))} className="w-64" />
      <button type="button" className={btnPrimary} disabled={!pick || busy} onClick={add}>Add</button>
      <button type="button" className={btn} onClick={() => setList(null)}>Cancel</button>
    </div>
  );
}

function TemplateEditor({ t, supabase, routes, divisions, names, authorized, people, onSaved, setMsg }: {
  t: Row; supabase: SupabaseClient; routes: FolderRoute[]; divisions: { id: string; name: string }[]; names: { company: (c: string) => string; division: (d: string) => string | null };
  authorized: string[]; people: Map<string, { full_name: string; short_name?: string | null }>; onSaved: () => void; setMsg: (m: { ok: boolean; text: string }) => void;
}) {
  const [f, setF] = useState({ ...t });
  const [versions, setVersions] = useState<Version[]>([]);
  const [busy, setBusy] = useState(false);
  const [addPerson, setAddPerson] = useState("");
  const [confirmLegal, setConfirmLegal] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { supabase.from("os_doc_template_versions").select("version, changed_at, changed_by").eq("template_id", t.id).order("version", { ascending: false }).then(({ data }) => setVersions((data as Version[]) ?? [])); }, [supabase, t.id, t.version]);

  const problems = validateTemplateMeta(f);
  const before = resolveStorage(t, routes, names);
  const after = resolveStorage({ ...t, ...f }, routes, names);
  const changed = JSON.stringify(before.map((r) => r.route?.id ?? null)) !== JSON.stringify(after.map((r) => r.route?.id ?? null)) || before.length !== after.length;
  const dirty = JSON.stringify({ ...f }) !== JSON.stringify({ ...t });
  const set = <K extends keyof Row>(k: K, v: Row[K]) => setF((s) => ({ ...s, [k]: v }));
  const toggle = (list: string[] | null, v: string) => (list ?? []).includes(v) ? (list ?? []).filter((x) => x !== v) : [...(list ?? []), v];

  async function save() {
    setErr(null); setBusy(true);
    const { error } = await supabase.from("os_doc_templates").update({
      name: f.name, description: f.description, use_when: f.use_when || null, category: f.category, doc_type: f.doc_type, sensitivity: f.sensitivity, company_codes: f.company_codes,
      division_ids: f.division_ids && f.division_ids.length ? f.division_ids : null, storage_division_id: f.storage_division_id || null, eligibility: f.eligibility, access_mode: f.access_mode,
      approval_required: f.approval_required, active: f.active, owner_person_id: f.owner_person_id || null,
    }).eq("id", t.id);
    setBusy(false);
    if (error) return setErr(/check constraint/.test(error.message) ? "Those settings don't fit together. Check the notes above the Save button." : "The template couldn't be saved.");
    setMsg({ ok: true, text: `“${f.name}” saved as a new version.` }); onSaved();
  }
  async function legal(next: "legally_approved" | "draft_pending_legal") {
    if (next === "legally_approved" && !confirm("Mark this template legally approved? Documents generated from now on lose the draft marking. Only do this after a qualified lawyer has reviewed the exact text and the checklist is complete.")) return;
    setBusy(true);
    const { error } = await supabase.from("os_doc_templates").update({ legal_status: next }).eq("id", t.id);
    setBusy(false);
    if (error) return setErr("The legal status couldn't be changed.");
    setMsg({ ok: true, text: next === "legally_approved" ? "Marked legally approved. This is recorded in the audit log." : "Back to draft — pending legal review." }); setConfirmLegal(false); onSaved();
  }
  async function authorize() {
    if (!addPerson) return;
    const { error } = await supabase.from("os_doc_template_authorized").insert({ template_id: t.id, person_id: addPerson });
    if (error) return setErr(/Only active staff/.test(error.message) ? "Only active staff can be authorised." : /duplicate/.test(error.message) ? "They are already authorised." : "Couldn't authorise them.");
    setAddPerson(""); onSaved();
  }
  async function revoke(person: string) {
    if (!confirm("Remove this person's authorisation? They can no longer generate or read documents from this template.")) return;
    await supabase.from("os_doc_template_authorized").delete().eq("template_id", t.id).eq("person_id", person); onSaved();
  }

  return (
    <div className="space-y-4 border-t border-[#F0F2F5] bg-[#FAFBFC] px-3 py-4" data-testid="os-tpl-editor">
      <ErrorLine message={err} />
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Name">{(id) => <input id={id} className={input} value={f.name} maxLength={120} onChange={(e) => set("name", e.target.value)} />}</Field>
        <Field label="Category">{(id) => <input id={id} className={input} value={f.category} maxLength={60} onChange={(e) => set("category", e.target.value)} list="tpl-categories" />}</Field>
        <Field label="Description" className="md:col-span-2">{(id) => <textarea id={id} className={cn(input, "min-h-16")} value={f.description} maxLength={600} onChange={(e) => set("description", e.target.value)} />}</Field>
        <Field label="Use when…" className="md:col-span-2" hint="One line that tells people when this is the right template.">{(id) => <input id={id} className={input} value={f.use_when ?? ""} maxLength={400} onChange={(e) => set("use_when", e.target.value)} />}</Field>
        <Field label="Document type">{(id) => <Select id={id} value={f.doc_type} onChange={(v) => set("doc_type", v)} options={DOC_TYPES.map((d) => ({ value: d.code, label: `${d.code} · ${d.label}` }))} />}</Field>
        <Field label="Default sensitivity">{(id) => <Select id={id} value={f.sensitivity} onChange={(v) => set("sensitivity", v)} options={SENSITIVITIES} />}</Field>
        <Field label="Who can generate it">{(id) => <Select id={id} value={f.eligibility} onChange={(v) => set("eligibility", v as Row["eligibility"])} options={ELIGIBILITY.map((e) => ({ value: e.value, label: e.label }))} />}</Field>
        <Field label="Who can read what it makes">{(id) => <Select id={id} value={f.access_mode} onChange={(v) => set("access_mode", v as Row["access_mode"])} options={ACCESS_MODES.map((e) => ({ value: e.value, label: e.label }))} />}</Field>
        <Field label="Storage division" hint="If set, every document is filed under this division. Otherwise the person picks one.">{(id) => <Select id={id} value={f.storage_division_id ?? ""} onChange={(v) => set("storage_division_id", v || null)} placeholder="Chosen when generating" options={divisions.map((d) => ({ value: d.id, label: d.name }))} />}</Field>
        <Field label="Template owner">{(id) => <PersonSelect id={id} value={f.owner_person_id ?? ""} onChange={(v) => set("owner_person_id", v || null)} placeholder="No owner" />}</Field>
      </div>
      <fieldset><legend className="mb-1 text-xs font-medium text-[#3A4B60]">Companies</legend>
        <div className="flex flex-wrap gap-3">{TEMPLATE_COMPANIES.map((c) => (
          <label key={c} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.company_codes.includes(c)} onChange={() => set("company_codes", toggle(f.company_codes, c))} />{companyName(c)}</label>))}
        </div></fieldset>
      {!f.storage_division_id && (
        <fieldset><legend className="mb-1 text-xs font-medium text-[#3A4B60]">Divisions it supports (none ticked: all divisions)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">{divisions.map((d) => (
            <label key={d.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4" checked={(f.division_ids ?? []).includes(d.id)} onChange={() => set("division_ids", toggle(f.division_ids, d.id))} />{d.name}</label>))}
          </div></fieldset>
      )}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.approval_required} onChange={(e) => set("approval_required", e.target.checked)} />A founder or division manager approves each document</label>
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="h-4 w-4" checked={f.active} onChange={(e) => set("active", e.target.checked)} data-testid="os-tpl-active" />Active (shown in Documents)</label>
      </div>

      {problems.length > 0 && <ul className="rounded-lg bg-[#FDF2F2] px-3 py-2 text-sm text-[#A12D2F]" role="alert">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {dirty && (
        <div className="rounded-lg border border-[#E1E5EB] bg-white px-3 py-2 text-sm" data-testid="os-tpl-impact">
          <p className="font-medium">If you save{changed ? " (this changes where documents are filed)" : ""}:</p>
          <ul className="mt-1 space-y-0.5">{after.map((r) => <li key={r.company} className="text-xs">{companyName(r.company)}: {r.route ? <span className="text-[#22663F]">→ {r.route.folder_name}</span> : <span className="text-[#A12D2F]">{r.proposed ? `waiting for approval of “${r.proposed.folder_name}”` : r.division === null && !f.storage_division_id ? "depends on the division chosen" : "no approved route yet"}</span>}</li>)}</ul>
          <p className={cn("mt-1 text-xs", muted)}>Saving creates version {t.version + 1}. Documents already made keep the version they were made from.</p>
        </div>
      )}
      <div className="flex justify-end"><button type="button" className={btnPrimary} disabled={busy || !dirty || problems.length > 0} onClick={save} data-testid="os-tpl-save-meta">{busy ? "Saving…" : "Save changes"}</button></div>

      {f.eligibility === "authorized" && (
        <section aria-label="Authorised people">
          <h4 className="mb-1 text-sm font-semibold">Authorised people (besides founders)</h4>
          <ul className="mb-2 flex flex-wrap gap-1.5">{authorized.map((p) => (
            <li key={p} className="flex items-center gap-1 rounded-full bg-[#F0F2F5] py-0.5 pl-2 pr-1 text-xs">{personLabel(people as never, p)}
              <button type="button" className="rounded px-1 text-[#66768A] hover:text-[#A12D2F]" aria-label={`Remove ${personLabel(people as never, p)}`} onClick={() => revoke(p)}>×</button></li>))}
            {!authorized.length && <li className={cn("text-xs", muted)}>Nobody yet: only founders can use this template.</li>}</ul>
          <div className="flex items-center gap-2"><div className="w-64"><PersonSelect value={addPerson} onChange={setAddPerson} placeholder="Add a person…" /></div><button type="button" className={btn} disabled={!addPerson} onClick={authorize}>Authorise</button></div>
        </section>
      )}

      {t.legal_status !== "not_required" && (
        <section aria-label="Legal status" className="rounded-lg border border-[#F2D9A6] bg-[#FFF8EC] px-3 py-3">
          <h4 className="text-sm font-semibold text-[#7A4300]">Legal status: {LEGAL_LABEL[legalState(t) === "execution_ready" ? "execution_ready" : "internal_draft"]}</h4>
          <p className="mt-1 text-xs text-[#7A4300]">Until a qualified lawyer has reviewed the exact text, every document from this template is marked as an internal draft and cannot be approved. Marking it approved is recorded with your name. If the wording changes later, the approval no longer counts for the new wording.</p>
          {t.legal_status === "draft_pending_legal" ? (
            <div className="mt-2 space-y-2">
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={confirmLegal} onChange={(e) => setConfirmLegal(e.target.checked)} data-testid="os-tpl-legal-confirm" />A qualified lawyer has reviewed this exact text and every item on the legal-review checklist is resolved.</label>
              <button type="button" className={btnPrimary} disabled={!confirmLegal || busy} onClick={() => legal("legally_approved")}>Mark legally approved</button>
            </div>
          ) : <button type="button" className={cn(btnDanger, "mt-2")} disabled={busy} onClick={() => legal("draft_pending_legal")}>Withdraw approval</button>}
        </section>
      )}

      <section aria-label="Version history"><h4 className="mb-1 text-sm font-semibold">Version history</h4>
        <ul className="space-y-0.5 text-xs">{versions.map((v) => <li key={v.version}>v{v.version} · {dateWib(v.changed_at)}{v.changed_by ? ` · ${personLabel(people as never, v.changed_by)}` : ""}</li>)}</ul></section>
      <datalist id="tpl-categories">{["People / Human Resources", "Operations", "Finance", "Legal & Governance", "Marketing & Community", "Partnerships", "Programs & Events", "General"].map((c) => <option key={c} value={c} />)}</datalist>
    </div>
  );
}
