// The Programs catalogue. Edit text/links here. Internal hrefs point to existing routes in this repo.
import { LINKS } from "./config";

export interface ProgramAction {
  label: string;
  href: string;
  external?: boolean;
}

export interface Program {
  id: string;
  name: string;
  status: string;
  summary: string;
  points: string[];
  actions: ProgramAction[];
  note?: string;
}

export const PROGRAMS: Program[] = [
  {
    id: "iels-course",
    name: "IELS Course",
    status: "Available · Paid",
    summary: "Paid English courses and learning resources, with options to book sessions with mentors.",
    points: ["Structured English courses", "Mentor sessions", "Learning materials"],
    actions: [
      { label: "Browse courses", href: "/products/courses" },
      { label: "My courses", href: "/dashboard/learning/courses" },
    ],
  },
  {
    id: "iels-test-tofly",
    name: "IELS Test × Tofly",
    status: "Partner program",
    summary: "English proficiency test preparation and test-taking in partnership with Tofly.",
    points: ["Practice and official test info", "Results in your test dashboard"],
    actions: [
      { label: "How it works", href: "/test" },
      { label: "My tests", href: "/dashboard/test" },
      ...(LINKS.tofly ? [{ label: "Visit Tofly", href: LINKS.tofly, external: true }] : []),
    ],
    note: LINKS.tofly ? undefined : "Partner website link coming soon.",
  },
  {
    id: "iels-circle",
    name: "IELS Circle",
    status: "Free",
    summary: "Our free community with weekly activities. Join through Discord or WhatsApp.",
    points: ["Weekly activities", "Meet learners with similar goals"],
    actions: [{ label: "Open IELS Circle", href: "/dashboard/circle" }],
  },
  {
    id: "gif",
    name: "Global Impact Fellowship (GIF)",
    status: "Seasonal program — updates coming",
    summary:
      "A seasonal regional program combining campus immersion, project ideation, entrepreneurship, education and social impact, and international exposure.",
    points: ["Campus immersion", "Impact project ideation", "International exposure"],
    actions: [
      { label: "About GIF", href: "/events/gif" },
      { label: "Delegate dashboard", href: "/dashboard/gif" },
    ],
    note: "No active edition is listed right now. Existing delegates can still use their dashboard.",
  },
  {
    id: "stepup-skilio",
    name: "StepUp × Skilio",
    status: "Next cohort to be announced",
    summary: "English and career preparation with a pathway towards internship opportunities from Skilio.",
    points: ["Career-focused English bootcamp", "Internship opportunity pathway (placement not guaranteed)"],
    actions: [
      { label: "See past edition", href: "/events" },
      ...(LINKS.skilio ? [{ label: "Visit Skilio", href: LINKS.skilio, external: true }] : []),
    ],
    note: "The last edition ran in April 2025.",
  },
  {
    id: "global-pathways",
    name: "IELS Global Pathways",
    status: "Coming soon",
    summary:
      "A planned study-abroad preparation offer: scholarship and program discovery, application writing and interview preparation.",
    points: ["Scholarship discovery", "Application writing", "Interview preparation"],
    actions: [{ label: "Browse study resources", href: "/dashboard/explore?direction=study" }],
    note: "Not available yet.",
  },
];
