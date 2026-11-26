# Company OS as the operating system (26 Nov 2026)

What this release adds to `os.ielsco.com`, where its data comes from, and what still needs a founder decision.
Migration: `supabase/migrations/20261214000000_company_os_operating_system.sql` (additive, re-runnable; nothing deleted).

## 1. Structure

| Department | Divisions (manager) | Lead |
| --- | --- | --- |
| Operations | Operations (Ren), Business (Shafira), People (Yasmine) | Farrel (COO) |
| Growth | Growth (Didi), Marketing (Acha), Creative (Mojo) | Arba (CEO) |

- `os_divisions` gains `department`, `active`, `purpose`. DIV-06 is renamed **Business** (same id and code `PAR`, so every
  rule and record keeps working). **Marketing** is new: `DIV-10`, code `MKT`, owner PPL-0008 (Acha, manager).
- Community (DIV-01) and Courses & Learning (DIV-07) are **inactive**, not deleted: `os_my_workspaces()` no longer lists
  them; their timeline rows keep their labels. Neither had a task. Acha's old Growth membership is left for a founder to
  remove once the handover is agreed.
- Routes from the retired divisions (`marketing_collaboration`, `student_engagement`) are switched off. New routes:
  `content_brief` (Marketing → Creative), `distribution_plan` (Marketing → Growth), `creative_operations`,
  `creative_business`. Requests already link a project through `related_type/related_id`.
- Static names and order: `src/lib/os/org.ts`. Database membership stays the source of truth.

## 2. Screens

| Screen | What it does |
| --- | --- |
| `/os/departments`, `/os/departments/[operations\|growth]` | Org overview; per department: divisions with manager and live task counts, project matrix (Lead/Support per division), active work (task table), guides and SOPs, meetings and decisions, KPIs |
| `/os/d/<code>?tab=workflow` | Division working surface. **Growth**: content to distribute (next 30 days), distribution requests, KOL & UGC creator tracker, growth experiments. **Marketing**: send a structured content brief to Creative, review deliveries, briefs sent, calendar, campaigns. **Creative**: production queue with status, PIC, project, deadline, priority and revision rounds. **Business**: partners by category or by project, follow-ups due. **People**: recruitment pipeline by stage, onboarding, records, reviews, announcements, delegate and community follow-ups. **Operations**: the four project dashboards, overdue across projects |
| `/os/d/<code>?tab=guide` | Division guide with the manager's job description, decision rights, KPIs, deliverables, rhythm, workflows, team roles, tools, templates |
| `/os/portfolio`, `/os/portfolio/[circle\|gif\|elco\|course]` | Project dashboards: status, owner, open/overdue/blocked/due-14-days, live numbers, objectives, deadlines, priorities, KPIs, workstreams, budget note, TBC list; tabs for tasks (table), timeline (live TL status), team and division responsibilities, risks and dependencies, documents |
| `/os/tasks` | Spreadsheet-style task table: one row per task; inline Status (coloured), PIC, Department, Division, Project, Deadline, Priority; filters (project, department, division, month, status, PIC, search) and grouping (project, department, division, month, status, PIC); views All, My tasks, By project, By department, By month, Overdue, Upcoming deadlines, Needs cleanup. Quick-add row. The old Board stays as a secondary view |
| `/os/handbook`, `/os/handbook/[slug]` | Department guides, division guides (with job descriptions), SOPs, guides, project responsibility guides and the HQ Leaders Meeting #1 pack |
| `/os/api/files/[key]` | The meeting deck and four project learning decks, staff only, OS host only, fixed file list |
| `/os/partnerships` | Category and project fields, filters, "By category" view. Communication history is the record's comments |

## 3. Data sources (no guessed tables)

