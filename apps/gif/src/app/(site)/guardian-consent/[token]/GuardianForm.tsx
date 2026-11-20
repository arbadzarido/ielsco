"use client";
import { useActionState } from "react";
import { guardianConsentAction, type FormState } from "@/app/actions/public";

export default function GuardianForm({ token, guardian, relation, applicant }: { token: string; guardian: string; relation: string; applicant: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(guardianConsentAction, null);
  if (s?.ok) return <div className="notice ok" role="status"><p><strong>Thank you.</strong> Your consent for {applicant} is recorded. You can close this page.</p></div>;
  return (
    <form action={action} className="form panel" style={{ marginTop: 20 }}>
      <input type="hidden" name="token" value={token} />
      <label className="check"><input type="checkbox" name="participate" required /> <span>I am the parent or legal guardian of {applicant} and I consent to their participation in GIF Summer 2027, including international travel between Singapore, Malaysia and Thailand, under the terms linked above.</span></label>
      <label className="check"><input type="checkbox" name="data" required /> <span>I consent to IELSco processing {applicant}&rsquo;s personal data for the application, selection and programme, as described in the Privacy Policy (personal data of a child, Law No. 27 of 2022).</span></label>
      <label className="check"><input type="checkbox" name="responsible" required /> <span>I understand that passports, visas, travel insurance and travel to and from the programme are the participant&rsquo;s and guardian&rsquo;s responsibility, and that payments are governed by the Payment Terms and Refund Policy.</span></label>
      <fieldset><legend>Photos and video (optional)</legend>
        <label className="check"><input type="radio" name="media" value="yes" /> <span>IELSco may use photos and video of {applicant} as described in the Media Consent.</span></label>
        <label className="check"><input type="radio" name="media" value="no" /> <span>Please do not use {applicant}&rsquo;s image.</span></label>
      </fieldset>
      <div className="fields-2">
        <label className="field"><span className="label">Your full name (typed signature)</span><input name="name" defaultValue={guardian} required maxLength={120} /></label>
        <label className="field"><span className="label">Relationship to the applicant</span><input name="relation" defaultValue={relation} maxLength={60} /></label>
      </div>
      {s?.error && <p className="error" role="alert">{s.error}</p>}
      <button className="btn btn-primary" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Recording…" : "Give consent"}</button>
      <p className="tiny muted">We record your typed name, the time and your IP address as evidence of consent. To decline, simply close this page and tell the applicant, or write to hello@ielsco.com.</p>
    </form>
  );
}
