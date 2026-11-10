"use client";

// "New document", template first. Pick a template from the catalog; the template decides company options, division,
// type, sensitivity, who can read the result and where it is filed. The person fills in only the template's fields.
// The server (api/documents/generate) re-checks everything; this screen never talks to Drive.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileText, Search, XCircle } from "lucide-react";
import { useDirectory, useMyScope } from "./data";
import { DivisionSelect, PersonSelect } from "./pickers";
import { Badge, ErrorLine, Field, Select, Sheet, btn, btnGhost, btnPrimary, input, linkCls, muted } from "./ui";
import { DOC_TYPES } from "@/lib/os/meta";
import { filterTemplates, LEGAL_LABEL, type DocTemplate, type TemplateField, type TemplateOption } from "@/lib/os/doc-templates";
import { cn } from "@/lib/utils";

type CatalogTemplate = DocTemplate & { legal: "not_required" | "internal_draft" | "execution_ready"; options: TemplateOption[]; needsDivision: boolean; divisionChoices: string[] };
type Catalog = { templates: CatalogTemplate[]; recent: string[]; recommended: string[] };
type Check = { ok: boolean; folder: { name: string } | null; missing: string[]; writer_connected: boolean };
type Preview = { html: string | null; title: string; warnings: string[]; folder: string | null; missing: string[] };

export function GenerateDocumentSheet({ open, onClose, onCreated, onAddFile }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; onAddFile: () => void }) {
  const dir = useDirectory();
  const scope = useMyScope();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [docType, setDocType] = useState("");
  const [company, setCompanyFilter] = useState("");
  const [picked, setPicked] = useState<CatalogTemplate | null>(null);

  useEffect(() => {
    if (!open || catalog) return;
    fetch("/os/api/documents/catalog").then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (r.ok) setCatalog(j); else setLoadErr(j.error ?? "The template catalog couldn't be loaded.");
    }).catch(() => setLoadErr("The template catalog couldn't be loaded."));
  }, [open, catalog]);
  useEffect(() => { if (!open) setPicked(null); }, [open]);

  const all = useMemo(() => catalog?.templates ?? [], [catalog]);
  const categories = useMemo(() => Array.from(new Set(all.map((t) => t.category))).sort(), [all]);
  const types = useMemo(() => Array.from(new Set(all.map((t) => t.doc_type))).sort(), [all]);
  const filtering = Boolean(q || category || docType || company);
  const list = filterTemplates(all, { q, category, docType, company });
  const byId = new Map(all.map((t) => [t.id, t]));
  const recent = (catalog?.recent ?? []).map((id) => byId.get(id)).filter(Boolean) as CatalogTemplate[];
  const recommended = (catalog?.recommended ?? []).map((id) => byId.get(id)).filter(Boolean) as CatalogTemplate[];
  void scope;

  return (
    <Sheet open={open} onClose={onClose} title={picked ? picked.name : "New document"} wide
      footer={picked ? undefined : <button type="button" className={btnGhost} onClick={onAddFile} data-testid="os-add-file">Add an existing file or upload instead</button>}>
      {picked ? <TemplateForm key={picked.id} t={picked} onBack={() => setPicked(null)} onCreated={onCreated} divisionName={(id) => dir?.divisionById.get(id)?.name ?? id} /> : (
        <div className="space-y-4" data-testid="os-doc-catalog">
          <ErrorLine message={loadErr} />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <label className="relative col-span-2 md:col-span-4">
              <span className="sr-only">Search templates</span>
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates, for example “offering letter”" className={cn(input, "pl-8")} data-testid="os-tpl-search" />
            </label>
            <Select ariaLabel="Category" value={category} onChange={setCategory} options={categories} placeholder="Any category" />
            <Select ariaLabel="Document type" value={docType} onChange={setDocType} options={types.map((c) => ({ value: c, label: DOC_TYPES.find((d) => d.code === c)?.label ?? c }))} placeholder="Any type" />
            <Select ariaLabel="Company" value={company} onChange={setCompanyFilter} options={[{ value: "IEL", label: "IELSco" }, { value: "ELC", label: "Elco AI" }, { value: "HQ", label: "HQ" }]} placeholder="Any company" />
          </div>
          {!catalog && !loadErr ? <p className={cn("text-sm", muted)}>Loading templates…</p> : null}
          {catalog && !filtering && (recent.length > 0 || recommended.length > 0) && (
            <div className="space-y-3">
              {recent.length > 0 && <TemplateGroup title="Recently used" items={recent} onPick={setPicked} />}
              {recommended.length > 0 && <TemplateGroup title="Recommended for your divisions" items={recommended} onPick={setPicked} />}
            </div>
          )}
          {catalog && (list.length ? <TemplateGroup title={filtering ? `${list.length} match${list.length === 1 ? "" : "es"}` : "All templates"} items={list} onPick={setPicked} grouped={!filtering} />
            : <div className={cn("rounded-lg border border-dashed border-[#DDE2E8] p-4 text-sm", muted)}>{all.length ? "No template matches. Clear the filters, or add an existing file instead." : "No templates are set up for you yet. A founder adds them in Admin → Document templates. You can still add an existing file."}</div>)}
        </div>
      )}
    </Sheet>
  );
}

