"use client";
import { useActionState, useState } from "react";

type Result = { ok?: boolean; error?: string; message?: string; url?: string } | null;
type Action = (prev: Result, fd: FormData) => Promise<Result>;

// Generic form for admin server actions: shows the action's error or message next to the button.
export function ActionForm({ action, children, submit = "Save", className = "form", inline = false, danger = false }:
  { action: Action; children?: React.ReactNode; submit?: string; className?: string; inline?: boolean; danger?: boolean }) {
  const [s, act, pending] = useActionState<Result, FormData>(action, null);
  return (
    <form action={act} className={className} style={inline ? { display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" } : undefined}>
      {children}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className={`btn ${danger ? "btn-danger" : "btn-primary"} btn-sm`} disabled={pending}>{pending ? "Working…" : submit}</button>
        {s?.error && <span className="error small" role="alert">{s.error}</span>}
        {s?.message && <span className="small" role="status" style={{ color: "var(--ok)" }}>{s.message}</span>}
      </div>
    </form>
  );
}

export function DocLink({ id, label, action }: { id: string; label: string; action: (id: string) => Promise<Result> }) {
  const [err, setErr] = useState("");
  return (
    <>
      <button type="button" className="btn btn-quiet btn-sm" onClick={async () => {
        const r = await action(id);
        if (r?.url) window.open(r.url, "_blank", "noopener"); else setErr(r?.error ?? "Could not open.");
      }}>{label}</button>
      {err && <span className="error tiny">{err}</span>}
    </>
  );
}
