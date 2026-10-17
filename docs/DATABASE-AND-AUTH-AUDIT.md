# IELSco database and auth audit (dashboard merge)

Date: 2026-10-16. Scope: the IELSco Supabase project used by `ielsco.com` and the merged Emergent dashboard.

**Nothing in this document has been applied to production.** All SQL was tested on a local, throwaway
Postgres (PGlite). Steps you must run yourself are marked **MANUAL**.

## 1. How this was checked

| Source | What it tells us | Limits |
|---|---|---|
| Application code (`src/**`) | Every `.from()`, `.rpc()`, storage bucket and column the app uses | Shows intent, not what exists |
| `prisma/schema.prisma` | An introspection snapshot of the real database (auth + public schemas) | **Out of date**: it lacks tables the code uses and the live API serves (`gif_delegates`, `course_sessions`, `course_enrollments`, `private_student_overview`) |
| Live REST API, read-only, **publishable key only** | Whether a table/function is exposed (`404 PGRST205` = not found, `401 42501` = exists but anon is denied, `200` = anon can select) | Requests used `limit=0` or `HEAD` + `count=exact`, so **no row contents were fetched**. Column-level checks on locked tables are not possible as anon |

The database passwords you pasted were **not used**. Please rotate both (IELSco and Elco), as they are now in a chat transcript.

## 2. Tables: existing vs. required

### Existing tables used by the app (left untouched)

| Table / object | Live status (anon) | Used by |
|---|---|---|
| `users` | exists, anon denied | Header, all dashboards, account editor (`/dashboard/profile/account`), GIF pages |
| `user_profiles` | exists, anon denied | (older profile table, has `bio`, `interests`) |
| `memberships` | exists, anon denied | tier lookups, GIF pages, membership settings |
| `gif_registrations` | exists, anon denied | `/dashboard/gif/*` |
| `gif_delegates` | exists, anon denied | `/dashboard/gif/delegates` (+ storage bucket `gif-2026-documents`) |
| `event_registrations`, `goals`, `goal_tasks` | exist, anon denied | events, goals |
| `course_enrollments`, `course_sessions`, `mentor_consultations` | exist, anon can select but **0 rows visible** (RLS working) | courses, mentoring |
| `private_student_overview` (view) | **anon can read 37 rows** - see section 4 | school mentor dashboard |

### Referenced by the original code but **not found** in the live API (pre-existing, not caused by the merge)

| Table | Referenced in | Effect |
|---|---|---|
| `test_attempts` | `api/test/*` routes, `dashboard/test/*`, `dashboard/learning`, `lib/testSync.ts` | English-test attempt flow likely errors in production |
| `test_certificates` | `lib/testSync.ts` | certificate sync |
| `user_goals`, `resource_purchases` | `dashboard/learning/page.tsx` | learning hub sections |
| `contributions` | `dashboard/portfolio`, `portfolio/[username]` | portfolio contributions |

They may live in a non-exposed schema, be renamed, or never have been created. **I did not create them**:
their columns cannot be inferred safely and they are outside the dashboard merge. This is an open question for you.

### Required by the merged dashboard (missing live, migrations prepared)

| Object | Live status | Why it is needed |
|---|---|---|
| `member_profiles` | not found | Onboarding goals (direction, destination, interests, origin), opt-in public directory card, privacy choices |
| `member_bookmarks` | not found | "Save" on resources/collections (Explore, Home shelf) |
| `list_member_directory(...)` | not found | People directory, privacy-masked, signed-in only |

## 3. Why `member_profiles` is a separate table (and not `users`)

Reviewed against the "reuse `users`, don't duplicate" rule:

- **New data with no home today**: direction, destination, interests, origin country, `is_public`,
  `public_fields`, `onboarding_completed_at`, portfolio URL. `users` has none of these.
- **Overlapping fields** (display name, avatar, country/domicile, occupation, English level, LinkedIn,
  Instagram) are a deliberate *public directory card*: the member chooses what other members see, separately
  from private account data. The directory function reads only this table, so it can never leak `users`
  columns such as `email`, `phone`, `birth_date` or `password_hash`.
- `users` stays the source of truth for account data and is **only read** (to prefill the card). It is still
  edited on the original account page, now at `/dashboard/profile/account`.
- `user_profiles` was not reused: the app no longer writes to it, its columns don't match the feature, and
  changing it could affect unknown consumers.

`member_bookmarks` is new data with no existing equivalent.

## 4. Security findings

1. **`private_student_overview` is publicly readable (pre-existing, HIGH).** An anonymous count returned 37
   rows. Per the mentor dashboard type, the view has `student_name`, `student_email`, `contract_url`,
   session progress and scores. **MANUAL**: review and run `supabase/manual/SECURITY-private_student_overview.sql`
   (step 1 revokes anon access and does not affect the signed-in mentor page; step 2 needs a decision).
2. **Hardcoded credentials removed from the repo.** The Supabase URL/anon key in `next.config.ts` and the Sentry
   DSN in three files now come from environment variables.
