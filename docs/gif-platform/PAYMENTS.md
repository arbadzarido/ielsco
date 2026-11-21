# GIF payments: Midtrans research and design

> Prices (20 Nov 2026 decision): Self-Funded USD 899 / IDR 14,999,000 (deposit configurable, currently USD 300 / IDR 5,000,000;
> balance by 30 June 2027); Partial Funded contribution USD 699 / IDR 10,999,000; mentoring USD 79 / IDR 1,199,000 (Early Bird to
> 31 Dec 2026) then USD 99 / IDR 1,499,000; Elco Pro IDR 98,000. Merchant capabilities (foreign cards, methods enabled) are
> not verified from this side: only Midtrans can confirm them for our MID, so the site never lists specific methods.

Researched on 20 November 2026 from official Midtrans documentation (docs.midtrans.com). Each fact links to its source.
**Technical capability** (what the API can do) is kept separate from **account eligibility** (what IELSco's merchant
account is approved for), which only Midtrans can confirm for PT English Space Berkah Indonesia.

## 1. Findings

| Question | Technical capability (docs) | Account eligibility (to confirm with Midtrans) |
|---|---|---|
| International Visa/Mastercard | Cards from local and international banks are accepted; Visa, Mastercard, JCB, Amex ([Credit Card](https://docs.midtrans.com/reference/credit-card)). BIN filters can restrict issuing countries. | Whether IELSco's MID accepts foreign-issued cards, and with which fraud rules / 3DS settings. |
| Approval needed? | Card payments need an activated card channel on the merchant account; installments need a bank agreement (see below). | Is the card channel active on IELSco's production MID (the Elco/IELSco merchant)? |
| Currencies / USD | "Midtrans currently only processes transactions in Indonesian Rupiah (IDR)." Merchants must convert to IDR before charging and should show the rate ([FAQ](https://docs.midtrans.com/docs/can-i-receive-payments-using-other-currency-than-idr)). For foreign cards the card scheme converts (issuer USD, acquiring IDR). | No USD charging is possible through Midtrans. |
| Settlement / payout | A transaction can be withdrawn after it has settled and after 3 working days (bank cut-off); payout is requested from the dashboard on working days; the first payout needs complete registration documents ([payout FAQ](https://docs.midtrans.com/docs/kapan-saya-menerima-dana-transaksi-dari-midtrans)). Card settlement is usually D+1 16:00 ([card processing](https://docs.midtrans.com/docs/introduction-to-card-payment-processing)). | Confirm IELSco's payout schedule and bank account in the dashboard. |
| Installments | Online installments need a bank-issued installment MID and an agreement with the bank; minimums apply (e.g. IDR 500,000) ([Snap advanced features](https://docs.midtrans.com/docs/snap-advanced-feature)). | Not offered at launch. |
| Refund API | `POST /v2/{order_id}/refund` for all refund cases, `refund_key` for idempotent retries (within 7 days), optional partial `amount` ([Refund](https://docs.midtrans.com/reference/refund-transaction)). Refundable: cards (full/partial, up to 6 months), GoPay, ShopeePay, DANA, OVO (full only), QRIS via GoPay, Akulaku, Kredivo. **Not** refundable via API: bank-transfer virtual accounts, Mandiri bill, Alfamart/Indomaret ([refund methods](https://docs.midtrans.com/docs/what-payment-method-that-have-refund-feature)). Since 16 March 2026, card refunds go through scheme authorisation and may be declined by the issuer ([deployment notice](https://docs.midtrans.com/reference/deployment)). | Refunds of VA payments must be made by bank transfer (the admin records them as manual refunds). |
| Webhook signature | `SHA512(order_id + status_code + gross_amount + key)`. **Since 28 October 2026 the key is the "Signature Secret Key"** (Dashboard → Settings → Access Keys); for existing merchants it equals the old Server Key until either is regenerated ([Access Keys](https://docs.midtrans.com/docs/access-keys)). Respond HTTP 200; Midtrans retries failed notifications several times; re-check with the Get Status API ([notifications](https://docs.midtrans.com/docs/https-notification-webhooks)). | Read the Signature Secret Key from the dashboard into `GIF_MIDTRANS_SIGNATURE_KEYS`. |
| Merchant restrictions | Midtrans's prohibited-business list could not be retrieved (its terms URL returned 404 on 20 Nov 2026). | Ask Midtrans to confirm that an education/youth programme with international travel is an accepted business category for the existing MID, or whether a separate MID is needed. |

## 2. What was built

- **Gateway abstraction** (`apps/gif/src/lib/payments/gateway.ts`): `createCheckout`, `fetchStatus`, `refund`. Midtrans Snap is
  the only online gateway. Manual payments (bank transfer verified by finance) are recorded by staff, not a gateway.
- **Obligations** (`gif.obligations`): Elco Pro, mentoring, deposit, balance, full, other; one live obligation per kind per
  person (unique index), so duplicate obligations cannot exist.
- **Payments** (`gif.payments`): participant, application, kind, amount, currency, gateway, order ID, gateway transaction
  ID, status, timestamps, receipt number. One non-duplicate settled payment per obligation (unique index).
- **Server-side verification only**: the return page asks the server, which re-reads status from Midtrans. Notifications
  are signature-checked (all configured keys, constant-time) and then re-read from the Status API before anything changes.
  Gross amount and currency must match the payment row, or nothing is paid (audited `payment_amount_mismatch`).
- **Idempotency**: every change runs in one transaction with the payment row locked; status changes are monotonic
  (paid → only refunded); events are logged with a dedupe key; emails have dedupe keys. Replayed notifications are no-ops.
- **Duplicates**: a live checkout is reused instead of creating a second order; if two orders are nevertheless both paid,
  the second is flagged `is_duplicate` and a full refund is queued for finance (Admin → Payments → Refunds to review).
- **Attempts and recovery** (21 Nov 2026): see §2a.
- **No FX**: Indonesian citizens owe IDR, everyone else USD (Elco Pro is IDR for all). USD obligations are paid by invoice
  and bank transfer, verified by finance. Optional switch `payments.allow_idr_for_international` lets international
  delegates pay the *published IDR price* by card instead (no conversion) — a founder decision, off by default.
- **Reconciliation**: the daily cron re-reads every pending payment older than 10 minutes and expires unopened checkouts.
- **Sandbox only** in this branch: production requires `GIF_MIDTRANS_ENV=production` **and**
  `GIF_MIDTRANS_PRODUCTION_ENABLED=true` **and** non-sandbox keys.

## 2a. Payment attempts: Continue payment / Cancel & change payment method

**The old lock.** "Pay" reused any open checkout for the obligation for its whole 60-minute Snap expiry. Once a payer chose
a method in Snap (e.g. a BCA virtual account), Midtrans fixes that order to the method, so reopening the same order showed
the same VA and there was no way to pick another method until the order expired. Closing the page changed nothing either.
Cause: application-level reuse (`startCheckout`) combined with the Snap order's method lock and the 60-minute `expiry`.

**Now** (`apps/gif/src/lib/payments/attempts.ts`, `service.ts`, portal `payments/buttons.tsx`):

- One obligation (what is owed) has many attempts (`gif.payments`), each its own Midtrans `order_id`; `replaced_by` links a
  closed attempt to the one that replaced it. The obligation is never duplicated.
- Snap opens as a popup (Snap JS; the redirect page stays as a fallback). Closing it cancels nothing: the payer sees
  "Awaiting payment" with **Continue payment** (reopens the same Snap token) and **Cancel & change payment method**.
- Cancel: the attempt is claimed under a row lock (`status = 'cancelling'`; repeated clicks get "already cancelling"),
  then the status is re-read from Midtrans:
  - no transaction (no method chosen) → `POST /v2/{order}/expire` best effort, attempt `cancelled` (`no_transaction`);
  - pending → `POST /v2/{order}/cancel` ([Cancel](https://docs.midtrans.com/reference/cancel-transaction)); if refused
    (412), `POST /v2/{order}/expire`; the status is re-read and applied;
  - paid (even while cancelling) → applied as paid: a verified payment always wins;
  - both refused → back to `pending` with `cancel_result = not_cancellable`: the payer can continue it, wait for the expiry,
    or explicitly **start a new payment** (if both are paid, the second is flagged duplicate and refunded);
  - Midtrans unreachable → back to the previous status (`gateway_error`), "try again"; the daily cron un-sticks a
    `cancelling` attempt older than 10 minutes.
- A cancellation the payer asked for never sends the "payment failed" email. Webhooks stay authoritative and idempotent;
  a "pending" notification never overrides `cancelling`.
- States shown: Awaiting payment (created/pending), Cancelling, Paid, Cancelled, Expired, Failed.

## 3. Elco Pro fulfilment

Hybrid (see ELCO-GRANT-API.md): when the Elco Pro obligation is verified paid (or waived), GIF calls Elco's
server-to-server grant endpoint (HMAC v1, idempotent on `gif:<obligation id>`), records every call in
`gif.elco_grant_attempts`, retries with backoff (1 min, 5 min, 30 min, 2 h, then every 12 h; payment hook + daily cron;
Finance can force a retry), and marks the fulfilment `activated` only when Elco confirms (`granted`, or `pending_signup` =
reserved for that email's Elco sign-up). Manual activation by Finance in Elco's admin stays available as the fallback.
A payment attempt or an open Snap window never triggers a grant.

## 4. Testing

`apps/gif/tests/e2e/fake-midtrans.mjs` implements Snap (redirect page and a Snap JS stand-in), status, refund, cancel,
expire (with refusal and pay-during-cancel switches), signed notifications and a fake Elco grant endpoint locally. Recovery
scenarios: close without paying, continue the same order, cancel a pending VA and switch method, simultaneous cancels,
refused cancel → new payment, paid during cancellation, the refused attempt paid later (duplicate refund), duplicate
webhooks, closed attempt; Elco grant down → retry → granted, duplicate grant request, pending sign-up. The e2e suite covers
settlement, deny, pending → expire, amount mismatch, forged return URL, bad/foreign signatures, replayed notifications,
unknown orders, checkout reuse, duplicate settlement → refund through the gateway, manual USD payments and refusal of
partial manual payments. No real money is involved.

## 5. Second gateway (USD / international) — not integrated (founder decision 20 Nov 2026)

**Decision: keep Midtrans as the only gateway for now; international delegates pay USD by invoice and bank transfer,
verified by finance.** The research below is kept for a later decision.

Midtrans cannot charge USD. Options for an Indonesian PT, from official sources:

- **Xendit** — onboards Indonesian entities (PT, CV, PMA; foreign entities not eligible), accepts foreign cards, and its
  newer *card multi-currency processing* lists USD for Indonesia, rolling out country by country and enabled via the
  account manager ([multi-currency](https://docs.xendit.co/docs/card-multi-currency-processing),
  [eligibility](https://help.xendit.co/hc/en-us/articles/14828007484953-Is-my-business-eligible-to-accept-Card-payments)).
  Older help articles say Indonesian merchants are charged and settled in IDR, and that Bank Indonesia rules require IDR
  for domestic transactions — the two sources conflict, so eligibility must be confirmed in writing.
- **Recommended**: ask Xendit (and Midtrans) in writing whether PT English Space Berkah Indonesia can charge foreign
  cardholders in USD for this programme. Until confirmed, keep USD on invoice + bank transfer (already built), and
  decide whether to enable the IDR-card option for international delegates.
- Not integrated, per the brief, because eligibility is unverified. The gateway interface is ready for it.

## 6. International payments: invoice or card at a fixed rate (founder decision 21 Nov 2026)

International participants keep their official **USD** price (`currencyFor(nationality)`, unchanged). Indonesian
participants and Elco Pro (IDR for everyone) are untouched. For each open USD item the portal offers:

- **Request an invoice** (always): recorded in `gif.invoice_requests` (one open request per item; asking again shows
  the existing one). Finance is emailed (`GIF_FINANCE_EMAIL`, else the contact email) with only the name, email,
  application ID, item and amount; the payer gets an acknowledgement. Finance marks the invoice as sent in
  Admin → Payments → Invoice requests (the payer is emailed), then records the verified transfer on the applicant's page
  (`recordManualPayment`), which closes the request. Bank details come only from `settings.payments.invoice_bank_details`
  (entered by Finance, may be an officially approved personal account); null by default and never invented. They are
  shown only to a payer who has requested an invoice.
- **Pay by card** (Visa/Mastercard through Midtrans, which charges IDR): only when the gateway is ready and Finance sets
  `settings.payments.international_card_enabled = true` (off by default). Amount =
  `cardAmountIdr(obligation USD amount, settings.payments.usd_idr_card_rate)` = USD × 18,500, rounded to whole rupiah,
  computed on the server at checkout (never from the browser). Snap is limited to `enabled_payments: ["credit_card"]`.
  The payment row stores `amount` (IDR charged) plus `original_amount`, `original_currency = 'USD'`, `fx_rate` and
  `fx_source`. Settlement keeps the existing rules: signature-verified notification or server status read, amount must
  equal the stored IDR amount, at most one paid payment per obligation (a second one is flagged duplicate and queued for
  refund). Receipts and the payment email show "IDR 16,631,500 (USD 899 at USD 1 = IDR 18,500)".

Change the rate in Admin → Content → Settings → `payments.usd_idr_card_rate` (integer 10,000–30,000). Open checkouts
created at the old rate are not reused once the amount differs; a new attempt is created at the new rate.

Migration `20261128000000_gif_international_card_invoice_requests.sql` (additive). The code tolerates it not being
applied yet (IDR checkout, settlement, portal and receipts keep working; invoice requests fall back to email only),
verified with `E2E_SKIP_MIGRATION=20261128000000_gif_international_card_invoice_requests.sql npm run e2e`.
