"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Plus, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { countryName, EMPLOYMENT_LABEL, JOB_COLUMNS, PARTNER_COLUMNS, STATUS_LABEL, type ProfessionalOpportunity, type RecruitmentPartner } from "@/lib/professional/model";

// Staff editor for public.professional_opportunities (RLS: admins only). A new country, industry or partner is just a
// value here; the public filters pick it up automatically. Lists are one item per line. Rules: copy figures only from
// the partner's official material, and put any disagreement between sources in "Confirm with partner" notes.
type Row = Omit<ProfessionalOpportunity, "partner"> & { publication: "draft" | "published" | "archived" };
const blank = (partner = ""): Partial<Row> => ({ slug: "", title: "", country_code: "", city: "", industry: "", positions: [], employment_type: "contract", summary: "",
  description: "", responsibilities: [], requirements: [], gender: "any", age_min: null, age_max: null, experience: "", salary_min: null, salary_max: null,
  salary_currency: "", salary_period: "month", salary_status: "to_confirm", salary_note: "", benefits: [], working_hours: "", contract_duration: "", openings: null,
  location_note: "", documents: [], confirm_notes: [], partner_id: partner, application_url: null, application_instructions: "", status: "open", publication: "draft", featured: false });

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;
const num = (v: FormDataEntryValue | null) => (String(v ?? "").trim() === "" ? null : Number(v));

