"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, FileText, Loader2, Mail, MessageCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { btnPrimary, btnSecondary, fieldInput, fieldLabel, focusRing } from "@/components/site/ui";
import {
  CONSENT_VERSION, consentText, countryName, partnerDestination, whatsappLink, type ProfessionalOpportunity,
} from "@/lib/professional/model";

// Expression of interest for one professional listing. The optional CV goes straight from the browser to the private
// bucket opportunity-interest-cvs (upload-only for visitors); the answers go to /api/opportunities/interest, which stores
// them through public.submit_opportunity_interest() and emails careers@ielsco.com when email is configured. No identity
// documents are asked for. This is not a job application, and the form says so.

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "opportunity-interest-cvs";
const INBOX = "careers@ielsco.com";
const hint = "mt-1.5 block text-[13px] font-normal text-[#2F4157]/60";

const ERRORS: Record<string, string> = {
  fullName: "Please enter your full name.", full_name: "Please enter your full name.",
  email: "Please enter a valid email address.",
  whatsapp: "Please enter your WhatsApp number with country code, e.g. +62 812 3456 7890.",
  countryOfInterest: "Please choose a country.", country: "Please choose a country.",
  position: "Please choose the position you're interested in.",
  statement: "Please write at least 20 characters about why you're interested (up to 1,500).",
  occupation: "Please keep your current occupation under 160 characters.",
  experience: "Please keep your experience under 1,500 characters.",
  linkedin: "Please enter a LinkedIn link, e.g. https://www.linkedin.com/in/your-name.", linkedin_url: "Please enter a LinkedIn link, e.g. https://www.linkedin.com/in/your-name.",
  cv: "Your CV didn't upload correctly. Please attach it again.", cv_missing: "Your CV didn't finish uploading. Please try again.",
  consent: "Please tick the consent box to continue.",
  opportunity: "This listing is no longer available.",
};

type Fields = { fullName: string; email: string; whatsapp: string; position: string; countryOfInterest: string };

