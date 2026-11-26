"use client";

// Project dashboards for the four HQ projects. Static facts come from src/content/os/portfolio.json (sourced, with
// "To be confirmed" where nothing was found); everything live is read as the signed-in person: the project row, its
// tasks, members, Master Timeline items, linked documents and os_portfolio_live_stats (aggregate counts only).
import Link from "next/link";
import { useMemo } from "react";
import { useDirectory, useQuery } from "@/components/os/data";
import { Badge, ErrorLine, Loading, Section, Stat, StatusBadge, linkCls, muted, panel } from "@/components/os/ui";
import { addDays, fmtDate, personLabel, todayJakarta } from "@/lib/os/meta";
import { divisionById, type PortfolioKey } from "@/lib/os/org";
import portfolio from "@/content/os/portfolio.json";
import { cn } from "@/lib/utils";

export type PortfolioProject = (typeof portfolio.projects)[number];
export const PORTFOLIO: PortfolioProject[] = portfolio.projects;
export const portfolioByKey = (k: string) => PORTFOLIO.find((p) => p.key === k);
const DIV_NAME: Record<string, string> = { OPS: "Operations", PAR: "Business", PPL: "People", GRO: "Growth", MKT: "Marketing", CRE: "Creative" };
export const DIV_ORDER = ["OPS", "PAR", "PPL", "GRO", "MKT", "CRE"];
const ACCENT: Record<string, string> = { circle: "#2F6FB5", gif: "#3E9396", elco: "#304156", course: "#E06C5A" };
export const accentOf = (k: string) => ACCENT[k] ?? "#304156";

export interface ProjectRowLite { id: string; name: string; status: string; owner_person_id: string | null; portfolio_key: string | null; next_action: string | null; start_date: string | null; due_date: string | null }
export function usePortfolioProjects() {
  return useQuery<ProjectRowLite[]>((s) => s.from("os_projects").select("id, name, status, owner_person_id, portfolio_key, next_action, start_date, due_date").not("portfolio_key", "is", null), []);
}

type TaskLite = { id: string; title: string; status: string; due_date: string | null; owner_person_id: string | null; division_id: string | null; project_id: string | null };
export function useProjectTasks(projectId: string | null | undefined) {
  return useQuery<TaskLite[]>((s) => s.from("os_tasks").select("id, title, status, due_date, owner_person_id, division_id, project_id").eq("project_id", projectId ?? "-").limit(2000), [projectId]);
}
export function taskStats(tasks: TaskLite[], today = todayJakarta()) {
  const open = tasks.filter((t) => !["Done", "Cancelled"].includes(t.status));
  return {
    open: open.length, done: tasks.filter((t) => t.status === "Done").length,
    overdue: open.filter((t) => t.due_date && t.due_date < today).length,
    blocked: open.filter((t) => t.status === "Blocked").length,
    soon: open.filter((t) => t.due_date && t.due_date >= today && t.due_date <= addDays(today, 14)).length,
  };
}

