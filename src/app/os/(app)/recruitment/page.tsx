"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { useRecruitmentAccess } from "@/components/os/recruitment-access";
import { Badge, Empty, ErrorLine, Loading, PageTitle, RowList, Select, Stat, Tabs, input, muted, panel } from "@/components/os/ui";
import { divisions, roleById } from "@/data/careers/divisions";
import { CAMPAIGN_TASKS, RECRUITMENT } from "@/data/careers/recruitment";
import { CANDIDATE_COLUMNS, matchesQuery, overallCampaign, type CandidateRow, type Stage } from "@/lib/os/recruitment";
import { fmtDate, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Pipe = { application_id: string; stage: string; reviewer_person_id: string | null; stage_changed_at: string };
type Mine = { application_id: string; role: string; full_name: string; role_id: string | null; role_2_id: string | null; stage: string | null; assigned_at: string };
type Milestone = { id: string; title: string; planned_start: string | null; due_date: string | null; status: string };
const TASK_KEYS = CAMPAIGN_TASKS.map((t) => t.key);
const roleLabel = (id: string | null) => roleById(id)?.title ?? "—";

// /os/recruitment: the daily list for the recruitment team (founders and people with a recruitment grant), and
// "Assigned to me" for interviewers and reviewers. Everything is read with the person's own session (RLS).
export default function RecruitmentPage() {
  const params = useSearchParams();
  const view = params.get("view") === "pipeline" ? "pipeline" : "list";
  const access = useRecruitmentAccess();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const team = !!access?.team;

  const stages = useQuery<Stage[]>((s) => s.from("os_recruitment_stages").select("key, label, sort, applicant_status, is_final, active").order("sort"), []);
  const apps = useQuery<CandidateRow[]>((s) => (team ? s.from("career_applications").select(CANDIDATE_COLUMNS).eq("cohort", RECRUITMENT.cohort).order("created_at", { ascending: false }).limit(2000) : Promise.resolve({ data: [], error: null })), [team]);
  const pipe = useQuery<Pipe[]>((s) => (team ? s.from("os_recruitment_candidates").select("application_id, stage, reviewer_person_id, stage_changed_at").limit(2000) : Promise.resolve({ data: [], error: null })), [team]);
  const mine = useQuery<Mine[]>((s) => s.rpc("os_recruitment_my_assignments"), []);
  const milestones = useQuery<Milestone[]>((s) => s.from("os_timeline_items").select("id, title, planned_start, due_date, status").eq("workstream_code", "WS1").order("planned_start").limit(30), []);

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [division, setDivision] = useState("");
  const [stage, setStage] = useState("");
  const [year, setYear] = useState("");
  const [campaign, setCampaign] = useState("");

  const stageOf = useMemo(() => new Map((pipe.data ?? []).map((p) => [p.application_id, p])), [pipe.data]);
  const stageList = stages.data ?? [];
  const stageLabel = (k: string | null | undefined) => stageList.find((s) => s.key === k)?.label ?? k ?? "—";
  const all = apps.data ?? [];
  const rows = all.filter((a) => {
    const p = stageOf.get(a.id);
    const divs = [a.division, roleById(a.role_2_id)?.division].filter(Boolean);
    return matchesQuery(a, q) && (!role || a.role_id === role || a.role_2_id === role) && (!division || divs.includes(division))
      && (!stage || (p?.stage ?? "new") === stage) && (!year || String(a.academic_year) === year)
      && (!campaign || overallCampaign(a.campaign_tasks, TASK_KEYS) === campaign);
  });

  if (!access) return <Loading />;
  if (!team && !access.assigned) {
    return <div><PageTitle title="Recruitment" /><Empty title="No recruitment access" body="Candidate information is private to the recruitment team. A founder can give you access, or assign you a candidate to evaluate." /></div>;
  }

  const counts = (k: string) => all.filter((a) => (stageOf.get(a.id)?.stage ?? "new") === k).length;
  const pendingCampaign = all.filter((a) => overallCampaign(a.campaign_tasks, TASK_KEYS) === "pending").length;

  return (
    <div data-testid="os-recruitment">
      <PageTitle title="Recruitment" description={`${RECRUITMENT.cohortName}. Applications from ielsco.com/careers, in one place. Candidate details are private to the recruitment team; interviewers see only the candidates assigned to them.`} />

      {(mine.data?.length ?? 0) > 0 && (
        <section className="mb-6" aria-labelledby="mine-h" data-testid="os-recruitment-mine">
          <h2 id="mine-h" className="mb-2 text-sm font-semibold">Assigned to me</h2>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {mine.data!.map((m) => (
              <li key={`${m.application_id}-${m.role}`}>
                <Link href={`/os/recruitment/${m.application_id}`} className={cn(panel, "block p-3 text-sm hover:border-[#C9D1DB]")}>
                  <p className="font-medium">{m.full_name}</p>
                  <p className={cn("mt-0.5 text-xs", muted)}>{m.role === "interviewer" ? "Interview" : "Review"} · {roleLabel(m.role_id)}{m.role_2_id ? ` + ${roleLabel(m.role_2_id)}` : ""} · {stageLabel(m.stage)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {team && <>
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8" data-testid="os-recruitment-stats">
          <Stat label="Applications" value={all.length} />
          {stageList.filter((s) => s.active).map((s) => <Stat key={s.key} label={s.label} value={counts(s.key)} />)}
          <Stat label="Campaign to check" value={pendingCampaign} tone={pendingCampaign ? "amber" : undefined} />
        </div>

        <Tabs label="Recruitment views" current={view} hrefFor={(k) => `/os/recruitment${k === "list" ? "" : `?view=${k}`}`} tabs={[{ key: "list", label: "Applicants", count: rows.length }, { key: "pipeline", label: "Pipeline" }]} />
        <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
          <label className="relative col-span-2 md:w-64">
            <span className="sr-only">Search applicants</span>
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, university, city" className={cn(input, "pl-8")} data-testid="os-recruitment-search" />
          </label>
          <Select ariaLabel="Division" value={division} onChange={setDivision} options={divisions.map((d) => ({ value: d.slug, label: d.title }))} placeholder="All divisions" className="md:w-40" />
          <Select ariaLabel="Role" value={role} onChange={setRole} options={divisions.flatMap((d) => d.roles.map((r) => ({ value: r.id, label: `${r.title} (${d.title})` })))} placeholder="All roles" className="md:w-56" />
          {view === "list" && <Select ariaLabel="Stage" value={stage} onChange={setStage} options={stageList.map((s) => ({ value: s.key, label: s.label }))} placeholder="Any stage" className="md:w-44" />}
          <Select ariaLabel="Academic year" value={year} onChange={setYear} options={[{ value: "1", label: "1st year" }, { value: "2", label: "2nd year" }, { value: "3", label: "3rd year" }]} placeholder="Any year" className="md:w-32" />
          <Select ariaLabel="Campaign" value={campaign} onChange={setCampaign} options={[{ value: "pending", label: "Campaign: to check" }, { value: "verified", label: "Campaign: verified" }, { value: "incomplete", label: "Campaign: incomplete" }]} placeholder="Any campaign status" className="md:w-48" />
        </div>
        <ErrorLine message={apps.error ?? pipe.error} />
        {(apps.loading && !apps.data) ? <Loading /> : view === "list" ? (
          <RowList testId="os-recruitment-list" rows={rows} rowKey={(a) => a.id} rowHref={(a) => `/os/recruitment/${a.id}`}
            empty={<Empty title={all.length ? "No applicants match" : "No applications yet"} body={all.length ? "Clear the filters." : "Applications appear here as soon as they're submitted on ielsco.com/careers."} />}
            columns={[
              { key: "n", label: "Applicant", primary: true, className: "w-[24%]", render: (a) => <Link href={`/os/recruitment/${a.id}`} className="block truncate font-medium hover:underline">{a.full_name}</Link> },
              { key: "r", label: "Roles", className: "w-[24%]", render: (a) => <span className="block truncate text-xs">{roleLabel(a.role_id)}{a.role_2_id ? ` · ${roleLabel(a.role_2_id)}` : ""}</span> },
              { key: "s", label: "Stage", className: "w-36", render: (a) => <Badge tone={["accepted"].includes(stageOf.get(a.id)?.stage ?? "") ? "green" : stageOf.get(a.id)?.stage === "rejected" ? "red" : "neutral"}>{stageLabel(stageOf.get(a.id)?.stage ?? "new")}</Badge> },
              { key: "c", label: "Campaign", className: "w-28", hideOnMobile: true, render: (a) => { const o = overallCampaign(a.campaign_tasks, TASK_KEYS); return <Badge tone={o === "verified" ? "green" : o === "incomplete" ? "red" : "amber"}>{o === "pending" ? "To check" : o === "verified" ? "Verified" : "Incomplete"}</Badge>; } },
              { key: "y", label: "Year", className: "w-16", hideOnMobile: true, render: (a) => <span className="text-xs">{a.academic_year}</span> },
              { key: "v", label: "Reviewer", className: "w-28", hideOnMobile: true, render: (a) => <span className="truncate text-xs">{personLabel(people, stageOf.get(a.id)?.reviewer_person_id, "—")}</span> },
              { key: "d", label: "Applied", className: "w-24", hideOnMobile: true, render: (a) => <span className="text-xs text-[#66768A]">{fmtDate(a.submitted_at ?? a.created_at)}</span> },
            ]} />
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" data-testid="os-recruitment-pipeline">
            <div className="flex min-w-max gap-3">
              {stageList.filter((s) => s.active).map((s) => {
                const col = rows.filter((a) => (stageOf.get(a.id)?.stage ?? "new") === s.key);
                return (
                  <section key={s.key} className="w-60 shrink-0 rounded-xl bg-[#F5F7FA] p-2">
                    <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-[#3A4B60]">{s.label}<span className="font-normal text-[#66768A]">{col.length}</span></h2>
                    <ul className="space-y-2">
                      {col.map((a) => (
                        <li key={a.id}><Link href={`/os/recruitment/${a.id}`} className={cn(panel, "block p-2.5 text-sm hover:border-[#C9D1DB]")}>
                          <p className="font-medium">{a.full_name}</p>
                          <p className={cn("mt-0.5 text-xs", muted)}>{roleLabel(a.role_id)}{a.role_2_id ? ` + ${roleLabel(a.role_2_id)}` : ""}</p>
                        </Link></li>
                      ))}
                      {!col.length && <li className={cn("px-1 text-xs", muted)}>None</li>}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        )}

        {(milestones.data?.length ?? 0) > 0 && (
          <section className="mt-8" aria-labelledby="ms-h">
            <h2 id="ms-h" className="mb-2 text-sm font-semibold">Recruitment milestones <span className={cn("font-normal", muted)}>· Master Timeline WS1</span></h2>
            <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>
              {milestones.data!.slice(0, 14).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <Link href={`/os/timeline/${m.id}`} className="min-w-0 truncate hover:underline"><span className={muted}>{m.id}</span> {m.title}</Link>
                  <span className="shrink-0 text-xs text-[#66768A]">{fmtDate(m.planned_start)}{m.due_date && m.due_date !== m.planned_start ? ` – ${fmtDate(m.due_date)}` : ""} · {m.status}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>}
    </div>
  );
}
