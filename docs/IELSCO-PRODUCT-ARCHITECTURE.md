# IELSco Product Architecture

The English Learning & Opportunity Platform for Southeast Asian youth: **IELSco** (community and opportunities),
**Elco AI** (the AI English companion, www.elcoai.com) and **Elco-Pass** (one identity and learning journey across both).

Status: the restructure is live (PR #20, merged 2026-11-04, migration 20261104000000 in §14). The navigation
simplification and images (§2, §3 Home, §12) are on branch `feat/navigation-simplification`, not merged yet.

## 1. Vision and core journey

Discover opportunities → Connect with people → Learn with Elco AI → Practise in IELS Circle → Take part in events → Grow
→ Inspire others. Every page answers "what's my next step?" and links to the next stage of that journey.

Principles that shaped every change:
- Restructure, don't rebuild: existing routes, tables, RPCs and components are reused; old URLs keep working.
- Never fabricate: Home, Passport, notifications and badges are computed from the member's own records or published
  content. Empty sections show an actionable empty state.
- Privacy by default: the Elco-Pass page is visible only to its owner; Elco shares data only through the consented link.

## 2. Navigation

The dashboard uses the **same shell as Elco AI** (`elco-app/frontend/src/components/AppShell.jsx`), ported component by
component; only the items differ. Elco's rem sizes are written in px because IELSco's root font size is 75%.

- **Desktop/tablet (md+)** — `DashboardSidebar.tsx` + `sidebar/NavLinks.tsx`: 288px white sidebar inset 16px, 28px
  radius, hairline border, soft shadow, Poppins; logo; then Elco's row types: `PrimaryItem` (icon tile, navy when
  current), `NavGroup` (a button that only opens/closes its group, children indented under a left border, open on its own
  pages, remembered per device), `NavItem` (plain row, tinted when current) and `Divider`. Bottom: the Elco card and the
  profile card (Elco's UserCard look) with Profile, Settings, Help, tour, language, sign out.
- **Phones (< md)** — `DashboardHeader.tsx` (Elco's MobileTopBar: logo, notifications and inbox shortcuts with Elco's
  coral count, avatar → profile) and `MobileTabBar.tsx` (Elco's navy dock: Home, Social, **Discover** in the wide centre
  slot, Events, More). More opens a bottom sheet with Elco-Pass, the three groups, More items, Inbox/Notifications/
  Search, the Account section, sign out, GIF and Elco cards.
- Page frame as Elco: white background, content offset to the right of the sidebar (`md:pl-[352px]` + the page's own
  padding = Elco's 376/392px).

Sidebar structure (2026-11-05, from `components/dashboard/nav.ts`). Exactly:

| Row | Type | Pages |
|---|---|---|
| Home | PrimaryItem | `/dashboard` |
| Social | NavGroup | **People** (`/dashboard/connect/discover`), **Inbox** (`/dashboard/connect/messages`, unread count) |
| Discover | NavGroup | **Programs** (`/dashboard/programs`), **Opportunities**, **News & Stories**, **Learning Materials** |
| Events | NavGroup | **Circle** (`/dashboard/circle`, official C logo icon), **IELSco Events** (`/dashboard/events/ielsco`), **Other Events** (`/dashboard/connect/rooms`) |
| Admin pages | NavItem | staff only |

- **People** includes, through one in-page link row (`components/connect/PeopleTabs.tsx`): Discover, Connections,
  Intro requests and **My Elco-Pass** (`/dashboard/passport`, plus the Social profile editor, Elco link and My Learning).
- **Circle** is the ongoing IELS Circle English speaking community (recurring sessions, Speaking Club for Elco Starter/Pro,
  member stories, current cohort agenda) and has its own sidebar item. The 2025 "IELS Circle" event is historical only.
- **IELSco Events** = official one-time events plus IELSco Talks (`components/events/IelscoEventsSections.tsx`, with a
  link card to Circle); `/dashboard/events/talks` lights up IELSco Events. **Other Events** = external/member events.
- **Other Events** = member-hosted sessions, with a note that partner/external events will be listed once published.
- **Profile card menu** (sidebar bottom; Account section of the phone More sheet): Profile & Elco-Pass, Saved,
  Membership, Settings, Help, tour, language, sign out. Goals and Milestone Hall are linked from Elco-Pass,
  Notifications from Home, Search from Programs, Safety from Connections.
- **Hidden, not deleted** (routes, code and data kept; no menu entry): Circle groups, Cultural exchange, Quick Match
  (flag `NEXT_PUBLIC_QUICK_MATCH_IN_NAV`), the Social / Discover overviews, the My-events hub, Notifications, Search.
- No navigation above page content: the section tab row (`SectionTabs`) was removed.
- Phones: Elco dock with Home, Social (→ People), Discover (→ Programs, centre slot), Events (→ IELSco Events), More.
- Legacy: `/dashboard/connect` redirects to `/dashboard/social`. Product tour version 4.

## 3. Feature definitions

**Home** (`components/dashboard/home/HomeView.tsx`), IELSco first: 1. IELSco highlights (the GIF card, this week in IELS
Circle, the latest IELSco news story or the IELS Course); 2. Upcoming IELSco events (official events with posters and
registration status, topped up with the next IELS Circle sessions and check-in status); 3. Explore programs (cover
cards → Programs); 4. Explore opportunities (goal-matched picks with category covers → Opportunities); 5. Continue
learning (Elco progress, only real data). Onboarding redirect, origin prompt and tour are unchanged.

**Discover** (`components/dashboard/discover/*`).
- Overview: search box (→ global search), Opportunities first with category tiles (Scholarships, Internships, Jobs
  abroad, Fellowships, Exchanges, Competitions, Leadership & volunteering, Programs & conferences) showing real counts
  of open listings, goal-based recommendations, then News & Stories and Learning Materials previews.
- Opportunities: the existing `OpportunitiesExplorer` (Academic | Professional). The board gained `?category=`, country,
  study-level (eligibility) and "closing within 3 weeks" filters, built only from values present in the data. Detail
  pages gained Related opportunities and a contextual Elco CTA.
- Opportunity Tracker (`/dashboard/opportunities`): existing `opportunity_tracker`; statuses relabelled **Interested /
  Applying / Applied** (+ Accepted / Not selected / Withdrawn), status filter, personal deadlines, notes, "due within 3
  weeks" banner, Elco practice for what the member is applying to. Deadline reminders appear in Notifications.
- News & Stories (`/dashboard/discover/stories`): IELSco Stories + Member Stories from the one stories CMS, featured
  story, category filter, search, bookmarks, author/date; detail pages are the existing public story pages (they already
  have related stories).
- Learning Materials (`/dashboard/explore`): unchanged catalogue, collections, detail pages and bookmarks, plus an Elco
  CTA matched to the type (podcast → listening, video → speaking, article → reading).

**Events** (`app/dashboard/events/*`).
- `/dashboard/events`: **My upcoming events** first — official-event registrations, IELS Circle check-ins, community
  events (joined or hosted) and member sessions, with date/time, status, calendar link, manage link, and cancel for
  official events. Below: Explore Events tabs — IELSco Events (next three), IELS Circle (the next themed open sessions,
  member-only sessions from `list_member_sessions`, check-in, Elco warm-up), Other Events (member-hosted rooms; partner
  listings when partners publish them). Past events in a collapsible history.
- `/dashboard/events/ielsco`: the previous events page as `components/events/OfficialEventsView.tsx` (one-click
  registration, calendar, "I attended this", bookmark).
- `/dashboard/events/talks` — **IELSco Talks** ("Real Stories. Global Perspectives. New Possibilities."): talk-format
  official events (classified in `lib/events/catalog.ts`), replay archive (empty state: no replays published).

**Social**. Existing Connect features, regrouped: People (privacy-masked directory with search, filters and shared-interest
reasons), Connections, Intro requests, Circle groups, Cultural exchange, Safety. **Inbox**: conversation list with search,
unread badges, timestamps, last message; desktop split view (`InboxView`: list + thread side by side), phone list ↔
thread; existing messaging RPCs (`list_connect_connections`, `list_connect_messages`, `send_connect_message`,
`mark_connect_read`), 5 s polling in an open thread and 15 s for the list. No read receipts or typing status (not in
the data model).

**Elco-Pass** (`/dashboard/passport`, `components/dashboard/me/PassportView.tsx`): identity card (name, avatar, role,
origin, self-reported level, goals), "Private: only you can see this page", Elco progress, chronological **My Learning
Journey**, badges, my record (Circle check-ins, Circle groups, events, opportunities tracked, saved items, connections,
events hosted), certificates (honest empty state), Beyond the Circle story CTA, and a "what syncs, who sees it" panel.
**Milestone Hall** (`/dashboard/passport/milestones`): every badge, how to earn it, the member's progress.

**Saved** (`/dashboard/shelf`, `bookmarks/ShelfView.tsx`): one page for tracked opportunities + bookmarked materials,
collections, stories and events, filterable by kind.

**Notifications Center** (`/dashboard/notifications`): derived, not stored (`lib/me/notifications.ts`): intro requests,
unread messages, registered events within 7 days, tracked deadlines within 14 days, Elco idle ≥ 7 days (linked only).
Categories Social / Events / Opportunities / Learning, all on by default; switches are per device (localStorage) and
only change what is shown and counted. The bell badge counts actionable items (intros, unread, events within a day,
deadlines within 3 days). No email or push.

**Global search** (`/dashboard/search`): opportunities, jobs abroad, events, news & stories, materials, people (existing
`list_connect_people`, opted-in members only) and help answers.

## 4. Elco-Pass architecture

- Identity: the Supabase auth user id is the one IELSco identity; `member_profiles` holds goals, interests, privacy and
  the Social profile. No new account type, no duplicate profile table.
- IELSco ↔ Elco: the existing consented link (`elco_account_links`, code exchange, HMAC-signed server calls, scopes
  `goals:read`, `summary:write`). Elco writes `elco_learning_summaries` (level estimate, ≤ 3 focus skills, practice
  count in 30 days, last active); IELSco only reads it with the member's own session (owner RLS). Unlinking stops sync.
- One loader, `lib/me/records.ts → loadMyRecords()`, reads the member's own rows: `event_registrations`,
  `circle_session_checkins`, `list_connect_rooms(joined|hosting)`, `list_member_sessions`, `opportunity_tracker`
  (+ opportunity), `elco_account_links` / `elco_learning_summaries`, `list_circles`, `connect_summary`,
  `member_bookmarks` (count). Each source fails independently and is reported in `gaps`; a missing table is treated as
  empty. `useMyRecords` caches it for 60 s per user so the sidebar counts and pages share one fetch; writes call
  `invalidateMyRecords()`.
- Journey timeline (`buildJourney`): joined, goals set, events and Circle check-ins (past), tracker status changes,
  Elco linked. Only records that carry a date.
- Badges (`lib/me/badges.ts`): computed every time, never stored, so they can't be wrong or faked.

| Badge | Earned when |
|---|---|
| First Voice | 1 past IELS Circle check-in |
| Circle Regular | 4 past IELS Circle check-ins |
| Consistency Star | ≥ 12 Elco practices in 30 days (linked Elco only) |
| Fearless Speaker | hosted 1 community event |
| Word Collector | 10 saved items |
| Rising Star | 1 opportunity marked Applied (or a result) |
| Community Builder | 5 connections |
| Global Connector | took part in 3 events (IELSco events marked attended, community events, member sessions) |

No points, XP, streak economy or leaderboard (needs an architecture review first). Monthly recognition is not running;
the Milestone Hall says so.

## 5. IELSco × Elco AI integration

From IELSco into Elco — contextual CTAs (`ELCO_PRACTICE` in `lib/elco.ts`, component `ElcoPractice`), each pointing to
a real Elco route with `?ref=ielsco-<place>`:

| IELSco context | Elco practice | Elco route |
|---|---|---|
| Scholarship / program | interview answers | `/roleplay` |
| Internship / volunteering | workplace English | `/coach` |
| Job abroad | mock interview | `/roleplay` |
| Fellowship / conference | presenting | `/learn/skill/speaking` |
| Exchange | everyday conversation | `/learn/skill/speaking` |
| Competition | writing | `/learn/skill/writing` |
| Article / News & Stories | reading & vocabulary | `/learn/skill/reading` |
| Podcast, Talks | listening | `/learn/skill/listening` |
| Video | speaking | `/learn/skill/speaking` |
| IELS Circle (before / after) | warm-up / follow-up | `/learn/skill/speaking`, `/practice` |
| IELSco Events (workshops) | related practice | `/practice` |

Placed on: opportunity detail pages (public), job detail pages, the tracker, News & Stories, material detail pages,
IELS Circle, the Events Circle tab, IELSco Events and Talks. All hidden while `NEXT_PUBLIC_ELCO_ENABLED` isn't `true`.

From Elco back into IELSco: progress → Home "Continue learning" and Elco-Pass; milestones → badges (Consistency
Star); goals → opportunity recommendations (`goals:read` scope already serves IELSco goals to Elco). Not built (needs
Elco changes): Elco speaking results suggesting a specific Circle session, Elco achievements on the public profile.

## 6. User journeys

1. New member: sign up → onboarding (destination, direction, interests, optional level) → Home "Set your goals" /
   "Find your first opportunity" → Discover → save to tracker → Notifications reminds before the deadline.
2. Practice loop: Home → IELS Circle check-in (Events) → Elco warm-up CTA → session → Elco follow-up → First Voice badge
   → Elco-Pass journey.
3. Social: People → Letter Intro → accepted → Inbox (count in the sidebar) → host a community event → Fearless Speaker.
4. Growth: applied → Rising Star → share the story (Beyond the Circle, consent-based) → Community Spotlight on Home once
   an editor publishes it.

## 7. Technical architecture and data flows

- Next.js 16 app router; dashboard pages are client components wrapped in `DashboardPage` (auth, profile, layout,
  bookmarks). Public pages (opportunities, stories, events) stay server-rendered.
- Data: Supabase with RLS and security-definer RPCs; the dashboard uses the member's session only (no service role).
- New shared modules: `lib/me/{records,notifications,badges}.ts`, `lib/events/catalog.ts`, `lib/content/stories-feed.ts`,
  `components/dashboard/{useMyRecords,useHeaderCounts}.ts`, the ported `sidebar/NavLinks.tsx`, `components/dashboard/me/*`,
  `components/dashboard/discover/*`.
- Flow: browser → Supabase (RLS) → `loadMyRecords` → Home / Events / Passport / Notifications / header badges.
  Elco → signed `PUT /api/integrations/elco/summary` → `elco_learning_summaries` → same loader.

## 8. Phases (what was built)

| Phase | Item | State |
|---|---|---|
| 1 | Navigation, Home, Discover, Events (+ My upcoming, Circle in Events, Talks), Elco-Pass, Elco CTAs, Quick Match hidden | Built |
| 2 | People/Connections regrouped, Inbox split view + search, tracker relabel + filter, unified Saved, Notifications Center, event cancel, story/event bookmarks | Built (cancel and new bookmark types need the migration) |
| 3 | Community Spotlight, badges + Milestone Hall, global search, Beyond the Circle entry points, recommendations | Built; monthly recognition, leaderboard and replays not built |

## 9. Gamification

See §4. Extending: add an entry to `BADGES` with a `measure(records)` function; the Milestone Hall, Passport and Home
pick it up. Tests: `tests/me-records.test.mjs`.

## 10. Quick Match

Removed from navigation, the copilot and the primary journey; **nothing deleted**: route `/dashboard/connect/quick-match`,
`QuickMatchView`, `useCall`, `/api/connect/ice`, the RPCs and `connect_settings.quick_match_enabled` (still `false`)
remain. `NEXT_PUBLIC_QUICK_MATCH_IN_NAV=true` adds it back to Social's tabs as a beta and to the copilot answers.
Conditions to bring it back:
1. A TURN relay (`CONNECT_TURN_URLS` / `CONNECT_TURN_SECRET`) and an approved budget.
2. Enough concurrent members: target a median wait under ~60 s at the hours it's offered (measure queue time first);
   otherwise offer scheduled windows instead of always-on.
3. A fallback when nobody is waiting (suggest a Circle session or community event instead of an endless spinner).
4. Moderation: report review owner and response time, an admin screen for reports, suspension.
5. Block and report verified in a real two-device call, including mobile Safari.
6. Retention signal: share of calls that end in a mutual connection, repeat use after 7 days.

## 11. Other cross-cutting features

Saved, Notifications, search: §3. Personalisation uses only real data (goals, interests, registrations, tracker). Every
major page has an actionable empty state; loading uses skeletons/spinners; errors offer retry.

Onboarding is the existing 3-step flow (destination, direction, interests, optional English level); origin country is
asked on Home. A dedicated "English objective" question was not added (the interests already include Interview English,
Academic English, Workplace communication).

## 12. Images

- Existing IELSco assets first: event posters (`data/events.ts`), program covers (`data/dashboard/programs.ts`:
  IELS Course, IELS Circle, GIF Batch 2, StepUp × Skilio), story banners from the CMS.
- Category covers (`lib/covers.ts`): 15 Unsplash-licensed photos in `public/images/dashboard/stock/` (credits in its
  `CREDITS.md`), downloaded with the owner's approval on 2026-11-05: opportunity categories and jobs abroad,
  Learning Materials types, community sessions, and the two programs without an IELSco image (Global
  Pathways). A listing's own image always wins.

## 13. Design system

The shell is Elco's (§2). Pages keep IELSco's existing dashboard components and tokens unchanged: palette (navy
`#2F4157`, teal `#577E90`, coral `#E56668`, `ACCENTS`), Poppins headings / Plus Jakarta Sans body, `cardGloss` cards,
pill buttons, focus rings, `PageHeader`, `EmptyState`, `LoadingState`, `Notice`, `BottomSheet`, the Elco robot (the owl
stays retired). No global CSS, fonts or tokens were changed. New pages reuse those components; the original Home hero
(`HomeHero`) is kept, with the new sections below it.

## 14. Migrations, env vars, integrations

Migration `supabase/migrations/20261104000000_platform_saved_and_cancel.sql` (additive, idempotent; rollback
`supabase/manual/ROLLBACK-20261104-platform.sql`):
1. `member_bookmarks.item_type` may also be `story` and `event` (replaces the old column check).
2. `event_registrations`: members may delete their own row when `attended = false` (cancel). The "before the event"
   rule is enforced in the app because event dates live in `src/data/events.ts`.

Without it: story/event bookmarks show "isn't switched on yet", cancel shows "contact the IELS team". Everything else
works on the current schema.

Env vars (all optional, existing unless marked):
- `NEXT_PUBLIC_ELCO_ENABLED=true` — shows every Elco entry point (sidebar Elco card, Continue learning, contextual CTAs).
- `NEXT_PUBLIC_ELCO_URL` — Elco app host for the "Continue" links (default `https://www.elcoai.com`).
- `NEXT_PUBLIC_QUICK_MATCH_IN_NAV=true` (**new**) — Quick Match back in Social's tabs as a beta.
- Elco sync needs the existing `ELCO_TO_IELSCO_SECRET`, `IELSCO_TO_ELCO_SECRET`, `ELCO_API_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 15. Limitations and roadmap

- Not stored, so not shareable: badges and journey are private and computed; a public Elco-Pass view needs a consent
  flag and a security-definer RPC.
- Certificates: no issuing system; the Passport shows an empty state.
- Talks replays and clips: no data; the archive is an empty state.
- Partner/external events: no data source; Other Events shows member-hosted rooms only.
- Notifications are in-app only; email/push reminders need a job runner and a preferences table.
- Opportunity categories: the schema has no "leadership" or "job" category for academic listings; Leadership maps to
  volunteering, jobs come from the professional board.
- Member sessions have no detail page; they link to Membership.
- Inbox has no read receipts, typing indicators or realtime (polling only).
- Elco → Circle suggestions and Elco achievements on profiles need Elco-side work.
- `HubViews.DiscoverHome` and `HubViews.ConnectHub` are no longer routed (kept for now; safe to delete after review).

## 16. Final revision (2026-11-05)

- **Membership** comes only from Elco AI subscriptions: Starter = Elco AI Starter + IELS Circle Speaking Club (12/month);
  Pro = Elco AI Pro + Speaking Club (no monthly cap) + 4 mentoring sessions a month. Benefits reach IELSco through the
  existing signed sync and account link (`my_elco_benefits`); no IELSco checkout is offered (`/membership`,
  `/dashboard/membership`, `data/membership.ts`). Payment infrastructure unchanged.
- **Learning**: Elco AI is the primary platform (courses, practice, TOEFL ITP / IELTS / TOEIC prep; SAT coming soon).
  IELSco adds private human tutoring at Rp90,000 per session, requested per session via WhatsApp
  (`components/tutoring/links.ts`). IELS Test × Tofly removed; `/test/*` stays as hidden noindex routes, unlinked.
- **Elco Help** (formerly Elco Copilot): same size, position and breathing motion as Elco's Coach, using the cap-wearing
  Elco mascot (`public/images/contents/mascot/kit`). Deterministic answers in `lib/copilot.ts`.
- **Elco-Pass** (formerly EL-Passport): passport book with cover, identity, stamps and journey pages
  (`components/dashboard/me/passport/*`); stamps come only from real records.
- **Landing**: English-community positioning, animated Elco (`components/brand/ElcoCharacter.tsx`, a port of Elco's rig:
  idle, blink, wave; still under reduced motion), no top-level Stories item (IELSco Stories linked from the footer).
- **Member Stories**: author photo/initials, name and role above the title everywhere (`components/stories/StoryAuthorLine.tsx`).
- **GIF public page** (`/events/gif`) follows the Summer 2027 guidebook; the delegates dashboard is unchanged.
- **Product tour** v5: Home, Social, Discover, Events, Elco-Pass, Membership, Elco Help, Elco AI.
