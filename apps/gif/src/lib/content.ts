// Published programme copy and default CMS content. Everything here is a programme fact from the GIF Summer 2027 brief
// or a verifiable record of GIF 2026; nothing is invented. Admins can replace FAQ, mentors, testimonials and photos in
// Admin → Content (stored in gif.content and read through getContent()).

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About GIF" },
  { href: "/program", label: "Program" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/selection-process", label: "Selection Process" },
  { href: "/mentoring", label: "Mentorship" },
  { href: "/sponsorship", label: "Sponsorship Support" },
  { href: "/previous-gif", label: "Previous GIF" },
  { href: "/faq", label: "FAQ" },
];

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

export const KEY_DATES = [
  { date: "2026-11-25", label: "Launch. Phase 1 opens", key: true },
  { date: "2027-02-02", label: "Project Mentoring Program starts (session 15 on 11 May)", key: false },
  { date: "2027-05-10", label: "Phase 1 closes", key: true },
  { date: "2027-05-11", end: "2027-05-24", label: "Phase 2: project essay and pitch deck", key: false },
  { date: "2027-05-25", end: "2027-05-31", label: "Phase 3: recorded video pitch (3 days) and evaluation (4 days)", key: false },
  { date: "2027-06-01", label: "Results: Fully Funded, Partial Funded or Not Selected", key: true },
  { date: "2027-06-08", label: "Participant preparation starts: payment, visa, travel, insurance, orientation (about 7 weeks)", key: false },
  { date: "2027-07-27", end: "2027-08-03", label: "GIF Summer 2027: Singapore → Malaysia → Thailand", key: true },
] as const;

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

export type Faq = { q: string; a: string; group: string };
export const DEFAULT_FAQ: Faq[] = [
  { group: "Programme", q: "What is GIF Summer 2027?", a: "The Global Impact Fellowship Summer 2027 is an 8-day, 7-night international youth programme by IELSco, from 27 July to 3 August 2027, travelling from Singapore through Malaysia to Thailand. Delegates develop social impact projects, with planned university engagement, a conference and an awarding." },
  { group: "Programme", q: "Who can join?", a: "High school, undergraduate and college students. You can apply individually or as a team of 2–3 people. Up to 100 delegates take part." },
  { group: "Programme", q: "Are NUS, Universiti Malaya and Chulalongkorn partners?", a: "Engagement with these universities is planned, not confirmed. We will mark each one as confirmed on this site only once it is agreed in writing. Nothing on this site should be read as an endorsement by these universities." },
  { group: "Pathways", q: "What are the three ways to join?", a: "1) Fully Funded application: a competitive three-phase selection for 10 Fully Funded and 10 Partial Funded places. 2) Project Mentoring Program: 15 weekly sessions, and mentees go straight to Phase 3 of the selection. 3) Self-Funded: direct registration with a deposit, no essay, deck or video." },
  { group: "Pathways", q: "Is Partial Funded a separate pathway?", a: "No. Partial Funded is one of the outcomes of the Fully Funded selection, together with Fully Funded and Not Selected." },
  { group: "Pathways", q: "Can I switch pathways later?", a: "Contact us before paying. After payment, a change is handled case by case under the Refund & Cancellation Policy." },
  { group: "Fully Funded", q: "Why does Phase 1 include Elco Pro?", a: "Phase 1 is your online application plus 3 months of Elco Pro, IELSco's AI English practice app, for IDR 99,000 (Elco Pro is normally IDR 99,000 a month). It is a product you use and keep, not an application fee. You keep it even if you are not selected." },
  { group: "Fully Funded", q: "Is funding guaranteed?", a: "No. Places are competitive: 10 Fully Funded and 10 Partial Funded. Results are announced on 1 June 2027." },
  { group: "Fully Funded", q: "What happens in Phases 2 and 3?", a: "Phase 2 (11–24 May 2027): a project essay and a pitch deck, following published guidelines. Phase 3 (25–31 May 2027): a recorded video pitch, with 3 days to record and submit, followed by 4 days of evaluation." },
  { group: "Mentoring", q: "How does the mentoring shortcut work?", a: "Mentees skip Phases 1 and 2 and go straight to Phase 3, where they are evaluated in exactly the same way as everyone else." },
  { group: "Mentoring", q: "What is the cashback?", a: "If a mentee is selected, they receive a cashback after selection and verification: USD 20 / IDR 300,000 for Fully Funded, USD 50 / IDR 750,000 for Partial Funded. If not selected, the mentee keeps the full mentoring programme and no cashback applies." },
  { group: "Payments", q: "Which currency will I pay in?", a: "Indonesian citizens pay in IDR. Everyone else pays in USD. Elco Pro is priced in IDR for everyone. We never convert prices with an exchange rate on your behalf." },
  { group: "Payments", q: "How do I pay?", a: "IDR payments are made online through Midtrans (cards, bank transfer, e-wallets and more, depending on availability). USD payments are made by invoice and bank transfer, verified by IELSco finance. A payment counts only after it is verified." },
  { group: "Payments", q: "When is my Self-Funded seat confirmed?", a: "When your deposit (USD 300 / IDR 5,000,000) is verified. The balance (USD 600 / IDR 10,000,000) is paid during participant preparation; the exact due date is shown in your portal." },
  { group: "Payments", q: "Can I get a refund?", a: "It depends on what you paid for and when. Read the Refund & Cancellation Policy before paying; you accept it as part of your application." },
  { group: "Travel", q: "Do I need a visa?", a: "It depends on your passport. You are responsible for your passport, visas and travel insurance. During participant preparation (from 8 June 2027) we provide documents and guidance, but we cannot guarantee any visa decision." },
  { group: "Sponsorship", q: "Can IELSco help me find a sponsor?", a: "We can prepare documentation (for example an invitation letter and programme description) for you to approach sponsors. We do not guarantee sponsorship." },
];

export type Mentor = { name: string; role: string; org: string; photo?: string; bio?: string };
export type Testimonial = { quote: string; name: string; role: string; consent: boolean };
export type ContentKeys = { faq: Faq[]; mentors: Mentor[]; testimonials: Testimonial[]; photos: Photo[] };
export const CONTENT_DEFAULTS: ContentKeys = { faq: DEFAULT_FAQ, mentors: [], testimonials: [], photos: Object.values(PHOTOS) };

export const ELCO_PRO_FEATURES = [
  "Placement check and a Daily Study Plan",
  "Learn activities for speaking, listening, reading and writing",
  "Elco Chat and Elco Call (spoken practice), with Pro allowances",
  "Feedback checks on your speaking and writing",
  "Look Up, Elco Help, a daily journal, vocabulary and progress tracking",
  "IELSco Daily Speaking Club and 4 mentoring sessions a month when you link your IELSco account",
];
