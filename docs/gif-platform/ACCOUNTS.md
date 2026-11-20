# Combined GIF and IELSco accounts

Founder decision (20 Nov 2026): combine GIF and IELSco accounts. Constraint: no destructive migration, no broken
applicant accounts, application records and payment history preserved.

## Design (implemented in this PR)

- GIF keeps its own `gif.accounts` rows. Every application, payment, consent and session stays attached to them.
- New, nullable `gif.accounts.ielsco_user_id` links a GIF account to an IELSco (Supabase Auth) user. Unique when set.
- **Sign in with IELSco**: on /login, applicants can use their IELSco email and password. GIF asks IELSco's Supabase Auth to
  verify them (password grant, server-side), requires a confirmed email, keeps no Supabase tokens, and then:
  1. uses the GIF account already linked to that IELSco user, else
  2. links the GIF account with the same email (first sign-in), else
  3. creates a GIF account linked to that user.
  A GIF account already linked to a *different* IELSco user is refused (contact support) rather than silently merged.
- **Email-code sign-in keeps working** for everyone (existing applicants, team members invited by email, people who joined
  IELSco with Google and have no password).
- **Link from the portal**: Application → Your account → "Link IELSco account" (also when the two emails differ).
- Rate limits: 10 attempts per email and 40 per IP per hour.

## Migration status

- `supabase/migrations/20261126000000_gif_accounts_guardians_tasks.sql` adds columns only (`ielsco_user_id`,
  `ielsco_linked_at`; guardian fields; a nullable consent actor). No existing row is changed. Tested on a copy of the
  production schema: applies cleanly, re-runs safely, existing accounts intact. Rollback script in `supabase/manual/`.
- **Applying it to production happens when this PR is merged** (Supabase GitHub integration). That needs your approval.
- No bulk linking is run. Accounts link one at a time when their owner signs in with IELSco, so nothing irreversible
  happens to existing data.

## Configuration needed

- `GIF_IELSCO_SUPABASE_URL=https://hkubzamchahvdpvojepc.supabase.co` and `GIF_IELSCO_SUPABASE_ANON_KEY` (the public anon
  key already used by ielsco.com). Without them the IELSco tab is hidden and email codes are used.

## Not done (needs a decision)

- **"Continue with Google" via IELSco**: requires adding `https://gif.ielsco.com/auth/callback` to Supabase Auth → URL
  Configuration → Redirect URLs, and a PKCE callback route in the GIF app. Recommended next step after launch.
- **Showing the GIF application inside the IELSco dashboard** (ielsco.com): a read-only card using `ielsco_user_id`.
  Recommended after launch; it touches the main site.
