# Careers: Open Recruitment 2027

Public campaign page `/careers` (+ `/careers/<division>`), the signed-in application `/dashboard/careers/apply`, the
dashboard recruitment card, and the recruitment team's review screen.

## Sources of truth
- Roles and divisions: the 16 roles of DOC-0055 Volunteer Staffing & Recruitment Workbook, Role_Matrix (founder update,
  1 Nov 2026), with each role's maximum places, plus **Content Creator (G4, Growth)** added by the founder on 9 Nov 2026
  (17 roles). Divisions are grouped by lead: Growth, Creative, Community and Courses & Learning under Arbadza (CEO,
  arbadza@ielsco.com); Partnerships, Operations and People under Farrel (COO, farrel@ielsco.com). Data:
  `src/data/careers/divisions.ts` (roles, leads) and `src/data/careers/recruitment.ts` (dates, timeline, the seven
  campaign tasks, declaration, status copy). KOL & UGC Manager (G3), Media Partnerships (R2) and Content Creator (G4)
  have only short descriptions; extend them there and here.
- Program structure, benefits, eligibility: founder brief of 1 Nov 2026. Campaign art: MKT-0008 (approved v3, Figma
  November file, section 2048:602); photos and slides are in `public/images/careers/2027/`.

## The journey
1. `/careers` → **Apply now** → `/dashboard/careers/apply`. Signed-out visitors are sent to `/sign-in?next=…` (the proxy
   keeps `next` for `/dashboard/careers*`); sign-up and Google keep it too, so new and existing users land back on the
   application. There is no separate recruitment login: applicants use their Elco-Pass (IELSco account).
2. The application page has no dashboard sidebar, header or tab bar. Six steps: Account (signed-in email, optional
   **Connect Elco account** through the existing secure link flow `ELCO_LINK_URL`), About you, Roles (1–2, by position,
   any division, no duplicates), Profiles & documents, Campaign tasks (7), Review & declaration.
3. Progress is saved to `public.career_application_drafts` (own row, RLS) a moment after each change; coming back
   resumes at the same step. Name, Instagram, LinkedIn and portfolio link are prefilled from the member profile.
4. After submitting, the same page shows the status, the per-task Instagram verification and the next dates. While the
   window is open and the status is still `submitted`, **Change application** updates the same row.
5. Dashboard home shows a recruitment card (Apply now / Continue application / status). Elco AI's dashboard shows a
   card linking here until 29 Nov (elco-app `frontend/src/components/RecruitmentCard.jsx`).

We never ask for ID cards, dates of birth or home addresses.

## How an application is stored (migration 20261111000000)
- PDFs go to the private bucket `career-applications` under `applicants/<user id>/` (own folder only, while open; the
  applicant can read back only their own files).
- `public.submit_my_career_application()` (security definer) takes the email from the account, validates every field,
  normalises WhatsApp, Instagram and LinkedIn, checks the files exist, requires the task confirmation, privacy notice and
  declaration (stored as `tasks_confirmed_at`, `privacy_accepted_at`, `declaration_accepted_at`), and inserts with
  `status = submitted`, `campaign_verification = pending`, `submitted_at`, or updates the applicant's existing row.
  One application per account per cohort (unique index) and per email.
- `public.my_career_application()` returns the applicant's own row without admin notes, and attaches an application sent
  earlier without an account (the retired anonymous form) to the account with the same **confirmed** email.
- The anonymous `submit_career_application()` and the anonymous upload policy are retired.
- No service-role key is used. Full rows and all files are readable only by `public.staff_roles` admins.

## Reviewing applications
Dashboard → Admin → Operations → **Applications**: filter by division (first or second choice) and status, open
CV/portfolio (signed links), set the status, record each of the seven Instagram tasks (`pending`, `verified`,
`not_found`; the overall `campaign_verification` follows), internal notes, export CSV (with per-task columns). Tasks are
checked by hand on Instagram; applicants don't send screenshots, and see each task's result on their status page.

To give a recruiter access, add their auth user id to `public.staff_roles` (role `admin`). That also grants the other
admin screens, so keep the list short.

## Changing things
- **Dates:** `opensAt`/`closesAt` in `recruitment.ts` **and** `public.career_applications_open()` (new migration), and the
  Elco card's dates.
- **Campaign post / Twibbon:** set `RECRUITMENT.instagram.campaignPostUrl` and `twibbonUrl` once they exist (until then
  the tasks point to @iels.co and to the approved recruitment Story download).
- **Roles:** edit `divisions.ts` **and** `public.career_role_division()` (new migration).

## Tests
- `tests/careers-application.test.mjs` (npm test): validation rules, draft sanitising, error mapping.
- `tests/db/career-applications.pglite.mjs` and `tests/db/career-applications-accounts.pglite.mjs`: migrations, RLS,
  storage policies, drafts, one/two roles, updates, locking, claiming, admin verification, window.
- `tests/e2e/careers-recruitment.e2e.mjs`: the whole journey against the local stack (see the file header).

## Retired 2026 division pages
`/careers/business` → `/careers/partnerships`, `/careers/talent` → `/careers/people`, `/careers/finance` → `/careers`
(308, `next.config.ts`).
