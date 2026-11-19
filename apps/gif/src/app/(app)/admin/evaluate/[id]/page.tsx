import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { CRITERIA } from "@/lib/validation";
import { SELECTION_CRITERIA } from "@/lib/content";
import { ActionForm, DocLink } from "@/components/ActionForm";
import { documentLinkAction, scoreAction } from "@/app/actions/admin";

export default async function Score({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireStaff("evaluate");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const assigned = await one("select 1 from gif.evaluator_assignments where application_id = $1 and evaluator_email = $2", [id, a.email]);
  if (!assigned && a.staffRole === "evaluator") notFound();
  const app = await one<{ code: string; pathway: string; team_name: string | null; project_title: string | null; project_idea: string | null }>("select code, pathway, team_name, project_title, project_idea from gif.applications where id = $1", [id]);
  if (!app) notFound();
  const subs = await q<{ phase: number; essay_text: string | null; essay_doc_id: string | null; deck_doc_id: string | null; video_url: string | null; video_doc_id: string | null; notes: string | null; submitted_at: string | null }>(
    "select phase, essay_text, essay_doc_id, deck_doc_id, video_url, video_doc_id, notes, submitted_at from gif.submissions where application_id = $1 and submitted_at is not null order by phase", [id]);
  const mine = await one<{ scores: Record<string, number>; feedback: string | null }>("select scores, feedback from gif.evaluations where application_id = $1 and evaluator_email = $2", [id, a.email]);
  return (
    <>
      <p className="small"><Link href="/admin/evaluate">← My evaluations</Link></p>
      <h1>{app.code}{app.team_name ? ` · ${app.team_name}` : ""}</h1>
      <p className="muted">{app.pathway === "mentoring" ? "Mentoring Program mentee (Phase 3 entry)" : "Fully Funded applicant"}</p>
      {app.project_title && <h2>{app.project_title}</h2>}
      {app.project_idea && <p style={{ whiteSpace: "pre-wrap" }}>{app.project_idea}</p>}
      {subs.map((s) => (
        <div key={s.phase} className="item" style={{ marginTop: 16 }}>
          <h3>Phase {s.phase}</h3>
          {s.essay_text && <details><summary>Essay</summary><p style={{ whiteSpace: "pre-wrap" }}>{s.essay_text}</p></details>}
          {s.video_url && <p><a href={s.video_url} target="_blank" rel="noopener noreferrer">Open video link</a></p>}
          {[["essay", s.essay_doc_id], ["deck", s.deck_doc_id], ["video", s.video_doc_id]].filter(([, x]) => x).map(([k, x]) => <DocLink key={x!} id={x!} label={`Open ${k}`} action={documentLinkAction} />)}
          {s.notes && <p className="small muted">Applicant notes: {s.notes}</p>}
        </div>
      ))}
      <h2>Your scores</h2>
      <ActionForm action={scoreAction} submit="Save scores">
        <input type="hidden" name="application_id" value={id} />
        <div className="fields-2">
          {CRITERIA.map((c, i) => (
            <label className="field" key={c.key}><span className="label">{c.label} (1–10)</span>
              <input name={c.key} type="number" min={1} max={10} step={1} required defaultValue={mine?.scores?.[c.key] ?? ""} />
              <span className="hint">{SELECTION_CRITERIA[i][1]}</span></label>
          ))}
        </div>
        <label className="field"><span className="label">Feedback</span><textarea name="feedback" rows={5} defaultValue={mine?.feedback ?? ""} /></label>
      </ActionForm>
    </>
  );
}
