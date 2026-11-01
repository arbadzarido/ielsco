// Divisions and roles for the 2027 volunteer cohort: the 16 roles of DOC-0055 Volunteer Staffing & Recruitment Workbook,
// Role_Matrix (founder update, 1 Nov 2026). Internal references (task codes, owner names, partner names that are not yet
// confirmed) are left out of the public text. Role ids match the workbook so applications map back to it.
// Divisions are led by the two founders: Growth, Creative, Community and Courses & Learning by Arbadza (CEO);
// Partnerships, Operations and People by Farrel (COO).

export type LeadKey = "arbadza" | "farrel";

export const LEADS: Record<LeadKey, { name: string; title: string; email: string; image: string }> = {
  arbadza: { name: "Arbadza Rido", title: "Co-Founder & CEO", email: "arbadza@ielsco.com", image: "/images/people/leadership/arbadza.png" },
  farrel: { name: "Muhammad Farrel Alrezky", title: "Co-Founder & COO", email: "farrel@ielsco.com", image: "/images/people/leadership/farrel.png" },
};

export type Role = {
  id: string;
  title: string;
  // Brand / scope served, from the workbook's "Business unit served" column.
  scope: "IELSco" | "Elco AI" | "IELSco & Elco AI";
  // Maximum number of places in the cohort (workbook "Maximum").
  places: number;
  summary: string;
  responsibilities: string[];
  deliverables?: string[];
  required?: string;
  preferred?: string;
};

export type Division = {
  slug: string;
  title: string;
  lead: LeadKey;
  description: string;
  roles: Role[];
};

