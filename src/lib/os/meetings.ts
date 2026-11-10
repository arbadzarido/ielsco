// Division meetings and minutes: labels and which steps a person is offered. Pure (imported by tests with the .ts
// extension). os_meeting_act decides what anyone may do; this mirrors it so a button never leads to a refusal.
export type MeetingStatus = "Scheduled" | "Held" | "Minutes draft" | "In review" | "Approved";
export interface MeetingRow {
  id: string; company_code: string; division_id: string | null; meeting_type: string; title: string; held_on: string;
  facilitator_person_id: string | null; attendees: string[]; notes: string | null; sensitivity: string; status: MeetingStatus;
  agenda: string | null; objectives: string | null; decisions: string | null; event_id: string | null; project_id: string | null;
  reviewer_person_id: string | null; minutes_approved_by: string | null; minutes_approved_at: string | null; created_by: string | null;
}
export const MEETING_COLUMNS = "id, company_code, division_id, meeting_type, title, held_on, facilitator_person_id, attendees, notes, sensitivity, status, agenda, objectives, decisions, event_id, project_id, reviewer_person_id, minutes_approved_by, minutes_approved_at, created_by";
export const MEETING_TYPES = ["Weekly Review", "Division Stand-up", "Founders Review", "Quarterly Planning", "Partner Meeting", "Other"];
export const MEETING_TONE: Record<MeetingStatus, "neutral" | "blue" | "amber" | "violet" | "green"> = {
  Scheduled: "blue", Held: "neutral", "Minutes draft": "amber", "In review": "violet", Approved: "green",
};
export interface ActionRow { id: number; meeting_id: string; body: string; owner_person_id: string | null; due_date: string | null; task_id: string | null }

export type MeetingStep = "hold" | "submit" | "approve" | "return" | "reopen";
export const STEP_LABEL: Record<MeetingStep, string> = { hold: "Mark as held", submit: "Send minutes for review", approve: "Approve minutes", return: "Return for changes", reopen: "Reopen minutes" };

/** `editor`: wrote it, facilitates it, or can edit the division's records. `lead`: leads the division (founders count). */
export function meetingSteps(m: Pick<MeetingRow, "status" | "reviewer_person_id" | "created_by" | "notes">, me: { personId: string; editor: boolean; lead: boolean; founder: boolean }): MeetingStep[] {
  const approver = (m.reviewer_person_id ? m.reviewer_person_id === me.personId : me.lead) && (m.created_by !== me.personId || me.founder);
  const out: MeetingStep[] = [];
  if (m.status === "Scheduled" && me.editor) out.push("hold");
  if (["Held", "Minutes draft"].includes(m.status) && me.editor && (m.notes ?? "").trim().length >= 10) out.push("submit");
  if (m.status === "In review" && approver) out.push("approve");
  if (m.status === "In review" && (approver || m.reviewer_person_id === me.personId)) out.push("return");
  if (m.status === "Approved" && approver) out.push("reopen");
  return out;
}
