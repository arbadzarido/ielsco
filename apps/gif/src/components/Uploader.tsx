"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { beginUploadAction, finishUploadAction } from "@/app/actions/portal";

// Direct-to-storage upload: the server reserves the document and returns a short-lived signed URL; the browser PUTs the
// file there; the server then checks the stored bytes (size and file signature) before accepting it.
export default function Uploader({ kind, accept, label, maxMb, onUploaded }: { kind: string; accept: string; label: string; maxMb: number; onUploaded?: (id: string, name: string) => void }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<{ busy: boolean; msg: string; err: boolean }>({ busy: false, msg: "", err: false });
  const upload = async (file: File) => {
    if (file.size > maxMb * 1024 * 1024) { setState({ busy: false, msg: `Files up to ${maxMb} MB.`, err: true }); return; }
    setState({ busy: true, msg: "Uploading…", err: false });
    const mime = file.type || (file.name.toLowerCase().endsWith(".pptx") ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : "");
    const r = await beginUploadAction({ kind, filename: file.name, mime, size: file.size });
    if ("error" in r && r.error) { setState({ busy: false, msg: r.error, err: true }); return; }
    const ok = r as { documentId: string; url: string; method: string };
    try {
      const res = await fetch(ok.url, { method: "PUT", body: file, headers: { "Content-Type": mime, "x-upsert": "false" } });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setState({ busy: false, msg: "The upload failed. Check your connection and try again.", err: true });
      return;
    }
    const fin = await finishUploadAction(ok.documentId);
    if ("error" in fin && fin.error) { setState({ busy: false, msg: fin.error, err: true }); return; }
    setState({ busy: false, msg: `Uploaded ${file.name}.`, err: false });
    if (input.current) input.current.value = "";
    onUploaded?.(ok.documentId, file.name);
    router.refresh();
  };
  return (
    <div className="field">
      <label className="label" htmlFor={`up-${kind}`}>{label}</label>
      <input id={`up-${kind}`} ref={input} type="file" accept={accept} disabled={state.busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <span className="hint">Up to {maxMb} MB. Stored privately; only you and the GIF team can open it.</span>
      {state.msg && <span className={state.err ? "error" : "hint"} role={state.err ? "alert" : "status"}>{state.msg}</span>}
    </div>
  );
}
