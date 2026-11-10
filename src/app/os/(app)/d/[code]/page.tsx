"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { ACCESS_REQUEST_COLUMNS, AccessRequestList, RequestAccessForm, useRequestLabels, type AccessRequestRow } from "@/components/os/access-requests";
import { DOC_COLUMNS, type DocRow } from "@/components/os/doc-forms";
import { PersonSelect } from "@/components/os/pickers";
import { PROJECT_COLUMNS, TASK_COLUMNS, type ProjectRow, type TaskRow } from "@/components/os/work-forms";
import { useMyWorkspaces } from "@/components/os/workspaces";
import { Avatar, Badge, Empty, ErrorLine, Field, Loading, RowList, Section, Select, Stat, StatusBadge, Tabs, btn, btnDanger, btnPrimary, input, muted, panel } from "@/components/os/ui";
import { addDays, companyName, fmtDate, personLabel, relativeDue, todayJakarta } from "@/lib/os/meta";
import { ROLE_LABELS, accessLabel, grantableRoles, workspaceHref, workspaceSections, type MyWorkspace, type WsRole, type WsSection } from "@/lib/os/workspaces";
import { cn } from "@/lib/utils";

// One division's workspace. Every list below is an ordinary query as the signed-in person, so RLS decides what appears;
// a restricted workspace (Finance, Legal) returns nothing to someone without a role or grant there.
const TAB_LABEL: Record<WsSection, string> = { overview: "Overview", projects: "Projects", tasks: "Tasks", documents: "Documents", requests: "Requests", access: "Members and access" };

export default function DivisionWorkspacePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const search = useSearchParams();
  const { me } = useOsMe();
  const { list, reload } = useMyWorkspaces();
  if (!list) return <Loading />;
  const ws = list.find((w) => w.code === code);
  if (!ws) return <Empty title="Workspace not found" body="Choose a division from the sidebar." action={<Link href="/os" className={btn}>Home</Link>} />;
  if (ws.access === "none") {
    return (
      <div className="mx-auto max-w-lg space-y-4" data-testid="os-ws-locked">
        <Empty title={`${ws.name} workspace`} body={ws.privacy === "restricted"
          ? "This workspace is restricted. Only people its lead or a founder adds can open it."
          : "You're not in this division. Ask for access and its lead will decide."} />
        {me.person.org_role !== "guest" && <RequestAccessForm type="division" id={ws.division_id} label={`the ${ws.name} workspace`} onDone={reload} />}
      </div>
    );
  }
  const sections = workspaceSections(ws);
  const tab = (sections as string[]).includes(search.get("tab") ?? "") ? (search.get("tab") as WsSection) : "overview";

  return (
    <div data-testid="os-ws-page">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-[#1F2D3D]">
            {ws.name}{ws.privacy === "restricted" && <Lock size={16} aria-label="Restricted workspace" className="text-[#66768A]" />}
          </h1>
          <p className={cn("text-sm", muted)}>{ws.code} · {ws.division_id} · {accessLabel(ws)}{ws.access === "view" ? " (view only)" : ""}</p>
        </div>
      </header>
      <Tabs label={`${ws.name} sections`} tabs={sections.map((s) => ({ key: s, label: TAB_LABEL[s] }))} current={tab} hrefFor={(k) => workspaceHref(ws.code, k as WsSection)} />
      {tab === "overview" && <Overview ws={ws} />}
      {tab === "projects" && <Projects ws={ws} />}
      {tab === "tasks" && <Tasks ws={ws} />}
      {tab === "documents" && <Documents ws={ws} />}
      {tab === "access" && <MembersAndAccess ws={ws} onChange={reload} />}
    </div>
  );
}

