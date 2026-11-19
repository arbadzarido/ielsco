"use client";
import { useActionState } from "react";
import { submitTasksAction, type ActionResult } from "@/app/actions/portal";

export default function TasksForm({ handle, tasks }: { handle: string; tasks: { key: string; title: string }[] }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(submitTasksAction, null);
  return (
    <form action={action} className="form panel" style={{ marginTop: 20, maxWidth: 620 }}>
      <label className="field"><span className="label">Your Instagram username</span><input name="instagram" defaultValue={handle ? `@${handle}` : ""} placeholder="@yourname" autoComplete="off" /></label>
      <fieldset><legend>I have done</legend>
        {tasks.map((t) => <label className="check" key={t.key}><input type="checkbox" name={t.key} /> <span>{t.title}</span></label>)}
      </fieldset>
      {s?.error && <p className="error" role="alert">{s.error}</p>}
      {s?.message && <p className="small" role="status" style={{ color: "var(--ok)" }}>{s.message}</p>}
      <button className="btn btn-primary" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Sending…" : "Send for verification"}</button>
    </form>
  );
}
