# IELS Dashboard Reset (MVP)

A calm, focused logged-in dashboard. The promise is simple: **help learners find resources and people that fit their goals.**
There is no AI curriculum, no tasks or missions, no streaks, no tier badges and no internal chat.

## What changed

| Area | Route | Main files |
|---|---|---|
| Home | `/dashboard` | `app/dashboard/page.tsx`, `components/dashboard/home/NextActions.tsx` |
| Goal onboarding / edit goals | `/dashboard/onboarding` | `app/dashboard/onboarding/page.tsx`, `components/dashboard/goals/*` |
| Explore (resources) | `/dashboard/explore` (`?for=me`, `?direction=study`) | `app/dashboard/explore/page.tsx`, `components/dashboard/explore/ResourceFilters.tsx`, `components/dashboard/ResourceCard.tsx` |
| People (opt-in directory) | `/dashboard/people` | `app/dashboard/people/page.tsx`, `components/dashboard/people/*`, `components/dashboard/MemberCard.tsx` |
| Profile (editable) | `/dashboard/profile` (rewritten) | `app/dashboard/profile/page.tsx`, `components/dashboard/profile/*` |
| Programs catalogue | `/dashboard/programs` | `app/dashboard/programs/page.tsx`, `data/dashboard/programs.ts` |
| IELS Circle | `/dashboard/circle` | `app/dashboard/circle/page.tsx` |
| Navigation | all dashboard pages | `components/dashboard/DashboardLayout.tsx`, `DashboardHeader.tsx`, `AccountMenu.tsx`, `MobileTabBar.tsx`, `nav.ts` |
| Data layer | — | `lib/dashboard/{types,options,profile,match}.ts`, `components/dashboard/useMemberProfile.ts` |
| Legacy redirects | — | `proxy.ts` → `getLegacyDashboardRedirect()` |
| Migration | — | `supabase/migrations/20261013000000_member_profiles.sql` (outside `src/`) |

Navigation is five items (Home, Explore, People, Programs, IELS Circle). Profile, Edit my goals, Settings, Help and Sign out live in the avatar menu. On mobile the five items move to a bottom tab bar.

`DashboardLayout` keeps its old props (`userTier`, `userName`, `userAvatar`), so the legacy pages that still use it compile and get the new navigation. `userTier` is ignored now.

## User flow
1. After sign-in, `/dashboard` checks `member_profiles.onboarding_completed_at`. If it's empty, the user is sent to `/dashboard/onboarding`.
2. Onboarding has 3 steps: destination country (dropdown with "Other" → free text), direction (Study / Work / Explore), and interests that change with the direction. English level is optional. The final screen says "Your space is ready".
3. "I'll finish this later" sets a sessionStorage flag. Home then shows a "Set your goals" card as the one primary action.
4. Returning users go straight to Home: a greeting, their goal summary with "Edit goals", 2 next actions, 3 recommended resources and 3 similar people.
5. Users can change goals from the avatar menu (Edit my goals) or the Goals section of their Profile.

## Removed from navigation (code kept)
Goals/tasks/progress reports, the learning hub, the library with fake counts, mock opportunities, community (duplicate of Circle), tier badges and upsells, stats/streaks, MascotInsight, GoalDashboardWidget and the GIF banner on Home.
None of these files were deleted. They are just not used by the new core dashboard. Candidates to remove later, after you check dependencies: `components/goals/*`, `components/dashboard/MascotInsight.tsx`, `data/task-generator.ts`, `data/progress-calculator.ts`, `components/subscription/*` (still used by settings/membership).

## Legacy routes
Redirects for signed-in users are in `proxy.ts`:
- `/dashboard/goals` and `/dashboard/goals/*` → `/dashboard/profile#goals`
- `/dashboard/learning` and `/dashboard/learning/library` → `/dashboard/explore`
- `/dashboard/opportunities` → `/dashboard/programs`
- `/dashboard/community` → `/dashboard/circle`

These routes still work unchanged and are linked from Programs or the avatar menu: `/dashboard/test/*`, `/dashboard/learning/courses`, `/dashboard/events`, `/dashboard/gif/*`, `/dashboard/settings`, `/dashboard/settings/membership`, `/dashboard/help`, `/dashboard/portfolio`, `/dashboard/community/start`. School, admin, API, test and GIF code was not touched.

