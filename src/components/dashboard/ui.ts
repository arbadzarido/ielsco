// Shared Tailwind class strings (design tokens) for the dashboard and the public site, using the
// IELSco palette: navy #2F4157 (text/primary), muted teal #577E90 (accent), coral #E56668 (brand
// highlight), clean white surfaces, neutral gray #F7F8FA for subtle fills, border #E3E7ED.
// The same values exist as CSS variables (--iels-*) in app/globals.css.

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2";

export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-[#2F4157] px-5 py-2.5 text-base font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.15)_inset,0_6px_16px_rgba(47,65,87,0.18)] transition-colors hover:bg-[#3d5470] disabled:opacity-50 disabled:cursor-not-allowed ${focusRing}`;

export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-full border border-[#E3E7ED] bg-white px-5 py-2.5 text-base font-semibold text-[#2F4157] shadow-[0_1px_2px_rgba(47,65,87,0.05)] transition-colors hover:border-[#577E90] hover:bg-[#F7F8FA] disabled:opacity-50 ${focusRing}`;

export const btnLink = `inline-flex items-center gap-1 rounded text-base font-semibold text-[#577E90] hover:text-[#2F4157] hover:underline underline-offset-4 ${focusRing}`;

export const card = "rounded-2xl border border-[#E3E7ED] bg-white";

// Raised card with the restrained "glossy" treatment: hairline border, inner top highlight, soft shadow.
export const cardGloss =
  "rounded-2xl border border-[#E3E7ED] bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_10px_30px_rgba(47,65,87,0.07)]";

export const inputClass = `w-full rounded-xl border border-[#E3E7ED] bg-white px-4 py-3 text-lg text-[#2F4157] placeholder:text-[#2F4157]/40 transition-colors focus:border-[#577E90] ${focusRing}`;

export const labelClass = "block text-base font-semibold text-[#2F4157] mb-2";

export const tag = "inline-flex items-center rounded-full bg-[#F1F4F8] px-2.5 py-1 text-sm font-medium text-[#2F4157]/80";

// Frosted glass, used sparingly (header, sidebar, menus, floating controls). Solid white fallback when
// backdrop-filter is unsupported; translucency only kicks in where blur works.
export const glass =
  "border border-white/80 bg-white shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_8px_30px_rgba(47,65,87,0.08)] supports-[backdrop-filter]:bg-white/75 supports-[backdrop-filter]:backdrop-blur-xl";

export const glassMenu =
  "border border-[#E3E7ED] bg-white shadow-[0_16px_40px_rgba(47,65,87,0.14)] supports-[backdrop-filter]:bg-white/90 supports-[backdrop-filter]:backdrop-blur-xl";

// Accent palette for categories (Circles, IELSco Pulse types, SEA Cultural Exchange, sections). Each accent has a soft
// surface, an icon/text colour and a strong fill; `text` and `strong` meet WCAG AA (4.5:1) on white / with white text.
export type Accent = "teal" | "coral" | "violet" | "amber" | "navy" | "green";
export const ACCENTS: Record<Accent, { soft: string; text: string; strong: string; ring: string; gradient: string }> = {
  teal: { soft: "bg-[#E6F4F2]", text: "text-[#0B6E64]", strong: "bg-[#0B6E64] text-white", ring: "border-[#0B6E64]/25", gradient: "from-[#E6F4F2] via-white to-white" },
  coral: { soft: "bg-[#FDEDED]", text: "text-[#B4383A]", strong: "bg-[#B4383A] text-white", ring: "border-[#B4383A]/25", gradient: "from-[#FDEDED] via-white to-white" },
  violet: { soft: "bg-[#F0ECFD]", text: "text-[#5A3DC4]", strong: "bg-[#5A3DC4] text-white", ring: "border-[#5A3DC4]/25", gradient: "from-[#F0ECFD] via-white to-white" },
  amber: { soft: "bg-[#FDF3E3]", text: "text-[#8A5A00]", strong: "bg-[#8A5A00] text-white", ring: "border-[#8A5A00]/25", gradient: "from-[#FDF3E3] via-white to-white" },
  navy: { soft: "bg-[#EAEFF5]", text: "text-[#2F4157]", strong: "bg-[#2F4157] text-white", ring: "border-[#2F4157]/20", gradient: "from-[#EAEFF5] via-white to-white" },
  green: { soft: "bg-[#E8F3EE]", text: "text-[#2E6B4F]", strong: "bg-[#2E6B4F] text-white", ring: "border-[#2E6B4F]/25", gradient: "from-[#E8F3EE] via-white to-white" },
};
