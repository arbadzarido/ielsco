"use client";

// Subdivisions: named groups inside one division. None exist until the division's lead or a founder names one, so the
// list is whatever the organisation really has. The database decides who can see and change them.
import { useState } from "react";
import { friendlyError, useDirectory, useQuery } from "./data";
import { useOsMe } from "./OsProvider";
import { Avatar, Badge, ErrorLine, Field, Loading, Section, Select, btnGhost, btnPrimary, input, muted, panel } from "./ui";
import { personLabel } from "@/lib/os/meta";
import type { MyWorkspace } from "@/lib/os/workspaces";
import { cn } from "@/lib/utils";

export type Subdivision = { id: number; division_id: string; name: string; description: string | null; lead_person_id: string | null; active: boolean };
type Member = { subdivision_id: number; person_id: string };

/** A division's subdivisions (active first). Empty when there are none, or when the list can't be read. */
export function useSubdivisions(divisionId: string | null | undefined) {
  return useQuery<Subdivision[]>((s) => divisionId
    ? s.from("os_subdivisions").select("id, division_id, name, description, lead_person_id, active").eq("division_id", divisionId).order("active", { ascending: false }).order("name")
    : Promise.resolve({ data: [], error: null }), [divisionId]);
}

export function Subdivisions({ ws, people: workspacePeople }: { ws: MyWorkspace; people: string[] }) {
  const { supabase, me } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const subs = useSubdivisions(ws.division_id);
  const ids = (subs.data ?? []).map((s) => s.id);
  const members = useQuery<Member[]>((s) => ids.length ? s.from("os_subdivision_members").select("subdivision_id, person_id").in("subdivision_id", ids) : Promise.resolve({ data: [], error: null }), [ids.join(",")]);
  const canManage = me.isAdmin || ws.is_lead;
  const [name, setName] = useState("");
  const [lead, setLead] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = workspacePeople.map((id) => ({ value: id, label: personLabel(people, id) }));
  const run = async (q: PromiseLike<{ error: { message: string } | null }>) => {
    setErr(null);
    const { error } = await q;
    if (error) return setErr(friendlyError(error.message));
    subs.reload(); members.reload();
  };
  async function add() {
    setBusy(true);
    await run(supabase.from("os_subdivisions").insert({ division_id: ws.division_id, name: name.trim(), lead_person_id: lead || null }));
    setBusy(false); setName(""); setLead("");
  }

  return (
    <Section title="Subdivisions">
      <ErrorLine message={err ?? subs.error} />
      {!subs.data ? <Loading /> : subs.data.length ? (
        <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-ws-subdivisions">
          {subs.data.map((s) => {
            const mine = (members.data ?? []).filter((m) => m.subdivision_id === s.id);
            const addable = options.filter((o) => !mine.some((m) => m.person_id === o.value));
            return (
              <li key={s.id} className="space-y-2 px-3 py-3 text-sm" data-testid="os-subdivision">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  {!s.active && <Badge>Archived</Badge>}
                  <span className={cn("min-w-0 flex-1 text-xs", muted)}>{s.lead_person_id ? `Lead: ${personLabel(people, s.lead_person_id)}` : "No lead"}</span>
                  {canManage && <button type="button" className={cn(btnGhost, "min-h-8 text-xs")} onClick={() => run(supabase.from("os_subdivisions").update({ active: !s.active }).eq("id", s.id))}>{s.active ? "Archive" : "Restore"}</button>}
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {mine.map((m) => (
                    <li key={m.person_id} className="flex items-center gap-1 rounded-full bg-[#F0F2F5] py-0.5 pl-0.5 pr-2 text-xs">
                      <Avatar name={personLabel(people, m.person_id)} size={18} />{personLabel(people, m.person_id)}
                      {canManage && <button type="button" className="ml-0.5 rounded px-1 text-[#66768A] hover:text-[#A12D2F]" aria-label={`Remove ${personLabel(people, m.person_id)} from ${s.name}`}
                        onClick={() => run(supabase.from("os_subdivision_members").delete().eq("subdivision_id", s.id).eq("person_id", m.person_id))}>×</button>}
                    </li>
                  ))}
                  {!mine.length && <li className={cn("text-xs", muted)}>No members yet.</li>}
                </ul>
                {canManage && s.active && addable.length > 0 && (
                  <Select ariaLabel={`Add someone to ${s.name}`} value="" placeholder="Add a member…" className="sm:w-56" options={addable}
                    onChange={(v) => v && run(supabase.from("os_subdivision_members").insert({ subdivision_id: s.id, person_id: v }))} />
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className={cn("text-sm", muted)}>This division has no subdivisions. {canManage ? "Add one below if the team is split into groups." : "Its lead can add them."}</p>}
      {canManage && (
        <form className={cn(panel, "mt-3 grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-end")} onSubmit={(e) => { e.preventDefault(); add(); }} data-testid="os-subdivision-new">
          <Field label="New subdivision">{(id) => <input id={id} className={input} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />}</Field>
          <Field label="Lead (optional)">{(id) => <Select id={id} value={lead} onChange={setLead} placeholder="No lead" options={options} />}</Field>
          <button type="submit" className={btnPrimary} disabled={busy || !name.trim()}>{busy ? "Adding…" : "Add"}</button>
        </form>
      )}
      <p className={cn("mt-2 text-xs", muted)}>Only people already in this division can lead or join a subdivision. Tasks can be tagged with one.</p>
    </Section>
  );
}