## Data and schema
- **Existing tables are read only.** The profile is prefilled from `public.users` (`full_name, avatar_url, domicile, occupation, bio, linkedin, instagram, english_level`). The dashboard never writes to `users`.
- **New table `public.member_profiles`** (additive). Apply the migration in Supabase: SQL Editor → paste `supabase/migrations/20261013000000_member_profiles.sql` → Run (or use `supabase db push`). It sets up:
  - RLS where owners can select, insert and update only their own row. `anon` has no access.
  - The RPC `list_member_directory(p_direction, p_search, p_limit, p_offset)`. It is `security definer`, `authenticated` only, returns only opted-in members and only the fields each member chose to share, and is paginated (max 50 per page). It never returns email or phone.
  - Partial indexes on `(direction, updated_at)` and a GIN index on `interests` for public rows.
- **Until the migration is applied**, saves go to the browser's `localStorage` (`iels:member-profile:<userId>`). The UI shows a notice about this, and People shows "directory will appear once the database update is applied". Any other Supabase error is shown to the user, not swallowed.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (existing). The new ones are all optional:
  - `NEXT_PUBLIC_SHOW_DEMO_DATA` (`false` hides demo people)
  - `NEXT_PUBLIC_TOFLY_URL`, `NEXT_PUBLIC_SKILIO_URL`, `NEXT_PUBLIC_CIRCLE_WHATSAPP_URL`. If one of these is unset, the UI shows "coming soon" and no button. No partner URL was invented.

## Demo data
- `src/data/dashboard/resources.ts` has 24 resources: 20 curated links to well-known public sites (still need verifying before launch) and 4 IELSco templates that don't exist yet (`url: null`, shown as "Not published yet").
- `src/data/dashboard/demo-members.ts` has 10 fictional people (`id: "demo-…"`, `is_demo: true`, no links). They are never written to the database and are always labeled "Demo".
- `src/data/dashboard/programs.ts` holds the 6 programs. `src/data/dashboard/config.ts` holds the links. The Discord link was reused from `app/circle/page.tsx`.

### Replacing demo data with real data
- Resources: create a `resources` table with the same columns as the `Resource` type (`lib/dashboard/types.ts`) and a public-read RLS policy. Then replace the `DEMO_RESOURCES` import in Explore and Home with a Supabase query. Filtering in `applyFilters` can stay client-side for a few hundred items, or move to SQL later.
- People: real members show up automatically once the migration is applied and members opt in. To hide demo people, set `NEXT_PUBLIC_SHOW_DEMO_DATA=false` or delete `demo-members.ts` and its imports.

## Extending with Claude
- Add nav items in `components/dashboard/nav.ts`. Keep it to 5 or fewer.
- Change onboarding options in `lib/dashboard/options.ts`.
- Change recommendation rules in `lib/dashboard/match.ts` (plain scoring, easy to read).
- Use the shared style tokens in `components/dashboard/ui.ts` and the loading/error/empty states in `components/dashboard/PageStates.tsx`.
- New pages should follow the same pattern: `useMemberProfile()` → loading / error / ready → `<DashboardLayout>`.

## Phase 2 (2026-10-15): editorial redesign, saving, real matching, origin, collections, mentors, Circle, courses

### New and changed routes
| Route | What it shows |
|---|---|
| `/dashboard` | Hero "Find your next step." with goal chips, then a featured collection plus 4 resource rows. After that: saved shelf, similar people (real members first, labeled demo profiles only as a fallback), the Circle banner for the current week, and a matching course |
| `/dashboard/explore` | Tabs for All, Saved and Recently viewed (`?tab=saved`). Curated collections, filters and resource cards with a Save button |
| `/dashboard/explore/[id]` | Resource detail: facts, Open, Save, the collections it belongs to and a related course |
| `/dashboard/explore/collections/[id]` | Collection page: cover, outcome, level, resources, Save collection |
| `/dashboard/people` | Search plus filters for origin, destination, direction and interest. Server-ranked real members with "You both: …" reasons. Demo profiles in their own section |
| `/dashboard/programs` | Course index (6 tracks), mentor directory with skill filter, and other programs as editorial rows |
| `/dashboard/programs/courses/[track]` | Course detail: real packages and prices from `src/data/courses.ts`, outcomes, mentor, free materials, and the register/WhatsApp CTAs |
| `/dashboard/circle` | Featured current or next activity, the cohort schedule, and how to join Discord/WhatsApp |

