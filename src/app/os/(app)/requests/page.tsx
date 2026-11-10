"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { useQuery } from "@/components/os/data";
import { NewRequestSheet, RequestList, useRequestScope, useRequestTypes } from "@/components/os/requests";
import { ErrorLine, Loading, PageTitle, Tabs, btnPrimary } from "@/components/os/ui";
import { REQUEST_COLUMNS, isOpen, queueOrder, type RequestRow } from "@/lib/os/requests";

// Requests between divisions. RLS returns only the requests the person may read; the tabs only sort them.
export default function RequestsPage() {
  const { me } = useOsMe();
  const params = useSearchParams();
  const [creating, setCreating] = useState(params.get("new") === "1");
  const rows = useQuery<RequestRow[]>((s) => s.from("os_requests").select(REQUEST_COLUMNS).order("created_at", { ascending: false }).limit(500), []);
  const types = useRequestTypes();
  const scope = useRequestScope();
  const typeMap = useMemo(() => new Map((types.data ?? []).map((t) => [t.code, t])), [types.data]);
  const all = useMemo(() => rows.data ?? [], [rows.data]);
  const tabs = useMemo(() => {
    const incoming = queueOrder(all.filter((r) => r.requester_person_id !== me.person.id && (scope.visible.has(r.to_division_id) || r.owner_person_id === me.person.id) && r.approval_status !== "pending"));
    const sent = all.filter((r) => r.requester_person_id === me.person.id);
    const approval = all.filter((r) => r.approval_status === "pending" && r.status === "submitted" && scope.leads.has(r.from_division_id) && r.requester_person_id !== me.person.id);
    return { incoming, sent, approval, all };
  }, [all, me.person.id, scope]);
  const tab = (["incoming", "sent", "approval", "all"] as const).find((k) => k === params.get("tab")) ?? "incoming";
  const labels = { incoming: "To my divisions", sent: "Sent by me", approval: "Needs my approval", all: "All I can see" };

  return (
    <div>
      <PageTitle title="Requests" description="Ask another division for work, follow it through approval and delivery, and accept the result."
        actions={me.person.org_role !== "guest" ? <button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-request-new"><Plus size={15} aria-hidden="true" />New request</button> : undefined} />
      <Tabs label="Request lists" current={tab} hrefFor={(k) => `/os/requests${k === "incoming" ? "" : `?tab=${k}`}`}
        tabs={(Object.keys(labels) as (keyof typeof labels)[]).map((k) => ({ key: k, label: labels[k], count: k === "all" ? undefined : tabs[k].filter(isOpen).length }))} />
      <ErrorLine message={rows.error} />
      {!rows.data ? <Loading /> : (
        <RequestList rows={tabs[tab]} types={typeMap} testId={`os-requests-${tab}`}
          empty={{ incoming: "Nothing waiting for your divisions", sent: "You haven't sent any requests", approval: "Nothing waiting for your approval", all: "No requests yet" }[tab]} />
      )}
      {creating && <NewRequestSheet open onClose={() => setCreating(false)} />}
    </div>
  );
}
