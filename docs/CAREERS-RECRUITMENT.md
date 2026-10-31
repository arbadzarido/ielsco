# Careers: Open Recruitment 2027

Public page `/careers` (+ `/careers/<division>`), application form, and the recruitment team's review screen.

## Sources of truth
- Roles and divisions: the official structure of 20 roles (founder correction, 1 Nov 2026); descriptions from DOC-0055
  Volunteer Staffing & Recruitment Workbook (Role_Matrix). Timeline: its Recruitment_Timeline. Data lives in
  `src/data/careers/divisions.ts` and `src/data/careers/recruitment.ts`. Media Partnerships (X1) and Community
  Partnerships (X2) have no detailed description in the workbook yet; add one there and here when it exists.
- Program structure, benefits, eligibility, campaign tasks: founder brief of 1 Nov 2026.

## How an application is stored
1. The browser uploads the CV (PDF, required) and optionally a portfolio PDF to the private bucket
   `career-applications` under `incoming/<application id>/`. Visitors can add files only while applications are open
   and only to a folder that has not been submitted yet; they can never read or list files.
2. It then calls `public.submit_career_application()`, which validates every field, normalises WhatsApp
   (+62…), Instagram (profile URL) and LinkedIn (`https://www.linkedin.com/in/<id>/`), checks the files exist, enforces
   the window and one application per email per cohort, and stores the row in `public.career_applications` with
   `status = submitted` and `campaign_verification = pending`.
3. No service-role key is used. Rows and files are readable only by `public.staff_roles` admins (`is_site_admin()`).

## Reviewing applications
Dashboard → Admin → Operations → **Applications**: filter by division and status, open CV/portfolio (5-minute signed
links), set the status (`submitted, under_review, invited, shortlisted, accepted, reserve, rejected, withdrawn`), record
the Instagram campaign check (`pending, verified, incomplete`) and internal notes, export CSV. Instagram tasks are
checked by hand on Instagram; applicants don't send screenshots.

To give a recruiter access, add their auth user id to `public.staff_roles` (role `admin`). That also grants the other
admin screens, so keep the list short.

## Changing things
- **Dates:** `opensAt`/`closesAt` in `recruitment.ts` **and** `public.career_applications_open()` (new migration).
  The page re-renders every 10 minutes, so it switches to "open" within 10 minutes of 9 Nov 00:00 WIB.
- **Campaign post:** set `RECRUITMENT.instagram.campaignPostUrl` once the post is live (until then the page links to
  @iels.co).
- **Roles:** edit `divisions.ts`; if you add or rename a division slug, update the `division` check in the table and the
  function (new migration).

## Tests
`tests/db/career-applications.pglite.mjs` (migration, RLS, window, validation, duplicates, storage policies). Run it next
to a PGlite install: `node --liftoff-only career-applications.pglite.mjs <repo>/supabase/migrations`.

## Retired 2026 division pages
`/careers/business` → `/careers/partnerships`, `/careers/talent` → `/careers/people`, `/careers/finance` → `/careers`
(308, `next.config.ts`).
