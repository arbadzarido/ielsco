"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * ============================================================
 * GIF SINGAPORE 2026 — SELECTED DELEGATE PORTAL (/dashboard/gif/delegates)
 * ============================================================
 *
 * HOW THIS PAGE WORKS
 *  - Access is decided by the DATABASE (RLS): the logged-in user's email must
 *    match a row in `gif_delegates` with access_granted = true. If no row comes
 *    back, we show the "closed" message. Nothing on this page grants access.
 *  - The editing deadline and protected fields are ALSO enforced in the database
 *    (see the SQL script). The disabled inputs below are only for good UX.
 *
 * WHERE TO EDIT THINGS
 *  - Dates / contact:        constants at the top of the file
 *  - Form fields & labels:   the field lists (PERSONAL, PASSPORT, TRAVEL, ...)
 *  - Which fields count as   the `sections` list inside the component
 *    "required" for the %
 *  - Programme preview:      PROGRAMME
 *
 * If you add a NEW database column, add it to the matching field list below
 * AND to the GRANT SELECT / GRANT UPDATE lists in the SQL script.
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion } from "framer-motion";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Lock,
  MapPin,
  Calendar,
  Users,
  Upload,
  Save,
  Clock,
  Plane,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================
// CONSTANTS
// ============================================================
const BUCKET = "gif-2026-documents";
const MAX_FILE_MB = 10;

// 20 Oct 2026 23:59:59 WIB == 21 Oct 2026 00:00 WIB. Keep in sync with gif_edit_deadline() in SQL.
const EDIT_DEADLINE = new Date("2026-10-21T00:00:00+07:00");

const CONTACT_EMAIL = "arbadza@ielsco.com";
const CONTACT_WA_DISPLAY = "+62 882-9725-3491";
const CONTACT_WA_LINK = "https://wa.me/6288297253491";

const PROGRAMME = [
  { date: "17 NOVEMBER", title: "NUS Campus Immersion" },
  { date: "18 NOVEMBER", title: "NUS SCALE" },
  { date: "19 NOVEMBER", title: "NUSX" },
  { date: "20 NOVEMBER", title: "Singapore Exposure & Closing" },
];

// Project statuses that only IELSco can set (database blocks participants from choosing them)
const ADMIN_PROJECT_STATUSES = ["Needs Refinement", "Ready for Fellowship", "Developed During Fellowship"];

// ============================================================
// FIELD LISTS  (key = database column)
// ============================================================
type F = {
  key: string;
  label: string;
  type?: "text" | "date" | "time" | "tel" | "email" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
  hint?: string;
  optional?: boolean; // optional fields are not counted in the completion %
  wide?: boolean;     // spans both columns on desktop
};

const PERSONAL: F[] = [
  { key: "full_name", label: "Full legal name", hint: "As written on your official ID", wide: true },
  { key: "preferred_name", label: "Preferred name", optional: true },
  { key: "gender", label: "Gender", type: "select", options: ["Female", "Male", "Prefer not to say"] },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "nationality", label: "Nationality" },
  { key: "country_of_residence", label: "Country of residence" },
  { key: "city", label: "City" },
  { key: "province_state", label: "Province / state" },
  { key: "participant_type", label: "Participant type", type: "select", options: ["Fully Funded", "Partial Funded", "Self Funded"] },
  { key: "institution", label: "Institution" },
  { key: "institution_type", label: "Institution type", type: "select", options: ["University", "College / Polytechnic", "School", "Company", "Non-profit / NGO", "Government", "Other"] },
  { key: "field_of_study_work", label: "Field of study / work" },
  { key: "year_semester", label: "Year / semester", placeholder: "e.g. Year 3, Semester 6" },
  { key: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+62..." },
  { key: "instagram", label: "Instagram", optional: true, placeholder: "@username" },
  { key: "linkedin", label: "LinkedIn", optional: true, placeholder: "Profile link", wide: true },
];

const PASSPORT: F[] = [
  { key: "passport_name", label: "Name as printed on passport", wide: true },
  { key: "passport_number", label: "Passport number" },
  { key: "passport_issuing_country", label: "Issuing country" },
  { key: "passport_expiry_date", label: "Passport expiry date", type: "date" },
];

const TRAVEL: F[] = [
  {
    key: "flight_booking_preference",
    label: "Flight booking method",
    type: "select",
    options: ["Book myself", "Book through IELSco"],
    wide: true,
  },
  {
    key: "flight_booking_status",
    label: "Flight booking status",
    type: "select",
    options: ["Not booked yet", "Searching / comparing", "Booked"],
    wide: true,
  },
  {
    key: "arrival_date",
    label: "Arrival date",
    type: "date",
  },
  {
    key: "arrival_time",
    label: "Arrival time (Singapore time)",
    type: "time",
  },
  {
    key: "arrival_airport",
    label: "Arrival airport",
    placeholder: "e.g. Singapore Changi (SIN)",
  },
  {
    key: "arrival_flight_number",
    label: "Arrival flight number",
    placeholder: "e.g. SQ953",
  },
  {
    key: "departure_date",
    label: "Departure date",
    type: "date",
  },
  {
    key: "departure_time",
    label: "Departure time (Singapore time)",
    type: "time",
  },
  {
    key: "departure_airport",
    label: "Departure airport",
    placeholder: "e.g. Singapore Changi (SIN)",
  },
  {
    key: "departure_flight_number",
    label: "Departure flight number",
    placeholder: "e.g. SQ952",
  },
];

