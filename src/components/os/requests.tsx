"use client";

// Cross-division requests: the list, the new-request form, and what the viewer may do. Every step is a database
// function that checks who may take it (os_request_*); these components only collect input and show results.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOsMe } from "./OsProvider";
import { useDirectory, useQuery } from "./data";
import { CompanySelect, useDefaultCompany } from "./pickers";
import { useMyWorkspaces } from "./workspaces";
import { Badge, Empty, ErrorLine, Field, RowList, Select, Sheet, btn, btnPrimary, input, muted } from "./ui";
import { PRIORITIES, addDays, fmtDate, personLabel, relativeDue, todayJakarta } from "@/lib/os/meta";
import { requestStage, sendableTypes, type RequestRow, type RequestType } from "@/lib/os/requests";
import { cn } from "@/lib/utils";

const OWN = /^(Only Company OS staff can send requests|Unknown request type|Only people in the requesting division can send this request|The deadline must be today or later|This request is not waiting for approval|You can't approve your own request|Give a reason for declining|This request is not waiting for triage|Choose an owner who works in the receiving division|Say what is missing or why|This request can no longer be edited|This request can't be started now|This request can't be delivered now|Only delivered work can be accepted|Only delivered work can be sent back|Say what needs to change|This request can't be cancelled now|Tasks are added once a request is accepted|Give the task a title)$/;
/** The database's own refusals are written for people; anything else becomes one generic line. */
export function requestError(message: string | null | undefined): string | null {
  if (!message) return null;
  if (OWN.test(message)) return message;
  if (/check constraint|violates/i.test(message)) return "Check the form: the title needs 3 characters and the brief 10.";
  return "That couldn't be done. Please try again.";
}

export function useRequestTypes() {
  return useQuery<RequestType[]>((s) => s.from("os_request_types").select("code, name, description, from_division_id, to_division_id, needs_approval, active, sort_order").order("sort_order"), []);
}

/** Which divisions the viewer leads and can edit, from os_my_workspaces. */
export function useRequestScope() {
  const { list } = useMyWorkspaces();
  return useMemo(() => {
    const l = list ?? [];
    return {
      ready: Boolean(list),
      leads: new Set(l.filter((w) => w.is_lead).map((w) => w.division_id)),
      editable: new Set(l.filter((w) => w.access === "edit").map((w) => w.division_id)),
      visible: new Set(l.filter((w) => w.access !== "none").map((w) => w.division_id)),
    };
  }, [list]);
}

export function RequestList({ rows, types, empty, testId }: { rows: RequestRow[]; types: Map<string, RequestType>; empty?: string; testId?: string }) {
  const dir = useDirectory();
  const div = (id: string) => dir?.divisionById.get(id)?.name ?? id;
  return (
    <RowList rows={rows} rowKey={(r) => r.id} rowHref={(r) => `/os/requests/${r.id}`} testId={testId}
      empty={<Empty compact title={empty ?? "No requests"} />}
      columns={[
        { key: "t", label: "Request", primary: true, className: "w-[34%]", render: (r) => <span className="truncate">{r.title}</span> },
        { key: "r", label: "Route", className: "w-44", render: (r) => <span className="truncate text-xs">{div(r.from_division_id)} → {div(r.to_division_id)}{types.get(r.type_code) ? ` · ${types.get(r.type_code)!.name}` : ""}</span> },
        { key: "s", label: "Status", className: "w-48", render: (r) => { const st = requestStage(r); return <Badge tone={st.tone}>{st.label}</Badge>; } },
        { key: "o", label: "Owner", className: "w-32", hideOnMobile: true, render: (r) => <span className="text-xs">{personLabel(dir?.peopleById ?? new Map(), r.owner_person_id, "Not assigned")}</span> },
        { key: "d", label: "Deadline", className: "w-28", render: (r) => { const due = relativeDue(r.due_date); const late = due?.overdue && !["closed", "declined", "cancelled"].includes(r.status); return <span className={cn("text-xs", late && "font-medium text-[#A12D2F]")}>{late ? due!.label : fmtDate(r.due_date)}</span>; } },
      ]} />
  );
}

export function NewRequestSheet({ open, onClose, defaultType }: { open: boolean; onClose: () => void; defaultType?: string }) {
  const { supabase, me } = useOsMe();
  const router = useRouter();
  const types = useRequestTypes();
  const scope = useRequestScope();
  const dir = useDirectory();
  const company = useDefaultCompany();
  const options = sendableTypes(types.data ?? [], scope.editable, me.isAdmin);
  const today = todayJakarta();
  const [type, setType] = useState(defaultType ?? "");
  const [co, setCo] = useState(company);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [priority, setPriority] = useState("P3 Normal");
  const [due, setDue] = useState(addDays(today, 7));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const chosen = options.find((t) => t.code === type);
  const submit = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("os_request_submit", { p_type: type, p_company: co, p_title: title, p_brief: brief, p_priority: priority, p_due: due });
    setBusy(false);
    if (error) return setErr(requestError(error.message));
    onClose(); router.push(`/os/requests/${data}`);
  };
  return (
    <Sheet open={open} onClose={onClose} title="New request" footer={
      <>
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} disabled={busy || !chosen || title.trim().length < 3 || brief.trim().length < 10} onClick={submit} data-testid="os-request-submit">{busy ? "Sending…" : "Send request"}</button>
      </>}>
      {types.data && !options.length ? (
        <Empty compact title="No routes for you yet" body="Requests are sent from a division you work in. Ask a founder if your division needs a route." />
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="os-request-form">
          <Field label="Request type">{(id) => <Select id={id} value={type} onChange={setType} placeholder="Choose a type" options={options.map((t) => ({ value: t.code, label: t.name }))} />}</Field>
          {chosen && (
            <p className={cn("text-xs", muted)}>
              From {dir?.divisionById.get(chosen.from_division_id)?.name} to {dir?.divisionById.get(chosen.to_division_id)?.name}.
              {chosen.needs_approval ? " Your division's lead approves it first." : ""} {chosen.description}
            </p>
          )}
          <Field label="Company">{(id) => <CompanySelect id={id} value={co} onChange={setCo} />}</Field>
          <Field label="Title">{(id) => <input id={id} className={input} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />}</Field>
          <Field label="Brief" hint="What you need, for whom, and what done looks like. Link files from Drive after sending.">{(id) => <textarea id={id} className={cn(input, "min-h-32")} value={brief} maxLength={5000} onChange={(e) => setBrief(e.target.value)} />}</Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Priority">{(id) => <Select id={id} value={priority} onChange={setPriority} options={PRIORITIES} />}</Field>
            <Field label="Deadline">{(id) => <input id={id} type="date" className={input} value={due} min={today} onChange={(e) => setDue(e.target.value)} />}</Field>
          </div>
          <ErrorLine message={err} />
        </form>
      )}
    </Sheet>
  );
}

