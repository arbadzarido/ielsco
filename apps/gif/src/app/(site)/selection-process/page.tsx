import type { Metadata } from "next";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { SELECTION_CRITERIA } from "@/lib/content";
import { fmtRange } from "@/lib/format";
import { DeadlineStrip, Eyebrow, FinalCta, PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "Selection Process", description: "How GIF Summer 2027 selects 10 Fully Funded and 10 Partial Funded delegates: phases, criteria and results." };
export const revalidate = 300;

export default async function Selection() {
  const s = await currentSettingsSafe();
  return (
    <>
      <PageHero eyebrow="Selection Process" title="Three phases, seven criteria, one results day."
        lead="The same process for every applicant. Mentoring Program mentees enter at Phase 3 and are evaluated in exactly the same way." />
      <DeadlineStrip s={s} />
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="01">Phases</Eyebrow><h2>What happens when.</h2></div>
          <ol className="timeline">
            <li className="key"><div className="when">Phase 1 · {fmtRange("2026-11-25", "2027-05-10")}</div><div className="what">Online application and Elco Pro</div><p className="muted small">Complete your profile, team, project idea and motivation, then activate Phase 1 with 3 months of Elco Pro (IDR {s.prices.elco_pro_idr.toLocaleString("en-US")}).</p></li>
            <li><div className="when">Phase 2 · {fmtRange("2027-05-11", "2027-05-24")}</div><div className="what">Project essay and pitch deck</div><p className="muted small">Following the published guidelines on the <Link href="/fully-funded">Fully Funded page</Link>.</p></li>
            <li><div className="when">Phase 3 · 25–27 May 2027</div><div className="what">Record and submit your video pitch (3 days)</div><p className="muted small">Mentees join here.</p></li>
            <li><div className="when">28–31 May 2027</div><div className="what">Evaluation (4 days)</div></li>
            <li className="key"><div className="when">1 June 2027</div><div className="what">Results in your portal and by email</div><p className="muted small">Fully Funded, Partial Funded or Not Selected.</p></li>
          </ol>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="02">Criteria</Eyebrow><h2>How evaluators score.</h2></div><p className="lead">Each Phase 3 entry is scored on seven criteria from 1 to 10 by assigned evaluators, who also write feedback. Places go to the highest-ranked applications.</p></div>
          <div className="table-wrap"><table className="t"><thead><tr><th>#</th><th>Criterion</th><th>What evaluators look for</th></tr></thead>
            <tbody>{SELECTION_CRITERIA.map(([t, d], i) => <tr key={t}><td className="serif" style={{ color: "var(--maroon)" }}>{i + 1}</td><td><strong>{t}</strong></td><td>{d}</td></tr>)}</tbody></table></div>
        </div>
      </section>
      <section className="section">
        <div className="wrap grid g3">
          <div className="item"><h4>Places</h4><p className="muted">{s.slots.fully_funded} Fully Funded and {s.slots.partial_funded} Partial Funded, awarded per application (an individual or a team).</p></div>
          <div className="item"><h4>Fairness</h4><p className="muted">Evaluators declare conflicts of interest and do not score applicants they know personally. Decisions are recorded with scores and feedback.</p></div>
          <div className="item"><h4>No guarantees</h4><p className="muted">Paying for Elco Pro or mentoring does not guarantee selection. See the <Link href="/selection-terms">Scholarship &amp; Selection Terms</Link>.</p></div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
