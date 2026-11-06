// Company OS shared types and labels. Values mirror the checks in supabase/migrations/20261107000000_company_os_foundation.sql.

export type OrgRole = "founder" | "manager" | "member" | "guest";
export type PersonStatus = "onboarding" | "active" | "inactive" | "offboarded";
export type CompanyCode = "HQ" | "IEL" | "ELC";

export interface OsPerson {
  id: string;
  user_id: string | null;
  full_name: string;
  short_name: string | null;
  org_role: OrgRole;
  status: PersonStatus;
  google_account: string | null;
}

export interface OsDivision {
  id: string;
  code: string;
  name: string;
  owner_person_id: string | null;
  drive_folder_id: string | null;
}

export interface OsPersonDivision {
  person_id: string;
  division_id: string;
  is_manager: boolean;
}

export interface OsGrant {
  id: string;
  person_id: string;
  resource_type: "division" | "document" | "project";
  resource_id: string;
  level: "view" | "edit";
  reason: string;
  granted_by: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface OsAuditEntry {
  id: number;
  at: string;
  actor_person_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
}

export interface OsMe {
  person: OsPerson;
  divisions: OsPersonDivision[];
  companies: CompanyCode[];
}

export const ROLE_LABEL: Record<OrgRole, string> = {
  founder: "Founder",
  manager: "Manager",
  member: "Team member",
  guest: "Guest",
};

export const STATUS_LABEL: Record<PersonStatus, string> = {
  onboarding: "Onboarding",
  active: "Active",
  inactive: "Inactive",
  offboarded: "Offboarded",
};

export const COMPANY_LABEL: Record<CompanyCode, string> = {
  HQ: "HQ",
  IEL: "IELSco",
  ELC: "Elco AI",
};

/** A grant is live when it is not revoked and its end date (if any) is in the future. */
export function grantIsLive(g: Pick<OsGrant, "revoked_at" | "expires_at">, now = Date.now()): boolean {
  return !g.revoked_at && (!g.expires_at || Date.parse(g.expires_at) > now);
}

/** Readable label for an audit action such as "os_grants.insert". */
export function auditLabel(action: string): string {
  const [table, op] = action.split(".");
  const what: Record<string, string> = {
    os_people: "Person",
    os_person_companies: "Company membership",
    os_person_divisions: "Division membership",
    os_grants: "Access grant",
    os_folder_routes: "Folder route",
    os_divisions: "Division",
    doc_number: "Document number",
  };
  const verb: Record<string, string> = { insert: "added", update: "changed", delete: "removed", reserve: "reserved" };
  return `${what[table] ?? table} ${verb[op] ?? op ?? ""}`.trim();
}

/** Next free person ID after the highest existing one, in the Operations Master format (PPL-0001). */
export function nextPersonId(ids: string[]): string {
  const max = ids.reduce((m, id) => Math.max(m, /^PPL-\d{4}$/.test(id) ? Number(id.slice(4)) : 0), 0);
  return `PPL-${String(max + 1).padStart(4, "0")}`;
}
