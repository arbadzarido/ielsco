// Company OS shared types and labels. Values mirror the checks in supabase/migrations/20261107000000_company_os_foundation.sql.

export type OrgRole = "founder" | "manager" | "member" | "guest";
export type PersonStatus = "invited" | "onboarding" | "active" | "suspended" | "revoked" | "inactive" | "offboarded";
export type CompanyCode = "HQ" | "IEL" | "ELC";

export interface OsPerson {
  id: string;
  user_id: string | null;
  full_name: string;
  short_name: string | null;
  org_role: OrgRole;
  status: PersonStatus;
  google_account: string | null;
  status_reason?: string | null;
  status_changed_at?: string | null;
}

export const PERSON_COLUMNS = "id, user_id, full_name, short_name, org_role, status, google_account, status_reason, status_changed_at";

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
  resource_type: "division" | "document" | "project" | "people";
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
  /** Founder whose session passed two-step verification: may use Admin. */
  isAdmin: boolean;
  /** Founder whose session has not passed two-step verification yet. */
  needsMfa: boolean;
}

export const ROLE_LABEL: Record<OrgRole, string> = {
  founder: "Founder",
  manager: "Manager",
  member: "Team member",
  guest: "Guest",
};

export const STATUS_LABEL: Record<PersonStatus, string> = {
  invited: "Invited (waiting for approval)",
  onboarding: "Onboarding",
  active: "Active",
  suspended: "Suspended",
  revoked: "Access revoked",
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
    session: "Session",
  };
  const verb: Record<string, string> = { insert: "added", update: "changed", delete: "removed", reserve: "reserved", revoke: "ended", revoke_all: "all ended" };
  return `${what[table] ?? table} ${verb[op] ?? op ?? ""}`.trim();
}

/** Next free person ID after the highest existing one, in the Operations Master format (PPL-0001). */
export function nextPersonId(ids: string[]): string {
  const max = ids.reduce((m, id) => Math.max(m, /^PPL-\d{4}$/.test(id) ? Number(id.slice(4)) : 0), 0);
  return `PPL-${String(max + 1).padStart(4, "0")}`;
}

/** Statuses that can use the OS (with a company and a live session). */
export const ACCESS_STATUSES: PersonStatus[] = ["onboarding", "active"];

/** One row of os_login_history(): a Company OS sign-in attempt. */
export interface OsLoginEvent {
  id: number;
  at: string;
  user_id: string | null;
  person_id: string | null;
  email: string | null;
  success: boolean;
  reason: string;
  provider: string | null;
  session_id: string | null;
  ip: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  device_type: "desktop" | "mobile" | "tablet" | "unknown" | null;
  country: string | null;
  region: string | null;
  city: string | null;
  new_device: boolean;
  active: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  last_seen_at: string | null;
}

/** Plain-words reason for a sign-in result (admins only; the sign-in page always shows the same generic message). */
export const LOGIN_REASON_LABEL: Record<string, string> = {
  ok: "Signed in",
  ok_mfa_pending: "Signed in, waiting for two-step code",
  not_allowlisted: "Email not on the approved list",
  email_unverified: "Google email not verified",
  not_google: "Not a Google sign-in",
  awaiting_approval: "Invited, not approved yet",
  suspended: "Account suspended",
  revoked: "Access revoked",
  inactive: "Account inactive",
  offboarded: "Account offboarded",
  no_company: "No company membership",
  linked_to_other_account: "Registry entry linked to another login",
  session_check_failed: "Session check failed",
  check_failed: "Access check failed",
};

/** Accounts or addresses with this many refused sign-ins in 24 hours are flagged as suspicious. */
export const SUSPICIOUS_FAILURES = 3;

/** Groups refused sign-ins in the last 24 hours by email and by IP, keeping those at or over the threshold. */
export function suspiciousFailures(events: Pick<OsLoginEvent, "at" | "success" | "email" | "ip">[], now = Date.now()) {
  const since = now - 24 * 3600 * 1000;
  const tally = new Map<string, number>();
  for (const e of events) {
    if (e.success || Date.parse(e.at) < since) continue;
    if (e.email) tally.set(`email:${e.email}`, (tally.get(`email:${e.email}`) ?? 0) + 1);
    if (e.ip) tally.set(`ip:${e.ip}`, (tally.get(`ip:${e.ip}`) ?? 0) + 1);
  }
  return [...tally.entries()].filter(([, n]) => n >= SUSPICIOUS_FAILURES)
    .map(([k, n]) => ({ kind: k.startsWith("email:") ? ("email" as const) : ("ip" as const), value: k.slice(k.indexOf(":") + 1), count: n }))
    .sort((a, b) => b.count - a.count);
}
