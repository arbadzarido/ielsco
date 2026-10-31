"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { btnPrimary, fieldInput, fieldLabel, focusRing } from "@/components/site/ui";
import { divisions } from "@/data/careers/divisions";

// Careers application (2027 cohort). Files go straight from the browser to the private bucket career-applications
// (visitors can upload but never read them back); the answers go through public.submit_career_application(), which
// re-validates everything, checks the files exist, enforces the window and one application per email. No service key.

const MAX_BYTES = 10 * 1024 * 1024;
const BUCKET = "career-applications";
const hint = "mt-1.5 block text-[13px] font-normal text-[#2F4157]/60";

const ERRORS: Record<string, string> = {
  full_name: "Please enter your full name.",
  email: "Please enter a valid email address.",
  whatsapp: "Please enter your WhatsApp number with country code, e.g. +62 812 3456 7890.",
  university: "Please enter your university.",
  academic_year: "Please choose your current academic year (1st, 2nd or 3rd).",
  division: "Please choose a division.",
  role: "Please choose a role from the list.",
  instagram: "Please enter your Instagram profile link or @username (not a post link).",
  linkedin_url: "Please enter your LinkedIn profile link, e.g. https://www.linkedin.com/in/your-name.",
  cv: "Please attach your CV as a PDF (up to 10 MB).",
  cv_missing: "Your CV didn't finish uploading. Please try again.",
  portfolio: "Please attach your portfolio as a PDF, or share a link to it.",
  portfolio_missing: "Your portfolio didn't finish uploading. Please try again.",
  portfolio_url: "Please enter a full portfolio link starting with https://.",
  motivation: "Please keep your motivation under 1,000 characters.",
};

function rand() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

function FileField({ name, label, help, file, onFile, required }: { name: string; label: string; help: string; file: File | null; onFile: (f: File | null, err?: string) => void; required?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className={fieldLabel} id={`${name}-label`}>{label}</p>
      <span className={hint}>{help}</span>
      {file ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-[14px] border border-[#D5DBE3] bg-[#F7F8FA] px-4 py-3 text-[15px] text-[#1A2534]">
          <span className="flex min-w-0 items-center gap-2"><FileText size={18} className="shrink-0 text-[#577E90]" aria-hidden="true" /><span className="truncate">{file.name}</span><span className="shrink-0 text-[#2F4157]/60">{(file.size / 1024 / 1024).toFixed(1)} MB</span></span>
          <button type="button" onClick={() => { onFile(null); if (ref.current) ref.current.value = ""; }} className={cn("rounded-full p-1 text-[#2F4157] hover:bg-white", focusRing)} aria-label={`Remove ${file.name}`}><X size={16} aria-hidden="true" /></button>
        </div>
      ) : null}
      <input
        ref={ref} id={name} name={name} type="file" accept="application/pdf,.pdf" required={required && !file} aria-labelledby={`${name}-label`}
        className={cn(fieldInput, "cursor-pointer py-2.5 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-[#EEF2F7] file:px-4 file:py-1.5 file:font-semibold file:text-[#2F4157]", file && "sr-only")}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (!f) return onFile(null);
          if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) { e.target.value = ""; return onFile(null, `${f.name} isn't a PDF. Please export it as PDF first.`); }
          if (f.size > MAX_BYTES) { e.target.value = ""; return onFile(null, `${f.name} is larger than 10 MB. Please compress it or share a link instead.`); }
          onFile(f);
        }}
      />
    </div>
  );
}

