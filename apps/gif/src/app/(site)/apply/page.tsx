import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccount } from "@/lib/auth";
import { applicationForAccount } from "@/lib/applications";
import { currentCohort } from "@/lib/cohort";
import { pathwayOpen, mentoringPrice, balanceOf, type Pathway } from "@/lib/settings";
import { DOCS, requiredConsents } from "@/lib/legal";
import ApplyWizard from "./ApplyWizard";
import { bridgeConfigured, ielscoSignInUrl } from "@/lib/ielsco-bridge";

export const metadata: Metadata = { title: "Apply", description: "Apply for GIF Summer 2027: Fully Funded, Project Mentoring Program or Self-Funded." };
export const dynamic = "force-dynamic";

export default async function Apply({ searchParams }: { searchParams: Promise<{ pathway?: string }> }) {
  const sp = await searchParams;
  const pathway = ["fully_funded", "mentoring", "self_funded"].includes(sp.pathway ?? "") ? (sp.pathway as Pathway) : undefined;
  const acct = await getAccount();
  const sso = bridgeConfigured();
  if (!acct) {
    return (
      <section className="section">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="eyebrow">Apply · GIF Summer 2027</div>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)" }}>Start with your email.</h1>
          <p className="lead" style={{ margin: "18px 0 28px" }}>{sso ? "GIF is an IELSco programme: sign in with your IELSco account (or create one) and your application is saved to it as you go." : "Your application is saved to your account as you go, so you can stop and come back. Sign in with a one-time code; no password needed."}</p>
          <div className="btn-row">
            {sso
              ? <a className="btn btn-primary" href={ielscoSignInUrl(`/apply${pathway ? `?pathway=${pathway}` : ""}`)} data-track="application_start">Continue with your IELSco account</a>
              : <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/apply${pathway ? `?pathway=${pathway}` : ""}`)}`} data-track="application_start">Continue with email</Link>}
            <Link className="btn btn-secondary" href="/opportunities">Compare pathways first</Link>
          </div>
          <ol className="steps-nav" style={{ marginTop: 40 }}><li>Pathway</li><li>Your profile</li><li>Team</li><li>Project</li><li>Review and submit</li></ol>
        </div>
      </section>
    );
  }
  const existing = await applicationForAccount(acct.id);
  if (existing && (existing.app.status !== "draft" || !existing.isOwner)) redirect("/portal");
  const cohort = await currentCohort();
  const s = cohort.settings;
  const m = mentoringPrice(s);
  const open = Object.fromEntries((["fully_funded", "mentoring", "self_funded"] as Pathway[]).map((p) => [p, pathwayOpen(s, p)]));
  const docs = Object.fromEntries((["fully_funded", "mentoring", "self_funded"] as Pathway[]).map((p) => [p, requiredConsents(p).map((c) => DOCS.find((d) => d.category === c)!).map((d) => ({ slug: d.slug, title: d.title, category: d.category }))]));
  return (
    <section className="section tight">
      <div className="wrap" style={{ maxWidth: 920 }}>
        <div className="eyebrow">Apply · GIF Summer 2027</div>
        <h1 style={{ fontSize: "clamp(34px, 4.6vw, 52px)", marginBottom: 8 }}>Your application</h1>
        <p className="muted" style={{ marginBottom: 28 }}>Signed in as {acct.email}. Your progress is saved automatically.</p>
        <ApplyWizard
          email={acct.email}
          initial={(existing?.app.draft as Record<string, unknown>) ?? {}}
          initialPathway={pathway}
          open={open}
          docs={docs}
          prices={{ elcoPro: s.prices.elco_pro_idr, elcoMonths: s.prices.elco_pro_months, mentoring: m.price, mentoringTier: m.tier, total: s.prices.self_funded_total, deposit: s.prices.self_funded_deposit, balance: balanceOf(s) }}
        />
      </div>
    </section>
  );
}
