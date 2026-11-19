import type { Metadata } from "next";
import { currentSettingsSafe } from "@/lib/cohort";
import { KEY_DATES, PHOTOS } from "@/lib/content";
import { fmtRange } from "@/lib/format";
import { DeadlineStrip, Eyebrow, Figure, FinalCta, PageHero, Universities } from "@/components/Blocks";

export const metadata: Metadata = { title: "Program", description: "GIF Summer 2027: 8 days and 7 nights from Singapore through Malaysia to Thailand, 27 July – 3 August 2027." };
export const revalidate = 300;

export default async function Program() {
  const s = await currentSettingsSafe();
  return (
    <>
      <PageHero eyebrow="Program" title="Eight days on the road, one project in your hands."
        lead="GIF Summer 2027 runs from 27 July to 3 August 2027 and travels from Singapore through Malaysia to Thailand. You work on your social impact project throughout, with planned university engagement, a conference and an awarding." />
      <DeadlineStrip s={s} />
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="01">What you do</Eyebrow><h2>The shape of the programme.</h2></div>
            <p className="lead">The full day-by-day itinerary is shared with confirmed delegates during participant preparation, which starts on 8 June 2027.</p></div>
          <div className="grid g4">
            {[["Project work", "Develop and test your project with your team and peers from other countries."],
              ["University engagement", "Planned visits to NUS, Universiti Malaya and Chulalongkorn (status shown below)."],
              ["Conference", "Present your project to fellow delegates and guests."],
              ["Awarding", "Recognition for the work delegates produce during the fellowship."]].map(([t, d], i) => (
              <div className="item" key={t}><span className="index-num">0{i + 1}</span><h4>{t}</h4><p className="muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap"><div className="head"><Eyebrow n="02">Universities</Eyebrow><h2>Planned campus engagement.</h2></div><Universities s={s} /></div>
      </section>
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="03">Master timeline</Eyebrow><h2>From application to arrival.</h2><Figure p={PHOTOS.jewel} sizes="(min-width: 1000px) 30vw, 100vw" style={{ marginTop: 28, maxWidth: 360 }} /></div>
          <ol className="timeline">
            {KEY_DATES.map((d) => <li key={d.label} className={d.key ? "key" : ""}><div className="when">{fmtRange(d.date, "end" in d ? d.end : undefined)}</div><div className="what">{d.label}</div></li>)}
          </ol>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="04">Participant preparation</Eyebrow><h2>About seven weeks to get ready.</h2></div>
            <p className="lead">From 8 June 2027 your portal walks you through each step. Nothing is left to the last week.</p></div>
          <div className="grid g3">
            {[["Payment", "Settle any balance shown in your portal. Receipts are issued automatically."], ["Visa", "Check what your passport needs for Singapore, Malaysia and Thailand. We provide supporting documents; the decision is the embassy's."],
              ["Travel", "Plan your arrival in Singapore and departure from Thailand according to the briefing."], ["Insurance", "Travel and health insurance covering the whole programme is required."],
              ["Orientation", "Orientation before departure: logistics, conduct and your project."], ["Documents", "Passport details, emergency contacts and any guardian consent for under-18s, uploaded to your private portal."]].map(([t, d]) => (
              <div className="item" key={t}><h4>{t}</h4><p className="muted">{d}</p></div>
            ))}
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
