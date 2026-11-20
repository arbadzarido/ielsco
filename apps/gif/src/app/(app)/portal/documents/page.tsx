import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { UPLOAD_RULES } from "@/lib/validation";
import { bytes, fmtDateTime } from "@/lib/format";
import Uploader from "@/components/Uploader";
import { DeleteDoc } from "./DeleteDoc";

const GENERAL = ["student_id", "passport", "payment_proof", "onboarding"];

export default async function Documents() {
  const c = await portalContext("/portal/documents");
  const { app, detail } = c;
  if (!app || !detail) redirect("/portal");
  const docs = detail.documents;
  return (
    <>
      <h1>Documents</h1>
      <p className="muted">Upload documents when we ask for them (for example a student ID to verify eligibility, a passport during preparation, or a bank transfer proof). Phase submissions are uploaded on their own pages.</p>
      {app.document_status === "needs_attention" && <div className="notice warn"><p>We need a document from you. Check your email for details, then upload it here.</p></div>}
      <div className="grid g2" style={{ marginTop: 20 }}>
        {GENERAL.map((k) => <div className="panel" key={k}><Uploader kind={k} label={UPLOAD_RULES[k].label} maxMb={UPLOAD_RULES[k].maxMb} accept={UPLOAD_RULES[k].mimes.join(",")} /></div>)}
      </div>
      <h2>Your files</h2>
      {docs.length === 0 ? <p className="muted">No files yet.</p> : (
        <div className="table-wrap"><table className="t compact">
          <thead><tr><th>File</th><th>Type</th><th>Size</th><th>Uploaded</th><th>Review</th><th></th></tr></thead>
          <tbody>{docs.map((d) => (
            <tr key={d.id}><td>{d.filename}</td><td>{UPLOAD_RULES[d.kind]?.label ?? d.kind}</td><td>{bytes(d.size_bytes)}</td><td>{fmtDateTime(d.created_at)}</td>
              <td><span className={`badge ${d.status === "verified" ? "ok" : d.status === "rejected" ? "err" : ""}`}>{d.status === "uploaded" ? "Received" : d.status}</span>{d.review_note && <div className="tiny muted">{d.review_note}</div>}</td>
              <td>{d.status !== "verified" && <DeleteDoc id={d.id} />}</td></tr>
          ))}</tbody>
        </table></div>
      )}
    </>
  );
}
