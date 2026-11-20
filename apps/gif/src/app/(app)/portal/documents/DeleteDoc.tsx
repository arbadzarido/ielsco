"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDocumentAction } from "@/app/actions/portal";

export function DeleteDoc({ id }: { id: string }) {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => start(async () => {
        if (!confirm("Remove this file?")) return;
        const r = await deleteDocumentAction(id);
        if ("error" in r && r.error) setErr(r.error); else router.refresh();
      })}>Remove</button>
      {err && <span className="error tiny">{err}</span>}
    </>
  );
}
