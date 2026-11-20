// Application input validation, shared by the wizard (client) and the server (authoritative). Pure.
import { z } from "zod";

export const COUNTRY_CODES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");

export const EDUCATION_LEVELS = { high_school: "High school student", undergraduate: "Undergraduate student", college: "College student" } as const;
export const DISCOVERY_SOURCES = ["Instagram", "TikTok", "LinkedIn", "WhatsApp group", "Friend or classmate", "School or university", "IELSco website", "Elco", "Previous GIF delegate", "Other"];

const text = (min: number, max: number, label: string) =>
  z.string().trim().min(min, `${label} is required${min > 1 ? ` (at least ${min} characters)` : ""}.`).max(max, `${label} is too long (max ${max} characters).`);
const country = (label: string) => z.string().trim().toUpperCase().refine((c) => COUNTRY_CODES.includes(c), `Choose a ${label}.`);

export function normalizePhone(raw: string): string {
  const v = raw.replace(/[\s\-().]/g, "");
  return v.startsWith("00") ? `+${v.slice(2)}` : v;
}
const phone = (label: string) => z.string().transform(normalizePhone).refine((v) => /^\+[1-9]\d{6,14}$/.test(v), `${label}: include the country code, e.g. +62 812 3456 7890.`);

export function ageOn(dob: string, on: Date): number {
  const d = new Date(`${dob}T00:00:00Z`);
  let age = on.getUTCFullYear() - d.getUTCFullYear();
  const m = on.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

export const personSchema = z.object({
  legal_name: text(2, 120, "Legal name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  whatsapp: phone("WhatsApp number"),
  nationality: country("nationality"),
  residence_country: country("country of residence"),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date of birth.").refine((d) => {
    const age = ageOn(d, new Date("2027-07-27T00:00:00Z"));
    return age >= 10 && age <= 70;
  }, "Check the date of birth."),
  institution: text(2, 160, "Institution"),
  education_level: z.enum(["high_school", "undergraduate", "college"], { message: "Choose an education level." }),
  academic_background: text(2, 200, "Academic background (major or stream)"),
  country_of_study: country("country of study"),
  emergency_name: text(2, 120, "Emergency contact name"),
  emergency_relation: text(2, 60, "Emergency contact relationship"),
  emergency_phone: phone("Emergency contact phone"),
  // Required only for applicants under 18 on the first programme day (checked in applicationSchema).
  guardian_name: z.string().trim().max(120).optional().default(""),
  guardian_relation: z.string().trim().max(60).optional().default(""),
  guardian_email: z.string().trim().toLowerCase().max(254).optional().default(""),
  guardian_phone: z.string().trim().max(30).optional().default(""),
});
export type Person = z.infer<typeof personSchema>;

export const PROGRAMME_START = new Date("2027-07-27T00:00:00Z");
export function isMinor(dob: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dob) && ageOn(dob, PROGRAMME_START) < 18;
}

