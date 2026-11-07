# Company OS (internal)

Internal operating system for IELSco (PT English Space Berkah Indonesia) and Elco AI (PT Elco Edukasi Berkah Indonesia).
It is served only on `os.ielsco.com` (routes under `/os` in this app; the public hosts return 404 for `/os`). Google Drive stays the file store; the OS
holds people, access rules, document metadata, work, KPIs, OKRs, the Master Timeline, reviews and four AI agents, and
links out to Drive.

## Modules (migration `20261108000000_company_os_work.sql`, data `20261108010000_company_os_kpi_timeline_data.sql`)

| Screen | What it does |
| --- | --- |
| Shell | Sidebar (collapsible, remembered) on desktop; top bar and drawer on phones. Workspace switcher with the real IELSco mark (`/icon-192.png`) and the Elco robot mark (`/images/contents/mascot/elco.svg`; the repo has no Elco wordmark). HQ shows both. |
| Home `/os` | Role dashboard: my work for everyone, my divisions for managers, all three workspaces plus decisions, partner follow-ups, access findings, folder routes and AI spend for founders. Live counts only. |
| Workspaces `/os/w/hq\|ielsco\|elco` | Overview (stats, quick actions, 30-day deadlines across tasks, projects and the timeline, company KPIs, announcements, recent documents, recent activity), divisions, projects, documents, team; HQ adds decisions and meetings, Elco adds product items. |
| Projects, Tasks | Projects with team, tasks, decisions, documents, comments and activity. Tasks with owner, assignees, reviewer, priority, status, due date, one level of subtasks, comments, linked documents, activity and overdue flags. Views: My tasks, Team, List, Board (drag and drop), Upcoming. No Gantt, time tracking or sprints. |
| Documents `/os/documents` | Register with search and filters (company, division, type, status, sensitivity, category, access findings). New document from a Master Template (Drive copy, "copy, never edit"), by upload, or by registering an existing Drive link. Number `CO-TYPE-YEAR-NNN` and the approved folder route are applied by the server; the file is named `{number} — {title}`. Access check reads Drive sharing and reports drift; it never changes Drive. Approval needs the division manager or a founder. |
| KPIs `/os/kpis` | The 68 KPI Dictionary rows with their KPI IDs. Targets only where the sheet had one (6); "No approved target" otherwise. Values logged by the KPI owner or the division manager; trend chart from three periods. The 16 Finance KPIs never store values (Restricted Finance Control). |
| OKRs `/os/okrs` | Company and division objectives (`OBJ-`), aligned under a parent, with key results (`KR-`) optionally measured by a KPI. No progress percentage without a target. |
| Timeline `/os/timeline` | The 104 Master Timeline items with their TL IDs: annual Gantt-style lanes per workstream (WS0–WS9), monthly view, list. Founders and the lead division's manager update status, dates and evidence. |
| People, Reviews | Directory, profiles (title, responsibilities, reporting line, location), memberships, projects, open tasks, KPIs. Employment and reviews are private: the person, their manager(s), founders, and a People Lead with an explicit `people` grant. Only founders change reporting lines. Reviews: cycles, self-assessment, manager assessment, KPI and objective achievement, strengths, development areas and plan, completion, acknowledgement. No scores, ranks or ratings; task counts are labelled as not a measure of performance. |
| Partnerships, Campaigns | Opportunity pipeline (list and stage board; Confidential, Partnerships division by default) and the content calendar. |
| Assistant `/os/assistant` | Company Assistant, Operations, Partnerships and Growth. See below. |
| Admin | People & accounts, divisions, security & sessions, access grants (including People Lead), Drive folder routes, AI usage & budget, integration health, audit log. |

### AI agents

- Every record an agent sees is read with the signed-in person's own session, so RLS decides; the service role is used
  only for the cost ledger and storing messages. Database text is passed as data, with an instruction to ignore any
  instructions inside it.
- Agents only propose changes (create task, change task status, create project, comment, log KPI value, add
  opportunity, depending on the agent). Each proposal is validated, shown as a preview, and runs only when the person
  confirms, again with their own session. Proposals expire after a day. Nothing is ever sent, signed, published or
  approved by an agent. `os_ai_actions` keeps every proposal and decision.
- Cost: `gemini-3.1-flash-lite` for routine questions, `gemini-3-flash-preview` for analysis, long questions or "deeper
  analysis". Each call reserves its worst-case cost first (`os_ai_reserve`, row-locked), then settles the real cost.
  The monthly cap is at most US$25 (database check constraint) with a per-person daily limit (default US$2). When the
  budget is used up the agents say so and nothing else is affected. A failed model call costs nothing.

## Access rules

All rules are enforced in Postgres (RLS + security-definer helpers in
`supabase/migrations/20261107000000_company_os_foundation.sql` and `20261107010000_company_os_access.sql`). Hiding a screen in the UI is only a convenience.

| Sensitivity  | Who can see it |
| ------------ | -------------- |
| Internal     | Everyone active in that company (HQ Internal: all active staff) |
| Confidential | The owning division **in that company**, founders, and people with a live grant |
| Restricted   | Founders, and people with an explicit grant on that record. A division grant never opens Restricted. |

- Roles: founder, manager, member, guest. Status onboarding/active can sign in; every other status sees nothing.
- Edits need the division **and** the company: an Elco Growth member cannot edit or read Confidential IELSco Growth records.
- Founders manage people, divisions, folder routes and see the audit log.
- A manager can grant access to their own division only, with an end date at most 90 days away. Grants can't be edited,
  only revoked. Who granted it and when are set by the database, not the request.
