import type { Metadata } from "next";
import { COMPETITION } from "@/lib/content";
import { applyHref } from "@/lib/availability";
import { CompetitionJourney, Eyebrow, FinalCta, GrandFinale, PageHero, PrizePool } from "@/components/Blocks";

export const metadata: Metadata = {
  title: "Competition",
  description: "The GIF Summer 2027 competition: three weighted stages in Singapore, Malaysia and Thailand, ten finalists, and a USD 5,000 total prize pool across four award levels at the Grand Finale in Bangkok.",
};
export const revalidate = 300;

export default function Competition() {
  return (
    <>
      <PageHero eyebrow="Competition · GIF Summer 2027" title="From blueprint to the main stage."
        lead={`Every delegate develops a social-impact project through three weighted stages. Ten finalists advance to the Grand Finale in Bangkok on 2 August 2027 and compete for a share of a USD ${COMPETITION.prizePoolUsd.toLocaleString("en-US")} total prize pool.`}>
        <div className="btn-row"><a className="btn btn-sky" href={applyHref("self_funded")} data-track="apply_click" data-pathway="self_funded">Apply Now</a></div>
      </PageHero>

      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>The journey</Eyebrow><h2>Three countries, three stages, 100%.</h2></div>
            <p className="lead">Each stage builds on the one before. Singapore and Malaysia decide who reaches the Top {COMPETITION.finalists}; Thailand is where the finalists pitch and exhibit.</p></div>
          <CompetitionJourney />
          <div className="table-wrap" style={{ marginTop: 28 }}>
            <table className="t">
              <thead><tr><th scope="col">Stage</th><th scope="col">Where</th><th scope="col">What you deliver</th><th scope="col">Weight</th></tr></thead>
              <tbody>
                {COMPETITION.stages.map((st) => (
                  <tr key={st.n}><td style={{ fontWeight: 700 }}>Stage {st.n}</td><td>{st.country}</td><td>{st.title}</td><td style={{ fontWeight: 700 }}>{st.weight}%</td></tr>
                ))}
                <tr><td colSpan={3} style={{ fontWeight: 700 }}>Total evaluation</td><td style={{ fontWeight: 700 }}>100%</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section dark finale-band">
        <div className="wrap">
          <div className="head side" style={{ marginBottom: 32 }}>
            <div><Eyebrow>Grand Finale · Day {COMPETITION.finale.day}</Eyebrow><h2>{COMPETITION.finale.name}</h2>
              <ul className="finale-date" aria-label="Grand Finale"><li>2 August 2027</li><li>{COMPETITION.finale.city}, {COMPETITION.finale.country}</li><li>Planned open to the public</li></ul></div>
            <p className="lead">A public conference, a live pitching showcase and an innovation exhibition in one event. The Top {COMPETITION.finalists} present on the main stage and welcome visitors at their own booths.</p>
          </div>
          <GrandFinale />
          <p className="small muted" style={{ marginTop: 16 }}>Public attendance is subject to final venue capacity, event approvals and operational arrangements.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Awards</Eyebrow><h2>USD {COMPETITION.prizePoolUsd.toLocaleString("en-US")} across ten award recipients.</h2></div>
            <p className="lead">The total prize pool is shared across four award levels. All ten award recipients come from the Top {COMPETITION.finalists} finalists.</p></div>
          <PrizePool />
          <div className="notice" style={{ marginTop: 24 }}>
            <p><strong>To be announced before the programme:</strong> the amount for each award level, whether awards are made to individuals or teams and how a team shares its prize, the final judging scorecard, how the Public Choice vote is used, and how prizes are paid.</p>
          </div>
        </div>
      </section>
      <FinalCta title="Bring the project. We'll bring the stage." />
    </>
  );
}
