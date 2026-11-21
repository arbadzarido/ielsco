import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccount, ielscoSignInAvailable } from "@/lib/auth";
import Image from "next/image";
import { PLACES } from "@/lib/places";
import LoginForm from "./LoginForm";
import { bridgeConfigured, ielscoSignInUrl } from "@/lib/ielsco-bridge";

const SSO_ERRORS: Record<string, string> = {
  conflict: "This email is linked to a different IELSco account. Contact hello@ielsco.com.",
  expired: "That sign-in link expired. Please try again.",
  used: "That sign-in link was already used. Please try again.",
  unavailable: "Sign-in is temporarily unavailable. Please try again in a few minutes.",
};

export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; signed_out?: string; sso?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && /^\/(portal|admin|apply)/.test(sp.next) ? sp.next : "/portal";
  const acct = await getAccount().catch(() => null);
  if (acct) redirect(acct.staffRole && next === "/portal" ? "/admin" : next);
  // Single sign-on with the IELSco account is the main way in once IELSCO_GIF_SSO_SECRET is set on both projects.
  const sso = bridgeConfigured();
  return (
    <section className="section">
      <div className="wrap auth-split">
        <div style={{ maxWidth: 560 }}>
          <div className="eyebrow">Applicant and staff portal</div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 52px)", marginBottom: 16 }}>Log in</h1>
          {sso ? (
            <>
              <p className="lead" style={{ marginBottom: 28 }}>GIF is an IELSco programme. Use your IELSco account: one account for IELSco, Elco and GIF, with your applications and payments in one place.</p>
              {sp.signed_out && <div className="notice ok"><p>You have signed out of GIF.</p></div>}
              {sp.sso && <div className="notice warn" role="alert"><p>{SSO_ERRORS[sp.sso] ?? "We could not sign you in with IELSco. Please try again."}</p></div>}
              <div className="panel">
                <a className="btn btn-primary" href={ielscoSignInUrl(next)} data-track="ielsco_sso">Continue with your IELSco account</a>
                <p className="small muted" style={{ marginTop: 12 }}>No IELSco account yet? The same button lets you create one.</p>
                <details style={{ marginTop: 20 }}>
                  <summary className="small">Other ways to sign in (email code)</summary>
                  <div style={{ marginTop: 16 }}><LoginForm next={next} ielsco={ielscoSignInAvailable()} /></div>
                </details>
              </div>
            </>
          ) : (
            <>
              <p className="lead" style={{ marginBottom: 28 }}>Sign in with a one-time code sent to your email{ielscoSignInAvailable() ? ", or with your IELSco account" : ""}. GIF and IELSco accounts are combined: one person, one account.</p>
              {sp.signed_out && <div className="notice ok"><p>You have signed out.</p></div>}
              <div className="panel"><LoginForm next={next} ielsco={ielscoSignInAvailable()} /></div>
            </>
          )}
        </div>
        <aside className="auth-photo" aria-label="GIF Summer 2027">
          <div className="ph" aria-hidden="true"><Image src={PLACES.petronas.src} alt="" fill sizes="50vw" /></div>
          <span className="photo-credit">{PLACES.petronas.credit.author} · {PLACES.petronas.credit.license}</span>
          <div className="eyebrow" style={{ color: "var(--gif-amber-soft)" }}>Summer 2027 · Stop 02 · Kuala Lumpur</div>
          <h2>Singapore, Malaysia and Thailand in eight days.</h2>
          <p>Your application, payments, tasks and results, all in one place.</p>
        </aside>
      </div>
    </section>
  );
}