const MEALS: F[] = [
  { key: "accommodation_required", label: "Do you need accommodation?", type: "select", options: ["Yes", "No"] },
  { key: "dietary_requirement", label: "Dietary requirement", type: "select", options: ["None", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-free", "Other"] },
  { key: "food_allergy", label: "Food allergy", placeholder: "Write 'None' if you have no food allergies", wide: true },
  { key: "accessibility_needs", label: "Accessibility / special support needs", type: "textarea", optional: true, wide: true },
  { key: "dietary_notes", label: "Other dietary notes", type: "textarea", optional: true, wide: true },
];

const EMERGENCY: F[] = [
  { key: "emergency_contact_name", label: "Contact name" },
  { key: "emergency_contact_relationship", label: "Relationship to you" },
  { key: "emergency_contact_phone", label: "Phone number", type: "tel" },
  { key: "emergency_contact_email", label: "Email", type: "email" },
  { key: "emergency_contact_country", label: "Country" },
];

const GUARDIAN: F[] = [
  { key: "guardian_name", label: "Guardian name" },
  { key: "guardian_relationship", label: "Relationship to you" },
  { key: "guardian_phone", label: "Guardian phone", type: "tel" },
  { key: "guardian_email", label: "Guardian email", type: "email" },
];

const PROJECT_BASE: F[] = [
  { key: "project_problem", label: "What social problem or challenge are you most interested in addressing?", type: "textarea", wide: true },
  { key: "project_affected_group", label: "Who is most affected by this problem?", type: "textarea", wide: true },
  { key: "project_personal_motivation", label: "Why does this problem matter to you personally?", type: "textarea", wide: true },
];
const PROJECT_YES: F[] = [
  { key: "project_title", label: "Project title", wide: true },
  { key: "project_idea", label: "Project idea", type: "textarea", wide: true },
  { key: "project_change_goal", label: "What would the project try to change or improve?", type: "textarea", wide: true },
  { key: "project_target_beneficiaries", label: "Target beneficiaries", type: "textarea", wide: true },
  { key: "project_proposed_solution", label: "Proposed solution", type: "textarea", wide: true },
  { key: "project_first_step", label: "One realistic first step", type: "textarea", wide: true },
];
const PROJECT_ROUGH: F[] = [
  { key: "project_rough_idea", label: "Rough project idea", type: "textarea", wide: true },
  { key: "project_problem_addressed", label: "Problem it addresses", type: "textarea", wide: true },
  { key: "project_exploration_goal", label: "What would you like to explore further during GIF?", type: "textarea", wide: true },
];
const PROJECT_NONE: F[] = [
  { key: "project_possible_solution", label: "Based on the problem you identified, what possible solution could you explore?", type: "textarea", wide: true },
  { key: "project_learning_goal", label: "What would you like to learn during GIF that could help you develop this idea?", type: "textarea", wide: true },
];
const IDEA_STAGES = [
  { value: "yes", label: "Yes, I already have an idea" },
  { value: "rough", label: "I have a rough idea" },
  { value: "none", label: "No, I haven't decided yet" },
];

const FILES = {
  photo: { col: "participant_photo_path", accept: "image/jpeg,image/png,image/webp", types: ["image/jpeg", "image/png", "image/webp"], formats: "JPG, PNG or WEBP" },
  passport: { col: "passport_document_path", accept: "application/pdf,image/jpeg,image/png", types: ["application/pdf", "image/jpeg", "image/png"], formats: "PDF, JPG or PNG" },
  flight: { col: "flight_document_path", accept: "application/pdf,image/jpeg,image/png", types: ["application/pdf", "image/jpeg", "image/png"], formats: "PDF, JPG or PNG" },
} as const;
type FileKind = keyof typeof FILES;

// Every column the page reads (admin_notes is deliberately NOT here — participants can't read it)
const ALL_FIELDS = [...PERSONAL, ...PASSPORT, ...TRAVEL, ...MEALS, ...EMERGENCY, ...GUARDIAN, ...PROJECT_BASE, ...PROJECT_YES, ...PROJECT_ROUGH, ...PROJECT_NONE];
const READ_COLUMNS = Array.from(
  new Set([
    "id", "user_id", "participant_id", "email",
    "accommodation_status", "accommodation_name", "check_in_date", "check_out_date", "room_type", "room_bed_assignment", "roommate",
    "participant_photo_path", "passport_document_path", "flight_document_path",
    "guardian_acknowledgement", "project_idea_stage", "project_status",
    ...ALL_FIELDS.map((f) => f.key),
  ])
).join(",");

// ============================================================
// SMALL HELPERS
// ============================================================
type Row = { [k: string]: any };
type UserProfile = { full_name: string; avatar_url?: string; tier?: "explorer" | "insider" | "visionary" };

const isFilled = (r: Row, k: string) => {
  const v = r?.[k];
  if (v === null || v === undefined) return false;
  if (typeof v === "boolean") return k === "accommodation_required" ? true : v;
  return String(v).trim() !== "";
};

// Age on the first day of the programme (17 Nov 2026) from "YYYY-MM-DD"
const ageOnProgramme = (dob: string) => {
  const [y, m, d] = dob.split("-").map(Number);
  let age = 2026 - y;
  if (m > 11 || (m === 11 && d > 17)) age--;
  return age;
};

// Database row -> form values (everything as strings, except the guardian checkbox)
const formFromRow = (r: Row) => {
  const f: Record<string, any> = {};
  for (const { key } of ALL_FIELDS) {
    const v = r[key];
    if (key === "accommodation_required") f[key] = v === true ? "Yes" : v === false ? "No" : "";
    else if (key.endsWith("_time")) f[key] = typeof v === "string" ? v.slice(0, 5) : "";
    else f[key] = v ?? "";
  }
  f.project_idea_stage = r.project_idea_stage ?? "";
  f.guardian_acknowledgement = !!r.guardian_acknowledgement;
  return f;
};

const fmtDate = (s?: string | null) =>
  s ? new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700 border-green-100",
  red: "bg-[#914D4D]/10 text-[#914D4D] border-[#914D4D]/20",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  grey: "bg-[#304156]/10 text-[#304156]/70 border-[#304156]/10",
};

// ============================================================
// SMALL PIECES USED BY THE PAGE (kept in this file on purpose)
// ============================================================
function FieldInput({ f, value, onChange }: { f: F; value: string; onChange: (v: string) => void }) {
  const missing = !f.optional && String(value).trim() === "";
  const base = cn(
    "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#304156] placeholder:text-[#304156]/30",
    "focus:outline-none focus:ring-2 focus:ring-[#914D4D]/30 focus:border-[#914D4D]/50",
    "disabled:bg-gray-50 disabled:text-[#304156]/60 disabled:cursor-not-allowed",
    missing ? "border-[#914D4D]/30 bg-[#914D4D]/[0.03]" : "border-[#304156]/15"
  );
  // keep values that were preloaded by IELSco even if they are not in our option list
  const opts = f.options && value && !f.options.includes(value) ? [value, ...f.options] : f.options || [];

  return (
    <div className={f.wide ? "md:col-span-2" : ""}>
      <label className="flex items-center justify-between gap-2 text-xs font-bold text-[#304156] mb-1.5">
        <span>{f.label}{!f.optional && <span className="text-[#914D4D]"> *</span>}</span>
        {missing && <span className="text-[10px] font-semibold text-[#914D4D]/70 shrink-0">Incomplete</span>}
      </label>
      {f.type === "textarea" ? (
        <textarea rows={3} maxLength={2000} className={base} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : f.type === "select" ? (
        <select className={base} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={f.type || "text"} maxLength={300} className={base} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.hint && <p className="text-[11px] text-[#304156]/50 mt-1">{f.hint}</p>}
    </div>
  );
}

function Card({ id, no, title, subtitle, status, children }: {
  id: string; no: string; title: string; subtitle?: string;
  status?: { label: string; tone: string }; children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className="bg-white rounded-3xl border border-[#304156]/10 shadow-sm relative overflow-hidden scroll-mt-24"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2F4055] to-[#914D4D]" />
      <div className="p-5 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <span className="text-3xl font-black text-[#914D4D]/20 leading-none">{no}</span>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[#304156]">{title}</h2>
              {subtitle && <p className="text-xs md:text-sm text-[#304156]/60 mt-1 leading-relaxed">{subtitle}</p>}
            </div>
          </div>
          {status && (
            <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full border shrink-0", badgeTone[status.tone])}>{status.label}</span>
          )}
        </div>
        {children}
      </div>
    </motion.section>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function GIFDelegatePortalPage() {
  const router = useRouter();
  const [supabase] = useState(() =>
    createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  );

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [row, setRow] = useState<Row | null>(null);           // last saved copy from the database
  const [form, setForm] = useState<Record<string, any>>({});   // what's currently in the inputs
  const [urls, setUrls] = useState<Record<string, string>>({}); // temporary signed links for files
  const [busy, setBusy] = useState<string | null>(null);       // which save/upload is running
  const [notice, setNotice] = useState<{ key: string; ok: boolean; text: string } | null>(null);

  const locked = Date.now() >= EDIT_DEADLINE.getTime();
  const setField = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const sign = async (path?: string | null) => {
    if (!path) return "";
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  };

  // ── LOAD ──
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/sign-in"); return; }
        setUserId(user.id);
        setAuthEmail(user.email || "");

        const [membershipRes, userRes] = await Promise.all([
          supabase.from("memberships").select("tier").eq("user_id", user.id).maybeSingle(),
          supabase.from("users").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
        ]);
        const dbTier = membershipRes.data?.tier;
        let uiTier: "explorer" | "insider" | "visionary" = "explorer";
        if (dbTier === "pro") uiTier = "insider";
        else if (dbTier === "premium" || dbTier === "visionary") uiTier = "visionary";
        setProfile({
          full_name: userRes.data?.full_name || user.user_metadata?.full_name || "Learner",
          avatar_url: userRes.data?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture,
          tier: uiTier,
        });

        // The database only returns a row if this user's email is a selected delegate.
        const { data: found, error } = await supabase.from("gif_delegates").select(READ_COLUMNS).maybeSingle();
        if (error) throw error;
        if (!found) return; // not a delegate -> "closed" screen

        let current: Row = found as unknown as Row;

        // First login: link this account to the delegate record (needed for file storage paths)
        if (!current.user_id) {
          const { data: linked, error: linkErr } = await supabase
            .from("gif_delegates").update({ user_id: user.id }).eq("id", current.id).select(READ_COLUMNS).single();
          if (linkErr) throw linkErr;
          current = linked as unknown as Row;
        }

        setRow(current);
        setForm(formFromRow(current));

        const [photo, passport, flight] = await Promise.all([
          sign(current.participant_photo_path), sign(current.passport_document_path), sign(current.flight_document_path),
        ]);
        setUrls({ photo, passport, flight });
      } catch (err: any) {
        console.error("Error init:", err);
        setLoadError(err?.message || "Something went wrong while loading your portal.");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SAVE ONE SECTION ──
  const toPayload = (keys: string[]) => {
    const out: Record<string, any> = {};
    for (const k of keys) {
      const v = form[k];
      if (k === "accommodation_required") out[k] = v === "Yes" ? true : v === "No" ? false : null;
      else if (k === "guardian_acknowledgement") out[k] = !!v;
      else out[k] = typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v;
    }
    return out;
  };

  const saveSection = async (key: string, keys: string[], extra: Record<string, any> = {}) => {
    if (!row) return;
    if (Date.now() >= EDIT_DEADLINE.getTime()) {
      setNotice({ key, ok: false, text: `Editing is closed. Please contact ${CONTACT_EMAIL}.` });
      return;
    }
    setBusy(key);
    setNotice(null);
    const { data, error } = await supabase
      .from("gif_delegates").update({ ...toPayload(keys), ...extra }).eq("id", row.id).select(READ_COLUMNS).single();
    if (error || !data) {
      setNotice({ key, ok: false, text: error?.message || "Could not save. Please try again." });
    } else {
      const saved = data as unknown as Row;
      const fresh = formFromRow(saved);
      setRow(saved);
      // only refresh the fields of this section, so unsaved edits elsewhere are kept
      setForm((p) => { const n = { ...p }; for (const k of keys) n[k] = fresh[k]; return n; });
      setNotice({ key, ok: true, text: "Information saved successfully." });
    }
    setBusy(null);
  };

  // Project: figure out the participant-allowed status automatically
  const projectKeys = [...PROJECT_BASE, ...PROJECT_YES, ...PROJECT_ROUGH, ...PROJECT_NONE].map((f) => f.key).concat("project_idea_stage");
  const saveProject = () => {
    const stage = form.project_idea_stage;
    const active = [...PROJECT_BASE, ...(stage === "yes" ? PROJECT_YES : stage === "rough" ? PROJECT_ROUGH : stage === "none" ? PROJECT_NONE : [])].map((f) => f.key);
    const allActiveFilled = !!stage && active.every((k) => String(form[k] ?? "").trim() !== "");
    const anyFilled = projectKeys.some((k) => String(form[k] ?? "").trim() !== "");
    const extra: Record<string, any> = {};
    if (!ADMIN_PROJECT_STATUSES.includes(row?.project_status)) {
      extra.project_status = allActiveFilled ? "Idea Submitted" : anyFilled ? "Exploring" : "Not Started";
    }
    return saveSection("project", projectKeys, extra);
  };

  // ── UPLOAD A FILE (photo / passport / flight) ──
  const handleUpload = async (kind: FileKind, file: File) => {
    if (!row || !userId) return;
    const cfg = FILES[kind];
    if (Date.now() >= EDIT_DEADLINE.getTime()) {
      setNotice({ key: kind, ok: false, text: `Editing is closed. Please contact ${CONTACT_EMAIL}.` });
      return;
    }
    if (!(cfg.types as readonly string[]).includes(file.type)) {
      setNotice({ key: kind, ok: false, text: `Wrong file type. Please upload ${cfg.formats}.` });
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setNotice({ key: kind, ok: false, text: `File is too large. Maximum ${MAX_FILE_MB} MB.` });
      return;
    }

    setBusy(`upload-${kind}`);
    setNotice(null);
    const ext = (file.name.split(".").pop() || "file").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${kind}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setNotice({ key: kind, ok: false, text: upErr.message });
      setBusy(null);
      return;
    }

    const { data, error } = await supabase
      .from("gif_delegates").update({ [cfg.col]: path }).eq("id", row.id).select(READ_COLUMNS).single();
    if (error || !data) {
      await supabase.storage.from(BUCKET).remove([path]); // undo the upload
      setNotice({ key: kind, ok: false, text: error?.message || "Could not save the file. Please try again." });
      setBusy(null);
      return;
    }

    const oldPath = row[cfg.col];
    if (oldPath && oldPath !== path) await supabase.storage.from(BUCKET).remove([oldPath]); // best effort
    setRow(data as unknown as Row);
    const url = await sign(path);
    setUrls((p) => ({ ...p, [kind]: url }));
    setNotice({ key: kind, ok: true, text: "File uploaded successfully." });
    setBusy(null);
  };

  // ── LAYOUT WRAPPER ──
  const layout = (children: React.ReactNode) => (
    <DashboardLayout userTier={profile?.tier} userName={profile?.full_name} userAvatar={profile?.avatar_url}>
      {children}
    </DashboardLayout>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="w-10 h-10 animate-spin text-[#914D4D]" />
    </div>
  );

  if (loadError) return layout(
    <div className="max-w-2xl mx-auto px-4 md:px-8 pt-12 pb-20 font-geologica">
      <div className="bg-white rounded-3xl border border-[#914D4D]/20 p-8 text-center space-y-3 shadow-sm">
        <AlertCircle className="w-8 h-8 text-[#914D4D] mx-auto" />
        <h1 className="text-xl font-bold text-[#304156]">We couldn&apos;t load your portal</h1>
        <p className="text-sm text-[#304156]/70">{loadError}</p>
        <p className="text-sm text-[#304156]/70">Please refresh the page, or contact <strong>{CONTACT_EMAIL}</strong>.</p>
      </div>
    </div>
  );

  // ── NOT A SELECTED DELEGATE ──
  if (!row) return layout(
    <div className="max-w-3xl mx-auto px-4 md:px-8 pt-12 pb-20 font-geologica">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2F4055] via-[#914D4D] to-[#304156] rounded-3xl shadow-2xl p-8 md:p-12 text-center space-y-5">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full">
          <Lock className="w-4 h-4 text-white/80" />
          <span className="text-white font-bold text-xs uppercase tracking-wide">Delegates only</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white">GIF Singapore 2026</h1>
        <p className="text-white/90 text-base md:text-lg font-light leading-relaxed">
          This participant portal is available only to selected GIF Singapore 2026 delegates.
        </p>
        <p className="text-white/80">Applications for this batch are closed.</p>
        <p className="text-[#FFD1D1] font-bold">See you at GIF Batch 3 — 2027.</p>
        <p className="text-white/60 text-xs pt-2">
          Signed in as {authEmail}. Selected delegate? Make sure you are logged in with the email registered for GIF.
        </p>
      </div>
    </div>
  );

  // ============================================================
  // DERIVED: profile completion (based on SAVED data, participant fields only)
  // ============================================================
  const count = (keys: string[]) => ({ done: keys.filter((k) => isFilled(row, k)).length, total: keys.length });
  const req = (list: F[]) => count(list.filter((f) => !f.optional).map((f) => f.key));

  const age = row.date_of_birth ? ageOnProgramme(row.date_of_birth) : null;
  const guardianNeeded = age !== null && age < 18;
  const stage = row.project_idea_stage as string | null;
  const projectReq = count([
    ...PROJECT_BASE.map((f) => f.key),
    "project_idea_stage",
    ...(stage === "yes" ? PROJECT_YES : stage === "rough" ? PROJECT_ROUGH : stage === "none" ? PROJECT_NONE : []).map((f) => f.key),
  ]);

  type Sec = { id: string; title: string; done: number; total: number; na?: boolean; naLabel?: string };
  const sections: Sec[] = [
    { id: "personal", title: "Personal Information", ...req(PERSONAL) },
    { id: "photo", title: "Participant Photo", ...count(["participant_photo_path"]) },
    { id: "passport-travel", title: "Passport", ...count([...PASSPORT.map((f) => f.key), "passport_document_path"]) },
    { id: "passport-travel", title: "Travel", ...count([...TRAVEL.map((f) => f.key), "flight_document_path"]) },
    { id: "meals", title: "Accommodation & Meals", ...req(MEALS) },
    { id: "emergency", title: "Emergency Contact", ...req(EMERGENCY) },
    age === null
      ? { id: "guardian", title: "Guardian Information", done: 0, total: 1, naLabel: "Add date of birth" }
      : guardianNeeded
        ? { id: "guardian", title: "Guardian Information", ...count([...GUARDIAN.map((f) => f.key), "guardian_acknowledgement"]) }
        : { id: "guardian", title: "Guardian Information", done: 0, total: 0, na: true },
    { id: "project", title: "Fellowship Project", ...projectReq },
  ];
  const totalDone = sections.reduce((s, x) => s + x.done, 0);
  const totalAll = sections.reduce((s, x) => s + x.total, 0);
  const pct = totalAll ? Math.round((totalDone / totalAll) * 100) : 0;

  const statusOf = (s: Sec) => {
    if (s.na) return { label: "Not required", tone: "grey" };
    if (s.naLabel) return { label: s.naLabel, tone: "amber" };
    if (s.done === s.total) return { label: "Complete", tone: "green" };
    if (s.done === 0) return { label: "Missing", tone: "red" };
    return { label: "Needs attention", tone: "amber" };
  };
  const secStatus = (title: string) => statusOf(sections.find((s) => s.title === title)!);

  const msUntil = EDIT_DEADLINE.getTime() - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msUntil / 86400000));

  // ============================================================
  // RENDER HELPERS (plain functions, not components)
  // ============================================================
  const fieldsGrid = (list: F[]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((f) => <FieldInput key={f.key} f={f} value={form[f.key] ?? ""} onChange={(v) => setField(f.key, v)} />)}
    </div>
  );

  const saveBar = (key: string, keys: string[], label = "Save", onClick?: () => void) =>
    !locked && (
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
        <Button
          type="button"
          disabled={busy !== null}
          onClick={onClick || (() => saveSection(key, keys))}
          className="w-full sm:w-auto py-2.5 px-6 rounded-xl font-bold bg-[#304156] hover:bg-[#2F4055] text-white shadow-md"
        >
          {busy === key ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-2" /> {label}</>}
        </Button>
        {notice?.key === key && (
          <p className={cn("text-sm font-medium flex items-center gap-1.5", notice.ok ? "text-green-700" : "text-[#914D4D]")}>
            {notice.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {notice.text}
          </p>
        )}
      </div>
    );

  const fileBox = (kind: FileKind, title: string, help: React.ReactNode) => {
    const cfg = FILES[kind];
    const path = row[cfg.col];
    const url = urls[kind];
    return (
      <div className="rounded-2xl border border-dashed border-[#304156]/25 bg-[#304156]/[0.03] p-4 md:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-[#304156]">{title} <span className="text-[#914D4D]">*</span></h3>
          <span className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0", path ? badgeTone.green : badgeTone.red)}>
            {path ? "Uploaded" : "Missing"}
          </span>
        </div>
        <div className="text-xs text-[#304156]/70 leading-relaxed">{help}</div>

        {kind === "photo" && url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Your participant photo" className="h-72 w-56 max-w-full rounded-2xl object-cover border border-[#304156]/10 shadow-sm" />
        )}
        {kind !== "photo" && path && (
          url
            ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-bold text-[#914D4D] underline underline-offset-2">View uploaded file</a>
            : <p className="text-sm text-[#304156]/60">A file is on record.</p>
        )}

        {!locked && (
          <label className={cn(
            "inline-flex items-center gap-2 cursor-pointer rounded-xl bg-white border border-[#304156]/20 px-4 py-2.5 text-sm font-bold text-[#304156] hover:border-[#914D4D]/50 transition-colors",
            busy !== null && "opacity-50 pointer-events-none"
          )}>
            <input
              type="file"
              className="hidden"
              accept={cfg.accept}
              onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) handleUpload(kind, file); }}
            />
            {busy === `upload-${kind}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {busy === `upload-${kind}` ? "Uploading…" : path ? "Replace file" : "Upload file"}
            <span className="font-normal text-[#304156]/50 text-xs">({cfg.formats}, max {MAX_FILE_MB} MB)</span>
          </label>
        )}
        {notice?.key === kind && (
          <p className={cn("text-sm font-medium flex items-center gap-1.5", notice.ok ? "text-green-700" : "text-[#914D4D]")}>
            {notice.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {notice.text}
          </p>
        )}
      </div>
    );
  };

  const adminValue = (v?: string | null) => v || <span className="text-[#304156]/40 font-normal">To be assigned by IELSco</span>;
  const adminItems: [string, React.ReactNode][] = [
    ["Accommodation status", adminValue(row.accommodation_status)],
    ["Accommodation name", adminValue(row.accommodation_name)],
    ["Check-in", adminValue(fmtDate(row.check_in_date))],
    ["Check-out", adminValue(fmtDate(row.check_out_date))],
    ["Room type", adminValue(row.room_type)],
    ["Room / bed assignment", adminValue(row.room_bed_assignment)],
    ["Roommate", adminValue(row.roommate)],
  ];

  // ============================================================
  // PAGE
  // ============================================================
  return layout(
    <div className="max-w-5xl mx-auto pb-20 space-y-8 px-4 md:px-8 pt-8 font-geologica">

      {/* === HERO === */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2F4055] via-[#914D4D] to-[#304156] rounded-3xl shadow-2xl">
        <div className="absolute bg-[url('/images/contents/stories/member-stories/banner/singapore-banner.png')] bg-cover bg-center inset-0 opacity-10 mix-blend-overlay">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#914D4D] rounded-full blur-[120px] opacity-60"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#304156] rounded-full blur-[120px] opacity-80"></div>
        </div>
        <div className="relative z-10 p-6 md:p-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Image src="/images/logos/events/gif.png" alt="Global Impact Fellowship" width={140} height={50} priority className="h-10 w-auto drop-shadow-lg brightness-0 invert" />
                <div className="h-8 w-px bg-white/30"></div>
                <div className="bg-[#FFD1D1]/20 px-3 py-1 rounded-full border border-[#FFD1D1]/30 text-xs font-bold text-[#FFD1D1] tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> SELECTED DELEGATE
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">Welcome to GIF Singapore 2026</h1>
                <p className="text-white/90 text-base md:text-lg font-light">You&apos;re officially selected as a GIF 2026 Delegate.</p>
              </div>
              <div className="flex flex-wrap gap-2.5 text-sm text-white">
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full"><MapPin className="w-4 h-4" /> Singapore</span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full"><Calendar className="w-4 h-4" /> 17–20 November 2026</span>
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full"><Users className="w-4 h-4" /> 20 Delegates</span>
              </div>
            </div>
            <Image src="/images/logos/events/gifsgp.png" alt="GIF Singapore" width={180} height={60} priority className="hidden md:block h-28 w-auto drop-shadow-2xl object-contain" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-white/60">Participant ID</div>
              <div className="text-lg font-black text-white mt-1">{row.participant_id}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-white/60">Full Name</div>
              <div className="text-lg font-black text-white mt-1 break-words">{row.full_name || "—"}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] uppercase tracking-widest font-semibold text-white/60">Profile Completion</div>
              <div className="text-lg font-black text-[#FFD1D1] mt-1">{pct}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* === DEADLINE / LOCKED NOTICE === */}
      {locked ? (
        <div className="bg-[#914D4D]/5 border border-[#914D4D]/20 rounded-2xl p-5 flex items-start gap-4">
          <Lock className="w-5 h-5 text-[#914D4D] mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-bold text-[#914D4D]">Participant information editing closed</p>
            <p className="text-sm text-[#914D4D]/80 leading-relaxed">
              Your information was locked after the 20 October 2026 deadline. You can still view everything below.
              If you need to make a correction after this deadline, please contact: <strong>{CONTACT_EMAIL}</strong>
            </p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#2F4055]/5 border border-[#2F4055]/10 rounded-2xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-[#2F4055] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#2F4055]">Complete your information by 20 October 2026</p>
              <p className="text-xs text-[#2F4055]/70 mt-0.5">23:59 WIB (Asia/Jakarta) · {daysLeft} day{daysLeft === 1 ? "" : "s"} left. After this, the portal becomes read-only.</p>
            </div>
          </div>
          <div className="bg-[#914D4D]/5 border border-[#914D4D]/15 rounded-2xl p-4 flex items-start gap-3">
            <Plane className="w-5 h-5 text-[#914D4D] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-[#914D4D]">All flights should be purchased by 19 October 2026</p>
              <p className="text-xs text-[#914D4D]/70 mt-0.5">This portal only collects your flight details — it is not a booking system.</p>
            </div>
          </div>
        </div>
      )}

      {/* === PROFILE COMPLETION === */}
      <div className="bg-white rounded-3xl border border-[#304156]/10 p-5 md:p-8 shadow-sm space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[#304156]">Participant Profile</h2>
            <p className="text-xs md:text-sm text-[#304156]/60 mt-1">What you still need to prepare before Singapore.</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black text-[#914D4D] leading-none">{pct}%</div>
            <div className="text-[11px] font-semibold text-[#304156]/60 mt-1">Complete</div>
          </div>
        </div>
        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#2F4055] to-[#914D4D] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {sections.map((s) => {
            const st = statusOf(s);
            return (
              <a key={s.title} href={`#${s.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#304156]/10 px-4 py-2.5 hover:border-[#914D4D]/40 transition-colors">
                <span className="text-sm font-medium text-[#304156]">{s.title}</span>
                <span className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full border", badgeTone[st.tone])}>{st.label}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* === PROGRAMME PREVIEW === */}
      <div className="space-y-3">
        <h2 className="text-lg md:text-xl font-bold text-[#304156]">Programme Preview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PROGRAMME.map((d) => (
            <div key={d.date} className="bg-white rounded-2xl border border-[#304156]/10 p-4 shadow-sm">
              <div className="text-[11px] font-bold tracking-widest text-[#914D4D]">{d.date}</div>
              <div className="text-sm md:text-base font-bold text-[#304156] mt-1.5 leading-snug">{d.title}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* FORM SECTIONS — the fieldset disables every input after the deadline */}
      {/* ============================================================ */}
      <fieldset disabled={locked} className="min-w-0 m-0 p-0 border-0 space-y-6">

        {/* 01 PERSONAL */}
        <Card id="personal" no="01" title="Personal Information" subtitle="Information IELSco already has is filled in for you. Please check it and complete anything missing." status={secStatus("Personal Information")}>
          <div className="rounded-xl bg-[#304156]/5 border border-[#304156]/10 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#304156]/60">Registered account email</div>
            <div className="text-sm font-bold text-[#304156] break-all mt-0.5">{row.email}</div>
            <p className="text-[11px] text-[#304156]/60 mt-1.5 leading-relaxed">
              This email cannot be edited here. Need to change your registered email? Please reply to the GIF participant email or contact
              Arbadza — WhatsApp: <a href={CONTACT_WA_LINK} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{CONTACT_WA_DISPLAY}</a> · Email: <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold">{CONTACT_EMAIL}</a>
            </p>
          </div>
          {fieldsGrid(PERSONAL)}
          {saveBar("personal", PERSONAL.map((f) => f.key), "Save personal information")}
        </Card>

        {/* 02 PHOTO */}
        <Card id="photo" no="02" title="Participant Photo" subtitle="Required. Used for delegate announcements, introduction posts, programme documentation and internal identification." status={secStatus("Participant Photo")}>
          {fileBox("photo", "Formal participant photo",
            <ul className="list-disc pl-4 space-y-1">
              <li>Half-body / waist-up, portrait orientation preferred</li>
              <li>One person only, face clearly visible, good lighting</li>
              <li>Professional / formal appearance</li>
              <li>No group photo, no screenshot, no heavily filtered photo</li>
            </ul>
          )}
        </Card>

        {/* 03 PASSPORT & TRAVEL */}
        <Card id="passport-travel" no="03" title="Passport & Travel" subtitle="Your passport and documents are private — only you and the IELSco team can see them." status={secStatus("Travel")}>
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#304156]">Passport</h3>
              <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full border", badgeTone[secStatus("Passport").tone])}>{secStatus("Passport").label}</span>
            </div>
            {fieldsGrid(PASSPORT)}
            {fileBox("passport", "Passport bio page", "Upload a clear scan or photo of the page with your photo and personal details.")}
            {saveBar("passport", PASSPORT.map((f) => f.key), "Save passport details")}
          </div>

          <div className="h-px bg-[#304156]/10" />

          <div className="space-y-5">
  <div className="flex items-center justify-between gap-3">
    <h3 className="text-base font-bold text-[#304156]">Flights</h3>
    <span
      className={cn(
        "text-[11px] font-bold px-3 py-1 rounded-full border",
        badgeTone[secStatus("Travel").tone]
      )}
    >
      {secStatus("Travel").label}
    </span>
  </div>

  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
    <p className="text-sm font-bold text-amber-900">
      Important: Coordinated flight booking
    </p>
    <p className="text-xs leading-relaxed text-amber-900">
      All delegate flights are scheduled to be purchased together on{" "}
      <strong>12 October 2026</strong>. Please do not purchase your flight
      before this date. Before booking, coordinate with Arba at{" "}
      <a
        href="https://wa.me/6288297253491"
        target="_blank"
        rel="noreferrer"
        className="font-bold underline"
      >
        +62 882-9725-3491
      </a>
      .
    </p>
  </div>

  <div className="space-y-2">
    <p className="text-sm font-bold text-[#304156]">
      How would you like to book your flight?
    </p>
    <p className="text-xs leading-relaxed text-[#304156]/70">
      Choose whether you will arrange your own flight or purchase it through
      IELSco. If you choose IELSco, please contact Keysha after paying the
      ticket price to confirm your booking details. You can complete the
      flight details below once your ticket has been purchased.
    </p>
    <p className="text-xs leading-relaxed text-[#304156]/70">
      Keysha:{" "}
      <a
        href="https://wa.me/6282119889911"
        target="_blank"
        rel="noreferrer"
        className="font-bold underline"
      >
        +62 821-1988-9911
      </a>
    </p>
  </div>

  <div className="rounded-xl bg-[#304156]/5 p-4 space-y-2">
    <p className="text-sm font-bold text-[#304156]">Arrival in Singapore</p>
    <p className="text-xs leading-relaxed text-[#304156]/70">
      If you book your own flight, please choose a morning flight that arrives
      in Singapore no later than <strong>11:00 AM Singapore time on 17
      November 2026</strong>, so you can join the programme on time.
      If you have a specific reason for arriving later, please contact Arba
      in advance at{" "}
      <a
        href="https://wa.me/6288297253491"
        target="_blank"
        rel="noreferrer"
        className="font-bold underline"
      >
        +62 882-9725-3491
      </a>
      .
    </p>
  </div>

  <div className="rounded-xl bg-[#304156]/5 p-4 space-y-2">
    <p className="text-sm font-bold text-[#304156]">Departure & extensions</p>
    <p className="text-xs leading-relaxed text-[#304156]/70">
      You may extend your stay and choose a later departure date. However,
      you must inform and coordinate with Arba in advance. IELSco is
      responsible for coordinating delegate safety throughout the programme
      and ensuring everyone has a safe return plan. Any extension must be
      discussed and confirmed beforehand.
    </p>
  </div>

  {fieldsGrid(TRAVEL)}

  {fileBox(
    "flight",
    "Flight ticket / booking confirmation",
    "Upload your e-ticket or booking confirmation after your flight has been purchased."
  )}

  {saveBar("travel", TRAVEL.map((f) => f.key), "Save travel details")}
</div>
        </Card>

        {/* 04 ACCOMMODATION & MEALS */}
        <Card id="meals" no="04" title="Accommodation & Meals" subtitle="Programme accommodation dates: 17 November 2026 through 20 November 2026." status={secStatus("Accommodation & Meals")}>
          {fieldsGrid(MEALS)}
          {saveBar("meals", MEALS.map((f) => f.key), "Save accommodation & meals")}
          <div className="rounded-2xl bg-[#304156]/[0.04] border border-[#304156]/10 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-[#304156]/50" />
              <h3 className="text-sm font-bold text-[#304156]">Arranged by IELSco</h3>
              <span className="text-[11px] text-[#304156]/50">(read-only)</span>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {adminItems.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-[#304156]/50">{label}</dt>
                  <dd className="text-sm font-bold text-[#304156] mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>

        {/* 05 EMERGENCY CONTACT */}
        <Card id="emergency" no="05" title="Emergency Contact" subtitle="Private. Only used in case of an emergency during the programme." status={secStatus("Emergency Contact")}>
          {fieldsGrid(EMERGENCY)}
          {saveBar("emergency", EMERGENCY.map((f) => f.key), "Save emergency contact")}
        </Card>

        {/* 06 GUARDIAN */}
        <Card id="guardian" no="06" title="Guardian Information" subtitle="Required only for delegates who are under 18." status={secStatus("Guardian Information")}>
          {age === null ? (
            <p className="text-sm text-[#304156]/70">Add your date of birth in Personal Information first, so we know whether guardian details are needed.</p>
          ) : !guardianNeeded ? (
            <p className="text-sm text-[#304156]/70">You will be {age} on 17 November 2026 — guardian information is not required.</p>
          ) : (
            <>
              <p className="text-sm text-[#304156]/70">You will be {age} on 17 November 2026, so we need your parent or guardian&apos;s details and consent.</p>
              {fieldsGrid(GUARDIAN)}
              <label className="flex items-start gap-3 rounded-xl border border-[#304156]/15 p-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#914D4D]"
                  checked={!!form.guardian_acknowledgement}
                  onChange={(e) => setField("guardian_acknowledgement", e.target.checked)}
                />
                <span className="text-sm text-[#304156] leading-relaxed">
                  My parent/guardian has been informed about and consents to my participation in GIF Singapore 2026 (17–20 November 2026). <span className="text-[#914D4D]">*</span>
                </span>
              </label>
              {saveBar("guardian", [...GUARDIAN.map((f) => f.key), "guardian_acknowledgement"], "Save guardian information")}
            </>
          )}
        </Card>

        {/* 07 PROJECT */}
        <Card id="project" no="07" title="Fellowship Project" status={secStatus("Fellowship Project")}>
          <div className="rounded-2xl bg-gradient-to-br from-[#2F4055]/5 to-[#914D4D]/5 border border-[#914D4D]/15 p-4 md:p-5 space-y-2">
            <h3 className="text-base font-bold text-[#914D4D]">Project Preparation</h3>
            <p className="text-sm text-[#304156]/80 leading-relaxed">GIF is not about arriving with a perfect startup or fully developed business plan.</p>
            <p className="text-sm text-[#304156]/80 leading-relaxed">We want every delegate to come to Singapore with a problem worth exploring, a possible solution, and a reason why the problem matters to them.</p>
            <p className="text-sm text-[#304156]/80 leading-relaxed">If you already have a project idea, you can develop it here.</p>
            <p className="text-sm text-[#304156]/80 leading-relaxed">If you don&apos;t have one yet, that&apos;s completely fine — use this section to identify a problem you care about and start developing a possible direction.</p>
          </div>

          {fieldsGrid(PROJECT_BASE)}

          <div>
            <p className="text-xs font-bold text-[#304156] mb-2">Do you already have a project idea? <span className="text-[#914D4D]">*</span></p>
            <div className="grid gap-2 sm:grid-cols-3">
              {IDEA_STAGES.map((o) => (
                <label key={o.value} className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer text-sm transition-colors",
                  form.project_idea_stage === o.value ? "border-[#914D4D] bg-[#914D4D]/5 text-[#914D4D] font-bold" : "border-[#304156]/15 text-[#304156] hover:border-[#914D4D]/40"
                )}>
                  <input type="radio" name="project_idea_stage" className="accent-[#914D4D]" checked={form.project_idea_stage === o.value} onChange={() => setField("project_idea_stage", o.value)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          {form.project_idea_stage === "yes" && fieldsGrid(PROJECT_YES)}
          {form.project_idea_stage === "rough" && fieldsGrid(PROJECT_ROUGH)}
          {form.project_idea_stage === "none" && fieldsGrid(PROJECT_NONE)}

          <div className="flex items-center gap-2 text-sm text-[#304156]/70">
            <span className="font-bold text-[#304156]">Project status:</span>
            <span className="px-3 py-0.5 rounded-full bg-[#304156]/10 text-[#304156] text-xs font-bold">{row.project_status}</span>
            <span className="text-[11px] text-[#304156]/50">(updated automatically as you complete this section)</span>
          </div>
          {saveBar("project", projectKeys, "Save project", saveProject)}
        </Card>
      </fieldset>

      {/* === HELP === */}
      <div className="bg-white rounded-2xl border border-[#304156]/10 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="bg-[#304156]/5 p-3 rounded-xl"><Mail className="w-6 h-6 text-[#304156]" /></div>
            <div>
              <h4 className="font-bold text-[#304156] text-lg">Need help or a correction?</h4>
              <p className="text-sm text-gray-600">Contact Arbadza — <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold">{CONTACT_EMAIL}</a></p>
            </div>
          </div>
          <Link href={CONTACT_WA_LINK} target="_blank">
            <Button className="px-6 py-3 bg-[#304156] hover:bg-[#2F4055] text-white font-bold rounded-xl shadow-md flex items-center gap-2">
              WhatsApp {CONTACT_WA_DISPLAY}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}