function Overview({ ws }: { ws: MyWorkspace }) {
  const open = ws.privacy === "open";
  const projects = useQuery<{ id: string }[]>((s) => open ? s.from("os_projects").select("id").eq("division_id", ws.division_id).not("status", "in", "(Completed,Cancelled)") : Promise.resolve({ data: [], error: null }), [ws.division_id]);
  const tasks = useQuery<{ id: string; due_date: string | null; status: string }[]>((s) => open ? s.from("os_tasks").select("id, due_date, status").eq("division_id", ws.division_id).not("status", "in", "(Done,Cancelled)") : Promise.resolve({ data: [], error: null }), [ws.division_id]);
  const docs = useQuery<{ id: string }[]>((s) => s.from("os_documents").select("id").eq("division_id", ws.division_id).neq("status", "Archived"), [ws.division_id]);
  const members = useQuery<{ person_id: string }[]>((s) => s.from("os_person_divisions").select("person_id").eq("division_id", ws.division_id), [ws.division_id]);
  const roles = useQuery<{ person_id: string }[]>((s) => s.from("os_workspace_roles").select("person_id").eq("division_id", ws.division_id).is("revoked_at", null), [ws.division_id]);
  const overdue = (tasks.data ?? []).filter((t) => relativeDue(t.due_date)?.overdue).length;
  const people = new Set([...(members.data ?? []), ...(roles.data ?? [])].map((m) => m.person_id)).size;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {open && <Stat label="Active projects" value={projects.data?.length ?? "…"} href={workspaceHref(ws.code, "projects")} />}
        {open && <Stat label="Open tasks" value={tasks.data?.length ?? "…"} href={workspaceHref(ws.code, "tasks")} />}
        {open && <Stat label="Overdue" value={tasks.data ? overdue : "…"} tone={overdue ? "red" : undefined} href={workspaceHref(ws.code, "tasks")} />}
        <Stat label="Documents" value={docs.data?.length ?? "…"} href={workspaceHref(ws.code, "documents")} />
        <Stat label="People" value={members.data && roles.data ? people : "…"} href={workspaceHref(ws.code, "access")} />
      </div>
      {!open && (
        <p className={cn(panel, "p-4 text-sm")}>
          This workspace is restricted. Its records are visible only to people with a role or grant here, whatever their position elsewhere.
          Managers of other divisions don&apos;t see it.
        </p>
      )}
    </div>
  );
}

function Projects({ ws }: { ws: MyWorkspace }) {
  const dir = useDirectory();
  const rows = useQuery<ProjectRow[]>((s) => s.from("os_projects").select(PROJECT_COLUMNS).eq("division_id", ws.division_id).order("due_date", { nullsFirst: false }), [ws.division_id]);
  return (
    <Section title="Projects" action={ws.access === "edit" ? <Link href={`/os/projects?division=${ws.division_id}&new=1`} className={btn}>New project</Link> : undefined}>
      <ErrorLine message={rows.error} />
      <RowList rows={rows.data ?? []} rowKey={(p) => p.id} rowHref={(p) => `/os/projects/${p.id}`} testId="os-ws-projects"
        empty={rows.data ? <Empty compact title="No projects in this division" /> : <Loading />}
        columns={[
          { key: "n", label: "Project", primary: true, className: "w-[40%]", render: (p) => <span className="truncate">{p.name}</span> },
          { key: "c", label: "Company", className: "w-28", render: (p) => <span className="text-xs">{companyName(p.company_code)}</span> },
          { key: "s", label: "Status", className: "w-28", render: (p) => <StatusBadge value={p.status} /> },
          { key: "o", label: "Owner", className: "w-32", render: (p) => personLabel(dir?.peopleById ?? new Map(), p.owner_person_id) },
          { key: "d", label: "Deadline", className: "w-28", render: (p) => <span className="text-xs">{fmtDate(p.due_date)}</span> },
        ]} />
    </Section>
  );
}

function Tasks({ ws }: { ws: MyWorkspace }) {
  const dir = useDirectory();
  const rows = useQuery<TaskRow[]>((s) => s.from("os_tasks").select(TASK_COLUMNS).eq("division_id", ws.division_id).not("status", "in", "(Done,Cancelled)").order("due_date", { nullsFirst: false }).limit(300), [ws.division_id]);
  return (
    <Section title="Open tasks">
      <ErrorLine message={rows.error} />
      <RowList rows={rows.data ?? []} rowKey={(t) => t.id} rowHref={(t) => `/os/tasks/${t.id}`} testId="os-ws-tasks"
        empty={rows.data ? <Empty compact title="No open tasks in this division" /> : <Loading />}
        columns={[
          { key: "n", label: "Task", primary: true, className: "w-[42%]", render: (t) => <span className="truncate">{t.title}</span> },
          { key: "s", label: "Status", className: "w-28", render: (t) => <StatusBadge value={t.status} /> },
          { key: "o", label: "Owner", className: "w-32", render: (t) => personLabel(dir?.peopleById ?? new Map(), t.owner_person_id) },
          { key: "d", label: "Due", className: "w-28", render: (t) => { const r = relativeDue(t.due_date); return <span className={cn("text-xs", r?.overdue && "font-medium text-[#A12D2F]")}>{r?.overdue ? r.label : fmtDate(t.due_date)}</span>; } },
        ]} />
    </Section>
  );
}

