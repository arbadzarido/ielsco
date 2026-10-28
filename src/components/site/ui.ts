// Public website design tokens (landing, About, Product, Events, Circle). White surfaces only; brand colour is used for
// type, buttons, links, active states and small accents. Sizes are in px because the root font-size is 75%.
//   navy #2F4157 · deep navy #1A2534 · coral #E56668 · teal #577E90 · hairline #E6E9EE

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#577E90] focus-visible:ring-offset-2";

export const container = "mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8";

export const section = "bg-white py-[64px] md:py-[96px]";

export const eyebrow = "text-[13px] font-semibold uppercase tracking-[0.14em] text-[#577E90]";

export const h1 = "text-[38px] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#1A2534] sm:text-[48px] lg:text-[60px]";

export const h2 = "text-[30px] font-extrabold leading-[1.15] tracking-[-0.015em] text-[#1A2534] sm:text-[38px]";

export const h3 = "text-[20px] font-bold leading-snug text-[#1A2534]";

export const lead = "text-[17px] leading-[1.65] text-[#2F4157]/80 sm:text-[19px]";

export const body = "text-[16px] leading-[1.65] text-[#2F4157]/75";

const btn = `inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold transition-colors ${focusRing}`;

export const btnPrimary = `${btn} bg-[#2F4157] text-white hover:bg-[#1A2534]`;

export const btnAccent = `${btn} bg-[#E56668] text-white hover:bg-[#C94F51]`;

export const btnSecondary = `${btn} border border-[#D5DBE3] bg-white text-[#2F4157] hover:border-[#2F4157]`;

export const textLink = `inline-flex items-center gap-1.5 rounded text-[16px] font-semibold text-[#2F4157] underline-offset-4 hover:text-[#E56668] hover:underline ${focusRing}`;

export const card = "rounded-[20px] border border-[#E6E9EE] bg-white";

// Card that is itself a link: hairline border, gentle lift on hover, no heavy shadows.
export const cardLink = `${card} block transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#C9D1DC] hover:shadow-[0_12px_32px_rgba(26,37,52,0.08)] ${focusRing}`;

export const pill = "inline-flex items-center gap-1.5 rounded-full border border-[#E6E9EE] bg-white px-3 py-1 text-[13px] font-semibold text-[#2F4157]";

// Public pages put this class on the page root so their headings use the heading font (Poppins, globals.css
// --font-heading), the same as the dashboard. (It used to switch them from the old Garamond stack to Plus Jakarta Sans.)
export const siteRoot = "[&_:is(h1,h2,h3,h4,h5,h6)]:[font-family:var(--font-heading)]";
