import type { Metadata } from "next";
import Link from "next/link";
import { guardianByToken } from "@/lib/guardian";
import { PATHWAY_LABEL } from "@/lib/status";
import GuardianForm from "./GuardianForm";

export const metadata: Metadata = { title: "Parent or guardian consent", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function GuardianConsent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const g = await guardianByToken(token);
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <div className="eyebrow">Parent or guardian consent</div>
        {!g ? (
          <>
            <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>This link is no longer valid.</h1>
            <p className="lead" style={{ marginTop: 16 }}>It may have expired or already been used. Ask the applicant to send a new link from their GIF portal, or write to <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>.</p>
          </>
        ) : g.consentedAt ? (
          <>
            <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>Thank you. Consent is recorded.</h1>
            <p className="lead" style={{ marginTop: 16 }}>{g.applicant} can now continue with their application.</p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>Consent for {g.applicant}</h1>
            <p className="lead" style={{ marginTop: 16 }}>{g.applicant} has applied to GIF Summer 2027 ({PATHWAY_LABEL[g.pathway as keyof typeof PATHWAY_LABEL]}, application {g.code}). Because they will be under 18 on 27 July 2027, they may take part only with the consent of a parent or legal guardian.</p>
            <div className="notice"><p><strong>About the programme.</strong> 27 July – 3 August 2027, 8 days and 7 nights, travelling from Singapore through Malaysia to Thailand, organised by PT English Space Berkah Indonesia (IELSco). Day-by-day details, accommodation and supervision arrangements are shared with confirmed participants and their guardians during pre-departure preparation (8 June – 26 July 2027).</p></div>
            <p>Please read: <Link href="/terms-and-conditions" target="_blank">Terms and Conditions</Link> · <Link href="/privacy-policy" target="_blank">Privacy Policy</Link> · <Link href="/refund-policy" target="_blank">Refund Policy</Link> · <Link href="/code-of-conduct" target="_blank">Code of Conduct</Link> · <Link href="/travel-visa-disclaimer" target="_blank">Travel & Visa</Link> · <Link href="/parental-consent" target="_blank">Guardian Consent terms</Link> · <Link href="/media-consent" target="_blank">Media Consent</Link></p>
            <GuardianForm token={token} guardian={g.guardian} relation={g.relation} applicant={g.applicant} />
          </>
        )}
      </div>
    </section>
  );
}
