// Company OS Handbook: department and division operating guides, SOPs, workflows and the HQ Leaders meeting pack.
// Written 26 Nov 2026 from: the six Division Manager Appointment Agreements (Schedules 1 and 2: scope, decision rights,
// registers, KPIs, deliverables), the Company OS modules as they exist, the published careers roles
// (src/data/careers/divisions.ts) and the Drive master templates (Documents → New document). Every document is a DRAFT
// for HQ Leaders review until a founder approves it. Anything not in those sources is written as "To be confirmed".
// Document control follows the master templates: reference, version, status, owner, approver, effective and review date.

import portfolio from "./portfolio.json";

export type Block =
  | { p: string }
  | { list: string[]; ordered?: boolean }
  | { table: string[][] }
  | { note: string; tone?: "info" | "warn" }
  | { links: { label: string; href: string; hint?: string }[] };
export interface HandbookSection { heading: string; blocks: Block[] }
export type DocKind = "Department guide" | "Division guide" | "SOP" | "Workflow" | "Project guide" | "Meeting pack" | "Guide";
export interface HandbookDoc {
  slug: string; ref: string; title: string; kind: DocKind; summary: string;
  owner: string; approver: string; department?: "operations" | "growth"; division?: string; project?: string;
  version: string; status: string; effective: string; review: string;
  sections: HandbookSection[];
}

const DRAFT = { version: "0.9", status: "Draft for HQ Leaders review", effective: "On founder approval", review: "28 Feb 2027" };
const ESCALATE_ALL = "Every expense, agreement, commitment to an outside party, grant of system access and public statement outside an approved campaign is escalated. Blocked tasks are resolved or escalated within 2 working days.";
const RECORD_RULE = "Official assignments live in Company OS tasks, deliverables in Google Drive, time commitments in the calendar and decisions in the decision log. WhatsApp is for quick coordination and is never the only record of an assignment or decision.";

const RHYTHM: HandbookSection = {
  heading: "Operating rhythm",
  blocks: [
    { table: [
      ["When", "What", "Where"],
      ["Every working day", "Update the status of your tasks on the day it changes; check new requests and deadlines for the next 7 days", "Tasks (table) · Requests · Home"],
      ["Weekly (one meeting, 30–60 min)", "Division meeting: last week, this week, blockers; record decisions and action items", "Division workspace → Meetings"],
      ["Weekly, before the HQ Leaders meeting", "Division Weekly Status Report (KPI-0055, on time)", "Documents → New document → HQ-TPL Division Weekly Status Report"],
      ["Weekly", "Weekly Operating Review across projects (Operations leads)", "HQ-TPL Weekly Operating Review"],
      ["Monthly", "Monthly report of the division; Monthly Management Review with the founders", "HQ-TPL Monthly Management Review · Operational Report (TPL-D05)"],
    ] },
    { p: RECORD_RULE },
  ],
};
const COMMON_KPIS = "KPI-0055 Weekly status report on time · KPI-0056 Own task adherence · KPI-0057 Tracker hygiene (every division).";

function divisionGuide(o: {
  slug: string; ref: string; name: string; code: string; dept: "operations" | "growth"; manager: string; managerTitle: string; agreement: string;
  purpose: string; scope: string; decideAlone: string; escalate: string; registers: string; kpis: string[]; deliverables: string[];
  daily: string[]; workflows: { label: string; href: string; hint?: string }[]; projects: string[][]; roles: string[][]; tools: { label: string; href: string; hint?: string }[];
  templates: string[]; note?: string;
}): HandbookDoc {
  return {
    slug: o.slug, ref: o.ref, title: `${o.name} Division Guide`, kind: "Division guide", department: o.dept, division: o.code,
    summary: o.purpose, owner: `${o.manager} (${o.managerTitle})`, approver: o.dept === "operations" ? "Farrel (COO)" : "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "Purpose", blocks: [{ p: o.purpose }, ...(o.note ? [{ note: o.note, tone: "info" as const }] : [])] },
      { heading: "Job description: " + o.managerTitle, blocks: [
        { table: [["Item", "Detail"], ["Position", `${o.managerTitle}, ${o.name} Division`], ["Held by", o.manager], ["Reports to", "President Director (Arba), or the person the Company designates in writing"],
          ["Department", o.dept === "operations" ? "Operations Department (with Farrel)" : "Growth Department (with Arba)"], ["Working arrangement", "Fully remote, flexible; at most 2 hours a day and 10 hours a week (agreement)"],
          ["Source", o.agreement]] },
        { p: "Scope: " + o.scope },
        { p: "May decide alone: " + o.decideAlone },
        { p: "Must escalate: " + o.escalate + " " + ESCALATE_ALL },
        { p: "Records and registers: " + o.registers },
      ] },
      { heading: "Goals, KPIs and deliverables", blocks: [
        { p: "KPIs are reporting measures. No numerical target applies until a founder sets one in writing." },
        { list: [...o.kpis, COMMON_KPIS] },
        { p: "Expected deliverables:" }, { list: o.deliverables },
      ] },
      { heading: "Project involvement", blocks: [{ table: [["Project", "Role", "What the division does"], ...o.projects] }, { p: "Lead/Support lines are proposed and confirmed at the HQ Leaders meeting (26 Nov 2026)." }] },
      { heading: "Daily work", blocks: [{ list: o.daily }] },
      RHYTHM,
      { heading: "Workflows and SOPs", blocks: [{ links: o.workflows }] },
      { heading: "Team roles (2027 cohort)", blocks: o.roles.length ? [{ table: [["Role", "Places", "What they do"], ...o.roles] }, { p: "Roles as published on ielsco.com/careers. Mapping to this division is proposed until confirmed." }] : [{ p: "No team roles mapped yet." }] },
      { heading: "Tools and links", blocks: [{ links: o.tools }] },
      { heading: "Templates", blocks: [{ p: "Create from Documents → New document (copy, never edit the master):" }, { list: o.templates }] },
    ],
  };
}

