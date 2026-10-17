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