- Staff means a founder, or a non-guest in at least one company. Someone just added sees only their own record.
- Document numbers can be reserved only for a company you work in (HQ for all staff).
- `user_id` is not writable through the API. A login is linked by `os_claim_account()` on the person's first Google
  sign-in (verified email = the approved `google_account`), or by a founder with `os_link_account`; either way access
  still needs the Google identity, approval, a company and a live session.
- Every change to people, memberships, grants, divisions and folder routes is written to `os_audit_log` by trigger.
  The log is append-only.
- Folder routes start as `proposed`. The approver and approval time are recorded by the database. Nothing files documents until a founder approves a route. The OS never creates,
  renames or moves Drive folders.
- `anon` has no access to any `os_*` table. Defaults are revoked and only the needed privileges granted back.

## Sign-in and access (migration `20261107010000_company_os_access.sql`)

Someone can use the Company OS only when **all** of these hold. They are checked by `os_current_person()` in Postgres on
every query, so they apply to the pages, the API and anything that calls Supabase directly:

1. They signed in with **Google** in this session (JWT `amr` has `oauth`), and the Google identity's email is verified.
   Password, magic-link or any other sign-in of the same account does not count.
2. That email is on the **approved registry**: an `os_people` row a founder created with `google_account` = that email.
   No domain rule: an `@ielsco.com` address gets nothing unless it is on the list.
3. The row's status is `onboarding` or `active` (not `invited`, `suspended`, `revoked`, `inactive`, `offboarded`).
4. They belong to at least one company (HQ, IELSco, Elco).
5. The session is alive: it still exists in Supabase Auth (signing out kills copied tokens too), it is not revoked, it
   started after the person's last "end all sessions", and it is at most **12 hours** old.
6. If the account has an authenticator app enrolled, the session passed it (`aal2`).

Founder powers (Admin, everyone's login history, managing people) additionally need **two-step verification** (`aal2`).
A founder without it is treated as staff and sees "Two-step verification needed" in Admin.

How an account gets in:

- A founder invites the person in **Admin → People & accounts** with their work Google email, role, companies and
  division. Status starts as `invited`. Nothing is emailed.
- The person opens `os.ielsco.com` and continues with Google. `/os/auth/callback` runs `os_claim_account()`, which links
  the login to the registry row for that verified Google email (only if the row is unlinked), then `os_access_status()`.
  Every attempt is written to `os_login_events` by `os_record_login()` (service role, server only).
- Refused: the Supabase session is ended at once and the page says, for every reason, "This Google account doesn't have
  access to Company OS". Admins see the real reason in **Security & sessions**.
- The founder approves (status `active`). From then on that Google account gets in.
- Suspend, revoke or deactivate: every session ends immediately (`sessions_revoked_at`). Reactivate: they sign in again.
- Changing someone's Google email unlinks their login. The last active founder cannot be suspended, demoted or deleted.

Sessions and devices:

- Every sign-in attempt (success or not) records user, email, time, IP, browser and version, OS, device type, Supabase
  session id, provider, and approximate location from Vercel's IP headers. No tokens or passwords are stored. The
  "device" is an approximate profile (browser + OS + type), not a hardware ID.
- A sign-in from a device profile not seen before on that account is flagged "New device" in Security & sessions. If
  `RESEND_API_KEY` and `EMAIL_FROM` are set (the existing Resend setup), the owner and active founders are emailed too.
- Founders: filter by employee, company, date and result; see who is signed in now, devices per account, repeated
  refused attempts (3+ in 24 hours by account or IP), end one session or all of a person's sessions, with a reason.
- Everyone: **My account** lists their own sessions and can sign out any other one. Nobody sees anyone else's history.
- Retention: login history 180 days, revocation records 30 days (purged on each sign-in). Revocations and status
  changes are in the audit log.

Host isolation (`src/lib/os/host.ts`, `src/proxy.ts`):

- `os.ielsco.com` serves only `/os/...`. `/`, `/login`, `/dashboard`, `/admin` redirect into `/os`. Every other path goes
  to `/os/<path>`, which is a Company OS page or the Company OS 404. Public pages (member dashboard, sign-in, sign-up)
  and public APIs (`/api/*`, JSON 404) never answer on this host.
- Public hosts return their normal 404 for `/os`.
- Signed-out requests to OS pages redirect to `/os/login`; the server gate in `app/os/(app)/layout.tsx` checks access
  before any page renders and signs out accounts without access.
- Sign-in endpoints are rate-limited to 10 requests a minute per IP (per server instance; Supabase Auth has its own limits).

Limits to know:

- Supabase Auth is shared with the public site, where sign-up stays on. Anyone can complete Google sign-in, so an
  `auth.users` row may be created for them; it grants nothing in the OS and their session is ended at once.
- "Signed in now" means the session exists in Supabase, is not revoked and is under 12 hours old. A closed laptop with a
  live session still counts until it expires.
- Location comes from the IP and can be wrong (VPNs, mobile carriers).

## Tests

```bash
npm test                                                        # includes tests/company-os.test.mjs
npm i --no-save @electric-sql/pglite                            # once
node tests/db/company-os.pglite.mjs supabase/migrations          # access rules
node tests/db/company-os-work.pglite.mjs supabase/migrations     # work, KPI, OKR, timeline, people, reviews, AI: 124 checks
# Browser end-to-end against a real Postgres, desktop and 360 px phones (130 checks): see tests/e2e/company-os/README.md
```

## Going live

The production steps (backup, migration, first founder, Supabase Auth settings, Vercel env) are in
[COMPANY-OS-GO-LIVE.md](COMPANY-OS-GO-LIVE.md).