| Project | Live source | Function |
| --- | --- | --- |
| GIF | `gif.applications`, `gif.participants`, `gif.payments` (cohort `summer-2027`) | `os_programme_live_stats` (existing) via `os_portfolio_live_stats('gif')`; paid totals for founders and programme approvers only |
| IELS Circle | `event_registrations` (`event_id like 'circle%'`), `circle_session_checkins`, `circles` + `circle_members` | `os_portfolio_live_stats('circle')` |
| IELS Course | `course_memberships`, `course_cohorts`, `course_waitlist`, `course_payment_orders` (production), `tutoring_enrolments` | `os_portfolio_live_stats('course')` |
| Elco AI | `elco_account_links`, `elco_benefit_grants` | `os_portfolio_live_stats('elco')` |

All four return counts only, to staff only. **Missing source:** Elco users, subscriptions and usage live in Elco's own
database (Railway). Smallest step: a signed, aggregate-only endpoint on the Elco API (sign-ups, active, paying by day)
that the OS reads server-side, using the existing IELSco ↔ Elco integration signing.

Static facts (objectives, milestones, division lines, risks, TBC) are in `src/content/os/portfolio.json`, generated from
`scripts/company-os/hq-decks/facts.py`, which also builds the decks. Sources: live OS (26 Nov), site source on main
5db3f4e, the six Division Manager Appointment Agreements, recorded founder decisions.

## 4. Existing data

- Tasks: only the new `department` column is written (from each task's division) with row triggers paused for that one
  statement, so `updated_at`, notifications and activity are untouched. 174 tasks before and after.
- Partnerships: `partner_category` set only where unambiguous (University/Institution → academic; Student
  organisation/Youth community → community). Coordinators and vendors stay uncategorised.
- Two projects added: **Elco AI** (ELC) and **IELS Course** (IEL), owner Arba until the founders name one, no invented
  dates or targets. PRJ-0032 (IELS Circle) and PRJ-0033 (GIF Summer 2027) get portfolio keys.

### Task cleanup proposal (nothing was changed)

On 26 Nov: 147 open tasks, 21 overdue, 9 in Backlog past their deadline (6 in IELSco Recruitment Batch 4, 2 in 7 Day
English Learning, 1 in GIF), 15 open tasks without a division. Proposal: each PIC works the **Needs cleanup** and
**Overdue** views this week: new deadline, move it on, or **Cancelled** with the reason in the task (cancelled tasks stay
searchable). Founders review the list weekly until it is empty. Projects PRJ-0029 (ends 30 Nov) and PRJ-0031
(Cancelled) can be closed by their owner after that.

## 5. Tests

```bash
node --test tests/company-os-*.test.mjs                                   # 165, incl. company-os-org.test.mjs
node tests/db/company-os-operating-system.pglite.mjs supabase/migrations  # 37: structure, tasks, partners, Growth registers, routes, portfolio, live stats, RLS
```
The earlier PGlite suites (company-os 157, work 128, workspaces 53, requests 98, programmes 70, subdivisions 53,
division-foundation 34) pass unchanged.

## 6. Decisions for the founders

1. Confirm the Lead/Support matrix per project (proposed: Circle → People; GIF → Operations + Business; Elco AI → Growth; IELS Course → Operations).
2. Where former Community and Learning work sits; where role L1 Learning Content Developer goes; confirm the proposed moves of G1, G4 (Marketing), C1 (People), C2 (Growth), L2 (Operations).
3. Marketing ↔ Growth scope in writing (the agreements require it).
4. Owners, PICs and 2027 targets for Elco AI and IELS Course; IELS Course cohort calendar; Circle next cohort.
5. Remove Acha's old Growth membership (Admin) when ready; give recruiters a `recruitment` grant.
6. GIF facts register still shows USD 899; the site uses USD 799 / 999 since 24 Nov: update `/os/gif` facts.
7. Timeline items whose lead division was Community or Courses & Learning (TL-063–TL-080) need a new lead division.
8. Approve the Handbook drafts (status "Draft for HQ Leaders review").
