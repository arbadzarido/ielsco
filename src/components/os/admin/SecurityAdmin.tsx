"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { btnSecondary, card, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { describeDevice } from "@/lib/os/device";
import {
  COMPANY_LABEL, LOGIN_REASON_LABEL, PERSON_COLUMNS, suspiciousFailures,
  type CompanyCode, type OsLoginEvent, type OsPerson,
} from "@/lib/os/types";

// Admin → Security & sessions. Data comes from os_login_history(), which returns everyone's Company OS sign-ins to a
// founder with two-step verification and nothing about other people to anyone else. Device details are approximate
// (from the browser's User-Agent) and location is approximate (from the IP address).

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : "");

type StatusFilter = "all" | "success" | "failed" | "active" | "ended" | "new";

export function SecurityAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [events, setEvents] = useState<OsLoginEvent[] | null>(null);
  const [people, setPeople] = useState<OsPerson[]>([]);
  const [companies, setCompanies] = useState<{ person_id: string; company_code: CompanyCode }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [person, setPerson] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    const [e, p, c] = await Promise.all([
      supabase.rpc("os_login_history", { p_limit: 2000 }),
      supabase.from("os_people").select(PERSON_COLUMNS).order("full_name"),
      supabase.from("os_person_companies").select("person_id, company_code"),
    ]);
    const err = e.error ?? p.error ?? c.error;
    if (err) return setMsg({ ok: false, text: err.message });
    setEvents((e.data as OsLoginEvent[]) ?? []);
    setPeople((p.data as OsPerson[]) ?? []);
    setCompanies((c.data as typeof companies) ?? []);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const name = (e: Pick<OsLoginEvent, "person_id" | "email">) => people.find((p) => p.id === e.person_id)?.full_name ?? e.email ?? "Unknown account";

  const shown = useMemo(() => (events ?? []).filter((e) => {
    if (person && e.person_id !== person) return false;
    if (company && !companies.some((c) => c.person_id === e.person_id && c.company_code === company)) return false;
    if (from && e.at < new Date(`${from}T00:00:00+07:00`).toISOString()) return false;
    if (to && e.at > new Date(`${to}T23:59:59+07:00`).toISOString()) return false;
    switch (status) {
      case "success": return e.success;
      case "failed": return !e.success;
      case "active": return e.active;
      case "ended": return e.success && !e.active;
      case "new": return e.new_device;
      default: return true;
    }
  }), [events, person, company, companies, from, to, status]);

  const revoke = async (e: OsLoginEvent) => {
    const reason = prompt(`End this session for ${name(e)}? They will be signed out of Company OS at once.\n\nReason (recorded in the audit log):`);
    if (!reason?.trim()) return;
    const { error } = await supabase.rpc("os_revoke_session", { p_session: e.session_id, p_reason: reason.trim() });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Session ended and logged." });
    load();
  };

  const revokeAll = async (personId: string) => {
    const who = people.find((p) => p.id === personId)?.full_name ?? personId;
    const reason = prompt(`End every Company OS session for ${who}? They can sign in again unless you also suspend the account.\n\nReason (recorded in the audit log):`);
    if (!reason?.trim()) return;
    const { error } = await supabase.rpc("os_revoke_all_sessions", { p_person: personId, p_reason: reason.trim() });
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: `All sessions for ${who} ended and logged.` });
    load();
  };

  if (!events) return <p className="text-[#2F4157]/70">{msg?.text ?? "Loading sign-in history…"}</p>;

  const day = Date.now() - 24 * 3600 * 1000;
  const week = Date.now() - 7 * 24 * 3600 * 1000;
  const active = events.filter((e) => e.active);
  const suspicious = suspiciousFailures(events);

  // Devices per account: distinct approximate profiles with the last time each was used.
  const devices = new Map<string, Map<string, { label: string; last: string; count: number }>>();
  for (const e of events) {
    if (!e.success || !e.person_id) continue;
    const label = describeDevice({ browser: e.browser ?? "Unknown", browserVersion: null, os: e.os ?? "Unknown", deviceType: e.device_type ?? "unknown" });
    const m = devices.get(e.person_id) ?? new Map();
    const d = m.get(label) ?? { label, last: e.at, count: 0 };
    d.count++; if (e.at > d.last) d.last = e.at;
    m.set(label, d); devices.set(e.person_id, m);
  }

  return (
    <div className="space-y-8" data-testid="security-admin">
      {msg && <p role="status" className={msg.ok ? "text-[#0B6E64]" : "text-[#A23B3D]"}>{msg.text}</p>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
        <Tile n={active.length} label="sessions signed in now" />
        <Tile n={events.filter((e) => e.new_device && Date.parse(e.at) > week).length} label="new-device sign-ins (7 days)" />
        <Tile n={events.filter((e) => !e.success && Date.parse(e.at) > day).length} label="refused sign-ins (24 hours)" warn />
        <Tile n={suspicious.length} label="suspicious accounts or addresses" warn />
      </section>

      {suspicious.length > 0 && (
        <section className={cn(card, "border-[#E8B4B5] p-5")} aria-label="Suspicious activity">
          <h3 className="text-lg font-bold">Repeated refused sign-ins (last 24 hours)</h3>
          <ul className="mt-2 space-y-1">
            {suspicious.map((s) => <li key={`${s.kind}${s.value}`}>{s.kind === "email" ? "Account" : "IP address"} <strong>{s.value}</strong>: {s.count} refused</li>)}
          </ul>
        </section>
      )}

      <section aria-label="Filters" className={cn(card, "grid gap-4 p-5 md:grid-cols-5")}>
        <div><label className={labelClass} htmlFor="f-person">Employee</label>
          <select id="f-person" className={inputClass} value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value="">Everyone</option>{people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select></div>
        <div><label className={labelClass} htmlFor="f-company">Company</label>
          <select id="f-company" className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">All</option>{(["HQ", "IEL", "ELC"] as CompanyCode[]).map((c) => <option key={c} value={c}>{COMPANY_LABEL[c]}</option>)}
          </select></div>
        <div><label className={labelClass} htmlFor="f-status">Status</label>
          <select id="f-status" className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">All</option><option value="success">Signed in</option><option value="failed">Refused</option>
            <option value="active">Active now</option><option value="ended">Ended or revoked</option><option value="new">New device</option>
          </select></div>
        <div><label className={labelClass} htmlFor="f-from">From</label><input id="f-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className={labelClass} htmlFor="f-to">To</label><input id="f-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </section>

      <section aria-label="Sign-in history">
        <h3 className="mb-3 text-xl font-bold">Sign-in history <span className="text-base font-normal text-[#2F4157]/60">({shown.length})</span></h3>
        {shown.length === 0 ? <p className="text-[#2F4157]/70">No sign-ins match.</p> : (
          <div className="overflow-x-auto rounded-2xl border border-[#E3E7ED] bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F7F8FA] text-[#2F4157]/70">
                <tr><th className="p-3">When</th><th className="p-3">Account</th><th className="p-3">Result</th><th className="p-3">Device (approx.)</th><th className="p-3">IP · location (approx.)</th><th className="p-3">Session</th><th className="p-3" /></tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id} className="border-t border-[#E3E7ED] align-top" data-testid="login-row">
                    <td className="p-3 whitespace-nowrap">{fmt(e.at)}</td>
                    <td className="p-3">{name(e)}<span className="block text-[#2F4157]/55">{e.email}</span></td>
                    <td className="p-3">
                      <span className={cn(tag, e.success ? "" : "bg-[#FDF2F2] text-[#8A2C2E]")}>{e.success ? "Signed in" : "Refused"}</span>
                      {!e.success && <span className="mt-1 block text-[#2F4157]/70">{LOGIN_REASON_LABEL[e.reason] ?? e.reason}</span>}
                      {e.new_device && <span className={cn(tag, "mt-1 bg-[#FFF6E5] text-[#7A5200]")}>New device</span>}
                    </td>
                    <td className="p-3">{describeDevice({ browser: e.browser ?? "Unknown", browserVersion: e.browser_version, os: e.os ?? "Unknown", deviceType: e.device_type ?? "unknown" })}</td>
                    <td className="p-3">{e.ip ?? "—"}<span className="block text-[#2F4157]/55">{[e.city, e.region, e.country].filter(Boolean).join(", ")}</span></td>
                    <td className="p-3">
                      {e.success ? (e.active ? <span className={cn(tag, "bg-[#E7F6F3] text-[#0B6E64]")}>Active</span>
                        : <span className={tag}>{e.revoked_at ? `Revoked ${fmt(e.revoked_at)}` : "Ended"}</span>) : "—"}
                      {e.revoked_reason && <span className="mt-1 block text-[#2F4157]/60">{e.revoked_reason}</span>}
                      {e.session_id && <span className="mt-1 block font-mono text-xs text-[#2F4157]/45">{e.session_id.slice(0, 8)}</span>}
                    </td>
                    <td className="p-3 text-right">
                      {e.active && <button type="button" className={cn(btnSecondary, "px-3 py-1.5 text-sm")} onClick={() => revoke(e)}>End session</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Devices by account">
        <h3 className="mb-3 text-xl font-bold">Devices and last sign-in by account</h3>
        <ul className="grid gap-3 md:grid-cols-2">
          {people.filter((p) => devices.has(p.id)).map((p) => {
            const list = [...devices.get(p.id)!.values()].sort((a, b) => b.last.localeCompare(a.last));
            return (
              <li key={p.id} className={cn(card, "p-4")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.full_name}</p>
                    <p className="text-sm text-[#2F4157]/60">Last sign-in {fmt(list[0].last)} · {events.filter((e) => e.active && e.person_id === p.id).length} active</p>
                  </div>
                  <button type="button" className={cn(btnSecondary, "shrink-0 px-3 py-1.5 text-sm")} onClick={() => revokeAll(p.id)}>End all sessions</button>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {list.map((d) => <li key={d.label}>{d.label} <span className="text-[#2F4157]/55">· {d.count}× · last {fmt(d.last)}</span></li>)}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-[#2F4157]/60">A device is an approximate profile (browser, operating system, device type) read from the browser. It is not a hardware ID: two laptops with the same browser look the same. Sign-in history is kept 180 days.</p>
      </section>
    </div>
  );
}

function Tile({ n, label, warn }: { n: number; label: string; warn?: boolean }) {
  return (
    <div className={cn(card, "p-5", warn && n > 0 && "border-[#E8B4B5]")}>
      <p className="text-3xl font-bold">{n}</p>
      <p className="text-[#2F4157]/70">{label}</p>
    </div>
  );
}
