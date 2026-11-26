"use client";

import { useState } from "react";
import { HandbookLink, HandbookList } from "@/components/os/handbook";
import { PageTitle, Section, Select, input, muted, panel } from "@/components/os/ui";
import { DOC_KIND_ORDER, HANDBOOK } from "@/content/os/handbook";
import { DEPARTMENTS, DIVISIONS } from "@/lib/os/org";
import { cn } from "@/lib/utils";

// The Company OS Handbook: operating guides, SOPs, job descriptions (inside each division guide), project guides and
// meeting packs. Content lives with the code (src/content/os/handbook.ts) so every change is reviewed; Drive documents
// stay in Documents.
export default function HandbookPage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [division, setDivision] = useState("");
  const match = (d: (typeof HANDBOOK)[number]) => (!dept || d.department === dept) && (!division || d.division === division)
    && (!q || `${d.title} ${d.summary} ${d.ref}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageTitle title="Handbook" description="Operating guides, SOPs, job descriptions and meeting packs for every department and division. Drafts until a founder approves them." />
      <div className={cn(panel, "mb-5 p-4")}>
        <h2 className="mb-2 text-sm font-semibold text-[#1F2D3D]">HQ Leaders Meeting #1 · 26 November 2026</h2>
        <ul className="grid gap-1.5 md:grid-cols-2">
          <li><HandbookLink label="Meeting agenda, outcomes and minutes" href="/os/handbook/hq-leaders-meeting-01" /></li>
          <li><HandbookLink label="HQ Leaders Meeting #1 (PowerPoint)" href="/os/api/files/hq-leaders-meeting-01" /></li>
          <li><HandbookLink label="IELS Circle learning deck" href="/os/api/files/learning-circle" /></li>
          <li><HandbookLink label="Global Impact Fellowship learning deck" href="/os/api/files/learning-gif" /></li>
          <li><HandbookLink label="Elco AI learning deck" href="/os/api/files/learning-elco" /></li>
          <li><HandbookLink label="IELS Course learning deck" href="/os/api/files/learning-course" /></li>
        </ul>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the handbook" aria-label="Search the handbook" className={cn(input, "md:w-64")} />
        <Select ariaLabel="Department" value={dept} onChange={(v) => { setDept(v); setDivision(""); }} placeholder="All departments" className="w-auto" options={DEPARTMENTS.map((d) => ({ value: d.key, label: d.name }))} />
        <Select ariaLabel="Division" value={division} onChange={setDivision} placeholder="All divisions" className="w-auto" options={DIVISIONS.filter((d) => !dept || d.department === dept).map((d) => ({ value: d.code, label: d.name }))} />
      </div>
      {DOC_KIND_ORDER.map((k) => HANDBOOK.some((d) => d.kind === k && match(d)) && (
        <Section key={k} className="mb-5" title={k === "Division guide" ? "Division guides (with job descriptions)" : `${k}s`}>
          <HandbookList filter={(d) => d.kind === k && match(d)} />
        </Section>
      ))}
      <p className={cn("mt-4 text-xs", muted)}>Templates and signed documents are in Documents (Google Drive). To change a handbook page, ask Operations; changes are reviewed like code.</p>
    </div>
  );
}
