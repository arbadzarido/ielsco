# gif.ielsco.com production recovery, 21 Nov 2026

## What was observed (checked from outside on 21 Nov, 07:30 WIB)

- `GET https://gif.ielsco.com/api/health` → **503** `{"ok":false,"db":false,"cohort":null,"payments":{"ready":true,"env":"production"},"email":true,"storage":"supabase","cron":true}`.
  Every subsystem is configured **except the database**. The app cannot run even `select id from gif.cohorts`.
- Signed-out `GET /`, `/login`, `/login?next=/apply`, `/apply` → 200 (those pages do not touch the database).
- Every sign-in action (email code, verify code, IELSco password) queries `gif.rate_limits` / `gif.login_codes` /
  `gif.accounts` first. With the database unreachable the Server Action threw, and Next.js replaced the page with
  "Application error: a server-side exception has occurred" (digest 1059188999) while the URL stayed `/login?next=/apply`.
  A visitor with a session cookie got the same error on `/apply` (`getAccount()` queries `gif.sessions`).
- The Elco grant API is **not** involved: it is only called from admin actions, payment side effects (errors caught) and
  the daily cron, and it is a no-op when `ELCO_GRANT_URL` / `IELSCO_TO_ELCO_SECRET` are unset.

## Code changes (branch fix/gif-prod-recovery)

1. `src/lib/db-errors.ts`: `dbErrorKind()` gives a secret-free label for a database failure; `logDbError()` writes
   `[gif:db] <where>: kind=… code=…` to the function log (connection strings are redacted).
2. `/api/health` now returns `db_error` (one of the labels below) when `db` is false, and logs the failure.
3. The sign-in actions catch database failures and show "Sign-in is temporarily unavailable…" instead of crashing.
4. `(site)/error.tsx` and `(app)/error.tsx`: a branded "temporarily unavailable" page with the digest as a reference.
5. `globals.css` restored from 25226e6. On `main`, the #56 merge (9080dca) cut the stylesheet to 9 KB (no tokens, no
   base styles). Production currently serves the repaired CSS from `fix/payment-recovery`, so **any deploy of `main`
   without this file would ship an unstyled site**.

## Read the real database error

After this branch is deployed, open `https://gif.ielsco.com/api/health` and read `db_error`. Or in Vercel → project
`gif` → Logs, filter on `[gif:db]`.

| `db_error` | Meaning | Fix |
|---|---|---|
| `env_missing` | `GIF_DATABASE_URL` is not set for **Production** (only Preview, or a typo in the name) | Add it to Production, then **Redeploy** (env changes apply only to new deployments) |
| `auth_failed` | Wrong database password, or the `[YOUR-PASSWORD]` placeholder was left in | Supabase → Database → reset password if unknown, paste the real one |
| `tenant_or_user` | Pooler user is `postgres` instead of `postgres.hkubzamchahvdpvojepc` | Use the pooler string exactly as Supabase shows it |
| `dns` / `network` | Direct host `db.hkubzamchahvdpvojepc.supabase.co` (IPv6-only; Vercel cannot reach it) or a typo in the host | Use the **Transaction pooler** host `aws-1-ap-northeast-2.pooler.supabase.com`, port **6543** |
| `url_invalid` | The password contains `@ # / ? %` etc. without URL encoding | URL-encode the password, or reset it to letters and digits |
| `timeout` | Pooler unreachable or overloaded | Check Supabase status; keep `GIF_DATABASE_POOL_MAX` at 5 |
| `tls` | `GIF_DATABASE_CA_CERT` set but wrong | Remove `GIF_DATABASE_CA_CERT` (TLS stays on) or paste Supabase's CA |
| `schema_missing` | Connected, but `gif.cohorts` is missing in **that** database | You are connected to a different project; check the project ref in the URL |
| `permission` | Connected as a role without grants on schema `gif` | Use the `postgres.<ref>` pooler user |

Expected value: `postgresql://postgres.hkubzamchahvdpvojepc:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres`
(the same host IELSco's own `DATABASE_URL` uses).

## Read-only database audit (paste into Supabase → SQL Editor)

Only `select`s; changes nothing.

```sql
select 'schema gif' as check, exists(select 1 from pg_namespace where nspname='gif')::text as result
union all select 'current cohort', coalesce((select id from gif.cohorts where is_current), 'NONE')
union all select 'tables in gif', (select count(*)::text from pg_tables where schemaname='gif')
union all select 'rls off tables', coalesce((select string_agg(tablename, ',') from pg_tables where schemaname='gif' and not rowsecurity), 'none')
union all select 'bucket gif-applications', exists(select 1 from storage.buckets where id='gif-applications')::text
union all select '20261127 applied (snap_token col)', exists(select 1 from information_schema.columns where table_schema='gif' and table_name='payments' and column_name='snap_token')::text
union all select '20261127 applied (elco_grant_attempts)', exists(select 1 from pg_tables where schemaname='gif' and tablename='elco_grant_attempts')::text
union all select '20261126 applied (ielsco_user_id col)', exists(select 1 from information_schema.columns where table_schema='gif' and table_name='accounts' and column_name='ielsco_user_id')::text
union all select 'accounts / applications / payments', (select count(*) from gif.accounts)||' / '||(select count(*) from gif.applications)||' / '||(select count(*) from gif.payments);

select version, name from supabase_migrations.schema_migrations where version >= '20261122' order by version;
```

All of `20261123000000`, `20261126000000` and `20261127000000` should be listed and their checks above `true`.
If `20261127` columns are missing, **do not** run `supabase db push`; paste only
`supabase/migrations/20261127000000_gif_payment_attempts_elco_grants.sql` (every statement is `if not exists` /
additive) and then record it:
`insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261127000000', 'gif_payment_attempts_elco_grants', '{}') on conflict do nothing;`

### About `ERROR: 42P07: relation "cohorts" already exists`

That error comes from re-running `20261123000000_gif_programme_platform.sql`. It proves `gif.cohorts` already exists.
The SQL Editor runs the script as one transaction, so the failed run changed nothing. Do not run that file again.
