// Published programme copy and default CMS content. Everything here is a programme fact from the GIF Summer 2027 brief
// or a verifiable record of GIF 2026; nothing is invented. Admins can replace FAQ, mentors, testimonials and photos in
// Admin → Content (stored in gif.content and read through getContent()).
import { DEFAULT_SETTINGS, promoted, type Money, type Settings } from "./settings.ts";

// primary: shown in the desktop header bar (IELSco keeps the bar short); every item appears in the mobile menu and footer.
// Self-Funded campaign (24 Nov 2026): Fully Funded, Selection and Mentorship are not in the navigation while
// settings.campaign.public_pathways promotes Self-Funded only; their pages still work for anyone who has the link.
export const NAV: { href: string; label: string; primary?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/program", label: "Program", primary: true },
  { href: "/competition", label: "Competition", primary: true },
  { href: "/self-funded", label: "Self-Funded", primary: true },
  { href: "/about", label: "About", primary: true },
  { href: "/previous-gif", label: "Previous GIF" },
  { href: "/sponsorship", label: "Sponsorship Support" },
  { href: "/faq", label: "FAQ", primary: true },
];

// ── Competition (founder clarification, 24 Nov 2026) ──────────────────────────────────────────────────────────────
// USD 5,000 is the TOTAL prize pool across four award levels and ten award recipients, all from the Top 10 finalists.
// Not decided yet (do not publish an invented answer): the amount per award level, individual vs team awards and how a
// team's prize is shared, the final scorecard, the Public Choice Award and public voting, disbursement terms, the venue.
export const COMPETITION = {
  prizePoolUsd: 5000,
  finalists: 10,
  finale: { date: "2027-08-02", day: 7, city: "Bangkok", country: "Thailand", name: "Global Impact Conference & Innovation Expo" },
  stages: [
    { n: 1, country: "Singapore", flag: "🇸🇬", title: "Business Model Blueprint", weight: 25,
      body: "Turn your idea into a business model for a social-impact project: the problem, the people it serves, the solution and how it keeps going." },
    { n: 2, country: "Malaysia", flag: "🇲🇾", title: "ASEAN Youth SDGs Semi-Final Pitching Battle", weight: 35,
      body: "Pitch your project and the Sustainable Development Goals it works towards. After the Singapore and Malaysia stages, ten finalists are selected for the Grand Finale." },
    { n: 3, country: "Thailand", flag: "🇹🇭", title: "Public Innovation Booth Expo & Live Demo", weight: 40,
      body: "The Top 10 pitch on the main conference stage and exhibit their projects at innovation booths, with live demonstrations for visitors and judges." },
  ],
  // Highest first. The split of the pool between levels is subject to management approval.
  awards: [
    { level: "Grand Award", recipients: 1 },
    { level: "Gold Award", recipients: 2 },
    { level: "Silver Award", recipients: 3 },
    { level: "Bronze Award", recipients: 4 },
  ],
} as const;

export type Photo = { src: string; alt: string; caption: string; w: number; h: number };
// GIF 2026 photographs supplied by IELSco (Batch 2, Singapore, November 2026).
export const PHOTOS: Record<string, Photo> = {
  nusSign: { src: "/photos/nus-sign.jpg", alt: "GIF 2026 delegates in white fellowship T-shirts sitting in two rows in front of the orange #NUS sign on campus", caption: "GIF 2026 delegates at the National University of Singapore campus.", w: 720, h: 1280 },
  nusSelfie: { src: "/photos/nus-selfie.jpg", alt: "Selfie of smiling GIF 2026 delegates on the NUS campus lawn, the #NUS sign and a residential tower behind them", caption: "Campus day, NUS, Singapore.", w: 720, h: 1280 },
  classroom: { src: "/photos/classroom-group.jpg", alt: "GIF 2026 delegates in fellowship T-shirts posing in a seminar room in front of a projected slide", caption: "Project incubation session, GIF 2026.", w: 720, h: 1280 },
  awarding: { src: "/photos/day3-awarding.jpg", alt: "Delegates holding certificates of achievement under a slide reading Four teams, Twelve delegates, One connected generation", caption: "Awarding: four teams, twelve delegates.", w: 720, h: 1280 },
  jewel: { src: "/photos/jewel-changi.jpg", alt: "Group selfie of GIF 2026 delegates at Jewel Changi Airport with the indoor waterfall behind them", caption: "Arrival at Jewel Changi Airport.", w: 960, h: 1280 },
  marina: { src: "/photos/marina-bay-night.jpg", alt: "Night-time group selfie of delegates on the Marina Bay waterfront with Marina Bay Sands lit up behind them", caption: "Evening at Marina Bay.", w: 960, h: 1280 },
  mrt: { src: "/photos/mrt-mirror.jpg", alt: "Delegates taking a mirror selfie in a Singapore MRT station passage lined with flower murals", caption: "Getting around Singapore by MRT.", w: 720, h: 1280 },
  museumGroup: { src: "/photos/museum-group.jpg", alt: "Delegates posing on the wooden floor of an art gallery in front of large Southeast Asian paintings", caption: "Gallery visit, Singapore.", w: 1280, h: 960 },
  museumSelfie: { src: "/photos/museum-selfie.jpg", alt: "Selfie of delegates in an art gallery with a large painting of figures in red behind them", caption: "Culture and conversation between sessions.", w: 960, h: 1280 },
};

