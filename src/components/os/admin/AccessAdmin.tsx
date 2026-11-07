"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { btnPrimary, btnSecondary, card, inputClass, labelClass } from "@/components/dashboard/ui";
import { dateWib } from "@/lib/format";
import { cn } from "@/lib/utils";
import { auditLabel, grantIsLive, type OsAuditEntry, type OsDivision, type OsGrant, type OsPerson } from "@/lib/os/types";

// Grants (who has extra access), Drive folder routes (where uploads will go) and the audit log. RLS limits every query:
// founders see and change all of it; nobody can edit or delete a grant, only revoke it.

export function GrantsAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [grants, setGrants] = useState<OsGrant[] | null>(null);
  const [people, setPeople] = useState<OsPerson[]>([]);
  const [divisions, setDivisions] = useState<OsDivision[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const [g, p, d] = await Promise.all([
      supabase.from("os_grants").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("os_people").select("id, user_id, full_name, short_name, org_role, status, google_account").order("full_name"),
      supabase.from("os_divisions").select("id, code, name, owner_person_id, drive_folder_id").order("id"),
    ]);
    const e = g.error ?? p.error ?? d.error;
    if (e) return setMsg({ ok: false, text: e.message });
    setGrants((g.data as OsGrant[]) ?? []); setPeople((p.data as OsPerson[]) ?? []); setDivisions((d.data as OsDivision[]) ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const name = (id: string | null) => people.find((p) => p.id === id)?.full_name ?? id ?? "";
  const target = (g: OsGrant) => (g.resource_type === "division" ? divisions.find((d) => d.id === g.resource_id)?.name ?? g.resource_id
    : g.resource_type === "people" ? `People Lead for ${g.resource_id === "HQ" ? "all companies" : g.resource_id === "IEL" ? "IELSco" : "Elco AI"}` : `${g.resource_type} ${g.resource_id}`);

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const type = String(f.get("resource_type"));
    const expires = String(f.get("expires_at") ?? "");
    const { error } = await supabase.from("os_grants").insert({
      person_id: f.get("person_id"), resource_type: type,
      resource_id: type === "division" ? f.get("division_id") : type === "people" ? f.get("people_company") : String(f.get("resource_id") ?? "").trim(),
      level: f.get("level"), reason: String(f.get("reason") ?? "").trim(),
      expires_at: expires ? new Date(`${expires}T23:59:59+07:00`).toISOString() : null,
    });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Access granted and logged." });
    if (!error) form.reset();
    load();
  };

  const revoke = async (g: OsGrant) => {
    if (!confirm(`Revoke ${name(g.person_id)}'s ${g.level} access to ${target(g)}? This takes effect immediately.`)) return;
    const { error } = await supabase.from("os_grants").update({ revoked_at: new Date().toISOString() }).eq("id", g.id);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Access revoked and logged." });
    load();
  };

  const shown = (grants ?? []).filter((g) => showAll || grantIsLive(g));

  return (
    <div className="space-y-6">
      {msg && <p role="status" className={msg.ok ? "text-[#0B6E64]" : "text-[#A23B3D]"}>{msg.text}</p>}
      <GrantForm people={people} divisions={divisions} onSubmit={create} />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{showAll ? "All grants" : "Active grants"}</h2>
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show expired and revoked</label>
      </div>
      {grants && shown.length === 0 && <p className="text-[#2F4157]/70">No grants yet. People see their own division and company without one.</p>}
      <ul className="space-y-3">
        {shown.map((g) => {
          const live = grantIsLive(g);
          return (
            <li key={g.id} className={cn(card, "flex flex-wrap items-center gap-3 p-4", !live && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{name(g.person_id)} · {g.level} · {target(g)}</p>
                <p className="text-sm text-[#2F4157]/65">
                  “{g.reason}” · by {name(g.granted_by)} on {dateWib(g.created_at)} ·{" "}
                  {g.revoked_at ? `revoked by ${name(g.revoked_by)} on ${dateWib(g.revoked_at)}` : g.expires_at ? `${live ? "ends" : "ended"} ${dateWib(g.expires_at)}` : "no end date"}
                </p>
              </div>
              {live && <button type="button" className={cn(btnSecondary, "px-4 py-2 text-sm")} onClick={() => revoke(g)}>Revoke</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GrantForm({ people, divisions, onSubmit }: { people: OsPerson[]; divisions: OsDivision[]; onSubmit: (e: FormEvent<HTMLFormElement>) => void }) {
  const [type, setType] = useState("division");
  return (
    <form onSubmit={onSubmit} className={cn(card, "grid gap-4 p-5 md:grid-cols-3")} aria-label="Grant access">
      <div><label className={labelClass} htmlFor="g-person">Person</label>
        <select id="g-person" name="person_id" required className={inputClass}>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}</select></div>
      <div><label className={labelClass} htmlFor="g-type">Access to</label>
        <select id="g-type" name="resource_type" className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="division">A division</option><option value="document">One document</option><option value="project">One project</option>
          <option value="people">People Lead (employment and reviews)</option>
        </select></div>
      {type === "people" ? (
        <div><label className={labelClass} htmlFor="g-co">For people in</label>
          <select id="g-co" name="people_company" className={inputClass}><option value="IEL">IELSco</option><option value="ELC">Elco AI</option><option value="HQ">Both companies</option></select></div>
      ) : type === "division" ? (
        <div><label className={labelClass} htmlFor="g-div">Division</label>
          <select id="g-div" name="division_id" className={inputClass}>{divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
      ) : (
        <div><label className={labelClass} htmlFor="g-res">{type === "document" ? "Document ID (DOC-0000)" : "Project ID (PRJ-0000)"}</label>
          <input id="g-res" name="resource_id" required className={inputClass} /></div>
      )}
      <div><label className={labelClass} htmlFor="g-level">Level</label>
        <select id="g-level" name="level" className={inputClass}><option value="view">View</option><option value="edit">Edit</option></select></div>
      <div><label className={labelClass} htmlFor="g-exp">Ends on (managers: required, at most 90 days)</label>
        <input id="g-exp" name="expires_at" type="date" className={inputClass} /></div>
      <div><label className={labelClass} htmlFor="g-reason">Reason</label>
        <input id="g-reason" name="reason" required className={inputClass} placeholder="e.g. Helping Growth with the GIF campaign" /></div>
      <div className="md:col-span-3 flex flex-wrap items-center gap-3">
        <button type="submit" className={btnPrimary}>Grant access</button>
        <span className="text-sm text-[#2F4157]/60">Division access never opens Restricted records. Every grant is logged.</span>
      </div>
    </form>
  );
}

export { RoutesAdmin } from "./RoutesAdmin";

export function AuditLog({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<OsAuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("os_audit_log").select("id, at, actor_person_id, action, target_type, target_id").order("at", { ascending: false }).limit(200)
      .then(({ data, error: e }) => { setError(e?.message ?? null); setRows((data as OsAuditEntry[]) ?? []); });
  }, [supabase]);
  if (error) return <p className="text-[#A23B3D]">{error}</p>;
  if (!rows) return <p className="text-[#2F4157]/70">Loading…</p>;
  if (!rows.length) return <p className="text-[#2F4157]/70">Nothing recorded yet.</p>;
  return (
    <ul className="divide-y divide-[#E3E7ED] rounded-2xl border border-[#E3E7ED] bg-white">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap gap-x-4 px-4 py-2.5 text-sm">
          <span className="w-40 shrink-0 text-[#2F4157]/60">{new Date(r.at).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })}</span>
          <span className="font-semibold">{auditLabel(r.action)}</span>
          <span className="text-[#2F4157]/70">{r.target_id}</span>
          <span className="ml-auto text-[#2F4157]/60">by {r.actor_person_id ?? "system"}</span>
        </li>
      ))}
    </ul>
  );
}
