// Shared facts and links for IELSco's private human tutoring (supplementary to Elco AI).
// Elco AI (www.elcoai.com) is the primary place to learn and practise English; IELSco adds private tutoring with a person,
// at Rp90,000 per session, requested per session (no course subscription, no enrolment flow).
import { PRICE_PER_SESSION, WHATSAPP_URL } from "@/data/courses";

export const TUTOR_PRICE_IDR = PRICE_PER_SESSION; // 90,000
export const TUTOR_PRICE_LABEL = "Rp90,000 per session";
export const TUTOR_MESSAGE = "Hi IELSco, I'd like to request a private tutor session (Rp90,000/session).";

/** Official channel for tutor requests: the IELSco WhatsApp, with a prefilled message (optionally naming a focus area). */
export function tutorRequestUrl(focus?: string) {
  const msg = focus ? `${TUTOR_MESSAGE} Focus: ${focus}.` : TUTOR_MESSAGE;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`;
}

/** Elco test preparation that is live today. SAT English is coming soon and must never be presented as available. */
export const ELCO_LIVE_TESTS = ["TOEFL ITP", "IELTS", "TOEIC"] as const;
export const ELCO_TEST_PREP_TEXT = "TOEFL ITP, IELTS and TOEIC: Learn, Practice, Tryout (mock test) and Progress. SAT English is coming soon.";
