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
        lead={`Three weighted stages. Ten finalists. A USD ${COMPETITION.prizePoolUsd.toLocaleString("en-US")} total prize pool in Bangkok.`}>
        <div className="btn-row"><a className="btn btn-sky" href={applyHref("self_funded")} data-track="apply_click" data-pathway="self_funded">Apply Now</a></div>
      </PageHero>

      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>The journey</Eyebrow><h2>Three countries, three stages, 100%.</h2></div>
            <p className="lead">Singapore and Malaysia decide the Top {COMPETITION.finalists}. Thailand is where they pitch and exhibit.</p></div>
          <CompetitionJourney />
        </div>
      </section>

      <section className="section dark finale-band">
        <div className="wrap">
          <div className="head side" style={{ marginBottom: 32 }}>
            <div><Eyebrow>Grand Finale · Day {COMPETITION.finale.day}</Eyebrow><h2>{COMPETITION.finale.name}</h2>
              <ul className="finale-date" aria-label="Grand Finale"><li>2 August 2027</li><li>{COMPETITION.finale.city}, {COMPETITION.finale.country}</li><li>Planned open to the public</li></ul></div>
            <p className="lead">A conference, a live pitching showcase and an innovation expo in one day.</p>
          </div>
          <GrandFinale />
          <p className="small muted" style={{ marginTop: 16 }}>Public attendance is subject to final venue capacity, event approvals and operational arrangements.</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Awards</Eyebrow><h2>USD {COMPETITION.prizePoolUsd.toLocaleString("en-US")} across ten award recipients.</h2></div>
            <p className="lead">Four award levels, all from the Top {COMPETITION.finalists}.</p></div>
          <PrizePool />
          <div className="notice" style={{ marginTop: 24 }}>
            <p><strong>Announced before the programme:</strong> amounts per level, individual or team awards, the scorecard, the Public Choice vote and how prizes are paid.</p>
          </div>
        </div>
      </section>
      <FinalCta title="Bring the project. We'll bring the stage." />
    </>
  );
}
