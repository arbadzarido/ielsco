// IELSco Private Tutoring bundles: sessions with the mentor + one month of Elco AI + IELS Circle.
//
// PRICES BELOW ARE PROPOSED AND NEED FOUNDER APPROVAL BEFORE THIS PAGE GOES LIVE (see docs/PRIVATE-TUTORING-RELAUNCH.md).
// Every figure on the page and in the WhatsApp links is derived from this file so a price is changed in one place.
import { PRICE_PER_SESSION, WHATSAPP_URL } from "@/data/courses";

/** Elco AI Starter list price per month, from Elco's billing config (backend migration 015: Starter Rp69,000/month). */
export const ELCO_STARTER_MONTHLY_IDR = 69000;
export const SINGLE_SESSION_IDR = PRICE_PER_SESSION; // Rp90,000, unchanged

export type PackageId = "starter" | "growth" | "intensive";

export interface TutoringPackage {
  id: PackageId;
  name: string;
  sessions: number;
  priceIdr: number;
  tagline: string;
  recommended?: boolean;
}

export const TUTORING_PACKAGES: TutoringPackage[] = [
  { id: "starter", name: "Starter", sessions: 2, priceIdr: 179000, tagline: "Try the full experience and see how it fits." },
  { id: "growth", name: "Growth", sessions: 4, priceIdr: 329000, tagline: "A month of steady progress with regular feedback.", recommended: true },
  { id: "intensive", name: "Intensive", sessions: 8, priceIdr: 599000, tagline: "For a test date, deadline or application in view." },
];

export function packageMath(p: TutoringPackage) {
  const sessionsAtListIdr = p.sessions * SINGLE_SESSION_IDR;
  const separateTotalIdr = sessionsAtListIdr + ELCO_STARTER_MONTHLY_IDR;
  return {
    sessionsAtListIdr,
    separateTotalIdr,
    savingsIdr: separateTotalIdr - p.priceIdr,
    perSessionIdr: Math.round(p.priceIdr / p.sessions),
  };
}

export const MENTOR_TITLE = "Lead English Mentor & Founder of IELSco and Elco AI";
export const MENTOR_FULL_TITLE = `Arbadza Rido — ${MENTOR_TITLE}`;

export function packageRequestUrl(p: TutoringPackage) {
  const msg = `Hi IELSco, I'd like to start the ${p.name} package (${p.sessions} private tutoring sessions with Arbadza Rido + 1 month of Elco AI + IELS Circle, Rp${p.priceIdr.toLocaleString("id-ID")}). My goal: `;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`;
}

/** Deposit arrangement request: only for packages with more than 4 sessions (see src/lib/tutoring/payments.ts). */
export function depositRequestUrl(p: TutoringPackage) {
  const msg = `Hi IELSco, I'd like to start the ${p.name} package (${p.sessions} sessions, Rp${p.priceIdr.toLocaleString("id-ID")}) with the deposit payment arrangement. Please send me the payment schedule. My goal: `;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`;
}

export function generalRequestUrl() {
  const msg = "Hi IELSco, I'm interested in Private Tutoring with Arbadza Rido. Could you help me choose a package? My goal: ";
  return `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`;
}
