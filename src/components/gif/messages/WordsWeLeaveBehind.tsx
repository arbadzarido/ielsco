"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Check, Heart, Loader2, Mail, MailOpen, Send, Sparkles, Users } from "lucide-react";
import { btnLink, btnPrimary, card, cardGloss, focusRing, inputClass } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { MESSAGE_TARGET } from "@/lib/gif/eligibility";
import { CardStudio } from "./CardStudio";
import { SkeletonList, SkeletonRegion } from "@/components/feedback/Skeleton";

interface Recipient { delegate_id: string; full_name: string; team_name: string }
interface Received { id: string; body: string; created_at: string; read_at: string | null; favourite: boolean; wall_status: string; sender_allows_wall: boolean }
interface Sent { id: string; recipient_name: string | null; recipient_staff: string | null; body: string; created_at: string; hidden: boolean }
interface WallItem { id: string; body: string; recipient_first_name: string; created_at: string }

const STAFF = [
  { key: "arba", label: "Arba — IELSco Founder" },
  { key: "farrel", label: "Farrel — Elco AI COO" },
] as const;
const PROMPTS = [
  "Something I appreciate about you…", "One moment with you that I will remember…", "Something I wish for your future…",
  "One thing I learned from you…", "A message I never got the chance to say…",
];
const dateOf = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// Words We Leave Behind: anonymous to recipients. Everything goes through SECURITY DEFINER functions; the sender is
// never part of any response a delegate receives.
export function WordsWeLeaveBehind({ supabase, myFirstName, onChanged }: { supabase: SupabaseClient; myFirstName: string; onChanged: () => void }) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [received, setReceived] = useState<Received[]>([]);
  const [sent, setSent] = useState<Sent[]>([]);
  const [wall, setWall] = useState<WallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [allowWall, setAllowWall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [studio, setStudio] = useState<Received | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "favourite">("all");

  const load = useCallback(async () => {
    const [r, rec, s, w] = await Promise.all([
      supabase.rpc("gif_message_recipients"), supabase.rpc("gif_my_received_messages"), supabase.rpc("gif_my_sent_messages"), supabase.rpc("gif_wall_messages"),
    ]);
    setRecipients((r.data ?? []) as Recipient[]); setReceived((rec.data ?? []) as Received[]); setSent((s.data ?? []) as Sent[]); setWall((w.data ?? []) as WallItem[]);
    setLoading(false);
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  const sentTo = new Set(sent.map((m) => m.recipient_staff ?? m.recipient_name));
  const delegatesDone = new Set(sent.filter((m) => !m.recipient_staff && !m.hidden).map((m) => m.recipient_name)).size;
  const arbaDone = sent.some((m) => m.recipient_staff === "arba" && !m.hidden), farrelDone = sent.some((m) => m.recipient_staff === "farrel" && !m.hidden);
  const counted = Math.min(delegatesDone, 3) + (arbaDone ? 1 : 0) + (farrelDone ? 1 : 0);
  const alreadySent = (key: string) => {
    if (key === "arba" || key === "farrel") return sent.some((m) => m.recipient_staff === key);
    const r = recipients.find((x) => x.delegate_id === key);
    return !!r && sentTo.has(r.full_name);
  };

  const send = async () => {
    setNote(null);
    if (!to) { setNote({ ok: false, text: "Choose who the message is for." }); return; }
    if (body.trim().length < 10) { setNote({ ok: false, text: "Please write at least a sentence." }); return; }
    setBusy(true);
    const isStaff = to === "arba" || to === "farrel";
    const { error } = await supabase.rpc("gif_send_message", {
      p_recipient_delegate: isStaff ? null : to, p_recipient_staff: isStaff ? to : null, p_body: body.trim(), p_allow_wall: allowWall,
    });
    setBusy(false);
    if (error) { setNote({ ok: false, text: error.message }); return; }
    setNote({ ok: true, text: "Sent anonymously. Thank you for leaving these words." });
    setBody(""); setTo(""); setAllowWall(false);
    await load(); onChanged();
  };

  const update = async (m: Received, patch: { read?: boolean; favourite?: boolean; wall?: boolean }) => {
    await supabase.rpc("gif_update_received_message", { p_id: m.id, p_read: patch.read ?? null, p_favourite: patch.favourite ?? null, p_request_wall: patch.wall ?? null });
    await load();
  };
  const openCard = (m: Received) => { setStudio(m); if (!m.read_at) void update(m, { read: true }); };

  if (loading) return <SkeletonRegion label="Loading messages"><SkeletonList rows={2} /></SkeletonRegion>;
  const shown = received.filter((m) => filter === "all" || (filter === "unread" ? !m.read_at : m.favourite));

  return (
    <div className="space-y-6" data-testid="gif-words">
      <header className="rounded-3xl bg-gradient-to-br from-[#FBF3EA] via-[#FDF8F3] to-[#F3EEF8] p-5 sm:p-7">
        <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-[#B4383A]/80">Words We Leave Behind</p>
        <h2 className="mt-1 font-serif text-2xl leading-snug text-[#2B2723] sm:text-3xl">Some of the most meaningful things we carry home are the words people leave with us.</h2>
        <div className="mt-4 flex flex-wrap gap-2 text-[13px]" data-testid="gif-message-progress">
          <span className="rounded-full bg-white px-3 py-1.5 font-semibold">Messages sent: {counted}/5</span>
          <span className={cn("rounded-full px-3 py-1.5", delegatesDone >= 3 ? "bg-[#E8F3EE] text-[#2E6B4F]" : "bg-white")}>Delegates {Math.min(delegatesDone, 3)}/{MESSAGE_TARGET.delegates}</span>
          <span className={cn("rounded-full px-3 py-1.5", arbaDone ? "bg-[#E8F3EE] text-[#2E6B4F]" : "bg-white")}>Arba {arbaDone ? 1 : 0}/1</span>
          <span className={cn("rounded-full px-3 py-1.5", farrelDone ? "bg-[#E8F3EE] text-[#2E6B4F]" : "bg-white")}>Farrel {farrelDone ? 1 : 0}/1</span>
        </div>
      </header>

      <section className={cn(cardGloss, "space-y-4 p-5 sm:p-6")} aria-labelledby="gif-write-heading">
        <h3 id="gif-write-heading" className="text-lg font-bold">Who would you like to leave a message for?</h3>
        <label className="block">
          <span className="sr-only">Recipient</span>
          <select className={cn(inputClass, "text-base")} value={to} onChange={(e) => setTo(e.target.value)} data-testid="gif-message-to">
            <option value="">Choose a person…</option>
            <optgroup label="Programme team">
              {STAFF.map((s) => <option key={s.key} value={s.key} disabled={alreadySent(s.key)}>{s.label}{alreadySent(s.key) ? " · sent ✓" : ""}</option>)}
            </optgroup>
            <optgroup label="GIF 2026 delegates">
              {recipients.map((r) => <option key={r.delegate_id} value={r.delegate_id} disabled={alreadySent(r.delegate_id)}>{r.full_name} · {r.team_name}{alreadySent(r.delegate_id) ? " · sent ✓" : ""}</option>)}
            </optgroup>
          </select>
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Writing prompts">
          {PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => setBody((b) => (b.trim() ? b : p.replace("…", " ")))}
              className={cn("shrink-0 rounded-full border border-[#E8DCCF] bg-[#FFFBF6] px-3 py-1.5 text-[13px] text-[#6B5A4A] hover:border-[#C4643F]", focusRing)}>{p}</button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Your message</span>
          <textarea rows={5} maxLength={1500} className={cn(inputClass, "font-serif text-[17px] leading-relaxed")} placeholder="Write it the way you'd say it…" value={body} onChange={(e) => setBody(e.target.value)} data-testid="gif-message-body" />
          <span className="mt-1 block text-right text-[12px] text-[#2F4157]/50">{body.length}/1500</span>
        </label>
        <label className="flex items-start gap-3 text-[14px] text-[#2F4157]/80">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#2F4157]" checked={allowWall} onChange={(e) => setAllowWall(e.target.checked)} />
          If they choose to share it, this message may appear on the GIF community wall (still anonymous, after Arba approves it).
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="button" className={cn(btnPrimary, "w-full sm:w-auto")} disabled={busy} onClick={() => void send()} data-testid="gif-message-send">
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send anonymously
          </button>
          {note && <p role="status" className={cn("text-[14px] font-medium", note.ok ? "text-[#2E6B4F]" : "text-[#B4383A]")}>{note.text}</p>}
        </div>
        <p className="text-[12px] leading-relaxed text-[#2F4157]/55">Recipients never see your name. IELSco stores who sent each message only to check the GIF requirement and to keep the space safe; only IELSco administrators can see it. One message per person.</p>
        {sent.length > 0 && (
          <details className="text-[14px]">
            <summary className="cursor-pointer font-semibold text-[#577E90]">Messages you&apos;ve sent ({sent.length})</summary>
            <ul className="mt-2 space-y-2">
              {sent.map((m) => (
                <li key={m.id} className="rounded-xl bg-[#F7F8FA] p-3">
                  <p className="text-[13px] font-semibold">To {m.recipient_staff === "arba" ? "Arba" : m.recipient_staff === "farrel" ? "Farrel" : m.recipient_name}{m.hidden ? " · hidden by a moderator" : ""}</p>
                  <p className="mt-1 whitespace-pre-line text-[#2F4157]/80">{m.body}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="gif-received-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="gif-received-heading" className="text-lg font-bold">Messages left for you</h3>
          <div className="flex gap-1.5" role="group" aria-label="Filter messages">
            {(["all", "unread", "favourite"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
                className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold capitalize", focusRing, filter === k ? "border-[#2F4157] bg-[#2F4157] text-white" : "border-[#E3E7ED] bg-white")}>{k === "favourite" ? "Favourites" : k}</button>
            ))}
          </div>
        </div>
        {!received.length ? (
          <p className={cn(card, "p-6 text-center text-[15px] text-[#2F4157]/65")}>No messages yet. When someone leaves you words, they appear here.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="gif-received-list">
            {shown.map((m) => (
              <li key={m.id} className={cn("relative flex min-w-0 flex-col rounded-3xl border p-5", m.read_at ? "border-[#EFE6DA] bg-[#FFFCF7]" : "border-[#E9C9B6] bg-[#FFF6EE] shadow-[0_8px_24px_rgba(196,100,63,0.12)]")}>
                <div className="mb-2 flex items-center justify-between gap-2 text-[12px] text-[#8A7766]">
                  <span className="inline-flex items-center gap-1">{m.read_at ? <MailOpen size={14} /> : <Mail size={14} />} Anonymous · GIF 2026</span>
                  <span>{dateOf(m.created_at)}</span>
                </div>
                <p className="line-clamp-6 whitespace-pre-line break-words font-serif text-[17px] leading-relaxed text-[#2B2723]">{m.body}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" className={cn(btnPrimary, "px-4 py-2 text-[14px]")} onClick={() => openCard(m)} data-testid="gif-open-card"><Sparkles size={16} /> Make a Story card</button>
                  <button type="button" aria-pressed={m.favourite} aria-label={m.favourite ? "Remove from favourites" : "Add to favourites"} onClick={() => void update(m, { favourite: !m.favourite })}
                    className={cn("rounded-full p-2", focusRing, m.favourite ? "text-[#D45D7E]" : "text-[#2F4157]/40 hover:text-[#D45D7E]")}><Heart size={20} className={m.favourite ? "fill-current" : ""} /></button>
                  <button type="button" className={cn(btnLink, "text-[13px]")} onClick={() => void update(m, { read: !m.read_at })}>{m.read_at ? "Mark unread" : "Mark read"}</button>
                </div>
                {m.sender_allows_wall && (
                  <label className="mt-3 flex items-center gap-2 text-[13px] text-[#6B5A4A]">
                    <input type="checkbox" className="h-4 w-4 accent-[#2F4157]" checked={m.wall_status === "requested" || m.wall_status === "approved"}
                      onChange={(e) => void update(m, { wall: e.target.checked })} />
                    Share on the community wall {m.wall_status === "approved" ? "· on the wall ✓" : m.wall_status === "requested" ? "· waiting for approval" : ""}
                  </label>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="gif-wall-heading">
        <h3 id="gif-wall-heading" className="flex items-center gap-2 text-lg font-bold"><Users size={18} /> Community wall</h3>
        {wall.length ? (
          <ul className="columns-1 gap-3 sm:columns-2 [&>li]:mb-3">
            {wall.map((w) => (
              <li key={w.id} className="break-inside-avoid rounded-3xl bg-[#F3EEF8] p-5">
                <p className="whitespace-pre-line break-words font-serif text-[16px] leading-relaxed text-[#2F2650]">{w.body}</p>
                <p className="mt-3 text-[12px] text-[#6E6491]">To {w.recipient_first_name} · from someone at GIF 2026</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-[14px] text-[#2F4157]/60">Messages appear here only when the writer allowed it, the recipient chose to share it and Arba approved it.</p>}
      </section>

      {studio && <CardStudio input={{ message: studio.body, seed: studio.id, recipientFirstName: myFirstName }} onClose={() => setStudio(null)} />}
      <span className="sr-only" aria-live="polite">{counted >= 5 ? "Message requirement complete" : ""}</span>
      {counted >= 5 && <p className="flex items-center gap-2 text-[14px] font-semibold text-[#2E6B4F]"><Check size={16} /> All five messages are in. Arba will verify the requirement.</p>}
    </div>
  );
}
