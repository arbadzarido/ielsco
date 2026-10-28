# IELSco Connect

Member-to-member features inside the existing dashboard: **Passport, Discover People, Letter Intros, connections, direct
messages, community Rooms (with official events alongside), Quick Match (voice/video) and Safety**. Branch
`feat/ielsco-connect`. Nothing here is deployed or applied to production.

## 1. Where things live

| Area | Route | Code | Database (security-definer RPCs) |
|---|---|---|---|
| Connect home | `/dashboard/connect` | `components/connect/ConnectHome.tsx` | `connect_summary()` |
| Passport | `/dashboard/connect/passport` | `PassportForm.tsx` | `my_passport()`, `save_passport(jsonb)` |
| Discover | `/dashboard/connect/discover`, `/people/[id]` | `DiscoverView.tsx`, `PersonView.tsx` | `list_connect_people(...)`, `connect_person()` |
| Letter Intros | `/dashboard/connect/requests` | `RequestsView.tsx` | `send_connect_request`, `respond_connect_request`, `cancel_connect_request`, `list_connect_requests` |
| Connections, Messages | `/connections`, `/messages`, `/messages/[id]` | `ConnectionsView.tsx`, `ThreadView.tsx` | `list_connect_connections`, `send_connect_message`, `list_connect_messages`, `mark_connect_read` |
| Rooms & events | `/rooms`, `/rooms/new`, `/rooms/[id]`, `/rooms/[id]/edit` | `RoomsView.tsx`, `RoomForm.tsx`, `RoomDetail.tsx` | `save_connect_room`, `set_connect_room_status`, `list_connect_rooms`, `get_connect_room`, `register_connect_room`, `cancel_connect_room_registration`, `connect_room_meeting`, `connect_room_participants` |
| Quick Match | `/dashboard/connect/quick-match` | `QuickMatchView.tsx`, `useCall.ts`, `api/connect/ice` | `quick_match_poll/join/leave/call/signal/signals/end/feedback` |
| Safety | `/dashboard/connect/safety` + "…" menus | `shared.tsx` (`SafetyMenu`), `SafetyView.tsx` | `block_member`, `unblock_member`, `list_my_blocks`, `report_member` |

Migrations: `supabase/migrations/20261028000000_connect_core.sql`, `…010000_connect_rooms.sql`, `…020000_connect_quick_match.sql`.
Emergency rollback: `supabase/manual/ROLLBACK-20261028-connect.sql` (run it **before** the membership rollback if both are ever needed).
Tests: `tests/db/connect.pglite.mjs` (105 rule checks), `tests/db/connect-rollback.pglite.mjs`, `tests/connect-*.test.mjs` (in `npm test`).

## 2. Access rules (enforced in SQL, not the UI)

- Additive only. Passport = new columns on the existing `member_profiles`; new tables are RLS-locked and reached only through
  the RPCs above, each of which reads `auth.uid()` itself. No service-role key is used anywhere in Connect.
- **Connect-ready** (`connect_ready()`): display name + Connect guidelines accepted + self-confirmed 18+. Needed to send intros,
  host or register for rooms, or use Quick Match. **Discoverable** is a separate opt-in (`connect_discoverable`, default off).
- Discovery shows privacy-masked cards: languages, self-reported English level, interests, goals, availability; origin,
  residence, role and bio follow the member's existing profile privacy choices; **city and time zone only to mutual
  connections**; email, phone and social links never.
- Intros: one pending per pair; 10 per 24 h and 20 pending max; 30-day cooldown after a decline; after two declines the pair
  is closed. A connection exists only after acceptance (or mutual "yes" after Quick Match). Connections are unique per pair.
- Messages: mutual connections only; 2,000 characters; 20 per minute. Polling every 5 s while the tab is visible (no realtime
  service). History stays readable after a block; sending stops.
