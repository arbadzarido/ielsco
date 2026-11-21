# GIF inside IELSco: architecture audit and staged plan (21 Nov 2026)

Founder direction (21 Nov 2026): IELSco is the platform and the account; GIF Summer 2027 is one of its programmes.
One IELSco account, one login, one dashboard. Decisions taken that day: **Partial Funded stays a result of the Fully
Funded selection** (no separate registration), and the workspace is built **inside the IELSco dashboard with single
sign-on into the existing GIF engine** (not a rewrite of the engine).

## 1. What existed before this change

| Area | IELSco (`src/`, www.ielsco.com) | GIF (`apps/gif`, gif.ielsco.com) |
|---|---|---|
| Identity | Supabase Auth (email+password, Google), `@supabase/ssr` cookies on www.ielsco.com | Its own sessions: `gif.accounts` + `gif.sessions`, email one-time code; optional IELSco *password* sign-in that linked `gif.accounts.ielsco_user_id` |
| Dashboard | `/dashboard`, Elco-style AppShell sidebar (`components/dashboard/nav.ts`): Home, Social, Discover, Events | Separate `/portal` (participant) and `/admin` (staff, `gif.staff` roles) with their own layout |
| GIF in IELSco | `/dashboard/gif` = closed GIF Singapore 2026 page; `/dashboard/gif/{delegates,admin,...}` = 2026 delegate portal (public schema, `gif_admins`) | — |
| Data | `public` schema, RLS per user | `gif` schema (not exposed by PostgREST, RLS on with no policies), server-only via `GIF_DATABASE_URL` |
| Payments | Elco/IELSco membership via Midtrans | Obligations + payment attempts (continue / cancel & change, PR #56), receipts, refunds queue |
| Elco | Account link (`elco_account_links`) | Elco Pro grant API, optional; manual Finance activation fallback |

### Problems found
1. **Two login experiences.** GIF asked for an email code or an IELSco password on a different site; users with
   Google sign-in on IELSco could only use the email code.
2. **No GIF entry in the IELSco dashboard** for 2027: the sidebar banner sent people to a public page (`/events/gif`).
3. **Registration timing was global.** `pathwayOpen()` used one launch date (25 Nov) for every pathway, so the
   countdown and server validation closed Self-Funded and Mentoring until 25 Nov.
4. Duplicate identities were possible (GIF email-code account + IELSco account for the same person) but the data
   model already had the non-destructive link (`gif.accounts.ielsco_user_id`, unique).

## 2. Target architecture (built in this change)

```
IELSco dashboard (www.ielsco.com)              GIF engine (gif.ielsco.com, schema gif)
 sidebar: … Events ▸  GIF  ──► /dashboard/gif ──GET /api/gif/workspace──► POST /api/integrations/ielsco/workspace
                                  (IELSco session)   signed server-to-server  (HMAC, 5 min)  → status, progress, payments…
 buttons in the workspace ──► /api/gif/sso?next=/portal/… ──303──► gif.ielsco.com/sso?t=… (2 min, single use)
                                                                    → GIF session for the same person, no login
```

- **Identity:** the IELSco Supabase user id is canonical. `/sso` finds the GIF account by `ielsco_user_id`, else links
  the unlinked account with the same confirmed email (applications and payments stay on it), else creates one. An email
  already linked to a different IELSco user is refused (`sso=conflict`). No account is deleted or merged automatically.
- **Workspace:** `/dashboard/gif` renders inside the IELSco layout and sidebar. It shows programme header, next step,
  pathway-specific progress (from GIF's own `progressSteps`/`requiredActions`, so both sites always agree), pathway
  availability, payments and history, documents and submissions, deadlines, Elco Pro status and announcements.
  A "Programme management" card appears only for `gif.staff` members (RBAC), never for participants.
- **Forms stay in the GIF engine** (application wizard, Midtrans checkout with payment recovery, private uploads,
  Phase 2/3 submissions, admin). They open already signed in.
- **Elco grant API** is not on any of these paths; missing config never blocks login, dashboard or the workspace.
- **GIF login page:** "Continue with your IELSco account" is the main option; the email code stays as a fallback for
  people who applied with it (nobody loses access). The IELSco password form is hidden once SSO is configured.

## 3. Configuration

| Project | Variable | Value |
|---|---|---|
| Vercel `ielsco` (production) | `IELSCO_GIF_SSO_SECRET` | 48+ random characters (`openssl rand -base64 48`), **same value** on both projects |
| Vercel `ielsco` | `GIF_APP_URL` | `https://gif.ielsco.com` (default) |
| Vercel `gif` (production) | `IELSCO_GIF_SSO_SECRET` | the same secret |
| Vercel `gif` | `IELSCO_APP_URL` | `https://www.ielsco.com` (default) |

Rotation: set `new,old` on GIF first, then `new` on IELSco, then remove `old`. Until the secret is set, the workspace
shows a "being connected" notice with a link to gif.ielsco.com, and GIF keeps its current login (safe deploy order).

## 4. Registration timeline (21 Nov 2026)

Settings `dates.self_funded_opens` / `dates.mentoring_opens` = 20 Nov 2026 00:00 WIB, `dates.fully_funded_opens` =
25 Nov 2026 00:00 WIB (editable in Admin → Content → Settings). Used by `pathwayOpen()` (server validation on
submit), the apply wizard, the homepage pathway buttons, the countdown (now "Fully Funded applications open in"), the
CTA copy, and the IELSco workspace. Settings saved before this change fall back to `dates.launch`. Partial Funded has
no registration date: it is awarded through the Fully Funded selection.

## 5. Staged plan

| Stage | Scope | Status |
|---|---|---|
| 1 Identity | IELSco SSO into GIF, non-destructive linking, email-code fallback | **This PR** |
| 2 Dashboard | Sidebar "GIF" under Events with the official mark; `/dashboard/gif` workspace | **This PR** |
| 3 Tracking | One pathway-aware engine (GIF `progressSteps` + `requiredActions`), shown in the workspace | **This PR** (reused) |
| 4 Staff | Programme management card for `gif.staff`; next: list GIF admin in the IELSco admin group for staff | Partly |
| 5 Native forms | Move the wizard/checkout/uploads into the IELSco app if the founder wants every screen on www.ielsco.com | Not started; only after Stage 1–4 run in production |

Mentoring sessions schedule/attendance and pre-departure checklists are shown through the existing GIF pages
(`/portal/mentoring`, `/portal/onboarding`); richer per-session tracking needs data the engine doesn't store yet.

## 6. Migration safety

No database migration is needed for this change. Linking writes only `gif.accounts.ielsco_user_id` /
`ielsco_linked_at` on first SSO, through the existing unique index. Single-use tokens reuse `gif.rate_limits`.
Nothing is dropped, merged or rewritten; existing GIF sessions and email-code accounts keep working.
