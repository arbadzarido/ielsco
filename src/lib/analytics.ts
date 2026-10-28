// Product analytics (client). Vercel Web Analytics custom events, only when NEXT_PUBLIC_ANALYTICS_ENABLED=true (the
// project must have Web Analytics switched on; custom events need a paid Vercel plan). No personal data in props:
// ids, kinds and plan codes only. The authoritative funnel numbers (orders, registrations, inquiries) live in the database.
import { track as vercelTrack } from "@vercel/analytics";

export const ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

export type EventName =
  | "cta_click" | "inquiry_submitted" | "opportunity_saved" | "opportunity_status_changed"
  | "membership_checkout_started" | "membership_payment_returned" | "member_session_registered" | "feedback_requested"
  | "buddy_requested" | "connect_passport_saved" | "connect_intro_sent" | "connect_intro_answered" | "connect_message_sent"
  | "connect_room_saved" | "connect_room_registered" | "connect_quick_match_matched" | "connect_call_feedback" | "connect_report_sent"
  | "circle_joined" | "circle_posted" | "pulse_item_opened" | "sea_prompt_used" | "tour_started" | "tour_completed" | "copilot_opened"
  | "copilot_help_opened";

export function track(name: EventName, props: Record<string, string | number | boolean | null> = {}) {
  if (!ANALYTICS_ENABLED) return;
  try { vercelTrack(name, props); } catch { /* analytics must never break the page */ }
}
