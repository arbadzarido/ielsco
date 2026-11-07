"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge, ErrorLine, Field, Select, Sheet, btn, btnDanger, btnPrimary, input, muted } from "@/components/os/ui";
import { DOC_TYPES, SENSITIVITIES } from "@/lib/os/meta";
import { COMPANY_LABEL, type CompanyCode, type OsDivision } from "@/lib/os/types";
import { coverageGaps, folderIdFrom, type FolderRoute } from "@/lib/os/routes";
import { dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";

// Admin → Drive folder routes. Founders see every route with its status and last access check, add or edit a route,
// approve, reject or retire it, check that Drive can actually reach its folder, and see which combinations no
// approved route covers. RLS limits writes to founders; the database stamps the approver. Routes only point at
// folders that already exist: nothing here creates, renames, moves or shares a Drive folder.

interface Route extends FolderRoute { note: string | null; approved_by: string | null; approved_at: string | null; access_checked_at: string | null; access_detail: string | null }
const COMPANIES: CompanyCode[] = ["HQ", "IEL", "ELC"];
const STATUSES = ["proposed", "approved", "rejected", "retired"] as const;
const TONE: Record<string, "green" | "amber" | "red" | "neutral"> = { approved: "green", proposed: "amber", rejected: "red", retired: "neutral" };

interface Draft { id?: string; company_code: string; division_id: string; doc_type: string; sensitivity: string; folder: string; folder_name: string; note: string }
const blank: Draft = { company_code: "IEL", division_id: "", doc_type: "", sensitivity: "Internal", folder: "", folder_name: "", note: "" };

export function RoutesAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [divisions, setDivisions] = useState<OsDivision[]>([]);
  const [health, setHealth] = useState<{ checks: { key: string; label: string; ok: boolean; detail: string }[] } | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, d] = await Promise.all([
      supabase.from("os_folder_routes").select("*").order("company_code").order("sensitivity").order("folder_name"),
      supabase.from("os_divisions").select("*").order("id"),
    ]);
    if (r.error) return setMsg({ ok: false, text: "Couldn't load the routes." });
    setRoutes((r.data as Route[]) ?? []);
    setDivisions((d.data as OsDivision[]) ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/os/api/admin/health").then((r) => (r.ok ? r.json() : null)).then(setHealth).catch(() => setHealth(null)); }, []);

  const divName = useCallback((id: string | null) => (id ? divisions.find((d) => d.id === id)?.name ?? id : "Any division"), [divisions]);
  const typeName = (code: string | null) => (code ? DOC_TYPES.find((t) => t.code === code)?.label ?? code : "Any type");
  const describe = (r: Route) => `${COMPANY_LABEL[r.company_code as CompanyCode] ?? r.company_code} · ${r.sensitivity} · ${divName(r.division_id)} · ${typeName(r.doc_type)}`;

  const shown = useMemo(() => (routes ?? []).filter((r) => filter === "all" || r.status === filter), [routes, filter]);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, (routes ?? []).filter((r) => r.status === s).length])), [routes]);
  const gaps = useMemo(() => coverageGaps(routes ?? [], COMPANIES, SENSITIVITIES), [routes]);

  const setStatus = async (r: Route, status: (typeof STATUSES)[number]) => {
    const verb = { approved: "Approve", rejected: "Reject", retired: "Retire", proposed: "Reopen" }[status];
    const consequence = status === "approved" ? `New documents for ${describe(r)} will be filed in “${r.folder_name}”.` : status === "proposed" ? "It goes back to waiting for approval." : "No new documents will be filed through it.";
    if (!confirm(`${verb} this route? ${consequence}`)) return;
    setBusy(r.id);
    // The database records who approved and when.
    const { error } = await supabase.from("os_folder_routes").update({ status }).eq("id", r.id);
    setBusy(null);
    setMsg(error ? { ok: false, text: error.code === "23505" ? "Another approved route already covers exactly this combination. Retire it first." : "Couldn't change the route." }
      : { ok: true, text: `Route ${status}. The change is in the audit log.` });
    load();
  };

  const check = async (r: Route) => {
    setBusy(r.id);
    const res = await fetch("/os/api/admin/routes/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: r.id }) }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    setMsg(res?.ok ? { ok: Boolean(j.ok), text: `${r.folder_name}: ${j.detail}` } : { ok: false, text: j.error ?? "Couldn't check the folder." });
    load();
  };

  const save = async () => {
    if (!draft) return;
    const folderId = folderIdFrom(draft.folder);
    if (!folderId) return setMsg({ ok: false, text: "Paste a Drive folder link or ID." });
    if (!draft.folder_name.trim()) return setMsg({ ok: false, text: "Give the folder a name." });
    const row = { company_code: draft.company_code, division_id: draft.division_id || null, doc_type: draft.doc_type || null, sensitivity: draft.sensitivity,
      drive_folder_id: folderId, folder_name: draft.folder_name.trim(), note: draft.note.trim() || null };
    setBusy("save");
    // A new route always starts as proposed; editing an approved route keeps it approved and re-stamps the approver.
    const { error } = draft.id ? await supabase.from("os_folder_routes").update(row).eq("id", draft.id) : await supabase.from("os_folder_routes").insert({ ...row, status: "proposed" });
    setBusy(null);
    if (error) return setMsg({ ok: false, text: error.code === "23505" ? "An approved route already covers exactly this combination." : "Couldn't save the route." });
    setDraft(null);
    setMsg({ ok: true, text: draft.id ? "Route saved. Check access again, since the folder may have changed." : "Route added as proposed. Check access, then approve it." });
    load();
  };

  const edit = (r: Route) => setDraft({ id: r.id, company_code: r.company_code, division_id: r.division_id ?? "", doc_type: r.doc_type ?? "", sensitivity: r.sensitivity, folder: r.drive_folder_id, folder_name: r.folder_name, note: r.note ?? "" });
  const problems = (health?.checks ?? []).filter((c) => (c.key === "drive" || c.key === "drive_write") && !c.ok);

  return (
    <div className="space-y-5" data-testid="os-routes-admin">
      <p className={muted}>Where new documents are filed. A document is only created when an <b>approved</b> route matches its company, sensitivity, division and type. Routes point at folders that already exist; the OS never creates, renames, moves or shares Drive folders.</p>

      {problems.length > 0 && (
        <div role="alert" className="rounded-lg border border-[#F1C9CA] bg-[#FDF2F2] px-3 py-2 text-sm text-[#A12D2F]" data-testid="os-routes-integration">
          {problems.map((p) => <p key={p.key}><b>{p.label}:</b> {p.detail}</p>)}
          <p className="mt-1"><Link className="underline" href="/os/admin?tab=health">Open Integration health</Link></p>
        </div>
      )}
      {msg && (msg.ok ? <p role="status" className="text-sm text-[#0B6E64]">{msg.text}</p> : <ErrorLine message={msg.text} />)}

      <section aria-labelledby="routes-gaps" className="rounded-xl border border-[#E6E9EE] bg-white p-4" data-testid="os-routes-gaps">
        <h3 id="routes-gaps" className="text-sm font-semibold text-[#1F2D3D]">Missing routes</h3>
        {routes === null ? <p className={muted}>Loading…</p> : gaps.length === 0 ? <p className="text-sm text-[#0B6E64]">Every company and sensitivity has an approved company-wide route.</p> : (
          <>
            <p className={cn(muted, "mb-2 text-sm")}>No approved company-wide route for these. Documents here can only be created where a narrower approved route exists.</p>
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
              {gaps.map((g) => (
                <li key={`${g.company}-${g.sensitivity}`} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{COMPANY_LABEL[g.company as CompanyCode]} · {g.sensitivity}</span>
                  <Badge tone={g.general === "proposed" ? "amber" : "red"}>{g.general === "proposed" ? "awaiting approval" : "no route"}</Badge>
                  {g.specific.length > 0 && <span className={cn(muted, "text-xs")}>{g.specific.length} narrower approved</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <Field label="Show">{(id) => <Select id={id} value={filter} onChange={setFilter} options={[{ value: "all", label: `All (${routes?.length ?? 0})` }, ...STATUSES.map((s) => ({ value: s, label: `${s[0].toUpperCase()}${s.slice(1)} (${counts[s] ?? 0})` }))]} className="w-52" />}</Field>
        <button type="button" className={btnPrimary} onClick={() => setDraft({ ...blank })}>Add route</button>
      </div>

      <ul className="space-y-2" data-testid="os-routes-list">
        {shown.map((r) => (
          <li key={r.id} className="rounded-xl border border-[#E6E9EE] bg-white p-3" data-testid="os-route-row">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-[#1F2D3D]"><a className="underline-offset-2 hover:underline" href={`https://drive.google.com/drive/folders/${r.drive_folder_id}`} target="_blank" rel="noreferrer">{r.folder_name}</a></p>
                <p className={cn(muted, "text-sm")}>{describe(r)}</p>
                {r.note && <p className={cn(muted, "text-xs")}>{r.note}</p>}
              </div>
              <Badge tone={TONE[r.status] ?? "neutral"}>{r.status}</Badge>
            </div>
            <p className={cn("mt-1 text-xs", r.access_ok === true ? "text-[#0B6E64]" : r.access_ok === false ? "text-[#A12D2F]" : "text-[#66768A]")} data-testid="os-route-access">
              {r.access_checked_at ? `${r.access_ok ? "Access OK" : "Access problem"}: ${r.access_detail ?? ""} (checked ${dateWib(r.access_checked_at)})` : "Access not checked yet."}
              {r.approved_at && ` · Approved ${dateWib(r.approved_at)}${r.approved_by ? ` by ${r.approved_by}` : ""}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={busy === r.id} onClick={() => check(r)}>Check access</button>
              <button type="button" className={btn} onClick={() => edit(r)}>Edit</button>
              {r.status !== "approved" && r.status !== "retired" && <button type="button" className={btnPrimary} disabled={busy === r.id} onClick={() => setStatus(r, "approved")}>Approve</button>}
              {r.status === "proposed" && <button type="button" className={btnDanger} disabled={busy === r.id} onClick={() => setStatus(r, "rejected")}>Reject</button>}
              {r.status === "approved" && <button type="button" className={btnDanger} disabled={busy === r.id} onClick={() => setStatus(r, "retired")}>Retire</button>}
              {(r.status === "rejected" || r.status === "retired") && <button type="button" className={btn} disabled={busy === r.id} onClick={() => setStatus(r, "proposed")}>Reopen as proposed</button>}
            </div>
          </li>
        ))}
        {routes !== null && shown.length === 0 && <li className={muted}>No routes with this status.</li>}
      </ul>

      <Sheet open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? "Edit route" : "Add route"}
        footer={<><button type="button" className={btn} onClick={() => setDraft(null)}>Cancel</button><button type="button" className={btnPrimary} disabled={busy === "save"} onClick={save}>Save</button></>}>
        {draft && (
          <div className="space-y-3">
            <Field label="Drive folder link or ID" hint="An existing folder. Open it in Drive and copy the address.">{(id) => <input id={id} className={input} value={draft.folder} onChange={(e) => setDraft({ ...draft, folder: e.target.value })} />}</Field>
            <Field label="Folder name">{(id) => <input id={id} className={input} value={draft.folder_name} onChange={(e) => setDraft({ ...draft, folder_name: e.target.value })} />}</Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Company">{(id) => <Select id={id} value={draft.company_code} onChange={(v) => setDraft({ ...draft, company_code: v })} options={COMPANIES.map((c) => ({ value: c, label: COMPANY_LABEL[c] }))} />}</Field>
              <Field label="Sensitivity">{(id) => <Select id={id} value={draft.sensitivity} onChange={(v) => setDraft({ ...draft, sensitivity: v })} options={SENSITIVITIES} />}</Field>
              <Field label="Division">{(id) => <Select id={id} value={draft.division_id} onChange={(v) => setDraft({ ...draft, division_id: v })} placeholder="Any division" options={divisions.map((d) => ({ value: d.id, label: d.name }))} />}</Field>
              <Field label="Document type">{(id) => <Select id={id} value={draft.doc_type} onChange={(v) => setDraft({ ...draft, doc_type: v })} placeholder="Any type" options={DOC_TYPES.map((t) => ({ value: t.code, label: t.label }))} />}</Field>
            </div>
            <Field label="Note">{(id) => <textarea id={id} className={input} rows={2} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />}</Field>
            {draft.id && <p className={cn(muted, "text-xs")}>Saving clears the last access check if the folder changed. An approved route stays approved and is stamped with you as approver.</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
