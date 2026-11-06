# Company OS (internal)

Internal operating system for IELSco (PT English Space Berkah Indonesia) and Elco AI (PT Elco Edukasi Berkah Indonesia).
It lives at `/os` in this app, and at `os.ielsco.com` once that domain is added. Google Drive stays the file store; the OS
holds people, access rules, document metadata and (later) work, and links out to Drive.

This first slice is the foundation only: people, companies, divisions, access grants, folder routes, document numbering
and an audit log, with the Home, Workspaces and Admin screens. Work, Documents, Knowledge and the AI assistant are later
phases (shown as "Soon" in the nav).

## Access rules

All rules are enforced in Postgres (RLS + security-definer helpers in
`supabase/migrations/20261107000000_company_os_foundation.sql`). Hiding a screen in the UI is only a convenience.

| Sensitivity  | Who can see it |
| ------------ | -------------- |
| Internal     | Everyone active in that company (HQ Internal: all active staff) |
| Confidential | The owning division, founders, and people with a live grant |
| Restricted   | Founders, and people with an explicit grant on that record. A division grant never opens Restricted. |

- Roles: founder, manager, member, guest. Status onboarding/active can sign in; inactive/offboarded see nothing.
- Founders manage people, divisions, folder routes and see the audit log.
- A manager can grant access to their own division only, and must set an end date. Grants can't be edited, only revoked.
- `os_link_account` (founders only) links a person to an IELSco login whose email is confirmed.
- Every change to people, memberships, grants, divisions and folder routes is written to `os_audit_log` by trigger.
  The log is append-only.
- Folder routes start as `proposed`. Nothing files documents until a founder approves a route. The OS never creates,
  renames or moves Drive folders.
- `anon` has no access to any `os_*` table. Defaults are revoked and only the needed privileges granted back.

## Tests

```bash
npm test                                                        # includes tests/company-os.test.mjs
npm i --no-save @electric-sql/pglite                            # once
node tests/db/company-os.pglite.mjs supabase/migrations          # access rules, 63 checks
```

## Going live (manual, needs approval)

Nothing here has been applied to Supabase or deployed.

1. Apply the migration to a staging/branch database first and run the PGlite test against the same file.
2. Apply to production in the SQL editor, then bootstrap the first founder once (as the database owner):

   ```sql
   insert into public.os_people (id, user_id, full_name, short_name, org_role, status)
   select 'PPL-0001', u.id, 'Arbadza Rido Adzariyat', 'Arba', 'founder', 'active'
   from auth.users u where u.email = '<founder login email>' and u.email_confirmed_at is not null;
   insert into public.os_person_companies values ('PPL-0001', 'IEL'), ('PPL-0001', 'ELC');
   ```

   Everyone else is added from **Admin → People**.
3. Optional subdomain: add `os.ielsco.com` to the Vercel project and add `https://os.ielsco.com/**` to the Supabase
   Auth redirect URLs. `src/proxy.ts` redirects `os.ielsco.com/x` to `os.ielsco.com/os/x`.
4. A founder reviews and approves the folder routes in **Admin → Drive folder routes**.
