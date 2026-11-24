# Self-Funded recruitment campaign (24 November 2026)

## What is live once this change is merged

- **Allocations.** 20 Super Early Bird places (USD 799 / IDR 13,000,000) for the first 20 Self-Funded delegates whose first payment is verified. After them, 50 Regular places (USD 999 / IDR 17,000,000). Self-Funded seats are capped at 70.
- **Live availability.** The site shows "X of 20 / X of 50 places left", counted from the database. If the count can't be read, it shows the allocation sizes only and never claims places are taken.
- **How the early price applies.** Everyone registers at the Regular fee. When a delegate becomes one of the first 20 verified deposits, their fee is lowered to the Super Early Bird price, and anything already paid above that is queued for refund.
- **Older registrations.** Fees already recorded at USD 899 / IDR 14,999,000 are not raised. They too are lowered to USD 799 / IDR 13,000,000 if they get a Super Early Bird place.
- **Competition.** USD 5,000 is the total prize pool, shared by four award levels (1 Grand, 2 Gold, 3 Silver, 4 Bronze) and ten recipients from the Top 10.
  - Stage weights: Singapore 25%, Malaysia 35%, Thailand 40%.
  - Grand Finale on Day 7, 2 August 2027, in Bangkok, at the Global Impact Conference & Innovation Expo: main-stage pitching plus innovation booths.
- **Hidden pathways.** Fully Funded and Mentoring are not promoted.
  - They are out of the navigation, home page, sitemap, public FAQ, application chooser, ielsco.com GIF feature and popup, and the IELSco Dashboard chooser.
  - Their pages and registrations still work for anyone with a direct link, and the pages are `noindex`.
  - The switch is `settings.campaign.public_pathways` in apps/gif (default `["self_funded"]`) and `promoted` in `src/lib/gif-summer-2027.ts` on ielsco.com. Change both to bring the pathways back.
- **Where "Apply" goes.** The IELSco Dashboard (`/dashboard/gif?pathway=self_funded`).

## Decisions still needed (not invented on the site)

1. The amount for each award level (Bronze, Silver, Gold, Grand).
2. Whether awards go to individuals or teams, and how a team shares its prize.
3. The final judging criteria and scorecard for the Top 10.
4. The Public Choice Award, and whether public voting affects the main awards or is a separate recognition.
5. Prize disbursement terms, tax and payment timeline.
6. The final venue and public attendance arrangements. The site says "planned open to the public, subject to venue capacity, approvals and arrangements".
7. Counsel review of the Payment Terms wording.
   - It now states the Super Early Bird and Regular fees, and that a recorded fee is not raised by a later price change.
   - It also fixes the outdated "Instalments: not offered" line.
   - `LEGAL_VERSION` was not bumped.
8. Confirm the sky-blue value `#5BC2E7` against the official brand guide (see BRAND-COLOURS.md).
9. Whether the 50 Regular places plus 20 Super Early Bird should be the only Self-Funded seats. Overall capacity stays 100, so 30 seats stay available for the Fully Funded and Partial Funded results.
