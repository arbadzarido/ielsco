import type { Metadata } from "next";
import { currentSettingsSafe } from "@/lib/cohort";
import { COMPETITION, PHOTOS, keyDates } from "@/lib/content";
import { fmtRange } from "@/lib/format";
import { DeadlineStrip, Eyebrow, Figure, FinalCta, PageHero, Universities } from "@/components/Blocks";

export const metadata: Metadata = { title: "Program", description: "GIF Summer 2027: 8 days and 7 nights from Singapore through Malaysia to Thailand, 27 July – 3 August 2027." };
export const revalidate = 300;

export default async function Program() {
  const s = await currentSettingsSafe();
  return (
    <>
      <PageHero eyebrow="Program" title="Eight days on the road, one project in your hands."
        lead="27 July – 3 August 2027. Singapore → Malaysia → Thailand, ending at the Grand Finale in Bangkok." />
      <DeadlineStrip s={s} />
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Route at a glance</Eyebrow><h2>What happens in each country.</h2></div>
            <p className="lead">The day-by-day itinerary is shared with confirmed delegates from 8 June 2027.</p></div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th scope="col">Where</th><th scope="col">Competition</th><th scope="col">What you deliver</th><th scope="col">Weight</th></tr></thead>
              <tbody>
                {COMPETITION.stages.map((st) => (
                  <tr key={st.n}><td style={{ fontWeight: 700, whiteSpace: "nowrap" }}><span aria-hidden="true">{st.flag}</span> {st.country}</td><td>Stage {st.n}</td>
                    <td>{st.title}{st.n === 3 ? ` (Top ${COMPETITION.finalists}). Day ${COMPETITION.finale.day}, 2 August 2027, Bangkok: the ${COMPETITION.finale.name}.` : ""}{st.n === 2 ? `. The Top ${COMPETITION.finalists} are then selected for Thailand.` : ""}</td><td style={{ fontWeight: 700 }}>{st.weight}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap"><div className="head"><Eyebrow>Universities</Eyebrow><h2>Planned campus engagement.</h2></div><Universities s={s} /></div>
      </section>
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow>Master timeline</Eyebrow><h2>From application to arrival.</h2><Figure p={PHOTOS.jewel} sizes="(min-width: 1000px) 30vw, 100vw" style={{ marginTop: 28, maxWidth: 360 }} /></div>
          <ol className="timeline">
            {keyDates(s).map((d) => <li key={d.label} className={d.key ? "key" : ""}><div className="when">{fmtRange(d.date, "end" in d ? d.end : undefined)}</div><div className="what">{d.label}</div></li>)}
          </ol>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Participant preparation</Eyebrow><h2>About seven weeks to get ready.</h2></div>
            <p className="lead">From 8 June 2027, step by step in your portal.</p></div>
          <div className="grid g3">
            {[["Payment", "Settle your balance in the portal."], ["Visa", "We provide documents; embassies decide."],
              ["Travel", "Arrive in Singapore, leave from Thailand."], ["Insurance", "Travel and health cover is required."],
              ["Orientation", "Logistics, conduct and your project."], ["Documents", "Passport, emergency contacts, guardian consent (under-18s)."]].map(([t, d]) => (
              <div className="item" key={t}><h4>{t}</h4><p className="muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
