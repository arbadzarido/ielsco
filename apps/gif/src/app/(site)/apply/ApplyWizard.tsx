"use client";
import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDraftAction, submitApplicationAction } from "@/app/actions/apply";
import { CountrySelect } from "@/components/Fields";
import { DISCOVERY_SOURCES, EDUCATION_LEVELS, isMinor } from "@/lib/validation";
import { track } from "@/components/Client";

type Pathway = "fully_funded" | "mentoring" | "self_funded";
type Money = { IDR: number; USD: number };
type Person = Record<string, string>;
type Draft = { pathway?: Pathway; mode?: "individual" | "team"; team_name?: string; leader?: Person; members?: Person[]; project_title?: string;
  project_idea?: string; experience?: string; motivation?: string; discovery_source?: string; step?: number };
type Props = {
  email: string; initial: Draft; initialPathway?: Pathway;
  open: Record<string, { open: boolean; reason?: string }>;
  docs: Record<string, { slug: string; title: string; category: string }[]>;
  prices: { elcoPro: number; elcoMonths: number; mentoring: Money; mentoringTier: string; total: Money; deposit: Money; balance: Money };
};

const STEPS = ["Pathway", "Your profile", "Team", "Project", "Review and submit"];
const PERSON_FIELDS = ["legal_name", "email", "whatsapp", "nationality", "residence_country", "date_of_birth", "institution", "education_level",
  "academic_background", "country_of_study", "emergency_name", "emergency_relation", "emergency_phone"];
const blank = (): Person => Object.fromEntries(PERSON_FIELDS.map((f) => [f, ""]));
const n = (v: number) => new Intl.NumberFormat("en-US").format(v);

