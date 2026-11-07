"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useDirectory, useQuery } from "@/components/os/data";
import { Avatar, Empty, ErrorLine, Loading, PageTitle, RowList, Select, StatusBadge, input } from "@/components/os/ui";
import { WORKSPACES, personLabel } from "@/lib/os/meta";
import { ROLE_LABEL } from "@/lib/os/types";
import { cn } from "@/lib/utils";

export default function PeoplePage() {
  const dir = useDirectory();
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [division, setDivision] = useState("");
  const [role, setRole] = useState("");
  const profiles = useQuery<{ person_id: string; title: string | null; manager_person_id: string | null }[]>((s) => s.from("os_person_profiles").select("person_id, title, manager_person_id"), []);
  const cos = useQuery<{ person_id: string; company_code: string }[]>((s) => s.from("os_person_companies").select("person_id, company_code"), []);
  const divs = useQuery<{ person_id: string; division_id: string; is_manager: boolean }[]>((s) => s.from("os_person_divisions").select("person_id, division_id, is_manager"), []);
  if (!dir) return <Loading />;
  const prof = new Map((profiles.data ?? []).map((p) => [p.person_id, p]));
  const people = dir.people.filter((p) => ["active", "onboarding"].includes(p.status) && p.org_role !== "guest")
    .filter((p) => (!role || p.org_role === role) && (!company || (cos.data ?? []).some((c) => c.person_id === p.id && c.company_code === company))
      && (!division || (divs.data ?? []).some((d) => d.person_id === p.id && d.division_id === division))
      && (!q || `${p.id} ${p.full_name} ${p.short_name ?? ""} ${prof.get(p.id)?.title ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageTitle title="People" description="Everyone with a Company OS account, their roles and reporting lines. Employment details and reviews are private." />
      <div className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
        <label className="relative col-span-2 md:w-64">
          <span className="sr-only">Search people</span>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8593A3]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className={cn(input, "pl-8")} />
        </label>
        <Select ariaLabel="Company" value={company} onChange={setCompany} options={WORKSPACES.filter((w) => w.code !== "HQ").map((w) => ({ value: w.code, label: w.name }))} placeholder="All companies" className="md:w-36" />
        <Select ariaLabel="Division" value={division} onChange={setDivision} options={dir.divisions.map((d) => ({ value: d.id, label: d.name }))} placeholder="All divisions" className="md:w-44" />
        <Select ariaLabel="Role" value={role} onChange={setRole} options={(["founder", "manager", "member"] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))} placeholder="Any role" className="col-span-2 md:w-36" />
      </div>
      <ErrorLine message={profiles.error} />
      <RowList testId="os-people-list" rows={people} rowKey={(p) => p.id} rowHref={(p) => `/os/people/${p.id}`}
        empty={<Empty title="No one matches" body="Clear the filters." />}
        columns={[
          { key: "n", label: "Name", primary: true, className: "w-[28%]", render: (p) => <span className="flex min-w-0 items-center gap-2"><Avatar name={p.full_name} size={22} /><span className="truncate">{p.full_name}</span></span> },
          { key: "t", label: "Title", className: "w-[20%]", render: (p) => <span className="truncate">{prof.get(p.id)?.title ?? ROLE_LABEL[p.org_role as keyof typeof ROLE_LABEL]}</span> },
          { key: "d", label: "Divisions", className: "w-[24%]", render: (p) => <span className="truncate text-xs text-[#66768A]">{(divs.data ?? []).filter((d) => d.person_id === p.id).map((d) => `${dir.divisionById.get(d.division_id)?.name ?? d.division_id}${d.is_manager ? " (manager)" : ""}`).join(", ") || "—"}</span> },
          { key: "m", label: "Reports to", className: "w-32", render: (p) => <span className="truncate text-xs">{prof.get(p.id)?.manager_person_id ? personLabel(dir.peopleById, prof.get(p.id)!.manager_person_id) : "—"}</span> },
          { key: "s", label: "Status", className: "w-24", hideOnMobile: true, render: (p) => <StatusBadge value={p.status === "onboarding" ? "Onboarding" : "Active"} /> },
        ]} />
    </div>
  );
}
