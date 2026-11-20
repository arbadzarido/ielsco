// Legal document registry. Versions are recorded with every consent (gif.consents.document_version). Bump a version
// when its text changes materially; candidates are then asked to accept again before their next payment.
// STATUS: drafts for review by Indonesian counsel. They are not legal advice and do not claim regulatory compliance.

// draft-2 (21 Nov 2026): founder decisions applied; Bahasa Indonesia primary text; parental consent added.
export const LEGAL_VERSION = "2026-11-21-draft-2";

export type ConsentCategory = "terms" | "privacy" | "payment" | "refund" | "selection" | "mentoring" | "conduct" | "travel" | "media" | "analytics" | "guardian" | "guardian_media";

export const DOCS: { slug: string; title: string; title_id: string; category: ConsentCategory; summary: string }[] = [
  { slug: "terms-and-conditions", title_id: "Syarat dan Ketentuan", title: "Terms & Conditions", category: "terms", summary: "The agreement between you and IELSco for GIF Summer 2027." },
  { slug: "refund-policy", title_id: "Kebijakan Pengembalian Dana & Pembatalan", title: "Refund & Cancellation Policy", category: "refund", summary: "What is refundable, when, and how." },
  { slug: "privacy-policy", title_id: "Kebijakan Privasi", title: "Privacy Policy", category: "privacy", summary: "What personal data we collect, why, and your rights." },
  { slug: "payment-terms", title_id: "Ketentuan Pembayaran", title: "Payment Terms", category: "payment", summary: "Prices, currencies, deposits, balances and receipts." },
  { slug: "selection-terms", title_id: "Ketentuan Beasiswa & Seleksi", title: "Scholarship & Selection Terms", category: "selection", summary: "How Fully Funded and Partial Funded places are decided." },
  { slug: "mentoring-terms", title_id: "Ketentuan Program Mentoring", title: "Mentoring Program Terms", category: "mentoring", summary: "The 15-session Project Mentoring Program and its cashback." },
  { slug: "code-of-conduct", title_id: "Kode Etik", title: "Code of Conduct", category: "conduct", summary: "How every delegate, mentor and staff member behaves." },
  { slug: "travel-visa-disclaimer", title_id: "Ketentuan Perjalanan, Visa & Asuransi", title: "Travel, Visa & Insurance Terms", category: "travel", summary: "Your responsibilities for passports, visas, insurance and travel." },
  { slug: "parental-consent", title_id: "Persetujuan Orang Tua/Wali", title: "Parental / Guardian Consent", category: "guardian", summary: "How participants under 18 take part with a guardian's consent." },
  { slug: "media-consent", title_id: "Persetujuan Penggunaan Foto & Video", title: "Media Consent", category: "media", summary: "Photos and video taken during the programme (optional)." },
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