/** Live numbers for one project, as labelled stats. */
export function LiveNumbers({ k }: { k: PortfolioKey }) {
  const live = useQuery<Record<string, unknown> | null>((s) => s.rpc("os_portfolio_live_stats", { p_key: k }) as unknown as PromiseLike<{ data: Record<string, unknown> | null; error: { message: string } | null }>, [k]);
  if (live.loading && !live.data) return <Loading />;
  const d = live.data as Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!d || d.available === false) return <p className={cn("text-sm", muted)}>Live numbers are not available{d?.error ? ` (${d.error})` : ""}.</p>;
  const stats: { label: string; value: string | number; hint?: string }[] = [];
  const sum = (o: Record<string, number> | undefined) => Object.values(o ?? {}).reduce((a, b) => a + Number(b), 0);
  if (k === "gif") {
    const a = (d.applications_by_pathway_status ?? {}) as Record<string, number>;
    const by = (st: string) => Object.entries(a).filter(([key]) => key.endsWith(`:${st}`)).reduce((x, [, n]) => x + Number(n), 0);
    stats.push({ label: "Registrants (all applications)", value: sum(a) }, { label: "Drafts", value: by("draft") }, { label: "Awaiting payment", value: by("awaiting_payment") },
      { label: "Delegates (participants)", value: Number(d.participants ?? 0) }, { label: "Seats confirmed", value: Number(d.seats_confirmed ?? 0) });
    if (d.paid_by_currency) stats.push({ label: "Paid (founders and approvers)", value: Object.entries(d.paid_by_currency as Record<string, number>).map(([c, n]) => `${c} ${Number(n).toLocaleString("en-US")}`).join(" · ") || "0" });
  } else if (k === "circle") {
    const reg = (d.cohort_registrations ?? {}) as Record<string, { registered: number; attended: number }>;
    Object.entries(reg).forEach(([ev, v]) => stats.push({ label: `Cohort ${ev.replace("circle-", "")}: registered`, value: v.registered, hint: `${v.attended} marked attended` }));
    stats.push({ label: "Members checked in (30 days)", value: Number(d.active_members_30d ?? 0) });
    const recent = (d.recent_sessions ?? []) as { session: string; checkins: number }[];
    if (recent[0]) stats.push({ label: "Last session check-ins", value: recent[0].checkins, hint: fmtDate(recent[0].session) });
    const circles = (d.circles ?? []) as { name: string; members: number }[];
    if (circles.length) stats.push({ label: "Circle groups", value: circles.length, hint: `${circles.reduce((a, c) => a + c.members, 0)} memberships` });
  } else if (k === "course") {
    const m = (d.active_memberships ?? {}) as Record<string, number>;
    stats.push({ label: "Active members: Collective", value: m.collective ?? 0 }, { label: "Active members: Studio", value: m.studio ?? 0 },
      { label: "Open cohorts", value: ((d.cohorts ?? []) as unknown[]).length }, { label: "Waitlist", value: sum(d.waitlist) },
      { label: "Paid orders (production)", value: Number((d.orders_by_status ?? {}).paid ?? 0) }, { label: "One (1-on-1) enrolments", value: sum(d.one_enrolments) });
  } else if (k === "elco") {
    stats.push({ label: "IELSco accounts linked to Elco", value: Number(d.linked_accounts ?? 0) }, { label: "Active Elco benefits", value: sum(d.active_benefits_by_tier) });
  }
  return (
    <div data-testid={`os-live-${k}`}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">{stats.map((s) => <Stat key={s.label} label={s.label} value={s.value} hint={s.hint} />)}</div>
      <p className={cn("mt-1.5 text-xs", muted)}>Live, counts only{d.as_of ? `, as of ${new Date(String(d.as_of)).toLocaleString("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB` : ""}.{k === "elco" ? " Elco users and subscriptions are in Elco's own database and are not readable here yet." : ""}</p>
      <ErrorLine message={live.error} />
    </div>
  );
}

