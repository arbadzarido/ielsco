"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { PageHeader, Notice } from "@/components/dashboard/PageStates";
import { btnLink, card, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import { COMPANY_LABEL, ROLE_LABEL, type OsDivision } from "@/lib/os/types";

// Phase 1 Home: who you are in the OS and where your work will live. Tasks, documents and approvals arrive in phases 2–3,
// so this page shows nothing it cannot back with real data.
// These screens belong to the public IELSco site and its own admin access, so they open on www.ielsco.com: the OS host
// never serves public routes.
const SITE = "https://www.ielsco.com";
const EXISTING_ADMIN = [
  { href: `${SITE}/dashboard/admin/stories`, label: "Member Stories and IELSco Stories", note: "Draft, review, publish" },
  { href: `${SITE}/dashboard/admin/opportunities`, label: "Opportunities", note: "Scholarships, programs, jobs abroad" },
  { href: `${SITE}/dashboard/admin/operations`, label: "Operations", note: "Inquiries, applications, members, sessions" },
];

export default function OsHomePage() {
  const { me, supabase } = useOsMe();
  const [divisions, setDivisions] = useState<OsDivision[] | null>(null);
  const [counts, setCounts] = useState<{ people: number; proposedRoutes: number } | null>(null);
  const isAdmin = me.isAdmin;

  useEffect(() => {
    supabase.from("os_divisions").select("id, code, name, owner_person_id, drive_folder_id").order("id")
      .then(({ data }) => setDivisions((data as OsDivision[]) ?? []));
    if (isAdmin) {
      Promise.all([
        supabase.from("os_people").select("id", { count: "exact", head: true }).in("status", ["onboarding", "active"]),
        supabase.from("os_folder_routes").select("id", { count: "exact", head: true }).eq("status", "proposed"),
      ]).then(([p, r]) => setCounts({ people: p.count ?? 0, proposedRoutes: r.count ?? 0 }));
    }
  }, [supabase, isAdmin]);

  const mine = new Set(me.divisions.map((d) => d.division_id));
  const myDivisions = (divisions ?? []).filter((d) => mine.has(d.id));
  const firstName = (me.person.short_name || me.person.full_name).split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader title={`Hi, ${firstName}`} description="Your Company OS home. Tasks, documents and approvals appear here as each phase goes live." />

      {me.person.status === "onboarding" && (
        <Notice>Your account is still marked as onboarding. A founder will switch it to active once your setup is complete.</Notice>
      )}

      <section className={cn(card, "grid gap-6 p-6 md:grid-cols-3")} aria-label="Your access">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2F4157]/55">Role</p>
          <p className="mt-1 text-xl font-bold">{ROLE_LABEL[me.person.org_role]}</p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2F4157]/55">Companies</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {isAdmin ? <span className={tag}>All companies</span> :
              me.companies.length ? me.companies.map((c) => <span key={c} className={tag}>{COMPANY_LABEL[c]}</span>) :
              <span className="text-[#2F4157]/60">None yet</span>}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#2F4157]/55">Divisions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {myDivisions.length ? myDivisions.map((d) => (
              <span key={d.id} className={tag}>{d.name}{me.divisions.find((x) => x.division_id === d.id)?.is_manager ? " · manager" : ""}</span>
            )) : <span className="text-[#2F4157]/60">{divisions ? "None yet" : "Loading…"}</span>}
          </div>
        </div>
      </section>

      {me.needsMfa && (
        <Notice>Admin needs two-step verification. <Link href="/os/account" className={btnLink}>Set it up in My account</Link>; it takes a minute.</Notice>
      )}

      {isAdmin && counts && (
        <section aria-label="Founder overview" className="grid gap-4 sm:grid-cols-2">
          <Link href="/os/admin" className={cn(card, "block p-5 hover:border-[#577E90]")}>
            <p className="text-3xl font-bold">{counts.people}</p>
            <p className="text-[#2F4157]/70">people with OS access</p>
          </Link>
          <Link href="/os/admin?tab=routes" className={cn(card, "block p-5 hover:border-[#577E90]")}>
            <p className="text-3xl font-bold">{counts.proposedRoutes}</p>
            <p className="text-[#2F4157]/70">Drive folder routes waiting for your approval</p>
          </Link>
        </section>
      )}

      <section aria-label="Website admin">
        <h2 className="mb-3 text-xl font-bold">Website admin (existing screens)</h2>
        <p className="mb-4 text-[#2F4157]/70">These open on www.ielsco.com in a new tab and use the website&apos;s own admin access.</p>
        <ul className="grid gap-3 md:grid-cols-3">
          {EXISTING_ADMIN.map((a) => (
            <li key={a.href} className={cn(card, "p-4")}>
              <a href={a.href} target="_blank" rel="noopener noreferrer" className={btnLink}>{a.label} <ExternalLink size={14} aria-hidden="true" /></a>
              <p className="mt-1 text-sm text-[#2F4157]/65">{a.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