const L = {
  tasks: { label: "Tasks (table)", href: "/os/tasks", hint: "filter by your division" },
  requests: { label: "Requests", href: "/os/requests" },
  docs: { label: "Documents", href: "/os/documents" },
  timeline: { label: "Master Timeline", href: "/os/timeline" },
  calendar: { label: "Calendar", href: "/os/calendar" },
  portfolio: { label: "Project dashboards", href: "/os/portfolio" },
  gif: { label: "GIF programme register", href: "/os/gif" },
  partnerships: { label: "Partnerships", href: "/os/partnerships" },
  campaigns: { label: "Campaigns and content calendar", href: "/os/campaigns" },
  recruitment: { label: "Recruitment", href: "/os/recruitment" },
  people: { label: "People directory", href: "/os/people" },
  reviews: { label: "Reviews", href: "/os/reviews" },
  kpis: { label: "KPIs", href: "/os/kpis" },
};
const sop = (slug: string, label: string) => ({ label, href: `/os/handbook/${slug}` });

export const HANDBOOK: HandbookDoc[] = [
  // ── Meeting pack ──────────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "hq-leaders-meeting-01", ref: "HB-MTG-2026-01", title: "HQ Leaders Meeting #1 · 26 November 2026", kind: "Meeting pack",
    summary: "Agenda, presentation and project learning decks for the first HQ Leaders meeting.", owner: "Arba (CEO)", approver: "Arba (CEO) and Farrel (COO)",
    version: "1.0", status: "Final", effective: "26 Nov 2026", review: "After the meeting",
    sections: [
      { heading: "Agenda (60 minutes)", blocks: [{ table: [
        ["Part", "Time", "Topic", "Who"],
        ["1", "0:00–0:10 (10 min)", "Recruitment: status, open roles, who screens what, dates to 9 Dec", "All; Yasmine leads"],
        ["2", "0:10–0:40 (30 min)", "Four projects: IELS Circle, GIF, Elco AI, IELS Course; timeline Dec 2026 – Aug 2027; division contributions", "All"],
        ["3", "0:40–1:00 (20 min)", "Department discussions in parallel: Operations Department with Farrel; Growth Department with Arba", "Split"],
      ] }] },
      { heading: "Presentations", blocks: [{ links: [
        { label: "HQ Leaders Meeting #1 (PowerPoint)", href: "/os/api/files/hq-leaders-meeting-01", hint: "20 slides" },
        { label: "IELS Circle: Project Overview and Team Learning", href: "/os/api/files/learning-circle" },
        { label: "Global Impact Fellowship: Project Overview and Team Learning", href: "/os/api/files/learning-gif" },
        { label: "Elco AI: Project Overview and Team Learning", href: "/os/api/files/learning-elco" },
        { label: "IELS Course: Project Overview and Team Learning", href: "/os/api/files/learning-course" },
      ] }] },
      { heading: "Expected outcomes", blocks: [{ list: [
        "Recruitment owners and dates agreed to 9 Dec",
        "Lead/Support matrix for the four projects confirmed or changed",
        "Where former Community and Learning work sits; where the L1 Learning Content Developer role goes",
        "Each division's top 3 tasks for the next two weeks in the task table, with PIC and deadline",
        "Next HQ Leaders meeting date (proposed weekly, 30–60 minutes)",
      ] }] },
      { heading: "Minutes", blocks: [{ p: "Record the minutes in HQ workspace → Meetings (minutes workflow: draft → review → approved) and turn each action item into a task from there." }] },
    ],
  },

  // ── Department guides ─────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "operations-department", ref: "HB-GDE-2026-01", title: "Operations Department Operating Guide", kind: "Department guide", department: "operations",
    summary: "How Operations, Business and People run execution across the four projects.", owner: "Farrel (COO)", approver: "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "Purpose", blocks: [{ p: "The Operations Department turns plans into delivered projects. Operations runs plans, logistics and reporting; Business secures and manages partners; People recruits, onboards and cares for team members, delegates and communities." }] },
      { heading: "Structure", blocks: [{ table: [["Division", "Manager", "Core responsibility"], ["Operations", "Ren", "Project plans, milestones, logistics, SOPs, workflows, reporting, operational risk"], ["Business (formerly Partnership)", "Shafira", "Media, corporate, academic, community and recruitment partnerships"], ["People", "Yasmine", "Recruitment, onboarding, team records, engagement, delegate and community care"]] }, { p: "Department lead: Farrel (Co-Founder & COO). Escalation goes to Farrel for department matters and to Arba (President Director) for anything in the agreements' “must escalate” lists." }] },
      { heading: "Project responsibilities", blocks: [{ table: [
        ["Project", "Operations", "Business", "People"],
        ["IELS Circle", "Support: session calendar, run sheet, reporting", "Support: community and academic partners", "Lead: community nurturing, member care, stories"],
        ["Global Impact Fellowship", "Lead: programme, logistics, gates G0–G5, risks", "Lead (partners): universities, coordinators, sponsors", "Support: delegate service, guardian consent, capacity"],
        ["Elco AI", "Support: GIF pathway operations, support process", "Support: corporate and academic partners", "Support: hiring learning roles (TBC)"],
        ["IELS Course", "Lead: cohorts, schedules, tutor coordination", "Support: school partners", "Support: tutor onboarding"],
      ] }, { note: "Proposed lines, confirmed at HQ Leaders Meeting #1.", tone: "info" }] },
      { heading: "How the department works together", blocks: [{ list: [
        "Operations keeps one dashboard per project (Project dashboards) and the Weekly Operating Review; Business and People update their parts of it.",
        "Every partner conversation is in Partnerships with a category, a project, a PIC and a follow-up date (SOP: Partnership pipeline).",
        "Every candidate, new team member and delegate issue has an owner and a next step in Company OS (SOPs: Recruitment and onboarding; Delegate and community support).",
        "Cross-division needs go through Requests (for example a proposal deck from Creative), never only through chat.",
      ] }] },
      RHYTHM,
      { heading: "Guides and SOPs", blocks: [{ links: [sop("division-operations", "Operations Division Guide"), sop("division-business", "Business Division Guide"), sop("division-people", "People Division Guide"),
        sop("sop-project-operations", "SOP: Project operations and weekly review"), sop("sop-partnership-pipeline", "SOP: Partnership pipeline"), sop("sop-recruitment-onboarding", "SOP: Recruitment and onboarding"),
        sop("sop-delegate-community-support", "SOP: Delegate and community support"), sop("guide-task-management", "Guide: Task management in Company OS")] }] },
    ],
  },
  {
    slug: "growth-department", ref: "HB-GDE-2026-02", title: "Growth Department Operating Guide", kind: "Department guide", department: "growth",
    summary: "How Growth, Marketing and Creative plan, make and distribute content for the four projects.", owner: "Arba (CEO)", approver: "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "Purpose", blocks: [{ p: "The Growth Department brings the right people to every project. Marketing decides what we say (pillars, calendar, campaigns, briefs); Creative makes it (design, video, revisions, final files); Growth gets it seen and measured (distribution, KOLs, UGC creators, experiments)." }] },
      { heading: "Structure", blocks: [{ table: [["Division", "Manager", "Core responsibility"], ["Growth", "Didi", "Social media distribution, audience growth, KOL and UGC creators, growth experiments"], ["Marketing", "Acha", "Content pillars, content calendar, campaigns, briefs to Creative, review and approval"], ["Creative", "Mojo", "Design and creative production, revisions, approval, asset delivery"]] }, { p: "Department lead: Arba (Co-Founder & CEO). Marketing and Growth are separate divisions since 26 Nov 2026; until the founders set the split in writing, the Marketing and Growth Managers coordinate and never run the same campaign separately (agreement note)." }] },
      { heading: "The content flow", blocks: [{ list: [
        "Marketing plans the month: pillars → campaigns → content calendar items (Campaigns).",
        "Marketing sends each piece to Creative as a Content brief request with objective, audience, message, format, specs, assets and deadline.",
        "Creative accepts, assigns a PIC, produces, and delivers; Marketing reviews; each send-back counts as a revision round.",
        "Marketing approves and marks the item Ready to publish; Marketing sends Growth a Distribution request.",
        "Growth schedules and distributes (own channels, KOLs, UGC), then records results on the calendar item and in experiments.",
      ], ordered: true }, { links: [sop("sop-content-brief", "SOP: Content brief to Creative"), sop("sop-creative-production", "SOP: Creative production and revisions"), sop("sop-distribution", "SOP: Distribution and publishing"), sop("sop-kol-ugc", "SOP: KOL and UGC creators")] }] },
      { heading: "Project responsibilities", blocks: [{ table: [
        ["Project", "Growth", "Marketing", "Creative"],
        ["IELS Circle", "Support: member growth, Community Growth role", "Support: pillar ‘Community & connection’, promotion", "Support: session decks, posters, certificates"],
        ["Global Impact Fellowship", "Support: registration funnel, KOL/UGC, GIF funnel report", "Support: Self-Funded campaign plan and calendar", "Support: campaign assets, guidebook, certificates"],
        ["Elco AI", "Lead: acquisition, KOL & UGC creators, experiments", "Support: Elco content pillars", "Support: product visuals and video"],
        ["IELS Course", "Support: leads and lead-to-enrolment", "Support: course campaign (only once a cohort exists)", "Support: course posters and materials"],
      ] }, { note: "Proposed lines, confirmed at HQ Leaders Meeting #1.", tone: "info" }] },
      { heading: "Rules that protect the brand", blocks: [{ list: [
        "No public statement outside an approved campaign; no paid spend without founder approval.",
        "No claims about partners, certificates or programme outcomes that are not confirmed in writing.",
        "No person's image or voice without a recorded consent; no partner logo without written permission.",
        "IELSco (PT English Space Berkah Indonesia) and Elco AI (PT Elco Edukasi Berkah Indonesia) are separate companies: keep the brands distinct.",
        "Instagram @iels.co is the main account; @gif.ielsco is for GIF-specific updates.",
      ] }] },
      RHYTHM,
      { heading: "Guides", blocks: [{ links: [sop("division-growth", "Growth Division Guide"), sop("division-marketing", "Marketing Division Guide"), sop("division-creative", "Creative Division Guide"), sop("guide-task-management", "Guide: Task management in Company OS")] }] },
    ],
  },

  // ── Division guides ───────────────────────────────────────────────────────────────────────────────────────────
  divisionGuide({
    slug: "division-operations", ref: "HB-DIV-2026-OPS", name: "Operations", code: "OPS", dept: "operations", manager: "Ren (Renita Keisya Abidin)", managerTitle: "Operations Manager", agreement: "Division Manager Appointment Agreement, Operations Manager",
    purpose: "Execution and coordination across projects: every major project has an operational dashboard, a plan, owners, deadlines and a risk register.",
    scope: "Operational systems; drafting and maintaining SOPs; workflows; internal cross-division coordination; operational reporting; operational efficiency; project plans, milestones and dependencies; operational risk management.",
    decideAlone: "Schedules, task assignment, SOP and workflow drafts, and reporting formats within an approved plan.",
    escalate: "Adopting or changing any SOP that affects financial, access or data controls; any booking, deposit or contract; safety incidents (tell the President Director at once, record within 24 hours).",
    registers: "Projects; Tasks (Division = Operations); Risks; SOP library (this Handbook); Programs and events.",
    kpis: ["KPI-0001 Overdue open tasks", "KPI-0002 On-time task completion", "KPI-0031 Events delivered as planned", "KPI-0067 GIF delegates completing the program"],
    deliverables: ["List of SOPs with their status (this Handbook)", "Map of the main workflows", "Operational risk register reviewed regularly", "Monthly operations report"],
    daily: ["Check every project dashboard for overdue tasks and milestones in the next 14 days", "Chase PICs on overdue items; move blocked items to Blocked with the blocker written in the task", "Keep the GIF register current: tasks, risks, country plans, run sheet", "Prepare the Weekly Operating Review"],
    workflows: [sop("sop-project-operations", "SOP: Project operations and weekly review"), sop("guide-task-management", "Guide: Task management"), { label: "Project dashboards", href: "/os/portfolio" }, L.gif],
    projects: [["IELS Circle", "Support", "Session calendar, run sheet, cohort logistics, reporting"], ["Global Impact Fellowship", "Lead", "Programme plan, logistics, gates G0–G5, risk register, delegate operations"], ["Elco AI", "Support", "GIF pathway operations, support process"], ["IELS Course", "Lead", "Cohort set-up, schedules, tutor coordination, attendance"]],
    roles: [["O1 Project Manager", "2", "Plan and track GIF workstreams and events"], ["O2 Delegate Experience", "2", "Delegate communication and on-site experience"], ["L2 Course Manager (proposed move from Learning)", "2", "Run course cohorts and schedules"]],
    tools: [L.portfolio, L.gif, L.timeline, L.tasks, L.calendar, L.kpis],
    templates: ["HQ-TPL Project Brief (TPL-D03)", "HQ-TPL SOP Template (TPL-D02)", "HQ-TPL Event Pack (TPL-D19)", "HQ-TPL Attendance Register (TPL-D20)", "HQ-TPL Operational Report (TPL-D05)", "HQ-TPL Weekly Operating Review"],
  }),
  divisionGuide({
    slug: "division-business", ref: "HB-DIV-2026-PAR", name: "Business", code: "PAR", dept: "operations", manager: "Shafira (Shafira Ramadhani)", managerTitle: "Business Manager", agreement: "Division Manager Appointment Agreement, Partnership Manager (the division is now called Business)",
    purpose: "Partnerships that serve the four projects, managed in five categories from first contact to written confirmation.",
    scope: "Strategic partnerships with institutions, academia, corporates and communities; business development; partner relations; negotiation coordination; partnership execution; proposals, meeting notes and follow-ups; recording written commitments and partner deliverables.",
    decideAlone: "Research, outreach scheduling, proposal drafts, meeting notes.",
    escalate: "Any commitment (money, exclusivity, data sharing, logo use, certificates); every agreement or MoU; every sponsorship; public naming of a partner. Business coordinates negotiations but never decides or signs for the Company.",
    registers: "Partnerships (category, project, stage, evidence, PIC, follow-up, communication history); Master Timeline; Agreements; Tasks (Division = Business).",
    kpis: ["KPI-0034 Signed institutional partners", "KPI-0035 Partnership proposals sent", "KPI-0036 Active media partners", "KPI-0068 Partners formally confirmed in writing"],
    deliverables: ["Up-to-date partner pipeline naming the contracting company for every opportunity", "Proposals on the correct company letterhead", "Every draft agreement logged before it is sent to an outside party"],
    note: "Five categories: Media, Corporate, Academic, Community and Recruitment Partnership. Every partner has exactly one.",
    daily: ["Work the follow-ups due today (Partnerships → sort by Follow up)", "Log every call, email or meeting as a comment on the partner (communication history)", "Move stage and evidence only with proof on file", "Request proposal decks from Creative through Requests → Creative request (Business)"],
    workflows: [sop("sop-partnership-pipeline", "SOP: Partnership pipeline"), L.partnerships, { label: "Business workspace", href: "/os/d/par?tab=workflow" }],
    projects: [["IELS Circle", "Support", "Community and academic partners for campus expansion"], ["Global Impact Fellowship", "Lead (partners)", "Universities, local coordinators, sponsors and venues"], ["Elco AI", "Support", "Corporate and academic partnerships"], ["IELS Course", "Support", "School and academic partners"]],
    roles: [["R1 Academic Partnerships", "1", "Universities and schools"], ["R2 Media Partnerships", "1", "Media partners and publications"], ["R3 Corporate Partnerships", "1", "Sponsors and corporate partners (with leadership approval)"]],
    tools: [L.partnerships, L.gif, L.requests, L.docs],
    templates: ["IEL-TPL / ELC-TPL Partnership Proposal (TPL-D18)", "IEL-TPL / ELC-TPL MoU, DRAFT — professional review required (TPL-D17)", "IEL-TPL / ELC-TPL Formal Letter (TPL-D11)", "HQ-TPL Meeting Minutes (TPL-D04)"],
  }),
  divisionGuide({
    slug: "division-people", ref: "HB-DIV-2026-PPL", name: "People", code: "PPL", dept: "operations", manager: "Yasmine (Nashwa Maulida Yasmine)", managerTitle: "People Manager", agreement: "Division Manager Appointment Agreement, People Manager",
    purpose: "HR and people operations for the team, and care for delegates and communities: recruitment, onboarding, records, engagement, announcements, follow-up and escalation.",
    scope: "Recruitment and the experience of volunteers and team members; role descriptions and selection; onboarding and training; talent development, organisational culture, team engagement and retention; recognition, feedback and handovers; people operations; consent and safe handling of personal stories.",
    decideAlone: "Recruitment schedule, session logistics, onboarding plan and team engagement activities.",
    escalate: "Selection and offers to candidates; anything about terms of work, compensation or agreements; deciding the legal nature of anyone's relationship (volunteer, employee or service provider); complaints about conduct.",
    registers: "Recruitment (candidates, stages, evaluations); People directory and profiles; Reviews; IELSco Inside stories; Tasks (Division = People).",
    kpis: ["KPI-0062 Volunteer applications received"],
    deliverables: ["Recruitment plan per intake", "Assessment of the nature of the relationship for every candidate before an offer", "Onboarding pack", "Talent development plan and team engagement summary", "Handover record for every departing volunteer or team member"],
    note: "People is not only recruitment administration: it owns the experience of team members, delegates and communities (Circle member care moves here from the former Community division, proposed).",
    daily: ["Recruitment: move candidates through stages and record evaluations in words", "Answer team, delegate and community questions within 2 working days; escalate what you cannot decide", "Post important announcements on Home (managers and founders can post)", "Keep onboarding checklists current for every new member"],
    workflows: [sop("sop-recruitment-onboarding", "SOP: Recruitment and onboarding"), sop("sop-delegate-community-support", "SOP: Delegate and community support"), L.recruitment, L.people, L.reviews],
    projects: [["IELS Circle", "Lead", "Community nurturing, member care, stories with consent, onboarding of new members"], ["Global Impact Fellowship", "Support", "Delegate support and service, guardian consent follow-up, team capacity in the May–July peak"], ["Elco AI", "Support", "Hiring learning roles (TBC)"], ["IELS Course", "Support", "Tutor and mentor onboarding"]],
    roles: [["P1 People Branding", "2", "Employer brand and team stories"], ["P2 People Development", "2", "Onboarding, training and engagement"], ["C1 Community Experience (proposed move from Community)", "2", "Member and delegate care, community groups"]],
    tools: [L.recruitment, L.people, L.reviews, { label: "Announcements (Home)", href: "/os" }, L.tasks],
    templates: ["HQ-TPL Onboarding and Offboarding Checklist (TPL-D22)", "HQ-TPL Meeting Minutes (TPL-D04)", "Manager Offering Letter & Engagement Agreement (built-in, named readers, legal review pending)"],
  }),
  divisionGuide({
    slug: "division-growth", ref: "HB-DIV-2026-GRO", name: "Growth", code: "GRO", dept: "growth", manager: "Didi (Diandra Paramita Chairunisa)", managerTitle: "Growth Manager", agreement: "Division Manager Appointment Agreement, Growth Manager",
    purpose: "Get content seen and turn attention into sign-ups: social media distribution, audience growth, KOLs, UGC creators, growth experiments and performance monitoring.",
    scope: "Growth strategy and execution: acquisition, activation, retention, growth experiments and performance monitoring, including the awareness-to-registration funnel, audience and channel segmentation, UTM tracking and campaign reporting.",
    decideAlone: "Content and experiments within an approved campaign and brand guide; channel scheduling; experiment design that needs no spend.",
    escalate: "Public statements outside an approved campaign; paid spend; claims about partners, certificates or programme outcomes; sharing personal data with anyone, including the related company.",
    registers: "Content calendar (Campaigns); KOL & UGC creator tracker; Growth experiments; KPI dictionary; Tasks (Division = Growth).",
    kpis: ["KPI-0033 Lead-to-enrolment conversion", "KPI-0059 GIF interest registrations", "KPI-0060 GIF applications started", "KPI-0061 GIF applications submitted", "KPI-0063 to KPI-0066 Elco sign-ups, activation, retention and paid conversion from the GIF source (reported separately)"],
    deliverables: ["Monthly campaign calendar (distribution view)", "Campaign report for each period", "GIF funnel report", "Record of growth experiment results"],
    daily: ["Check the content calendar for the next 7 days: what is Ready to publish and on which channel", "Schedule and publish; add the published link and first results to the calendar item", "Work the creator tracker: follow-ups due, content going live", "Watch the funnel numbers on the GIF dashboard"],
    workflows: [sop("sop-distribution", "SOP: Distribution and publishing"), sop("sop-kol-ugc", "SOP: KOL and UGC creators"), { label: "Growth workspace: calendar, creators, experiments", href: "/os/d/gro?tab=workflow" }, L.campaigns],
    projects: [["IELS Circle", "Support", "Member growth, distribution, Community Growth role"], ["Global Impact Fellowship", "Support", "Registration funnel, KOL/UGC, distribution, GIF funnel report"], ["Elco AI", "Lead", "Acquisition, KOL & UGC creators, experiments"], ["IELS Course", "Support", "Lead generation and lead-to-enrolment conversion"]],
    roles: [["G2 Social Media Manager", "1", "Run IELSco and Elco AI channels"], ["G3 KOL & UGC Manager", "5", "Elco AI content and creator coordination"], ["C2 Community Growth (proposed move from Community)", "2", "Grow Circle and community audiences"]],
    tools: [L.campaigns, { label: "Creator tracker", href: "/os/d/gro?tab=workflow" }, L.portfolio, L.kpis],
    templates: ["HQ-TPL Content Brief: Carousel & Video (TPL-D23)", "HQ-TPL Division Weekly Status Report"],
  }),
  divisionGuide({
    slug: "division-marketing", ref: "HB-DIV-2026-MKT", name: "Marketing", code: "MKT", dept: "growth", manager: "Acha (Rasya Dewina Zulfa)", managerTitle: "Marketing Manager", agreement: "Division Manager Appointment Agreement, Marketing Manager",
    purpose: "Decide what we say and when: content pillars, content calendar, campaign direction, structured briefs to Creative, review and publication readiness.",
    scope: "Marketing strategy; campaign planning and execution; content distribution planning; audience growth; monitoring of marketing performance; brand communication.",
    decideAlone: "Content and distribution schedules within an approved campaign and brand guide; drafting campaign plans for approval.",
    escalate: "Public statements or announcements outside an approved campaign; paid spend (advertising, endorsers, vendors); claims about partners, certificates or programme outcomes; use of any person's image or voice without recorded consent.",
    registers: "Campaigns and the content calendar; Content briefs (Requests → Content brief); KPI dictionary; Tasks (Division = Marketing).",
    kpis: ["KPI-0037 Instagram followers", "KPI-0038 LinkedIn followers", "KPI-0039 TikTok followers", "KPI-0040 Short-form videos published", "KPI-0054 Launch campaign sign-ups"],
    deliverables: ["Monthly marketing campaign plan and calendar", "Content distribution plan per channel (with Growth)", "Monthly marketing performance report", "Brand communication guidance for each campaign"],
    note: "Marketing became its own division (DIV-10) on 26 Nov 2026. The split of scope with Growth is set by the founders in writing; until then, coordinate with the Growth Manager and never run the same campaign separately.",
    daily: ["Keep the next 4 weeks of the content calendar filled by pillar and project", "Send every piece to Creative as a Content brief request", "Review Creative deliveries within 1 working day; send back with clear notes or approve", "Mark approved items Ready to publish and send Growth a Distribution request"],
    workflows: [sop("sop-content-brief", "SOP: Content brief to Creative"), sop("guide-content-pillars", "Guide: Content pillars"), { label: "Marketing workspace: pillars, calendar, briefs", href: "/os/d/mkt?tab=workflow" }, L.campaigns],
    projects: [["IELS Circle", "Support", "Pillar ‘Community & connection’, session topics and promotion plan"], ["Global Impact Fellowship", "Support", "Self-Funded campaign plan, content calendar, briefs"], ["Elco AI", "Support", "Elco content pillars: explainers, games, practical English, updates"], ["IELS Course", "Support", "Course campaign and content (once a cohort exists)"]],
    roles: [["G1 Content Writer (proposed move from Growth)", "2", "Captions, articles and scripts"], ["G4 Content Creator (proposed move from Growth)", "open", "Short-form content for IELSco and Elco AI"]],
    tools: [L.campaigns, { label: "Send a content brief", href: "/os/d/mkt?tab=workflow" }, L.requests, L.kpis],
    templates: ["HQ-TPL Content Brief: Carousel & Video (TPL-D23)", "HQ-TPL Division Weekly Status Report", "HQ-TPL Monthly Management Review"],
  }),
  divisionGuide({
    slug: "division-creative", ref: "HB-DIV-2026-CRE", name: "Creative", code: "CRE", dept: "growth", manager: "Mojo (Ramdhani Purbo)", managerTitle: "Creative Manager", agreement: "Division Manager Appointment Agreement, Creative Manager",
    purpose: "Design and creative production for every division: one visible queue of requests with priorities, deadlines, PICs, revision rounds and final files.",
    scope: "Creative direction and brand guidelines; visual identity; production calendar and approvals; graphic design, motion, video and editing; programme assets; design quality; content production; creative team coordination; asset library, source files and consent records.",
    decideAlone: "Design choices within the brand guidelines and an approved brief; production order.",
    escalate: "Any change to brand identity; use of any person's image or voice without recorded consent; partner logos without written permission; spend on production or vendors.",
    registers: "Creative queue (Requests to Creative); content calendar (production deadline and status); Tasks (Division = Creative); Brand Assets folder in Drive.",
    kpis: ["KPI-0038 LinkedIn followers", "KPI-0040 Short-form videos published"],
    deliverables: ["Production calendar", "Final assets with source files in the Brand Assets folder", "Consent record for every person's image or voice", "Licence record for every third-party asset"],
    daily: ["Triage new requests: accept, ask for missing information, or decline with a reason", "Assign a PIC and make one task per request (Create task from the request)", "Deliver drafts in the request; count every send-back as a revision round", "On approval, put final and source files in the Brand Assets folder and link them in the request"],
    workflows: [sop("sop-creative-production", "SOP: Creative production and revisions"), { label: "Creative workspace: queue", href: "/os/d/cre?tab=workflow" }, L.requests],
    projects: [["IELS Circle", "Support", "Session decks, posters, certificates"], ["Global Impact Fellowship", "Support", "Campaign assets, guidebook, certificates, on-site media"], ["Elco AI", "Support", "Product visuals, short-form video, app-store and social assets"], ["IELS Course", "Support", "Course posters and materials design"]],
    roles: [["K1 Graphic Designer", "3", "Carousels, posters, decks"], ["K2 Video Designer", "1", "Short-form video and motion"]],
    tools: [{ label: "Creative queue", href: "/os/d/cre?tab=workflow" }, L.requests, L.campaigns, L.docs],
    templates: ["HQ-TPL Content Brief: Carousel & Video (TPL-D23)", "HQ-TPL General Document (TPL-D01)"],
    note: "Recruitment, 26 Nov: no first-choice applicants yet for Graphic Designer (K1) or Video Designer (K2).",
  }),

  // ── SOPs and workflows ────────────────────────────────────────────────────────────────────────────────────────
  {
    slug: "sop-content-brief", ref: "HB-SOP-2026-01", title: "SOP: Content brief to Creative", kind: "SOP", department: "growth", division: "MKT",
    summary: "How Marketing turns a calendar item into a structured brief that Creative can produce without guessing.", owner: "Acha (Marketing Manager)", approver: "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "Purpose and scope", blocks: [{ p: "Every piece Creative makes for Marketing starts from one written brief in Company OS. Applies to carousels, single posts, stories, short videos, posters, decks and certificates for all four projects." }] },
      { heading: "Roles", blocks: [{ table: [["Role", "Responsibility"], ["Marketing (requester)", "Writes the brief, answers questions, reviews and approves"], ["Creative Manager", "Accepts or asks for information, assigns the PIC, protects the deadline"], ["Creative PIC", "Produces, delivers drafts and final files"], ["Arba", "Approves public posts outside an approved campaign"]] }] },
      { heading: "Procedure", blocks: [{ list: [
        "Create or pick the calendar item (Campaigns) with pillar, project, channel and planned publish date.",
        "Marketing workspace → Send a content brief. Fill: objective, audience, key message, call to action, format and specs (size, slides, duration), copy, required assets and links, references, project, deadline, priority.",
        "Set the deadline at least 3 working days before the publish date for posts and 5 for video (proposed; confirm with Creative).",
        "Creative accepts within 1 working day, or asks for information (status “Information needed”).",
        "Creative delivers in the request. Marketing reviews within 1 working day: approve, or send back with numbered notes (each send-back adds a revision round).",
        "After approval: Marketing marks the calendar item Ready to publish and sends Growth a Distribution request.",
      ], ordered: true }] },
      { heading: "Rules", blocks: [{ list: ["Two revision rounds are normal; a third needs the Creative Manager's agreement (proposed)", "No brief, no production: chat requests are moved into a brief first", "Claims, partner names, prices and dates must match Company OS facts (GIF: the programme register)"] }] },
      { heading: "Records", blocks: [{ p: "Request (brief, events, revision rounds), the calendar item, final files in the Brand Assets folder. Template: HQ-TPL Content Brief: Carousel & Video (TPL-D23)." }] },
    ],
  },
  {
    slug: "sop-creative-production", ref: "HB-SOP-2026-02", title: "SOP: Creative production and revisions", kind: "SOP", department: "growth", division: "CRE",
    summary: "How Creative runs one queue for every division: intake, priority, PIC, revisions, approval and file delivery.", owner: "Mojo (Creative Manager)", approver: "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "Intake", blocks: [{ p: "Requests come only through Company OS Requests: Content brief (Marketing), Design request (Growth), Recruitment campaign (People), Creative request (Operations), Creative request (Business). Each has a deadline, priority and brief." }] },
      { heading: "Queue order", blocks: [{ list: ["P1 Critical and overdue first, then by deadline", "Portfolio priority breaks ties: IELS Circle, GIF, Elco AI, IELS Course", "A request without enough information goes to “Information needed”, not to the bottom of the queue"] }] },
      { heading: "Procedure", blocks: [{ list: [
        "Triage within 1 working day: Accept (assign PIC), Information needed, or Decline with a reason.",
        "Create one task from the request for the PIC (keeps the workload visible in the task table).",
        "Start → In progress. Deliver drafts in the request (link to Drive).",
        "Requester reviews: approve, or send back. Each send-back is one revision round and is counted.",
        "On approval: export finals, keep source files, put both in the Brand Assets folder with the request ID in the file name, link the folder in the request, close.",
      ], ordered: true }] },
      { heading: "Quality and consent", blocks: [{ list: ["Brand guidelines and locked header/footer components are used as they are", "Every person's image or voice has a consent record; every third-party asset has a licence record", "Partner logos only with written permission (Business confirms)"] }] },
    ],
  },
  {
    slug: "sop-distribution", ref: "HB-SOP-2026-03", title: "SOP: Distribution and publishing", kind: "SOP", department: "growth", division: "GRO",
    summary: "How Growth schedules approved content per channel and records results.", owner: "Didi (Growth Manager)", approver: "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "Procedure", blocks: [{ list: [
        "Marketing sends a Distribution request when an item is Ready to publish.",
        "Growth picks channels and times (own accounts, KOL or UGC partners), adds UTM links, schedules.",
        "On publishing: set the calendar item to Published, add the published link and actual date.",
        "After 7 days: add measured results with the date read (reach, saves, link clicks, sign-ups). No estimates.",
        "Monthly: campaign report and GIF funnel report from the recorded results.",
      ], ordered: true }] },
      { heading: "Rules", blocks: [{ list: ["Main Instagram @iels.co; GIF-specific updates on @gif.ielsco", "Paid promotion needs founder approval", "Personal data is never shared with creators or partners"] }] },
    ],
  },
  {
    slug: "sop-kol-ugc", ref: "HB-SOP-2026-04", title: "SOP: KOL and UGC creators", kind: "SOP", department: "growth", division: "GRO",
    summary: "Research, outreach, collaboration and tracking of KOLs and UGC creators.", owner: "Didi (Growth Manager)", approver: "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "Procedure", blocks: [{ list: [
        "Research: add each creator to the Creator tracker with platform, handle, niche, followers, project and status Researched.",
        "Shortlist against the project audience; set a PIC and next follow-up date.",
        "Outreach with approved wording; log the date in Last contact and keep status current (Contacted, In talks).",
        "Any fee, free product, exclusivity or contract is escalated to the founders before anything is promised. Record only the note, never agree terms in the tracker.",
        "When agreed: deliverables and dates in the tracker; content goes through the Marketing brief and Creative review if we supply assets.",
        "When live: status Content live, results with the date read; Completed after the last deliverable.",
      ], ordered: true }] },
    ],
  },
  {
    slug: "sop-partnership-pipeline", ref: "HB-SOP-2026-05", title: "SOP: Partnership pipeline", kind: "SOP", department: "operations", division: "PAR",
    summary: "One record per partner with category, project, status, PIC, follow-up, communication history, documents and next action.", owner: "Shafira (Business Manager)", approver: "Farrel (COO)", ...DRAFT,
    sections: [
      { heading: "Categories", blocks: [{ table: [["Category", "Examples"], ["Media Partnership", "Publications, media accounts, event media partners"], ["Corporate Partnership", "Sponsors, companies, corporate training clients"], ["Academic Partnership", "Universities, schools, international offices"], ["Community Partnership", "Student organisations, youth communities, associations"], ["Recruitment Partnership", "Partners that recruit participants or team members for us"]] }, { note: "Coordinators and vendors are suppliers, not partners: they stay uncategorised or move to an Operations task.", tone: "info" }] },
      { heading: "Procedure", blocks: [{ list: [
        "Add the organisation in Partnerships: category, project, contracting company (IELSco or Elco AI), PIC, stage 1 Identified, evidence 1 Researched.",
        "Write the potential collaboration and the next action; set a follow-up date.",
        "After every contact: comment on the record (date, channel, who, what was said) and move stage/evidence only with proof.",
        "Proposals from the correct company letterhead (TPL-D18); deck design through Requests → Creative request (Business).",
        "Any commitment, MoU or public naming goes to the founders; the draft agreement is logged before it is sent.",
        "Written confirmation: evidence 5, document linked on the record.",
      ], ordered: true }] },
    ],
  },
  {
    slug: "sop-recruitment-onboarding", ref: "HB-SOP-2026-06", title: "SOP: Recruitment and onboarding", kind: "SOP", department: "operations", division: "PPL",
    summary: "From application to the first 30-day goals, for the 2027 cohort and later intakes.", owner: "Yasmine (People Manager)", approver: "Farrel (COO)", ...DRAFT,
    sections: [
      { heading: "2027 cohort timeline (published)", blocks: [{ table: [["Date", "Step"], ["9–29 Nov", "Applications open (close 29 Nov, 23:59 WIB)"], ["30 Nov", "Session schedule sent (Arba approves the message)"], ["1–4 Dec", "Group sessions"], ["5–8 Dec", "Review"], ["9 Dec", "Decisions and offers (founders)"], ["10–18 Dec", "Acceptance and onboarding"], ["4–10 Jan 2027", "Assignments and 30-day goals"], ["11 Jan 2027", "First cycle starts"]] }] },
      { heading: "Procedure", blocks: [{ list: [
        "Candidates arrive in Recruitment at stage New application. Each HQ Leader screens the roles of their division (CV screening, then Under review).",
        "Evaluate in words, never scores or ranks; record the evaluation on the candidate.",
        "Interview stage: group sessions; each leader joins the sessions for their roles.",
        "Final evaluation: shortlist per role; assess the nature of the relationship before any offer.",
        "Founders decide and send offers; People records acceptances and the reserve list.",
        "Onboarding: convert the accepted candidate into a Company OS person (invited), onboarding checklist (TPL-D22), orientation and OS walkthrough.",
        "30-day goals with the division manager; 30-day check-in in February.",
      ], ordered: true }] },
      { heading: "Rules", blocks: [{ list: ["No silent extension of a deadline: extensions are a founder decision with a reason", "Candidate data is Restricted: only recruiters with a recruitment grant see it", "Handover record for every departing member"] }] },
    ],
  },
  {
    slug: "sop-delegate-community-support", ref: "HB-SOP-2026-07", title: "SOP: Delegate and community support", kind: "SOP", department: "operations", division: "PPL",
    summary: "How People answers, follows up and escalates questions from GIF delegates and community members.", owner: "Yasmine (People Manager)", approver: "Farrel (COO)", ...DRAFT,
    sections: [
      { heading: "Procedure", blocks: [{ list: [
        "Every question or issue that needs more than one reply becomes a task (Division People, project GIF or IELS Circle, PIC, deadline).",
        "Reply within 2 working days, using the facts in the programme register (never promise what is not decided).",
        "Payments, refunds, guardian consent, insurance, visa letters and safety go to Operations and the founders; record the escalation in the task.",
        "Community groups: weekly check of the channels, welcome new members, collect stories only with written consent.",
        "Important announcements: drafted by People, approved by a founder when public, posted on Home for the team.",
      ], ordered: true }] },
      { heading: "Contacts", blocks: [{ p: "Official contact: hello@ielsco.com · WhatsApp +62 882-9725-3491 (programme register)." }] },
    ],
  },
  {
    slug: "sop-project-operations", ref: "HB-SOP-2026-08", title: "SOP: Project operations and weekly review", kind: "SOP", department: "operations", division: "OPS",
    summary: "How Operations keeps each project dashboard true and runs the Weekly Operating Review.", owner: "Ren (Operations Manager)", approver: "Farrel (COO)", ...DRAFT,
    sections: [
      { heading: "Procedure", blocks: [{ list: [
        "Each project has a dashboard (Project dashboards): status, milestones, workstreams, team, live numbers, risks, deadlines, documents and tasks.",
        "Monday: check every dashboard; list overdue tasks and milestones due in 14 days; message PICs.",
        "Before the HQ Leaders meeting: Weekly Operating Review (template) with one line per project: status, next milestone, risks, decisions needed.",
        "Risks: GIF risks in the programme register; other projects as tasks with priority P1/P2 and the word “Risk:” in the title until a register exists.",
        "Monthly: operations report (TPL-D05) and SOP list status.",
      ], ordered: true }] },
    ],
  },
  {
    slug: "guide-task-management", ref: "HB-GDE-2026-03", title: "Guide: Task management in Company OS", kind: "Guide",
    summary: "How to use the task table: one row per task, status in the row, views and cleanup.", owner: "Ren (Operations Manager)", approver: "Farrel (COO)", ...DRAFT,
    sections: [
      { heading: "The table", blocks: [{ p: "Tasks → All tasks shows one row per task with Task, Status, PIC, Department, Division, Project, Deadline and Priority. Change any of them in the row; it saves at once. Statuses keep the existing workflow: Backlog, Ready, In Progress, In Review, Blocked, Done, Cancelled." }] },
      { heading: "Views", blocks: [{ table: [["View", "Use it for"], ["All tasks", "Everything you can see, filtered and grouped as you like"], ["My tasks", "Tasks you own or are assigned to, by month"], ["By project / department / month", "Planning across the four projects"], ["Overdue", "Open tasks past their deadline, by PIC"], ["Upcoming deadlines", "Open tasks due in the next 14 days"], ["Needs cleanup", "Backlog tasks whose deadline has passed"]] }] },
      { heading: "Rules", blocks: [{ list: ["Every task has one PIC and a deadline", "Update the status on the day it changes (KPI-0056, KPI-0057)", "Blocked means you wrote the blocker in the task and told your manager", "Department follows the division; changing the department clears a division from the other department"] }] },
      { heading: "Cleanup of old tasks", blocks: [{ p: "Nothing is deleted. In Needs cleanup, the PIC or their manager decides for each task: new deadline, move it on, or Cancelled with the reason written in the task. Founders review the list weekly until it is empty." }] },
    ],
  },
  {
    slug: "guide-content-pillars", ref: "HB-GDE-2026-04", title: "Guide: Content pillars", kind: "Guide", department: "growth", division: "MKT",
    summary: "The content pillars for IELSco and Elco AI, from the content strategy.", owner: "Acha (Marketing Manager)", approver: "Arba (CEO)", ...DRAFT,
    sections: [
      { heading: "IELSco", blocks: [{ table: [["Pillar", "Purpose", "Formats"], ["A. Community & event stories", "First-hand proof of what IELSco does", "Event recaps, participant experiences (with consent), partner activities"], ["B. Global opportunities", "Help readers apply", "Scholarship and programme guides with primary sources"], ["C. Practical English", "Answer real learner questions", "Grammar and word-choice guides, interview English"], ["D. Community & connection", "Why and how to learn with others", "How-to guides, cross-cultural pieces"]] }] },
      { heading: "Elco AI", blocks: [{ table: [["Pillar", "Purpose"], ["A. Product explainers", "Show what is real"], ["B. Practice through games", "Independent value"], ["C. Practical English", "Speaking and vocabulary in context"], ["D. Product updates", "Only shipped features"]] }] },
      { heading: "Every piece", blocks: [{ list: ["One real user question or one documented event", "Primary sources for anything time-sensitive", "English and Indonesian where the channel needs it", "Links to the right brand's page; no invented numbers or quotes"] }] },
    ],
  },
];

