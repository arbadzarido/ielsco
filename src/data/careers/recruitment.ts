// Open recruitment for the IELSco & Elco AI team, 2027 cohort. Source of truth: DOC-0055 Volunteer Staffing &
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
    ["9 Nov", "Applications open", "Sign in with your Elco-Pass, complete the campaign tasks and apply."],
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
    ielsco: { handle: "@iels.co", url: "https://www.instagram.com/iels.co/" },
    elco: { handle: "@elco.ai", url: "https://www.instagram.com/elco.ai/" },
    // The published recruitment carousel (MKT-0008, 9 Nov 2026): comment + tag, share to Story and repost use this post.
    campaignPostUrl: "https://www.instagram.com/p/Dfg2nDVGZQw/?xtok=MXBrbGoyb2VvbjBpOQ==" as string | null,
    // The official Add Yours Story template (separate from the carousel post).
    twibbonUrl: "https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MTE5OTIwMjg5NTk4ODc1?story_media_id=4026437413693806376&xtok=Mm9iNzFsYmtlbWJw" as string | null,
    storyTemplate: "/images/careers/2027/campaign/story-announcement.jpg",
  },
  // Official company pages. LinkedIn is for discovery only; it is not a campaign task or a requirement.
  linkedin: {
    ielsco: { label: "IELSco on LinkedIn", url: "https://www.linkedin.com/company/iels-co/" },
    elco: { label: "Elco AI on LinkedIn", url: "https://www.linkedin.com/company/elco-ai/" },
  },
  // The published campaign artwork (MKT-0008, as posted on Instagram): slide 01 is the poster.
  poster: "/images/careers/2027/published/slide-01.webp",
  slides: Array.from({ length: 10 }, (_, i) => `/images/careers/2027/published/slide-${String(i + 1).padStart(2, "0")}.webp`),
  internationalContacts: ["arbadza@ielsco.com", "careers@ielsco.com"],
};

export type RecruitmentPhase = "upcoming" | "open" | "closed";
export function recruitmentPhase(now = Date.now()): RecruitmentPhase {
  if (now < Date.parse(RECRUITMENT.opensAt)) return "upcoming";
  if (now > Date.parse(RECRUITMENT.closesAt)) return "closed";
  return "open";
}

// The application lives in the dashboard (signed in), without the dashboard sidebar.
export const APPLY_PATH = "/dashboard/careers/apply";

// The seven Instagram campaign tasks (founder brief, 9 Nov 2026). Applicants confirm them before submitting; the
// recruitment team checks each one by hand on Instagram (no screenshots, no automated checks) and records the result
// per task in career_applications.campaign_tasks. Keys are stored in the database; don't rename them.
export type CampaignTask = { key: string; title: string; detail: string; link?: "ielsco" | "elco" | "post" | "story" | "twibbon" };
export const CAMPAIGN_TASKS: CampaignTask[] = [
  { key: "follow_ielsco", title: "Follow @iels.co", detail: "Follow the official IELSco Instagram account.", link: "ielsco" },
  { key: "follow_elco", title: "Follow Elco AI", detail: "Follow the official Elco AI Instagram account, @elco.ai.", link: "elco" },
  { key: "comment_mention", title: "Comment and mention a friend", detail: "Comment on the recruitment post and mention at least one friend.", link: "post" },
  { key: "share_story", title: "Share the post to your Story", detail: "Share the recruitment post to your Instagram Story.", link: "post" },
  { key: "twibbon", title: "Post the official Add Yours Story", detail: "Post your Story with the official recruitment Add Yours template.", link: "twibbon" },
  { key: "story_24h", title: "Keep the Story up for 24 hours", detail: "Keep your Story published for at least 24 hours: don't delete or archive it before it expires." },
  { key: "repost", title: "Repost the recruitment post", detail: "Use Instagram's Repost feature on the recruitment post.", link: "post" },
];
// Where each campaign task points: the two accounts, the published carousel post, and the Add Yours template.
export function campaignTaskLink(kind?: CampaignTask["link"]): { href: string; label: string; download?: boolean } | null {
  const ig = RECRUITMENT.instagram;
  if (kind === "ielsco") return { href: ig.ielsco.url, label: ig.ielsco.handle };
  if (kind === "elco") return { href: ig.elco.url, label: ig.elco.handle };
  if (kind === "post") return ig.campaignPostUrl ? { href: ig.campaignPostUrl, label: "Open the recruitment post" } : { href: ig.ielsco.url, label: `Find the post on ${ig.ielsco.handle}` };
  if (kind === "twibbon") return ig.twibbonUrl ? { href: ig.twibbonUrl, label: "Open Add Yours template" } : { href: ig.storyTemplate, label: "Download the recruitment Story", download: true };
  return null;
}

export const TASK_STATUSES = ["pending", "verified", "not_found"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// What the applicant confirms before submitting. Stored as timestamps (privacy_accepted_at, declaration_accepted_at,
// tasks_confirmed_at) on the application.
export const DECLARATION = [
  "The information and documents in my application are accurate and my own.",
  "I consent to IELSco and Elco AI processing my application data for this recruitment, as described in the privacy notice.",
  "I understand the team may review my public Instagram and LinkedIn profiles, including to check the campaign tasks.",
  "I understand the selection process: group sessions, review and decisions by email, as described on the careers page.",
];

// Applicant-facing application statuses (career_applications.status).
export const STATUS_COPY: Record<string, { label: string; text: string }> = {
  submitted: { label: "Submitted", text: "We've received your application. You can still change it until applications close or review starts." },
  under_review: { label: "Under review", text: "The recruitment team is reviewing your application and checking your campaign tasks." },
  invited: { label: "Invited to a group session", text: "You're invited to a group session. Check your email for the schedule." },
  shortlisted: { label: "Shortlisted", text: "You're on the shortlist. Decisions are sent by email." },
  accepted: { label: "Accepted", text: "Congratulations! Check your email for your offer and onboarding steps." },
  reserve: { label: "Reserve list", text: "You're on the reserve list. We'll email you if a place opens." },
  rejected: { label: "Not selected", text: "Thank you for applying. We weren't able to offer you a place in this cohort." },
  withdrawn: { label: "Withdrawn", text: "This application was withdrawn." },
};
