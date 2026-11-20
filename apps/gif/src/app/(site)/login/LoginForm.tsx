"use client";
import { useActionState, useState } from "react";
import { requestCodeAction, verifyCodeAction, ielscoSignInAction, type FormState } from "@/app/actions/public";

export default function LoginForm({ next, ielsco }: { next: string; ielsco: boolean }) {
  const [mode, setMode] = useState<"code" | "ielsco">("code");
  return (
    <>
      {ielsco && <div className="pill-tabs" role="tablist" aria-label="How to sign in">
        <a href="#code" role="tab" aria-selected={mode === "code"} aria-current={mode === "code" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setMode("code"); }}>Email code</a>
        <a href="#ielsco" role="tab" aria-selected={mode === "ielsco"} aria-current={mode === "ielsco" ? "page" : undefined} onClick={(e) => { e.preventDefault(); setMode("ielsco"); }}>IELSco account</a>
      </div>}
      {mode === "code" ? <CodeLogin next={next} /> : <IelscoLogin next={next} />}
    </>
  );
}

function IelscoLogin({ next }: { next: string }) {
  const [s, action, pending] = useActionState<FormState, FormData>(ielscoSignInAction, null);
  return (
    <form action={action} className="form">
      <p className="small muted">Use the email and password of your IELSco (ielsco.com) account. Your GIF application stays linked to it.</p>
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="i-email">IELSco email</label><input id="i-email" name="email" type="email" autoComplete="username" required defaultValue={s?.email ?? ""} key={s?.email ?? ""} /></div>
      <div className="field"><label htmlFor="i-pass">Password</label><input id="i-pass" name="password" type="password" autoComplete="current-password" required /></div>
      {s?.error && <p className="error" role="alert">{s.error}</p>}
      <button className="btn btn-primary" disabled={pending} style={{ justifySelf: "start" }}>{pending ? "Signing in…" : "Sign in with IELSco"}</button>
      <p className="tiny muted">Signed up on ielsco.com with Google? Use the email code option with the same email.</p>
    </form>
  );
}

function CodeLogin({ next }: { next: string }) {
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
