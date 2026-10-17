// Interface languages. Only "full" languages are selectable; others are listed as coming soon.
// To add a language: create messages/<code>.ts (same keys as en.ts), register it in MESSAGES, set status "full".
export type Locale = "en" | "id" | "ms" | "fil" | "th" | "vi" | "my" | "km" | "lo";

export const LOCALES: { code: Locale; label: string; status: "full" | "soon" }[] = [
  { code: "en", label: "English", status: "full" },
  { code: "id", label: "Bahasa Indonesia", status: "full" },
  { code: "ms", label: "Bahasa Melayu", status: "soon" },
  { code: "fil", label: "Filipino", status: "soon" },
  { code: "th", label: "ไทย", status: "soon" },
  { code: "vi", label: "Tiếng Việt", status: "soon" },
  { code: "my", label: "မြန်မာ", status: "soon" },
  { code: "km", label: "ភាសាខ្មែរ", status: "soon" },
  { code: "lo", label: "ລາວ", status: "soon" },
];

export const DEFAULT_LOCALE: Locale = "en";

export const isSupportedLocale = (v: unknown): v is Locale =>
  LOCALES.some((l) => l.code === v && l.status === "full");
