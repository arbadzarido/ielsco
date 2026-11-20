import Link from "next/link";
import type { PortalCtx } from "@/lib/portal";
import { eligibleFor, phaseWindow } from "@/lib/phases";
import { fmtDateTime } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/status";
import PhaseForm from "./PhaseForm";

export function PhasePage({ c, phase }: { c: PortalCtx; phase: 2 | 3 }) {
  const app = c.app!;
  const detail = c.detail!;
  const w = phaseWindow(phase, c.cohort.settings);
  const sub = detail.submissions.find((s) => s.phase === phase);
  const eligible = eligibleFor(phase, app);
  const submitted = !!sub?.submitted_at;
  const docs = detail.documents.filter((d) => d.kind.startsWith(`phase${phase}`)).map((d) => ({ id: d.id, filename: d.filename, kind: d.kind }));
  const canEdit = c.isOwner && eligible && w.open && !submitted;
  return (
    <>
      <div className="eyebrow">{app.code}</div>
      <h1>Phase {phase}: {phase === 2 ? "project essay and pitch deck" : "video presentation (3–5 minutes)"}</h1>
      <p className="lead">Window: {fmtDateTime(w.opensAt)} – {fmtDateTime(w.closesAt)}.{phase === 3 && " Evaluation follows over the next 4 days."}</p>
      {submitted && <div className="notice ok"><p>Submitted {fmtDateTime(sub!.submitted_at)}. Thank you.</p></div>}
      {!submitted && !eligible && <div className="notice"><p>{phase === 3 && app.pathway === "fully_funded" ? "Phase 3 is available after you submit Phase 2." : phase === 2 ? "Phase 2 is available after Phase 1 is complete (your Elco Pro payment is verified)." : "Phase 3 is available once your mentoring enrolment is paid."} Current status: {STATUS_LABEL[app.status]}.</p></div>}
      {!submitted && eligible && w.before && <div className="notice"><p>This phase opens {fmtDateTime(w.opensAt)}. Read the guidelines below and prepare now.</p></div>}
      {!submitted && eligible && w.after && <div className="notice err"><p>The deadline has passed.</p></div>}
      {!c.isOwner && <div className="notice"><p>Your team leader submits for the whole team.</p></div>}

      <h2>Guidelines</h2>
      {phase === 2 ? (
        <ul>
          <li><strong>Essay</strong> (PDF up to 10 MB, or written below; at least 300 characters, we suggest 800–1,500 words): the problem and who it affects, with evidence; your solution and what is new about it; the impact you expect and how you will measure it; your plan, resources and budget outline; how the project continues after GIF; your team.</li>
          <li><strong>Pitch deck</strong> (PDF or PPTX up to 25 MB, 10–12 slides): problem, solution, impact, feasibility, sustainability, team.</li>
          <li>Evaluated on: problem identification, innovation, impact, feasibility, sustainability, leadership and teamwork, presentation. See <Link href="/selection-process">Selection Process</Link>.</li>
        </ul>
      ) : (
        <ul>
          <li>Record a video presentation of your project, 3–5 minutes long. Teams may present together.</li>
          <li>Share an unlisted YouTube, Vimeo, Loom or Google Drive link, or upload MP4/MOV up to 100 MB.</li>
          <li>You have 3 days to record and submit. Evaluators score the same seven criteria as Phase 2.</li>
        </ul>
      )}
      <h2>Your submission</h2>
      <div className="panel">
        <PhaseForm phase={phase} canEdit={canEdit} docs={docs} initial={{ essayText: sub?.essay_text, essayDocId: sub?.essay_doc_id, deckDocId: sub?.deck_doc_id, videoUrl: sub?.video_url, videoDocId: sub?.video_doc_id, notes: sub?.notes }} />
      </div>
    </>
  );
}
