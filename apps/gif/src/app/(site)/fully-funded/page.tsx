import type { Metadata } from "next";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { ELCO_PRO_FEATURES, SELECTION_CRITERIA } from "@/lib/content";
import { fmtRange } from "@/lib/format";
import { tasksFor } from "@/lib/tasks";
import { DeadlineStrip, Eyebrow, FinalCta, PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "Fully Funded application", description: "Compete for 10 Fully Funded and 10 Partial Funded places at GIF Summer 2027 in a three-phase selection." };
export const revalidate = 300;

export default async function FullyFunded() {
  const s = await currentSettingsSafe();
  const tasks = tasksFor(s);
  return (
    <>
      <PageHero eyebrow="Pathway A · Fully Funded application" title={<>{s.slots.fully_funded} Fully Funded and {s.slots.partial_funded} Partial Funded places.</>}
        lead="A competitive selection in three phases. Partial Funded is an outcome of this selection, not a separate pathway. Funding is never guaranteed.">
        <div className="btn-row"><Link className="btn btn-light" href="/apply?pathway=fully_funded" data-track="pathway_select" data-pathway="fully_funded">Start your application</Link><Link className="btn btn-secondary" href="/selection-process">Selection process</Link></div>
      </PageHero>
      <DeadlineStrip s={s} />
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="01">Phase 1</Eyebrow><h2>Apply, start using Elco Pro, and share the word.</h2><p className="lead" style={{ marginTop: 18 }}>{fmtRange("2026-11-25", "2027-05-10")}</p></div>
          <div>
            <p className="lead">Phase 1 is your online application plus an Elco Pro subscription: {s.prices.elco_pro_months} months of Elco Pro for <strong>IDR {s.prices.elco_pro_idr.toLocaleString("en-US")}</strong>, a discount on Elco Pro&rsquo;s regular price of IDR 99,000 a month.</p>
            <div className="notice ok"><p><strong>A product, not an application fee.</strong> Elco Pro is IELSco&rsquo;s AI English practice app. You use it to sharpen the English you will pitch in, and you keep it whether or not you are selected.</p></div>
            {tasks.length > 0 && <>
              <h3 style={{ margin: "28px 0 12px" }}>Social media tasks</h3>
              <p>Phase 1 also includes these tasks for every delegate. You report them in your portal and our team verifies each one.</p>
              <ul>{tasks.map((t) => <li key={t.key}><strong>{t.title}</strong>: {t.detail}</li>)}</ul>
            </>}
            <h3 style={{ margin: "28px 0 12px" }}>What Elco Pro includes</h3>
            <ul>{ELCO_PRO_FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
            <p className="small muted">Allowances are those of the Elco Pro plan at <a href="https://www.elcoai.com/pricing" rel="noopener">elcoai.com/pricing</a>. Elco Pro is activated on the Elco account with your email after your payment is verified; we email you when it is active.</p>
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap grid g2">
          <div className="item"><Eyebrow n="02">Phase 2 · {fmtRange("2027-05-11", "2027-05-24")}</Eyebrow><h3>Project essay and pitch deck.</h3>
            <p className="muted" style={{ marginTop: 12 }}>Submitted in your portal. The guidelines below are published now so you can prepare early.</p>
            <ul><li><strong>Essay</strong>: the problem, who it affects and the evidence; your solution and why it is new; expected impact and how you will measure it; your plan, budget outline and how the project lasts. Upload a PDF (up to 10 MB) or write it in the portal.</li>
              <li><strong>Pitch deck</strong>: 10–12 slides covering problem, solution, impact, feasibility, sustainability and your team. PDF or PPTX, up to 25 MB.</li>
              <li>Teams submit one essay and one deck together.</li></ul></div>
          <div className="item"><Eyebrow n="03">Phase 3 · {fmtRange("2027-05-25", "2027-05-31")}</Eyebrow><h3>Recorded video pitch.</h3>
            <p className="muted" style={{ marginTop: 12 }}>You have <strong>3 days</strong> (25–27 May) to record and submit. Evaluation takes the following <strong>4 days</strong> (28–31 May).</p>
            <ul><li>Share an unlisted YouTube, Vimeo, Loom or Google Drive link, or upload MP4/MOV (up to 100 MB).</li>
              <li>Project Mentoring Program mentees join the selection here, with the same evaluation.</li></ul></div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="04">Criteria</Eyebrow><h2>Seven things evaluators score.</h2></div><p className="lead">Each criterion is scored by evaluators on the same scale for every applicant.</p></div>
          <div className="grid g3">{SELECTION_CRITERIA.map(([t, d], i) => <div className="item" key={t}><span className="index-num">0{i + 1}</span><h4>{t}</h4><p className="muted">{d}</p></div>)}</div>
        </div>
      </section>
      <section className="section dark">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="05">Results · 1 June 2027</Eyebrow><h2>Three possible outcomes.</h2></div>
          <div className="grid g3">
            <div className="item"><h4>Fully Funded</h4><p>{s.slots.fully_funded} places. Award details are set out in your result letter.</p></div>
            <div className="item"><h4>Partial Funded</h4><p>{s.slots.partial_funded} places. Your result letter states the support and any amount you still pay.</p></div>
            <div className="item"><h4>Not Selected</h4><p>You keep Elco Pro, and you may still join Self-Funded while seats remain.</p></div>
          </div>
        </div>
      </section>
      <FinalCta title="Phase 1 is open until 10 May 2027." body="Start now and save a draft whenever you need to. Teams of up to three apply together." />
    </>
  );
}
