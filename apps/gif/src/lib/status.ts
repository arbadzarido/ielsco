// Application statuses, labels and the allowed transitions. Pure (node --test imports it).
import type { Pathway } from "./settings.ts";

export const STATUSES = [
  "draft", "submitted", "awaiting_payment", "payment_verification", "phase_1_completed",
  "phase_2_in_progress", "phase_2_submitted", "phase_3_in_progress", "phase_3_submitted",
  "under_evaluation", "selected_fully_funded", "selected_partial_funded", "not_selected",
  "confirmed_participant", "withdrawn",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  submitted: "Submitted",
  awaiting_payment: "Awaiting Payment",
  payment_verification: "Payment Verification",
  phase_1_completed: "Phase 1 Completed",
  phase_2_in_progress: "Phase 2 In Progress",
  phase_2_submitted: "Phase 2 Submitted",
  phase_3_in_progress: "Phase 3 In Progress",
  phase_3_submitted: "Phase 3 Submitted",
  under_evaluation: "Under Evaluation",
  selected_fully_funded: "Selected — Fully Funded",
  selected_partial_funded: "Selected — Partial Funded",
  not_selected: "Not Selected",
  confirmed_participant: "Confirmed Participant",
  withdrawn: "Withdrawn",
};

export const PATHWAY_LABEL: Record<Pathway, string> = {
  fully_funded: "Fully Funded application",
  mentoring: "Project Mentoring Program",
  self_funded: "Self-Funded",
};

export function isStatus(v: unknown): v is Status {
  return typeof v === "string" && (STATUSES as readonly string[]).includes(v);
}

// Transitions the system itself makes. Admins may also set any status by hand (audited, with a note).
const NEXT: Record<Status, Status[]> = {
  draft: ["submitted", "awaiting_payment", "withdrawn"],
  submitted: ["awaiting_payment", "withdrawn"],
  awaiting_payment: ["payment_verification", "phase_1_completed", "confirmed_participant", "withdrawn"],
  payment_verification: ["awaiting_payment", "phase_1_completed", "confirmed_participant", "withdrawn"],
  phase_1_completed: ["phase_2_in_progress", "phase_2_submitted", "phase_3_in_progress", "phase_3_submitted", "not_selected", "withdrawn"],
  phase_2_in_progress: ["phase_2_submitted", "not_selected", "withdrawn"],
  phase_2_submitted: ["phase_3_in_progress", "phase_3_submitted", "not_selected", "withdrawn"],
  phase_3_in_progress: ["phase_3_submitted", "not_selected", "withdrawn"],
  phase_3_submitted: ["under_evaluation", "selected_fully_funded", "selected_partial_funded", "not_selected", "withdrawn"],
  under_evaluation: ["selected_fully_funded", "selected_partial_funded", "not_selected", "withdrawn"],
  selected_fully_funded: ["confirmed_participant", "withdrawn"],
  selected_partial_funded: ["confirmed_participant", "withdrawn"],
  not_selected: ["withdrawn"],
  confirmed_participant: ["withdrawn"],
  withdrawn: [],
};

export function canTransition(from: Status, to: Status): boolean {
  return NEXT[from].includes(to);
}

// Can the candidate still edit their application details?
export function editable(status: Status): boolean {
  return status === "draft";
}

export type Step = { key: string; label: string; detail: string; state: "done" | "current" | "upcoming" };

const ORDER: Status[] = [...STATUSES];
const rank = (s: Status) => ORDER.indexOf(s);

// Candidate-facing progress steps per pathway.
export function progressSteps(pathway: Pathway, status: Status, paid: boolean, tasks?: { done: boolean; required: boolean }): Step[] {
  const r = rank(status);
  const final = ["selected_fully_funded", "selected_partial_funded", "not_selected", "confirmed_participant"].includes(status);
  const mk = (key: string, label: string, detail: string, done: boolean, current: boolean): Step =>
    ({ key, label, detail, state: done ? "done" : current ? "current" : "upcoming" });
  if (pathway === "self_funded") {
    return [
      mk("apply", "Registration", "Profile and team details", r >= rank("submitted"), status === "draft"),
      mk("deposit", "Deposit", "Your first payment (from IDR 2,500,000, your choice) confirms your seat", status === "confirmed_participant", ["submitted", "awaiting_payment", "payment_verification"].includes(status)),
      mk("prep", "Preparation", "Remaining balance (in installments), visa, travel, insurance, orientation", false, status === "confirmed_participant"),
      mk("programme", "Programme", "27 Jul – 3 Aug 2027", false, false),
    ];
  }
  const steps: Step[] = [
    mk("apply", "Application", "Profile, project idea and motivation", r >= rank("submitted"), status === "draft"),
    mk("pay", pathway === "mentoring" ? "Mentoring fee" : "Elco Pro (Phase 1)", pathway === "mentoring" ? "Enrols you in the 15 weekly sessions" : "3 months of Elco Pro, yours to keep", paid, !paid && r >= rank("submitted") && r < rank("phase_1_completed")),
  ];
  if (pathway === "fully_funded" && tasks?.required) {
    steps.push(mk("tasks", "Social media tasks (Phase 1)", "Follow, like, comment and share; verified by the team", tasks.done, paid && !tasks.done));
  }
  if (pathway === "fully_funded") {
    steps.push(mk("p2", "Phase 2", "Project essay and pitch deck, 11–24 May 2027", r >= rank("phase_2_submitted") && status !== "withdrawn", ["phase_1_completed", "phase_2_in_progress"].includes(status)));
  } else {
    steps.push(mk("mentoring", "Mentoring", "15 weekly sessions, 2 Feb – 11 May 2027", r >= rank("phase_3_in_progress") && status !== "withdrawn", status === "phase_1_completed"));
  }
  steps.push(mk("p3", "Phase 3", "Video presentation (3–5 min), 25–27 May 2027", r >= rank("phase_3_submitted") && status !== "withdrawn",
    status === "phase_3_in_progress" || (pathway === "fully_funded" && status === "phase_2_submitted")));
  steps.push(mk("eval", "Evaluation", "28–31 May 2027", final, status === "phase_3_submitted" || status === "under_evaluation"));
  steps.push(mk("result", "Results", "1 June 2027", final, false));
  return steps;
}
