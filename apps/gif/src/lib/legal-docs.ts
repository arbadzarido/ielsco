// Legal document texts for gif.ielsco.com. DRAFTS for review by Indonesian counsel before launch; they are not legal advice
// and make no claim of regulatory compliance. Items in [square brackets] are founder decisions with a recommended value
// (docs/gif/DECISIONS.md). Company facts are from IELSco's registration documents.
import { LEGAL_VERSION } from "./legal.ts";

export type Block = { h?: string; p?: string[]; ul?: string[] };
export type LegalDoc = { slug: string; title: string; intro: string; blocks: Block[] };

const CO = "PT English Space Berkah Indonesia (\"IELSco\", \"we\"), NIB 0905260045155, Villa Regency 2 Blok AB 4 No. 8, Pasar Kemis, Tangerang 15560, Indonesia";
const CONTACT = "hello@ielsco.com or WhatsApp +62 882-9725-3491";

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  "terms-and-conditions": {
    slug: "terms-and-conditions", title: "Terms & Conditions",
    intro: `These terms govern your application to and participation in the Global Impact Fellowship Summer 2027 ("GIF" or "the Programme") organised by ${CO}. Version ${LEGAL_VERSION}.`,
    blocks: [
      { h: "1. The Programme", p: ["GIF Summer 2027 runs from 27 July to 3 August 2027 (8 days, 7 nights) and travels from Singapore through Malaysia to Thailand. Up to 100 delegates take part.", "University engagement (National University of Singapore, Universiti Malaya, Chulalongkorn University) is planned. Unless this website marks an engagement as confirmed, it is not confirmed, and no university organises, endorses or is responsible for GIF."] },
      { h: "2. Eligibility", p: ["GIF is open to high school, undergraduate and college students. You may apply individually or as a team of 2–3 people. Each person may be part of only one application per cohort.", "Applicants under 18 at the start of the Programme need the written consent of a parent or legal guardian, collected during participant preparation."] },
      { h: "3. Pathways", ul: ["Fully Funded application: a competitive three-phase selection for 10 Fully Funded and 10 Partial Funded places. Partial Funded is an outcome, not a pathway. Funding is not guaranteed.", "Project Mentoring Program: 15 weekly sessions from 2 February to 11 May 2027; mentees enter the selection at Phase 3.", "Self-Funded: direct registration; your seat is confirmed only when your deposit is verified."] },
      { h: "4. Your account and information", p: ["You sign in with a one-time code sent to your email. Keep access to your email secure. You must give accurate, complete information and keep it up to date. We may ask for documents to verify your identity, student status or payments.", "Team leaders confirm that each member agreed to be included. Each member accepts these terms personally when they first sign in."] },
      { h: "5. Payments", p: ["Prices, currencies, deposits, balances and receipts are governed by the Payment Terms. Refunds are governed by the Refund & Cancellation Policy. A payment counts only once it has been verified by us or our payment provider; a redirect or screenshot is not proof of payment."] },
      { h: "6. Elco Pro", p: ["Phase 1 of the Fully Funded application includes a subscription to Elco Pro, a separate digital service provided through the Elco app. It is not an application fee. Elco's own terms apply to your use of Elco. You keep the subscription whether or not you are selected."] },
      { h: "7. Conduct, travel and media", p: ["You agree to the Code of Conduct. You are responsible for your passport, visas, travel insurance and fitness to travel, as described in the Travel & Visa Disclaimer. Media use is governed by the Media Consent you choose."] },
      { h: "8. Changes to the Programme", p: ["We may adjust the itinerary, sessions, venues or partners for operational, safety or legal reasons. If we make a major change (to the dates, or to the countries visited), you may withdraw and receive a refund as set out in the Refund & Cancellation Policy."] },
      { h: "9. Liability", p: ["We organise the Programme with reasonable care and skill. To the extent permitted by Indonesian law, we are not liable for losses caused by events outside our reasonable control, by third-party providers acting independently (for example airlines, hotels or venues), or by your breach of these terms. Nothing in these terms limits liability that cannot be limited by law, including under Law No. 8 of 1999 on Consumer Protection."] },
      { h: "10. Standard clauses", p: ["These terms are written to avoid standard clauses prohibited by Article 18 of Law No. 8 of 1999 on Consumer Protection (for example, clauses transferring our responsibility to you or allowing us to refuse refunds of goods or money paid without basis). If any clause is found to conflict with that law, it is void to that extent and the rest remains in force."] },
      { h: "11. Governing law and disputes", p: ["These terms are governed by the laws of the Republic of Indonesia. We will first try to resolve any complaint with you directly (contact " + CONTACT + "). [Dispute forum: recommended the District Court of Tangerang, without prejudice to your right to approach a consumer dispute settlement body (BPSK).]"] },
      { h: "12. Language", p: ["These terms are provided in English. [An Indonesian-language version is to be prepared; Law No. 24 of 2009 may require Bahasa Indonesia for agreements involving Indonesian parties. Counsel to advise which version prevails.]"] },
    ],
  },
  "refund-policy": {
    slug: "refund-policy", title: "Refund & Cancellation Policy",
    intro: `How refunds and cancellations work for GIF Summer 2027. Version ${LEGAL_VERSION}. Percentages and dates in [brackets] are proposals awaiting final approval and will be fixed before payments open.`,
    blocks: [
      { h: "1. General", ul: ["Each delegate's payments are handled separately, including within a team.", "Approved refunds go back through the original payment method where the payment provider supports it (for example card or e-wallet refunds through Midtrans). Where it does not (for example bank transfer virtual accounts), we refund by bank transfer to an account in the payer's name.", "We process approved refunds within [14 working days]. Banks and payment providers may take longer to show the money.", "Payment provider fees and currency differences charged by your bank are not refundable unless the refund is caused by our error or cancellation.", "To request a refund, write to hello@ielsco.com from your registered email with your application ID."] },
      { h: "2. Elco Pro (Fully Funded Phase 1)", p: ["Elco Pro is a separate digital service. Before your Elco Pro access is activated, you may cancel for a full refund. Once activated, the subscription has been supplied and is not refundable, including if you are not selected or withdraw from GIF, except for duplicate or failed payments (section 6) or where the law requires otherwise."] },
      { h: "3. Project Mentoring Program", ul: ["Withdraw [at least 7 days] before the first session (2 February 2027): [100%] refund.", "Withdraw after that but before session [4]: [50%] refund.", "From session [4] onwards: no refund; you keep access to the remaining sessions and recordings, if any.", "Cashback for selected mentees is governed by the Mentoring Program Terms. Not being selected is not a ground for a refund."] },
      { h: "4. Self-Funded deposit", ul: ["The deposit confirms your seat and is [non-refundable] if you withdraw for personal reasons, except as set out in sections 7–10.", "[Recommended alternative: refundable minus IDR 1,000,000 / USD 60 if you withdraw before 1 April 2027.]"] },
      { h: "5. Self-Funded balance", ul: ["Withdraw more than [60] days before 27 July 2027: [75%] of the balance refunded.", "Withdraw [30–60] days before: [50%] refunded.", "Withdraw fewer than [30] days before, or do not attend: no refund of the balance."] },
      { h: "6. Duplicate, failed and incorrect payments", p: ["If you are charged twice for the same item, the duplicate is refunded in full; our system flags these automatically. If a payment fails or expires, nothing is charged; if your bank shows a charge for a failed payment, contact us and we will reconcile it with the payment provider and refund any amount we received. Payments made in error (wrong amount or item) are refunded or corrected in full."] },
      { h: "7. Visa refusal", p: ["If your visa for a Programme country is refused despite a timely, complete application, and you send us the refusal letter, we refund all Programme payments (deposit and balance, or mentoring fee not yet used) minus costs we have already paid to third parties on your behalf and cannot recover, which we will itemise. Elco Pro follows section 2."] },
      { h: "8. Medical reasons", p: ["If you cannot travel for a medical reason supported by a doctor's certificate, you may choose a refund on the same basis as section 7, or [a transfer of your payments to a future GIF batch]."] },
      { h: "9. Cancellation or major change by IELSco", p: ["If we cancel the Programme, you receive a full refund of Programme payments (mentoring fee for sessions not delivered, deposit and balance), or, if you prefer, a transfer to a future batch. If we make a major change (to the dates or to the countries visited), you may withdraw within 14 days of our notice for the same full refund. Elco Pro already activated is not refunded because it has been supplied."] },
      { h: "10. Force majeure", p: ["If the Programme cannot go ahead because of events beyond our reasonable control (for example natural disasters, epidemics, war, government restrictions or border closures), we will offer a transfer to a future batch or a refund of Programme payments minus documented costs that cannot be recovered."] },
      { h: "11. Misconduct", p: ["A delegate removed from the Programme for a serious breach of the Code of Conduct is not entitled to a refund, and is responsible for their own costs of returning home."] },
      { h: "12. Team member withdrawal", p: ["If a team member withdraws, their payments are refunded (or not) under this policy as for an individual. The remaining members continue: a team of two may continue as a team, a single remaining member continues as an individual applicant in the same pathway. Selection results apply to the application as submitted; we may review a funded award if the team changes after results."] },
      { h: "13. Your statutory rights", p: ["This policy does not take away rights you have under Indonesian consumer protection law (Law No. 8 of 1999)."] },
    ],
  },
  "privacy-policy": {
    slug: "privacy-policy", title: "Privacy Policy",
    intro: `How ${CO} processes personal data for GIF. Version ${LEGAL_VERSION}. Written with Law No. 27 of 2022 on Personal Data Protection ("UU PDP") in mind; it has not yet been reviewed by counsel and does not claim compliance.`,
    blocks: [
      { h: "1. Who is responsible", p: [`The data controller is ${CO}. Contact for privacy requests: ${CONTACT}.`] },
      { h: "2. What we collect", ul: ["Account: email address and sign-in records (time, IP address, browser) for security.", "Application: legal name, email, WhatsApp number, nationality, country of residence, date of birth, institution, education level, academic background, country of study, emergency contact, team details, project idea, experience, motivation and how you heard about us.", "Documents you upload: for example essays, pitch decks, video pitches, identity or student documents and payment proofs.", "Payments: items, amounts, currency, status and transaction references from our payment provider. We do not receive or store full card numbers.", "Consents: which documents you accepted, their version, the time and your IP address.", "Selection: evaluator scores and feedback on your submissions.", "Analytics (only if you allow it): anonymous page views and clicks keyed to a random browser ID, with country from our hosting provider. No IP address is stored for analytics."] },
      { h: "3. Why we use it (purposes and legal bases)", ul: ["To run your application, selection, payments and participation (performance of our agreement with you).", "To meet legal, tax and accounting obligations (legal obligation).", "To keep the platform secure and prevent fraud and duplicate applications (legitimate interest).", "Optional analytics and media use (your consent, which you can withdraw at any time).", "Children's data (under 18): processed with the consent of a parent or guardian, collected during preparation."] },
      { h: "4. Who we share it with", ul: ["Service providers acting on our instructions: cloud database and file storage, website hosting, transactional email, and our payment provider (Midtrans).", "Evaluators and mentors, only to the extent needed for selection and mentoring.", "Programme partners and venues (for example universities, accommodation and transport providers), only the data needed for your participation, once you are a confirmed participant.", "Authorities where the law requires it.", "We do not sell personal data."] },
      { h: "5. International transfers", p: ["Some providers store data on servers outside Indonesia, and the Programme takes place in Singapore, Malaysia and Thailand. Where we transfer personal data abroad, we do so with safeguards and as permitted by UU PDP."] },
      { h: "6. How long we keep it", ul: ["Applications and selection records: [until 31 December 2028], then deleted or anonymised.", "Payment and tax records: as long as Indonesian accounting and tax law requires.", "Unsubmitted drafts: deleted [12 months] after the cohort ends.", "Sign-in codes expire after 10 minutes; sessions after 30 days."] },
      { h: "7. Your rights", p: ["Under UU PDP you may, among other rights, request information about and access to your data, correct it, request deletion, withdraw consent, object to certain processing and complain to the authority. Write to " + CONTACT + "; we may need to verify your identity. UU PDP provided a two-year adjustment period from 17 October 2022 (Article 74)."] },
      { h: "8. Security", p: ["Data is stored in a private database and private file storage accessible only to our servers. Files are shared through short-lived signed links. Staff access is role-based and logged. If a personal data breach occurs we will notify affected people and the authority as UU PDP requires."] },
      { h: "9. Cookies", ul: ["Essential: a sign-in session cookie (HttpOnly) and a country cookie used to show prices in the right currency.", "Optional: analytics, only after you click \"Allow analytics\". You can change your choice by clearing this site's storage."] },
      { h: "10. Electronic system operator", p: ["IELSco operates this website as a private-scope electronic system operator under Government Regulation No. 71 of 2019 and Minister of Communication and Informatics Regulation No. 5 of 2020 (as amended). [Counsel to confirm the PSE registration status for gif.ielsco.com.]"] },
    ],
  },
  "payment-terms": {
    slug: "payment-terms", title: "Payment Terms",
    intro: `Prices, currencies and how payments work for GIF Summer 2027. Version ${LEGAL_VERSION}.`,
    blocks: [
      { h: "1. Prices (per delegate)", ul: ["Fully Funded Phase 1 — Elco Pro, 3 months: IDR 99,000 (for all applicants).", "Project Mentoring Program — Early Bird: USD 80 / IDR 1,200,000; Regular: USD 100 / IDR 1,500,000.", "Self-Funded — USD 900 / IDR 15,000,000: deposit USD 300 / IDR 5,000,000, balance USD 600 / IDR 10,000,000.", "Partial Funded delegates pay the amount stated in their result letter."] },
      { h: "2. Currency", p: ["Indonesian citizens pay in IDR; all other delegates pay in USD. We do not convert prices with an exchange rate. Your bank may apply its own conversion and fees, which are your responsibility."] },
      { h: "3. How to pay", ul: ["IDR: online through Midtrans from your portal. Available methods depend on Midtrans and may include cards, bank transfer virtual accounts and e-wallets.", "USD: by invoice and international bank transfer; request an invoice from your portal. [If enabled, international delegates may instead pay the published IDR price by card through Midtrans.]", "Instalments: not offered."] },
      { h: "4. When a payment counts", p: ["A payment counts only when it has been verified: by a signed notification from Midtrans confirmed with Midtrans's status service, or, for bank transfers, by IELSco finance. Returning from the payment page, or a screenshot, is not confirmation. Your portal shows the verified status and issues a receipt."] },
      { h: "5. Deposits, balances and due dates", p: ["A Self-Funded seat is confirmed only when the deposit is verified, and seats are limited. The balance due date is shown in your portal [recommended: 30 June 2027]. If the balance is not paid by its due date, we may cancel the seat after a reminder, and the Refund & Cancellation Policy applies."] },
      { h: "6. Duplicate payments", p: ["Our system prevents duplicate payment obligations. If you nevertheless pay twice for the same item, the duplicate is detected and refunded in full."] },
      { h: "7. Receipts and invoices", p: ["A receipt is available in your portal for every verified payment. Contact us if you need an invoice in a sponsor's name."] },
    ],
  },
  "selection-terms": {
    slug: "selection-terms", title: "Scholarship & Selection Terms",
    intro: `How Fully Funded and Partial Funded places are decided. Version ${LEGAL_VERSION}.`,
    blocks: [
      { h: "1. Places", p: ["10 Fully Funded and 10 Partial Funded places are awarded per application (an individual or a team). Partial Funded is an outcome of the selection, not a separate pathway. We may award fewer places if not enough applications meet the standard."] },
      { h: "2. Phases", ul: ["Phase 1 (25 November 2026 – 10 May 2027): online application, Elco Pro and social media tasks (each verified by IELSco).", "Phase 2 (11–24 May 2027): project essay and pitch deck.", "Phase 3 (25–31 May 2027): recorded video pitch, 3 days to submit, then 4 days of evaluation.", "Project Mentoring Program mentees enter at Phase 3 and are evaluated in exactly the same way."] },
      { h: "3. Criteria", p: ["Problem identification, innovation, impact, feasibility, sustainability, leadership and teamwork, and presentation, each scored from 1 to 10 by assigned evaluators."] },
      { h: "4. Results", p: ["Results are published on 1 June 2027 in your portal and by email: Fully Funded, Partial Funded or Not Selected. Decisions are final; we will share evaluator feedback on request where available."] },
      { h: "5. What awards cover", p: ["[The exact coverage of Fully Funded and Partial Funded awards (for example programme fee, accommodation, in-programme transport, flights) is to be confirmed before launch and stated in each result letter.] Funding is never guaranteed, and paying for Elco Pro or mentoring does not improve your chance of selection."] },
      { h: "6. Integrity", p: ["Submissions must be your own (or your team's) work. Using someone else's work without credit, or false information, leads to disqualification. Evaluators declare conflicts of interest."] },
      { h: "7. Accepting an award", p: ["Selected delegates accept their offer in the portal by the date stated in the result letter, then complete participant preparation. An award is personal and cannot be transferred."] },
    ],
  },
  "mentoring-terms": {
    slug: "mentoring-terms", title: "Mentoring Program Terms",
    intro: `Terms for the GIF Project Mentoring Program. Version ${LEGAL_VERSION}.`,
    blocks: [
      { h: "1. The programme", p: ["15 weekly sessions every Tuesday from 2 February to 11 May 2027, covering problem identification, design thinking, ideation, research, development, business model, impact measurement, sustainability, pitch deck and pitching. Mentors are student startup founders from NUS, UTM and Chulalongkorn; their profiles are published as they are confirmed. Session times are sent to enrolled mentees."] },
      { h: "2. Price", p: ["Early Bird USD 80 / IDR 1,200,000; Regular USD 100 / IDR 1,500,000. Indonesian citizens pay in IDR, others in USD."] },
      { h: "3. Selection shortcut", p: ["Enrolled mentees skip Phases 1 and 2 of the Fully Funded selection and may submit a Phase 3 video pitch, which is evaluated in exactly the same way as other applicants'. Mentoring does not guarantee selection."] },
      { h: "4. Cashback", ul: ["If selected as Fully Funded: USD 20 / IDR 300,000. If selected as Partial Funded: USD 50 / IDR 750,000.", "Paid only after results are published and after verification of your identity, enrolment and payment, to an account in your name, within [30 days] of verification.", "Not selected: no cashback; you keep the full mentoring programme."] },
      { h: "5. Refunds", p: ["See section 3 of the Refund & Cancellation Policy."] },
    ],
  },
  "code-of-conduct": {
    slug: "code-of-conduct", title: "Code of Conduct",
    intro: "Applies to every delegate, mentor, evaluator, volunteer and staff member, online and during the Programme.",
    blocks: [
      { h: "We expect", ul: ["Respect for every person regardless of nationality, religion, ethnicity, gender, disability or background.", "Honesty in applications, submissions and payments.", "Following local laws, venue rules and the instructions of programme staff, especially on safety.", "Attending sessions on time and taking part in your team's work.", "Respect for others' privacy: ask before photographing or posting about other delegates."] },
      { h: "We do not accept", ul: ["Harassment, bullying, discrimination, or sexual misconduct of any kind.", "Violence, threats or possession of weapons.", "Illegal drugs; alcohol for anyone under the legal drinking age, or excessive drinking by anyone.", "Leaving the group or accommodation without informing staff.", "Plagiarism or falsified information."] },
      { h: "Reporting", p: ["Report concerns to any staff member or confidentially to hello@ielsco.com. We will act promptly and protect people who report in good faith."] },
      { h: "Consequences", p: ["Depending on seriousness: a warning, exclusion from activities, removal from the Programme at your own cost and without refund, disqualification, and where required, referral to authorities. Parents or guardians of minors will be informed."] },
    ],
  },
  "travel-visa-disclaimer": {
    slug: "travel-visa-disclaimer", title: "Travel & Visa Disclaimer",
    intro: "Your responsibilities for travelling to and between Singapore, Malaysia and Thailand.",
    blocks: [
      { h: "Passports and visas", p: ["You are responsible for holding a passport valid for at least six months after the Programme ends and any visas or entry permits your nationality requires for Singapore, Malaysia and Thailand. We provide supporting documents (for example an invitation letter) during participant preparation, but visa decisions are made by the relevant authorities and we cannot guarantee them. Refunds after a visa refusal follow section 7 of the Refund & Cancellation Policy."] },
      { h: "Travel to and from the Programme", p: ["Unless your award letter says otherwise, you arrange and pay for travel to the starting point in Singapore and home from Thailand, at the times given in the preparation briefing."] },
      { h: "Insurance and health", p: ["Travel and health insurance covering the whole Programme is required, and proof is collected during preparation. Tell us about medical conditions, allergies or accessibility needs so we can plan; this information is treated as sensitive and shared only as needed for your care."] },
      { h: "Minors", p: ["Delegates under 18 need written consent from a parent or legal guardian, and any travel consent documents their country requires."] },
      { h: "Risks", p: ["International travel involves risks (delays, illness, lost belongings). We plan with care and follow official travel advice, but are not responsible for losses caused by third-party carriers or events outside our control."] },
    ],
  },
  "media-consent": {
    slug: "media-consent", title: "Media Consent",
    intro: "Your choice about photos and video taken during GIF. Optional: it does not affect your application.",
    blocks: [
      { h: "If you consent", p: ["IELSco may take photos and video of you during the Programme and online sessions, and use them, without payment, on IELSco and Elco websites, social media, reports and promotional materials, together with your first name, country and team. We will not use your image in a way that is misleading or harmful, and we never sell images to third parties."] },
      { h: "If you do not consent", p: ["Tell us your choice in your application. We will avoid featuring you and will blur or remove you where practical. Group photos in which you are not the focus may still be taken."] },
      { h: "Changing your mind", p: ["You can withdraw consent at any time at hello@ielsco.com. We will stop new uses and remove your image from our own channels within a reasonable time; printed materials already distributed cannot be recalled."] },
      { h: "Under 18", p: ["For delegates under 18, a parent or guardian's consent is also required."] },
    ],
  },
};

export const LEGAL_SOURCES = [
  { label: "Law No. 8 of 1999 on Consumer Protection (full text, JDIH Ministry of Finance)", href: "https://jdih.kemenkeu.go.id/fulltext/1999/8TAHUN~1999UU.htm" },
  { label: "Law No. 27 of 2022 on Personal Data Protection (JDIH Komdigi)", href: "https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/" },
  { label: "Minister of Communication and Informatics Regulation No. 5 of 2020 on Private-Scope Electronic System Operators (JDIH Komdigi)", href: "https://jdih.komdigi.go.id/produk_hukum/view/id/759/t/peraturan+menteri+komunikasi+dan+informatika+nomor+5+tahun+2020" },
  { label: "Midtrans: currency (IDR only)", href: "https://docs.midtrans.com/docs/can-i-receive-payments-using-other-currency-than-idr" },
  { label: "Midtrans: refund transaction", href: "https://docs.midtrans.com/reference/refund-transaction" },
];
