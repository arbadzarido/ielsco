"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, FileText, Lock, Plus, UserCheck, Users } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { LinkedEvents } from "@/components/os/linked-events";
import { PersonSelect } from "@/components/os/pickers";
import { useRecruitmentAccess } from "@/components/os/recruitment-access";
import { Badge, Empty, Field, KeyValue, Loading, PageTitle, Section, Select, btn, btnDanger, btnPrimary, input, linkCls, muted, panel } from "@/components/os/ui";
import { roleById } from "@/data/careers/divisions";
import { CAMPAIGN_TASKS } from "@/data/careers/recruitment";
import { countryName } from "@/lib/dashboard/countries";
import { fmtDate, fmtDateTime, personLabel } from "@/lib/os/meta";
import { CANDIDATE_COLUMNS, CRITERIA, EVAL_KINDS, RATINGS, RECOMMENDATIONS, TASK_STATUS_LABEL, overallCampaign, type CandidateRow, type Stage } from "@/lib/os/recruitment";
import { cn } from "@/lib/utils";

type Pipe = { application_id: string; stage: string; reviewer_person_id: string | null; decision_note: string | null; decided_by: string | null; decided_at: string | null; employee_person_id: string | null; converted_at: string | null };
type Assignment = { id: string; person_id: string; role: string; created_at: string; revoked_at: string | null };
type Evaluation = { id: string; author_person_id: string; kind: string; ratings: Record<string, string>; recommendation: string | null; summary: string | null; interview_feedback: string | null; updated_at: string };
type Note = { id: string; author_person_id: string; visibility: string; body: string; created_at: string };
type History = { id: number; from_stage: string | null; to_stage: string; actor_person_id: string | null; note: string | null; at: string };
type TaskRow = { id: string; title: string; status: string; owner_person_id: string | null; due_date: string | null };
const TASK_KEYS = CAMPAIGN_TASKS.map((t) => t.key);
const TASK_PRESETS = ["CV screening", "Interview preparation", "Candidate evaluation", "Follow-up with candidate"];
const roleText = (id: string | null) => { const r = roleById(id); return r ? `${r.title} · ${r.divisionTitle}` : "—"; };

