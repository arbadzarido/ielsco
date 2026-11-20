# GIF Summer 2027 — founder decisions

## Applied (founder decision sheet, 20 Nov 2026)

Implemented in `apps/gif` (settings defaults in `src/lib/settings.ts`, editable in Admin → Content & settings).

| Area | Decision | Where |
|---|---|---|
| Fully Funded | 10 slots; covers programme fee, accommodation, in-programme transportation; international flights not included | `awards`, site, result email, Selection Terms |
| Partial Funded | 10 slots; contribution USD 699 / IDR 10,999,000 instead of the Self-Funded fee; flights not included | `prices.partial_funded_payable`; after accepting: deposit within 7 days + balance by 30 Jun |
| Self-Funded | USD 899 / IDR 14,999,000; seat secured by verified deposit, subject to capacity | `prices.self_funded_total` |
| Mentoring | Early Bird USD 79 / IDR 1,199,000 until 31 Dec 2026 23:59 WIB; Regular USD 99 / IDR 1,499,000; per person | `prices.mentoring_*`, `dates.mentoring_early_bird_until` |
| Cashback | Fully Funded USD 19 / IDR 299,000; Partial Funded USD 49 / IDR 749,000; after results + verification | `cashback`, Mentoring Terms |
| Elco Pro | IDR 98,000 (3 months); hybrid fulfilment (Finance manual now, Elco API when available); kept regardless of outcome | `prices.elco_pro_idr`, `lib/elco.ts`, ELCO-GRANT-API.md |
| Currency | Indonesian participants IDR, international USD, set by nationality in the application; separate prices, never converted | pricing, UI copy |
| Gateway | Midtrans only; no second gateway; USD by invoice + manual verification; payment methods described only as "shown on the Midtrans page" | PAYMENTS.md |
| Deposit / balance | deposit within 7 days of registration; balance by 30 Jun 2027; reminders weekly in the last 14 days | `dates.deposit_due_days`, `dates.balance_due`, cron |
| Refunds | Mentoring 100% ≥7 days before 2 Feb, 50% before Session 4; balance 75% >60 days, 50% 30–60, 0% <30; deposit generally non-refundable except visa, medical, cancellation | Refund Policy (draft) |
| Accounts | GIF + IELSco combined via non-destructive linking | ACCOUNTS.md |
| Staff | `arbadzarido03@gmail.com` stays owner; roles unchanged | `gif.staff` |
| Old page | redirect `/events/gif` only after go-live | EVENTS-GIF-REDIRECT.md |
| Testimonials / mentors | only real, consented content; 3 pending slots + collection kit | TESTIMONIALS.md |
| Typography and visual identity | **Superseded 21 Nov 2026** (founder: "the existing IELSco design system is the source of truth"). GIF now uses the IELSco public design system: Poppins headings, Plus Jakarta Sans body, navy #2F4157 / coral #E56668 / teal #577E90 tokens, pill buttons, 20px hairline cards, white photo-veil hero, IELSco header/footer pattern. The official GIF logo (`public/brand/gif-logo.png`, same file as ielsco.com) is used in header, footer and favicon. EB Garamond was removed. | `layout.tsx`, `globals.css` |
| Guidelines | Phase 2 essay + 10–12 slide deck; Phase 3 video 3–5 minutes | site, portal, Selection Terms |
| Legal language | Bahasa Indonesia primary, English translation | all 10 legal pages |
| Under 18 | guardian consent via emailed link or signed form; payments blocked until recorded | `lib/guardian.ts`, Parental Consent |
| Phase 1 social tasks | 5 tasks, reported by applicants, verified per task by staff (Verified / Not found / Pending review); Phase 1 completes only when Elco Pro is paid and every task is verified for every delegate | `phase1_tasks`, `instagram.recruitment_post` |
| Timeline | Recruitment 25 Nov 2026 · Early Bird 31 Dec 2026 · Mentoring 2 Feb–11 May 2027 · Phase 1 to 10 May · Phase 2 11–24 May · Phase 3 25–31 May · Results 1 Jun · Preparation 8 Jun–26 Jul · Balance 30 Jun · Programme 27 Jul–3 Aug 2027 | `dates`, KEY_DATES |

## Still open (need the founder)

| # | Item | Why it matters | Current behaviour |
|---|---|---|---|
| 1 | **Deposit amount** | The sheet says keep it configurable and not invent one. The value in use (USD 300 / IDR 5,000,000) is carried over from the original programme brief, not re-confirmed with the new prices. | Admin setting `prices.self_funded_deposit`; please confirm or change before payments open |
| 2 | **Recruitment post URL** | Needed for the "like / comment / share" task links | Links point to @iels.co until set (`instagram.recruitment_post`) |
| 3 | **Cashback payment timing** | The sheet asks to explain timing but gave no number | Site and Mentoring Terms say "within 30 days of verification" (proposal, marked in [brackets] in the legal text) |
| 4 | **Minors: operations** | Supervision ratio, rooming, curfew, emergency procedures, chaperones | Not invented; legal text says they will be shared before departure |
| 5 | **Travel insurance minimum cover** | Required in the travel terms | Required, minimum cover "awaiting approval" |
| 6 | **Refund processing time, retention periods, dispute forum** | Bracketed in the legal drafts | Proposed values in [brackets] |
| 7 | **Counsel review** | All 10 legal documents are drafts | Marked "Draf untuk ditinjau penasihat hukum" on every page |
| 8 | **Elco grant endpoint** | Automatic Elco Pro activation | Manual by Finance until Elco ships it |
| 9 | **Midtrans account capabilities** | Which methods / foreign cards are enabled on our MID; business category | Only "methods shown on the Midtrans page" is promised |
| 10 | **Mentor profiles, testimonials** | Real content and consent | Placeholders / pending slots |
| 11 | **Google sign-in through IELSco** | Needs a Supabase redirect URL | Email code or IELSco password |
| 12 | **Payment for international delegates by card** | `payments.allow_idr_for_international` is off: international delegates pay by invoice | Switch on only if you want them to pay the IDR price by card |
