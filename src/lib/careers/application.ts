// Pure helpers for the Careers 2027 application (no imports, so `node --test` can load this file directly). The
// database (public.submit_my_career_application) validates everything again; these rules mirror it so the form can
// explain problems before anything is sent.

export type ApplicationDraft = {
  full_name: string;
  whatsapp: string;
  university: string;
  academic_year: string; // "1" | "2" | "3"
  batch_year: string; // "" or a year, e.g. "2024"
  role_id: string;
  role_2_id: string;
  instagram: string;
  linkedin_url: string;
  motivation: string;
  portfolio_mode: "file" | "link";
  portfolio_url: string;
  cv_path: string;
  cv_name: string;
  portfolio_path: string;
  portfolio_name: string;
  tasks: Record<string, boolean>;
  privacy: boolean;
  declaration: boolean;
};

export const EMPTY_DRAFT: ApplicationDraft = {
  full_name: "", whatsapp: "", university: "", academic_year: "", batch_year: "", role_id: "", role_2_id: "", instagram: "",
  linkedin_url: "", motivation: "", portfolio_mode: "link", portfolio_url: "", cv_path: "", cv_name: "", portfolio_path: "",
  portfolio_name: "", tasks: {}, privacy: false, declaration: false,
};

export const MOTIVATION_MIN = 20;
export const MOTIVATION_MAX = 1000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// The wizard steps. "account" is the Elco-Pass + optional Elco link step.
export const STEPS = [
  { id: "account", title: "Account" },
  { id: "about", title: "About you" },
  { id: "roles", title: "Roles" },
  { id: "profiles", title: "Profiles & documents" },
  { id: "tasks", title: "Campaign tasks" },
  { id: "review", title: "Review & declaration" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

export function normalizeWhatsapp(raw: string): string | null {
  let v = (raw || "").replace(/[\s().-]/g, "");
  if (v.startsWith("0")) v = "+62" + v.slice(1);
  return /^\+?[0-9]{8,16}$/.test(v) ? v : null;
}

const IG_RESERVED = new Set(["p", "reel", "reels", "stories", "explore"]);
export function instagramHandle(raw: string): string | null {
  const v = (raw || "").trim();
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{1,30})\/?(?:\?.*)?$/) || v.match(/^@?([A-Za-z0-9_.]{1,30})$/);
  if (!m || IG_RESERVED.has(m[1])) return null;
  return m[1];
}
export const instagramUrl = (raw: string) => {
  const h = instagramHandle(raw);
  return h ? `https://www.instagram.com/${h}/` : null;
};