// /os/recruitment/[id]: one candidate. The recruitment team sees everything; an assigned interviewer/reviewer sees a
// brief (no contact details or admin notes) and only their own evaluations and notes. All reads go through RLS.
export default function CandidatePage() {
  const { id } = useParams<{ id: string }>();
  const { me, supabase } = useOsMe();
  const access = useRecruitmentAccess();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const team = !!access?.team, edit = !!access?.edit;
  const myId = me.person.id;

  const app = useQuery<CandidateRow | null>(async (s) => {
    if (team) return s.from("career_applications").select(CANDIDATE_COLUMNS).eq("id", id).maybeSingle();
    const r = await s.rpc("os_recruitment_candidate_brief", { p_app: id });
    return { data: (r.data as CandidateRow | null) ?? null, error: r.error };
  }, [id, team]);
  const pipe = useQuery<Pipe | null>((s) => s.from("os_recruitment_candidates").select("application_id, stage, reviewer_person_id, decision_note, decided_by, decided_at, employee_person_id, converted_at").eq("application_id", id).maybeSingle(), [id]);
  const stages = useQuery<Stage[]>((s) => s.from("os_recruitment_stages").select("key, label, sort, applicant_status, is_final, active").order("sort"), []);
  const assignments = useQuery<Assignment[]>((s) => s.from("os_recruitment_assignments").select("id, person_id, role, created_at, revoked_at").eq("application_id", id).is("revoked_at", null), [id]);
  const evals = useQuery<Evaluation[]>((s) => s.from("os_recruitment_evaluations").select("id, author_person_id, kind, ratings, recommendation, summary, interview_feedback, updated_at").eq("application_id", id).order("updated_at", { ascending: false }), [id]);
  const notes = useQuery<Note[]>((s) => s.from("os_recruitment_notes").select("id, author_person_id, visibility, body, created_at").eq("application_id", id).order("created_at", { ascending: false }), [id]);
  const history = useQuery<History[]>((s) => (team ? s.from("os_recruitment_stage_history").select("id, from_stage, to_stage, actor_person_id, note, at").eq("application_id", id).order("at", { ascending: false }) : Promise.resolve({ data: [], error: null })), [id, team]);
  const tasks = useQuery<TaskRow[]>((s) => s.from("os_tasks").select("id, title, status, owner_person_id, due_date").eq("candidate_id", id).order("created_at", { ascending: false }), [id]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (label: string, p: PromiseLike<{ error: { message: string } | null }>, after?: () => void) => {
    const { error } = await p;
    setMsg(error ? { ok: false, text: `${label}: ${error.message}` } : { ok: true, text: `${label}: saved.` });
    if (!error) after?.();
  };

  const stageList = stages.data ?? [];
  const stageLabel = (k: string | null | undefined) => stageList.find((s) => s.key === k)?.label ?? k ?? "—";
  if (!access || (app.loading && !app.data)) return <Loading />;
  const a = app.data;
  if (!a) return <div><PageTitle title="Candidate" crumbs={[{ href: "/os/recruitment", label: "Recruitment" }]} /><Empty title="Candidate not found" body="Either it doesn't exist or it isn't shared with you." /></div>;
  const p = pipe.data;

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("career-applications").createSignedUrl(path, 120);
    if (error || !data) return setMsg({ ok: false, text: "You can't open this file, or it isn't there." });
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const setTask = (key: string, value: string) => {
    const next = { ...(a.campaign_tasks ?? {}), [key]: value };
    run("Campaign check", supabase.from("career_applications").update({ campaign_tasks: next, campaign_verification: overallCampaign(next, TASK_KEYS) }).eq("id", a.id), app.reload);
  };

  return (
    <div data-testid="os-candidate">
      <PageTitle title={a.full_name} crumbs={[{ href: "/os/recruitment", label: "Recruitment" }]}
        description={`${roleText(a.role_id)}${a.role_2_id ? `  ·  2nd: ${roleText(a.role_2_id)}` : ""}`}
        actions={<Badge tone={p?.stage === "accepted" ? "green" : p?.stage === "rejected" ? "red" : "blue"}>{stageLabel(p?.stage ?? "new")}</Badge>} />
      {msg && <p role="status" className={cn("mb-4 rounded-lg px-3 py-2 text-sm", msg.ok ? "bg-[#E7F4EC] text-[#22663F]" : "bg-[#FCE9E9] text-[#A12D2F]")}>{msg.text}</p>}
      {!team && <p className={cn("mb-4 flex items-center gap-2 rounded-lg bg-[#F5F7FA] px-3 py-2 text-sm", muted)}><Lock size={14} aria-hidden="true" />You were assigned to evaluate this candidate. You see what the evaluation needs; contact details and the team&apos;s notes stay with the recruitment team.</p>}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-6">
          {edit && p && <StageBox p={p} stages={stageList} onSave={(patch, label) => run(label, supabase.from("os_recruitment_candidates").update(patch).eq("application_id", a.id), () => { pipe.reload(); history.reload(); })} />}

          <Section title="Personal information">
            <KeyValue items={[
              { label: "Full name", value: a.full_name },
              ...(team ? [{ label: "Email", value: <a className={linkCls} href={`mailto:${a.email}`}>{a.email}</a> }, { label: "WhatsApp", value: <a className={linkCls} href={`https://wa.me/${(a.whatsapp ?? "").replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer">{a.whatsapp}</a> }] : []),
              { label: "University", value: a.university },
              { label: "Academic year", value: `Year ${a.academic_year}${a.batch_year ? ` · batch ${a.batch_year}` : ""}` },
              { label: "Lives in", value: a.domicile_city ? `${a.domicile_city}, ${a.domicile_country ? countryName(a.domicile_country) : ""}` : "Not given" },
            ]} />
          </Section>

          <Section title="Application">
            <KeyValue items={[
              { label: "1st choice", value: roleText(a.role_id) }, { label: "2nd choice", value: a.role_2_id ? roleText(a.role_2_id) : "None" },
              { label: "Applied", value: fmtDateTime(a.submitted_at ?? a.created_at) }, { label: "Stage", value: stageLabel(p?.stage ?? "new") },
            ]} />
            <h3 className="mt-4 text-xs font-medium text-[#66768A]">Motivation</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-[#1F2D3D]" data-testid="os-candidate-motivation">{a.motivation || "—"}</p>
          </Section>

          <Section title="Profiles and documents">
            <div className="flex flex-wrap gap-2">
              <a className={btn} href={a.instagram_url} target="_blank" rel="noopener noreferrer">Instagram <ExternalLink size={14} aria-hidden="true" /></a>
              <a className={btn} href={a.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn <ExternalLink size={14} aria-hidden="true" /></a>
              <button type="button" className={btn} onClick={() => openFile(a.cv_path)} data-testid="os-candidate-cv"><FileText size={14} aria-hidden="true" />CV (PDF)</button>
              {a.portfolio_path && <button type="button" className={btn} onClick={() => openFile(a.portfolio_path!)}><FileText size={14} aria-hidden="true" />Portfolio (PDF)</button>}
              {a.portfolio_url && <a className={btn} href={a.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio link <ExternalLink size={14} aria-hidden="true" /></a>}
              {!a.portfolio_path && !a.portfolio_url && <span className={cn("self-center text-sm", muted)}>No portfolio (optional for these roles)</span>}
            </div>
            <p className={cn("mt-2 text-xs", muted)}>Files open through a 2-minute private link. Don&apos;t download or forward them outside the recruitment team.</p>
          </Section>

          <Section title={<span>Campaign verification <Badge tone={overallCampaign(a.campaign_tasks, TASK_KEYS) === "verified" ? "green" : overallCampaign(a.campaign_tasks, TASK_KEYS) === "incomplete" ? "red" : "amber"}>{{ verified: "Verified", incomplete: "Incomplete", pending: "To check" }[overallCampaign(a.campaign_tasks, TASK_KEYS)]}</Badge></span>}>
            <p className={cn("mb-2 text-xs", muted)}>Check each task by hand on <a className={linkCls} href={a.instagram_url} target="_blank" rel="noopener noreferrer">the applicant&apos;s Instagram</a>, then record it. The applicant sees each result.</p>
            <ul className="grid gap-1.5 sm:grid-cols-2" data-testid="os-candidate-campaign">
              {CAMPAIGN_TASKS.map((t) => {
                const v = a.campaign_tasks?.[t.key] ?? "pending";
                return (
                  <li key={t.key} className="flex items-center justify-between gap-2 rounded-lg border border-[#E6E9EE] px-2.5 py-1.5 text-sm">
                    <span className="min-w-0 truncate">{t.title}</span>
                    {edit
                      ? <select aria-label={`${t.title}: verification`} value={v} onChange={(e) => setTask(t.key, e.target.value)} className="rounded-md border border-[#DDE2E8] bg-white px-1.5 py-0.5 text-xs" data-testid={`os-task-${t.key}`}>
                          {Object.entries(TASK_STATUS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      : <Badge tone={v === "verified" ? "green" : v === "not_found" ? "red" : "neutral"}>{TASK_STATUS_LABEL[v]}</Badge>}
                  </li>
                );
              })}
            </ul>
          </Section>

          {team && (
            <Section title="Stage history">
              {(history.data ?? []).length ? (
                <ol className="space-y-2 text-sm" data-testid="os-candidate-history">
                  {history.data!.map((h) => (
                    <li key={h.id} className="flex flex-wrap gap-x-2"><span className={muted}>{fmtDateTime(h.at)}</span><span>{h.from_stage ? `${stageLabel(h.from_stage)} → ` : ""}{stageLabel(h.to_stage)}</span><span className={muted}>by {personLabel(people, h.actor_person_id, "—")}</span>{h.note && <span className="w-full text-xs text-[#3A4B60]">{h.note}</span>}</li>
                  ))}
                </ol>
              ) : <p className={cn("text-sm", muted)}>No stage changes yet.</p>}
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <EvaluationBox appId={a.id} myId={myId} evals={evals.data ?? []} people={people} showTeam={team} hasPortfolio={!!(a.portfolio_path || a.portfolio_url)}
            onSave={(row, existing) => run("Evaluation", existing
              ? supabase.from("os_recruitment_evaluations").update(row).eq("id", existing)
              : supabase.from("os_recruitment_evaluations").insert({ application_id: a.id, ...row }), evals.reload)} />

          <Section title="Internal notes">
            <NoteForm onAdd={(body, visibility) => run("Note", supabase.from("os_recruitment_notes").insert({ application_id: a.id, body, visibility }), notes.reload)} team={team} />
            <ul className="mt-3 space-y-2" data-testid="os-candidate-notes">
              {(notes.data ?? []).map((n) => (
                <li key={n.id} className={cn(panel, "p-2.5 text-sm")}>
                  <p className="whitespace-pre-line">{n.body}</p>
                  <p className={cn("mt-1 text-xs", muted)}>{personLabel(people, n.author_person_id)} · {fmtDateTime(n.created_at)} · {n.visibility === "private" ? "Only you" : "Recruitment team"}</p>
                </li>
              ))}
              {!(notes.data ?? []).length && <li className={cn("text-sm", muted)}>No notes yet.</li>}
            </ul>
          </Section>

          {team && (
            <Section title="Reviewers and interviewers">
              <ul className="space-y-1.5 text-sm" data-testid="os-candidate-assignments">
                {(assignments.data ?? []).map((x) => (
                  <li key={x.id} className="flex items-center justify-between gap-2">
                    <span><Users size={14} className="mr-1 inline text-[#66768A]" aria-hidden="true" />{personLabel(people, x.person_id)} <span className={muted}>· {x.role}</span></span>
                    {edit && <button type="button" className={btnDanger} onClick={() => run("Assignment removed", supabase.from("os_recruitment_assignments").update({ revoked_at: new Date().toISOString() }).eq("id", x.id), assignments.reload)}>Remove</button>}
                  </li>
                ))}
                {!(assignments.data ?? []).length && <li className={muted}>Nobody assigned yet.</li>}
              </ul>
              {edit && <AssignForm onAssign={(person_id, role) => run("Assigned", supabase.from("os_recruitment_assignments").insert({ application_id: a.id, person_id, role }), assignments.reload)} />}
            </Section>
          )}

          {(team || (assignments.data ?? []).some((x) => x.person_id === myId)) && (
            <Section title="Interviews">
              <p className={cn("mb-2 text-xs", muted)}>Interviews are Restricted calendar events: only founders, the organiser and invited interviewers see them.</p>
              {edit ? <LinkedEvents type="candidate" id={a.id} company="HQ" defaults={{ title: `Interview: ${a.full_name}`, category: "Meeting", sensitivity: "Restricted" }} />
                : <LinkedEvents type="candidate" id={a.id} company="HQ" />}
            </Section>
          )}

          <Section title="Tasks">
            <ul className="space-y-1.5 text-sm" data-testid="os-candidate-tasks">
              {(tasks.data ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2"><Link href={`/os/tasks/${t.id}`} className="truncate hover:underline">{t.title}</Link><span className={cn("shrink-0 text-xs", muted)}>{personLabel(people, t.owner_person_id, "—")} · {t.status}{t.due_date ? ` · ${fmtDate(t.due_date)}` : ""}</span></li>
              ))}
              {!(tasks.data ?? []).length && <li className={muted}>No tasks yet.</li>}
            </ul>
            {edit && <TaskForm name={a.full_name} onCreate={(title, owner, due) => run("Task", supabase.from("os_tasks").insert({ company_code: "HQ", title, owner_person_id: owner, reviewer_person_id: myId, due_date: due || null, candidate_id: a.id, status: "Ready" }), tasks.reload)} />}
          </Section>

          {me.isAdmin && p?.stage === "accepted" && (
            <Section title="Onboarding">
              {p.employee_person_id
                ? <p className="text-sm"><UserCheck size={14} className="mr-1 inline text-[#22663F]" aria-hidden="true" />Person record <Link className={linkCls} href={`/os/people/${p.employee_person_id}`}>{p.employee_person_id}</Link> created {fmtDate(p.converted_at)}. Approve them in Admin after their first Google sign-in.</p>
                : <ConvertForm onConvert={(email, companies, division) => run("Person record", supabase.rpc("os_recruitment_convert", { p_app: a.id, p_google_account: email, p_companies: companies, p_division: division || null }), pipe.reload)} />}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function StageBox({ p, stages, onSave }: { p: Pipe; stages: Stage[]; onSave: (patch: Partial<Pipe>, label: string) => void }) {
  const [stage, setStage] = useState(p.stage);
  const [note, setNote] = useState("");
  useEffect(() => setStage(p.stage), [p.stage]);
  const final = stages.find((s) => s.key === stage)?.is_final;
  return (
    <div className={cn(panel, "grid gap-3 p-3 md:grid-cols-[1fr_1fr_auto] md:items-end")} data-testid="os-candidate-stage">
      <Field label="Stage">{(id) => <Select id={id} value={stage} onChange={setStage} options={stages.filter((s) => s.active || s.key === p.stage).map((s) => ({ value: s.key, label: s.label }))} />}</Field>
      <Field label="Reviewer">{(id) => <PersonSelect id={id} value={p.reviewer_person_id ?? ""} onChange={(v) => onSave({ reviewer_person_id: v || null }, "Reviewer")} />}</Field>
      <div className="md:col-span-3">
        <Field label={final ? "Decision note (recorded with the decision)" : "Note for the stage change (optional)"}>{(id) => <input id={id} className={input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />}</Field>
      </div>
      <div className="md:col-span-3 flex flex-wrap items-center gap-2">
        <button type="button" className={btnPrimary} disabled={stage === p.stage} onClick={() => { onSave({ stage, decision_note: note.trim() || null }, "Stage"); setNote(""); }} data-testid="os-candidate-stage-save">Move to {stages.find((s) => s.key === stage)?.label ?? stage}</button>
        {p.decided_at && <span className="text-xs text-[#66768A]">Decision recorded {fmtDateTime(p.decided_at)}{p.decision_note ? `: ${p.decision_note}` : ""}</span>}
      </div>
    </div>
  );
}

function EvaluationBox({ appId, myId, evals, people, showTeam, hasPortfolio, onSave }: {
  appId: string; myId: string; evals: Evaluation[]; people: Map<string, { full_name: string; short_name: string | null }>; showTeam: boolean; hasPortfolio: boolean;
  onSave: (row: Omit<Evaluation, "id" | "author_person_id" | "updated_at">, existingId: string | null) => void;
}) {
  const [kind, setKind] = useState("screening");
  const mine = evals.find((e) => e.author_person_id === myId && e.kind === kind) ?? null;
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [rec, setRec] = useState("");
  const [summary, setSummary] = useState("");
  const [feedback, setFeedback] = useState("");
  useEffect(() => {
    setRatings(mine?.ratings ?? (hasPortfolio ? {} : { portfolio_quality: "not_applicable" }));
    setRec(mine?.recommendation ?? ""); setSummary(mine?.summary ?? ""); setFeedback(mine?.interview_feedback ?? "");
  }, [mine, kind, hasPortfolio, appId]);
  const others = useMemo(() => evals.filter((e) => e.author_person_id !== myId), [evals, myId]);
  return (
    <Section title="Evaluation">
      <div className="space-y-3" data-testid="os-candidate-evaluation">
        <Field label="Evaluation">{(id) => <Select id={id} value={kind} onChange={setKind} options={EVAL_KINDS} />}</Field>
        <div className="grid gap-2 sm:grid-cols-2">
          {CRITERIA.map((c) => (
            <Field key={c.key} label={c.label} hint={c.hint}>{(id) => <Select id={id} value={ratings[c.key] ?? ""} onChange={(v) => setRatings((r) => { const n = { ...r }; if (v) n[c.key] = v; else delete n[c.key]; return n; })} options={RATINGS} placeholder="Not rated" />}</Field>
          ))}
        </div>
        <Field label="Recommendation">{(id) => <Select id={id} value={rec} onChange={setRec} options={RECOMMENDATIONS} placeholder="No recommendation yet" />}</Field>
        <Field label="Summary">{(id) => <textarea id={id} className={input} rows={3} maxLength={4000} value={summary} onChange={(e) => setSummary(e.target.value)} />}</Field>
        {kind === "interview" && <Field label="Interview feedback">{(id) => <textarea id={id} className={input} rows={4} maxLength={6000} value={feedback} onChange={(e) => setFeedback(e.target.value)} data-testid="os-eval-feedback" />}</Field>}
        <div className="flex items-center gap-2">
          <button type="button" className={btnPrimary} onClick={() => onSave({ kind, ratings, recommendation: rec || null, summary: summary.trim() || null, interview_feedback: kind === "interview" ? feedback.trim() || null : null } as never, mine?.id ?? null)} data-testid="os-eval-save">{mine ? "Update my evaluation" : "Save my evaluation"}</button>
          <span className="text-xs text-[#66768A]">Words, not scores. Nothing is totalled or ranked; decisions are made by the team.</span>
        </div>
      </div>
      {showTeam && others.length > 0 && (
        <div className="mt-5 border-t border-[#E6E9EE] pt-4">
          <h3 className="mb-2 text-xs font-medium text-[#66768A]">From the team</h3>
          <ul className="space-y-2">
            {others.map((e) => (
              <li key={e.id} className={cn(panel, "p-2.5 text-sm")}>
                <p className="font-medium">{personLabel(people, e.author_person_id)} · {EVAL_KINDS.find((k) => k.value === e.kind)?.label}{e.recommendation ? ` · ${RECOMMENDATIONS.find((r) => r.value === e.recommendation)?.label}` : ""}</p>
                <p className={cn("mt-1 text-xs", muted)}>{CRITERIA.filter((c) => e.ratings[c.key]).map((c) => `${c.label}: ${RATINGS.find((r) => r.value === e.ratings[c.key])?.label}`).join(" · ") || "No ratings"}</p>
                {e.summary && <p className="mt-1 whitespace-pre-line">{e.summary}</p>}
                {e.interview_feedback && <p className="mt-1 whitespace-pre-line text-[#3A4B60]">{e.interview_feedback}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function NoteForm({ onAdd, team }: { onAdd: (body: string, visibility: string) => void; team: boolean }) {
  const [body, setBody] = useState("");
  const [vis, setVis] = useState(team ? "team" : "private");
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (body.trim()) { onAdd(body.trim(), vis); setBody(""); } }} className="space-y-2">
      <label className="sr-only" htmlFor="note-body">New note</label>
      <textarea id="note-body" className={input} rows={2} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note" data-testid="os-note-body" />
      <div className="flex items-center gap-2">
        <Select ariaLabel="Who can see the note" value={vis} onChange={setVis} options={[...(team ? [{ value: "team", label: "Recruitment team" }] : []), { value: "private", label: "Only me" }]} className="w-48" />
        <button type="submit" className={btn} data-testid="os-note-add"><Plus size={14} aria-hidden="true" />Add note</button>
      </div>
    </form>
  );
}

function AssignForm({ onAssign }: { onAssign: (person: string, role: string) => void }) {
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("interviewer");
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
      <PersonSelect value={person} onChange={setPerson} placeholder="Choose a person" ariaLabel="Person to assign" />
      <Select ariaLabel="Assignment" value={role} onChange={setRole} options={[{ value: "interviewer", label: "Interviewer" }, { value: "reviewer", label: "Reviewer" }]} />
      <button type="button" className={btn} disabled={!person} onClick={() => { onAssign(person, role); setPerson(""); }} data-testid="os-assign">Assign</button>
    </div>
  );
}

function TaskForm({ name, onCreate }: { name: string; onCreate: (title: string, owner: string, due: string) => void }) {
  const [preset, setPreset] = useState(TASK_PRESETS[0]);
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      <Select ariaLabel="Task" value={preset} onChange={setPreset} options={TASK_PRESETS} />
      <PersonSelect value={owner} onChange={setOwner} placeholder="Owner" ariaLabel="Task owner" />
      <input type="date" className={input} value={due} onChange={(e) => setDue(e.target.value)} aria-label="Due date" />
      <button type="button" className={btn} disabled={!owner} onClick={() => { onCreate(`${preset}: ${name}`.slice(0, 200), owner, due); setOwner(""); setDue(""); }} data-testid="os-task-create"><Plus size={14} aria-hidden="true" />Create task</button>
      <p className="text-xs text-[#66768A] sm:col-span-2">Recruitment tasks are Restricted: the owner, you (as reviewer) and founders see them.</p>
    </div>
  );
}

function ConvertForm({ onConvert }: { onConvert: (email: string, companies: string[], division: string) => void }) {
  const [email, setEmail] = useState("");
  const [companies, setCompanies] = useState<string[]>(["IEL"]);
  const [division, setDivision] = useState("");
  const dir = useDirectory();
  return (
    <form onSubmit={(e) => { e.preventDefault(); onConvert(email.trim(), companies, division); }} className="space-y-2" data-testid="os-convert">
      <p className="text-sm text-[#3A4B60]">Create their Company OS person record. It starts as <strong>invited</strong>: they get access only after signing in with this Google account and your approval in Admin, like any invitation.</p>
      <input type="email" required className={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work Google email" aria-label="Work Google email" />
      <div className="flex flex-wrap gap-3 text-sm">
        {[["IEL", "IELSco"], ["ELC", "Elco AI"]].map(([c, l]) => (
          <label key={c} className="flex items-center gap-1.5"><input type="checkbox" className="h-4 w-4" checked={companies.includes(c)} onChange={(e) => setCompanies((x) => (e.target.checked ? [...x, c] : x.filter((y) => y !== c)))} />{l}</label>
        ))}
      </div>
      <Select ariaLabel="Division" value={division} onChange={setDivision} options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} placeholder="No division yet" />
      <button type="submit" className={btnPrimary} disabled={!email || !companies.length}>Create invited person record</button>
    </form>
  );
}
