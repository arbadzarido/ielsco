// Business streams: HQ (central management) and the three business streams IELSco, Elco AI and GIF.
// Pure (imported by tests with the .ts extension). Values mirror os_streams in
// supabase/migrations/20261213000000_company_os_business_streams.sql.
//
// A stream says what a record is ABOUT. It never says who may see or edit it (sensitivity, divisions, workspace roles
// and grants do that), and it is not the same thing as a person's division or the legal entity that books the money.

export type StreamCode = "HQ" | "IEL" | "ELC" | "GIF";
export const STREAM_CODES: StreamCode[] = ["HQ", "IEL", "ELC", "GIF"];

export interface Stream {
  code: StreamCode; slug: string; name: string; short: string; kind: "management" | "business";
  description: string; logo: string; logoAlt: string;
}

export const STREAMS: Stream[] = [
  { code: "HQ", slug: "hq", name: "HQ", short: "HQ", kind: "management",
    description: "Central management: governance, finance, legal, people, shared resources and company-wide operations",
    logo: "/icon-192.png", logoAlt: "HQ" },
  { code: "IEL", slug: "ielsco", name: "IELSco", short: "IELSco", kind: "business",
    description: "English education, events and community", logo: "/icon-192.png", logoAlt: "IELSco" },
  { code: "ELC", slug: "elco", name: "Elco AI", short: "Elco", kind: "business",
    description: "AI products, technology and automation", logo: "/images/contents/mascot/elco.svg", logoAlt: "Elco AI" },
  { code: "GIF", slug: "gif", name: "GIF", short: "GIF", kind: "business",
    description: "Global Impact Fellowship: Summer, Winter, delegations, partnerships and sponsorships",
    logo: "/images/logos/gif/gif-icon.png", logoAlt: "Global Impact Fellowship" },
];

export const streamByCode = (code: string | null | undefined) => STREAMS.find((s) => s.code === code);
export const streamBySlug = (slug: string | null | undefined) => STREAMS.find((s) => s.slug === (slug ?? "").toLowerCase());
export const streamName = (code: string | null | undefined) => streamByCode(code)?.name ?? code ?? "—";
export const isStreamCode = (v: unknown): v is StreamCode => typeof v === "string" && (STREAM_CODES as string[]).includes(v);

/** Canonical order (HQ, IEL, ELC, GIF), duplicates and unknown codes dropped. Same order the database stores. */
export function normalizeStreams(codes: readonly (string | null | undefined)[] | null | undefined): StreamCode[] {
  const set = new Set((codes ?? []).map((c) => (c ?? "").trim().toUpperCase()));
  return STREAM_CODES.filter((c) => set.has(c));
}

/** Human list for a record's streams: "GIF", "IELSco + GIF", or "Not assigned". */
export function streamsLabel(codes: readonly string[] | null | undefined): string {
  const n = normalizeStreams(codes);
  return n.length ? n.map((c) => streamByCode(c)!.short).join(" + ") : "Not assigned";
}

/** The stream an old business-unit value stood for (HQ, IEL, ELC). Used to read old links such as ?company=IEL. */
export function streamFromCompany(company: string | null | undefined): StreamCode | null {
  return company === "HQ" || company === "IEL" || company === "ELC" ? company : null;
}

/** The stream asked for in a URL: ?stream=GIF (or a slug), falling back to the old ?company=IEL links. */
export function streamFromParams(get: (k: string) => string | null): StreamCode | null {
  const s = get("stream");
  if (s) {
    const up = s.toUpperCase();
    if (isStreamCode(up)) return up;
    const bySlug = streamBySlug(s);
    if (bySlug) return bySlug.code;
  }
  return streamFromCompany(get("company"));
}

/** Whether a record belongs in a stream's view. HQ also shows records not assigned to any stream yet, so nothing is
 * ever hidden from every workspace. */
export function inStream(recordStreams: readonly string[] | null | undefined, code: StreamCode | null): boolean {
  if (!code) return true;
  const n = normalizeStreams(recordStreams);
  return n.includes(code) || (code === "HQ" && n.length === 0);
}

/** The PostgREST filter for a stream view, for query builders: `.or(streamOrFilter(code))`. */
export function streamOrFilter(code: StreamCode): string {
  return code === "HQ" ? "streams.cs.{HQ},streams.eq.{}" : `streams.cs.{${code}}`;
}

/** Streams for a new record: what the page was opened for (?stream=), else nothing (the person picks, or leaves it). */
export function defaultStreams(fromPage: StreamCode | null | undefined): StreamCode[] {
  return fromPage ? [fromPage] : [];
}

/** Toggle one stream in a selection, keeping canonical order. */
export function toggleStream(current: readonly string[], code: StreamCode): StreamCode[] {
  const n = normalizeStreams(current);
  return n.includes(code) ? n.filter((c) => c !== code) : normalizeStreams([...n, code]);
}

/** Stream workspace URL: /os/w/<slug>, with an optional tab. */
export const streamHref = (code: StreamCode, tab?: string) => `/os/w/${streamByCode(code)!.slug}${tab && tab !== "overview" ? `?tab=${tab}` : ""}`;

/** Which stream workspace a path is in: /os/w/<slug>…, or the GIF programme workspace under /os/gif. */
export function streamFromPath(pathname: string): StreamCode | null {
  if (/^\/os\/gif(?:\/|$|\?)/i.test(pathname)) return "GIF";
  const m = pathname.match(/^\/os\/w\/([a-z]+)(?:\/|$|\?)/i);
  return m ? streamBySlug(m[1])?.code ?? null : null;
}

/** Plain words for why a record is on the stream review list. */
export const REVIEW_REASON_LABEL: Record<string, string> = {
  company_differs_from_parent: "Its old business unit differs from the project or record it belongs to",
  text_mentions_other_stream: "The title mentions another stream",
  workstream_unclear: "Timeline workstream doesn't name a stream",
};