- Blocks (either direction) hide people from each other in Discover, profiles, rooms and Quick Match, cancel pending intros and
  end live calls. Errors say "not available" rather than revealing a block. Reports are visible to staff (`is_site_admin()`) only.
- Rooms: hosts must be Connect-ready; 5 new rooms per 24 h, 10 upcoming. Registration locks the room row (`for update`), so
  capacity can't be exceeded concurrently. Meeting links/instructions only for the host and registered members of a
  published room. States: draft, published, cancelled (final); live/completed/full/closed are derived from time and counts.
- Room meeting delivery is external (IELS Discord or another https link). `ielsco_hosted` is reserved in the schema and refused.
- Official events are **not** changed: Connect only lists upcoming `src/data/events.ts` items and links to their own pages and
  `/dashboard/events` (`event_registrations`). Room rules never apply to them.

## 3. Rolling out

1. Review the three migrations, then dry-run and `supabase db push` the usual way (see the membership release notes). The
   Supabase GitHub integration also applies them when the PR merges to `main`, so merging = applying.
2. The app works before the migrations exist: Connect pages show "not switched on yet" and existing pages are unaffected
   (the existing profile form never sends Passport columns).
3. Quick Match stays off until staff run, after §5 is done:
   `update public.connect_settings set value = 'true' where key = 'quick_match_enabled';`
4. Reports: `select * from public.connect_reports where status = 'open' order by created_at;` (staff). There is no admin
   screen yet.

## 4. Analytics

Custom events (only when `NEXT_PUBLIC_ANALYTICS_ENABLED=true`): `connect_passport_saved`, `connect_intro_sent`,
`connect_intro_answered`, `connect_message_sent`, `connect_room_saved`, `connect_room_registered`,
`connect_quick_match_matched`, `connect_call_feedback`, `connect_report_sent`. Properties are booleans/kinds only — never message
text, names or ids. Rates (acceptance, mutual connections, completed calls, time to match) are best computed from the tables.

## 5. Quick Match infrastructure and cost

- Media is peer-to-peer WebRTC; Supabase only matches and relays the handshake (a handful of small rows per call). Nothing is
  recorded. The 8-minute limit is set by the server at match time; after it, signalling is refused and both apps hang up.
- **What is missing for production: a TURN relay.** Without one, calls fail for members behind strict NAT/firewalls (common on
  mobile data and campus/office Wi-Fi; typically 10–20 % of pairs). The app already supports one: set `CONNECT_TURN_URLS` and
  `CONNECT_TURN_SECRET` (coturn-style shared secret) server-side; `/api/connect/ice` then hands out credentials that expire
  after 10 minutes, only to members with a live call. Without them it uses Google's public STUN server.
- Cost drivers: relayed minutes × bitrate. Voice ≈ 0.25–0.5 MB/min per direction, video ≈ 4–10 MB/min. Only relayed calls cost
  relay bandwidth. Options: self-host coturn on a small VM (fixed monthly cost + egress), or a managed TURN service (per-GB).
  **No provider has been chosen or paid for — this needs the owner's approval.**
- Not verified yet: real audio/video between two devices (the test browser blocks microphone access), mobile Safari, and
  behaviour on networks that need TURN.

## 6. Decisions for the owner

1. **Minimum age 18** for Connect (self-confirmed checkbox, stored as `adult_confirmed_at`). IELSco's audience includes high
  school students, and Connect lets strangers message and call each other. Changing the rule = edit `connect_ready()`.
2. TURN provider and budget (§5) before switching Quick Match on.
3. Who reviews reports and how quickly; whether to add an admin screen and member suspension.
4. Whether anyone (not just Connect-ready members) may host rooms, and whether members-only rooms should require an active
   membership (`is_active_member()`).
5. Discord: rooms use the existing public invite (`LINKS.circleDiscord`). OAuth linking, bot announcements, role sync and event
   sync are not built; the room data (`delivery`, `meeting_url`) is ready for them.
