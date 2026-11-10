"use client";

// Comments and activity history for any Company OS record. Both are read through RLS with the record's own access
// rule (os_can_view_entity), so a person sees them exactly when they can see the record.
import { useState } from "react";
import { useDirectory, useQuery, friendlyError } from "./data";
import { useOsMe } from "./OsProvider";
import { Avatar, ErrorLine, btnPrimary, btnGhost, input, muted } from "./ui";
import { fmtDateTime, personLabel } from "@/lib/os/meta";

type Comment = { id: number; author_person_id: string | null; body: string; created_at: string; edited_at: string | null; deleted_at: string | null; parent_id: number | null; mentions: string[] };

/** People named in a comment as @Name. The database keeps only real, active staff and sends each one a notification
 * that says a comment exists, never its text. */
export function mentionedIn(body: string, people: { id: string; full_name: string; short_name: string | null; org_role: string; status: string }[]): string[] {
  const lower = body.toLowerCase();
  return people.filter((p) => p.org_role !== "guest" && ["active", "onboarding"].includes(p.status)
    && [p.short_name, p.full_name].some((n) => n && new RegExp(`(^|[^\\w@])@${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`).test(lower))).map((p) => p.id);
}
type Activity = { id: number; at: string; actor_person_id: string | null; action: string; summary: string | null; changes: Record<string, { from: unknown; to: unknown }> };

const FIELD_LABEL: Record<string, string> = {
  status: "status", priority: "priority", due_date: "due date", owner_person_id: "owner", title: "title", name: "name",
  description: "description", sensitivity: "sensitivity", division_id: "division", start_date: "start date", stage: "stage",
  project_id: "project", reviewer_person_id: "reviewer", next_action: "next action", blocker: "blocker",
};

