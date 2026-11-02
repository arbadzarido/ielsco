"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FileText, Mail } from "lucide-react";
import { btnSecondary, card, inputClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { dateTimeWib } from "@/lib/format";
import { countryName } from "@/lib/professional/model";

// Staff inbox for expressions of interest in professional listings (RLS: admins only). "Forward" opens an email to the
// listing's recruitment partner with the person's details; mark the row Forwarded once it's sent.
type Interest = {
  id: string; opportunity_title: string; country_code: string; partner_id: string | null; full_name: string; email: string; whatsapp: string;
  country_of_interest: string; position: string; statement: string; occupation: string | null; experience: string | null; linkedin_url: string | null;
  cv_path: string | null; preferred_contact: string; source: string; status: string; admin_notes: string | null; created_at: string;
};
type Partner = { id: string; name: string; email: string | null };

export function OpportunityInterests({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<Interest[] | null>(null);
  const [partners, setPartners] = useState<Record<string, Partner>>({});
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    let q = supabase.from("opportunity_interests").select("id, opportunity_title, country_code, partner_id, full_name, email, whatsapp, country_of_interest, position, statement, occupation, experience, linkedin_url, cv_path, preferred_contact, source, status, admin_notes, created_at")
      .order("created_at", { ascending: false }).limit(300);
    if (status !== "all") q = q.eq("status", status);
    const [{ data, error: e }, { data: p }] = await Promise.all([q, supabase.from("recruitment_partners").select("id, name, email")]);
    setError(e?.message ?? null);
    setRows((data as Interest[]) ?? []);
    setPartners(Object.fromEntries(((p as Partner[]) ?? []).map((x) => [x.id, x])));
  }, [supabase, status]);
  useEffect(() => { load(); }, [load]);

  async function update(id: string, patch: Partial<Interest>) {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);
    const { error: e } = await supabase.from("opportunity_interests").update(patch).eq("id", id);
    if (e) setError(e.message);
  }
  async function openCv(path: string) {
    const { data, error: e } = await supabase.storage.from("opportunity-interest-cvs").createSignedUrl(path, 300);
    if (e || !data) { setError(e?.message ?? "Couldn't open the CV."); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  }
  const forward = (r: Interest) => {
    const p = r.partner_id ? partners[r.partner_id] : null;
    const subject = `Candidate interest via IELSco: ${r.opportunity_title} (${countryName(r.country_code)})`;
    const body = `Hello ${p?.name ?? ""},\n\nThis person expressed interest in "${r.opportunity_title}" through IELSco and agreed to their details being shared with you.\n\nName: ${r.full_name}\nEmail: ${r.email}\nWhatsApp: ${r.whatsapp}\nPrefers: ${r.preferred_contact}\nPosition: ${r.position}\n${r.occupation ? `Current occupation: ${r.occupation}\n` : ""}${r.linkedin_url ? `LinkedIn: ${r.linkedin_url}\n` : ""}\n${r.statement}\n${r.experience ? `\nExperience:\n${r.experience}\n` : ""}\nBest regards,\nIELSco careers team`;
    return `mailto:${p?.email ?? ""}?cc=careers@ielsco.com&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div data-testid="admin-interests">
      <div className="mb-4 flex flex-wrap gap-2">{["all", "new", "forwarded", "contacted", "closed"].map((k) => (
        <button key={k} type="button" onClick={() => setStatus(k)} className={cn(tag, "cursor-pointer", status === k && "bg-[#2F4157] text-white")}>{k}</button>))}</div>
      <p className="mb-4 text-sm text-[#2F4157]/70">Expressions of interest, not applications. Share details only with the listing&apos;s partner (the person consented to that), never elsewhere.</p>
      {error && <p className="mb-3 text-[#A23B3D]" role="alert">{error}</p>}
      {rows?.length === 0 && <p className="text-[#2F4157]/70">No expressions of interest yet.</p>}
      <ul className="space-y-3">
        {rows?.map((r) => (
          <li key={r.id} className={cn(card, "p-4 text-sm")} data-testid={`interest-${r.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-[#1A2534]">{r.full_name} · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a> · {r.whatsapp}</p>
              <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value })} className={cn(inputClass, "w-auto py-1.5 text-sm")} aria-label="Status">
                <option value="new">New</option><option value="forwarded">Forwarded to partner</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
              </select>
            </div>
            <p className="mt-1 text-[#2F4157]/70">{r.opportunity_title} ({countryName(r.country_code)}) · {r.position} · wants {r.country_of_interest} · prefers {r.preferred_contact} · {r.source} · {dateTimeWib(r.created_at)}</p>
            {r.occupation && <p className="mt-1 text-[#2F4157]/70">Now: {r.occupation}</p>}
            <p className="mt-2 whitespace-pre-line text-[#2F4157]">{r.statement}</p>
            {r.experience && <p className="mt-2 whitespace-pre-line text-[#2F4157]/80"><strong>Experience:</strong> {r.experience}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={forward(r)} className={cn(btnSecondary, "py-1.5 text-sm")}><Mail size={14} aria-hidden="true" /> Forward to partner</a>
              {r.cv_path && <button type="button" onClick={() => openCv(r.cv_path!)} className={cn(btnSecondary, "py-1.5 text-sm")}><FileText size={14} aria-hidden="true" /> CV</button>}
              {r.linkedin_url && <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#577E90] underline">LinkedIn</a>}
            </div>
            <input defaultValue={r.admin_notes ?? ""} maxLength={4000} placeholder="Internal notes" aria-label="Internal notes"
              onBlur={(e) => e.target.value !== (r.admin_notes ?? "") && update(r.id, { admin_notes: e.target.value })} className={cn(inputClass, "mt-3 py-2 text-sm")} />
          </li>
        ))}
      </ul>
    </div>
  );
}
