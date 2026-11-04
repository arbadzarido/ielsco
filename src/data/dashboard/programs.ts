// The Programs catalogue. Edit text/links here. Internal hrefs point to existing routes in this repo.
// Business model: Elco AI (www.elcoai.com) is the primary place to learn English and prepare for tests. IELSco adds private
// human tutoring (Rp90,000 per session, requested per session), the IELS Circle community and fellowships.
import { LINKS } from "./config";
import { elcoHref } from "@/lib/elco";
import { ELCO_TEST_PREP_TEXT, TUTOR_PRICE_LABEL, tutorRequestUrl } from "@/components/tutoring/links";

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
  // Cover image: an existing IELSco poster or photo in public/images. No image = the card shows no cover.
  image?: string;
}

export const PROGRAMS: Program[] = [
  {
    // Kept as "iels-course" because Home looks this id up for its highlight card.
    id: "iels-course",
    image: "/images/contents/events/courses.png",
    name: "Private tutoring",
    status: TUTOR_PRICE_LABEL,
    summary: "One-to-one sessions with an IELSco tutor, on top of learning with Elco AI. Request a session when you need one; there is no course subscription.",
    points: ["Pick a focus area, such as speaking, writing or test skills", "Requested per session on WhatsApp", "Separate from your Elco AI plan"],
    actions: [
      { label: "Request a private tutor", href: tutorRequestUrl(), external: true },
      { label: "Tutoring focus areas", href: "/dashboard/programs#tutoring" },
    ],
  },
  {
    id: "elco-ai",
    name: "Elco AI",
    status: "Learning and test preparation",
    summary: "The primary place to learn and practise English: courses, learning tools and test preparation, with progress you can see.",
    points: [`Test prep, live now: ${ELCO_TEST_PREP_TEXT}`, "Starter and Pro plans carry IELS Circle benefits to IELSco"],
    actions: [
      { label: "Access Elco AI", href: elcoHref("programs"), external: true },
      { label: "Membership and Elco benefits", href: "/dashboard/membership" },
    ],
  },
  {
    id: "iels-circle",
    image: "/images/site/online-session.webp",
    name: "IELS Circle",
    status: "Free community · speaking club with Elco plans",
    summary: "Our English learning community with weekly speaking activities. Elco Starter and Pro add the speaking club on your IELSco account.",
    points: ["Weekly activities", "Meet learners with similar goals"],
    actions: [{ label: "Open IELS Circle", href: "/dashboard/circle" }],
  },
  {
    id: "gif",
    image: "/images/contents/events/gif2.png",
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
    image: "/images/contents/events/step-up! iels x skilio.png",
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
    image: "/images/dashboard/stock/program-global-pathways.jpg",
    name: "IELS Global Pathways",
    status: "Coming soon",
    summary:
      "A planned study-abroad preparation offer: scholarship and program discovery, application writing and interview preparation.",
    points: ["Scholarship discovery", "Application writing", "Interview preparation"],
    actions: [{ label: "Browse study resources", href: "/dashboard/explore?direction=study" }],
    note: "Not available yet.",
  },
];
