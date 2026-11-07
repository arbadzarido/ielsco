"use client";

// The "new document" sheet: from a Master Template (copied in Drive), by uploading a file, or by registering a file
// that already exists in Drive. The server routes the file to the approved folder and numbers it; this form never
// talks to Drive directly.
import { useEffect, useState } from "react";
import { CompanySelect, DivisionSelect, useDefaultCompany } from "./pickers";
import { ErrorLine, Field, Select, Sheet, btn, btnPrimary, input, muted } from "./ui";
import { DOC_TYPES, SENSITIVITIES } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

export type DocRow = {
  id: string; reference_number: string | null; title: string; company_code: string; division_id: string | null; doc_type: string;
  category: string | null; status: string; sensitivity: string; owner_person_id: string | null; drive_url: string | null; updated_at: string;
  drift_findings: { code: string; severity: string; message: string }[]; drive_checked_at: string | null;
};
export const DOC_COLUMNS = "id, reference_number, title, company_code, division_id, doc_type, category, status, sensitivity, owner_person_id, drive_url, updated_at, drift_findings, drive_checked_at";

type Template = { id: string; name: string; mimeType: string };
export type NewDocDefaults = { company_code?: string; division_id?: string; link_type?: string; link_id?: string };

export function NewDocumentSheet({ open, onClose, onCreated, defaults }: { open: boolean; onClose: () => void; onCreated: (id: string) => void; defaults?: NewDocDefaults }) {
  const defCompany = useDefaultCompany();
  const [mode, setMode] = useState<"template" | "upload" | "register">("template");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState(defaults?.company_code ?? defCompany);
  const [division, setDivision] = useState(defaults?.division_id ?? "");
  const [docType, setDocType] = useState("");
  const [sensitivity, setSensitivity] = useState("Internal");
  const [category, setCategory] = useState("");
  const [template, setTemplate] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [tplError, setTplError] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || templates) return;
    fetch("/os/api/documents/templates").then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (r.ok) setTemplates(j.templates ?? []); else { setTemplates([]); setTplError(j.error ?? "Templates couldn't be loaded."); }
    }).catch(() => { setTemplates([]); setTplError("Templates couldn't be loaded."); });
  }, [open, templates]);
  useEffect(() => { if (tplError && mode === "template") setMode("register"); }, [tplError, mode]);

  // A template named "HQ-TPL — Meeting Minutes (TPL-D05)" suggests its company; the type is chosen by the person.
  function pickTemplate(id: string) {
    setTemplate(id);
    const t = templates?.find((x) => x.id === id);
    if (t && !title) setTitle(t.name.replace(/^[A-Z]+-TPL\s+—\s+/, "").replace(/\s*\(TPL-[A-Z0-9]+\)\s*$/, ""));
  }

  async function submit() {
    setErr(null); setBusy(true);
    const f = new FormData();
    Object.entries({ mode, title, company_code: company, division_id: division, doc_type: docType, sensitivity, category, template_file_id: template, drive_url: driveUrl, link_type: defaults?.link_type ?? "", link_id: defaults?.link_id ?? "" })
      .forEach(([k, v]) => f.set(k, v));
    if (mode === "upload" && file) f.set("file", file);
    try {
      const r = await fetch("/os/api/documents/create", { method: "POST", body: f });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error ?? "The document couldn't be created."); else onCreated(j.id);
    } catch { setErr("Couldn't reach the server. Check your connection and try again."); }
    setBusy(false);
  }

  const ready = title.trim() && docType && (mode !== "template" || template) && (mode !== "upload" || file) && (mode !== "register" || driveUrl);
  return (
    <Sheet open={open} onClose={onClose} title="New document"
      footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} onClick={submit} disabled={!ready || busy} data-testid="os-doc-save">{busy ? "Working…" : mode === "register" ? "Register" : "Create in Drive"}</button></>}>
      <div className="space-y-4">
        <ErrorLine message={err} />
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-[#3A4B60]">How</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F0F2F5] p-1 text-sm" role="radiogroup">
            {([["template", "From template"], ["upload", "Upload"], ["register", "Existing file"]] as const).map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                disabled={k !== "register" && !!tplError}
                className={cn("min-h-9 rounded-md px-2 font-medium disabled:opacity-40", mode === k ? "bg-white shadow-sm" : "text-[#3A4B60]")}>{l}</button>
            ))}
          </div>
          {tplError && <p className={cn("mt-1 text-xs", muted)}>{tplError} You can still register a file that already exists in Drive.</p>}
        </fieldset>
        {mode === "template" && (
          <Field label="Master template" hint="Templates are copied, never edited. The copy goes into the approved folder for this company and sensitivity.">
            {(id) => <Select id={id} value={template} onChange={pickTemplate} placeholder={templates ? "Choose a template…" : "Loading…"} options={(templates ?? []).map((t) => ({ value: t.id, label: t.name }))} />}
          </Field>
        )}
        {mode === "upload" && (
          <Field label="File" hint="Up to 25 MB. It's uploaded to the approved Drive folder.">
            {(id) => <input id={id} type="file" className={input} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />}
          </Field>
        )}
        {mode === "register" && (
          <Field label="Google Docs or Drive link" hint="The file stays where it is. Drive's own sharing still decides who can open it.">
            {(id) => <input id={id} className={input} value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://docs.google.com/…" inputMode="url" />}
          </Field>
        )}
        <Field label="Title">{(id) => <input id={id} className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} data-testid="os-doc-title" />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">{(id) => <CompanySelect id={id} value={company} onChange={setCompany} />}</Field>
          <Field label="Division">{(id) => <DivisionSelect id={id} value={division} onChange={setDivision} />}</Field>
          <Field label="Type">{(id) => <Select id={id} value={docType} onChange={setDocType} placeholder="Choose…" options={DOC_TYPES.map((t) => ({ value: t.code, label: `${t.code} · ${t.label}` }))} />}</Field>
          <Field label="Sensitivity">{(id) => <Select id={id} value={sensitivity} onChange={setSensitivity} options={SENSITIVITIES} />}</Field>
        </div>
        <Field label="Category" hint="Optional, for example Governance, Programs or Finance.">{(id) => <input id={id} className={input} value={category} onChange={(e) => setCategory(e.target.value)} />}</Field>
        {mode !== "register" && <p className={cn("text-xs", muted)}>A reference number like {company || "IEL"}-{docType || "SOP"}-{new Date().getFullYear()}-001 is assigned and used in the file name.</p>}
      </div>
    </Sheet>
  );
}
