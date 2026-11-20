"use client";
import { useActionState, useState } from "react";
import { requestCodeAction, verifyCodeAction, type FormState } from "@/app/actions/public";

export default function LoginForm({ next }: { next: string }) {
  const [sent, sendAction, sending] = useActionState<FormState, FormData>(requestCodeAction, null);
  const [verified, verifyAction, verifying] = useActionState<FormState, FormData>(verifyCodeAction, null);
  const [restart, setRestart] = useState(0);
  const step = restart === 0 && sent?.step === "code" ? "code" : "email";
  const email = sent?.email ?? "";
  if (step === "code") {
    return (
      <form action={verifyAction} className="form" key="code">
        <p>We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.</p>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="code">Sign-in code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus
            aria-invalid={!!verified?.error} aria-describedby={verified?.error ? "code-err" : undefined} style={{ letterSpacing: ".3em", fontSize: 22, maxWidth: 220 }} />
          {verified?.error && <p className="error" id="code-err" role="alert">{verified.error}</p>}
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={verifying}>{verifying ? "Checking…" : "Sign in"}</button>
          <button type="button" className="btn btn-quiet" onClick={() => setRestart((n) => n + 1)}>Use a different email</button>
        </div>
      </form>
    );
  }
  return (
    <form action={(fd) => { setRestart(0); sendAction(fd); }} className="form" key={`email-${restart}`}>
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={email} aria-invalid={!!sent?.error} aria-describedby={sent?.error ? "email-err" : "email-hint"} />
        <p className="hint" id="email-hint">New here? The same step creates your account. Team members: use the email your team leader entered.</p>
        {sent?.error && <p className="error" id="email-err" role="alert">{sent.error}</p>}
      </div>
      <button className="btn btn-primary" disabled={sending} style={{ justifySelf: "start" }}>{sending ? "Sending…" : "Email me a code"}</button>
    </form>
  );
}
