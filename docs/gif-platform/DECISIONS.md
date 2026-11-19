# GIF Summer 2027 — decisions for the founder

Each item has a **recommended** choice. Items marked ⚑ block something specific before or soon after launch.
All of them can be changed later in Admin → Content & settings unless stated otherwise.

| # | Decision | Recommendation | Where it applies |
|---|---|---|---|
| 1 ⚑ | **What Fully Funded and Partial Funded awards cover** (programme fee? accommodation? in-programme transport? flights?) | Publish before Phase 2 opens; at minimum "programme fee covered" for Fully Funded. The site says "award details are confirmed with your result" until then. | Selection Terms §5, result emails, /fully-funded |
| 2 ⚑ | **Partial Funded payable amount** (`prices.partial_funded_payable`) | Set before 1 June 2027 (e.g. a fixed USD/IDR pair). Until set, Partial Funded acceptances are confirmed manually by staff. | Admin settings |
| 3 ⚑ | **Mentoring Early Bird end date** (`dates.mentoring_early_bird_until`) | 31 December 2026, 23:59 WIB. Until set, Early Bird applies and the site says the end date will be announced. | /mentoring, checkout price |
| 4 | **Balance due date** (`dates.balance_due`) | 30 June 2027 (about 4 weeks before departure, inside preparation). | Self-Funded balance obligations, reminders |
| 5 | **Deposit due window** (`dates.deposit_due_days`) | 7 days after registration; seats are first-come by verified deposit anyway. | Self-Funded deposits |
| 6 | **Refund percentages and windows** (bracketed in the Refund Policy) | Keep the proposed tiers (mentoring 100% ≥7 days before 2 Feb, 50% before session 4; balance 75% >60 days, 50% 30–60 days, 0% <30 days; deposit non-refundable except visa/medical/cancellation). Have counsel confirm. | /refund-policy |
| 7 | **International delegates paying by card** (`payments.allow_idr_for_international`) | Turn on: lets non-Indonesians pay the published IDR price (IDR 15,000,000 ≈ the USD 900 price) by card via Midtrans — no conversion by us; their bank converts. Otherwise they can only pay by bank transfer. | Payments page |
| 8 | **Second gateway for USD** | Ask Xendit in writing about USD card processing for an Indonesian PT; don't integrate until confirmed. | PAYMENTS.md §5 |
| 9 | **Mentoring fee per person or per team** | Per person (implemented; each member is an individual delegate). | Obligations |
| 10 | **Elco Pro API** | Ask the Elco team for a signed "grant Pro for N months" endpoint; until then finance activates manually and records the reference. | Elco fulfilment |
| 11 | **GIF accounts vs IELSco accounts** | Keep separate (implemented): passwordless email codes, no IELSco account needed, and no load on Supabase Auth's 30/hour email limit. Link later if useful. | Auth |
| 12 | **Founder's staff email** | The migration seeds `arbadzarido03@gmail.com` as owner (the existing GIF admin). Add others in Admin → Staff. | gif.staff |
| 13 | **Old /events/gif page on ielsco.com** | It still advertises the superseded USD 800 Early Bird and a Google Form. Recommended: after gif.ielsco.com is live, redirect it there (see DEPLOYMENT.md §7). Not changed in this PR. | ielsco.com |
| 14 | **Testimonials and mentor profiles** | None were supplied, so none are shown. Send real quotes with written consent and confirmed mentor names/photos; add them in Admin → Content. | Home, /mentoring, /previous-gif |
| 15 | **Heading font** | Apple Garamond is not licensed for web embedding by default; EB Garamond (open licence) is used, and Apple Garamond is used automatically where installed. Supply a web licence/files if you want it everywhere. | globals.css |
| 16 | **Phase 2/3 guidelines** | Drafted on /fully-funded and the Phase pages (essay structure, 10–12 slide deck, 3–5 minute video). Confirm or edit. | /fully-funded, portal |
| 17 | **Indonesian-language legal texts** | Have counsel prepare Bahasa Indonesia versions (Law 24/2009) and decide which prevails. | Legal pages |
| 18 | **Minors** | Guardian consent for delegates under 18 (in Terms and Travel Disclaimer; collected during preparation). Confirm with counsel. | Legal, onboarding |