// Project responsibility guides, generated from the portfolio facts (src/content/os/portfolio.json).
const DIV_NAME: Record<string, string> = { OPS: "Operations", PAR: "Business", PPL: "People", GRO: "Growth", MKT: "Marketing", CRE: "Creative" };
for (const pj of portfolio.projects) {
  HANDBOOK.push({
    slug: `project-${pj.key}`, ref: `HB-PRJ-2026-0${pj.rank}`, title: `${pj.name}: Project Responsibility Guide`, kind: "Project guide", project: pj.key,
    summary: pj.one_liner, owner: "Operations (Ren) with the project lead division", approver: "Arba (CEO) and Farrel (COO)", ...DRAFT,
    sections: [
      { heading: "What it is", blocks: [{ p: pj.one_liner }, { list: pj.what }] },
      { heading: "Who does what", blocks: [{ table: [["Division", "Role", "Contribution"], ...Object.entries(pj.divisions).map(([k, v]) => [DIV_NAME[k] ?? k, v.role, v.contribution])] }] },
      { heading: "Operational requirements", blocks: [{ list: pj.ops }] },
      { heading: "Dependencies", blocks: [{ list: pj.dependencies }] },
      { heading: "Immediate priorities", blocks: [{ list: pj.next, ordered: true }] },
      { heading: "To be confirmed", blocks: [{ list: pj.tbc }] },
      { heading: "Learning deck and dashboard", blocks: [{ links: [{ label: `${pj.name}: Project Overview and Team Learning (PowerPoint)`, href: `/os/api/files/learning-${pj.key}` }, { label: "Project dashboard", href: `/os/portfolio/${pj.key}` }] }] },
    ],
  });
}

export const handbookBySlug = (slug: string) => HANDBOOK.find((d) => d.slug === slug);
export const DOC_KIND_ORDER: DocKind[] = ["Meeting pack", "Department guide", "Division guide", "SOP", "Guide", "Workflow", "Project guide"];
