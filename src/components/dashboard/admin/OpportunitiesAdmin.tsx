"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { CATEGORY_LABEL, FUNDING_LABEL, LEVEL_LABEL, OPP_COLUMNS, type Opportunity } from "@/lib/opportunities";

// Staff editor for public.opportunities (RLS: admins only). Rules shown in the form: only confirmed dates go in
// "deadline"; "verified" means someone checked the current call on the official page and filled the date it was checked.
type Row = Opportunity & { status: "draft" | "published" | "archived" };
const blank = (): Partial<Row> => ({ slug: "", title: "", organizer: "", category: "scholarship", summary: "", eligibility: "", regions: [], open_to: "",
  study_level: "any", funding: "unknown", deadline: null, deadline_note: "", official_url: "https://", documents: [], verification: "unverified",
  checked_on: null, is_iels_program: false, featured: false, status: "draft" });

export function OpportunitiesAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edit, setEdit] = useState<Partial<Row> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => supabase.from("opportunities").select(`${OPP_COLUMNS}, status`).order("updated_at", { ascending: false })
    .then(({ data, error }) => { if (error) setMsg(error.message); setRows((data as Row[]) ?? []); }), [supabase]);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const f = new FormData(e.currentTarget);
    const list = (k: string) => String(f.get(k) ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const row = {
      slug: String(f.get("slug")).trim(), title: String(f.get("title")).trim(), organizer: String(f.get("organizer")).trim(),
      category: f.get("category"), summary: String(f.get("summary")).trim(), eligibility: String(f.get("eligibility") ?? "").trim() || null,
      regions: list("regions").map((r) => (r.length === 2 ? r.toUpperCase() : r.toLowerCase())), open_to: String(f.get("open_to") ?? "").trim() || null,
      study_level: f.get("study_level"), funding: f.get("funding"), deadline: String(f.get("deadline") ?? "") || null,
      deadline_note: String(f.get("deadline_note") ?? "").trim() || null, official_url: String(f.get("official_url")).trim(), documents: list("documents"),
      verification: f.get("verification"), checked_on: String(f.get("checked_on") ?? "") || null, is_iels_program: f.get("is_iels_program") === "on",
      featured: f.get("featured") === "on", status: f.get("status"), updated_at: new Date().toISOString(),
    };
    if (row.verification === "verified" && !row.checked_on) { setMsg("A verified listing needs the date you checked it."); return; }
    const q = edit.id ? supabase.from("opportunities").update(row).eq("id", edit.id) : supabase.from("opportunities").insert(row);
    const { error } = await q;
    if (error) { setMsg(error.message); return; }
    setMsg("Saved."); setEdit(null); load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14" data-testid="admin-opportunities">
      <PageHeader title="Opportunity board" description="Listings on /opportunities. Drafts are visible only to staff.">
        <button type="button" className={btnPrimary} onClick={() => { setEdit(blank()); setMsg(null); }}><Plus size={16} aria-hidden="true" /> New listing</button>
      </PageHeader>
      {msg && <p className="mb-6 rounded-xl bg-[#F7F8FA] px-4 py-3 text-base text-[#2F4157]" role="status">{msg}</p>}

      {edit && (
        <form onSubmit={save} className={cn(card, "mb-8 space-y-4 p-6")} data-testid="opportunity-form" key={edit.id ?? "new"}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className={labelClass}>Title</span><input name="title" required minLength={3} maxLength={160} defaultValue={edit.title} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Slug (URL)</span><input name="slug" required pattern="[a-z0-9-]{3,80}" defaultValue={edit.slug} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Organizer</span><input name="organizer" required defaultValue={edit.organizer} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Official URL</span><input name="official_url" type="url" required pattern="https://.*" defaultValue={edit.official_url} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Type</span><select name="category" defaultValue={edit.category} className={inputClass}>{Object.entries(CATEGORY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Funding</span><select name="funding" defaultValue={edit.funding} className={inputClass}>{Object.entries(FUNDING_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Level</span><select name="study_level" defaultValue={edit.study_level ?? "any"} className={inputClass}>{Object.entries(LEVEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Where (ISO codes, comma-separated, or multiple / online)</span><input name="regions" defaultValue={(edit.regions ?? []).join(", ")} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Who can apply (in words)</span><input name="open_to" maxLength={200} defaultValue={edit.open_to ?? ""} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Deadline (only if confirmed on the official page)</span><input name="deadline" type="date" defaultValue={edit.deadline ?? ""} className={inputClass} /></label>
          </div>
          <label className="block"><span className={labelClass}>Summary</span><textarea name="summary" required minLength={10} maxLength={600} rows={3} defaultValue={edit.summary} className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Eligibility summary (optional)</span><textarea name="eligibility" maxLength={1200} rows={3} defaultValue={edit.eligibility ?? ""} className={inputClass} /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block"><span className={labelClass}>Date note</span><input name="deadline_note" maxLength={200} defaultValue={edit.deadline_note ?? ""} placeholder="Dates change every cycle: check the official page." className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Documents (comma-separated)</span><input name="documents" defaultValue={(edit.documents ?? []).join(", ")} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Verification</span>
              <select name="verification" defaultValue={edit.verification} className={inputClass}>
                <option value="unverified">Unverified</option><option value="link_checked">Official link checked</option><option value="verified">Details verified for this cycle</option>
              </select></label>
            <label className="block"><span className={labelClass}>Checked on</span><input name="checked_on" type="date" defaultValue={edit.checked_on ?? ""} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Status</span>
              <select name="status" defaultValue={edit.status} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            <div className="flex items-end gap-6 pb-3 text-base">
              <label className="flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={edit.featured} className="h-4 w-4" /> Featured</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="is_iels_program" defaultChecked={edit.is_iels_program} className="h-4 w-4" /> IELS program</label>
            </div>
          </div>
          <div className="flex gap-3"><button type="submit" className={btnPrimary}><Save size={16} aria-hidden="true" /> Save</button><button type="button" onClick={() => setEdit(null)} className={btnSecondary}>Cancel</button></div>
        </form>
      )}

      <ul className="space-y-3">
        {(rows ?? []).map((r) => (
          <li key={r.id} className={cn(card, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
            <div className="min-w-0">
              <p className="font-semibold text-[#1A2534]">{r.title}</p>
              <div className="mt-1 flex flex-wrap gap-1.5"><span className={tag}>{r.status}</span><span className={tag}>{r.verification}</span>{r.featured && <span className={tag}>featured</span>}{r.deadline && <span className={tag}>deadline {r.deadline}</span>}</div>
            </div>
            <button type="button" className={btnSecondary} onClick={() => { setEdit(r); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