3. **Service-role key** is only referenced in server code (`app/api/test/*`, `lib/supabase/server.ts`,
   `lib/testSync.ts`). Next.js only inlines `NEXT_PUBLIC_*` variables into browser bundles; the build output was
   searched to confirm (see MERGE-REPORT.md).
4. **Bug fixed in the Emergent code**: the profile prefill selected `users.bio`, which does not exist in the
   schema snapshot, so the whole prefill query failed. `bio` was removed from that query.
5. `users` has a `password_hash` column (per the schema snapshot). It is unused by the app; Supabase Auth stores
   passwords in `auth.users`. Worth confirming it is empty or dropping it in a separate, reviewed change (not done here).

## 5. Migrations (in `supabase/migrations/`, apply in this order)

| File | Origin | Contents |
|---|---|---|
| `20261013000000_member_profiles.sql` | Emergent | `member_profiles` + owner-only RLS, anon revoked, v1 directory function |
| `20261013010000_phase2_origin_bookmarks.sql` | Emergent | `origin_country`, `member_bookmarks` + owner-only RLS, directory v2 (drops/recreates only its own function) |
| `20261016000000_dashboard_hardening.sql` | merge | link URLs must be `http(s)://` (they render as links to other members), allowed `public_fields` values, size limits, server-side `updated_at`, bookmark index |
| `20261016010000_product_tours.sql` | Phase 4 | per-user product tour completion (owner-only RLS, `user_id` defaults to `auth.uid()`) |

All three are additive and idempotent. They never drop, truncate or alter any pre-existing table,
and they never touch `users`, `gif_*` or `memberships`.

### Local validation (PGlite, Postgres 17 in WASM)

Script: a Supabase-like setup (`anon`/`authenticated` roles, Supabase default grants, `auth.users`, `auth.uid()`)
with stand-in `users`, `gif_registrations`, `gif_delegates` tables holding data and their own RLS.
**Result: 37/37 checks passed**, including:

- all three migrations applied **twice** without error (idempotent)
- data, columns and policies of `users`, `gif_registrations`, `gif_delegates` byte-identical before and after
- owner can create/update/read their profile via the app's exact upsert; cannot write another user's row
- other members cannot read or update someone else's profile or bookmarks; anon cannot read/write either table
- `javascript:` links and unknown `public_fields` rejected; legacy links containing spaces still accepted
- directory: signed-in only, excludes self and private members, returns only fields the member shared, no email/phone
- bookmarks default to the caller's `auth.uid()`; duplicates ignored; cascade delete with the auth user
- GIF row access unchanged for owner and non-owner

A control run without the hardening migration fails the hardening checks, so the tests do discriminate.

**Not verified** (needs a real Supabase project): the real Supabase Auth/JWT path, real `users` column names
(anon is correctly denied), PostgREST schema-cache reload, and end-to-end UI saves.

## 6. MANUAL: applying the migrations

Recommended: apply to a **staging/branch project first**, then production.

**Option A - SQL editor (simplest)**
1. Supabase Dashboard -> your project -> SQL Editor.
2. Paste and run each file **in order**: `20261013000000...`, `20261013010000...`, `20261016000000...`, `20261016010000...`.
3. PostgREST reloads its schema cache automatically; if `/rest/v1/member_profiles` still returns 404 after a
   minute, run `notify pgrst, 'reload schema';`.

**Option B - Supabase CLI** (the `supabase` package is already a devDependency)
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
`db push` applies every file in `supabase/migrations` that the remote has not recorded. Review the list it
prints before confirming: the CLI tracks history in `supabase_migrations.schema_migrations`, and older changes
made in the dashboard are not in that history.

**After applying, verify:**
```bash
# should now be 401 (exists, anon denied) instead of 404
curl -s -o /dev/null -w "%{http_code}\n" -H "apikey: <publishable key>" "https://<ref>.supabase.co/rest/v1/member_profiles?select=user_id&limit=0"
```
Then sign in on the site, complete onboarding, reload on another device, and confirm the "saved in this
browser only" notice is gone and saved items persist.

**Separately (MANUAL, review first)**: `supabase/manual/SECURITY-private_student_overview.sql`.

## 7. Environment variables (IELSco)

| Variable | Scope | Needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | **required**, every page (was hardcoded before; build fails without it) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | **required**; the publishable key (`sb_publishable_...`) goes here |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only secret** | `api/test/*`, `lib/testSync.ts` |
| `DATABASE_URL`, `DIRECT_URL` | **server-only secret** | Prisma (`prisma generate` does not need them; runtime Prisma queries do) |
| `NEXT_PUBLIC_SENTRY_DSN` | public | optional; Sentry is off when unset (was hardcoded) |
| others | see `.env.example` | tests, Google Sheets sync, Gemini, dashboard partner links |

Never put the service-role key, database URL or AI keys in a `NEXT_PUBLIC_` variable.
