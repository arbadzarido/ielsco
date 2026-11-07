// Company OS invitation groups: "C-Level", "Managers", "Associates", "All staff", a division, and combinations such
// as "All Associates in IELSco" or "Managers in Growth". Pure: the candidates come from os_invite_candidates (active,
// non-guest staff of the event's company, read with the person's own session).
//
// Policy:
//   * A group is resolved ONCE, when people are invited. The attendees saved are individuals, each remembering the
//     group that brought them in (via_group). That list is the event's snapshot: later joiners or leavers don't
//     change an existing event (or any occurrence of a recurring one) unless someone refreshes it and confirms the
//     difference shown by groupDiff().
//   * Roles come from the registry, never from guesses: C-Level = founders; Managers = managers, or anyone who
//     manages a division; Associates = members who manage no division; All staff = all of the above.
//   * Someone in two groups is invited once; the preview lists them as a duplicate that was merged.
export const ROLE_GROUPS = [
  { key: "c_level", label: "C-Level" },
  { key: "managers", label: "Managers" },
  { key: "associates", label: "Associates" },
  { key: "all", label: "All staff" },
] as const;
export type RoleGroup = (typeof ROLE_GROUPS)[number]["key"];

export interface Candidate { person_id: string; full_name: string; short_name: string | null; org_role: string; companies: string[]; divisions: string[]; managed_divisions: string[] }
export interface GroupSpec { role?: RoleGroup; division?: string; company?: string }
export interface Invitee { person_id: string; name: string; via: string | null; companies: string[]; divisions: string[] }
export interface Resolution { invitees: Invitee[]; duplicates: { person_id: string; name: string; groups: string[] }[]; alreadyInvited: Invitee[]; empty: string[] }

const COMPANY: Record<string, string> = { HQ: "HQ", IEL: "IELSco", ELC: "Elco AI" };

export function inRole(c: Candidate, role: RoleGroup): boolean {
  if (c.org_role === "guest") return false;
  switch (role) {
    case "c_level": return c.org_role === "founder";
    case "managers": return c.org_role === "manager" || (c.org_role !== "founder" && c.managed_divisions.length > 0);
    case "associates": return c.org_role === "member" && c.managed_divisions.length === 0;
    case "all": return true;
  }
}

/** "All Associates in IELSco", "Managers in Growth", "Creative", "C-Level". */
export function groupLabel(g: GroupSpec, divisionName: (id: string) => string = (x) => x): string {
  const role = g.role ? ROLE_GROUPS.find((r) => r.key === g.role)!.label : null;
  const where = [g.division ? divisionName(g.division) : null, g.company ? COMPANY[g.company] ?? g.company : null].filter(Boolean).join(", ");
  if (!role) return where || "Everyone";
  const head = g.role === "associates" && !g.division ? `All ${role}` : role;
  return where ? `${head} in ${where}` : head;
}

export function membersOf(candidates: Candidate[], g: GroupSpec): Candidate[] {
  return candidates.filter((c) => (!g.role || inRole(c, g.role)) && (!g.division || c.divisions.includes(g.division)) && (!g.company || c.org_role === "founder" || c.companies.includes(g.company)));
}

/** People to invite for some groups and individuals, deduplicated, minus those already on the event. */
export function resolveInvitations(candidates: Candidate[], groups: GroupSpec[], individuals: string[], existing: string[] = [], divisionName?: (id: string) => string): Resolution {
  const byId = new Map(candidates.map((c) => [c.person_id, c]));
  const seen = new Map<string, Invitee>();
  const groupsOf = new Map<string, string[]>();
  const empty: string[] = [];
  const add = (c: Candidate, via: string | null) => {
    if (via) groupsOf.set(c.person_id, [...(groupsOf.get(c.person_id) ?? []), via]);
    if (!seen.has(c.person_id)) seen.set(c.person_id, { person_id: c.person_id, name: c.full_name, via, companies: c.companies, divisions: c.divisions });
  };
  for (const g of groups) {
    const label = groupLabel(g, divisionName);
    const m = membersOf(candidates, g);
    if (!m.length) empty.push(label);
    for (const c of m) add(c, label);
  }
  // Individuals chosen by hand win over a group as the reason they're on the list.
  for (const id of individuals) { const c = byId.get(id); if (c) { const had = seen.get(id); if (had) had.via = null; else add(c, null); } }
  const all = [...seen.values()];
  const dupes = [...groupsOf.entries()].filter(([, gs]) => gs.length > 1).map(([id, gs]) => ({ person_id: id, name: byId.get(id)!.full_name, groups: gs }));
  const ex = new Set(existing);
  return { invitees: all.filter((i) => !ex.has(i.person_id)), alreadyInvited: all.filter((i) => ex.has(i.person_id)), duplicates: dupes, empty };
}

/** What re-applying a group to an existing event would change. Shown for confirmation; never applied silently. */
export function groupDiff(candidates: Candidate[], g: GroupSpec, current: { person_id: string; via_group: string | null }[], divisionName?: (id: string) => string) {
  const label = groupLabel(g, divisionName);
  const now = new Set(membersOf(candidates, g).map((c) => c.person_id));
  const fromGroup = current.filter((a) => a.via_group === label).map((a) => a.person_id);
  const onEvent = new Set(current.map((a) => a.person_id));
  return { label, joined: [...now].filter((p) => !onEvent.has(p)), left: fromGroup.filter((p) => !now.has(p)) };
}