export const applicationSchema = z.object({
  pathway: z.enum(["fully_funded", "mentoring", "self_funded"], { message: "Choose a pathway." }),
  mode: z.enum(["individual", "team"]),
  team_name: z.string().trim().max(60).optional().default(""),
  leader: personSchema,
  members: z.array(personSchema).max(2, "A team has at most 3 people (you and up to 2 members).").default([]),
  project_title: z.string().trim().max(120).optional().default(""),
  project_idea: z.string().trim().max(3000).optional().default(""),
  experience: z.string().trim().max(2000).optional().default(""),
  motivation: text(50, 2000, "Motivation"),
  discovery_source: z.string().trim().min(2, "Tell us how you found GIF.").max(80),
}).superRefine((a, ctx) => {
  if (a.mode === "team") {
    if (a.team_name.length < 2) ctx.addIssue({ code: "custom", path: ["team_name"], message: "Team name is required." });
    if (a.members.length < 1) ctx.addIssue({ code: "custom", path: ["members"], message: "A team has 2–3 people: add at least one member." });
  } else if (a.members.length) {
    ctx.addIssue({ code: "custom", path: ["members"], message: "Individual applications have no members." });
  }
  [a.leader, ...a.members].forEach((p, i) => {
    if (!isMinor(p.date_of_birth)) return;
    const at = i === 0 ? "leader" : `members.${i - 1}`;
    if (p.guardian_name.length < 2) ctx.addIssue({ code: "custom", path: [at, "guardian_name"], message: "Under 18: add your parent or legal guardian." });
    if (p.guardian_relation.length < 2) ctx.addIssue({ code: "custom", path: [at, "guardian_relation"], message: "Relationship is required." });
    if (!z.string().email().safeParse(p.guardian_email).success) ctx.addIssue({ code: "custom", path: [at, "guardian_email"], message: "Enter the guardian's email: we send them the consent form." });
    else if (p.guardian_email === p.email) ctx.addIssue({ code: "custom", path: [at, "guardian_email"], message: "The guardian needs their own email address." });
    if (!/^\+[1-9]\d{6,14}$/.test(normalizePhone(p.guardian_phone))) ctx.addIssue({ code: "custom", path: [at, "guardian_phone"], message: "Guardian phone with country code." });
  });
  const emails = [a.leader.email, ...a.members.map((m) => m.email)];
  if (new Set(emails).size !== emails.length) ctx.addIssue({ code: "custom", path: ["members"], message: "Each team member needs their own email address." });
  if (a.pathway !== "self_funded") {
    if (a.project_title.length < 3) ctx.addIssue({ code: "custom", path: ["project_title"], message: "Give your project a working title." });
    if (a.project_idea.length < 100) ctx.addIssue({ code: "custom", path: ["project_idea"], message: "Describe your project idea (at least 100 characters)." });
  }
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export function firstErrors(e: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of e.issues) {
    const k = i.path.join(".") || "_";
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

// Uploads: allowed types and sizes per document kind. Types are checked again on the stored bytes (magic numbers).
export const UPLOAD_RULES: Record<string, { mimes: string[]; maxMb: number; label: string }> = {
  passport: { mimes: ["application/pdf", "image/jpeg", "image/png"], maxMb: 10, label: "Passport or national ID" },
  student_id: { mimes: ["application/pdf", "image/jpeg", "image/png"], maxMb: 10, label: "Student ID or enrolment letter" },
  payment_proof: { mimes: ["application/pdf", "image/jpeg", "image/png"], maxMb: 10, label: "Bank transfer proof" },
  phase2_essay: { mimes: ["application/pdf"], maxMb: 10, label: "Project essay (PDF)" },
  phase2_deck: { mimes: ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], maxMb: 25, label: "Pitch deck (PDF or PPTX)" },
  phase3_video: { mimes: ["video/mp4", "video/quicktime"], maxMb: 100, label: "Video pitch (MP4 or MOV)" },
  onboarding: { mimes: ["application/pdf", "image/jpeg", "image/png"], maxMb: 10, label: "Onboarding document" },
};

export function sniffMime(head: Uint8Array): string | null {
  const b = (i: number) => head[i];
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return "application/pdf";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x50 && b(1) === 0x4b && b(2) === 0x03 && b(3) === 0x04) return "application/zip";
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) {
    const brand = String.fromCharCode(b(8), b(9), b(10), b(11));
    return brand === "qt  " ? "video/quicktime" : "video/mp4";
  }
  return null;
}

// Does the sniffed type satisfy the declared one? (PPTX is a ZIP container; MOV/MP4 brands overlap.)
export function sniffMatches(declared: string, sniffed: string | null): boolean {
  if (!sniffed) return false;
  if (declared === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return sniffed === "application/zip";
  if (declared.startsWith("video/")) return sniffed.startsWith("video/");
  return declared === sniffed;
}

export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  return base.replace(/[^\w.\- ]+/g, "_").slice(-120) || "file";
}

export const VIDEO_HOSTS = ["youtube.com", "www.youtube.com", "youtu.be", "vimeo.com", "drive.google.com", "www.loom.com", "loom.com"];
export function validVideoUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && VIDEO_HOSTS.includes(url.hostname.toLowerCase());
  } catch { return false; }
}

export const CRITERIA = [
  { key: "problem", label: "Problem identification" },
  { key: "innovation", label: "Innovation" },
  { key: "impact", label: "Impact" },
  { key: "feasibility", label: "Feasibility" },
  { key: "sustainability", label: "Sustainability" },
  { key: "leadership", label: "Leadership and teamwork" },
  { key: "presentation", label: "Presentation" },
] as const;

export const scoresSchema = z.object(Object.fromEntries(CRITERIA.map((c) => [c.key, z.coerce.number().int().min(1).max(10)])) as Record<(typeof CRITERIA)[number]["key"], z.ZodNumber>);
