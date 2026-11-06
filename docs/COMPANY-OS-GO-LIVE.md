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

## Rollback

The app side: remove the os.ielsco.com domain (nothing else links to it). The database side, only if needed:

```sql
drop table if exists public.os_login_events, public.os_revoked_sessions, public.os_audit_log, public.os_grants,
  public.os_doc_counters, public.os_folder_routes, public.os_person_divisions, public.os_person_companies cascade;
alter table if exists public.os_divisions drop constraint if exists os_divisions_owner_fk;
drop table if exists public.os_people, public.os_divisions, public.os_companies cascade;
-- then drop the public.os_* functions (select 'drop function ' || oid::regprocedure || ';' from pg_proc where proname like 'os\_%')
```
