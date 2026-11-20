"use client";
import { useActionState } from "react";
import { sponsorshipAction, type FormState } from "@/app/actions/public";
import { CountrySelect } from "@/components/Fields";

const TYPES = ["School or university", "Company (CSR)", "Local government", "Foundation or NGO", "Family or community", "Other"];

export default function SponsorshipForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sponsorshipAction, null);
  if (state?.ok) {
    return <div className="notice ok" role="status"><p><strong>Thank you.</strong> We have received your request and emailed you a confirmation. Our team will contact you about the documents you need.</p></div>;
  }
  const e = state?.errors ?? {};
  const f = (name: string, label: string, input: React.ReactNode, hint?: string) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {input}
      {hint && <p className="hint">{hint}</p>}
      {e[name] && <p className="error" role="alert">{e[name]}</p>}
    </div>
  );
  return (
    <form action={action} className="form" noValidate>
      {state?.error && <div className="notice err" role="alert"><p>{state.error}</p></div>}
      <div style={{ position: "absolute", left: -9999 }} aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="fields-2">
        {f("name", "Full name", <input id="name" name="name" autoComplete="name" required aria-invalid={!!e.name} />)}
        {f("email", "Email", <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!e.email} />)}
        {f("whatsapp", "WhatsApp (with country code)", <input id="whatsapp" name="whatsapp" type="tel" autoComplete="tel" placeholder="+62 812 3456 7890" required aria-invalid={!!e.whatsapp} />)}
        {f("institution", "School or university", <input id="institution" name="institution" required aria-invalid={!!e.institution} />)}
        {f("country", "Country", <CountrySelect id="country" name="country" invalid={!!e.country} />)}
        <fieldset className="field"><legend className="label">Applying as</legend>
          <div className="btn-row"><label className="check"><input type="radio" name="applicant_type" value="individual" defaultChecked /> Individual</label><label className="check"><input type="radio" name="applicant_type" value="team" /> Team</label></div></fieldset>
        {f("amount", "Amount you are seeking (optional)", <div style={{ display: "flex", gap: 8 }}><select name="currency" aria-label="Currency" style={{ maxWidth: 100 }}><option>IDR</option><option>USD</option></select><input id="amount" name="amount" type="number" min="0" step="any" inputMode="decimal" aria-invalid={!!e.amount} /></div>)}
        {f("sponsorship_type", "Sponsor you plan to approach", <select id="sponsorship_type" name="sponsorship_type" defaultValue="" required aria-invalid={!!e.sponsorship_type}><option value="" disabled>Choose…</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>)}
      </div>
      {f("notes", "Notes (optional)", <textarea id="notes" name="notes" maxLength={2000} placeholder="Which documents do you need? Any deadlines from the sponsor?" />)}
      <label className="check"><input type="checkbox" name="acknowledge" required /> <span>I understand that IELSco provides documentation support only and does not guarantee sponsorship.</span></label>
      {e.acknowledge && <p className="error" role="alert">{e.acknowledge}</p>}
      <button className="btn btn-primary" disabled={pending} style={{ justifySelf: "start" }} data-track="sponsorship_submit">{pending ? "Sending…" : "Request documentation support"}</button>
      <p className="tiny muted">We use these details only to respond to this request. <a href="/privacy-policy">Privacy Policy</a>.</p>
    </form>
  );
}
