# Company OS: going live on os.ielsco.com

Everything here changes production, so each step is done by a founder (or by Claude with the Supabase and Vercel
connectors and a founder's go-ahead). Order matters: database first, then Auth settings, then the deployment.

## 0. What the deployment needs

| Where | Setting | Value |
| --- | --- | --- |
| Supabase → Authentication → URL Configuration → Redirect URLs | add, exactly | `https://os.ielsco.com/os/auth/callback` |
| same, for local development (optional) | add | `http://os.localhost:3000/os/auth/callback` |
| Supabase → Authentication → URL Configuration → Site URL | leave as is | (the public site) |
| Supabase → Authentication → Sign In / Providers → Google | must be enabled | already used by the public sign-in |
| Supabase → Authentication → Sign In / Providers → Anonymous sign-ins | must be **off** | |
| Supabase → Authentication → Multi-Factor → TOTP (App Authenticator) | must be **enabled** | on by default |
| Vercel env for the deployment serving os.ielsco.com | `SUPABASE_SERVICE_ROLE_KEY` | required: without it every OS sign-in is refused (logins can't be recorded) |
| same | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the IELSco project |
| same (optional) | `RESEND_API_KEY`, `EMAIL_FROM` | new-device emails; without them the event still shows in Admin |

No wildcard redirect URL is needed: the OS only signs in on `os.ielsco.com`. Do not add `https://os.ielsco.com/**`.
Vercel preview URLs (`*.vercel.app`) do not serve the OS at all (it answers only on the OS host), so they need no
redirect URL.

Public sign-up stays on. Supabase Auth is shared with www.ielsco.com, so turning sign-up off would break public
registration. The OS doesn't rely on it: a Google sign-in by an outsider creates at most an `auth.users` row, which
grants nothing, and their session is ended at once.

## 1. Before the migration

1. Confirm the project: Supabase dashboard → the project whose URL matches Vercel's `NEXT_PUBLIC_SUPABASE_URL`.
2. Backup: Database → Backups. On Pro, confirm today's daily backup (or PITR) is listed. On Free there is no restorable
   backup in the dashboard: take one with `pg_dump` (Database → Connect → connection string) before continuing:

   ```bash
   pg_dump "$DIRECT_URL" --schema=public --format=custom --file=ielsco-before-company-os.dump
   ```

3. Check nothing named `os_*` exists yet and that the auth tables the OS reads are visible (SQL editor):

   ```sql
   select tablename from pg_tables where schemaname = 'public' and tablename like 'os\_%';   -- expect 0 rows
   select count(*) from auth.sessions; select count(*) from auth.identities; select count(*) from auth.mfa_factors;
   ```

Both migrations only create `os_*` tables and functions. They change no existing table, policy, function or row.

## 2. Apply

In the SQL editor, run the full contents of, in order:

1. `supabase/migrations/20261107000000_company_os_foundation.sql`
2. `supabase/migrations/20261107010000_company_os_access.sql`

Both are re-runnable.

## 3. Verify

```sql
-- 13 os_* tables, all with RLS on
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename like 'os\_%' order by 1;
-- anon has no table privileges on os_*
select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_name like 'os\_%';   -- 0
-- seeds
select count(*) from public.os_divisions;        -- 7
select count(*) from public.os_folder_routes;    -- 27 (all proposed)
```

Then the public site: open www.ielsco.com, sign in as a member, open the dashboard. Nothing there reads `os_*`.

## 4. First founder

Once, in the SQL editor (as the owner, so RLS doesn't apply). Use the exact Google account you will sign in with:

```sql
insert into public.os_people (id, full_name, short_name, org_role, status, google_account)
values ('PPL-0001', 'Arbadza Rido Adzariyat', 'Arba', 'founder', 'active', '<your work Google email>');
insert into public.os_person_companies values ('PPL-0001', 'HQ'), ('PPL-0001', 'IEL'), ('PPL-0001', 'ELC');
```

No `user_id`: the first Google sign-in links it. Then:

1. Open https://os.ielsco.com and continue with Google using that account. You land on Company OS Home.
2. My account → Set up two-step verification (scan the QR code with an authenticator app). Admin unlocks.
3. Admin → People & accounts → invite the next person.

## 5. Adding an employee

1. Admin → People & accounts → Invite someone: full name, their **work Google account**, role, at least one company,
   optionally a division. They start as "Invited".
2. Tell them to open https://os.ielsco.com and continue with Google with exactly that account. They'll see "This Google
   account doesn't have access" the first time: that's expected, their login is now linked.
3. Back in Admin, press **Approve** on their row (give a reason, e.g. "Started 10 Nov"). They can sign in now.
4. Managers additionally need the Manager role and the Manager box on their division.

## 6. Deployment

- `os.ielsco.com` must point at the deployment built from the branch/commit with this code. After PR #25 is merged,
  assign the domain to **Production** (Vercel → Project → Settings → Domains), not to a branch.
- Check: `https://os.ielsco.com/dashboard` shows the Company OS sign-in (not the member dashboard),
  `https://os.ielsco.com/sign-up` shows the Company OS 404, `https://www.ielsco.com/os` shows the public 404.

## 7. Phase 2: work, documents, KPIs, timeline, people, reviews and AI

Database (after a backup, as in section 1). Both files only create or replace `os_*` objects; the first widens one
check constraint on `os_grants` to allow People Lead grants. They touch no public-site table. Both are re-runnable.

1. `supabase/migrations/20261108000000_company_os_work.sql`
2. `supabase/migrations/20261108010000_company_os_kpi_timeline_data.sql` (68 KPIs, 104 timeline items, ID counters)
3. `supabase/migrations/20261108020000_company_os_drive_connection.sql` (one service-role-only table for the connected
   Google account)

If the Supabase GitHub integration applies migrations on merge, merging the PR runs them; check with
`select version from supabase_migrations.schema_migrations order by 1 desc limit 3;`. Otherwise run them in the SQL
editor in that order. Verify:

```sql
select count(*) from public.os_kpis;              -- 68
select count(*) from public.os_timeline_items;    -- 104
select count(*) from public.os_kpi_values;        -- 0 (the KPI Log was empty)
select prefix, last from public.os_id_counters order by 1;  -- PRJ 27, TSK 80, DOC 94, OD 8, OPP 3, MTG 1, KPI 68, TL 104
select count(*) from pg_tables where schemaname = 'public' and tablename like 'os\_%' and not rowsecurity;  -- 0
```

Vercel env (server only; never `NEXT_PUBLIC_`):

| Setting | Needed for |
| --- | --- |
| `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Documents: list Master Templates, copy, upload, access check. The existing service account. Share **02.1 Master Templates** (view) and each approved route folder (edit) with it. Without it the hub still registers existing Drive links. |
| `GEMINI_API_KEY` | AI agents. Without it they show as unavailable. Spending is capped in the database regardless. |
| `OS_GOOGLE_CLIENT_ID`, `OS_GOOGLE_CLIENT_SECRET` | Creating Drive files (templates, uploads). A Google OAuth "Web application" client whose authorised redirect URI is `https://os.ielsco.com/os/api/admin/drive/callback`. Falls back to `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` if those belong to a client with that redirect URI. |

**Why a founder connects Google Drive.** The folders are in a personal (gmail) My Drive. Google gives service accounts
no storage there, so the service account can read folders and templates but every copy or upload is refused
("Service Accounts do not have storage quota"; tested against production on 7 Nov 2026). New files are therefore
created with a founder's Google account: Admin → Integration health → **Connect Google Drive**, sign in with the
account that owns the Drive folders, allow Drive access. The refresh token is encrypted (AES-256-GCM) and stored in
`os_drive_connection`, readable only by the server. New files are owned by that account. **Disconnect** revokes it.

OAuth consent screen: user type External; set the publishing status to **In production** (in Testing, Google expires
the refresh token after 7 days). The app is unverified, so Google shows a warning on the one-time consent; continue
as the founder. The 7 Restricted folders (Finance, Legal, Personnel) are not shared with the service account, so their
access checks run through the connected founder account.

Then in the OS: approve the Drive folder routes you want used (Admin → Drive folder routes), check Admin → Integration
health, and set the AI budget (Admin → AI usage & budget; at most US$25).

The Operations Master's Projects (27), Tasks (74), Documents (93), Decisions (8), Opportunities (3) and Meetings (1)
are **not** imported. ID counters start after them, so a later import keeps their IDs. The source sheets stay
editable until you decide to make them read-only.

## Rollback

The app side: remove the os.ielsco.com domain (nothing else links to it). The database side, only if needed:

```sql
drop table if exists public.os_login_events, public.os_revoked_sessions, public.os_audit_log, public.os_grants,
  public.os_doc_counters, public.os_folder_routes, public.os_person_divisions, public.os_person_companies cascade;
alter table if exists public.os_divisions drop constraint if exists os_divisions_owner_fk;
drop table if exists public.os_people, public.os_divisions, public.os_companies cascade;
-- then drop the public.os_* functions (select 'drop function ' || oid::regprocedure || ';' from pg_proc where proname like 'os\_%')
```
