// Cross-division requests: labels, which steps a person is offered, and queue order. Pure (imported by tests with the
// .ts extension). The database functions decide what anyone may do; this only decides which buttons appear, mirroring
// those rules so a button never leads to a refusal.

export type RequestStatus = "submitted" | "info_needed" | "accepted" | "in_progress" | "delivered" | "closed" | "declined" | "cancelled";
export type ApprovalStatus = "not_needed" | "pending" | "approved" | "declined";
export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet" | "teal";

export interface RequestRow {
  id: string; type_code: string; company_code: string; from_division_id: string; to_division_id: string;
  requester_person_id: string; owner_person_id: string | null; title: string; brief: string; priority: string; due_date: string;
  approval_status: ApprovalStatus; status: RequestStatus; revision_rounds: number;
  delivered_at: string | null; accepted_at: string | null; closed_at: string | null; created_at: string; updated_at: string;
}
export const REQUEST_COLUMNS = "id, type_code, company_code, from_division_id, to_division_id, requester_person_id, owner_person_id, title, brief, priority, due_date, approval_status, status, revision_rounds, delivered_at, accepted_at, closed_at, created_at, updated_at";

export interface RequestType { code: string; name: string; description: string | null; from_division_id: string; to_division_id: string; needs_approval: boolean; active: boolean; sort_order: number }

export const STATUS_LABEL: Record<RequestStatus, string> = {
  submitted: "Waiting for triage", info_needed: "More information needed", accepted: "Accepted", in_progress: "In progress",
  delivered: "Delivered, waiting for acceptance", closed: "Closed", declined: "Declined", cancelled: "Cancelled",
};
export const STATUS_TONE: Record<RequestStatus, Tone> = {
  submitted: "amber", info_needed: "amber", accepted: "blue", in_progress: "blue", delivered: "violet", closed: "green", declined: "red", cancelled: "neutral",
};
export const APPROVAL_LABEL: Record<ApprovalStatus, string> = { not_needed: "No approval needed", pending: "Waiting for approval", approved: "Approved", declined: "Approval declined" };

/** The label a list shows: approval comes first while it is pending. */
export function requestStage(r: Pick<RequestRow, "status" | "approval_status">): { label: string; tone: Tone } {
  if (r.status === "submitted" && r.approval_status === "pending") return { label: APPROVAL_LABEL.pending, tone: "amber" };
  return { label: STATUS_LABEL[r.status], tone: STATUS_TONE[r.status] };
}

export const isOpen = (r: Pick<RequestRow, "status">) => !["closed", "declined", "cancelled"].includes(r.status);

export type RequestAction = "approve" | "triage" | "edit" | "assign" | "start" | "add_task" | "deliver" | "accept" | "send_back" | "cancel";

/** Steps offered to the viewer. `leadTo` / `leadFrom`: the viewer leads the receiving / requesting division
 * (os_workspace_lead; founders count). */
export function requestActions(r: Pick<RequestRow, "status" | "approval_status" | "requester_person_id" | "owner_person_id">,
  me: { personId: string; leadTo: boolean; leadFrom: boolean }): RequestAction[] {
  const out: RequestAction[] = [];
  const requester = r.requester_person_id === me.personId;
  const worker = r.owner_person_id === me.personId || me.leadTo;
  if (r.status === "submitted" && r.approval_status === "pending" && me.leadFrom && !requester) out.push("approve");
  if (r.status === "submitted" && ["not_needed", "approved"].includes(r.approval_status) && me.leadTo) out.push("triage");
  if (requester && ["submitted", "info_needed"].includes(r.status)) out.push("edit");
  if (me.leadTo && ["accepted", "in_progress"].includes(r.status)) out.push("assign");
  if (worker && r.status === "accepted") out.push("start");
  if (worker && ["accepted", "in_progress"].includes(r.status)) out.push("add_task", "deliver");
  if (requester && r.status === "delivered") out.push("accept", "send_back");
  if (requester && ["submitted", "info_needed", "accepted", "in_progress"].includes(r.status)) out.push("cancel");
  return out;
}

const PRIORITY_RANK: Record<string, number> = { "P1 Critical": 0, "P2 High": 1, "P3 Normal": 2, "P4 Low": 3 };
/** A receiving queue: open first, then by deadline, then by priority, then oldest first. */
export function queueOrder<T extends Pick<RequestRow, "status" | "due_date" | "priority" | "created_at">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number(!isOpen(a)) - Number(!isOpen(b)) || a.due_date.localeCompare(b.due_date)
    || (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || a.created_at.localeCompare(b.created_at));
}

/** Routes a person may send: those from a division where they can edit (founders: all). */
export function sendableTypes(types: RequestType[], editable: Set<string>, founder: boolean): RequestType[] {
  return types.filter((t) => t.active && (founder || editable.has(t.from_division_id))).sort((a, b) => a.sort_order - b.sort_order);
}

export const EVENT_LABEL: Record<string, string> = {
  submitted: "sent the request", approved: "approved it", approval_declined: "declined approval", accepted: "accepted it",
  info_requested: "asked for more information", updated: "updated the request", declined: "declined it", assigned: "changed the owner",
  task_created: "added a task", started: "started work", delivered: "delivered it", sent_back: "sent it back", closed: "accepted the work", cancelled: "cancelled it",
};
