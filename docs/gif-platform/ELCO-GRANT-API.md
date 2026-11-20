# Elco Pro activation: automatic grant API + manual fallback

Founder decision (20 Nov 2026): Elco Pro for Fully Funded applicants (IDR 98,000, 3 months) is granted automatically through
an Elco API, with manual activation by Finance as the fallback. Benefits stay with the applicant whatever the selection outcome.

## Status (21 Nov 2026)

- The endpoint did **not** exist before. It is built in the Elco repo (branch `fix/payment-recovery`, PR on arbadzarido/elco):
  `backend/partner_grants.py` + route in `backend/integration_ielsco.py`, migration `038_payment_recovery_partner_grants.sql`.
  It is **not deployed** until that PR is merged and Railway applies migration 038.
- GIF's client is `apps/gif/src/lib/elco.ts`. It stays inactive until `ELCO_GRANT_URL` and `IELSCO_TO_ELCO_SECRET` are set
  on the GIF Vercel project; until then everything goes through the manual Finance step.

## Endpoint (Elco API, server to server only)

`POST https://<elco-api-host>/api/integrations/ielsco/grants`

Production API host: the Elco API service on Railway (`https://elco-production.up.railway.app`, also reachable as
`https://api.ai.ielsco.com` once that DNS exists). Do **not** use the public website (`www.elcoai.com`): the endpoint is not
meant to be reached through the browser-facing site. Exact value to set: `ELCO_GRANT_URL=https://elco-production.up.railway.app/api/integrations/ielsco/grants`
(verify the Railway URL in the Railway dashboard before setting it).

**Authentication**: the existing IELSco→Elco v1 HMAC scheme, same secret list as `/revoke`:
`X-IELS-Timestamp: <unix seconds>`, `X-IELS-Signature: v1=HMAC-SHA256(secret, "v1\n<ts>\nPOST\n<path>\n<sha256 hex of body>")`,
300 s clock skew. Secret: Elco's `IELSCO_TO_ELCO_SECRET` (comma-separated list, each ≥ 32 chars); GIF signs with the first
value of its own `IELSCO_TO_ELCO_SECRET`, which must equal one of Elco's.

**Request**
```json
{ "email": "applicant@example.com", "plan": "pro", "months": 3, "reference": "gif:<obligation uuid>", "source": "gif-summer-2027" }
```

**Response**
- `200 {"grant_id": "<uuid>", "status": "granted"}` — Pro granted to the Elco account with that confirmed email.
- `200 {"grant_id": "<uuid>", "status": "pending_signup"}` — no Elco account with that confirmed email yet; the grant is held
  and starts when that email signs up and confirms (attached on the learner's first `/api/me`).
- `400 {"status": "invalid_email" | "invalid_reference" | "invalid_plan" | "invalid_months" | "invalid_source" | "invalid_request"}`
- `401 {"status": "unauthorized"}` (missing, stale or wrong signature) · `409 {"status": "reference_conflict" | "revoked"}`
- `503 {"status": "integration_not_configured"}` (Elco has no `IELSCO_TO_ELCO_SECRET`)

**Behaviour**
- **Idempotent on `reference`**: a repeat with the same payload returns the same `grant_id` and never grants twice; the same
  reference with a different email/plan/months is refused (409).
- **Who gets it**: the Elco account whose *confirmed* email (Supabase `auth.users.email_confirmed_at`) equals the request
  email, case-insensitive. This is the only place Elco matches by email; it grants value to the holder of a verified inbox
  and reveals nothing about the account (the response is the same shape either way).
- **What is granted**: an ordinary row in Elco's `public.subscriptions` (`source = 'partner_grant'`), so access, expiry and
  the entitlement mirror work exactly like purchases and rewards (no parallel subscription system). It starts when the
  learner's current paid General English period ends (no paid day lost, no overlap) and runs `months` months.
- Like tournament rewards, a partner grant is not pushed to IELSco as a membership benefit (IELSco's receiver accepts only
  purchase/bundle/reward sources).
- Revocation is not automatic: Elco Pro is a delivered digital service (Refund Policy §2).

## GIF side (`apps/gif/src/lib/elco.ts`)

1. Elco Pro obligation verified **paid** (or waived) → `gif.elco_fulfilments.status = pending_activation`. A payment attempt,
   an open Snap window or a pending/cancelled attempt never triggers a grant.
2. GIF calls the endpoint right after the payment commits, and the daily cron retries anything still pending.
3. Every call is recorded in `gif.elco_grant_attempts` (reference, HTTP status, outcome `granted | pending_signup | refused |
   error | unreachable`, grant id, short detail; never the secret).
4. Success → `activated`, `activated_by = elco-api`, the Elco grant id stored as `elco_reference`, applicant emailed (once).
   `pending_signup` → also `activated`, with a note; the portal tells the delegate to sign up on Elco with that email.
5. Failure → stays `pending_activation`, `grant_attempts` +1, `next_attempt_at` = now + 1 min, 5 min, 30 min, 2 h, then every
   12 h. Finance can force a retry ("Retry automatic grant" on the applicant page).
6. **Manual fallback** (unchanged): Finance grants Pro in Elco's admin and records the reference on the applicant page →
   `activated` + email. Applicants are told "active" only after one of the two succeeds.

## Configuration

| Where | Variable | Value |
|---|---|---|
| Elco (Railway) | `IELSCO_TO_ELCO_SECRET` | already set for account linking; reused |
| GIF (Vercel) | `ELCO_GRANT_URL` | `https://<elco-api-host>/api/integrations/ielsco/grants` |
| GIF (Vercel) | `IELSCO_TO_ELCO_SECRET` | the same value Elco verifies (first entry is used to sign) |
