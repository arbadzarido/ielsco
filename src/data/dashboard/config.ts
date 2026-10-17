// Central place for dashboard links and demo-data switches.
// Partner URLs come from env vars so nobody ships a fabricated link. Unset = "coming soon" in the UI.

export const SHOW_DEMO_DATA = process.env.NEXT_PUBLIC_SHOW_DEMO_DATA === "true";

export const LINKS = {
  // Existing link from src/app/circle/page.tsx
  circleDiscord: "https://discord.gg/apFxnhvhWr",
  // Not found for the free Circle in the source (the existing WhatsApp link is an Insider-only group).
  circleWhatsapp: process.env.NEXT_PUBLIC_CIRCLE_WHATSAPP_URL || null,
  tofly: process.env.NEXT_PUBLIC_TOFLY_URL || null,
  skilio: process.env.NEXT_PUBLIC_SKILIO_URL || null,
};
