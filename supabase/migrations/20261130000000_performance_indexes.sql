-- Performance indexes for the hot read paths of the public site and the dashboard (loading/errors/search upgrade).
--
-- Only indexes (no data, policy, function or column changes). Every statement is `create index if not exists`, so the
-- migration can run twice and never touches an index that already exists. Each index names the query it serves; the
-- matching filter/sort lives in the code path named in the comment. Existing indexes that already cover a query were left
-- alone (e.g. opportunity_tracker_pkey covers the tracker's `user_id` filter, event_registrations_pkey the `user_id` one).
--
-- Plain (non-CONCURRENTLY) builds: the tables involved hold hundreds of rows, so each build takes milliseconds, and
-- Supabase runs a migration in a transaction where CONCURRENTLY is not allowed.

-- ── Public opportunity board ────────────────────────────────────────────────────────────────────────────────────────
-- listPublishedOpportunities() (src/lib/opportunities.ts), loadOpportunities() (dashboard Discover, Search, Home):
--   select … from opportunities where status = 'published' order by featured desc, title
-- The existing (status, deadline) index cannot serve this sort; this partial index returns the rows already in order.
create index if not exists opportunities_published_featured_title_idx
  on public.opportunities (featured desc, title) where status = 'published';

-- loadProfessional() / listPublishedProfessional() (src/lib/professional/queries.ts):
--   select … from professional_opportunities where publication = 'published' [and featured] order by featured desc, title
create index if not exists professional_opportunities_published_featured_title_idx
  on public.professional_opportunities (featured desc, title) where publication = 'published';

-- Foreign key partner_id: a partner's jobs (admin Professional board, "other roles from this partner") and the cascade
-- check when a partner is deleted.
create index if not exists professional_opportunities_partner_idx on public.professional_opportunities (partner_id);

-- ── Opportunity tracker (a member's saved opportunities) ───────────────────────────────────────────────────────────
-- dashboard/opportunities and useTracker: select … from opportunity_tracker where user_id = $1 order by updated_at desc.
-- (user_id, opportunity_id) from the primary key finds the rows but not in order; this one returns them sorted.
create index if not exists opportunity_tracker_user_updated_idx on public.opportunity_tracker (user_id, updated_at desc);

-- Foreign key opportunity_id: "who saved this" counts, and the cascade check when an admin deletes an opportunity
-- (without it every delete scans the whole tracker). The primary key leads with user_id, so it cannot help.
create index if not exists opportunity_tracker_opportunity_idx on public.opportunity_tracker (opportunity_id);

-- ── Events ─────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Registration counts and attendee lists per event: select … from event_registrations where event_id = $1 [and attended].
-- The primary key leads with user_id, so per-event reads scanned the table.
create index if not exists event_registrations_event_idx on public.event_registrations (event_id);

-- ── Stories (admin lists and a member's own submissions) ───────────────────────────────────────────────────────────
-- StoriesAdmin: select … from member_stories order by updated_at desc (no status filter, so the (status, sort_date)
-- index does not apply).
create index if not exists member_stories_updated_idx on public.member_stories (updated_at desc);

-- StoriesAdmin: select … from member_story_submissions order by created_at desc (the existing (status, created_at) index
-- needs a status filter).
create index if not exists member_story_submissions_created_idx on public.member_story_submissions (created_at desc);

-- Foreign key user_id: "my submissions" and the owner-only row-level-security check (user_id = auth.uid()).
create index if not exists member_story_submissions_user_idx on public.member_story_submissions (user_id);

-- Foreign key story_id / submission_id: jump between a submission and the story made from it (admin editor).
create index if not exists member_story_submissions_story_idx on public.member_story_submissions (story_id) where story_id is not null;
create index if not exists member_stories_submission_idx on public.member_stories (submission_id) where submission_id is not null;

-- ── Careers and opportunity interest (admin tables) ─────────────────────────────────────────────────────────────────
-- CareerApplicationsAdmin: select … from career_applications where cohort = $1 [and status = $2] order by created_at desc.
-- The existing (cohort, created_at) index serves the unfiltered list; this one serves each status tab and its count.
create index if not exists career_applications_cohort_status_created_idx on public.career_applications (cohort, status, created_at desc);

-- Foreign key user_id: "my application" (owner-only RLS, user_id = auth.uid(), not limited to a cohort).
create index if not exists career_applications_user_idx on public.career_applications (user_id) where user_id is not null;

-- OpportunityInterestsAdmin: select … from opportunity_interests [where status = $1] order by created_at desc.
create index if not exists opportunity_interests_status_created_idx on public.opportunity_interests (status, created_at desc);

-- Foreign keys partner_id and user_id: per-partner interest lists, and a member's own interests (RLS).
create index if not exists opportunity_interests_partner_idx on public.opportunity_interests (partner_id) where partner_id is not null;
create index if not exists opportunity_interests_user_idx on public.opportunity_interests (user_id) where user_id is not null;

-- ── Member sessions ────────────────────────────────────────────────────────────────────────────────────────────────
-- Foreign key user_id: "the sessions I registered for" and the owner-only RLS check.
create index if not exists member_session_registrations_user_idx on public.member_session_registrations (user_id);

-- ── Production-only tables (created outside these migrations) ─────────────────────────────────────────────────────
-- course_enrollments and course_sessions exist in the live database but not in this repository's migrations, so a fresh
-- database (CI, local stand-in) does not have them. Each index is created only when the table and columns exist.
do $$
begin
  if to_regclass('public.course_enrollments') is not null then
    -- Dashboard courses: select … from course_enrollments where user_id = $1 order by created_at desc.
    execute 'create index if not exists course_enrollments_user_created_idx on public.course_enrollments (user_id, created_at desc)';
  end if;
  if to_regclass('public.course_sessions') is not null then
    -- Course page: select … from course_sessions where enrollment_id = $1 order by session_number.
    execute 'create index if not exists course_sessions_enrollment_number_idx on public.course_sessions (enrollment_id, session_number)';
  end if;
exception when undefined_column or undefined_table then
  raise notice 'performance indexes: course tables differ from what the code expects, skipped';
end $$;