export default function ApplyWizard({ email, initial, initialPathway, open, docs, prices }: Props) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => ({
    pathway: initialPathway ?? initial.pathway, mode: initial.mode ?? "individual", team_name: initial.team_name ?? "",
    leader: { ...blank(), ...(initial.leader ?? {}), email }, members: initial.members ?? [], project_title: initial.project_title ?? "",
    project_idea: initial.project_idea ?? "", experience: initial.experience ?? "", motivation: initial.motivation ?? "", discovery_source: initial.discovery_source ?? "",
  }));
  const [step, setStep] = useState<number>(Math.min(initial.step ?? 0, 4));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [media, setMedia] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [submitting, startSubmit] = useTransition();
  const dirty = useRef(false);
  const headRef = useRef<HTMLHeadingElement>(null);

  const save = useCallback(async (draft: Draft, s: number) => {
    const r = await saveDraftAction({ ...draft, step: s });
    setSaved(r.ok ? `Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : `Not saved: ${r.error}`);
    dirty.current = !r.ok;
  }, []);
  useEffect(() => { track("application_start"); }, []);
  useEffect(() => {
    const t = setInterval(() => { if (dirty.current) save(d, step); }, 20_000);
    return () => clearInterval(t);
  }, [d, step, save]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const set = (patch: Partial<Draft>) => { setD((x) => ({ ...x, ...patch })); dirty.current = true; };
  const setPerson = (who: "leader" | number, field: string, v: string) => {
    dirty.current = true;
    setD((x) => who === "leader" ? { ...x, leader: { ...x.leader!, [field]: v } }
      : { ...x, members: x.members!.map((m, i) => (i === who ? { ...m, [field]: v } : m)) });
  };
  const go = async (to: number) => {
    const local = validateStep(step, d);
    if (to > step && Object.keys(local).length) { setErrors(local); return; }
    setErrors({});
    setStep(to);
    await save(d, to);
    headRef.current?.focus();
  };

  const submit = () => startSubmit(async () => {
    const res = await submitApplicationAction({ ...d, members: d.mode === "team" ? d.members : [] }, { ...consents, ...(media === null ? {} : { media }) } as never);
    if (res.ok) { dirty.current = false; router.push(`/portal?submitted=${encodeURIComponent(res.code)}`); return; }
    setErrors(res.errors);
    const k = Object.keys(res.errors)[0] ?? "";
    setStep(k.startsWith("leader") ? 1 : k.startsWith("members") || k === "team_name" ? (k === "team_name" ? 0 : 2) : ["project_title", "project_idea", "motivation", "discovery_source", "experience"].includes(k) ? 3 : k === "pathway" ? 0 : 4);
    headRef.current?.focus();
  });

  const pw = d.pathway;
  const required = pw ? docs[pw] : [];
  const allConsented = required.every((r) => consents[r.category]);
  const people = 1 + (d.mode === "team" ? d.members!.length : 0);

  return (
    <div>
      <ol className="steps-nav" aria-label="Application steps">
        {STEPS.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined}>{s}</li>)}
      </ol>
      <div className="panel">
        <h2 ref={headRef} tabIndex={-1} style={{ fontSize: 30, marginBottom: 18, outline: "none" }}>{STEPS[step]}</h2>
        {errors._ && <div className="notice err" role="alert"><p>{errors._}</p></div>}
        {Object.keys(errors).length > 0 && !errors._ && <div className="notice err" role="alert"><p>Please fix the highlighted fields.</p></div>}

        {step === 0 && (
          <div className="form">
            <fieldset><legend>Choose your pathway</legend>
              <div className="choice c3">
                {([["fully_funded", "Fully Funded application", `Compete for 10 Fully Funded and 10 Partial Funded places. Phase 1 includes ${prices.elcoMonths} months of Elco Pro for IDR ${n(prices.elcoPro)}.`],
                  ["mentoring", "Project Mentoring Program", `15 weekly sessions, then straight to Phase 3. ${prices.mentoringTier === "early" ? "Early Bird" : "Regular"}: IDR ${n(prices.mentoring.IDR)} / USD ${n(prices.mentoring.USD)}.`],
                  ["self_funded", "Self-Funded", `Direct registration. IDR ${n(prices.total.IDR)} / USD ${n(prices.total.USD)}; deposit confirms your seat.`]] as const).map(([v, t, desc]) => (
                  <label className="option" key={v} style={{ opacity: open[v].open ? 1 : 0.6 }}>
                    <input type="radio" name="pathway" value={v} checked={pw === v} disabled={!open[v].open} onChange={() => { set({ pathway: v }); track("pathway_select", { pathway: v }); }} />
                    <span><strong>{t}</strong><span className="small muted">{open[v].open ? desc : open[v].reason}</span></span>
                  </label>
                ))}
              </div>
              {errors.pathway && <p className="error">{errors.pathway}</p>}
            </fieldset>
            <fieldset><legend>Are you applying alone or as a team?</legend>
              <div className="choice c2">
                <label className="option"><input type="radio" name="mode" checked={d.mode === "individual"} onChange={() => set({ mode: "individual" })} /><span><strong>Individual</strong><span className="small muted">Just you.</span></span></label>
                <label className="option"><input type="radio" name="mode" checked={d.mode === "team"} onChange={() => set({ mode: "team", members: d.members!.length ? d.members : [blank()] })} /><span><strong>Team of 2–3</strong><span className="small muted">You lead; add 1–2 members. Each member is a delegate with their own profile{pw && pw !== "fully_funded" ? " and payment" : ""}.</span></span></label>
              </div>
            </fieldset>
            {d.mode === "team" && <Field label="Team name" error={errors.team_name}><input value={d.team_name} maxLength={60} onChange={(e) => set({ team_name: e.target.value })} aria-invalid={!!errors.team_name} /></Field>}
          </div>
        )}

        {step === 1 && <PersonForm p={d.leader!} prefix="leader" errors={errors} onChange={(f, v) => setPerson("leader", f, v)} lockedEmail />}

        {step === 2 && (
          d.mode !== "team" ? <p className="muted">You are applying individually, so there are no team members. Continue to the next step, or go back to switch to a team.</p> : (
            <div className="form">
              <p className="muted">Add each member&rsquo;s own details. They will get an email invitation and sign in with that address to accept the terms and see their payments. Maximum 3 people including you.</p>
              {errors.members && <p className="error" role="alert">{errors.members}</p>}
              {d.members!.map((m, i) => (
                <fieldset key={i} className="panel" style={{ background: "var(--soft)" }}>
                  <legend style={{ fontFamily: "var(--heading)", fontSize: 20 }}>Member {i + 2}</legend>
                  <PersonForm p={m} prefix={`members.${i}`} errors={errors} onChange={(f, v) => setPerson(i, f, v)} />
                  <button type="button" className="btn btn-danger btn-sm" style={{ marginTop: 14 }} onClick={() => set({ members: d.members!.filter((_, j) => j !== i) })}>Remove member {i + 2}</button>
                </fieldset>
              ))}
              {d.members!.length < 2 && <button type="button" className="btn btn-secondary" style={{ justifySelf: "start" }} onClick={() => set({ members: [...d.members!, blank()] })}>Add a team member</button>}
            </div>
          )
        )}

        {step === 3 && (
          <div className="form">
            {pw !== "self_funded" && <>
              <Field label="Project working title" error={errors.project_title}><input value={d.project_title} maxLength={120} onChange={(e) => set({ project_title: e.target.value })} aria-invalid={!!errors.project_title} /></Field>
              <Field label="Your project idea" hint="The problem, who it affects, and your idea for addressing it. 100–3,000 characters." error={errors.project_idea}>
                <textarea value={d.project_idea} maxLength={3000} rows={8} onChange={(e) => set({ project_idea: e.target.value })} aria-invalid={!!errors.project_idea} /><Count v={d.project_idea!} max={3000} /></Field>
            </>}
            {pw === "self_funded" && <Field label="Project idea (optional)" hint="Have a cause in mind? Tell us; it helps us place you in a team."><textarea value={d.project_idea} maxLength={3000} rows={5} onChange={(e) => set({ project_idea: e.target.value })} /></Field>}
            <Field label="Relevant experience (optional)" hint="Projects, organisations, competitions, volunteering." error={errors.experience}><textarea value={d.experience} maxLength={2000} rows={5} onChange={(e) => set({ experience: e.target.value })} /><Count v={d.experience!} max={2000} /></Field>
            <Field label="Why do you want to join GIF?" hint="50–2,000 characters." error={errors.motivation}><textarea value={d.motivation} maxLength={2000} rows={6} onChange={(e) => set({ motivation: e.target.value })} aria-invalid={!!errors.motivation} /><Count v={d.motivation!} max={2000} /></Field>
            <Field label="How did you hear about GIF?" error={errors.discovery_source}>
              <select value={d.discovery_source} onChange={(e) => set({ discovery_source: e.target.value })} aria-invalid={!!errors.discovery_source}><option value="">Choose…</option>{DISCOVERY_SOURCES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          </div>
        )}

        {step === 4 && pw && (
          <div className="form">
            <dl className="kv">
              <dt>Pathway</dt><dd>{({ fully_funded: "Fully Funded application", mentoring: "Project Mentoring Program", self_funded: "Self-Funded" })[pw]}</dd>
              <dt>Applying as</dt><dd>{d.mode === "team" ? `Team "${d.team_name}" (${people} people)` : "Individual"}</dd>
              <dt>Lead applicant</dt><dd>{d.leader!.legal_name} · {d.leader!.email}</dd>
              {d.mode === "team" && d.members!.map((m, i) => <Fragment key={i}><dt>Member {i + 2}</dt><dd>{m.legal_name} · {m.email}</dd></Fragment>)}
              {pw !== "self_funded" && <><dt>Project</dt><dd>{d.project_title}</dd></>}
            </dl>
            <div className="notice">
              <p><strong>What happens after you submit</strong></p>
              <p>{pw === "fully_funded" ? `Each delegate completes Phase 1 with ${prices.elcoMonths} months of Elco Pro for IDR ${n(prices.elcoPro)} (a product you keep, not an application fee) and a few social media tasks, verified by our team.`
                : pw === "mentoring" ? `Each delegate pays the mentoring fee: IDR ${n(prices.mentoring.IDR)} for Indonesian participants, USD ${n(prices.mentoring.USD)} for international participants.`
                : `Each delegate pays a deposit (IDR ${n(prices.deposit.IDR)} / USD ${n(prices.deposit.USD)}); the seat is confirmed when it is verified. The balance (IDR ${n(prices.balance.IDR)} / USD ${n(prices.balance.USD)}) follows during preparation.`}
                {" "}Indonesian participants pay the IDR price; international participants pay the USD price. You pay from your portal; nothing is charged now.</p>
            </div>
            <fieldset><legend>Please read and accept</legend>
              <div style={{ display: "grid", gap: 10 }}>
                {required.map((r) => (
                  <label className="check" key={r.category}><input type="checkbox" checked={!!consents[r.category]} onChange={(e) => setConsents((c) => ({ ...c, [r.category]: e.target.checked }))} />
                    <span>I have read and accept the <a href={`/${r.slug}`} target="_blank" rel="noopener">{r.title}</a>.</span></label>
                ))}
              </div>
              {errors.consents && <p className="error" role="alert">{errors.consents}</p>}
            </fieldset>
            <fieldset><legend>Media consent (optional)</legend>
              <label className="check"><input type="radio" name="media" checked={media === true} onChange={() => setMedia(true)} /><span>IELSco may use photos and video of me from the programme, as described in the <a href="/media-consent" target="_blank" rel="noopener">Media Consent</a>.</span></label>
              <label className="check"><input type="radio" name="media" checked={media === false} onChange={() => setMedia(false)} /><span>Please don&rsquo;t use my image in IELSco publications.</span></label>
            </fieldset>
            <p className="small muted">By submitting you confirm the information is accurate. Team leaders confirm that each member agreed to be included; members accept the terms themselves when they first sign in.</p>
          </div>
        )}
        {step === 4 && !pw && <p className="error">Choose a pathway first.</p>}

        <div className="btn-row" style={{ marginTop: 28, justifyContent: "space-between" }}>
          <div className="btn-row">
            {step > 0 && <button type="button" className="btn btn-secondary" onClick={() => go(step - 1)}>Back</button>}
            {step < 4 && <button type="button" className="btn btn-primary" onClick={() => go(step + 1)}>Continue</button>}
            {step === 4 && <button type="button" className="btn btn-primary" disabled={!pw || !allConsented || submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit application"}</button>}
          </div>
          <div className="btn-row">
            <span className="small muted" aria-live="polite">{saved}</span>
            <button type="button" className="btn btn-quiet" onClick={() => save(d, step)}>Save draft</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function validateStep(step: number, d: Draft): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!d.pathway) e.pathway = "Choose a pathway.";
    if (d.mode === "team" && (d.team_name ?? "").trim().length < 2) e.team_name = "Team name is required.";
  }
  const person = (p: Person | undefined, prefix: string) => {
    for (const f of PERSON_FIELDS) if (!(p?.[f] ?? "").trim()) e[`${prefix}.${f}`] = "Required.";
    if (p && isMinor(p.date_of_birth ?? "")) for (const f of ["guardian_name", "guardian_relation", "guardian_email", "guardian_phone"]) if (!(p[f] ?? "").trim()) e[`${prefix}.${f}`] = "Required for applicants under 18.";
  };
  if (step === 1) person(d.leader, "leader");
  if (step === 2 && d.mode === "team") {
    if (!d.members!.length) e.members = "Add at least one member, or switch to an individual application.";
    d.members!.forEach((m, i) => person(m, `members.${i}`));
  }
  if (step === 3) {
    if ((d.motivation ?? "").trim().length < 50) e.motivation = "At least 50 characters.";
    if (!d.discovery_source) e.discovery_source = "Choose one.";
    if (d.pathway !== "self_funded") {
      if ((d.project_title ?? "").trim().length < 3) e.project_title = "Give your project a working title.";
      if ((d.project_idea ?? "").trim().length < 100) e.project_idea = "At least 100 characters.";
    }
  }
  return e;
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <div className="field"><label className="field"><span className="label">{label}</span>{children}</label>{hint && <span className="hint">{hint}</span>}{error && <span className="error" role="alert">{error}</span>}</div>;
}
function Count({ v, max }: { v: string; max: number }) {
  return <span className="hint" style={{ textAlign: "right" }}>{v.length.toLocaleString()} / {max.toLocaleString()}</span>;
}

function PersonForm({ p, prefix, errors, onChange, lockedEmail }: { p: Person; prefix: string; errors: Record<string, string>; onChange: (f: string, v: string) => void; lockedEmail?: boolean }) {
  const err = (f: string) => errors[`${prefix}.${f}`];
  const inp = (f: string, label: string, type = "text", extra: Record<string, unknown> = {}, hint?: string) => (
    <Field label={label} error={err(f)} hint={hint}><input type={type} value={p[f] ?? ""} onChange={(e) => onChange(f, e.target.value)} aria-invalid={!!err(f)} {...extra} /></Field>
  );
  const country = (f: string, label: string) => (
    <div className="field"><label className="label" htmlFor={`${prefix}-${f}`}>{label}</label><CountrySelect id={`${prefix}-${f}`} name={f} value={p[f] ?? ""} onChange={(v) => onChange(f, v)} invalid={!!err(f)} />{err(f) && <span className="error">{err(f)}</span>}</div>
  );
  return (
    <div className="form">
      <div className="fields-2">
        {inp("legal_name", "Full legal name (as on passport)", "text", { autoComplete: lockedEmail ? "name" : "off", maxLength: 120 })}
        {inp("email", "Email", "email", lockedEmail ? { readOnly: true, "aria-readonly": true } : { autoComplete: "off" }, lockedEmail ? "Your sign-in email." : "Their own email; they sign in with it.")}
        {inp("whatsapp", "WhatsApp number", "tel", { placeholder: "+62 812 3456 7890" }, "Include the country code.")}
        {inp("date_of_birth", "Date of birth", "date", { max: "2020-01-01" })}
        {country("nationality", "Nationality (citizenship)")}
        {country("residence_country", "Country of residence")}
      </div>
      {p.nationality && <p className="small muted">{p.nationality === "ID" ? "Indonesian nationality: you pay the IDR prices." : "International participant: you pay the USD prices (Elco Pro is always IDR)."}</p>}
      <div className="fields-2">
        {inp("institution", "School or university", "text", { maxLength: 160 })}
        <Field label="Education level" error={err("education_level")}>
          <select value={p.education_level ?? ""} onChange={(e) => onChange("education_level", e.target.value)} aria-invalid={!!err("education_level")}>
            <option value="">Choose…</option>{Object.entries(EDUCATION_LEVELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        {inp("academic_background", "Major, stream or field of study", "text", { maxLength: 200 })}
        {country("country_of_study", "Country of study")}
      </div>
      <fieldset><legend>Emergency contact</legend>
        <div className="fields-2">
          {inp("emergency_name", "Name", "text", { maxLength: 120 })}
          {inp("emergency_relation", "Relationship", "text", { maxLength: 60, placeholder: "e.g. Parent" })}
          {inp("emergency_phone", "Phone (with country code)", "tel")}
        </div>
      </fieldset>
      {isMinor(p.date_of_birth ?? "") && (
        <fieldset className="notice" style={{ margin: 0 }}><legend>Parent or legal guardian (under 18)</legend>
          <p className="small">This delegate will be under 18 on 27 July 2027, so a parent or legal guardian must give written consent. We email them a consent form after you submit; payments open once they have consented.</p>
          <div className="fields-2">
            {inp("guardian_name", "Guardian full name", "text", { maxLength: 120 })}
            {inp("guardian_relation", "Relationship", "text", { maxLength: 60, placeholder: "e.g. Mother, legal guardian" })}
            {inp("guardian_email", "Guardian email", "email")}
            {inp("guardian_phone", "Guardian phone (with country code)", "tel")}
          </div>
        </fieldset>
      )}
    </div>
  );
}