export function linkedinUrl(raw: string): string | null {
  const m = (raw || "").trim().match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([^/?#\s]{2,100})\/?(?:[?#].*)?$/i);
  return m ? `https://www.linkedin.com/in/${m[1]}/` : null;
}

export const isHttpsUrl = (raw: string) => /^https:\/\/\S+\.\S+$/i.test((raw || "").trim()) && raw.trim().length <= 500;

export type Errors = Partial<Record<string, string>>;

// Field errors for one step (and for "review": every step). roleIds = the valid role ids (17).
export function validateStep(step: StepId, d: ApplicationDraft, roleIds: string[], taskKeys: string[]): Errors {
  const e: Errors = {};
  const all = step === "review";
  if (step === "about" || all) {
    const n = d.full_name.trim();
    if (n.length < 2 || n.length > 120) e.full_name = "Please enter your full name.";
    if (!normalizeWhatsapp(d.whatsapp)) e.whatsapp = "Please enter your WhatsApp number with country code, e.g. +62 812 3456 7890.";
    const u = d.university.trim();
    if (u.length < 2 || u.length > 200) e.university = "Please enter your university.";
    if (!["1", "2", "3"].includes(d.academic_year)) e.academic_year = "Please choose your current year (1st, 2nd or 3rd).";
    if (d.batch_year && !(/^\d{4}$/.test(d.batch_year) && +d.batch_year >= 2015 && +d.batch_year <= 2030)) e.batch_year = "Please enter the year you started university, e.g. 2024.";
  }
  if (step === "roles" || all) {
    if (!roleIds.includes(d.role_id)) e.role_id = "Please choose your first-choice role.";
    if (d.role_2_id && (!roleIds.includes(d.role_2_id) || d.role_2_id === d.role_id)) e.role_2_id = "Your second choice must be a different role.";
  }
  if (step === "profiles" || all) {
    if (!instagramHandle(d.instagram)) e.instagram = "Please enter your Instagram profile link or @username (not a post link).";
    if (!linkedinUrl(d.linkedin_url)) e.linkedin_url = "Please enter your LinkedIn profile link, e.g. https://www.linkedin.com/in/your-name.";
    const m = d.motivation.trim().length;
    if (m < MOTIVATION_MIN) e.motivation = `Please write at least ${MOTIVATION_MIN} characters about why you want to join.`;
    else if (m > MOTIVATION_MAX) e.motivation = `Please keep it under ${MOTIVATION_MAX} characters.`;
    if (!d.cv_path) e.cv = "Please upload your CV as a PDF (up to 10 MB).";
    if (d.portfolio_mode === "file" && !d.portfolio_path) e.portfolio = "Please upload your portfolio PDF, or share a link instead.";
    if (d.portfolio_mode === "link" && !isHttpsUrl(d.portfolio_url)) e.portfolio_url = "Please enter a full portfolio link starting with https://.";
  }
  if (step === "tasks" || all) {
    if (!taskKeys.every((k) => d.tasks[k])) e.tasks = "Please complete and tick all the campaign tasks.";
  }
  if (all) {
    if (!d.privacy) e.privacy = "Please read and accept the privacy notice.";
    if (!d.declaration) e.declaration = "Please confirm the applicant declaration.";
  }
  return e;
}

// Keep only known keys and string/boolean values from a stored draft (it is user-writable JSON).
export function sanitizeDraft(raw: unknown): ApplicationDraft {
  const out: ApplicationDraft = { ...EMPTY_DRAFT, tasks: {} };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(EMPTY_DRAFT) as (keyof ApplicationDraft)[]) {
    const v = r[k];
    if (k === "tasks") {
      if (v && typeof v === "object") for (const [tk, tv] of Object.entries(v as Record<string, unknown>)) if (typeof tv === "boolean" && /^[a-z0-9_]{1,40}$/.test(tk)) out.tasks[tk] = tv;
    } else if (k === "privacy" || k === "declaration") {
      if (typeof v === "boolean") out[k] = v;
    } else if (k === "portfolio_mode") {
      if (v === "file" || v === "link") out.portfolio_mode = v;
    } else if (typeof v === "string") {
      (out as Record<string, unknown>)[k] = v.slice(0, 1200);
    }
  }
  return out;
}

// The database error message → which step to send the applicant back to, and what to say.
const FIELD_STEP: Record<string, StepId> = {
  full_name: "about", whatsapp: "about", university: "about", academic_year: "about", batch_year: "about",
  role: "roles", role_2: "roles", instagram: "profiles", linkedin_url: "profiles", motivation: "profiles", cv: "profiles",
  cv_missing: "profiles", portfolio: "profiles", portfolio_missing: "profiles", portfolio_url: "profiles", tasks: "tasks",
  privacy: "review", declaration: "review", email: "account",
};
export function explainSubmitError(message: string): { step: StepId | null; text: string } {
  const m = message || "";
  if (m.includes("not_signed_in")) return { step: "account", text: "Your session has ended. Please sign in again; your answers are saved." };
  if (m.includes("already_applied")) return { step: null, text: "There is already an application for this email in the 2027 cohort. If it isn't yours, email careers@ielsco.com." };
  if (m.includes("locked")) return { step: null, text: "Your application is already being reviewed, so it can't be changed here. Email careers@ielsco.com if something is wrong." };
  if (m.includes("applications_closed")) return { step: null, text: "Applications aren't open right now." };
  if (m.includes("too_many")) return { step: null, text: "We're receiving a lot of applications right now. Please try again in a few minutes." };
  const field = m.match(/invalid: (\w+)/)?.[1];
  if (field) return { step: FIELD_STEP[field] ?? null, text: field.endsWith("_missing") ? "A file didn't finish uploading. Please upload it again." : "Please check the highlighted step and try again." };
  return { step: null, text: "We couldn't send your application. Please try again, or email careers@ielsco.com if it keeps failing." };
}
