import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
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
      <div className="wrap" style={{ maxWidth: 560 }}>
        <div className="eyebrow">Applicant and staff portal</div>
        <h1 style={{ fontSize: "clamp(36px, 5vw, 52px)", marginBottom: 16 }}>Log in</h1>
        <p className="lead" style={{ marginBottom: 28 }}>No password needed: we email you a one-time code.</p>
        {sp.signed_out && <div className="notice ok"><p>You have signed out.</p></div>}
        <div className="panel"><LoginForm next={next} /></div>
      </div>
    </section>
  );
}
