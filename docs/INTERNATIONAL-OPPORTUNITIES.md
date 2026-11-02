# International Opportunities (Academic | Professional)

Added 2026-11-02. One Opportunities experience with two tracks, used on `/opportunities`, `/opportunities/professional`,
the landing page and the dashboard (Discover → Opportunities).

## Positioning (do not change without legal review)

IELSco publishes information and passes on expressions of interest. It does **not** recruit, employ, place workers,
issue permits or guarantee jobs. Every professional listing names its authorised recruitment partner, and the disclaimer
in `src/lib/professional/model.ts` (`professionalDisclaimer`) is shown on the directory, every listing and the form.
The interest form never asks for passport, ID or other identity documents.

## Data

| Table | What | Who edits |
| --- | --- | --- |
| `public.opportunities` | Academic listings (unchanged) | Admin → Opportunity board → Academic |
| `public.professional_opportunities` | Jobs abroad: country, city, industry, positions, salary, benefits, contract, status, publication | Admin → Opportunity board → Professional |
| `public.recruitment_partners` | Partner name, website, WhatsApp, email, phone | Admin → Opportunity board → Professional → Recruitment partners |
| `public.opportunity_interests` | Expressions of interest (+ optional CV in private bucket `opportunity-interest-cvs`) | Admin → Operations → Work abroad |

Migrations: `20261102000000_professional_opportunities.sql` (schema, RLS, `submit_opportunity_interest()`, bucket) and
`20261102010000_professional_opportunities_seed.sql` (Albania pilot, 8 listings, PT Ficotama Bina Trampil).

**Adding a country, industry or partner needs no code.** Country (ISO code), industry and positions are plain values;
the filters are built from published listings. Each listing points to its own partner.

### Source rules for listings

- Copy figures only from the partner's official material. Where sources disagree, set salary status to
  "To be confirmed", explain in the salary note and add a line to "Confirm with partner". Never pick one silently.
- Leave responsibilities empty if the material lists none; the page then tells people to ask the partner.

Albania pilot conflicts recorded in the seed: construction pay (70,000 ALL infographic vs 80,000 ALL poster), poultry
pay (70,000 ALL infographic vs 800 EUR poster), accommodation not on the agriculture/construction posters, and work
city/terms not stated for cook, waiter and general worker.

## Expressions of interest

Browser → optional CV upload to the private bucket → `POST /api/opportunities/interest` → `submit_opportunity_interest()`
(validation, one per email per listing, rate limits, closed listings refused) → email to `careers@ielsco.com`.

Email uses Resend and only sends when these are set in Vercel (server-side only):

- `RESEND_API_KEY`
- `EMAIL_FROM`: a sender on a domain verified in Resend, e.g. `IELSco <notifications@ielsco.com>`
- `OPPORTUNITY_INTEREST_TO` (optional, default `careers@ielsco.com`)

Without them every interest is still stored (Admin → Operations → Work abroad) and the success screen offers the
person a prefilled `mailto:careers@ielsco.com`. Staff use "Forward to partner" there to email the partner, then set the
status to Forwarded.

## Tests

- `npm test` includes `tests/professional-opportunities.test.mjs` (filters, salary labels, partner links).
- `tests/db/professional-opportunities.pglite.mjs`: migrations, RLS, the submit function and storage policies on PGlite
  (copy next to a PGlite install, e.g. `workspace/local-stack/tests/`, and run with the migrations folder).
