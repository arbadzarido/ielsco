"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Download } from "lucide-react";
import { btnSecondary, card, inputClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { dateTimeWib } from "@/lib/format";
import { divisions, roleById } from "@/data/careers/divisions";
import { CAMPAIGN_TASKS, TASK_STATUSES } from "@/data/careers/recruitment";

// Careers applications (2027 cohort). RLS limits rows and files to public.staff_roles admins; CVs and portfolios open
// through short-lived signed URLs from the private career-applications bucket. Instagram campaign tasks are checked by
// hand on Instagram, then recorded here per task (campaign_tasks) and overall (campaign_verification).
type App = {
  id: string; full_name: string; email: string; whatsapp: string; university: string; academic_year: number; division: string;
  role_id: string | null; instagram_url: string; linkedin_url: string; cv_path: string; portfolio_path: string | null;
  portfolio_url: string | null; motivation: string | null; status: string; campaign_verification: string; admin_notes: string | null; created_at: string;
  role_2_id: string | null; batch_year: number | null; campaign_tasks: Record<string, string> | null; user_id: string | null;
  submitted_at: string | null; updated_at: string; tasks_confirmed_at: string | null; privacy_accepted_at: string | null; declaration_accepted_at: string | null;
};
const STATUSES = ["submitted", "under_review", "invited", "shortlisted", "accepted", "reserve", "rejected", "withdrawn"];
const VERIFY = ["pending", "verified", "incomplete"];
const divisionTitle = (slug: string) => divisions.find((d) => d.slug === slug)?.title ?? slug;
const roleTitle = (id: string | null) => (id ? roleById(id)?.title ?? id : null);
const TASK_LABEL: Record<string, string> = { pending: "To check", verified: "Verified", not_found: "Not found" };

function csv(rows: App[]) {
  const cols: (keyof App)[] = ["created_at", "full_name", "email", "whatsapp", "university", "academic_year", "division", "role_id", "instagram_url", "linkedin_url", "portfolio_url", "status", "campaign_verification", "motivation", "admin_notes"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export function CareerApplications({ supabase }: { supabase: SupabaseClient }) {
  const [division, setDivision] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<App[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    let q = supabase.from("career_applications").select("*").eq("cohort", "2027").order("created_at", { ascending: false }).limit(1000);
    // A division matches the first choice (division) or the second choice (role_2_id in that division).
    if (division !== "all") q = q.or(`division.eq.${division},role_2_id.in.(${divisions.find((d) => d.slug === division)?.roles.map((r) => r.id).join(",") ?? ""})`);
    if (status !== "all") q = q.eq("status", status);
    q.then(({ data, error: e }) => { tasksRef.current = {}; setError(e?.message ?? null); setRows((data as App[]) ?? []); });
  }, [supabase, division, status]);
  useEffect(() => { reload(); }, [reload]);

  async function update(id: string, patch: Partial<App>) {
    const { error: e } = await supabase.from("career_applications").update(patch).eq("id", id);
    if (e) setError(e.message); else setRows((cur) => cur?.map((r) => (r.id === id ? { ...r, ...patch } : r)) ?? null);
  }
  // Per-task verification: changes are merged into the latest local map and saved one after another, so quick
  // successive changes on the same application never overwrite each other.
  const tasksRef = useRef<Record<string, Record<string, string>>>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  function setTask(r: App, key: string, value: string) {
    const next = { ...(tasksRef.current[r.id] ?? r.campaign_tasks ?? {}), [key]: value };
    tasksRef.current[r.id] = next;
    const all = CAMPAIGN_TASKS.map((x) => next[x.key] ?? "pending");
    const overall = all.every((x) => x === "verified") ? "verified" : all.some((x) => x === "not_found") ? "incomplete" : "pending";
    setRows((cur) => cur?.map((x) => (x.id === r.id ? { ...x, campaign_tasks: next, campaign_verification: overall } : x)) ?? null);
    queue.current = queue.current.then(() => update(r.id, { campaign_tasks: next, campaign_verification: overall }));
  }
  async function open(path: string) {
    const { data, error: e } = await supabase.storage.from("career-applications").createSignedUrl(path, 300);
    if (e || !data) return setError(e?.message ?? "Couldn't open the file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  function exportCsv() {
    if (!rows?.length) return;
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `career-applications-2027-${division}-${status}.csv` });
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div data-testid="admin-career-applications">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={division} onChange={(e) => setDivision(e.target.value)} className={cn(inputClass, "w-auto py-1.5 text-sm")} aria-label="Division">
          <option value="all">All divisions</option>{divisions.map((d) => <option key={d.slug} value={d.slug}>{d.title}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(inputClass, "w-auto py-1.5 text-sm")} aria-label="Status">
          <option value="all">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <span className="text-sm text-[#2F4157]/70">{rows ? `${rows.length} application${rows.length === 1 ? "" : "s"}` : "Loading…"}</span>
        <button type="button" onClick={exportCsv} disabled={!rows?.length} className={cn(btnSecondary, "ml-auto py-1.5 text-sm")}><Download size={14} aria-hidden="true" /> CSV</button>
      </div>
      {error && <p className="mb-3 text-[#A23B3D]">{error}</p>}
      {rows?.length === 0 && <p className="text-[#2F4157]/70">No applications yet.</p>}
      <ul className="space-y-3">
        {rows?.map((r) => (
          <li key={r.id} className={cn(card, "p-4 text-sm")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-base font-semibold text-[#1A2534]">{r.full_name} · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a></p>
                <p className="mt-0.5 text-[#2F4157]/70">{divisionTitle(r.division)}{roleTitle(r.role_id) ? ` · 1st: ${roleTitle(r.role_id)}` : ""}{r.role_2_id ? ` · 2nd: ${roleTitle(r.role_2_id)} (${divisionTitle(roleById(r.role_2_id)?.division ?? "")})` : ""} · {r.university} · year {r.academic_year}{r.batch_year ? ` (batch ${r.batch_year})` : ""} · <a className="underline" href={`https://wa.me/${r.whatsapp.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer">{r.whatsapp}</a> · {dateTimeWib(r.submitted_at ?? r.created_at)}{r.user_id ? "" : " · no account"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value })} className={cn(inputClass, "w-auto py-1.5 text-sm")} aria-label="Application status">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
                <select value={r.campaign_verification} onChange={(e) => update(r.id, { campaign_verification: e.target.value })} className={cn(inputClass, "w-auto py-1.5 text-sm")} aria-label="Instagram tasks">
                  {VERIFY.map((s) => <option key={s} value={s}>IG tasks: {s}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className={cn(tag, "underline")} href={r.instagram_url} target="_blank" rel="noopener noreferrer">Instagram</a>
              <a className={cn(tag, "underline")} href={r.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <button type="button" className={cn(tag, "cursor-pointer underline")} onClick={() => open(r.cv_path)}>CV (PDF)</button>
              {r.portfolio_path && <button type="button" className={cn(tag, "cursor-pointer underline")} onClick={() => open(r.portfolio_path!)}>Portfolio (PDF)</button>}
              {r.portfolio_url && <a className={cn(tag, "underline")} href={r.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio link</a>}
            </div>
            <div className="mt-3" data-testid="admin-campaign-tasks">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2F4157]/60">Instagram tasks (check on the profile, then record)</p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {CAMPAIGN_TASKS.map((t) => {
                  const v = r.campaign_tasks?.[t.key] ?? "pending";
                  return (
                    <li key={t.key} className="flex items-center justify-between gap-2 rounded-lg border border-[#E3E7ED] px-2.5 py-1.5">
                      <span className="min-w-0 truncate text-[#2F4157]">{t.title}</span>
                      <select value={v} aria-label={`${t.title}: verification`} data-testid={`admin-task-${t.key}`}
                        onChange={(e) => setTask(r, t.key, e.target.value)}
                        className={cn("rounded-md border border-[#E3E7ED] bg-white px-1.5 py-0.5 text-xs", v === "verified" ? "text-[#2D7A58]" : v === "not_found" ? "text-[#A23B3D]" : "text-[#2F4157]")}>
                        {TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_LABEL[s]}</option>)}
                      </select>
                    </li>
                  );
                })}
              </ul>
              {(r.privacy_accepted_at || r.declaration_accepted_at) && <p className="mt-1.5 text-xs text-[#2F4157]/60">Privacy notice and declaration accepted {dateTimeWib(r.declaration_accepted_at ?? r.privacy_accepted_at!)}</p>}
            </div>
            {r.motivation && <p className="mt-3 whitespace-pre-line text-[#2F4157]">{r.motivation}</p>}
            <label className="mt-3 block">
              <span className="sr-only">Internal notes</span>
              <textarea defaultValue={r.admin_notes ?? ""} maxLength={4000} rows={2} placeholder="Internal notes (saved when you leave the field)"
                onBlur={(e) => { if ((e.target.value || null) !== r.admin_notes) update(r.id, { admin_notes: e.target.value || null }); }} className={cn(inputClass, "text-sm")} />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