function mailtoFor(o: ProfessionalOpportunity, v: Fields, statement: string) {
  const subject = `Work abroad interest: ${o.title} (${countryName(o.country_code)})`;
  const body = `Hello IELSco careers team,\n\nI'm interested in "${o.title}" (${countryName(o.country_code)}).\n\nName: ${v.fullName}\nEmail: ${v.email}\nWhatsApp: ${v.whatsapp}\nPosition: ${v.position}\n\n${statement}\n`;
  return `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function InterestForm({ o, source, defaults }: { o: ProfessionalOpportunity; source: "public" | "dashboard"; defaults?: { fullName?: string; email?: string } }) {
  const id = useMemo(() => crypto.randomUUID(), []);
  const partner = o.partner?.name ?? "the recruitment partner";
  const positions = o.positions.length ? o.positions : [o.title];
  const [v, setV] = useState<Fields>({ fullName: defaults?.fullName ?? "", email: defaults?.email ?? "", whatsapp: "", position: positions.length === 1 ? positions[0] : "", countryOfInterest: countryName(o.country_code) });
  const [statement, setStatement] = useState("");
  const [cv, setCv] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [notified, setNotified] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = state === "uploading" || state === "sending";
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const fail = (msg: string) => { setState("error"); setError(msg); };
  const closed = o.status === "closed";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    if (String(f.get("website") ?? "")) return; // honeypot
    if (statement.trim().length < 20) return fail(ERRORS.statement);
    setError("");
    let cvPath = "";
    try {
      if (cv) {
        setState("uploading");
        cvPath = `incoming/${id}/cv-${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}.pdf`;
        const { error: upErr } = await createClient().storage.from(BUCKET).upload(cvPath, cv, { contentType: "application/pdf", upsert: false });
        if (upErr) throw new Error("upload");
      }
      setState("sending");
      const s = (k: string) => String(f.get(k) ?? "").trim();
      const res = await fetch("/api/opportunities/interest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id, opportunityId: o.id, fullName: v.fullName.trim(), email: v.email.trim(), whatsapp: v.whatsapp.trim(), countryOfInterest: v.countryOfInterest,
          position: v.position, statement: statement.trim(), occupation: s("occupation"), experience: s("experience"), linkedin: s("linkedin"),
          cvPath, preferredContact: s("preferredContact") || "whatsapp", consent: f.get("consent") === "on", consentVersion: CONSENT_VERSION, source,
          website: s("website"),
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (out.error === "already_submitted") return fail(`We already have your interest in this listing from ${v.email.trim()}. The team will be in touch; you can also contact ${partner} directly below.`);
        if (out.error === "closed") return fail("This listing has just closed, so we can't take new interest for it.");
        if (out.error === "too_many") return fail("We've received several submissions from this email today. Please try again tomorrow.");
        if (out.error === "invalid") return fail(ERRORS[out.field] ?? "Please check the form and try again.");
        throw new Error("server");
      }
      setNotified(out.notified === true);
      setState("sent");
      track("opportunity_interest_submitted", { opportunity: o.slug, source });
      document.getElementById("interest")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      fail((err as Error).message === "upload"
        ? "Your CV couldn't be uploaded. Check that it's a PDF under 5 MB, or remove it and send the form without it."
        : "We couldn't send your interest. Please try again, or email the team using the button below.");
    }
  }

  const wa = whatsappLink(o.partner?.whatsapp ?? null, `Hello, I'm interested in the ${o.title} job in ${countryName(o.country_code)} that I found on IELSco.`);
  const site = partnerDestination(o);

  if (state === "sent") {
    return (
      <div className="rounded-[20px] border border-[#CFE3D8] bg-[#F3FAF6] p-6 sm:p-8" role="status" data-testid="interest-sent">
        <CheckCircle2 className="text-[#2D7A58]" size={32} aria-hidden="true" />
        <h3 className="mt-3 text-[22px] font-bold text-[#1A2534]">Thank you, we&apos;ve received your interest</h3>
        <p className="mt-2 text-[15.5px] leading-relaxed text-[#2F4157]">
          Your expression of interest in <strong>{o.title}</strong> ({countryName(o.country_code)}) is with the IELSco team, who will point you to
          the right official recruitment channel. This is not a job application and does not guarantee selection or placement.
        </p>
        {!notified && (
          <div className="mt-5 rounded-[14px] border border-[#E6E9EE] bg-white p-4 text-[15px] text-[#2F4157]" data-testid="interest-mailto-fallback">
            <p>Want the team to see it sooner? Send a copy to {INBOX}.</p>
            <a href={mailtoFor(o, v, statement.trim())} className={cn(btnSecondary, "mt-3")}><Mail size={17} aria-hidden="true" /> Email {INBOX}</a>
          </div>
        )}
        <div className="mt-6 border-t border-[#CFE3D8] pt-5">
          <p className="text-[15px] font-bold text-[#1A2534]">Next step: talk to the official recruitment partner</p>
          <p className="mt-1 text-[14.5px] text-[#2F4157]/80">{partner} handles official recruitment information, selection, contracts and placement.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {site && <a href={site} target="_blank" rel="noopener noreferrer" className={btnPrimary} data-testid="interest-partner-site">Visit {o.partner?.short_name ?? "the partner"}&apos;s official website <ArrowUpRight size={18} aria-hidden="true" /></a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={btnSecondary}><MessageCircle size={17} aria-hidden="true" /> WhatsApp the partner</a>}
          </div>
        </div>
      </div>
    );
  }

  if (closed) {
    return <p className="rounded-[16px] border border-[#E6E9EE] bg-[#F8FAFC] p-5 text-[15px] text-[#2F4157]">This listing is closed, so it isn&apos;t taking new expressions of interest. Browse the other listings or check with {partner}.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" data-testid="interest-form" aria-describedby="interest-not-application">
      <p id="interest-not-application" className="rounded-[14px] border border-[#F2D7A6] bg-[#FFF8EB] px-4 py-3 text-[14.5px] leading-relaxed text-[#7A5310]">
        Submitting this form is <strong>not</strong> an official job application, an employment offer or a guarantee of placement. Please don&apos;t
        send passport or ID details here; {partner} will ask for documents in its own process.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={fieldLabel}>Full name *
          <input name="fullName" required minLength={2} maxLength={120} autoComplete="name" value={v.fullName} onChange={set("fullName")} className={fieldInput} />
        </label>
        <label className={fieldLabel}>Email *
          <input name="email" type="email" required maxLength={200} autoComplete="email" value={v.email} onChange={set("email")} className={fieldInput} />
        </label>
        <label className={fieldLabel}>WhatsApp number *
          <input name="whatsapp" type="tel" required minLength={8} maxLength={24} autoComplete="tel" inputMode="tel" placeholder="+62 812 3456 7890" value={v.whatsapp} onChange={set("whatsapp")}
            pattern="[+0-9 ().\-]{8,24}" className={fieldInput} />
          <span className={hint}>With country code. Numbers starting with 0 are treated as Indonesian.</span>
        </label>
        <label className={fieldLabel}>Country of interest *
          <select name="countryOfInterest" required value={v.countryOfInterest} onChange={set("countryOfInterest")} className={fieldInput}>
            <option value={countryName(o.country_code)}>{countryName(o.country_code)}</option>
            <option value="Open to other countries">Open to other countries</option>
          </select>
        </label>
        <label className={cn(fieldLabel, "sm:col-span-2")}>Opportunity / job position *
          <select name="position" required value={v.position} onChange={set("position")} className={fieldInput} data-testid="interest-position">
            {positions.length > 1 && <option value="">Choose a position</option>}
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className={hint}>{o.title} · {countryName(o.country_code)}{o.city ? `, ${o.city}` : ""}</span>
        </label>
        <label className={cn(fieldLabel, "sm:col-span-2")}>Why are you interested? *
          <textarea name="statement" required minLength={20} maxLength={1500} rows={4} value={statement} onChange={(e) => setStatement(e.target.value)}
            placeholder="A few sentences about your experience in this field and why you'd like to work abroad." className={fieldInput} />
          <span className={hint}>{statement.trim().length}/1,500 · at least 20 characters</span>
        </label>
      </div>

      <fieldset className="rounded-[16px] border border-[#E6E9EE] p-5">
        <legend className="px-1 text-[15px] font-bold text-[#1A2534]">More about you <span className="font-normal text-[#2F4157]/60">(optional)</span></legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={fieldLabel}>Current occupation
            <input name="occupation" maxLength={160} className={fieldInput} />
          </label>
          <label className={fieldLabel}>LinkedIn profile
            <input name="linkedin" type="url" maxLength={300} placeholder="https://www.linkedin.com/in/your-name" className={fieldInput} />
          </label>
          <label className={cn(fieldLabel, "sm:col-span-2")}>Relevant work experience
            <textarea name="experience" maxLength={1500} rows={3} placeholder="Where you've worked, for how long, and what you did." className={fieldInput} />
          </label>
          <div className="sm:col-span-2">
            <p className={fieldLabel} id="cv-label">CV (PDF)</p>
            <span className={hint}>Up to 5 MB. Only the IELSco team can open it.</span>
            {cv ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-[14px] border border-[#D5DBE3] bg-[#F7F8FA] px-4 py-3 text-[15px] text-[#1A2534]">
                <span className="flex min-w-0 items-center gap-2"><FileText size={18} className="shrink-0 text-[#577E90]" aria-hidden="true" /><span className="truncate">{cv.name}</span><span className="shrink-0 text-[#2F4157]/60">{(cv.size / 1024 / 1024).toFixed(1)} MB</span></span>
                <button type="button" onClick={() => { setCv(null); if (fileRef.current) fileRef.current.value = ""; }} className={cn("rounded-full p-1 text-[#2F4157] hover:bg-white", focusRing)} aria-label={`Remove ${cv.name}`}><X size={16} aria-hidden="true" /></button>
              </div>
            ) : null}
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" aria-labelledby="cv-label" data-testid="interest-cv"
              className={cn(fieldInput, "cursor-pointer py-2.5 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-[#EEF2F7] file:px-4 file:py-1.5 file:font-semibold file:text-[#2F4157]", cv && "sr-only")}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) return setCv(null);
                if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { e.target.value = ""; return fail(`${file.name} isn't a PDF. Please export it as PDF first.`); }
                if (file.size > MAX_BYTES) { e.target.value = ""; return fail(`${file.name} is larger than 5 MB. Please compress it, or send the form without a CV.`); }
                setError(""); setCv(file);
              }} />
          </div>
          <fieldset className="sm:col-span-2">
            <legend className={fieldLabel}>Preferred contact method</legend>
            <div className="mt-2 flex flex-wrap gap-5 text-[15px] text-[#1A2534]">
              <label className="inline-flex items-center gap-2"><input type="radio" name="preferredContact" value="whatsapp" defaultChecked className="h-4 w-4 accent-[#2F4157]" /> WhatsApp</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="preferredContact" value="email" className="h-4 w-4 accent-[#2F4157]" /> Email</label>
            </div>
          </fieldset>
        </div>
      </fieldset>

      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <label className="flex items-start gap-3 text-[14.5px] leading-relaxed text-[#2F4157]">
        <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 shrink-0 accent-[#2F4157]" data-testid="interest-consent" />
        <span>{consentText(partner)} Read the <a className="font-semibold underline" href="/privacy-policy" target="_blank" rel="noopener noreferrer">IELSco Privacy Policy</a>.</span>
      </label>

      {state === "error" && (
        <div className="rounded-[14px] bg-[#FDF1F1] px-4 py-3 text-[15px] text-[#A23B3D]" role="alert" data-testid="interest-error">
          <p>{error}</p>
          <a href={mailtoFor(o, v, statement.trim())} className="mt-1 inline-block font-semibold underline">Email {INBOX} instead</a>
        </div>
      )}

      <button type="submit" disabled={busy} className={cn(btnPrimary, "w-full disabled:opacity-60 sm:w-auto")} data-testid="interest-submit">
        {busy ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> {state === "uploading" ? "Uploading CV…" : "Sending…"}</> : "Express Interest"}
      </button>
    </form>
  );
}
