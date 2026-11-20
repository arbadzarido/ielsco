# Elco Pro activation: hybrid fulfilment and the proposed Elco endpoint

Founder decision (20 Nov 2026): Elco Pro for Fully Funded applicants (IDR 98,000, 3 months) is fulfilled by Finance
manually where needed, and automatically through an Elco API once it exists. Benefits stay with the applicant whatever
the selection outcome.

## Today (implemented)

1. Payment verified → `gif.elco_fulfilments.status = pending_activation`.
2. If `ELCO_GRANT_URL` and `IELSCO_TO_ELCO_SECRET` are set, GIF calls Elco immediately (and again in the daily cron for
   anything still pending). On success: `activated`, `activated_by = elco-api`, the Elco grant id stored, applicant emailed.
3. Otherwise (not configured, Elco error or unreachable): stays `pending_activation` with a note. Finance grants Pro in
   Elco's admin and records the reference on the applicant page → `activated` + email.
4. The portal says "Paid · activation in progress" until one of the two succeeds. Code: `apps/gif/src/lib/elco.ts`.

## Endpoint Elco needs to add (not built yet)

`POST {ELCO_API}/api/integrations/ielsco/grants`, signed with the existing IELSco→Elco v1 scheme
(`X-IELS-Timestamp`, `X-IELS-Signature: v1=HMAC-SHA256(secret, "v1\n<ts>\nPOST\n<path>\n<sha256(body)>")`, 300 s skew),
same secret list as `IELSCO_TO_ELCO_SECRET` / Elco's verifier in `backend/integration_ielsco.py`.

Request:
```json
{ "email": "applicant@example.com", "plan": "pro", "months": 3, "reference": "gif:<obligation uuid>", "source": "gif-summer-2027" }
```
Behaviour:
- Idempotent on `reference`: a repeat returns the same `grant_id` and never grants twice.
- If the email has an Elco account, add 3 months of Pro after any current paid period (same rule as Elco's bundle Pro month);
  if not, hold a pending grant that attaches when that email signs up (Elco already handles pending grants for IELSco benefits).
- Response `200 {"grant_id": "...", "status": "granted" | "pending_signup"}`; `4xx {"status": "<reason>"}` for refusals.
- Revocation is not automatic: Elco Pro is a delivered digital service (Refund Policy §2).

Once Elco deploys it, set on the GIF Vercel project: `ELCO_GRANT_URL=https://<elco-api>/api/integrations/ielsco/grants`
and `IELSCO_TO_ELCO_SECRET` (the same value Elco verifies).
