"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useOsMe } from "@/components/os/OsProvider";
import { useQuery } from "@/components/os/data";
import { ACCESS_REQUEST_COLUMNS, AccessRequestList, RequestAccessForm, useRequestLabels, type AccessRequestRow } from "@/components/os/access-requests";
import { useMyWorkspaces } from "@/components/os/workspaces";
import { ErrorLine, Field, Loading, PageTitle, Section, Select, muted } from "@/components/os/ui";
import { cn } from "@/lib/utils";

// Access requests in one place: what I asked for, and what is waiting for my decision. RLS returns only the requests
// a person made or may decide.
export default function AccessPage() {
  const { me } = useOsMe();
  const focus = useSearchParams().get("focus");
  const rows = useQuery<AccessRequestRow[]>((s) => s.from("os_access_requests").select(ACCESS_REQUEST_COLUMNS).order("created_at", { ascending: false }).limit(200), []);
  const labels = useRequestLabels(rows.data);
  const { list, reload } = useMyWorkspaces();
  const [ws, setWs] = useState("");
  const all = rows.data ?? [];
  const toDecide = all.filter((r) => r.requester_person_id !== me.person.id);
  const mine = all.filter((r) => r.requester_person_id === me.person.id);
  const askable = (list ?? []).filter((w) => w.access !== "edit");
  const chosen = askable.find((w) => w.division_id === ws);
  const refresh = () => { rows.reload(); reload(); };

  return (
    <div className="space-y-6">
      <PageTitle title="Access requests" description="Ask for access to a division workspace, project or document. The person who runs it decides, and access ends on the date you ask for." />
      <ErrorLine message={rows.error} />
      {!rows.data ? <Loading /> : (
        <>
          {toDecide.some((r) => r.status === "pending") || toDecide.length ? (
            <Section title={`Waiting for your decision (${toDecide.filter((r) => r.status === "pending").length})`}>
              <AccessRequestList rows={toDecide} labels={labels} onChange={refresh} focus={focus} testId="os-acr-decide" />
            </Section>
          ) : null}
          <Section title="Your requests">
            <AccessRequestList rows={mine} labels={labels} onChange={refresh} focus={focus} testId="os-acr-mine" />
          </Section>
        </>
      )}
      {me.person.org_role !== "guest" && (
        <Section title="Ask for workspace access">
          {askable.length ? (
            <div className="space-y-3">
              <Field label="Workspace" className="max-w-sm">{(id) => <Select id={id} value={ws} onChange={setWs} placeholder="Choose a workspace"
                options={askable.map((w) => ({ value: w.division_id, label: `${w.name}${w.access === "view" ? " (you can view)" : ""}` }))} />}</Field>
              {chosen && <RequestAccessForm key={chosen.division_id} type="division" id={chosen.division_id} label={`the ${chosen.name} workspace`} onDone={refresh} />}
            </div>
          ) : <p className={cn("text-sm", muted)}>You can already edit every workspace.</p>}
          <p className={cn("mt-2 text-xs", muted)}>For a project or document, use the request button on its page.</p>
        </Section>
      )}
    </div>
  );
}