/** Milestones from the portfolio facts, with the live Master Timeline status where a TL id is named. */
export function Milestones({ pj }: { pj: PortfolioProject }) {
  const ids = pj.milestones.map((m) => /\(TL-(\d{3})\)/.exec(m.label)?.[1]).filter(Boolean).map((n) => `TL-${n}`);
  const tl = useQuery<{ id: string; status: string; due_date: string | null }[]>((s) => s.from("os_timeline_items").select("id, status, due_date").in("id", ids.length ? ids : ["-"]), [ids.join()]);
  const byId = new Map((tl.data ?? []).map((t) => [t.id, t]));
  const today = todayJakarta();
  return (
    <ul className={cn(panel, "divide-y divide-[#EEF1F5]")} data-testid="os-portfolio-milestones">
      {pj.milestones.map((m) => {
        const id = /\((TL-\d{3})\)/.exec(m.label)?.[1];
        const live = id ? byId.get(id) : undefined;
        const date = live?.due_date ?? (m.date === "TBC" ? null : m.date);
        return (
          <li key={m.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
            <span className={cn("w-24 shrink-0 tabular-nums", date && date < today && live?.status !== "Done" ? "font-medium text-[#A12D2F]" : "text-[#3A4B60]")}>{date ? fmtDate(date) : "TBC"}</span>
            <span className="min-w-0 flex-1">{m.label}</span>
            {live ? <StatusBadge value={live.status} /> : <Badge>{m.source === "OS" ? "Timeline" : m.source === "SITE" ? "Website" : "Founder decision"}</Badge>}
          </li>
        );
      })}
    </ul>
  );
}

export function DivisionTable({ pj }: { pj: PortfolioProject }) {
  const divs = pj.divisions as Record<string, { role: string; contribution: string }>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E6E9EE] bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead><tr>{["Division", "Department", "Role", "Contribution"].map((h) => <th key={h} className="border-b border-[#DDE2E8] bg-[#F7F8FA] px-3 py-1.5 text-left text-xs font-semibold text-[#3A4B60]">{h}</th>)}</tr></thead>
        <tbody>
          {DIV_ORDER.filter((c) => divs[c]).map((c) => (
            <tr key={c} className="align-top">
              <td className="border-b border-[#EEF1F5] px-3 py-1.5 font-medium"><Link href={`/os/d/${c.toLowerCase()}`} className={linkCls}>{DIV_NAME[c]}</Link></td>
              <td className="border-b border-[#EEF1F5] px-3 py-1.5">{["OPS", "PAR", "PPL"].includes(c) ? "Operations" : "Growth"}</td>
              <td className="border-b border-[#EEF1F5] px-3 py-1.5">{divs[c].role.startsWith("Lead") ? <Badge tone="amber">{divs[c].role}</Badge> : divs[c].role}</td>
              <td className="border-b border-[#EEF1F5] px-3 py-1.5">{divs[c].contribution}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={cn("px-3 py-1.5 text-xs", muted)}>Proposed lines, confirmed at HQ Leaders Meeting #1 (26 Nov 2026).</p>
    </div>
  );
}

/** PICs on the project: members plus everyone who owns an open task, with their open and overdue counts. */
export function ProjectTeam({ projectId, tasks }: { projectId: string; tasks: TaskLite[] }) {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const members = useQuery<{ person_id: string; role: string | null }[]>((s) => s.from("os_project_members").select("person_id, role").eq("project_id", projectId), [projectId]);
  const today = todayJakarta();
  const rows = useMemo(() => {
    const m = new Map<string, { open: number; overdue: number; divisions: Set<string>; role: string | null }>();
    (members.data ?? []).forEach((x) => m.set(x.person_id, { open: 0, overdue: 0, divisions: new Set(), role: x.role }));
    tasks.filter((t) => !["Done", "Cancelled"].includes(t.status) && t.owner_person_id).forEach((t) => {
      const r = m.get(t.owner_person_id!) ?? { open: 0, overdue: 0, divisions: new Set<string>(), role: null };
      r.open++; if (t.due_date && t.due_date < today) r.overdue++;
      if (t.division_id) r.divisions.add(divisionById(t.division_id)?.name ?? t.division_id);
      m.set(t.owner_person_id!, r);
    });
    return [...m.entries()].sort((a, b) => b[1].open - a[1].open);
  }, [members.data, tasks, today]);
  if (!rows.length) return <p className={cn("text-sm", muted)}>No members or task owners yet.</p>;
  return (
    <ul className={cn(panel, "divide-y divide-[#EEF1F5]")} data-testid="os-portfolio-team">
      {rows.map(([id, r]) => (
        <li key={id} className="flex flex-wrap items-center gap-x-3 px-3 py-2 text-sm">
          <Link href={`/os/people/${id}`} className={cn(linkCls, "w-32 shrink-0 truncate")}>{personLabel(people, id)}</Link>
          <span className={cn("min-w-0 flex-1 truncate text-xs", muted)}>{[r.role, [...r.divisions].join(", ")].filter(Boolean).join(" · ") || "—"}</span>
          <span className="text-xs tabular-nums">{r.open} open</span>
          {r.overdue > 0 && <span className="text-xs font-medium tabular-nums text-[#A12D2F]">{r.overdue} overdue</span>}
        </li>
      ))}
    </ul>
  );
}

export function UpcomingDeadlines({ tasks }: { tasks: TaskLite[] }) {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const today = todayJakarta();
  const rows = tasks.filter((t) => !["Done", "Cancelled"].includes(t.status) && t.due_date && t.due_date <= addDays(today, 30)).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1)).slice(0, 12);
  if (!rows.length) return <p className={cn("text-sm", muted)}>Nothing due in the next 30 days.</p>;
  return (
    <ul className={cn(panel, "divide-y divide-[#EEF1F5]")}>
      {rows.map((t) => (
        <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
          <span className={cn("w-20 shrink-0 tabular-nums", t.due_date! < today && "font-medium text-[#A12D2F]")}>{fmtDate(t.due_date, { year: false })}</span>
          <Link href={`/os/tasks/${t.id}`} className={cn(linkCls, "min-w-0 flex-1 truncate font-normal")}>{t.title}</Link>
          <span className={cn("hidden w-20 truncate text-xs sm:block", muted)}>{personLabel(people, t.owner_person_id)}</span>
          <StatusBadge value={t.status} />
        </li>
      ))}
    </ul>
  );
}

export function ListBox({ title, items, tone }: { title: string; items: string[]; tone?: "warn" }) {
  return (
    <Section title={title}>
      <ul className={cn(panel, "list-disc space-y-1 py-3 pl-8 pr-3 text-sm", tone === "warn" && "border-[#F3E2A9] bg-[#FFFCEB]")}>{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </Section>
  );
}
