"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PageHeader } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, focusRing, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { dateTimeWib, dateWib } from "@/lib/format";

// Staff operations for the membership platform. Every query below is restricted by RLS / security-definer functions to
// public.staff_roles admins; this screen only arranges them.
const TABS = ["Inquiries", "Members", "Feedback", "Buddies", "Sessions", "Member links"] as const;
type Tab = (typeof TABS)[number];

function useRows<T>(load: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => { load().then(({ data, error: e }) => { setError(e?.message ?? null); setRows((data as T[]) ?? []); }); }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { rows, error, reload };
}

function Inquiries({ supabase }: { supabase: SupabaseClient }) {
  const [kind, setKind] = useState("all");
  const load = useCallback(() => {
    const q = supabase.from("inquiries").select("id, kind, name, email, organization, role, phone, topic, message, status, created_at").order("created_at", { ascending: false }).limit(200);
    return kind === "all" ? q : q.eq("kind", kind);
  }, [supabase, kind]);
  const { rows, error, reload } = useRows<{ id: string; kind: string; name: string; email: string; organization: string | null; role: string | null; phone: string | null; topic: string | null; message: string | null; status: string; created_at: string }>(load);
  const setStatus = async (id: string, status: string) => { await supabase.from("inquiries").update({ status }).eq("id", id); reload(); };
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">{["all", "partner", "school", "careers", "membership_waitlist"].map((k) => (
        <button key={k} type="button" onClick={() => setKind(k)} className={cn(tag, "cursor-pointer", kind === k && "bg-[#2F4157] text-white")}>{k.replace("_", " ")}</button>))}</div>
      {error && <p className="text-[#A23B3D]">{error}</p>}
      {rows?.length === 0 && <p className="text-[#2F4157]/70">No inquiries yet.</p>}
      <ul className="space-y-3">
        {rows?.map((r) => (
          <li key={r.id} className={cn(card, "p-4 text-sm")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-base font-semibold text-[#1A2534]">{r.name} · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a></p>
              <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)} className={cn(inputClass, "w-auto py-1.5 text-sm")} aria-label="Status">
                <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
              </select>
            </div>
            <p className="mt-1 text-[#2F4157]/70">{r.kind}{r.topic ? ` · ${r.topic}` : ""}{r.organization ? ` · ${r.organization}` : ""}{r.role ? ` · ${r.role}` : ""}{r.phone ? ` · ${r.phone}` : ""} · {dateWib(r.created_at)}</p>
            {r.message && <p className="mt-2 whitespace-pre-line text-[#2F4157]">{r.message}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Members({ supabase }: { supabase: SupabaseClient }) {
  const load = useCallback(() => supabase.rpc("admin_membership_roster"), [supabase]);
  const { rows, error, reload } = useRows<{ user_id: string; email: string; full_name: string | null; status: string; access_until: string | null; member_since: string; periods: number }>(load);
  const [msg, setMsg] = useState<string | null>(null);
  async function grant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error: err } = await supabase.rpc("grant_staff_membership", { p_email: f.get("email"), p_months: Number(f.get("months")), p_note: f.get("note") });
    setMsg(err ? err.message : "Granted."); if (!err) { (e.target as HTMLFormElement).reset(); reload(); }
  }
  return (
    <div className="space-y-6">
      <form onSubmit={grant} className={cn(card, "grid gap-3 p-4 md:grid-cols-[1fr_120px_1fr_auto] md:items-end")}>
        <label className="block"><span className={labelClass}>Member email</span><input name="email" type="email" required className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Months</span><input name="months" type="number" min={1} max={24} defaultValue={3} required className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Reason (logged)</span><input name="note" required maxLength={300} placeholder="e.g. Partner scholarship seat" className={inputClass} /></label>
        <button type="submit" className={btnPrimary}>Grant</button>
      </form>
      {msg && <p className="text-sm text-[#2F4157]" role="status">{msg}</p>}
      <p className="text-sm text-[#2F4157]/70">Expired members still in the private group must be removed there by hand; they are listed as &ldquo;expired&rdquo;.</p>
      {error && <p className="text-[#A23B3D]">{error}</p>}
      <div className={cn(card, "overflow-x-auto")}>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="border-b border-[#E3E7ED]"><th className="px-4 py-3">Member</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Access until</th><th className="px-4 py-3">Since</th><th className="px-4 py-3">Periods</th></tr></thead>
          <tbody>{rows?.map((r) => (
            <tr key={r.user_id} className="border-b border-[#E3E7ED] last:border-0">
              <td className="px-4 py-3">{r.full_name ?? "—"}<br /><span className="text-[#2F4157]/60">{r.email}</span></td>
              <td className="px-4 py-3"><span className={cn(tag, r.status === "active" ? "bg-[#E8F5EE] text-[#2D7A58]" : "")}>{r.status}</span></td>
              <td className="px-4 py-3">{r.access_until ? dateWib(r.access_until) : "—"}</td>
              <td className="px-4 py-3">{dateWib(r.member_since)}</td>
              <td className="px-4 py-3">{r.periods}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

function Feedback({ supabase }: { supabase: SupabaseClient }) {
  const load = useCallback(() => supabase.from("feedback_requests").select("id, user_id, doc_type, doc_url, target, notes, status, reviewer_note, created_at").order("created_at", { ascending: true }), [supabase]);
  const { rows, error, reload } = useRows<{ id: string; doc_type: string; doc_url: string; target: string | null; notes: string | null; status: string; reviewer_note: string | null; created_at: string }>(load);
  async function save(id: string, status: string, note: string) {
    await supabase.from("feedback_requests").update({ status, reviewer_note: note || null, returned_at: status === "returned" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq("id", id);
    reload();
  }
  return (
    <div className="space-y-3">
      {error && <p className="text-[#A23B3D]">{error}</p>}
      {rows?.length === 0 && <p className="text-[#2F4157]/70">No requests.</p>}
      {rows?.map((r) => (
        <form key={r.id} className={cn(card, "space-y-3 p-4 text-sm")} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save(r.id, String(f.get("status")), String(f.get("note") ?? "")); }}>
          <p className="text-base font-semibold text-[#1A2534]">{r.doc_type.replace("_", " ")}{r.target ? ` · ${r.target}` : ""} <span className={tag}>{r.status}</span></p>
          <p className="text-[#2F4157]/70">Requested {dateWib(r.created_at)} · <a href={r.doc_url} target="_blank" rel="noopener noreferrer" className={cn("underline", focusRing)}>Open document</a></p>
          {r.notes && <p className="text-[#2F4157]">Member&apos;s note: {r.notes}</p>}
          <textarea name="note" defaultValue={r.reviewer_note ?? ""} rows={4} maxLength={4000} placeholder="Feedback the member will see" className={inputClass} />
          <div className="flex gap-2">
            <select name="status" defaultValue={r.status} className={cn(inputClass, "w-auto")}><option value="submitted">Waiting</option><option value="in_review">In review</option><option value="returned">Returned</option><option value="cancelled">Cancelled</option></select>
            <button type="submit" className={btnSecondary}>Save</button>
          </div>
        </form>
      ))}
    </div>
  );
}

function Buddies({ supabase }: { supabase: SupabaseClient }) {
  const load = useCallback(() => supabase.from("buddy_requests").select("user_id, status, preferences, match_note, created_at").order("created_at", { ascending: true }), [supabase]);
  const { rows, error, reload } = useRows<{ user_id: string; status: string; preferences: string | null; match_note: string | null; created_at: string }>(load);
  async function match(id: string, note: string) {
    await supabase.from("buddy_requests").update({ status: "matched", match_note: note, matched_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", id);
    reload();
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#2F4157]/70">Match two waiting members by hand, then write each one a short introduction (name, goal, how to reach each other with their consent).</p>
      {error && <p className="text-[#A23B3D]">{error}</p>}
      {rows?.length === 0 && <p className="text-[#2F4157]/70">No requests.</p>}
      {rows?.map((r) => (
        <form key={r.user_id} className={cn(card, "space-y-3 p-4 text-sm")} onSubmit={(e) => { e.preventDefault(); match(r.user_id, String(new FormData(e.currentTarget).get("note") ?? "")); }}>
          <p className="font-mono text-xs text-[#2F4157]/60">{r.user_id} <span className={tag}>{r.status}</span> · since {dateWib(r.created_at)}</p>
          {r.preferences && <p className="text-[#2F4157]">{r.preferences}</p>}
          <textarea name="note" defaultValue={r.match_note ?? ""} required rows={3} maxLength={1000} placeholder="Introduction shown to this member" className={inputClass} />
          <button type="submit" className={btnSecondary}>Save as matched</button>
        </form>
      ))}
    </div>
  );
}

function Sessions({ supabase }: { supabase: SupabaseClient }) {
  const load = useCallback(() => supabase.from("member_sessions").select("id, title, kind, starts_at, duration_min, capacity, host_name, members_only, join_url, status").order("starts_at", { ascending: false }).limit(50), [supabase]);
  const { rows, error, reload } = useRows<{ id: string; title: string; kind: string; starts_at: string; duration_min: number; capacity: number | null; host_name: string | null; members_only: boolean; join_url: string | null; status: string }>(load);
  const [msg, setMsg] = useState<string | null>(null);
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error: err } = await supabase.from("member_sessions").insert({
      title: f.get("title"), description: f.get("description") || null, kind: f.get("kind"), starts_at: new Date(`${f.get("date")}T${f.get("time")}:00+07:00`).toISOString(),
      duration_min: Number(f.get("duration")), capacity: f.get("capacity") ? Number(f.get("capacity")) : null, host_name: f.get("host") || null,
      members_only: f.get("members_only") === "on", join_url: f.get("join_url") || null, status: "scheduled",
    });
    setMsg(err ? err.message : "Session published."); if (!err) { (e.target as HTMLFormElement).reset(); reload(); }
  }
  const cancel = async (id: string) => { await supabase.from("member_sessions").update({ status: "cancelled" }).eq("id", id); reload(); };
  return (
    <div className="space-y-6">
      <form onSubmit={create} className={cn(card, "grid gap-3 p-4 md:grid-cols-3")}>
        <label className="block md:col-span-2"><span className={labelClass}>Title</span><input name="title" required minLength={3} maxLength={140} className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Type</span><select name="kind" className={inputClass}><option value="application_clinic">Application clinic</option><option value="workshop">Workshop</option><option value="speaking_club">Speaking club</option><option value="qna">Q&amp;A</option><option value="networking">Networking</option></select></label>
        <label className="block"><span className={labelClass}>Date</span><input name="date" type="date" required className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Time (WIB)</span><input name="time" type="time" required className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Minutes</span><input name="duration" type="number" min={15} max={480} defaultValue={60} className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Seats (optional)</span><input name="capacity" type="number" min={1} className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Host (optional)</span><input name="host" maxLength={120} className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Join link (https, members only see it)</span><input name="join_url" type="url" pattern="https://.*" className={inputClass} /></label>
        <label className="block md:col-span-3"><span className={labelClass}>Description (optional)</span><textarea name="description" maxLength={1200} rows={2} className={inputClass} /></label>
        <label className="flex items-center gap-2 text-base"><input type="checkbox" name="members_only" defaultChecked className="h-4 w-4" /> Members only</label>
        <div className="md:col-span-2 md:text-right"><button type="submit" className={btnPrimary}>Publish session</button></div>
      </form>
      {msg && <p className="text-sm text-[#2F4157]" role="status">{msg}</p>}
      {error && <p className="text-[#A23B3D]">{error}</p>}
      <ul className="space-y-2">{rows?.map((s) => (
        <li key={s.id} className={cn(card, "flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between")}>
          <span><strong>{s.title}</strong> · {dateTimeWib(s.starts_at)} <span className={tag}>{s.status}</span>{s.members_only && <span className={cn(tag, "ml-1")}>members</span>}{!s.join_url && <span className={cn(tag, "ml-1")}>no link yet</span>}</span>
          {s.status === "scheduled" && <button type="button" onClick={() => cancel(s.id)} className={btnSecondary}>Cancel</button>}
        </li>))}</ul>
    </div>
  );
}

function Links({ supabase }: { supabase: SupabaseClient }) {
  const load = useCallback(() => supabase.from("member_links").select("key, label, description, url, sort").order("sort"), [supabase]);
  const { rows, error, reload } = useRows<{ key: string; label: string; description: string | null; url: string; sort: number }>(load);
  const [msg, setMsg] = useState<string | null>(null);
  async function upsert(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const row = { key: String(f.get("key")), label: String(f.get("label")), description: String(f.get("description") || "") || null, url: String(f.get("url")), sort: Number(f.get("sort") || 0), updated_at: new Date().toISOString() };
    const exists = rows?.some((r) => r.key === row.key);
    const { error: err } = exists ? await supabase.from("member_links").update(row).eq("key", row.key) : await supabase.from("member_links").insert(row);
    setMsg(err ? err.message : "Saved."); if (!err) reload();
  }
  const remove = async (key: string) => { await supabase.from("member_links").delete().eq("key", key); reload(); };
  return (
    <div className="space-y-6">
      <p className="text-sm text-[#2F4157]/70">Links shown only to active members, e.g. the private WhatsApp or Discord group. Rotate the invite link if it leaks.</p>
      <form onSubmit={upsert} className={cn(card, "grid gap-3 p-4 md:grid-cols-2")}>
        <label className="block"><span className={labelClass}>Key</span><input name="key" required pattern="[a-z0-9-]{2,40}" placeholder="member-group" className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Label</span><input name="label" required className={inputClass} /></label>
        <label className="block"><span className={labelClass}>URL (https)</span><input name="url" type="url" required pattern="https://.*" className={inputClass} /></label>
        <label className="block"><span className={labelClass}>Order</span><input name="sort" type="number" defaultValue={0} className={inputClass} /></label>
        <label className="block md:col-span-2"><span className={labelClass}>Description</span><input name="description" maxLength={300} className={inputClass} /></label>
        <div><button type="submit" className={btnPrimary}>Save link</button></div>
      </form>
      {msg && <p className="text-sm" role="status">{msg}</p>}
      {error && <p className="text-[#A23B3D]">{error}</p>}
      <ul className="space-y-2">{rows?.map((l) => (
        <li key={l.key} className={cn(card, "flex items-center justify-between gap-3 p-4 text-sm")}><span><strong>{l.label}</strong> <span className="text-[#2F4157]/60">({l.key})</span></span>
          <button type="button" onClick={() => remove(l.key)} className={btnSecondary}>Remove</button></li>))}</ul>
    </div>
  );
}

export function OperationsAdmin({ supabase }: { supabase: SupabaseClient }) {
  const [tab, setTab] = useState<Tab>("Inquiries");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14" data-testid="admin-operations">
      <PageHeader title="Operations" description="Inquiries, members and member services." />
      <div className="mb-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("rounded-full border px-4 py-2 text-sm font-semibold", focusRing, tab === t ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white text-[#2F4157]")}>{t}</button>
        ))}
      </div>
      {tab === "Inquiries" && <Inquiries supabase={supabase} />}
      {tab === "Members" && <Members supabase={supabase} />}
      {tab === "Feedback" && <Feedback supabase={supabase} />}
      {tab === "Buddies" && <Buddies supabase={supabase} />}
      {tab === "Sessions" && <Sessions supabase={supabase} />}
      {tab === "Member links" && <Links supabase={supabase} />}
    </div>
  );
}
