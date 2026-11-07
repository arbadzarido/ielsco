"use client";

// Notifications: what changed for me (stored rows, written only by database triggers: invitations, reschedules,
// cancellations, assignments, deadline changes) and what needs my attention now (worked out on the fly, so it never
// piles up: milestones I own due within a week, my content that is late or waiting for my review, and clashes in
// my own schedule). Everything is read with my own session; nobody else's notifications are readable.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Bell, CheckCheck } from "lucide-react";
import { useOsMe } from "./OsProvider";
import { Sheet, btnGhost, muted, ring } from "./ui";
import { busyBlocks, type BusyRow } from "@/lib/os/conflicts";
import { DEFAULT_TZ, zonedParts } from "@/lib/os/calendar";
import { addDays, todayJakarta } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Note = { id: number; kind: string; entity_type: string; entity_id: string; title: string; body: string | null; created_at: string; read_at: string | null };
type Attention = { key: string; text: string; href: string; tone: "red" | "amber" };

const hrefFor = (n: { entity_type: string; entity_id: string }) => (n.entity_type === "event" ? `/os/calendar?event=${n.entity_id}` : `/os/tasks/${n.entity_id}`);
const when = (iso: string) => { const p = zonedParts(iso, DEFAULT_TZ); return `${new Date(`${p.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} ${p.time}`; };

export function NotificationsButton({ compact }: { compact?: boolean }) {
  const { supabase, me } = useOsMe();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [attention, setAttention] = useState<Attention[]>([]);
  const unread = notes.filter((n) => !n.read_at).length;

  const load = useCallback(async () => {
    const { data } = await supabase.from("os_notifications").select("id, kind, entity_type, entity_id, title, body, created_at, read_at").order("created_at", { ascending: false }).limit(50);
    setNotes((data ?? []) as Note[]);
  }, [supabase]);
  useEffect(() => { load(); const t = setInterval(load, 120_000); return () => clearInterval(t); }, [load]);

  const loadAttention = useCallback(async () => {
    const me_ = me.person.id, today = todayJakarta(), week = addDays(today, 7);
    const now = new Date().toISOString(), soon = new Date(Date.now() + 7 * 86400000).toISOString();
    const [ms, content, busy] = await Promise.all([
      supabase.from("os_timeline_items").select("id, title, due_date, is_major").eq("owner_person_id", me_).gte("due_date", today).lte("due_date", week).not("status", "in", "(Done,Cancelled)").order("due_date").limit(20),
      supabase.from("os_campaign_items").select("id, title, status, publish_at, planned_publish_date, owner_person_id, creator_person_id, reviewer_person_id").or(`owner_person_id.eq.${me_},creator_person_id.eq.${me_},reviewer_person_id.eq.${me_}`).not("status", "in", "(Published,Cancelled)").limit(100),
      supabase.rpc("os_busy", { p_people: [me_], p_from: now, p_to: soon }),
    ]);
    const out: Attention[] = [];
    for (const m of (ms.data ?? []) as { id: string; title: string; due_date: string; is_major: boolean }[])
      out.push({ key: `m${m.id}`, text: `${m.is_major ? "Major milestone" : "Milestone"} ${m.id} “${m.title}” is due ${m.due_date}.`, href: `/os/timeline/${m.id}`, tone: "amber" });
    for (const c of (content.data ?? []) as { id: string; title: string; status: string; publish_at: string | null; planned_publish_date: string | null; reviewer_person_id: string | null }[]) {
      const due = c.publish_at ?? (c.planned_publish_date ? `${c.planned_publish_date}T23:59:59+07:00` : null);
      if (due && Date.parse(due) < Date.now()) out.push({ key: `c${c.id}`, text: `“${c.title}” (${c.id}) was due to publish ${c.publish_at ? when(c.publish_at) : c.planned_publish_date} and is still ${c.status}.`, href: `/os/campaigns?open=${c.id}`, tone: "red" });
      else if (c.status === "In review" && c.reviewer_person_id === me_) out.push({ key: `r${c.id}`, text: `“${c.title}” (${c.id}) is waiting for your review.`, href: `/os/campaigns?open=${c.id}`, tone: "amber" });
    }
    // Clashes in my own next seven days (timed items only).
    const blocks = busyBlocks((busy.data ?? []) as BusyRow[], now, soon).filter((b) => !b.all_day).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length && blocks[j].starts_at < blocks[i].ends_at; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.ref_id && a.ref_id === b.ref_id) continue;
      out.push({ key: `x${a.ref_id}${a.starts_at}${b.ref_id}`, text: `Clash on ${when(b.starts_at)}: “${a.title}” and “${b.title}”.`, href: a.source === "event" && a.ref_id ? `/os/calendar?event=${a.ref_id}` : `/os/calendar?view=day&d=${zonedParts(b.starts_at, DEFAULT_TZ).date}`, tone: "red" });
    }
    setAttention(out.slice(0, 30));
  }, [supabase, me.person.id]);
  useEffect(() => { if (open) loadAttention(); }, [open, loadAttention]);

  const markAll = async () => {
    const ids = notes.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length) await supabase.from("os_notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    load();
  };
  const openOne = async (n: Note) => { if (!n.read_at) await supabase.from("os_notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id); setOpen(false); load(); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} data-testid="os-notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        className={cn("relative flex items-center gap-2.5 rounded-lg text-sm text-[#3A4B60] hover:bg-[#EDF0F4]", ring, compact ? "h-11 w-11 justify-center" : "min-h-10 w-full px-2 md:min-h-8")}>
        <Bell size={16} aria-hidden="true" className="text-[#66768A]" />{!compact && <span className="flex-1 text-left">Notifications</span>}
        {unread > 0 && <span className={cn("rounded-full bg-[#A12D2F] px-1.5 text-[11px] font-semibold leading-5 text-white", compact && "absolute right-1 top-1")} data-testid="os-notifications-count">{unread}</span>}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications">
        <div className="space-y-5" data-testid="os-notifications-panel">
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><AlertTriangle size={14} aria-hidden="true" className="text-[#865400]" />Needs attention</h3>
            {attention.length ? (
              <ul className="space-y-1.5">{attention.map((a) => (
                <li key={a.key}><Link href={a.href} onClick={() => setOpen(false)} className={cn("block rounded-lg border px-3 py-2 text-sm hover:bg-[#F7F9FB]", ring, a.tone === "red" ? "border-[#F1C9CA]" : "border-[#F1D5A6]")}>{a.text}</Link></li>
              ))}</ul>
            ) : <p className={cn("text-sm", muted)}>Nothing needs your attention right now.</p>}
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Updates</h3>
              {unread > 0 && <button type="button" className={btnGhost} onClick={markAll}><CheckCheck size={14} aria-hidden="true" />Mark all read</button>}
            </div>
            {notes.length ? (
              <ul className="divide-y divide-[#F0F2F5] rounded-lg border border-[#E6E9EE]">{notes.map((n) => (
                <li key={n.id}>
                  <Link href={hrefFor(n)} onClick={() => openOne(n)} className={cn("block px-3 py-2 text-sm hover:bg-[#F7F9FB]", ring, !n.read_at && "bg-[#F3F7FC]")}>
                    <span className={cn("block", !n.read_at && "font-semibold")}>{n.title}</span>
                    {n.body && <span className={cn("block text-xs", muted)}>{n.body}</span>}
                    <span className={cn("block text-[11px]", muted)}>{when(n.created_at)}</span>
                  </Link>
                </li>
              ))}</ul>
            ) : <p className={cn("text-sm", muted)}>No updates yet. You&apos;ll hear here when you&apos;re invited, an event you&apos;re in moves, or a task is assigned to you.</p>}
          </section>
        </div>
      </Sheet>
    </>
  );
}