// pathway: shown only while that pathway is promoted (see keyDates). No pathway = everyone.
export const KEY_DATES = [
  { date: "2026-11-20", label: "Self-Funded registration opens: 20 Super Early Bird places, then 50 Regular places", key: true, pathway: "self_funded" },
  { date: "2026-11-25", label: "Open Recruitment: Phase 1 administration opens", key: true, pathway: "fully_funded" },
  { date: "2026-12-31", label: "Mentoring Early Bird deadline (23:59 WIB)", key: false, pathway: "mentoring" },
  { date: "2027-02-02", end: "2027-05-11", label: "Project Mentoring Program: 15 weekly sessions", key: false, pathway: "mentoring" },
  { date: "2027-05-10", label: "Phase 1 administration closes", key: true, pathway: "fully_funded" },
  { date: "2027-05-11", end: "2027-05-24", label: "Phase 2: project essay and pitch deck", key: false, pathway: "fully_funded" },
  { date: "2027-05-25", end: "2027-05-31", label: "Phase 3: video presentation (3 days to submit, then 4 days of evaluation)", key: false, pathway: "fully_funded" },
  { date: "2027-06-01", label: "Final results: Fully Funded, Partial Funded or Not Selected", key: true, pathway: "fully_funded" },
  { date: "2027-06-08", end: "2027-07-26", label: "Pre-departure preparation: payment, visa, travel, insurance, orientation", key: false },
  { date: "2027-06-30", label: "Balance payment deadline", key: false },
  { date: "2027-07-27", end: "2027-08-03", label: "GIF Summer 2027: Singapore → Malaysia → Thailand", key: true },
  { date: "2027-08-02", label: "Grand Finale in Bangkok: the Top 10 at the Global Impact Conference & Innovation Expo", key: true },
] as const;

export function keyDates(s: Settings) {
  return KEY_DATES.filter((d) => !("pathway" in d) || promoted(s, d.pathway as "self_funded" | "fully_funded" | "mentoring"));
}

export type Faq = { q: string; a: string; group: string };

const idr = (n: number) => `IDR ${new Intl.NumberFormat("en-US").format(n)}`;
const usd = (n: number) => `USD ${new Intl.NumberFormat("en-US").format(n)}`;
const pair = (m: Money) => `${usd(m.USD)} (international) / ${idr(m.IDR)} (Indonesian)`;
const day = (iso: string | null) => (iso ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso)) : "to be announced");

// The default FAQ, built from the programme settings so prices and dates always match checkout. Admins can replace it
// in Admin → Content (a stored FAQ is used as written).
// IDR minimum in USD at the card rate, rounded up to the cent (IDR 2,500,000 at 18,500 → 135.14). Mirrors lib/pricing minInstallment.
const minInstallmentUsd = (s: Settings) => (Math.ceil((s.payments.min_installment_idr / s.payments.usd_idr_card_rate) * 100) / 100).toFixed(2);