function TemplateGroup({ title, items, onPick, grouped }: { title: string; items: CatalogTemplate[]; onPick: (t: CatalogTemplate) => void; grouped?: boolean }) {
  const groups = grouped ? Array.from(new Set(items.map((t) => t.category))).map((c) => [c, items.filter((t) => t.category === c)] as const) : [[title, items] as const];
  return (
    <div className="space-y-3">
      {grouped && <h3 className="text-xs font-semibold uppercase tracking-wide text-[#66768A]">{title}</h3>}
      {groups.map(([g, ts]) => (
        <section key={g} aria-label={g}>
          <h4 className="mb-1.5 text-sm font-semibold text-[#1F2D3D]">{g}</h4>
          <ul className="grid gap-2 md:grid-cols-2">
            {ts.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => onPick(t)} data-testid="os-tpl-card" className="flex h-full w-full flex-col items-start gap-1 rounded-lg border border-[#E1E5EB] bg-white p-3 text-left hover:border-[#577E90] focus-visible:outline focus-visible:outline-2">
                  <span className="flex w-full items-start gap-2"><FileText size={16} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" /><span className="min-w-0 flex-1 text-sm font-semibold">{t.name}</span></span>
                  {t.description && <span className={cn("text-xs", muted)}>{t.description}</span>}
                  {t.use_when && <span className="text-xs text-[#3A4B60]"><b>Use when:</b> {t.use_when}</span>}
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Badge>{t.sensitivity}</Badge>
                    {t.company_codes.map((c) => <Badge key={c} tone="blue">{c === "IEL" ? "IELSco" : c === "ELC" ? "Elco AI" : "HQ"}</Badge>)}
                    {t.legal === "internal_draft" && <Badge tone="amber">{LEGAL_LABEL.internal_draft}</Badge>}
                    {t.options.every((o) => !o.ok) && <Badge tone="red">Not ready to save</Badge>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TemplateForm({ t, onBack, onCreated, divisionName }: { t: CatalogTemplate; onBack: () => void; onCreated: (id: string) => void; divisionName: (id: string) => string }) {
  const initial = Object.fromEntries(t.fields.filter((f) => f.default !== undefined).map((f) => [f.key, String(f.default)]));
  const [inputs, setInputs] = useState<Record<string, string>>(initial);
  const [title, setTitle] = useState(t.kind === "drive_copy" ? t.name.replace(/^[A-Z]+-TPL\s+—\s+/, "").replace(/\s*\(TPL-[A-Z0-9]+\)\s*$/, "") : "");
  const [company, setCompany] = useState(t.company_codes.length === 1 ? t.company_codes[0] : "");
  const [division, setDivision] = useState(t.divisionChoices.length === 1 ? t.divisionChoices[0] : "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"preview" | "save" | null>(null);
  const opt = t.options.find((o) => o.company === company);

  async function call(mode: "check" | "preview" | "save") {
    const r = await fetch("/os/api/documents/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ template_id: t.id, mode, company, division: division || undefined, title, inputs }) });
    return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
  }
  // Where it would be filed: re-checked whenever the company or division changes.
  useEffect(() => {
    setCheck(null);
    if (!company || (t.needsDivision && !division)) return;
    let live = true;
    call("check").then((r) => live && r.ok && setCheck(r.j)).catch(() => undefined);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, division]);

  async function run(mode: "preview" | "save") {
    setErr(null); setFieldErrors({}); setBusy(mode);
    try {
      const { ok, j } = await call(mode);
      if (!ok) { setErr(j.error ?? "That didn't work."); setFieldErrors(j.field_errors ?? {}); if (j.missing) setCheck((c) => c ? { ...c, ok: false, missing: j.missing } : c); }
      else if (mode === "preview") setPreview(j);
      else onCreated(j.id);
    } catch { setErr("Couldn't reach the server. Check your connection and try again."); }
    setBusy(null);
  }
  const set = (k: string, v: string) => { setInputs((s) => ({ ...s, [k]: v })); setPreview(null); };
  const canSave = Boolean(check?.ok) && (t.kind === "builtin" ? Boolean(preview) : true);

  return (
    <div className="space-y-4" data-testid="os-tpl-form">
      <button type="button" onClick={onBack} className={cn(btnGhost, "-ml-2")}><ArrowLeft size={14} aria-hidden="true" />All templates</button>
      <ErrorLine message={err} />
      {t.description && <p className={cn("text-sm", muted)}>{t.description}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Badge>{t.category}</Badge><Badge>{t.sensitivity}</Badge>
        {t.access_mode === "named" && <Badge tone="violet">Named readers only</Badge>}
        {t.legal === "internal_draft" && <Badge tone="amber">{LEGAL_LABEL.internal_draft}</Badge>}
        {t.approval_required && <Badge tone="blue">Needs approval</Badge>}
      </div>
      {t.legal === "internal_draft" && <p className="rounded-lg border border-[#F2D9A6] bg-[#FFF8EC] px-3 py-2 text-sm text-[#7A4300]" role="note">This template is still waiting for legal review. You can preview and save an internal draft; every page is marked as a draft and it is not for signature.</p>}
      {t.company_codes.length > 1 && (
        <Field label="Company">{(id) => <Select id={id} value={company} onChange={setCompany} placeholder="Choose…" options={t.options.map((o) => ({ value: o.company, label: o.label }))} />}</Field>
      )}
      {t.company_codes.length === 1 && <p className="text-sm"><span className={muted}>Company:</span> {t.options[0]?.label}</p>}
      {t.needsDivision && (
        <Field label="Division">{(id) => <Select id={id} value={division} onChange={setDivision} placeholder="Choose…" options={t.divisionChoices.map((d) => ({ value: d, label: divisionName(d) }))} />}</Field>
      )}
      {t.kind === "drive_copy" && <Field label="Title">{(id) => <input id={id} className={input} value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} data-testid="os-doc-title" />}</Field>}
      {t.fields.map((f) => <DynamicField key={f.key} f={f} value={inputs[f.key] ?? ""} onChange={(v) => set(f.key, v)} error={fieldErrors[f.key]} />)}
      {fieldErrors.title && <p className="text-xs text-[#A12D2F]">{fieldErrors.title}</p>}
      {company && (
        <div className={cn("rounded-lg border px-3 py-2 text-sm", check?.ok ? "border-[#CDE8D6] bg-[#F1F9F4]" : check ? "border-[#F1C9CA] bg-[#FDF2F2]" : "border-[#E1E5EB]")} role="status" data-testid="os-tpl-route">
          {!check ? <span className={muted}>Checking where this will be filed…</span>
            : check.folder ? <p className="flex items-start gap-1.5"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#2E7D4F]" aria-hidden="true" />Will be filed in the approved folder “{check.folder.name}”.</p>
            : null}
          {check && !check.folder && check.missing.map((m) => <p key={m} className="flex items-start gap-1.5 text-[#A12D2F]"><XCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{m}</p>)}
          {check && check.folder && !check.writer_connected && <p className="mt-1 flex items-start gap-1.5 text-[#A12D2F]"><XCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />Creating files in Drive needs a founder to connect Google Drive in Admin → Integration health.</p>}
          {check && !check.folder && <Link href="/os/admin?tab=routes" className={cn(linkCls, "mt-1 inline-block text-xs")}>Open Admin → Drive folder routes (founders)</Link>}
          {opt && !opt.ok && opt.reason && !check?.missing.length && <p className="text-[#A12D2F]">{opt.reason}</p>}
        </div>
      )}
      {preview?.warnings.map((w) => <p key={w} className="rounded-lg bg-[#FFF8EC] px-3 py-2 text-xs text-[#7A4300]">{w}</p>)}
      {preview?.html && <iframe title="Document preview" sandbox="" srcDoc={preview.html} className="h-[28rem] w-full rounded-lg border border-[#E1E5EB] bg-white" data-testid="os-tpl-preview" />}
      <div className="flex flex-wrap justify-end gap-2">
        {t.kind === "builtin" && <button type="button" className={btn} disabled={busy !== null || !company} onClick={() => run("preview")} data-testid="os-tpl-preview-btn">{busy === "preview" ? "Preparing…" : preview ? "Refresh preview" : "Preview"}</button>}
        <button type="button" className={btnPrimary} disabled={busy !== null || !canSave} onClick={() => run("save")} data-testid="os-tpl-save">{busy === "save" ? "Saving…" : "Save to Google Drive"}</button>
      </div>
      {t.kind === "builtin" && !preview && <p className={cn("text-xs", muted)}>Preview the document first; saving is available after you have looked at it.</p>}
    </div>
  );
}

function DynamicField({ f, value, onChange, error }: { f: TemplateField; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <Field label={`${f.label}${f.required ? "" : " (optional)"}`} hint={f.help}>
        {(id) => f.type === "textarea" ? <textarea id={id} className={cn(input, "min-h-24")} maxLength={f.maxLength} value={value} onChange={(e) => onChange(e.target.value)} />
          : f.type === "division" ? <DivisionSelect id={id} value={value} onChange={onChange} placeholder="Choose…" />
          : f.type === "person" ? <PersonSelect id={id} value={value} onChange={onChange} placeholder="Not linked" />
          : f.type === "select" ? <Select id={id} value={value} onChange={onChange} options={f.options ?? []} placeholder="Choose…" />
          : <input id={id} className={input} type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"} inputMode={f.type === "number" ? "numeric" : undefined}
              value={value} maxLength={f.maxLength} placeholder={f.placeholder} min={f.min} max={f.max} onChange={(e) => onChange(e.target.value)} />}
      </Field>
      {error && <p className="mt-1 text-xs text-[#A12D2F]" role="alert">{error}</p>}
    </div>
  );
}