// Partner contact details used by every listing's "official channel" buttons (website, WhatsApp as +<digits>, email).
function PartnerEditor({ supabase, partners, onSaved }: { supabase: SupabaseClient; partners: RecruitmentPartner[]; onSaved: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function save(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("recruitment_partners").update({
      name: String(f.get("name")).trim(), website_url: text(f.get("website_url")), email: text(f.get("email")), whatsapp: text(f.get("whatsapp")),
      phone: text(f.get("phone")), about: text(f.get("about")),
    }).eq("id", id);
    setMsg(error ? error.message : "Partner saved."); if (!error) onSaved();
  }
  if (!partners.length) return null;
  return (
    <details className={cn(card, "mb-8 p-5")}>
      <summary className="cursor-pointer text-base font-semibold text-[#1A2534]">Recruitment partners ({partners.length})</summary>
      {msg && <p className="mt-3 text-sm text-[#2F4157]" role="status">{msg}</p>}
      {partners.map((p) => (
        <form key={p.id} onSubmit={(e) => save(p.id, e)} className="mt-4 grid gap-3 border-t border-[#E3E7ED] pt-4 md:grid-cols-2">
          <label className="block"><span className={labelClass}>Name</span><input name="name" required defaultValue={p.name} className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Official website (https://, blank = none)</span><input name="website_url" type="url" pattern="https://.*" defaultValue={p.website_url ?? ""} className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Email</span><input name="email" type="email" defaultValue={p.email ?? ""} className={inputClass} /></label>
          <label className="block"><span className={labelClass}>WhatsApp (+ and digits, e.g. +6282125508988)</span><input name="whatsapp" pattern="\+[0-9]{8,16}" defaultValue={p.whatsapp ?? ""} className={inputClass} /></label>
          <label className="block"><span className={labelClass}>Phone (as written)</span><input name="phone" maxLength={80} defaultValue={p.phone ?? ""} className={inputClass} /></label>
          <label className="block md:col-span-2"><span className={labelClass}>About (shown on listings)</span><textarea name="about" rows={2} maxLength={1500} defaultValue={p.about ?? ""} className={inputClass} /></label>
          <div><button type="submit" className={btnSecondary}><Save size={16} aria-hidden="true" /> Save partner</button></div>
        </form>
      ))}
    </details>
  );
}

export function ProfessionalAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [partners, setPartners] = useState<RecruitmentPartner[]>([]);
  const [edit, setEdit] = useState<Partial<Row> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [{ data, error }, { data: p }] = await Promise.all([
      supabase.from("professional_opportunities").select(`${JOB_COLUMNS}, publication`).order("updated_at", { ascending: false }),
      supabase.from("recruitment_partners").select(PARTNER_COLUMNS).order("name"),
    ]);
    if (error) setMsg(error.message);
    setRows((data as Row[]) ?? []);
    setPartners((p as RecruitmentPartner[]) ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    const f = new FormData(e.currentTarget);
    const row = {
      slug: String(f.get("slug")).trim(), title: String(f.get("title")).trim(), country_code: String(f.get("country_code")).trim().toUpperCase(),
      city: text(f.get("city")), industry: String(f.get("industry")).trim(), positions: lines(f.get("positions")), employment_type: f.get("employment_type"),
      summary: String(f.get("summary")).trim(), description: text(f.get("description")), responsibilities: lines(f.get("responsibilities")),
      requirements: lines(f.get("requirements")), gender: f.get("gender"), age_min: num(f.get("age_min")), age_max: num(f.get("age_max")),
      experience: text(f.get("experience")), salary_min: num(f.get("salary_min")), salary_max: num(f.get("salary_max")),
      salary_currency: text(f.get("salary_currency"))?.toUpperCase() ?? null, salary_period: f.get("salary_period"), salary_status: f.get("salary_status"),
      salary_note: text(f.get("salary_note")), benefits: lines(f.get("benefits")), working_hours: text(f.get("working_hours")),
      contract_duration: text(f.get("contract_duration")), openings: num(f.get("openings")), location_note: text(f.get("location_note")),
      documents: lines(f.get("documents")), confirm_notes: lines(f.get("confirm_notes")), partner_id: f.get("partner_id"),
      application_url: text(f.get("application_url")), application_instructions: text(f.get("application_instructions")), status: f.get("status"),
      publication: f.get("publication"), featured: f.get("featured") === "on",
    };
    const q = edit.id ? supabase.from("professional_opportunities").update(row).eq("id", edit.id) : supabase.from("professional_opportunities").insert(row);
    const { error } = await q;
    if (error) { setMsg(error.message); return; }
    setMsg("Saved."); setEdit(null); load();
  }

  const field = (name: keyof Row, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block"><span className={labelClass}>{label}</span>
      <input name={name} defaultValue={(edit?.[name] as string | number | null | undefined) ?? ""} className={inputClass} {...props} /></label>
  );
  const area = (name: keyof Row, label: string, rows = 3) => (
    <label className="block"><span className={labelClass}>{label}</span>
      <textarea name={name} rows={rows} defaultValue={Array.isArray(edit?.[name]) ? (edit?.[name] as string[]).join("\n") : ((edit?.[name] as string | null) ?? "")} className={inputClass} /></label>
  );

  return (
    <div data-testid="admin-professional">
      <PageHeader title="International jobs" description="Listings on /opportunities (Professional). Drafts are visible only to staff.">
        <button type="button" className={btnPrimary} onClick={() => { setEdit(blank(partners[0]?.id)); setMsg(null); }} disabled={!partners.length}><Plus size={16} aria-hidden="true" /> New job listing</button>
      </PageHeader>
      {msg && <p className="mb-6 rounded-xl bg-[#F7F8FA] px-4 py-3 text-base text-[#2F4157]" role="status">{msg}</p>}

      {edit && (
        <form onSubmit={save} className={cn(card, "mb-8 space-y-4 p-6")} key={edit.id ?? "new"} data-testid="professional-form">
          <div className="grid gap-4 md:grid-cols-3">
            {field("title", "Job title", { required: true, minLength: 3, maxLength: 120 })}
            {field("slug", "Slug (URL)", { required: true, pattern: "[a-z0-9-]{3,80}" })}
            <label className="block"><span className={labelClass}>Recruitment partner</span>
              <select name="partner_id" required defaultValue={edit.partner_id} className={inputClass}>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            {field("country_code", "Country (ISO code, e.g. AL)", { required: true, pattern: "[A-Za-z]{2}", maxLength: 2 })}
            {field("city", "City (blank = to be confirmed)")}
            {field("industry", "Industry (e.g. Hospitality & Tourism)", { required: true, maxLength: 60 })}
            <label className="block"><span className={labelClass}>Employment type</span>
              <select name="employment_type" defaultValue={edit.employment_type} className={inputClass}>{Object.entries(EMPLOYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Open to</span>
              <select name="gender" defaultValue={edit.gender} className={inputClass}><option value="any">Men and women</option><option value="female">Women</option><option value="male">Men</option></select></label>
            <div className="grid grid-cols-2 gap-3">{field("age_min", "Age from", { type: "number", min: 15, max: 80 })}{field("age_max", "Age to", { type: "number", min: 15, max: 80 })}</div>
          </div>
          <label className="block"><span className={labelClass}>Summary (card text)</span><textarea name="summary" required minLength={10} maxLength={400} rows={2} defaultValue={edit.summary} className={inputClass} /></label>
          {area("description", "Overview")}
          <div className="grid gap-4 md:grid-cols-2">
            {area("positions", "Positions (one per line)")}
            {area("responsibilities", "Responsibilities (one per line; leave empty if the source lists none)")}
            {area("requirements", "Requirements (one per line)")}
            {area("benefits", "Benefits (one per line; first three show on the card)")}
          </div>
          {field("experience", "Experience")}
          <div className="grid gap-4 md:grid-cols-5">
            {field("salary_min", "Salary from", { type: "number", min: 0, step: "any" })}
            {field("salary_max", "Salary to", { type: "number", min: 0, step: "any" })}
            {field("salary_currency", "Currency (ISO, e.g. ALL)", { maxLength: 3 })}
            <label className="block"><span className={labelClass}>Per</span>
              <select name="salary_period" defaultValue={edit.salary_period} className={inputClass}>{["hour", "day", "week", "month", "year"].map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Salary status</span>
              <select name="salary_status" defaultValue={edit.salary_status} className={inputClass}><option value="stated">Stated by partner</option><option value="to_confirm">To be confirmed</option><option value="not_stated">Not stated</option></select></label>
          </div>
          {field("salary_note", "Salary note (sources, what to confirm)")}
          <div className="grid gap-4 md:grid-cols-3">
            {field("contract_duration", "Contract")}
            {field("working_hours", "Working hours")}
            {field("openings", "Places (optional)", { type: "number", min: 1 })}
          </div>
          {area("location_note", "Location and country note", 2)}
          <div className="grid gap-4 md:grid-cols-2">
            {area("documents", "Documents the partner asks for (one per line)")}
            {area("confirm_notes", "Confirm with partner (one per line: conflicts or gaps between sources)")}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {field("application_url", "Official application URL (optional, https://; else the partner website)", { type: "url", pattern: "https://.*" })}
            {field("application_instructions", "How to apply officially")}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block"><span className={labelClass}>Opportunity status</span>
              <select name="status" defaultValue={edit.status} className={inputClass}>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="block"><span className={labelClass}>Publication</span>
              <select name="publication" defaultValue={edit.publication} className={inputClass}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
            <label className="flex items-end gap-2 pb-3 text-base"><input type="checkbox" name="featured" defaultChecked={edit.featured} className="h-4 w-4" /> Featured (landing page)</label>
          </div>
          <div className="flex gap-3"><button type="submit" className={btnPrimary}><Save size={16} aria-hidden="true" /> Save</button><button type="button" onClick={() => setEdit(null)} className={btnSecondary}>Cancel</button></div>
        </form>
      )}

      <PartnerEditor supabase={supabase} partners={partners} onSaved={load} />

      <ul className="space-y-3">
        {(rows ?? []).map((r) => (
          <li key={r.id} className={cn(card, "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between")}>
            <div className="min-w-0">
              <p className="font-semibold text-[#1A2534]">{r.title} · {countryName(r.country_code)}{r.city ? `, ${r.city}` : ""}</p>
              <div className="mt-1 flex flex-wrap gap-1.5"><span className={tag}>{r.publication}</span><span className={tag}>{STATUS_LABEL[r.status]}</span><span className={tag}>{r.industry}</span>{r.featured && <span className={tag}>featured</span>}{r.salary_status === "to_confirm" && <span className={tag}>salary to confirm</span>}</div>
            </div>
            <button type="button" className={btnSecondary} onClick={() => { setEdit(r); setMsg(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
