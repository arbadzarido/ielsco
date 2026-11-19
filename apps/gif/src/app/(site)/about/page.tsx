import type { Metadata } from "next";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { PHOTOS } from "@/lib/content";
import { Eyebrow, Figure, FinalCta, PageHero, Universities } from "@/components/Blocks";

export const metadata: Metadata = { title: "About GIF", description: "What the Global Impact Fellowship is, who runs it and who it is for." };
export const revalidate = 300;

export default async function About() {
  const s = await currentSettingsSafe();
  return (
    <>
      <PageHero eyebrow="About GIF" title="A fellowship built around a project, not a tour."
        lead="The Global Impact Fellowship (GIF) is IELSco's international programme for students who want to take on a problem in their community and build a project that addresses it." />
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="01">Who runs it</Eyebrow><h2>IELSco</h2></div>
          <div>
            <p className="lead">GIF is organised by IELSco (PT English Space Berkah Indonesia), an English learning community connecting young people in Southeast Asia with English practice and global opportunities.</p>
            <p>IELSco also builds Elco, an AI English practice app; Fully Funded applicants receive three months of Elco Pro in Phase 1. Contact: <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>, WhatsApp <a href="https://wa.me/6288297253491">+62 882-9725-3491</a>.</p>
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap grid split-r" style={{ alignItems: "center" }}>
          <div>
            <Eyebrow n="02">Summer 2027</Eyebrow>
            <h2>27 July – 3 August 2027.</h2>
            <dl className="kv" style={{ marginTop: 24 }}>
              <dt>Length</dt><dd>8 days, 7 nights</dd>
              <dt>Route</dt><dd>Singapore → Malaysia → Thailand</dd>
              <dt>Delegates</dt><dd>Up to {s.slots.capacity} individual delegates</dd>
              <dt>Eligibility</dt><dd>High school, undergraduate and college students</dd>
              <dt>Applying</dt><dd>Individually, or as a team of 2–3 (maximum 3)</dd>
              <dt>Pathways</dt><dd>Fully Funded application, Project Mentoring Program, Self-Funded</dd>
            </dl>
            <div className="btn-row" style={{ marginTop: 24 }}><Link className="btn btn-primary" href="/apply" data-track="apply_click">Apply Now</Link><Link className="btn btn-secondary" href="/program">The programme</Link></div>
          </div>
          <Figure p={PHOTOS.nusSign} sizes="(min-width: 1000px) 35vw, 100vw" style={{ maxWidth: 420, marginLeft: "auto" }} />
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="head"><Eyebrow n="03">Universities</Eyebrow><h2>Planned university engagement.</h2></div>
          <Universities s={s} />
        </div>
      </section>
      <section className="section alt">
        <div className="wrap">
          <div className="head"><Eyebrow n="04">What we promise, and what we don't</Eyebrow><h2>Plain terms.</h2></div>
          <div className="grid g2">
            <div className="item"><h4>We will</h4><ul><li>Publish deadlines, prices and selection criteria up front.</li><li>Evaluate every Phase 3 pitch on the same seven criteria.</li><li>Confirm a payment only after it is verified, and send a receipt.</li><li>Mark university engagement as planned until it is confirmed in writing.</li></ul></div>
            <div className="item"><h4>We won&rsquo;t</h4><ul><li>Guarantee funding, sponsorship or a visa.</li><li>Publish names, photos or quotes without consent.</li><li>Charge you an application fee: Phase 1&rsquo;s Elco Pro is a product you keep.</li></ul></div>
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
