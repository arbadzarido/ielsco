# Company OS: HQ and the business streams

Migration `supabase/migrations/20261213000000_company_os_business_streams.sql`, rollback
`supabase/manual/ROLLBACK-20261213000000-company-os-business-streams.sql`, tests `tests/db/company-os-streams.pglite.mjs`
and `tests/company-os-streams.test.mjs`.

## The model

| Stream | Code | Kind | What belongs here |
|---|---|---|---|
| HQ | `HQ` | Central management | Governance, administration, finance, legal, people, shared resources, company-wide operations. Also lists records that have no stream yet ("Not assigned"). |
| IELSco | `IEL` | Business | English education, events, community and related business. |
| Elco AI | `ELC` | Business | AI products, technology, automation and related business. |
| GIF (Global Impact Fellowship) | `GIF` | Business | GIF Summer, GIF Winter, international delegations, partnerships, sponsorships and related programmes. A first-class stream, not a project under IELSco. |

Three separate ideas, which the OS no longer mixes up:

1. **Business stream** (`streams text[]`): what a record is about. A record can carry one, several, or none yet.
   Streams are labels for planning and reporting. **They never decide who can see or edit anything.**
2. **Division** (`division_id`, `os_person_divisions`): who is responsible. Division roles, confidential access,
   approvals and grants work exactly as before.
3. **Legal entity** (`company_code`): whose books, letterhead, numbering, Drive folders and employment contract a
   record uses. Still required on finance, legal, number and document records. Optional (and existing values kept) on
   operational records.

People are not assigned to streams. Every active staff member works across all streams. `os_person_companies` stays as
the record of which entity employs or contracts a person, used by HR, reviews and the People Lead grant.

## What the migration does

- Adds `os_streams` (the four streams), and a `streams text[] not null default '{}'` column with a validity check on
  projects, tasks, events, meetings, decisions, announcements, partnerships, campaigns, content, product items, KPIs,
  objectives, timeline items, requests, budgets, transactions, letters, agreements, documents and activity.
- Drops `NOT NULL` on `company_code` for operational tables only. No value is rewritten.
- `os_in_company()` now answers "is this person staff", so company membership no longer limits operational reads,
  writes, assignment or invitations. Sensitivity, division and grant checks are untouched.
- Removes same-company rules on links (a GIF task can link to an IELSco event; an Elco project can carry a budget booked
  in another entity's ledger).
- A trigger (`os_streams_before_write`) fills an empty `streams` on insert from the parent record (subtask → task →
  project; event/content → campaign, partnership, project or task; finance/legal → project), else from the legacy
  business unit. Streams you set are never overwritten.
- `os_set_streams(type, id, streams)` changes streams on finance and legal records for anyone who may edit them.
- `os_stream_summary()` gives HQ per-stream counts, counted as the caller (RLS applies).
- Every function change goes through `os_patch_function()`, which refuses to run unless the text it replaces is there
  exactly once. The migration is re-runnable.

### Backfill, and nothing invented

`os_streams_backfill()` gives every existing record the stream its data supports and records how in
`os_stream_assignments` (`rule`):

- `gif_programme`: projects registered as a GIF programme (`os_programmes.code` like `GIF%`) and everything under them.
- `project`, `campaign`, `event`, ...: inherited from the parent record.
- `project+company`: the record's own unit differed from its parent's. It carries both and is flagged.
- `company`: no parent, so the old unit's stream (HQ → HQ, IELSco → IEL, Elco → ELC).
- `workstream_name`: Master Timeline items whose workstream names a stream.

Where the data cannot settle it, the record keeps its old unit's stream and goes into `os_stream_reviews`:

- `company_differs_from_parent`
- `text_mentions_other_stream` (for example an IELSco KPI or project whose title says "GIF")
- `workstream_unclear` (HQ timeline workstreams that name no stream)

Founders and managers settle them on **HQ → Stream review** (apply the suggestion, keep, or pick other streams) through
`os_stream_review_resolve()`, which is audited.

### Rollback

Run `supabase/manual/ROLLBACK-20261213000000-company-os-business-streams.sql`. It restores every patched function from
the text saved before patching, first saves every record's streams to `os_streams_rollback_backup`, gives operational records created without a
legal entity one back (single IEL/ELC/HQ stream → that unit; GIF only → IEL, where GIF lived before; several or none →
HQ; listed in `os_streams_rollback_units`), puts `NOT NULL` back, and drops the streams column and tables. The DB test applies the
migration, rolls it back, checks the original functions are back, and applies it again.

## Modules

- **Navigation**: Workspaces are now HQ, IELSco, Elco AI and GIF (`/os/w/hq|ielsco|elco|gif`), open to every staff
  member. Each has overview, projects, tasks, calendar, timeline, documents, partnerships, metrics, decisions,
  meetings and team tabs. Elco adds Product, GIF adds Programmes, and HQ adds Streams and Stream review.
- **Lists** (projects, tasks, calendar, campaigns and content, partnerships, timeline, KPIs, OKRs, documents): a Stream
  filter (`?stream=GIF`; old `?company=` links still work) and a Streams column. Filtering by HQ includes unassigned
  records.
- **Forms and detail pages**: a "Business streams" picker in place of the company select on operational records, and
  a Streams row with Change on detail pages. Finance, legal and documents keep a "Legal entity" field and add streams.
- **Assignment and invitations**: anyone active can be assigned or invited, whatever their division or employer.
- **Elco Assistant**: takes streams from what the person said, else the linked project, campaign, partnership or
  milestone, else the page's stream, else none (listed under HQ). It never asks for a company and never decides a
  stream from who is assigned. The system prompt carries `STREAMS_GUIDE`.
- **Reporting**: the home founders' table and the HQ Streams tab show per-stream counts.

## Tests

```bash
npm test                                                            # includes tests/company-os-streams.test.mjs
node tests/db/company-os-streams.pglite.mjs supabase/migrations     # migration, backfill, reviews, access, rollback
```
