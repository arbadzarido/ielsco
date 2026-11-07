"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Lock } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { PersonWorkload } from "@/components/os/person-workload";
import { RecordSheet } from "@/components/os/records";
import { Avatar, Empty, ErrorLine, KeyValue, Loading, PageTitle, Section, StatusBadge, btn, linkCls, muted, panel } from "@/components/os/ui";
import { MEMBERSHIP_TYPES, WORKSPACES, companyName, fmtDate, isOpenTask, personLabel, relativeDue } from "@/lib/os/meta";
import { ROLE_LABEL } from "@/lib/os/types";
import { cn } from "@/lib/utils";

type Profile = { person_id: string; title: string | null; responsibilities: string | null; manager_person_id: string | null; location: string | null };
type Employment = { person_id: string; membership_type: string | null; employing_company: string | null; start_date: string | null; end_date: string | null; notes: string | null };

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useOsMe();
  const dir = useDirectory();
  const profile = useQuery<Profile | null>((s) => s.from("os_person_profiles").select("person_id, title, responsibilities, manager_person_id, location").eq("person_id", id).maybeSingle(), [id]);
  const emp = useQuery<Employment | null>((s) => s.from("os_person_employment").select("person_id, membership_type, employing_company, start_date, end_date, notes").eq("person_id", id).maybeSingle(), [id]);
  const canPrivate = useQuery<boolean>((s) => s.rpc("os_can_view_person_private", { p_person: id }), [id]);
  const cos = useQuery<{ company_code: string }[]>((s) => s.from("os_person_companies").select("company_code").eq("person_id", id), [id]);
  const divs = useQuery<{ division_id: string; is_manager: boolean }[]>((s) => s.from("os_person_divisions").select("division_id, is_manager").eq("person_id", id), [id]);
  const reports = useQuery<{ person_id: string }[]>((s) => s.from("os_person_profiles").select("person_id").eq("manager_person_id", id), [id]);
  const projects = useQuery<{ id: string; name: string; status: string }[]>((s) => s.from("os_projects").select("id, name, status").eq("owner_person_id", id).not("status", "in", "(Completed,Cancelled)"), [id]);
  const tasks = useQuery<{ id: string; title: string; status: string; due_date: string | null }[]>((s) => s.from("os_tasks").select("id, title, status, due_date").eq("owner_person_id", id).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(20), [id]);
  const kpis = useQuery<{ id: string; name: string }[]>((s) => s.from("os_kpis").select("id, name").eq("owner_person_id", id).order("id"), [id]);
  const reviews = useQuery<{ id: string; cycle_id: string; status: string; os_review_cycles: { name: string; period_end: string } | null }[]>((s) => s.from("os_reviews").select("id, cycle_id, status, os_review_cycles(name, period_end)").eq("person_id", id).order("created_at", { ascending: false }) as never, [id]);
  const [editProfile, setEditProfile] = useState(false);
  const [editEmp, setEditEmp] = useState(false);

  if (!dir) return <Loading />;
  const p = dir.peopleById.get(id);
  if (!p) return <Empty title="Person not found" body="They don't exist, or you can't see the directory." action={<Link href="/os/people" className={btn}>Back to people</Link>} />;
  const pr = profile.data;
  const isSelf = me.person.id === id;
  const isFounder = me.isAdmin;

  return (
    <div>
      <PageTitle title={p.full_name} crumbs={[{ href: "/os/people", label: "People" }]}
        description={`${p.id} · ${pr?.title ?? ROLE_LABEL[p.org_role as keyof typeof ROLE_LABEL]}`}
        actions={<button type="button" className={btn} onClick={() => setEditProfile(true)}>Edit profile</button>} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className={cn(panel, "p-4")}>
            <div className="mb-3 flex items-center gap-3"><Avatar name={p.full_name} size={40} /><div><p className="font-semibold">{p.full_name}</p><p className={cn("text-sm", muted)}>{ROLE_LABEL[p.org_role as keyof typeof ROLE_LABEL]} · <StatusBadge value={p.status === "onboarding" ? "Onboarding" : p.status === "active" ? "Active" : p.status} /></p></div></div>
            <KeyValue items={[
              { label: "Reports to", value: pr?.manager_person_id ? <Link href={`/os/people/${pr.manager_person_id}`} className={linkCls}>{personLabel(dir.peopleById, pr.manager_person_id)}</Link> : "—" },
              { label: "Location", value: pr?.location ?? "—" },
              { label: "Companies", value: (cos.data ?? []).map((c) => companyName(c.company_code)).join(", ") || "—" },
              { label: "Divisions", value: (divs.data ?? []).map((d) => `${dir.divisionById.get(d.division_id)?.name ?? d.division_id}${d.is_manager ? " (manager)" : ""}`).join(", ") || "—" },
              { label: "Direct reports", value: (reports.data ?? []).length ? (reports.data ?? []).map((r) => personLabel(dir.peopleById, r.person_id)).join(", ") : "—" },
            ]} />
            {pr?.responsibilities && <div className="mt-4"><h2 className="text-xs font-medium text-[#66768A]">Responsibilities</h2><p className="mt-1 whitespace-pre-wrap text-sm">{pr.responsibilities}</p></div>}
          </section>
          <PersonWorkload personId={id} />
          <Section title="Projects they own">
            {projects.data?.length ? <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>{projects.data.map((x) => <li key={x.id} className="flex items-center gap-2 px-3 py-2"><Link href={`/os/projects/${x.id}`} className="min-w-0 flex-1 truncate hover:underline">{x.name}</Link><StatusBadge value={x.status} /></li>)}</ul>
              : <p className={cn("text-sm", muted)}>No active projects you can see.</p>}
          </Section>
          <Section title="Open tasks they own">
            {tasks.data?.length ? <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>{tasks.data.map((x) => { const r = isOpenTask(x.status) ? relativeDue(x.due_date) : null; return <li key={x.id} className="flex items-center gap-2 px-3 py-2"><Link href={`/os/tasks/${x.id}`} className="min-w-0 flex-1 truncate hover:underline">{x.title}</Link><span className={cn("text-xs", r?.overdue ? "text-[#A12D2F]" : muted)}>{r?.label ?? ""}</span><StatusBadge value={x.status} /></li>; })}</ul>
              : <p className={cn("text-sm", muted)}>No open tasks you can see.</p>}
            <p className={cn("mt-1.5 text-xs", muted)}>Shown for coordination only. Task counts are not a measure of performance.</p>
          </Section>
          {!!kpis.data?.length && (
            <Section title="KPIs they're accountable for">
              <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>{kpis.data.map((k) => <li key={k.id} className="px-3 py-2"><Link href={`/os/kpis/${k.id}`} className="hover:underline">{k.id} · {k.name}</Link></li>)}</ul>
            </Section>
          )}
        </div>
        <aside className="space-y-4">
          <section className={cn(panel, "p-4")}>
            <div className="mb-2 flex items-center gap-2"><Lock size={14} aria-hidden="true" /><h2 className="flex-1 text-sm font-semibold">Employment</h2>{isFounder && <button type="button" className={btn} onClick={() => setEditEmp(true)}>Edit</button>}</div>
            {canPrivate.data === false ? <p className={cn("text-sm", muted)}>Only {p.short_name ?? p.full_name}, their manager, founders and a People Lead with a grant can see this.</p>
              : emp.data ? <KeyValue items={[
                  { label: "Membership", value: emp.data.membership_type ?? "—" }, { label: "Employed by", value: companyName(emp.data.employing_company) },
                  { label: "Start", value: fmtDate(emp.data.start_date) }, { label: "End", value: fmtDate(emp.data.end_date) },
                  { label: "Notes", value: emp.data.notes ?? "—" },
                ]} />
              : <p className={cn("text-sm", muted)}>Not recorded yet.</p>}
          </section>
          <section className={cn(panel, "p-4")}>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Lock size={14} aria-hidden="true" />Review history</h2>
            {canPrivate.data === false && !reviews.data?.length ? <p className={cn("text-sm", muted)}>Private.</p>
              : reviews.data?.length ? <ul className="space-y-1.5 text-sm">{reviews.data.map((r) => <li key={r.id} className="flex items-center gap-2"><Link href={`/os/reviews/${r.id}`} className="min-w-0 flex-1 truncate hover:underline">{r.os_review_cycles?.name ?? r.cycle_id}</Link><StatusBadge value={r.status} /></li>)}</ul>
              : <p className={cn("text-sm", muted)}>No reviews yet.</p>}
          </section>
          {isSelf && <p className={cn("text-xs", muted)}>This is you. You can edit your title, responsibilities and location.</p>}
        </aside>
      </div>
      <ErrorLine message={profile.error} />
      <RecordSheet open={editProfile} title="Edit profile" table="os_person_profiles" record={pr} defaults={{ person_id: id }} idColumn="person_id"
        fields={[{ key: "title", label: "Title" }, { key: "responsibilities", label: "Responsibilities", kind: "textarea" }, ...(isFounder ? [{ key: "manager_person_id", label: "Reports to", kind: "person" as const, hint: "Reporting lines decide who can see private records and write reviews." }] : []), { key: "location", label: "Location" }]}
        onClose={() => setEditProfile(false)} onSaved={() => { setEditProfile(false); profile.reload(); reports.reload(); }} />
      <RecordSheet open={editEmp} title="Employment" table="os_person_employment" record={emp.data} defaults={{ person_id: id }} idColumn="person_id"
        fields={[{ key: "membership_type", label: "Membership", kind: "select", options: MEMBERSHIP_TYPES }, { key: "employing_company", label: "Employed by", kind: "select", options: WORKSPACES.filter((w) => w.code !== "HQ").map((w) => ({ value: w.code, label: w.name })) },
          { key: "start_date", label: "Start", kind: "date" }, { key: "end_date", label: "End", kind: "date" }, { key: "notes", label: "Notes", kind: "textarea" }]}
        onClose={() => setEditEmp(false)} onSaved={() => { setEditEmp(false); emp.reload(); }} />
    </div>
  );
}
