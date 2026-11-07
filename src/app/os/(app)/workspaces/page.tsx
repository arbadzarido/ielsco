"use client";

import { useEffect, useState } from "react";
import { useOsMe } from "@/components/os/OsProvider";
import { ErrorState, LoadingState, PageHeader } from "@/components/dashboard/PageStates";
import { btnLink, card, tag } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import type { OsDivision, OsPerson, OsPersonDivision } from "@/lib/os/types";

// The seven divisions (DOC-0053) with their owner and members. Staff can read the directory; guests get nothing from RLS.
export default function WorkspacesPage() {
  const { me, supabase } = useOsMe();
  const [data, setData] = useState<{ divisions: OsDivision[]; people: OsPerson[]; links: OsPersonDivision[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("os_divisions").select("id, code, name, owner_person_id, drive_folder_id").order("id"),
      supabase.from("os_people").select("id, user_id, full_name, short_name, org_role, status, google_account").in("status", ["onboarding", "active"]),
      supabase.from("os_person_divisions").select("person_id, division_id, is_manager"),
    ]).then(([d, p, l]) => {
      const e = d.error ?? p.error ?? l.error;
      if (e) return setError(e.message);
      setData({ divisions: (d.data as OsDivision[]) ?? [], people: (p.data as OsPerson[]) ?? [], links: (l.data as OsPersonDivision[]) ?? [] });
    });
  }, [supabase]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;
  const name = (id: string | null) => {
    const p = data.people.find((x) => x.id === id);
    return p ? p.short_name || p.full_name : null;
  };
  const mine = new Set(me.divisions.map((d) => d.division_id));

  return (
    <div>
      <PageHeader title="Workspaces" description="One workspace per division. Each will hold the division's tasks, projects and documents as those phases go live." />
      <ul className="grid gap-4 md:grid-cols-2">
        {data.divisions.map((d) => {
          const members = data.links.filter((l) => l.division_id === d.id);
          return (
            <li key={d.id} className={cn(card, "p-5", mine.has(d.id) && "border-[#577E90]")}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#2F4157]/55">{d.id} · {d.code}</p>
                  <h2 className="text-xl font-bold">{d.name}</h2>
                </div>
                {mine.has(d.id) && <span className={tag}>Your division</span>}
              </div>
              <p className="mt-3 text-[#2F4157]/75">Owner: {name(d.owner_person_id) ?? "not set"}</p>
              <p className="mt-1 text-[#2F4157]/75">
                Members: {members.length ? members.map((m) => `${name(m.person_id) ?? m.person_id}${m.is_manager ? " (manager)" : ""}`).join(", ") : "none yet"}
              </p>
              {d.drive_folder_id && (
                <a href={`https://drive.google.com/drive/folders/${d.drive_folder_id}`} target="_blank" rel="noreferrer" className={cn(btnLink, "mt-3")}>
                  Open the Drive folder
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
