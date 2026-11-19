// Legal document registry. Versions are recorded with every consent (gif.consents.document_version). Bump a version
// when its text changes materially; candidates are then asked to accept again before their next payment.
// STATUS: drafts for review by Indonesian counsel. They are not legal advice and do not claim regulatory compliance.

export const LEGAL_VERSION = "2026-11-25-draft-1";

export type ConsentCategory = "terms" | "privacy" | "payment" | "refund" | "selection" | "mentoring" | "conduct" | "travel" | "media" | "analytics";

export const DOCS: { slug: string; title: string; category: ConsentCategory; summary: string }[] = [
  { slug: "terms-and-conditions", title: "Terms & Conditions", category: "terms", summary: "The agreement between you and IELSco for GIF Summer 2027." },
  { slug: "refund-policy", title: "Refund & Cancellation Policy", category: "refund", summary: "What is refundable, when, and how." },
  { slug: "privacy-policy", title: "Privacy Policy", category: "privacy", summary: "What personal data we collect, why, and your rights." },
  { slug: "payment-terms", title: "Payment Terms", category: "payment", summary: "Prices, currencies, deposits, balances and receipts." },
  { slug: "selection-terms", title: "Scholarship & Selection Terms", category: "selection", summary: "How Fully Funded and Partial Funded places are decided." },
  { slug: "mentoring-terms", title: "Mentoring Program Terms", category: "mentoring", summary: "The 15-session Project Mentoring Program and its cashback." },
  { slug: "code-of-conduct", title: "Code of Conduct", category: "conduct", summary: "How every delegate, mentor and staff member behaves." },
  { slug: "travel-visa-disclaimer", title: "Travel & Visa Disclaimer", category: "travel", summary: "Your responsibilities for passports, visas, insurance and travel." },
  { slug: "media-consent", title: "Media Consent", category: "media", summary: "Photos and video taken during the programme (optional)." },
];

// What an applicant must accept when submitting each pathway (media consent is optional and separate).
export function requiredConsents(pathway: "fully_funded" | "mentoring" | "self_funded"): ConsentCategory[] {
  const base: ConsentCategory[] = ["terms", "privacy", "payment", "refund", "conduct", "travel"];
  if (pathway === "fully_funded") return [...base, "selection"];
  if (pathway === "mentoring") return [...base, "selection", "mentoring"];
  return base;
}

// Accepted before any payment can start.
export const PAYMENT_CONSENTS: ConsentCategory[] = ["terms", "payment", "refund"];