### Key files
- **Pages:** `components/dashboard/DashboardPage.tsx` is the page wrapper (auth, profile, layout, saved items). New pages follow `<DashboardPage>{(ctx) => <View {...ctx} />}</DashboardPage>`.
- **Saving:** `components/dashboard/bookmarks/*` and `lib/dashboard/bookmarks.ts`. Saves go to Supabase only. If the table is missing, a toast says nothing was saved, and there is never a localStorage fake.
- **Recently viewed:** `lib/dashboard/recent.ts` keeps at most 10 `{id, at}` records in this browser only, with a "Clear history" button.
- **Content (edit these, no logic needed):**
  - `data/dashboard/collections.ts`
  - `data/dashboard/circle.ts` (keep in sync with `/circle/agenda`)
  - `data/dashboard/courses.ts` (a view over the existing `data/courses.ts`, so prices aren't duplicated)
  - `data/dashboard/resources.ts` (link check status)
  - `data/dashboard/demo-members.ts`
- **Views:** `components/dashboard/{home,explore,resources,collections,people,programs,circle}/*`

### Migration 2: `supabase/migrations/20261013010000_phase2_origin_bookmarks.sql` (run after migration 1)
- Adds the `member_profiles.origin_country` column (country of origin, separate from `country` = where they live now and from `destination_country`). Existing rows stay NULL, and Home shows "Add where you're from". `users.domicile` is not touched.
- Adds `member_bookmarks(user_id, item_type, item_id, created_at)` with PK `(user_id, item_type, item_id)`, so a duplicate save is a no-op. RLS: owners can select, insert and delete only their own rows.
- Updates `list_member_directory(p_direction, p_search, p_origin, p_destination, p_interest, p_limit, p_offset)`:
  - Every field is privacy-masked first, and filters and `match_score` use only the masked fields. Someone who hides their origin won't match an origin filter.
  - Score: same direction +2, same destination +2, same origin +1, plus 1 for each shared interest.
  - "Prefer not to say" is never returned.
  - Paginated, `authenticated` only.
- **To apply:** Supabase → SQL Editor → paste file 1 → Run, then file 2 → Run. **Status: not applied yet**, so saving, the real directory and account-backed profiles show honest "not switched on yet" states.

### Content honesty
- **Resource links:** checked automatically on 2026-10-13, and 18 returned HTTP 200. British Council LearnEnglish, Chevening, Australia Awards, DAAD, TakeIELTS and Indeed didn't answer the automated check (bot protection) and are marked "link check pending". Collections and Home recommendations use only checked links or IELSco templates.
- **Images:** the hero and collection covers are Unsplash-licensed photos in `public/images/dashboard/`. They illustrate topics, not specific resources. Resources have no thumbnails; they use a consistent tone-and-icon fallback.
- **Mentors:** Arba and Dhila come from `data/courses.ts`. Languages, session length and availability aren't in the source, so they aren't shown. There's no booking calendar, so the CTA opens the existing IELS WhatsApp contact. The `hana` mentor is referenced by some tracks but not defined, so those courses show "Facilitator to be confirmed".
- **Courses:** prices come from `PRICE_PER_SESSION` and `LOUNGE_VALUE`. There is no online checkout, so registration uses the existing Google Form/WhatsApp and the page says so.
- **Circle:** the schedule is the Oct–Dec 2026 cohort from `/circle/agenda`. Registration for it closed on 9 Oct 2026. The free WhatsApp link needs `NEXT_PUBLIC_CIRCLE_WHATSAPP_URL`.
- **Analytics:** no analytics setup exists in the repo, so no conversion events are tracked. Add them where the CTAs are (`course-register-cta`, `course-whatsapp-cta`) once an analytics tool is chosen.
- **Destination list:** Southeast Asia plus "Other" / "Not decided yet", as the brief asked. Existing non-SEA destinations show as "Other" text, and People search matches them.

## Known limitations
- The Supabase migration is not applied yet, so the directory is empty and saves are per-device until it is.
- The dashboard pages are client components. Auth protection still comes from `proxy.ts` plus a client redirect.
- The home "similar people" section uses demo profiles only. A future step could call the RPC there too.
- In this preview, images from `public/` were not part of `src.zip`, so some legacy pages show missing images.
- `lucide-react`: the new code avoids brand icons, so it works with older and newer versions.

## Manual test checklist
1. New account → sign in → onboarding appears. Choose "Other" country → type a country → Study → Scholarships → finish → "Your space is ready" → Home.
2. Reload `/dashboard`. Onboarding does not appear again, and the goal summary is shown.
3. Avatar → Edit my goals → change the direction → Home recommendations change.
4. Explore: search "interview", use category chips, the type and direction filters and "Matches my goals". A search with no matches shows the empty state. Links open in a new tab.
5. People: demo profiles have the Demo badge. Search and direction filters work. After the migration, two test accounts that opt in can see each other, with only the fields they chose.
6. Profile: edit fields, toggle visibility and public fields, check the preview card, save, reload.
7. Programs and Circle: every button goes to a real page or external link.
8. Legacy URLs (`/dashboard/goals`, `/dashboard/learning/library`, `/dashboard/opportunities`, `/dashboard/community`) redirect.
9. Mobile (390px): the bottom tab bar works and nothing scrolls sideways.
10. Run `tsc --noEmit` and `next build` in the full repo (package/config files were not in the upload).