export function ApplicationForm() {
  const id = useMemo(() => crypto.randomUUID(), []);
  const [division, setDivision] = useState("");
  const [roleId, setRoleId] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [portfolioMode, setPortfolioMode] = useState<"file" | "link">("file");
  const [portfolio, setPortfolio] = useState<File | null>(null);
  const [motivation, setMotivation] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  // Picking a role also picks its division; changing the division clears a role from another division.
  const pickRole = (id: string) => {
    setRoleId(id);
    const d = divisions.find((x) => x.roles.some((r) => r.id === id));
    if (d) setDivision(d.slug);
  };
  const pickDivision = (slug: string) => {
    setDivision(slug);
    if (!divisions.find((d) => d.slug === slug)?.roles.some((r) => r.id === roleId)) setRoleId("");
  };
  const roleGroups = division ? divisions.filter((d) => d.slug === division) : divisions;
  const busy = state === "uploading" || state === "sending";

  const fail = (msg: string) => { setState("error"); setError(msg); };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    if (String(f.get("website") ?? "")) return; // honeypot
    if (!cv) return fail(ERRORS.cv);
    if (portfolioMode === "file" && !portfolio) return fail(ERRORS.portfolio);
    setError("");
    setState("uploading");
    const supabase = createClient();
    try {
      const upload = async (file: File, kind: "cv" | "portfolio") => {
        const path = `incoming/${id}/${kind}-${rand()}.pdf`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
        if (upErr) throw new Error(/closed|policy|row-level/i.test(upErr.message) ? "applications_closed" : `Uploading ${file.name} failed. Please check your connection and try again.`);
        return path;
      };
      const cvPath = await upload(cv, "cv");
      const portfolioPath = portfolioMode === "file" && portfolio ? await upload(portfolio, "portfolio") : null;
      setState("sending");
      const s = (k: string) => String(f.get(k) ?? "").trim();
      const { error: rpcErr } = await supabase.rpc("submit_career_application", {
        p_id: id, p_full_name: s("full_name"), p_email: s("email"), p_whatsapp: s("whatsapp"), p_university: s("university"),
        p_academic_year: Number(s("academic_year")), p_division: s("division"), p_role_id: s("role_id"), p_instagram: s("instagram"),
        p_linkedin_url: s("linkedin_url"), p_cv_path: cvPath, p_portfolio_path: portfolioPath,
        p_portfolio_url: portfolioMode === "link" ? s("portfolio_url") : "", p_motivation: motivation.trim(),
      });
      if (rpcErr) throw new Error(rpcErr.message);
      setEmail(s("email"));
      setState("sent");
      track("career_application_submitted", { division: s("division") });
      document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      const m = (err as Error).message || "";
      if (m.includes("already_applied")) return fail("We already have an application from this email for the 2027 cohort. To change it, email careers@ielsco.com.");
      if (m.includes("applications_closed")) return fail("Applications aren't open right now. Please check the dates above.");
      if (m.includes("too_many")) return fail("We're receiving a lot of applications right now. Please try again in a few minutes.");
      const field = m.match(/invalid: (\w+)/)?.[1];
      if (field) return fail(ERRORS[field] ?? "Please check the form and try again.");
      fail(m.startsWith("Uploading") ? m : "We couldn't send your application. Please try again, or email careers@ielsco.com if it keeps failing.");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-[20px] border border-[#CFE3D8] bg-[#F3FAF6] p-8" role="status" data-testid="career-application-sent">
        <CheckCircle2 className="text-[#2D7A58]" size={32} aria-hidden="true" />
        <p className="mt-4 text-[22px] font-bold text-[#1A2534]">Application received. Thank you!</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-[#2F4157]/85">
          <li>Our recruitment team will check your five Instagram campaign tasks directly on Instagram, so keep your account reachable and the story and repost up.</li>
          <li>All further updates, including the group-session schedule on 30 November, will be sent to <strong className="text-[#1A2534]">{email}</strong>. Check your spam folder too.</li>
          <li>Questions or changes: <a className="font-semibold underline" href="mailto:careers@ielsco.com">careers@ielsco.com</a></li>
        </ul>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" data-testid="career-application-form">
      <fieldset className="space-y-5" disabled={busy}>
        <legend className="text-[18px] font-bold text-[#1A2534]">About you</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={fieldLabel}>Full name<input name="full_name" required minLength={2} maxLength={120} autoComplete="name" className={fieldInput} /></label>
          <label className={fieldLabel}>Email address<input name="email" type="email" required maxLength={200} autoComplete="email" className={fieldInput} /></label>
          <label className={fieldLabel}>WhatsApp number<input name="whatsapp" type="tel" required inputMode="tel" maxLength={24} autoComplete="tel" placeholder="+62 812 3456 7890" className={fieldInput} /></label>
          <label className={fieldLabel}>University<input name="university" required minLength={2} maxLength={200} autoComplete="organization" className={fieldInput} /></label>
        </div>
        <div role="radiogroup" aria-labelledby="year-label">
          <p id="year-label" className={fieldLabel}>Current academic year</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {["1", "2", "3"].map((y) => (
              <label key={y} className="flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[#D5DBE3] px-3 py-3 text-[15px] font-semibold text-[#2F4157] has-[:checked]:border-[#2F4157] has-[:checked]:bg-[#EEF2F7] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#577E90]">
                <input type="radio" name="academic_year" value={y} required className="sr-only" />{y === "1" ? "1st" : y === "2" ? "2nd" : "3rd"} year
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5" disabled={busy}>
        <legend className="text-[18px] font-bold text-[#1A2534]">Where you&apos;d like to help</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={fieldLabel}>Preferred division
            <select name="division" required value={division} onChange={(e) => pickDivision(e.target.value)} className={fieldInput}>
              <option value="" disabled>Choose a division</option>
              {divisions.map((d) => <option key={d.slug} value={d.slug}>{d.title}</option>)}
            </select>
          </label>
          <label className={fieldLabel}>Preferred role <span className="font-normal text-[#2F4157]/60">(optional)</span>
            <select name="role_id" value={roleId} onChange={(e) => pickRole(e.target.value)} className={fieldInput} data-testid="role-select">
              <option value="">No preference</option>
              {roleGroups.map((d) => (
                <optgroup key={d.slug} label={d.title}>
                  {d.roles.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.scope})</option>)}
                </optgroup>
              ))}
            </select>
            <span className={hint}>{division ? "Roles in this division. " : "All 20 roles, grouped by division. "}Choosing a role fills in its division.</span>
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-5" disabled={busy}>
        <legend className="text-[18px] font-bold text-[#1A2534]">Profiles and documents</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={fieldLabel}>Instagram profile
            <input name="instagram" required maxLength={200} placeholder="https://www.instagram.com/yourname" className={fieldInput} />
            <span className={hint}>We use it to verify your campaign tasks. Keep the account public until results are out.</span>
          </label>
          <label className={fieldLabel}>LinkedIn profile
            <input name="linkedin_url" required maxLength={300} inputMode="url" placeholder="https://www.linkedin.com/in/yourname" className={fieldInput} />
            <span className={hint}>For your professional background.</span>
          </label>
        </div>
        <FileField name="cv" label="CV / Resume" help="PDF, up to 10 MB." file={cv} required onFile={(file, err) => { setCv(file); if (err) fail(err); else setError(""); }} />
        <div>
          <p className={fieldLabel} id="pf-label">Portfolio</p>
          <span className={hint}>Any work you&apos;re proud of: designs, videos, writing, projects, events or class work. Upload a PDF or share a link (Google Drive, Behance, YouTube, a website…).</span>
          <div className="mt-2 inline-flex rounded-full border border-[#D5DBE3] p-1" role="group" aria-labelledby="pf-label">
            {(["file", "link"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setPortfolioMode(m)} aria-pressed={portfolioMode === m}
                className={cn("rounded-full px-4 py-1.5 text-[14px] font-semibold", focusRing, portfolioMode === m ? "bg-[#2F4157] text-white" : "text-[#2F4157]")}>
                {m === "file" ? "Upload PDF" : "Share a link"}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {portfolioMode === "file"
              ? <FileField name="portfolio" label="Portfolio PDF" help="PDF, up to 10 MB." file={portfolio} required onFile={(file, err) => { setPortfolio(file); if (err) fail(err); else setError(""); }} />
              : <label className={fieldLabel}>Portfolio link<input name="portfolio_url" type="url" required maxLength={500} placeholder="https://" className={fieldInput} /><span className={hint}>Make sure anyone with the link can view it.</span></label>}
          </div>
        </div>
        <label className={fieldLabel}>Why do you want to join? <span className="font-normal text-[#2F4157]/60">(optional, a few sentences)</span>
          <textarea name="motivation" rows={4} maxLength={1000} value={motivation} onChange={(e) => setMotivation(e.target.value)} className={fieldInput} />
          <span className={cn(hint, "text-right")}>{motivation.length}/1000</span>
        </label>
      </fieldset>

      <fieldset className="space-y-3" disabled={busy}>
        <legend className="sr-only">Confirmations</legend>
        <label className="flex gap-3 text-[15px] leading-relaxed text-[#2F4157]">
          <input type="checkbox" name="tasks_done" required className="mt-1 h-5 w-5 shrink-0 accent-[#2F4157]" />
          <span>I have completed all five Instagram campaign tasks with the account above, and I understand the team will verify them on Instagram.</span>
        </label>
        <label className="flex gap-3 text-[15px] leading-relaxed text-[#2F4157]">
          <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0 accent-[#2F4157]" />
          <span>I agree that IELSco and Elco AI may use these details and documents to assess my application, as described in the <a className="font-semibold underline" href="/privacy-policy" target="_blank">privacy policy</a>.</span>
        </label>
      </fieldset>

      {/* Honeypot: hidden from people and assistive tech. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state === "error" && <p className="rounded-[12px] bg-[#FDF1F1] px-4 py-3 text-[15px] text-[#A23B3D]" role="alert" data-testid="career-application-error">{error}</p>}
      <button type="submit" disabled={busy} className={cn(btnPrimary, "w-full disabled:opacity-60 sm:w-auto")} data-testid="career-application-submit">
        {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
        {state === "uploading" ? "Uploading documents…" : state === "sending" ? "Sending application…" : "Submit application"}
      </button>
    </form>
  );
}
