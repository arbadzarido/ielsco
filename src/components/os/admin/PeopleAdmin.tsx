"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { btnPrimary, btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import {
  COMPANY_LABEL, ROLE_LABEL, STATUS_LABEL, nextPersonId,
  type CompanyCode, type OrgRole, type OsDivision, type OsPerson, type OsPersonDivision, type PersonStatus,
} from "@/lib/os/types";

// Founders add people, set role and status, companies and divisions, and link the IELSco login. Every write is
// founder-only in RLS and recorded in os_audit_log by trigger.
const ROLES: OrgRole[] = ["member", "manager", "founder", "guest"];
const STATUSES: PersonStatus[] = ["onboarding", "active", "inactive", "offboarded"];
const COMPANIES: CompanyCode[] = ["IEL", "ELC"];

interface Data { people: OsPerson[]; divisions: OsDivision[]; links: OsPersonDivision[]; companies: { person_id: string; company_code: CompanyCode }[] }

export function PeopleAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [data, setData] = useState<Data | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [p, d, l, c] = await Promise.all([
      supabase.from("os_people").select("id, user_id, full_name, short_name, org_role, status, google_account").order("id"),
      supabase.from("os_divisions").select("id, code, name, owner_person_id, drive_folder_id").order("id"),
      supabase.from("os_person_divisions").select("person_id, division_id, is_manager"),
      supabase.from("os_person_companies").select("person_id, company_code"),
    ]);
    const e = p.error ?? d.error ?? l.error ?? c.error;
    if (e) return setMsg({ ok: false, text: e.message });
    setData({ people: (p.data as OsPerson[]) ?? [], divisions: (d.data as OsDivision[]) ?? [], links: (l.data as OsPersonDivision[]) ?? [], companies: (c.data as Data["companies"]) ?? [] });
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const run = async (label: string, op: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await op;
    setMsg(error ? { ok: false, text: `${label}: ${error.message}` } : { ok: true, text: `${label}: saved.` });
    await load();
  };

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const full = String(f.get("full_name") ?? "").trim();
    if (!full) return setMsg({ ok: false, text: "Full name is required." });
    const id = nextPersonId(data?.people.map((p) => p.id) ?? []);
    await run(`Add ${full}`, supabase.from("os_people").insert({
      id, full_name: full, short_name: String(f.get("short_name") ?? "").trim() || null, org_role: f.get("org_role"),
    }));
    e.currentTarget.reset();
  };

  if (!data) return <p className="text-[#2F4157]/70">{msg?.text ?? "Loading people…"}</p>;

  return (
    <div className="space-y-6">
      {msg && <p role="status" className={msg.ok ? "text-[#0B6E64]" : "text-[#A23B3D]"}>{msg.text}</p>}

      <form onSubmit={add} className={cn(card, "grid gap-4 p-5 md:grid-cols-4 md:items-end")} aria-label="Add a person">
        <div><label className={labelClass} htmlFor="p-full">Full name</label><input id="p-full" name="full_name" className={inputClass} required /></div>
        <div><label className={labelClass} htmlFor="p-short">Short name</label><input id="p-short" name="short_name" className={inputClass} /></div>
        <div><label className={labelClass} htmlFor="p-role">Role</label>
          <select id="p-role" name="org_role" className={inputClass} defaultValue="member">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></div>
        <button type="submit" className={btnPrimary}>Add person</button>
        <p className="text-sm text-[#2F4157]/60 md:col-span-4">New people start as Onboarding with no company or division, so they can see nothing until you set those below.</p>
      </form>

      <ul className="space-y-3">
        {data.people.map((p) => {
          const comps = data.companies.filter((c) => c.person_id === p.id).map((c) => c.company_code);
          const divs = data.links.filter((l) => l.person_id === p.id);
          const isOpen = open === p.id;
          return (
            <li key={p.id} className={cn(card, "p-4")}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.full_name} <span className="font-normal text-[#2F4157]/55">· {p.id}</span></p>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-sm">
                    <span className={tag}>{ROLE_LABEL[p.org_role]}</span>
                    <span className={tag}>{STATUS_LABEL[p.status]}</span>
                    <span className={tag}>{p.user_id ? "Login linked" : "No login linked"}</span>
                    {comps.map((c) => <span key={c} className={tag}>{COMPANY_LABEL[c]}</span>)}
                    {divs.map((d) => <span key={d.division_id} className={tag}>{data.divisions.find((x) => x.id === d.division_id)?.name}{d.is_manager ? " (mgr)" : ""}</span>)}
                  </div>
                </div>
                <button type="button" className={cn(btnSecondary, "px-4 py-2 text-sm")} aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : p.id)}>
                  {isOpen ? "Close" : "Edit"}
                </button>
              </div>

              {isOpen && (
                <div className="mt-4 grid gap-5 border-t border-[#E3E7ED] pt-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className={labelClass} htmlFor={`role-${p.id}`}>Role</label>
                    <select id={`role-${p.id}`} className={inputClass} value={p.org_role}
                      onChange={(e) => {
                        const role = e.target.value as OrgRole;
                        if (role === "founder" && !confirm(`Make ${p.full_name} a founder? Founders can see Restricted finance, legal and personnel records.`)) return;
                        run(`Role for ${p.full_name}`, supabase.from("os_people").update({ org_role: role }).eq("id", p.id));
                      }}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                    <label className={labelClass} htmlFor={`status-${p.id}`}>Status</label>
                    <select id={`status-${p.id}`} className={inputClass} value={p.status}
                      onChange={(e) => run(`Status for ${p.full_name}`, supabase.from("os_people").update({ status: e.target.value }).eq("id", p.id))}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    <form className="space-y-2" onSubmit={(e) => {
                      e.preventDefault();
                      const email = String(new FormData(e.currentTarget).get("email") ?? "");
                      run(`Link login for ${p.full_name}`, supabase.rpc("os_link_account", { p_person: p.id, p_email: email }));
                    }}>
                      <label className={labelClass} htmlFor={`email-${p.id}`}>Link IELSco login (confirmed email)</label>
                      <div className="flex gap-2">
                        <input id={`email-${p.id}`} name="email" type="email" required className={inputClass} placeholder="name@example.com" />
                        <button type="submit" className={cn(btnSecondary, "shrink-0")}>Link</button>
                      </div>
                    </form>
                  </div>
                  <div className="space-y-4">
                    <fieldset>
                      <legend className={labelClass}>Companies</legend>
                      {COMPANIES.map((c) => {
                        const has = comps.includes(c);
                        return (
                          <label key={c} className="mr-4 inline-flex items-center gap-2">
                            <input type="checkbox" checked={has} onChange={() => run(`${COMPANY_LABEL[c]} for ${p.full_name}`, has
                              ? supabase.from("os_person_companies").delete().eq("person_id", p.id).eq("company_code", c)
                              : supabase.from("os_person_companies").insert({ person_id: p.id, company_code: c }))} />
                            {COMPANY_LABEL[c]}
                          </label>
                        );
                      })}
                      <p className="mt-1 text-sm text-[#2F4157]/60">HQ Internal records are visible to all active staff.</p>
                    </fieldset>
                    <fieldset>
                      <legend className={labelClass}>Divisions</legend>
                      <ul className="space-y-1.5">
                        {data.divisions.map((d) => {
                          const link = divs.find((x) => x.division_id === d.id);
                          return (
                            <li key={d.id} className="flex flex-wrap items-center gap-3">
                              <label className="inline-flex min-w-[12rem] items-center gap-2">
                                <input type="checkbox" checked={!!link} onChange={() => run(`${d.name} for ${p.full_name}`, link
                                  ? supabase.from("os_person_divisions").delete().eq("person_id", p.id).eq("division_id", d.id)
                                  : supabase.from("os_person_divisions").insert({ person_id: p.id, division_id: d.id }))} />
                                {d.name}
                              </label>
                              {link && (
                                <label className="inline-flex items-center gap-2 text-sm">
                                  <input type="checkbox" checked={link.is_manager} onChange={() => run(`Manager of ${d.name}`,
                                    supabase.from("os_person_divisions").update({ is_manager: !link.is_manager }).eq("person_id", p.id).eq("division_id", d.id))} />
                                  Manager
                                </label>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-1 text-sm text-[#2F4157]/60">Manager rights need both the Manager role and this box.</p>
                    </fieldset>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