function Documents({ ws }: { ws: MyWorkspace }) {
  const rows = useQuery<DocRow[]>((s) => s.from("os_documents").select(DOC_COLUMNS).eq("division_id", ws.division_id).neq("status", "Archived").order("title"), [ws.division_id]);
  return (
    <Section title="Documents" action={ws.access === "edit" ? <Link href={`/os/documents?division=${ws.division_id}&new=1`} className={btn}>New document</Link> : undefined}>
      <ErrorLine message={rows.error} />
      <RowList rows={rows.data ?? []} rowKey={(d) => d.id} rowHref={(d) => `/os/documents/${d.id}`} testId="os-ws-documents"
        empty={rows.data ? <Empty compact title="No documents registered" body="Documents stay in Google Drive; the register links to them." /> : <Loading />}
        columns={[
          { key: "t", label: "Document", primary: true, className: "w-[45%]", render: (d) => <span className="truncate">{d.title}</span> },
          { key: "n", label: "Number", className: "w-36", render: (d) => <span className="text-xs text-[#66768A]">{d.reference_number ?? d.id}</span> },
          { key: "c", label: "Company", className: "w-28", render: (d) => <span className="text-xs">{companyName(d.company_code)}</span> },
          { key: "s", label: "Status", className: "w-28", render: (d) => <StatusBadge value={d.status} /> },
        ]} />
    </Section>
  );
}

type RoleRow = { id: string; person_id: string; role: WsRole; reason: string; granted_by: string | null; created_at: string; expires_at: string | null };
type GrantRow = { id: string; person_id: string; level: string; reason: string; expires_at: string | null; granted_by: string };

