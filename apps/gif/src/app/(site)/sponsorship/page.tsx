import type { Metadata } from "next";
import { Eyebrow, PageHero } from "@/components/Blocks";
import SponsorshipForm from "./SponsorshipForm";

export const metadata: Metadata = { title: "Sponsorship Support", description: "Request documentation support to approach sponsors for GIF Summer 2027. Sponsorship is not guaranteed." };

export default function Sponsorship() {
  return (
    <>
      <PageHero eyebrow="Sponsorship Support" title="We help you ask. The sponsor decides."
        lead="Many delegates fund their place with support from their school, university, a company or local government. IELSco prepares the documentation you need to approach them." />
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div>
            <Eyebrow n="01">What we provide</Eyebrow>
            <ul>
              <li>An official letter confirming your application or place</li>
              <li>A programme description with dates, route and pathways</li>
              <li>A cost breakdown for your pathway</li>
              <li>A receipt or invoice once you pay</li>
            </ul>
            <div className="notice warn" style={{ marginTop: 24 }}>
              <p><strong>Documentation support only.</strong> IELSco does not guarantee sponsorship, does not contact sponsors on your behalf unless agreed in writing, and your payment deadlines stay the same while you wait for a sponsor&rsquo;s decision.</p>
            </div>
          </div>
          <div className="panel"><h2 style={{ fontSize: 30, marginBottom: 16 }}>Request support</h2><SponsorshipForm /></div>
        </div>
      </section>
    </>
  );
}