export function EntityFeed({ type, id }: { type: string; id: string }) {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const comments = useQuery<Comment[]>((s) => s.from("os_comments").select("id, author_person_id, body, created_at, edited_at, deleted_at, parent_id, mentions").eq("entity_type", type).eq("entity_id", id).order("created_at"), [type, id]);
  const activity = useQuery<Activity[]>((s) => s.from("os_activity").select("id, at, actor_person_id, action, summary, changes").eq("entity_type", type).eq("entity_id", id).order("at", { ascending: false }).limit(50), [type, id]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function post() {
    if (!body.trim()) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from("os_comments").insert({ entity_type: type, entity_id: id, body: body.trim(), parent_id: replyTo?.id ?? null, mentions: mentionedIn(body, dir?.people ?? []) });
    setBusy(false);
    if (error) return setErr(friendlyError(error.message));
    setBody(""); setReplyTo(null); comments.reload(); activity.reload();
  }
  async function remove(c: Comment) {
    const { error } = await supabase.from("os_comments").update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
    if (error) setErr(friendlyError(error.message)); else comments.reload();
  }

  const describe = (a: Activity) => {
    if (a.action === "insert") return "created this";
    if (a.action === "delete") return "deleted this";
    const keys = Object.keys(a.changes ?? {});
    return keys.length ? `changed ${keys.map((k) => {
      const c = a.changes[k];
      const val = (v: unknown) => (k.endsWith("person_id") ? personLabel(people, v as string) : v === null ? "none" : String(v));
      return ["status", "priority", "stage", "due_date", "owner_person_id"].includes(k) ? `${FIELD_LABEL[k] ?? k} to ${val(c.to)}` : FIELD_LABEL[k] ?? k.replace(/_/g, " ");
    }).join(", ")}` : "updated this";
  };

  const live = (comments.data ?? []).filter((c) => !c.deleted_at);
  const withMentions = (text: string) => {
    const names = (dir?.people ?? []).flatMap((p) => [p.short_name, p.full_name]).filter(Boolean).sort((a, b) => b!.length - a!.length) as string[];
    if (!names.length) return text;
    const re = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))(?![\\w])`, "gi");
    return text.split(re).map((part, i) => (i % 2 ? <span key={i} className="font-medium text-[#2F4157]">{part}</span> : part));
  };
  const bubble = (c: Comment, reply = false) => (
    <div className="flex gap-2.5" data-testid={reply ? "os-comment-reply" : "os-comment"}>
      <Avatar name={personLabel(people, c.author_person_id)} size={reply ? 22 : 26} />
      <div className="min-w-0 flex-1 rounded-lg bg-[#F5F7FA] px-3 py-2">
        <p className="text-xs text-[#66768A]"><span className="font-medium text-[#1F2D3D]">{personLabel(people, c.author_person_id)}</span> · {fmtDateTime(c.created_at)}{c.edited_at ? " · edited" : ""}</p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{withMentions(c.body)}</p>
        <div className="-ml-2 mt-1 flex gap-1">
          <button type="button" className={`${btnGhost} min-h-8 text-xs`} onClick={() => { setReplyTo(c.parent_id ? live.find((x) => x.id === c.parent_id) ?? c : c); document.getElementById(`cb-${id}`)?.focus(); }}>Reply</button>
          {c.author_person_id === me.person.id && <button type="button" className={`${btnGhost} min-h-8 text-xs`} onClick={() => remove(c)}>Delete</button>}
        </div>
      </div>
    </div>
  );
  const picking = /(^|\s)@([\w.]*)$/.exec(body);
  const suggestions = picking ? (dir?.people ?? []).filter((p) => p.org_role !== "guest" && ["active", "onboarding"].includes(p.status) && p.id !== me.person.id
    && [p.short_name, p.full_name].some((n) => n?.toLowerCase().startsWith(picking[2].toLowerCase()))).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <section aria-labelledby={`c-${id}`}>
        <h2 id={`c-${id}`} className="mb-2 text-sm font-semibold">Comments</h2>
        <ErrorLine message={err ?? comments.error} />
        <ul className="space-y-3" data-testid="os-comments">
          {live.filter((c) => !c.parent_id || !live.some((x) => x.id === c.parent_id)).map((c) => (
            <li key={c.id}>
              {bubble(c)}
              <ul className="ml-9 mt-2 space-y-2">{live.filter((r) => r.parent_id === c.id).map((r) => <li key={r.id}>{bubble(r, true)}</li>)}</ul>
            </li>
          ))}
          {comments.data && !comments.data.some((c) => !c.deleted_at) && <li className={`text-sm ${muted}`}>No comments yet.</li>}
        </ul>
        {replyTo && (
          <p className={`mt-3 flex items-center gap-2 text-xs ${muted}`} data-testid="os-replying">
            Replying to {personLabel(people, replyTo.author_person_id)}
            <button type="button" className="underline" onClick={() => setReplyTo(null)}>Cancel</button>
          </p>
        )}
        <div className="relative mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="sr-only" htmlFor={`cb-${id}`}>Add a comment</label>
          <textarea id={`cb-${id}`} rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" title="Type @ and a name to mention someone" className={input} maxLength={5000} />
          <button type="button" className={btnPrimary} onClick={post} disabled={busy || !body.trim()}>{busy ? "Posting…" : replyTo ? "Reply" : "Comment"}</button>
          {suggestions.length > 0 && (
            <ul className="absolute bottom-full left-0 z-10 mb-1 w-64 max-w-full rounded-lg border border-[#E1E5EB] bg-white py-1 shadow-lg" data-testid="os-mention-list" aria-label="People to mention">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-[#F3F6F9]"
                    onClick={() => { setBody(body.replace(/@([\w.]*)$/, `@${p.short_name ?? p.full_name} `)); document.getElementById(`cb-${id}`)?.focus(); }}>
                    {p.short_name ?? p.full_name}{p.short_name ? <span className={`ml-1 text-xs ${muted}`}>{p.full_name}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className={`mt-1 text-xs ${muted}`}>Type @ and a name to mention someone.</p>
      </section>
      <section aria-labelledby={`a-${id}`}>
        <h2 id={`a-${id}`} className="mb-2 text-sm font-semibold">Activity</h2>
        <ol className="space-y-1.5 border-l border-[#E6E9EE] pl-3 text-sm" data-testid="os-activity">
          {(activity.data ?? []).map((a) => (
            <li key={a.id} className="text-[#3A4B60]">
              <span className="font-medium text-[#1F2D3D]">{a.actor_person_id ? personLabel(people, a.actor_person_id) : "System"}</span> {describe(a)}
              <span className={`ml-1 text-xs ${muted}`}>{fmtDateTime(a.at)}</span>
            </li>
          ))}
          {activity.data && !activity.data.length && <li className={muted}>No activity recorded yet.</li>}
        </ol>
      </section>
    </div>
  );
}
