# Careers: Open Recruitment 2027

Public page `/careers` (+ `/careers/<division>`), the signed-in application `/dashboard/careers/apply`, the recruitment
popup, and the recruitment pipeline in Company OS (`/os/recruitment`).

## Sources of truth
- Roles and divisions: the 16 roles of DOC-0055 Volunteer Staffing & Recruitment Workbook, Role_Matrix (founder update,
  1 Nov 2026), with each role's maximum places, plus **Content Creator (G4, Growth)** added by the founder on 9 Nov 2026
  (17 roles). Divisions are grouped by lead: Growth, Creative, Community and Learning under Arbadza (CEO,
  arbadza@ielsco.com); Partnerships, Operations and People under Farrel (COO, farrel@ielsco.com). Data:
  `src/data/careers/divisions.ts` (roles, leads) and `src/data/careers/recruitment.ts` (dates, timeline, the seven
  campaign tasks, declaration, status copy). Content Creator's text comes from the 2026 recruitment's Content Creator
  role (its places are not set yet). KOL & UGC Manager (G3) and Media Partnerships (R2) have only short descriptions;
  extend them there and here.
- Program structure, benefits, eligibility: founder brief of 1 Nov 2026.

## The public page
`/careers` uses the same design language as the rest of ielsco.com (`components/site/ui` tokens: white sections,
hairline dividers, navy type, Poppins headings). The MKT-0008 campaign (Figma November file, section 2048:602) is a
source of photos and the campaign preview only, not a layout. Sections, in order: introduction and application period
(+ key facts), about the program (+ one auto-rotating photo carousel, `components/careers/PhotoCarousel.tsx`), the 17
roles with what each one does (division tabs, `RoleExplorer.tsx`; both co-founders' cards are identical in size),
benefits, the 9-month program and timeline, how to apply + what to prepare + who can apply, the campaign slides, FAQ,
final call to action. Photos: `public/images/careers/2027/`.

## The journey
1. `/careers` → **Apply now** → `/dashboard/careers/apply`. Signed-out visitors are sent to `/sign-in?next=…` (the proxy
   keeps `next` for `/dashboard/careers*`); sign-up and Google keep it too, so new and existing users land back on the
   application. There is no separate recruitment login: applicants use their Elco-Pass (IELSco account).
2. The application page has no dashboard sidebar, header or tab bar. Six steps: Account (signed-in email, optional
   **Connect Elco account** through the existing secure link flow `ELCO_LINK_URL`), About you (incl. country and city of
   residence; no address), Roles (1–2, by position, any division, no duplicates), Profiles & documents (CV always;
   portfolio required only when a Creative role, K1 or K2, is chosen), Campaign tasks (7), Review & declaration.
3. Progress is saved to `public.career_application_drafts` (own row, RLS) a moment after each change; coming back
   resumes at the same step. Name, Instagram, LinkedIn, portfolio link and country are prefilled from the member profile.
4. After submitting, the same page shows the status, the per-task Instagram verification and the next dates. While the
   window is open and the status is still `submitted`, **Change application** updates the same row.

We never ask for ID cards, dates of birth or home addresses.

## The recruitment popup (no permanent cards)
`components/careers/RecruitmentPopup.tsx`, mounted once in `LayoutWrapper` (public site and IELSco dashboard), and
elco-app `frontend/src/components/RecruitmentPopup.jsx` on the Elco dashboard. It shows the campaign poster, says the
recruitment is open and for 1st–3rd year students, and has Apply now, Not now / ✕ and "Don't show this again".
- Appears after 6 seconds, at most once per browser session; "Close" hides it for the session (sessionStorage),
  "Don't show again" for good on that browser (localStorage). Only between 9 and 29 Nov 2026 (WIB).
- Never on careers pages, the application, sign-in/up, onboarding, membership checkout, tests, calls, Company OS, admin
  or the school portal (`lib/careers/popup.ts`), and not while someone is typing in a field.
- **Apply now** goes to `/careers/apply` (`app/careers/apply/route.ts`): signed in → `/dashboard/careers/apply`, signed
  out → `/careers`. Elco links to the same IELSco route.

## How an application is stored
Migrations `20261111000000_career_applications_accounts.sql` and `20261112000000_career_applications_domicile.sql`.
- PDFs go to the private bucket `career-applications` under `applicants/<user id>/` (own folder only, while open; the
  applicant can read back only their own files).
- `public.submit_my_career_application()` (security definer; 18 arguments with domicile) takes the email from the
  account, validates every field, normalises WhatsApp, Instagram and LinkedIn, checks the files exist, requires a
  portfolio only for Creative roles (`career_roles_need_portfolio()`), requires the task confirmation, privacy notice and
  declaration (stored as timestamps), and inserts with `status = submitted`, or updates the applicant's existing row.
  One application per account per cohort and per email. The earlier 16-argument version is dropped.
- `public.my_career_application()` returns the applicant's own row (with domicile) without admin notes or any OS data.
- No service-role key is used.

## Company OS → Recruitment (migration `20261112010000_os_recruitment.sql`)
The applications are read in place (same Supabase project as the OS); the OS adds pipeline state keyed by the
application id: `os_recruitment_stages` (configurable by founders; each maps to the applicant-facing status),
`os_recruitment_candidates` (stage, reviewer, decision note, person record link), `os_recruitment_stage_history`,
`os_recruitment_assignments` (reviewers / interviewers), `os_recruitment_evaluations` (per author and kind: screening,
interview, final; ratings in words on seven criteria, never totalled or ranked), `os_recruitment_notes` (team or
private).
- **Access** (Postgres RLS and security-definer helpers, never only the UI): founders, and staff with a founder-given
  `recruitment` grant (`os_grants`, resource `2027`; `view` reads, `edit` also moves stages, assigns, records checks and
  decisions). Interviewers / reviewers assigned to a candidate see only that candidate via
  `os_recruitment_candidate_brief()` (no email, WhatsApp or admin notes) and only that candidate's files, and only their
  own evaluations and notes. Everyone else in the OS sees nothing. Applicants never see OS data.
- **Pipeline**: New application → CV screening → Under review → Interview → Final evaluation → Accepted / Rejected.
  Every stage change and assignment is written to the stage history and `os_audit_log`; the applicant's status page
  follows the stage.
- **Calendar and tasks**: `os_events.candidate_id` and `os_tasks.candidate_id`. Linked records are always Restricted
  (founders, the creator / reviewer, attendees / assignees). Interviews use the normal event sheet (attendees, groups,
  Google sync).
- **Timeline**: the page lists the existing Master Timeline recruitment milestones (WS1, TL-001…).
- **Notifications**: new applications (founders and recruitment editors), reviewer / interviewer assignments.
- **AI Assistant / Operations agents**: when asked about recruitment, they read the candidates the person may see (no
  contact details), point out unfinished workflows, and can propose two actions that run only after confirmation:
  `create_recruitment_task` and `schedule_interview`. They never move stages, rank candidates or recommend hiring.
- **Accepted → person record**: founders only, `os_recruitment_convert()`. Creates an *invited* `os_people` row (normal
  invitation and approval still apply), links it to the application, never twice, and refuses an existing Google
  account.
- The older Dashboard → Admin → Operations → **Applications** screen (site admins) still works and its CSV now includes
  domicile and per-task columns.

## Changing things
- **Dates:** `opensAt`/`closesAt` in `recruitment.ts` **and** `public.career_applications_open()` (new migration), and the
  Elco popup's dates.
- **Campaign post / Add Yours:** `RECRUITMENT.instagram.campaignPostUrl` is the published carousel (comment + tag, share to
  Story, repost) and `twibbonUrl` the official Add Yours Story template; tasks link to them via `campaignTaskLink()`.
- **Campaign artwork:** the published carousel (MKT-0008, as posted) is in `public/images/careers/2027/published/`
  (`slide-01` is the poster used by the popups and the Careers page). LinkedIn company pages are in `RECRUITMENT.linkedin`
  (discovery only, not a campaign task). Logos: `public/images/logos/iels_blue1.png` and the Elco eye mark
  `public/images/logos/elco-mark.svg` (from the founder's file `elco-mark.png`).
- **Roles:** edit `divisions.ts` **and** `public.career_role_division()` (new migration). Creative roles needing a
  portfolio: `CREATIVE_ROLE_IDS` in `lib/careers/application.ts` and `career_roles_need_portfolio()`.
- **Recruiters:** a founder adds an Access grant in Company OS Admin (type `recruitment`, resource `2027`).

## Tests
- `tests/careers-application.test.mjs` (npm test): validation, domicile, Creative portfolio rule, popup rules, OS helpers.
- PGlite: `tests/db/career-applications.pglite.mjs`, `career-applications-accounts.pglite.mjs`, `os-recruitment.pglite.mjs`
  (access, pipeline, interviewers, evaluations, notes, linked tasks/events, conversion).
- Browser: `tests/e2e/careers-recruitment.e2e.mjs` (public page and journey, popup, against the local stack) and
  `tests/e2e/os-recruitment.e2e.mjs` (Company OS on real Postgres with `tests/e2e/company-os/gateway.mjs`; extra setup
  in `tests/e2e/os-recruitment/setup-extra.sql`).

## Retired 2026 division pages
`/careers/business` → `/careers/partnerships`, `/careers/talent` → `/careers/people`, `/careers/finance` → `/careers`
(308, `next.config.ts`).
