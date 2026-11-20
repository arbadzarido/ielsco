"use client";
import { useState, useTransition } from "react";
import { resendGuardianAction } from "@/app/actions/portal";

export function ResendGuardian({ participantId }: { participantId: string }) {
  const [msg, setMsg] = useState<{ t: string; err: boolean } | null>(null);
  const [pending, start] = useTransition();
  return (
    <span style={{ display: "block", marginTop: 6 }}>
      <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => start(async () => {
        const r = await resendGuardianAction(participantId);
        setMsg(r?.error ? { t: r.error, err: true } : { t: r?.message ?? "Sent.", err: false });
      })}>{pending ? "Sending…" : "Resend consent link"}</button>
      {msg && <span className={msg.err ? "error small" : "small"} role="status" style={{ marginLeft: 8 }}>{msg.t}</span>}
    </span>
  );
}
