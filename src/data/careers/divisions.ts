// Divisions and roles for the 2027 volunteer cohort: the official structure of 20 roles (founder correction, 1 Nov 2026).
// Descriptions come from DOC-0055 Volunteer Staffing & Recruitment Workbook, Role_Matrix; Media Partnerships and
// Community Partnerships have no detailed description there yet, so their text stays minimal. Internal references (task codes, owner names, partner
// names that are not yet confirmed) are left out of the public text. Role ids match the workbook so applications can be
// mapped back to it.

export type Role = {
  id: string;
  title: string;
  // Brand / scope exactly as in the official recruitment structure.
  scope: string;
  summary: string;
  responsibilities: string[];
  deliverables?: string[];
  required?: string;
  preferred?: string;
};

export type Division = {
  slug: string;
  title: string;
  description: string;
  roles: Role[];
};

export const divisions: Division[] = [
  {
    slug: "community",
    title: "Community",
    description: "Welcome, support and grow the IELSco Circle community, and turn member feedback into insight.",
    roles: [
      {
        id: "C1", title: "Community Experience", scope: "IELSco",
        summary: "Make new Circle members feel welcome and keep the community active and kind.",
        responsibilities: ["Welcome and onboard new Circle members", "Run an engagement activity every two weeks", "Moderate conversations and collect member feedback", "Point Global Impact Fellowship questions to the FAQ"],
        deliverables: ["Onboarding workflow", "Engagement log", "Monthly feedback note"],
        required: "Friendly written English and Bahasa Indonesia; reliability", preferred: "Experience moderating a student community",
      },
      {
        id: "C2", title: "Community Growth", scope: "IELSco",
        summary: "Track how the Circle grows and keeps members, and research where to grow next.",
        responsibilities: ["Track Circle growth and retention", "Research campus and country prospects", "Write a monthly insight note with three recommendations"],
        deliverables: ["Monthly insight note"],
        required: "Spreadsheets and curiosity", preferred: "Survey design",
      },
    ],
  },
  {
    slug: "operations",
    title: "Operations",
    description: "Keep programs such as the Global Impact Fellowship on track and give applicants and delegates a smooth experience.",
    roles: [
      {
        id: "O1", title: "Project Manager", scope: "IELSco",
        summary: "Keep the Global Impact Fellowship plan, milestones, actions and risks up to date.",
        responsibilities: ["Maintain the program plan, milestones, actions and risks", "Prepare a weekly status update", "Take meeting minutes and follow up on actions"],
        deliverables: ["Weekly status note", "Action log", "Risk updates"],
        required: "Organised, follows up, clear English", preferred: "Has run a campus event",
      },
      {
        id: "O2", title: "Delegate Experience", scope: "IELSco",
        summary: "Look after applicants and delegates from their first question to onboarding.",
        responsibilities: ["Applicant communications and the FAQ", "Interview scheduling and selection updates", "Delegate onboarding and feedback"],
        deliverables: ["Communications plan", "Application tracker", "Delegate pack"],
        required: "Warm, clear written English", preferred: "Customer support experience",
      },
    ],
  },
  {
    slug: "growth",
    title: "Growth",
    description: "Write and publish the content that tells people about IELSco and Elco AI, with a separate writer and social media manager for each brand.",
    roles: [
      {
        id: "G1", title: "Content Writer — IELSco", scope: "IELSco",
        summary: "Write captions, scripts and announcements for the Circle and the Global Impact Fellowship.",
        responsibilities: ["Captions, scripts and announcements", "Campaign copy", "Build a bank of reusable scripts"],
        deliverables: ["3–4 drafts a week", "Campaign copy", "Script bank"],
        required: "Strong English writing and Bahasa Indonesia", preferred: "A portfolio of social media copy",
      },
      {
        id: "G2", title: "Content Writer — Elco AI", scope: "Elco AI",
        summary: "Write Elco AI product copy, educational posts and onboarding messages.",
        responsibilities: ["Product copy and educational posts", "Onboarding messages for new learners", "Explain features clearly and accurately"],
        deliverables: ["2–3 drafts a week", "Onboarding copy"],
        required: "Clear English and an interest in AI or learning products", preferred: "Product or UX writing",
      },
      {
        id: "G3", title: "Social Media Manager — IELSco", scope: "IELSco",
        summary: "Publish IELSco content and look after comments, stories and messages.",
        responsibilities: ["Publish approved content and stories", "Reply to comments and DMs", "Log common questions and escalate when needed"],
        deliverables: ["Publishing calendar", "Engagement log"],
        required: "Knows Instagram and TikTok", preferred: "Scheduling tools",
      },
      {
        id: "G4", title: "Social Media Manager — Elco AI", scope: "Elco AI",
        summary: "Publish Elco AI content and answer product questions from the community.",
        responsibilities: ["Publish approved Elco AI content", "Reply to product questions", "Pass bug reports to the product team"],
        deliverables: ["Elco AI publishing calendar", "FAQ log"],
        required: "Social media basics", preferred: "Experience with a product community",
      },
      {
        id: "G5", title: "Marketing Analyst", scope: "Shared (separate reports per brand)",
        summary: "Measure how campaigns perform for each brand and report what the numbers show.",
        responsibilities: ["UTM conventions for campaign links", "Campaign reports for each brand, kept separate", "A/B tests", "Creator and UGC coordination"],
        deliverables: ["Monthly report per brand"],
        required: "Spreadsheets and UTM basics", preferred: "Analytics tools",
      },
      {
        id: "X1", title: "Media Partnerships", scope: "Shared",
        summary: "Build media and distribution partnerships, working across the Growth and Partnerships teams.",
        responsibilities: ["Media and distribution partnerships for IELSco and Elco AI", "Work with the Growth and Partnerships teams"],
      },
    ],
  },
  {
    slug: "creative",
    title: "Creative",
    description: "Design the visuals and videos for both brands, from social posts to event identities and product demos.",
    roles: [
      {
        id: "K1", title: "Graphic Designer", scope: "Shared (brand-specific briefs)",
        summary: "Design posts, carousels, event identities, recruitment visuals and templates.",
        responsibilities: ["Social posts and carousels", "Event identity for the Global Impact Fellowship", "Recruitment visuals and reusable templates"],
        deliverables: ["Weekly assets per brief", "Editable source files"],
        required: "A Canva or Figma portfolio", preferred: "Experience with brand systems",
      },
      {
        id: "K2", title: "Video Designer", scope: "Shared (brand-specific briefs)",
        summary: "Edit short-form videos, subtitles, motion graphics, event recaps and Elco AI product demos.",
        responsibilities: ["Short-form video and subtitles", "Motion graphics", "Event recaps and product demos"],
        deliverables: ["1–2 edits a week"],
        required: "A CapCut or Premiere portfolio", preferred: "Motion graphics",
      },
    ],
  },
  {
    slug: "people",
    title: "People",
    description: "Tell the stories of IELSco people and help volunteers grow through training and verified opportunities.",
    roles: [
      {
        id: "P1", title: "People Branding", scope: "IELSco (volunteer stories shared)",
        summary: "Find, interview and write the stories of IELSco volunteers and Circle members, with their consent.",
        responsibilities: ["Identify and interview story subjects", "Obtain and archive consent", "Write and prepare stories"],
        deliverables: ["Story pipeline", "Consent records", "2 stories a month"],
        required: "Interviewing and writing", preferred: "Journalism experience",
      },
      {
        id: "P2", title: "People Development", scope: "IELSco",
        summary: "Verify opportunities and run the volunteer training calendar.",
        responsibilities: ["Verify opportunities from their official sources", "Plan the volunteer training calendar", "Run development check-ins"],
        deliverables: ["Opportunity digest", "Training calendar"],
        required: "Research skills", preferred: "Scholarship experience",
      },
    ],
  },
  {
    slug: "partnerships",
    title: "Partnerships",
    description: "Research and reach out to universities and partners, and keep track of every conversation.",
    roles: [
      {
        id: "R1", title: "Academic Partnerships", scope: "IELSco",
        summary: "Research university international offices and draft outreach.",
        responsibilities: ["Research university international offices", "Draft outreach emails and meeting notes", "Keep partner status up to date"],
        deliverables: ["Partner briefs", "Outreach log", "Opportunities updates"],
        required: "Formal English writing and research", preferred: "Student organisation experience",
      },
      {
        id: "R2", title: "Partnership Research", scope: "Shared (opportunities kept per PT)",
        summary: "Maintain the opportunities register and prepare meeting and sponsor research.",
        responsibilities: ["Maintain the opportunities register (CRM)", "Prepare meeting briefs", "Research potential sponsors"],
        deliverables: ["Weekly CRM update", "Sponsor prospect list"],
        required: "Spreadsheets and research", preferred: "CRM tools",
      },
      {
        id: "R3", title: "Corporate Partnerships", scope: "Shared (contracts per PT)",
        summary: "Reach out to potential sponsors for the Global Impact Fellowship and track what each sponsor receives.",
        responsibilities: ["Sponsor outreach for the Global Impact Fellowship, with leadership approval", "Track sponsor deliverables"],
        deliverables: ["Sponsor deliverables tracker"],
        required: "Professional communication", preferred: "Sales or sponsorship experience",
      },
      {
        id: "X2", title: "Community Partnerships", scope: "IELSco",
        summary: "Build partnerships with communities for IELSco.",
        responsibilities: ["Community partnerships for IELSco", "Scope is agreed with the Partnerships team during onboarding"],
      },
    ],
  },
  {
    slug: "learning",
    title: "Courses & Learning",
    description: "Create learning materials and application-readiness guides for IELSco programs.",
    roles: [
      {
        id: "L1", title: "Learning Content Developer", scope: "Shared (IELSco learning; Elco content only inside Elco)",
        summary: "Create pre-departure learning materials and application-readiness guides, and review Elco AI prep content.",
        responsibilities: ["Pre-departure learning materials for the Global Impact Fellowship", "Application-readiness guides", "Review Elco AI preparation content"],
        deliverables: ["4 resources by April 2027"],
        required: "Strong English and an interest in teaching", preferred: "Test-prep or tutoring experience",
      },
      {
        id: "L2", title: "Course Manager", scope: "IELSco",
        summary: "Run the operations of an IELSco course batch once it is confirmed.",
        responsibilities: ["Class schedules and rosters", "Attendance", "Learner feedback"],
        required: "Organised", preferred: "Education administration",
      },
    ],
  },
];

export const DIVISION_SLUGS = divisions.map((d) => d.slug) as [string, ...string[]];
export const ROLE_IDS = divisions.flatMap((d) => d.roles.map((r) => r.id)) as [string, ...string[]];
