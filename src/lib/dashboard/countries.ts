// Worldwide country / territory list for My Goals destinations.
// Stored as ISO 3166-1 alpha-2 codes (member_profiles.destination_countries); names are generated per interface
// language with Intl.DisplayNames, so no translated name list has to be maintained here.

export const COUNTRY_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
] as const;

// Quick picks shown before the member types anything (a fixed shortlist, not usage data).
export const POPULAR_DESTINATIONS = ["SG", "MY", "AU", "GB", "US", "JP", "KR", "NL", "DE", "CA", "NZ", "TW"];

export const MAX_DESTINATIONS = 5;

const CODE_SET = new Set<string>(COUNTRY_CODES);
export const isCountryCode = (v: string) => CODE_SET.has(v);

const displayNames = new Map<string, Intl.DisplayNames | null>();
function namesFor(locale: string) {
  if (!displayNames.has(locale)) {
    try {
      displayNames.set(locale, new Intl.DisplayNames([locale, "en"], { type: "region" }));
    } catch {
      displayNames.set(locale, null);
    }
  }
  return displayNames.get(locale) ?? null;
}

export function countryName(code: string, locale = "en"): string {
  return namesFor(locale)?.of(code) ?? code;
}

// Flag emoji from regional indicator symbols. Decorative only (always aria-hidden): some platforms, e.g. Windows,
// show the two letters instead of a flag, and the country name is always shown next to it.
export function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

// Match by localized name, English name or code, ignoring accents and case.
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function searchCountries(query: string, locale = "en"): string[] {
  const q = fold(query.trim());
  const sorted = [...COUNTRY_CODES].sort((a, b) => countryName(a, locale).localeCompare(countryName(b, locale), locale));
  if (!q) return sorted;
  const scored = sorted
    .map((code) => {
      const names = [countryName(code, locale), countryName(code, "en")].map(fold);
      const starts = names.some((n) => n.startsWith(q)) || fold(code) === q;
      const contains = names.some((n) => n.includes(q));
      return { code, rank: starts ? 0 : contains ? 1 : 2 };
    })
    .filter((r) => r.rank < 2);
  return scored.sort((a, b) => a.rank - b.rank).map((r) => r.code);
}

// Names used by the earlier dashboard lists that differ from Intl's English names.
const ALIASES: Record<string, string> = {
  "brunei darussalam": "BN", myanmar: "MM", burma: "MM", uk: "GB", "united kingdom": "GB", usa: "US",
  "united states of america": "US", korea: "KR", "south korea": "KR", "east timor": "TL",
};

// Best-effort mapping of an older free-text destination ("Singapore") to a code.
export function codeForName(name: string | null | undefined): string | null {
  if (!name) return null;
  const n = fold(name.trim());
  return ALIASES[n] ?? COUNTRY_CODES.find((c) => fold(countryName(c, "en")) === n) ?? null;
}

// Display labels for a member's destinations in the current language.
export function destinationLabels(codes: string[], other: string | null, locale = "en"): string[] {
  return [...codes.map((c) => countryName(c, locale)), ...(other ? [other] : [])];
}
