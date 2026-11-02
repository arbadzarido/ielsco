// Professional (international employment) opportunities: types, labels and pure helpers shared by the public pages,
// the landing section, the dashboard and the admin. No imports, so `npm test` can load it directly. Data lives in
// public.professional_opportunities + public.recruitment_partners (see supabase/migrations/20261102000000_*).
//
// Nothing about a country, industry or partner is hard-coded here: filters are built from whatever listings are
// published, and every listing carries its own partner.

export type EmploymentType = "full_time" | "contract" | "part_time" | "seasonal" | "internship" | "other";
export type JobStatus = "open" | "closed" | "coming_soon";
export type SalaryStatus = "stated" | "to_confirm" | "not_stated";
export type OpportunityTrack = "academic" | "professional";

export interface RecruitmentPartner {
  id: string; slug: string; name: string; short_name: string | null; website_url: string | null; email: string | null;
  whatsapp: string | null; phone: string | null; about: string | null;
}

export interface ProfessionalOpportunity {
  id: string; slug: string; title: string; country_code: string; city: string | null; industry: string; positions: string[];
  employment_type: EmploymentType; summary: string; description: string | null; responsibilities: string[]; requirements: string[];
  gender: "any" | "female" | "male"; age_min: number | null; age_max: number | null; experience: string | null;
  salary_min: number | null; salary_max: number | null; salary_currency: string | null; salary_period: "hour" | "day" | "week" | "month" | "year";
  salary_status: SalaryStatus; salary_note: string | null; benefits: string[]; working_hours: string | null; contract_duration: string | null;
  openings: number | null; location_note: string | null; documents: string[]; confirm_notes: string[]; partner_id: string;
  application_url: string | null; application_instructions: string | null; status: JobStatus; featured: boolean;
  published_at: string | null; updated_at: string;
  partner: RecruitmentPartner | null;
}

export const JOB_COLUMNS = "id, slug, title, country_code, city, industry, positions, employment_type, summary, description, responsibilities, requirements, gender, age_min, age_max, experience, salary_min, salary_max, salary_currency, salary_period, salary_status, salary_note, benefits, working_hours, contract_duration, openings, location_note, documents, confirm_notes, partner_id, application_url, application_instructions, status, featured, published_at, updated_at";
export const PARTNER_COLUMNS = "id, slug, name, short_name, website_url, email, whatsapp, phone, about";

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time", contract: "Contract", part_time: "Part-time", seasonal: "Seasonal", internship: "Internship", other: "Other",
};
export const STATUS_LABEL: Record<JobStatus, string> = { open: "Open", closed: "Closed", coming_soon: "Coming soon" };
export const GENDER_LABEL = { any: "Men and women", female: "Women", male: "Men" } as const;

// Shown on the Professional directory and every listing (wording agreed in the brief; partner named per listing).
export const professionalDisclaimer = (partner = "the relevant authorised recruitment partner") =>
  `IELSco provides information and facilitates expressions of interest for international employment opportunities in collaboration with ${partner}. ` +
  "Official recruitment, candidate selection, placement procedures, employment contracts, and related legal processes are handled by the relevant authorized recruitment partner. " +
  "The availability and terms of each opportunity are subject to confirmation by the partner.";

// Versioned so each stored interest records which consent text the person agreed to.
export const CONSENT_VERSION = "2026-11-02";
export const consentText = (partner: string) =>
  `I understand that I am submitting an expression of interest to IELSco, not an official employment application. I agree that my information may be shared with the relevant recruitment partner, ${partner}, for the purpose of responding to my inquiry, subject to the applicable privacy policy.`;

const regionNames = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
export function countryName(code: string) {
  try { return regionNames?.of(code.toUpperCase()) ?? code; } catch { return code; }
}

export const locationLabel = (o: Pick<ProfessionalOpportunity, "country_code" | "city">) =>
  o.city ? `${countryName(o.country_code)} · ${o.city}` : countryName(o.country_code);

const fmtAmount = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

