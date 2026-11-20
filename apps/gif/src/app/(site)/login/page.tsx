import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccount, ielscoSignInAvailable } from "@/lib/auth";
import Image from "next/image";
import { PLACES } from "@/lib/places";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; signed_out?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && /^\/(portal|admin|apply)/.test(sp.next) ? sp.next : "/portal";
  const acct = await getAccount().catch(() => null);
  if (acct) redirect(acct.staffRole && next === "/portal" ? "/admin" : next);
  return (
    <section className="section">
      <div className="wrap auth-split">
        <div style={{ maxWidth: 560 }}>
          <div className="eyebrow">Applicant and staff portal</div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 52px)", marginBottom: 16 }}>Log in</h1>
          <p className="lead" style={{ marginBottom: 28 }}>Sign in with a one-time code sent to your email{ielscoSignInAvailable() ? ", or with your IELSco account" : ""}. GIF and IELSco accounts are combined: one person, one account.</p>
          {sp.signed_out && <div className="notice ok"><p>You have signed out.</p></div>}
          <div className="panel"><LoginForm next={next} ielsco={ielscoSignInAvailable()} /></div>
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