function MembersAndAccess({ ws, onChange }: { ws: MyWorkspace; onChange: () => void }) {
  const { me, supabase } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const isFounder = me.isAdmin;
  const members = useQuery<{ person_id: string; is_manager: boolean }[]>((s) => s.from("os_person_divisions").select("person_id, is_manager").eq("division_id", ws.division_id), [ws.division_id]);
  const roles = useQuery<RoleRow[]>((s) => s.from("os_workspace_roles").select("id, person_id, role, reason, granted_by, created_at, expires_at").eq("division_id", ws.division_id).is("revoked_at", null).order("created_at"), [ws.division_id]);
  const grants = useQuery<GrantRow[]>((s) => s.from("os_grants").select("id, person_id, level, reason, expires_at, granted_by").eq("resource_type", "division").eq("resource_id", ws.division_id).is("revoked_at", null), [ws.division_id]);
  const requests = useQuery<AccessRequestRow[]>((s) => s.from("os_access_requests").select(ACCESS_REQUEST_COLUMNS).eq("resource_type", "division").eq("resource_id", ws.division_id).eq("status", "pending").neq("requester_person_id", me.person.id), [ws.division_id]);
  const labels = useRequestLabels(requests.data);
  const can = grantableRoles(ws.code, { founder: isFounder, lead: ws.is_lead });
  const now = Date.now();
  const live = (roles.data ?? []).filter((r) => !r.expires_at || Date.parse(r.expires_at) > now);
  const [err, setErr] = useState<string | null>(null);
  const revoke = async (id: string) => {
    setErr(null);
    const { error } = await supabase.from("os_workspace_roles").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return setErr(friendlyError(error.message));
    roles.reload(); onChange();
  };
  const refresh = () => { roles.reload(); grants.reload(); requests.reload(); onChange(); };

  return (
    <div className="space-y-6">
      {!!requests.data?.length && (
        <Section title={`Access requests (${requests.data.length})`}>
          <AccessRequestList rows={requests.data} labels={labels} onChange={refresh} testId="os-ws-requests" />
        </Section>
      )}
      <Section title="Division members">
        {!members.data ? <Loading /> : members.data.length ? (
          <ul className="flex flex-wrap gap-1.5" data-testid="os-ws-members">
            {members.data.map((m) => <li key={m.person_id} className="flex items-center gap-1 rounded-full bg-[#F0F2F5] py-0.5 pl-0.5 pr-2 text-xs"><Avatar name={personLabel(people, m.person_id)} size={18} />{personLabel(people, m.person_id)}{m.is_manager && " · manager"}</li>)}
          </ul>
        ) : <p className={cn("text-sm", muted)}>No one is a member of this division. {ws.privacy === "restricted" ? "Give people a workspace role below." : ""}</p>}
        <p className={cn("mt-2 text-xs", muted)}>Division membership is set by founders in Admin → People.</p>
      </Section>
      <Section title="Workspace roles">
        <ErrorLine message={err} />
        {!roles.data ? <Loading /> : live.length ? (
          <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-ws-roles">
            {live.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{personLabel(people, r.person_id)}</span>
                <Badge tone="blue">{ROLE_LABELS[r.role]}</Badge>
                <span className={cn("min-w-0 flex-1 truncate text-xs", muted)}>{r.reason}{r.expires_at ? ` · until ${fmtDate(r.expires_at)}` : ""}</span>
                {(ws.is_lead || isFounder || r.granted_by === me.person.id) && <button type="button" className={btnDanger} onClick={() => revoke(r.id)}>Revoke</button>}
              </li>
            ))}
          </ul>
        ) : <p className={cn("text-sm", muted)}>No workspace roles yet.</p>}
        {can.length > 0 && <GiveRole ws={ws} roles={can} founder={isFounder} onDone={refresh} />}
      </Section>
      {grants.data && grants.data.length > 0 && (
        <Section title="Temporary access">
          <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-ws-grants">
            {grants.data.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{personLabel(people, g.person_id)}</span>
                <Badge>{g.level === "edit" ? "Can edit" : "Can view"}</Badge>
                <span className={cn("min-w-0 flex-1 truncate text-xs", muted)}>{g.reason}{g.expires_at ? ` · until ${fmtDate(g.expires_at)}` : ""}</span>
              </li>
            ))}
          </ul>
          {isFounder && <p className={cn("mt-2 text-xs", muted)}>Revoke grants in Admin → Access.</p>}
        </Section>
      )}
    </div>
  );
}

function GiveRole({ ws, roles, founder, onDone }: { ws: MyWorkspace; roles: WsRole[]; founder: boolean; onDone: () => void }) {
  const { supabase } = useOsMe();
  const today = todayJakarta();
  const [person, setPerson] = useState("");
  const [role, setRole] = useState<WsRole>(roles[0]);
  const [reason, setReason] = useState("");
  const [until, setUntil] = useState(founder ? "" : addDays(today, 90));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null);
    const expires = until ? new Date(`${addDays(until, 1)}T00:00:00+07:00`).toISOString() : null;
    const { error } = await supabase.from("os_workspace_roles").insert({ person_id: person, division_id: ws.division_id, role, reason: reason.trim(), expires_at: expires });
    setBusy(false);
    if (error) return setErr(friendlyError(error.message));
    setPerson(""); setReason(""); onDone();
  };
  return (
    <form className={cn(panel, "mt-3 space-y-3 p-4")} onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="os-ws-give-role">
      <p className="text-sm font-medium">Give a role</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Person">{(id) => <PersonSelect id={id} value={person} onChange={setPerson} placeholder="Choose a person" />}</Field>
        <Field label="Role">{(id) => <Select id={id} value={role} onChange={(v) => setRole(v as WsRole)} options={roles.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />}</Field>
        <Field label="Until" hint={founder ? "Leave empty for no end date." : "Within a year."}>{(id) => <input id={id} type="date" className={input} value={until} min={today} max={founder ? undefined : addDays(today, 360)} required={!founder} onChange={(e) => setUntil(e.target.value)} />}</Field>
      </div>
      <Field label="Reason">{(id) => <input id={id} className={input} value={reason} maxLength={500} required onChange={(e) => setReason(e.target.value)} />}</Field>
      <ErrorLine message={err} />
      <button type="submit" className={btnPrimary} disabled={busy || !person || !reason.trim()}>{busy ? "Saving…" : "Give role"}</button>
    </form>
  );
}
