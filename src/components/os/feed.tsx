"use client";

// Comments and activity history for any Company OS record. Both are read through RLS with the record's own access
// rule (os_can_view_entity), so a person sees them exactly when they can see the record.
import { useState } from "react";
import { useDirectory, useQuery, friendlyError } from "./data";
import { useOsMe } from "./OsProvider";
import { Avatar, ErrorLine, btnPrimary, btnGhost, input, muted } from "./ui";
import { fmtDateTime, personLabel } from "@/lib/os/meta";

type Comment = { id: number; author_person_id: string | null; body: string; created_at: string; edited_at: string | null; deleted_at: string | null };
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
  const comments = useQuery<Comment[]>((s) => s.from("os_comments").select("id, author_person_id, body, created_at, edited_at, deleted_at").eq("entity_type", type).eq("entity_id", id).order("created_at"), [type, id]);
  const activity = useQuery<Activity[]>((s) => s.from("os_activity").select("id, at, actor_person_id, action, summary, changes").eq("entity_type", type).eq("entity_id", id).order("at", { ascending: false }).limit(50), [type, id]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function post() {
    if (!body.trim()) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.from("os_comments").insert({ entity_type: type, entity_id: id, body: body.trim() });
    setBusy(false);
    if (error) return setErr(friendlyError(error.message));
    setBody(""); comments.reload(); activity.reload();
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

  return (
    <div className="space-y-6">
      <section aria-labelledby={`c-${id}`}>
        <h2 id={`c-${id}`} className="mb-2 text-sm font-semibold">Comments</h2>
        <ErrorLine message={err ?? comments.error} />
        <ul className="space-y-3" data-testid="os-comments">
          {(comments.data ?? []).filter((c) => !c.deleted_at).map((c) => (
            <li key={c.id} className="flex gap-2.5">
              <Avatar name={personLabel(people, c.author_person_id)} size={26} />
              <div className="min-w-0 flex-1 rounded-lg bg-[#F5F7FA] px-3 py-2">
                <p className="text-xs text-[#66768A]"><span className="font-medium text-[#1F2D3D]">{personLabel(people, c.author_person_id)}</span> · {fmtDateTime(c.created_at)}{c.edited_at ? " · edited" : ""}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.body}</p>
                {c.author_person_id === me.person.id && <button type="button" className={`${btnGhost} -ml-2 mt-1 text-xs`} onClick={() => remove(c)}>Delete</button>}
              </div>
            </li>
          ))}
          {comments.data && !comments.data.some((c) => !c.deleted_at) && <li className={`text-sm ${muted}`}>No comments yet.</li>}
        </ul>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="sr-only" htmlFor={`cb-${id}`}>Add a comment</label>
          <textarea id={`cb-${id}`} rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a comment…" className={input} maxLength={5000} />
          <button type="button" className={btnPrimary} onClick={post} disabled={busy || !body.trim()}>{busy ? "Posting…" : "Comment"}</button>
        </div>
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
