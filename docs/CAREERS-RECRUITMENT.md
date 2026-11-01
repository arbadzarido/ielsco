# Careers: Open Recruitment 2027

Public page `/careers` (+ `/careers/<division>`), application form, and the recruitment team's review screen.

## Sources of truth
- Roles and divisions: the 16 roles of DOC-0055 Volunteer Staffing & Recruitment Workbook, Role_Matrix (founder update,
  1 Nov 2026), with each role's maximum places. Divisions are grouped by lead: Growth, Creative, Community and Courses &
  Learning under Arbadza (CEO, arbadza@ielsco.com); Partnerships, Operations and People under Farrel (COO,
  farrel@ielsco.com). Timeline: the workbook's Recruitment_Timeline. Data: `src/data/careers/divisions.ts` (roles, leads)
  and `src/data/careers/recruitment.ts`. KOL & UGC Manager (G3) and Media Partnerships (R2, deferred in the workbook)
  have only short descriptions; extend them there and here.
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
