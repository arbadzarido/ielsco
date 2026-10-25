// Current recruitment status for /careers and /careers/[division]. Source: the 2026 Open Recruitment pages
// (timeline and FAQ that ran 11 Jan – 5 Feb 2026). Update this object when a new intake opens: set `open: true`, the new
// dates and `applyUrl`, and the role pages switch from "register interest" to "apply".
export const RECRUITMENT = {
  open: false,
  cohortName: "IELS Associate Program 2026 (Batch 3)",
  period: "April – December 2026",
  closedOn: "5 February 2026",
  applyUrl: null as string | null,
  commitment: "Remote, flexible, at least 10–12 hours a week",
  pay: "Associate roles are unpaid. Top performers may receive quarterly profit-sharing, based on their OKR/KPI results and IELSco's performance.",
  lastEligibility: "The 2026 intake was open to active university students (batches 2022–2025) anywhere in Indonesia. Eligibility for the next intake will be announced with it.",
  process: [
    ["CV screening", "We read every application against the role's requirements."],
    ["Online interview", "Mostly in English, with IELSco principals and the core team. Clarity matters more than perfect grammar."],
    ["Apprenticeship (about 6 weeks)", "Training and real tasks with your future team, so both sides can see if it fits."],
    ["Final announcement and onboarding", "Selected Associates start together as one cohort."],
  ] as [string, string][],
};
