// Open recruitment for the IELSco & Elco AI volunteer team, 2027 cohort. Source of truth: DOC-0055 Volunteer Staffing &
// Recruitment Workbook (Recruitment_Timeline) and the founder's brief of 1 Nov 2026 (program structure, benefits,
// eligibility, campaign tasks). The application window is enforced again in public.submit_career_application(); change
// both together.
export const RECRUITMENT = {
  cohort: "2027",
  cohortName: "IELSco & Elco AI Open Recruitment 2027",
  opensAt: "2026-11-09T00:00:00+07:00",
  closesAt: "2026-11-29T23:59:59+07:00",
  opensLabel: "9 November 2026",
  closesLabel: "29 November 2026",
  structure: [
    ["3 months", "Probation, with training and real tasks in your division"],
    ["6 months", "Volunteership after a successful probation"],
    ["Fully remote", "Work from anywhere, alongside your studies"],
    ["10–12 hours a week", "Including one weekly team meeting of about 30–60 minutes"],
  ] as [string, string][],
  extras: "Occasional regional gatherings and community activities, announced early.",
  timeline: [
    ["9 Nov", "Applications open", "The form on this page goes live. Complete the campaign tasks and apply."],
    ["9 – 29 Nov", "Application period", "Three weeks. Applications close on 29 November at 23:59 WIB."],
    ["30 Nov", "Session schedule sent", "Everyone with a complete application gets the group-session schedule by email."],
    ["1 – 4 Dec", "Group sessions", "Small online information and group-interview sessions of about 10–15 people. An introduction, not a high-pressure test."],
    ["5 – 8 Dec", "Review", "We review your answers, availability and role preferences."],
    ["9 Dec", "Decisions", "Offers and results are sent by email."],
    ["10 – 18 Dec", "Acceptance and onboarding", "Accept your place, then orientation and onboarding."],
    ["4 – 10 Jan 2027", "Assignments", "Meet your team, confirm your role and agree your first 30-day goals."],
    ["11 Jan 2027", "First cycle starts", "The cohort starts working together."],
  ] as [string, string, string][],
  instagram: {
    ielsco: { handle: "@iels.co", url: "https://www.instagram.com/iels.co" },
    elco: { handle: "@elco.ai", url: "https://www.instagram.com/elco.ai/" },
    // The recruitment campaign post. Set it once the post is live; until then the page points to @iels.co.
    campaignPostUrl: null as string | null,
  },
  internationalContacts: ["arbadza@ielsco.com", "careers@ielsco.com"],
};

export type RecruitmentPhase = "upcoming" | "open" | "closed";
export function recruitmentPhase(now = Date.now()): RecruitmentPhase {
  if (now < Date.parse(RECRUITMENT.opensAt)) return "upcoming";
  if (now > Date.parse(RECRUITMENT.closesAt)) return "closed";
  return "open";
}
