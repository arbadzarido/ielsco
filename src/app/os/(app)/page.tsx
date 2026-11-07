"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CompanyLogo } from "@/components/os/OsShell";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useMyScope, useQuery } from "@/components/os/data";
import { Announcements } from "@/components/os/records";
import { TASK_COLUMNS, type TaskRow } from "@/components/os/work-forms";
import { Empty, Section, Stat, StatusBadge, linkCls, muted, panel } from "@/components/os/ui";
import { WORKSPACES, addDays, fmtDate, personLabel, relativeDue, todayJakarta } from "@/lib/os/meta";
import { ROLE_LABEL } from "@/lib/os/types";
import { cn } from "@/lib/utils";

// Home is a role dashboard: your own work for everyone, your divisions for managers, all companies for founders.
// Every number is a live count of records the person can see; nothing is charted for decoration.
const SITE = "https://www.ielsco.com";
const EXISTING_ADMIN = [
  { href: `${SITE}/dashboard/admin/stories`, label: "Member Stories and IELSco Stories" },
  { href: `${SITE}/dashboard/admin/opportunities`, label: "Opportunities" },
  { href: `${SITE}/dashboard/admin/operations`, label: "Operations" },
];
type Slim = { id: string; company_code: string; division_id: string | null; status: string; due_date: string | null };

