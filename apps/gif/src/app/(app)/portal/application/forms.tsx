"use client";
import { useActionState } from "react";
import { acceptTermsAction, withdrawAction, type ActionResult } from "@/app/actions/portal";
import { linkIelscoAction, type FormState } from "@/app/actions/public";

export function TermsForm({ docs }: { docs: { slug: string; title: string; category: string }[] }) {
  const [s, action, pending] = useActionState<ActionResult, FormData>(acceptTermsAction, null);
  if (s?.ok) return <div className="notice ok" role="status"><p>{s.message}</p></div>;
  return (
    <form action={action} className="form panel">
      <p>Please read and accept these documents. They are required before any payment.</p>
      {docs.map((d) => <label className="check" key={d.category}><input type="checkbox" name={d.category} /><span>I have read and accept the <a href={`/${d.slug}`} target="_blank" rel="noopener">{d.title}</a>.</span></label>)}
      <fieldset><legend>Media consent (optional)</legend>
        <label className="check"><input type="radio" name="media" value="yes" /><span>IELSco may use photos and video of me (see <a href="/media-consent" target="_blank" rel="noopener">Media Consent</a>).</span></label>
        <label className="check"><input type="radio" name="media" value="no" /><span>Please don&rsquo;t use my image.</span></label>
      </fieldset>
      {s?.error && <p className="error" role="alert">{s.error}</p>}
      <button className="btn btn-primary" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Saving…" : "Accept"}</button>
    </form>
  );
}

export function WithdrawForm() {
  const [s, action, pending] = useActionState<ActionResult, FormData>(withdrawAction, null);
  return (
    <form action={action} className="form panel" style={{ maxWidth: 560 }}>
      <label className="field"><span className="label">Reason (optional)</span><textarea name="reason" rows={3} maxLength={500} /></label>
      <label className="field"><span className="label">Type WITHDRAW to confirm</span><input name="confirm" autoComplete="off" /></label>
      {s?.error && <p className="error" role="alert">{s.error}</p>}
      <button className="btn btn-danger" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Withdrawing…" : "Withdraw application"}</button>
    </form>
  );
}

export function LinkIelsco() {
  const [s, action, pending] = useActionState<FormState, FormData>(linkIelscoAction, null);
  if (s?.ok) return <div className="notice ok" role="status"><p>Your IELSco account is now linked. You can sign in with it from now on.</p></div>;
  return (
    <form action={action} className="form panel" style={{ maxWidth: 560 }}>
      <p className="small">Link your IELSco (ielsco.com) account so you can sign in with it. Your application and payments stay as they are.</p>
      <label className="field"><span className="label">IELSco email</span><input name="email" type="email" autoComplete="username" /></label>
      <label className="field"><span className="label">IELSco password</span><input name="password" type="password" autoComplete="current-password" /></label>
      {s?.error && <p className="error" role="alert">{s.error}</p>}
      <button className="btn btn-secondary" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Linking…" : "Link IELSco account"}</button>
    </form>
  );
}