export function defaultFaq(s: Settings): Faq[] {
  const p = s.prices;
  const pf = p.partial_funded_payable;
  const pool = `USD ${COMPETITION.prizePoolUsd.toLocaleString("en-US")}`;
  return [
    { group: "Programme", q: "What is GIF Summer 2027?", a: "The Global Impact Fellowship Summer 2027 is an 8-day, 7-night international youth programme by IELSco, from 27 July to 3 August 2027, travelling from Singapore through Malaysia to Thailand. Delegates develop a social-impact project through a three-stage competition that ends at the Global Impact Conference & Innovation Expo in Bangkok." },
    { group: "Programme", q: "Who can join?", a: "High school, undergraduate and college students. You can apply individually or as a team of 2–3 people. Up to 100 delegates take part. Applicants under 18 can join with the written consent of a parent or legal guardian." },
    { group: "Programme", q: "Are NUS, Universiti Malaya and Chulalongkorn partners?", a: "Engagement with these universities is planned, not confirmed. We will mark each one as confirmed on this site only once it is agreed in writing. Nothing on this site should be read as an endorsement by these universities." },
    { group: "Competition", q: "What is the USD 5,000 prize pool?", a: `${pool} is the total prize pool of the GIF Summer 2027 competition, shared across four award levels: 1 Grand Award, 2 Gold Awards, 3 Silver Awards and 4 Bronze Awards, ten award recipients in all. It is not a single USD 5,000 prize, the levels do not receive equal amounts, and the amount for each level will be announced before the programme.` },
    { group: "Competition", q: "Who can win an award?", a: `Awards go to the Top ${COMPETITION.finalists} finalists, who are selected after the Singapore and Malaysia stages. Taking part does not guarantee a place in the Top ${COMPETITION.finalists} or any prize money.` },
    { group: "Competition", q: "How is the competition scored?", a: COMPETITION.stages.map((st) => `${st.country}, Stage ${st.n}: ${st.title} (${st.weight}%)`).join("; ") + ". Together, 100%. The detailed scorecard is shared with delegates before the programme." },
    { group: "Competition", q: "What happens at the Grand Finale?", a: "On 2 August 2027 (Day 7) in Bangkok, the Top 10 present their projects on the main stage of the Global Impact Conference & Innovation Expo and exhibit them at innovation booths, where visitors can explore each project, see demonstrations, ask questions and give feedback. The event is planned to be open to the public, subject to venue capacity, approvals and final arrangements." },
    { group: "Competition", q: "Are awards given to individuals or teams?", a: "This is being finalised, together with how a team shares its prize, the final judging criteria and how prizes are paid. We will publish these rules before the programme starts." },
    { group: "Self-Funded", q: "How do I join GIF Summer 2027?", a: `Register as a Self-Funded delegate from your IELSco Dashboard: there is no essay, pitch deck or video. Your seat is confirmed once your first payment (the deposit) is verified. There are ${s.slots.self_funded_early} Super Early Bird places (${usd(p.self_funded_early_total.USD)} / ${idr(p.self_funded_early_total.IDR)}) and then ${s.slots.self_funded_regular} Regular places (${usd(p.self_funded_total.USD)} / ${idr(p.self_funded_total.IDR)}).` },
    { group: "Self-Funded", q: "How do the Super Early Bird places work?", a: `The first ${s.slots.self_funded_early} Self-Funded delegates whose first payment is verified pay the Super Early Bird fee. Everyone registers at the Regular fee; when your deposit is verified as one of the first ${s.slots.self_funded_early}, your fee is reduced automatically and your portal shows the new balance. The number of places left is shown on this site.` },
    { group: "Self-Funded", q: "Can I switch pathways later?", a: "Contact us before paying. After payment, a change is handled case by case under the Refund & Cancellation Policy." },
    { group: "Fully Funded", q: "What are the ways to join?", a: `1) Fully Funded application: a competitive three-phase selection for ${s.slots.fully_funded} Fully Funded and ${s.slots.partial_funded} Partial Funded places. 2) Project Mentoring Program: 15 weekly sessions; mentees go straight to Phase 3 of the selection. 3) Self-Funded: direct registration, subject to capacity and the deposit, with no essay, deck or video.` },
    { group: "Fully Funded", q: "Is Partial Funded a separate pathway?", a: "No. Partial Funded is one of the outcomes of the Fully Funded selection, together with Fully Funded and Not Selected." },
    { group: "Fully Funded", q: "What does Fully Funded cover?", a: `${s.awards.fully_funded_covers.join(", ")}. Not included: ${s.awards.not_included.join(", ").toLowerCase()}.` },
    { group: "Fully Funded", q: "What does Partial Funded mean?", a: pf ? `Partial Funded delegates pay a reduced participant contribution of ${pair(pf)} instead of the Self-Funded fee. ${s.awards.not_included.join(", ")} are not included.` : "The Partial Funded contribution is announced with the results." },
    { group: "Fully Funded", q: "Why does Phase 1 include Elco Pro?", a: `Phase 1 includes ${p.elco_pro_months} months of Elco Pro, IELSco's AI English practice app, for ${idr(p.elco_pro_idr)}. It is a product you use and keep, not an application fee, and you keep it whatever your selection result.` },
    { group: "Fully Funded", q: "What else is in Phase 1?", a: "Besides the online application and Elco Pro, each delegate completes a few social media tasks (follow @iels.co and @elco.ai, like the recruitment post, comment and tag 3 friends, and share it to your Story). You report them in your portal and our team verifies each one. Phase 1 is complete only when your Elco Pro payment and every task are verified." },
    { group: "Fully Funded", q: "Is funding guaranteed?", a: `No. Places are competitive: ${s.slots.fully_funded} Fully Funded and ${s.slots.partial_funded} Partial Funded. Results are announced on 1 June 2027.` },
    { group: "Fully Funded", q: "What happens in Phases 2 and 3?", a: "Phase 2 (11–24 May 2027): a project essay and a pitch deck of 10–12 slides. Phase 3 (25–31 May 2027): a video presentation of 3–5 minutes, with 3 days to record and submit, followed by 4 days of evaluation." },
    { group: "Mentoring", q: "How much is the mentoring and when does Early Bird end?", a: `Early Bird: ${pair(p.mentoring_early)} until ${day(s.dates.mentoring_early_bird_until)}, 23:59 WIB. Regular: ${pair(p.mentoring_regular)}. The fee is per person, including for each member of a team.` },
    { group: "Mentoring", q: "How does the mentoring shortcut work?", a: "Mentees skip Phases 1 and 2 and go straight to Phase 3, where they are evaluated in exactly the same way as everyone else." },
    { group: "Mentoring", q: "What is the cashback?", a: `If a mentee is later selected: ${pair(s.cashback.fully_funded)} for Fully Funded, or ${pair(s.cashback.partial_funded)} for Partial Funded. It is paid after results are published and we have verified your identity, enrolment and mentoring payment, by bank transfer to an account in your name. If not selected, you keep the full mentoring programme and no cashback applies.` },
    { group: "Payments", q: "Which currency will I pay in?", a: "Indonesian participants pay the IDR price; international participants pay the USD price. Which one applies is set by the nationality you give in your application and shown in your portal. These are two separate published prices, not exchange-rate conversions; the only conversion is for an international participant who chooses to pay a USD item by card." },
    { group: "Payments", q: "How do I pay?", a: `IDR payments are made online through Midtrans; the methods offered are the ones shown on the Midtrans payment page for our account. For USD items you can request an invoice and pay by international bank transfer, verified by IELSco finance${s.payments.international_cards !== false ? `, or pay by Visa or Mastercard through Midtrans, which charges in IDR at a fixed rate of USD 1 = IDR ${s.payments.usd_idr_card_rate.toLocaleString("en-US")} (your USD price doesn't change; card acceptance depends on Midtrans and your bank)` : ""}. A payment counts only after it is verified.` },
    { group: "Payments", q: "When is my seat confirmed?", a: `When your first payment (the deposit) is verified, subject to available places. You choose the amount: at least IDR ${s.payments.min_installment_idr.toLocaleString("en-US")} (USD ${minInstallmentUsd(s)} at USD 1 = IDR ${s.payments.usd_idr_card_rate.toLocaleString("en-US")}), up to the full fee. Pay it within ${s.dates.deposit_due_days ?? 7} days of registering. The rest can be paid in installments of at least the same amount (a last, smaller payment is fine) by ${day(s.dates.balance_due)}.` },
    { group: "Payments", q: "Can I get a refund?", a: "It depends on what you paid for and when. Read the Refund & Cancellation Policy before paying; you accept it as part of your application." },
    { group: "Travel", q: "Do I need a visa and insurance?", a: "It depends on your passport. You are responsible for your passport, visas and travel insurance. During pre-departure preparation (8 June – 26 July 2027) we provide documents and guidance, but we cannot guarantee any visa decision." },
    { group: "Sponsorship", q: "Can IELSco help me find a sponsor?", a: "We can prepare documentation (for example an invitation letter and programme description) for you to approach sponsors. We do not guarantee sponsorship." },
  ];
}

// FAQ groups about a pathway the campaign doesn't promote are left out of the public FAQ (stored FAQs too).
export function visibleFaq(items: Faq[], s: Settings): Faq[] {
  return items.filter((f) => !(((f.group === "Fully Funded" || f.group === "Pathways" || f.group === "Funding") && !promoted(s, "fully_funded")) || (f.group === "Mentoring" && !promoted(s, "mentoring"))));
}

// Tuesdays from 2 Feb to 11 May 2027 (15 sessions).
export const MENTORING_SESSIONS = [
  ["2027-02-02", "Kick-off: from a cause you care about to a problem worth solving", "Problem identification"],
  ["2027-02-09", "Root causes, evidence and who is affected", "Problem identification"],
  ["2027-02-16", "Design thinking I: empathy and listening to users", "Design thinking"],
  ["2027-02-23", "Design thinking II: defining a sharp problem statement", "Design thinking"],
  ["2027-03-02", "Ideation: generating, comparing and choosing ideas", "Ideation"],
  ["2027-03-09", "Desk research: data, context and existing solutions", "Research"],
  ["2027-03-16", "Field research: interviews and validating assumptions", "Research"],
  ["2027-03-23", "Development I: from idea to prototype", "Development"],
  ["2027-03-30", "Development II: testing, feedback and iteration", "Development"],
  ["2027-04-06", "Business model: value, beneficiaries, costs and revenue", "Business model"],
  ["2027-04-13", "Impact measurement: theory of change and indicators", "Impact measurement"],
  ["2027-04-20", "Sustainability: funding, partnerships and scaling", "Sustainability"],
  ["2027-04-27", "Pitch deck: structure and storytelling", "Pitch deck"],
  ["2027-05-04", "Pitching: delivery, timing and Q&A", "Pitching"],
  ["2027-05-11", "Final rehearsal and Phase 3 readiness", "Pitching"],
] as const;

export const SELECTION_CRITERIA = [
  ["Problem identification", "A real, specific problem, understood with evidence and from the perspective of the people it affects."],
  ["Innovation", "A fresh approach, or a known approach adapted well to a new context."],
  ["Impact", "Clear, measurable change for the people and community you serve."],
  ["Feasibility", "A plan you can actually carry out with realistic resources and steps."],
  ["Sustainability", "How the project keeps going and growing after the programme."],
  ["Leadership and teamwork", "Ownership, initiative and, for teams, how you work together."],
  ["Presentation", "Clarity and persuasiveness of your essay, deck and video pitch."],
] as const;



export type Mentor = { name: string; role: string; org: string; photo?: string; bio?: string };
// Only status "approved" with recorded written consent is ever published. Pending slots hold the place for real quotes.
export type Testimonial = { quote: string; name: string; role: string; consent: boolean; status?: "pending" | "approved"; consent_reference?: string };
export type ContentKeys = { faq: Faq[]; mentors: Mentor[]; testimonials: Testimonial[]; photos: Photo[] };
export const CONTENT_DEFAULTS: ContentKeys = { faq: defaultFaq(DEFAULT_SETTINGS), mentors: [], testimonials: [1, 2, 3].map((i) => ({ quote: "", name: `GIF 2026 participant ${i} (awaiting quote and consent)`, role: "GIF 2026 delegate", consent: false, status: "pending" as const })), photos: Object.values(PHOTOS) };

export const ELCO_PRO_FEATURES = [
  "Placement check and a Daily Study Plan",
  "Learn activities for speaking, listening, reading and writing",
  "Elco Chat and Elco Call (spoken practice), with Pro allowances",
  "Feedback checks on your speaking and writing",
  "Look Up, Elco Help, a daily journal, vocabulary and progress tracking",
  "IELSco Daily Speaking Club and 4 mentoring sessions a month when you link your IELSco account",
];