export default function OsHomePage() {
  const { me } = useOsMe();
  const scope = useMyScope();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const today = todayJakarta();
  const summary = useQuery<{ open_tasks: number; overdue_tasks: number; due_this_week: number; in_review: number }[]>((s) => s.rpc("os_my_work_summary"), []);
  const assigned = useQuery<{ task_id: string }[]>((s) => s.from("os_task_assignees").select("task_id").eq("person_id", me.person.id), [me.person.id]);
  const myTasks = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(300), []);
  const toReview = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).eq("reviewer_person_id", me.person.id).eq("status", "In Review"), [me.person.id]);
  const reviews = useQuery<{ id: string; person_id: string; reviewer_person_id: string | null; status: string; os_review_cycles: { name: string; self_due: string | null; manager_due: string | null } | null }[]>((s) => s.from("os_reviews").select("id, person_id, reviewer_person_id, status, os_review_cycles(name, self_due, manager_due)").not("status", "in", "(Acknowledged)") as never, []);
  const milestones = useQuery<{ id: string; title: string; due_date: string; workstream_code: string | null }[]>((s) => s.from("os_timeline_items").select("id, title, due_date, workstream_code").eq("is_major", true).gte("due_date", today).lte("due_date", addDays(today, 60)).not("status", "in", "(Done,Cancelled)").order("due_date").limit(6), [today]);
  const allTasks = useQuery<Slim[]>((s) => scope.isManager || me.isAdmin ? s.from("os_tasks").select("id, company_code, division_id, status, due_date").not("status", "in", "(Done,Cancelled)").limit(2000) : Promise.resolve({ data: [], error: null }), [scope.isManager, me.isAdmin]);
  const projects = useQuery<Slim[]>((s) => scope.isManager || me.isAdmin ? s.from("os_projects").select("id, company_code, division_id, status, due_date").not("status", "in", "(Completed,Cancelled)") : Promise.resolve({ data: [], error: null }), [scope.isManager, me.isAdmin]);
  const founder = useQuery<{ drift: number; routes: number; followups: number; decisions: number; budget: { budget_usd: number; spent_usd: number } | null }>(async (s) => {
    if (!me.isAdmin) return { data: null, error: null };
    const [d, r, f, dc, b] = await Promise.all([
      s.from("os_documents").select("id", { count: "exact", head: true }).neq("drift_findings", "[]"),
      s.from("os_folder_routes").select("id", { count: "exact", head: true }).eq("status", "proposed"),
      s.from("os_partnerships").select("id", { count: "exact", head: true }).lte("follow_up_date", today).not("stage", "in", "(\"6 Won\",\"7 Lost\")"),
      s.from("os_decisions").select("id", { count: "exact", head: true }).eq("status", "Proposed"),
      s.rpc("os_ai_budget"),
    ]);
    return { data: { drift: d.count ?? 0, routes: r.count ?? 0, followups: f.count ?? 0, decisions: dc.count ?? 0, budget: Array.isArray(b.data) ? b.data[0] ?? null : null }, error: null };
  }, [me.isAdmin, today]);

  const mineIds = new Set((assigned.data ?? []).map((a) => a.task_id));
  const mine = (myTasks.data ?? []).filter((t) => t.owner_person_id === me.person.id || mineIds.has(t.id));
  const soon = mine.filter((t) => t.due_date && t.due_date <= addDays(today, 7)).slice(0, 8);
  const sm = summary.data?.[0];
  const myReviewActions = (reviews.data ?? []).filter((r) => (r.person_id === me.person.id && ["Not started", "Self-assessment", "Completed"].includes(r.status)) || (r.person_id !== me.person.id && r.reviewer_person_id === me.person.id && r.status === "Manager review"));
  const firstName = (me.person.short_name || me.person.full_name).split(" ")[0];
  const overdue = (x: Slim) => x.due_date !== null && x.due_date < today;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-[#1F2D3D]">Hi, {firstName}</h1>
        <p className={cn("mt-1 text-sm", muted)}>{ROLE_LABEL[me.person.org_role]} · {fmtDate(today, { year: true })}</p>
      </header>
      {me.person.status === "onboarding" && <p className="rounded-lg bg-[#FFF7E6] px-3 py-2 text-sm text-[#865400]">Your account is still marked as onboarding. A founder switches it to active once your setup is complete.</p>}
      {me.needsMfa && <p className="rounded-lg bg-[#FFF7E6] px-3 py-2 text-sm text-[#865400]">Admin needs two-step verification. <Link href="/os/account" className={linkCls}>Set it up in My account</Link>.</p>}

      <section aria-label="My work">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="os-home-mywork">
          <Stat label="My open tasks" value={sm?.open_tasks ?? "…"} href="/os/tasks" />
          <Stat label="Overdue" value={sm?.overdue_tasks ?? "…"} tone={sm?.overdue_tasks ? "red" : undefined} href="/os/tasks" />
          <Stat label="Due in 7 days" value={sm?.due_this_week ?? "…"} href="/os/tasks?view=upcoming" />
          <Stat label="Waiting for my review" value={toReview.data?.length ?? "…"} tone={toReview.data?.length ? "amber" : undefined} />
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Section title="Due soon" action={<Link href="/os/tasks" className={linkCls}>My tasks</Link>}>
            {soon.length ? (
              <ul className={cn(panel, "divide-y divide-[#F0F2F5]")}>
                {soon.map((t) => { const r = relativeDue(t.due_date); return (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className={cn("w-20 shrink-0 text-xs", r?.overdue ? "font-medium text-[#A12D2F]" : muted)}>{r?.label}</span>
                    <Link href={`/os/tasks/${t.id}`} className="min-w-0 flex-1 truncate hover:underline">{t.title}</Link>
                    <StatusBadge value={t.status} />
                  </li>); })}
              </ul>
            ) : <Empty compact title={mine.length ? "Nothing due this week" : "No open tasks"} body={mine.length ? undefined : "Tasks you own or are assigned to appear here."} />}
          </Section>
          {(!!toReview.data?.length || !!myReviewActions.length) && (
            <Section title="Needs you">
              <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>
                {(toReview.data ?? []).map((t) => <li key={t.id} className="flex items-center gap-2 px-3 py-2"><span className={cn("w-24 text-xs", muted)}>Task review</span><Link href={`/os/tasks/${t.id}`} className="min-w-0 flex-1 truncate hover:underline">{t.title}</Link><span className={cn("text-xs", muted)}>{personLabel(people, t.owner_person_id)}</span></li>)}
                {myReviewActions.map((r) => <li key={r.id} className="flex items-center gap-2 px-3 py-2"><span className={cn("w-24 text-xs", muted)}>{r.person_id === me.person.id ? (r.status === "Completed" ? "Acknowledge" : "Self-assessment") : "Write review"}</span><Link href={`/os/reviews/${r.id}`} className="min-w-0 flex-1 truncate hover:underline">{r.os_review_cycles?.name ?? "Review"}{r.person_id !== me.person.id ? ` · ${personLabel(people, r.person_id)}` : ""}</Link></li>)}
              </ul>
            </Section>
          )}

          {scope.isManager && !me.isAdmin && (
            <Section title="My divisions">
              <ul className="grid gap-3 sm:grid-cols-2">
                {Array.from(scope.managed).map((d) => {
                  const t = (allTasks.data ?? []).filter((x) => x.division_id === d);
                  const p = (projects.data ?? []).filter((x) => x.division_id === d);
                  return (
                    <li key={d} className={cn(panel, "p-4")}>
                      <p className="font-semibold">{dir?.divisionById.get(d)?.name ?? d}</p>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div><dt className={cn("text-xs", muted)}>Projects</dt><dd className="font-semibold tabular-nums">{p.length}</dd></div>
                        <div><dt className={cn("text-xs", muted)}>Open tasks</dt><dd className="font-semibold tabular-nums">{t.length}</dd></div>
                        <div><dt className={cn("text-xs", muted)}>Overdue</dt><dd className={cn("font-semibold tabular-nums", t.some(overdue) && "text-[#A12D2F]")}>{t.filter(overdue).length}</dd></div>
                      </dl>
                      <Link href={`/os/projects?division=${d}`} className={cn("mt-2 inline-block text-sm", linkCls)}>Projects</Link>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {me.isAdmin && (
            <Section title="Across the companies">
              <div className={cn(panel, "overflow-x-auto")}>
                <table className="w-full min-w-[440px] text-sm" data-testid="os-home-founder">
                  <thead className="border-b border-[#E6E9EE] bg-[#FAFBFC] text-left text-xs text-[#66768A]"><tr><th className="px-3 py-2 font-medium">Workspace</th><th className="px-3 py-2 text-right font-medium">Active projects</th><th className="px-3 py-2 text-right font-medium">Open tasks</th><th className="px-3 py-2 text-right font-medium">Overdue</th><th className="px-3 py-2 text-right font-medium">Blocked</th></tr></thead>
                  <tbody>
                    {WORKSPACES.map((w) => {
                      const t = (allTasks.data ?? []).filter((x) => x.company_code === w.code);
                      return (
                        <tr key={w.code} className="border-b border-[#F0F2F5] last:border-0">
                          <td className="px-3 py-2"><Link href={`/os/w/${w.slug}`} className="flex items-center gap-2 font-medium hover:underline"><CompanyLogo code={w.code} size={18} />{w.name}</Link></td>
                          <td className="px-3 py-2 text-right tabular-nums">{(projects.data ?? []).filter((x) => x.company_code === w.code).length}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{t.length}</td>
                          <td className={cn("px-3 py-2 text-right tabular-nums", t.some(overdue) && "font-semibold text-[#A12D2F]")}>{t.filter(overdue).length}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{t.filter((x) => x.status === "Blocked").length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {founder.data && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Stat label="Decisions proposed" value={founder.data.decisions} href="/os/w/hq?tab=decisions" />
                  <Stat label="Partner follow-ups due" value={founder.data.followups} tone={founder.data.followups ? "amber" : undefined} href="/os/partnerships" />
                  <Stat label="Docs with access findings" value={founder.data.drift} tone={founder.data.drift ? "red" : undefined} href="/os/documents" />
                  <Stat label="Folder routes to approve" value={founder.data.routes} href="/os/admin?tab=routes" />
                  <Stat label="AI spend this month" value={founder.data.budget ? `US$${Number(founder.data.budget.spent_usd).toFixed(2)}` : "—"} hint={founder.data.budget ? `of US$${Number(founder.data.budget.budget_usd).toFixed(0)}` : undefined} href="/os/admin?tab=ai" />
                </div>
              )}
            </Section>
          )}
        </div>
        <aside className="space-y-6">
          <Announcements company="HQ" canPost={me.isAdmin || scope.isManager} />
          <Section title="Major milestones (60 days)" action={<Link href="/os/timeline" className={linkCls}>Timeline</Link>}>
            {milestones.data?.length ? (
              <ul className="space-y-1.5 text-sm">{milestones.data.map((m) => <li key={m.id} className="flex gap-2"><span className={cn("w-16 shrink-0 text-xs", muted)}>{fmtDate(m.due_date)}</span><Link href={`/os/timeline?focus=${m.id}`} className="min-w-0 flex-1 hover:underline">{m.title}</Link></li>)}</ul>
            ) : <p className={cn("text-sm", muted)}>No major milestones in the next 60 days.</p>}
          </Section>
          <Section title="Website admin">
            <ul className="space-y-1.5 text-sm">{EXISTING_ADMIN.map((a) => <li key={a.href}><a href={a.href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center gap-1", linkCls)}>{a.label}<ExternalLink size={12} aria-hidden="true" /></a></li>)}</ul>
            <p className={cn("mt-1 text-xs", muted)}>Opens on www.ielsco.com with the website&apos;s own admin access.</p>
          </Section>
        </aside>
      </div>
    </div>
  );
}