// "50,000 ALL / month", "70,000–80,000 ALL / month", "From 50,000 ALL / month". `confirm` says the figure still needs the
// partner's confirmation (salary_status 'to_confirm'); null text = no figure was published.
export function salaryLabel(o: Pick<ProfessionalOpportunity, "salary_min" | "salary_max" | "salary_currency" | "salary_period" | "salary_status">) {
  const { salary_min: lo, salary_max: hi, salary_currency: cur } = o;
  const confirm = o.salary_status === "to_confirm";
  if (o.salary_status === "not_stated" || !cur || (lo == null && hi == null)) return { text: null, confirm: true };
  const per = ` ${cur} / ${o.salary_period}`;
  let text: string;
  if (lo != null && hi != null) text = Number(lo) === Number(hi) ? `${fmtAmount(Number(lo))}${per}` : `${fmtAmount(Number(lo))}–${fmtAmount(Number(hi))}${per}`;
  else if (lo != null) text = `From ${fmtAmount(Number(lo))}${per}`;
  else text = `Up to ${fmtAmount(Number(hi))}${per}`;
  return { text, confirm };
}

export function ageLabel(o: Pick<ProfessionalOpportunity, "age_min" | "age_max">) {
  if (o.age_min && o.age_max) return `${o.age_min}–${o.age_max} years`;
  if (o.age_min) return `${o.age_min} years or older`;
  if (o.age_max) return `Up to ${o.age_max} years`;
  return null;
}

export const dateLabel = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso)) : null;

// WhatsApp deep link for a stored +<digits> number.
export const whatsappLink = (n: string | null, text?: string) =>
  n ? `https://wa.me/${n.replace(/[^0-9]/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}` : null;

// Where "Contact the official recruitment partner" goes: the listing's own application URL, else the partner's website.
export const partnerDestination = (o: Pick<ProfessionalOpportunity, "application_url" | "partner">) => o.application_url ?? o.partner?.website_url ?? null;

// ── Filtering ───────────────────────────────────────────────────────────────────────────────────────────────────
export interface JobFilters { q: string; country: string; industry: string; position: string; employment: string; hideClosed: boolean }
export const EMPTY_FILTERS: JobFilters = { q: "", country: "all", industry: "all", position: "all", employment: "all", hideClosed: false };

const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));

// Filter options are derived from the published data, so a new country, industry or role appears automatically.
export function filterOptions(items: ProfessionalOpportunity[]) {
  return {
    countries: uniq(items.map((o) => o.country_code)).map((c) => ({ value: c, label: countryName(c) })).sort((a, b) => a.label.localeCompare(b.label)),
    industries: uniq(items.map((o) => o.industry)),
    positions: uniq(items.flatMap((o) => [o.title, ...o.positions])),
    employment: uniq(items.map((o) => o.employment_type)) as EmploymentType[],
  };
}

const STATUS_ORDER: Record<JobStatus, number> = { open: 0, coming_soon: 1, closed: 2 };

export function filterJobs(items: ProfessionalOpportunity[], f: JobFilters) {
  const s = f.q.trim().toLowerCase();
  return items
    .filter((o) => (f.country === "all" || o.country_code === f.country)
      && (f.industry === "all" || o.industry === f.industry)
      && (f.position === "all" || o.title === f.position || o.positions.includes(f.position))
      && (f.employment === "all" || o.employment_type === f.employment)
      && (!f.hideClosed || o.status !== "closed")
      && (!s || [o.title, o.industry, o.city ?? "", countryName(o.country_code), o.country_code, o.summary, ...o.positions, o.partner?.name ?? ""]
        .join(" ").toLowerCase().includes(s)))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
}

export const activeFilterCount = (f: JobFilters) =>
  [f.q.trim() !== "", f.country !== "all", f.industry !== "all", f.position !== "all", f.employment !== "all", f.hideClosed].filter(Boolean).length;

export const parseTrack = (v: string | null | undefined): OpportunityTrack => (v === "professional" ? "professional" : "academic");

// Partners are fetched separately and attached (keeps the query simple for every PostgREST setup).
export function attachPartners(rows: Omit<ProfessionalOpportunity, "partner">[], partners: RecruitmentPartner[]): ProfessionalOpportunity[] {
  const byId = new Map(partners.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, salary_min: r.salary_min == null ? null : Number(r.salary_min), salary_max: r.salary_max == null ? null : Number(r.salary_max), partner: byId.get(r.partner_id) ?? null }));
}
