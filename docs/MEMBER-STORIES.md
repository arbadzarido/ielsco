# Member Stories CMS

Public: `circle.ielsco.com/stories` (listing), `/stories/<slug>` (story), `/stories/submit` (questionnaire).
Admin: `/dashboard/admin/stories` (shown in the dashboard nav under **Admin → Member Stories** for admins only).

## Data (Supabase)

| Object | Purpose |
|---|---|
| `public.member_stories` | Every story: published, pending, drafts, rejected/archived, and editorial placeholders (`kind = 'placeholder'`). Structured content (sections, quotes, highlights, gallery, SEO, credits, social) is JSONB; `status`, `category`, `author_country`, `story_type` are columns. |
| `public.member_story_submissions` | Questionnaire submissions: original answers, three consents, private image paths, and the AI draft stored separately (`ai_draft`, `ai_status`, `ai_error`). |
| `public.member_story_redirects` | Old slugs → story. Written automatically when a slug changes. |
| `public.published_member_stories`, `public.published_member_story_redirects` | Read-only views for the public site (published `story` rows, public columns only). |
| `public.staff_roles` | Admins (by `auth.users.id`). Only migrations / the service role write it. |
| Storage `member-story-submissions` (private) | Photos sent with submissions. Visitors can upload to a new submission folder, never read. Admins read. |
| Storage `member-stories` (public) | Approved story media. Admins only write. A submitted photo becomes public only when an admin clicks **Approve**. |

Migrations: `20261019000000_member_stories.sql` (schema, RLS, storage, initial admin), `…010000_member_stories_seed.sql`
(the 9 stories that were in `src/data/member-stories.ts`), `…020000_member_story_placeholders.sql` (15 internal placeholders).
All are idempotent and never overwrite rows edited in the CMS.

## Rules enforced by the database

- Nobody but admins can read or change the tables. Submitting goes through `submit_member_story()`, which always stores
  `pending` + a `pending_review` story.
- Publishing requires `kind = 'story'`, `publication_authorized = true` (the editor ticks “Authorization for public use
  confirmed”), an author name, and no `submission://` (private) image references left.
- Placeholders can never be published or change kind.
- Categories: `internals`, `circle` (the former “IELS Circle Members” and “IELS Circle” merged), `inspires`.

## Admins

Add one (SQL editor, as the project owner):

```sql
insert into public.staff_roles (user_id, role, note)
select id, 'admin', 'reason' from auth.users where email = 'person@example.com' and email_confirmed_at is not null
on conflict do nothing;
```

Remove: `delete from public.staff_roles where user_id = '…';`

## AI drafting

`POST /api/admin/member-stories/draft` (admins). Uses `ANTHROPIC_API_KEY` (model `STORIES_AI_MODEL`, default
`claude-sonnet-5-5`) and falls back to `GEMINI_API_KEY` (model `STORIES_GEMINI_MODEL`, default `gemini-2.5-flash`).
Quotes that are not word for word in the answers and highlights with numbers not in the answers are removed and
listed for the editor. If drafting fails the submission is kept, the error is shown, and the editor can retry or write
the story manually.

## Caching

Public pages read through Next's data cache (tag `member-stories`, 5-minute revalidation). Every save in the editor
calls `POST /api/admin/member-stories/revalidate`, so changes show up immediately without a redeploy.

## Static fallback

`src/data/member-stories.ts` is only used when the database can't be reached. Once production has been verified on
the database for a while, it can be deleted together with `staticStories()` in `src/lib/stories/types.ts`.

## Tests

- `npm test` → `tests/member-stories.test.mjs` (HTML sanitizer, quote/number guardrails).
- `tests/db/member-stories.pglite.mjs` → migrations twice (idempotent), anon/member/admin RLS, storage policies,
  publish guards, slug redirects. See the header for how to run it.

- `tests/db/ielsco-stories.pglite.mjs` → IELSco Stories section rules, translations, scheduling, public views.

Corrections or withdrawal requests from members: support@ielsco.com.

## IELSco Stories (official editorial)

The same table, editor and admin also hold IELSco's own articles. There is no second CMS.

Public: `www.ielsco.com/stories` (English) and `/id/stories` (Bahasa Indonesia), `/stories/<slug>` and
`/id/stories/<slug>` for articles. Server-rendered with canonical, hreflang (when a translation exists), Open Graph
`article`, NewsArticle/Article + BreadcrumbList JSON-LD, and sitemap entries. Member Stories stay at
`circle.ielsco.com/stories`; both listings show a **Member Stories | IELSco Stories** switch.

Admin: `/dashboard/admin/stories?section=ielsco` (the **IELSco Stories** tab in the same admin). New article:
`/dashboard/admin/stories/new?section=ielsco`. **Create Indonesian version** opens a new article linked to the English
one, with category, tags, images and attribution copied and the text left for the translator.

Migration `20261102100000_ielsco_stories.sql` adds to `member_stories`:

| Column | Purpose |
|---|---|
| `section` | `member` (default, every existing row) or `ielsco`. Cannot change after creation. |
| `lang` | `en` or `id`. |
| `translation_of` | On an Indonesian IELSco article: the English article it translates. Only `id` → `en` links within IELSco are allowed. |
| `tags` | Up to 12. Used for related articles and admin search. |
| `banner_alt`, `banner_caption` | Featured image alt text (required by the editor when an image is set) and caption. |

Categories by section: member `internals`, `circle`, `inspires`; IELSco `achievements`, `events`, `partnerships`,
`community`, `press`, `insights`. The member views (`published_member_stories`, …) only return `section = 'member'`;
IELSco pages read `published_ielsco_stories` and `published_ielsco_story_redirects`.

Workflow: draft → **Editorial review done** ticked (same `publication_authorized` guard) → Publish. A publication date
in the future schedules the article: it is `published` but hidden from the public views until that time, and the admin
shows it under **Scheduled**. Unpublish returns it to draft; Archive hides it; Delete (unpublished IELSco articles only)
asks for confirmation.

Initial drafts: `content/ielsco-stories/import-ielsco-stories-drafts.sql` (outside this repo, generated by
`build_import.py`) inserts the researched articles as drafts with their open questions under **Needs attention**. It
never publishes and skips slugs that already exist.