export const divisions: Division[] = [
  // ── Led by Arbadza ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "growth",
    title: "Growth",
    lead: "arbadza",
    description: "Write, publish and amplify the content that tells people about IELSco and Elco AI.",
    roles: [
      {
        id: "G1", title: "Content Writer", scope: "IELSco & Elco AI", places: 2,
        summary: "Write captions, scripts and announcements for IELSco, and product and educational copy for Elco AI.",
        responsibilities: ["Captions, scripts and announcements for the Circle and the Global Impact Fellowship", "Elco AI product copy, educational posts and onboarding messages", "Campaign copy and a bank of reusable scripts"],
        deliverables: ["3–4 IELSco drafts a week", "2–3 Elco AI drafts a week", "Campaign copy, script bank and onboarding copy"],
        required: "Strong English writing and Bahasa Indonesia", preferred: "A portfolio of social media copy",
      },
      {
        id: "G2", title: "Social Media Manager", scope: "IELSco & Elco AI", places: 1,
        summary: "Publish IELSco and Elco AI content, look after the community's comments and messages, and report on campaigns.",
        responsibilities: ["Publish approved IELSco content; stories, comments and DMs; log questions and escalate", "Publish approved Elco AI content; reply to product questions; pass bug reports to the product team", "UTM conventions, campaign reports per brand, A/B tests and creator/UGC coordination"],
        deliverables: ["Publishing calendars for both brands", "Engagement and FAQ logs", "Monthly report per brand"],
        required: "Social media basics", preferred: "Experience with a product community",
      },
      {
        id: "G3", title: "KOL & UGC Manager", scope: "Elco AI", places: 5,
        summary: "Create content for Elco AI and coordinate with KOLs (key opinion leaders) and UGC creators.",
        responsibilities: ["Create content for Elco AI", "Coordinate with KOLs and UGC creators", "Track how creator content performs"],
        required: "Spreadsheets and UTM basics", preferred: "Analytics tools",
      },
    ],
  },
  {
    slug: "creative",
    title: "Creative",
    lead: "arbadza",
    description: "Design the visuals and videos for both brands, from social posts to event identities and product demos.",
    roles: [
      {
        id: "K1", title: "Graphic Designer", scope: "IELSco & Elco AI", places: 3,
        summary: "Design posts, carousels, event identities, recruitment visuals and templates.",
        responsibilities: ["Social posts and carousels", "Event identity for the Global Impact Fellowship", "Recruitment visuals and reusable templates"],
        deliverables: ["Weekly assets per brief", "Editable source files"],
        required: "A Canva or Figma portfolio", preferred: "Experience with brand systems",
      },
      {
        id: "K2", title: "Video Designer", scope: "IELSco & Elco AI", places: 1,
        summary: "Edit short-form videos, subtitles, motion graphics, event recaps and Elco AI product demos.",
        responsibilities: ["Short-form video and subtitles", "Motion graphics", "Event recaps and product demos"],
        deliverables: ["1–2 edits a week"],
        required: "A CapCut or Premiere portfolio", preferred: "Motion graphics",
      },
    ],
  },
  {
    slug: "community",
    title: "Community",
    lead: "arbadza",
    description: "Welcome, support and grow the IELSco Circle community, and turn member feedback into insight.",
    roles: [
      {
        id: "C1", title: "Community Experience", scope: "IELSco", places: 2,
        summary: "Make new Circle members feel welcome and keep the community active and kind.",
        responsibilities: ["Welcome and onboard new Circle members", "Run an engagement activity every two weeks", "Moderate conversations and collect member feedback", "Point Global Impact Fellowship questions to the FAQ"],
        deliverables: ["Onboarding workflow", "Engagement log", "Monthly feedback note"],
        required: "Friendly written English and Bahasa Indonesia; reliability", preferred: "Experience moderating a student community",
      },
      {
        id: "C2", title: "Community Growth", scope: "IELSco", places: 2,
        summary: "Track how the Circle grows and keeps members, and research where to grow next.",
        responsibilities: ["Track Circle growth and retention", "Research campus and country prospects", "Write a monthly insight note with three recommendations"],
        deliverables: ["Monthly insight note"],
        required: "Spreadsheets and curiosity", preferred: "Survey design",
      },
    ],
  },
  {
    slug: "learning",
    title: "Courses & Learning",
    lead: "arbadza",
    description: "Create learning materials and guides, and run course operations, for Elco AI.",
    roles: [
      {
        id: "L1", title: "Learning Content Developer", scope: "Elco AI", places: 2,
        summary: "Create pre-departure learning materials and application-readiness guides, and review Elco AI preparation content.",
        responsibilities: ["Pre-departure learning materials for the Global Impact Fellowship", "Application-readiness guides", "Review Elco AI preparation content"],
        deliverables: ["4 resources by April 2027"],
        required: "Strong English and an interest in teaching", preferred: "Test-prep or tutoring experience",
      },
      {
        id: "L2", title: "Course Manager", scope: "Elco AI", places: 2,
        summary: "Run the operations of a course batch once it is confirmed.",
        responsibilities: ["Class schedules and rosters", "Attendance", "Learner feedback"],
        required: "Organised", preferred: "Education administration",
      },
    ],
  },
  // ── Led by Farrel ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "partnerships",
    title: "Partnerships",
    lead: "farrel",
    description: "Research and reach out to universities, sponsors and media partners, and keep track of every conversation.",
    roles: [
      {
        id: "R1", title: "Academic Partnerships", scope: "IELSco & Elco AI", places: 1,
        summary: "Research university international offices and draft outreach.",
        responsibilities: ["Research university international offices", "Draft outreach emails and meeting notes", "Keep partner status up to date"],
        deliverables: ["Partner briefs", "Outreach log", "Opportunities updates"],
        required: "Formal English writing and research", preferred: "Student organisation experience",
      },
      {
        id: "R2", title: "Media Partnerships", scope: "IELSco & Elco AI", places: 1,
        summary: "Build media partnerships, working across the Partnerships and Growth teams.",
        responsibilities: ["Media partnerships for IELSco and Elco AI", "Work with the Partnerships and Growth teams", "Scope is confirmed with the team after the first cycle"],
      },
      {
        id: "R3", title: "Corporate Partnerships", scope: "IELSco & Elco AI", places: 1,
        summary: "Reach out to potential sponsors for the Global Impact Fellowship and track what each sponsor receives.",
        responsibilities: ["Sponsor outreach for the Global Impact Fellowship, with leadership approval", "Track sponsor deliverables"],
        deliverables: ["Sponsor deliverables tracker"],
        required: "Professional communication", preferred: "Sales or sponsorship experience",
      },
    ],
  },
  {
    slug: "operations",
    title: "Operations",
    lead: "farrel",
    description: "Keep programs such as the Global Impact Fellowship on track and give applicants and delegates a smooth experience.",
    roles: [
      {
        id: "O1", title: "Project Manager", scope: "IELSco", places: 2,
        summary: "Keep the Global Impact Fellowship plan, milestones, actions and risks up to date.",
        responsibilities: ["Maintain the program plan, milestones, actions and risks", "Prepare a weekly status update", "Take meeting minutes and follow up on actions"],
        deliverables: ["Weekly status note", "Action log", "Risk updates"],
        required: "Organised, follows up, clear English", preferred: "Has run a campus event",
      },
      {
        id: "O2", title: "Delegate Experience", scope: "IELSco", places: 2,
        summary: "Look after applicants and delegates from their first question to onboarding.",
        responsibilities: ["Applicant communications and the FAQ", "Interview scheduling and selection updates", "Delegate onboarding and feedback"],
        deliverables: ["Communications plan", "Application tracker", "Delegate pack"],
        required: "Warm, clear written English", preferred: "Customer support experience",
      },
    ],
  },
  {
    slug: "people",
    title: "People",
    lead: "farrel",
    description: "Tell the stories of IELSco and Elco AI people, and help volunteers grow through training and verified opportunities.",
    roles: [
      {
        id: "P1", title: "People Branding", scope: "IELSco & Elco AI", places: 2,
        summary: "Find, interview and write the stories of volunteers and Circle members, with their consent.",
        responsibilities: ["Identify and interview story subjects", "Obtain and archive consent", "Write and prepare stories"],
        deliverables: ["Story pipeline", "Consent records", "2 stories a month"],
        required: "Interviewing and writing", preferred: "Journalism experience",
      },
      {
        id: "P2", title: "People Development", scope: "IELSco & Elco AI", places: 2,
        summary: "Verify opportunities and run the volunteer training calendar.",
        responsibilities: ["Verify opportunities from their official sources", "Plan the volunteer training calendar", "Run development check-ins"],
        deliverables: ["Opportunity digest", "Training calendar"],
        required: "Research skills", preferred: "Scholarship experience",
      },
    ],
  },
];

export const ROLE_COUNT = divisions.reduce((n, d) => n + d.roles.length, 0);
export const divisionsLedBy = (lead: LeadKey) => divisions.filter((d) => d.lead === lead);
