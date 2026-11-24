import Image from "next/image";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { getContent } from "@/lib/cms";
import { COMPETITION, PHOTOS, keyDates, visibleFaq } from "@/lib/content";
import { minInstallment } from "@/lib/pricing";
import { promoted } from "@/lib/settings";
import { fmtRange } from "@/lib/format";
import { applyHref } from "@/lib/availability";
import { CurrencyToggle, Price } from "@/components/Client";
import { Allocations, CompetitionJourney, DeadlineStrip, Eyebrow, FaqList, FinalCta, GrandFinale, openingLine, MentorPlaceholders, PhotoBand, PrizePool, Testimonials, Universities } from "@/components/Blocks";
import { DESTINATIONS, PLACES } from "@/lib/places";

export const revalidate = 300;

// Home: the Self-Funded recruitment campaign (24 Nov 2026). Fully Funded and Mentoring are not promoted here while
// settings.campaign.public_pathways leaves them out; their pages and registrations keep working.
export default async function Home() {
  const s = await currentSettingsSafe();
  const [faq, mentors, testimonials] = await Promise.all([getContent("faq"), getContent("mentors"), getContent("testimonials")]);
  const apply = applyHref("self_funded");
  const ld = { "@context": "https://schema.org", "@type": "EducationEvent", name: "Global Impact Fellowship Summer 2027", startDate: "2027-07-27", endDate: "2027-08-03",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled",
    location: [{ "@type": "Place", name: "Singapore", address: { "@type": "PostalAddress", addressCountry: "SG" } }, { "@type": "Place", name: "Malaysia", address: { "@type": "PostalAddress", addressCountry: "MY" } }, { "@type": "Place", name: "Thailand", address: { "@type": "PostalAddress", addressCountry: "TH" } }],
    organizer: { "@type": "Organization", name: "IELSco", legalName: "PT English Space Berkah Indonesia", url: "https://www.ielsco.com" },
    maximumAttendeeCapacity: s.slots.capacity, image: "https://gif.ielsco.com/photos/nus-sign.jpg" };
  const stageOf: Record<string, (typeof COMPETITION.stages)[number]> = Object.fromEntries(COMPETITION.stages.map((st) => [st.country, st]));
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {/* Hero */}
      <section className="gif-hero" aria-labelledby="hero-heading">
        <div className="bg" aria-hidden="true">
          <Image src={PLACES.marinaBay.src} alt="" fill priority sizes="100vw" quality={70} />
        </div>
        <div className="wrap inner">
          <Image className="mark" src="/brand/gif-logo.png" alt="Global Impact Fellowship" width={238} height={87} priority />
          <p className="status">Self-Funded applications are open</p>
          <p className="eyebrow">Summer 2027 · 27 July – 3 August · Singapore → Malaysia → Thailand</p>
          <h1 id="hero-heading">Build a project. Take it across three countries. <span className="accent">Pitch it in Bangkok.</span></h1>
          <p className="lead">An eight-day international fellowship where you develop a social-impact project through a three-stage competition, and where ten finalists present and exhibit their work at a public conference and innovation expo, competing for a share of a USD {COMPETITION.prizePoolUsd.toLocaleString("en-US")} prize pool.</p>
          <div className="btn-row">
            <a className="btn btn-sky" href={apply} data-track="apply_click" data-pathway="self_funded">Apply Now <span aria-hidden="true">→</span></a>
            <Link className="btn btn-secondary" href="/competition" data-track="explore_click">See the competition</Link>
          </div>
          <ol className="route" aria-label="The route">
            {DESTINATIONS.map((d) => <li key={d.country}><span className="stop">{d.stop}</span><span aria-hidden="true">{d.flag}</span>{d.country}</li>)}
          </ol>
          <ul className="facts" aria-label="Programme facts">
            <li className="hot">{s.slots.self_funded_early} Super Early Bird places</li>
            <li>USD {COMPETITION.prizePoolUsd.toLocaleString("en-US")} total prize pool</li>
            <li>8 days, 7 nights</li>
            <li>Individuals or teams of 2–3</li>
          </ul>
        </div>
        <p className="credit">Photo: Marina Bay, Singapore · {PLACES.marinaBay.credit.author}, {PLACES.marinaBay.credit.license} · <Link href="/photo-credits">Credits</Link></p>
      </section>
      <DeadlineStrip s={s} />

      {/* Self-Funded admission */}
      <section className="section" id="admission">
        <div className="wrap">
          <div className="head side">
            <div><Eyebrow>Self-Funded admission</Eyebrow><h2>Twenty Super Early Bird places. Then fifty more.</h2></div>
            <div>
              <p className="lead">Register directly: no essay, pitch deck or video. Your place is confirmed when your first payment is verified, and the first {s.slots.self_funded_early} confirmed delegates secure the Super Early Bird fee.</p>
              <CurrencyToggle />
            </div>
          </div>
          <Allocations s={s} />
          <div className="grid g3" style={{ marginTop: 20 }}>
            <div className="item"><span className="kicker">Deposit, from</span><p className="big-number"><Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} /></p><p className="small muted">You choose the amount, up to the full fee.</p></div>
            <div className="item"><span className="kicker">The rest</span><p className="big-number" style={{ fontSize: 22 }}>In installments</p><p className="small muted">Each payment from <Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} />, by the balance deadline.</p></div>
            <div className="item"><span className="kicker">Where you apply</span><p className="big-number" style={{ fontSize: 22 }}>IELSco Dashboard</p><p className="small muted">One IELSco account for your application, payments and receipts.</p></div>
          </div>
          <div className="btn-row" style={{ marginTop: 24 }}>
            <a className="btn btn-primary" href={apply} data-track="apply_click" data-pathway="self_funded">Apply Now</a>
            <Link className="btn btn-quiet arrow" href="/self-funded">Fees, payments and seats </Link>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="section alt">
        <div className="wrap">
          <div className="head side">
            <div><Eyebrow>Overview</Eyebrow><h2>A fellowship for students who want to change something.</h2></div>
            <div>
              <p className="lead">The Global Impact Fellowship brings young people together around one question: what problem in your community will you take on, and how? You arrive with an idea and develop it into a social-impact project, stage by stage, with peers from across the region.</p>
            </div>
          </div>
          <div className="grid g4">
            {[["Who", "High school, undergraduate and college students."], ["How", "Individually or in teams of 2–3 (maximum 3)."], ["Where", "Singapore, Malaysia and Thailand, in that order."], ["When", `27 July – 3 August 2027. ${openingLine(s)}`]].map(([k, v]) => (
              <div className="item" key={k}><span className="kicker">{k}</span><p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.45, color: "var(--deep)", margin: 0 }}>{v}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations, each with its competition stage */}
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Three countries, three stages</Eyebrow><h2>One route. One project that grows at every stop.</h2></div>
            <p className="lead">Each country is a stage of the competition, so your project meets three cities, systems and audiences in eight days.</p></div>
          <ol className="destinations">
            {DESTINATIONS.map((d) => (
              <li className="dest" key={d.country}>
                <div className="ph"><Image src={d.photo.src} alt={d.photo.alt} fill sizes="(min-width: 900px) 33vw, 100vw" style={{ objectPosition: ("focus" in d.photo && d.photo.focus) || "50% 50%" }} /></div>
                <span className="photo-credit">{d.photo.credit.author} · {d.photo.credit.license}</span>
                <div className="body">
                  <span className="stop">Stop {d.stop}</span>
                  <h3><span className="flag" aria-hidden="true">{d.flag}</span>{d.country}</h3>
                  <span className="where">{d.place}, {d.city}</span>
                  {stageOf[d.country] && <span className="stage">Stage {stageOf[d.country].n} · {stageOf[d.country].title}</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Competition journey */}
      <section className="section alt" id="competition">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>The competition</Eyebrow><h2>Three weighted stages. Ten finalists.</h2></div>
            <div><p className="lead">Your project is assessed at every stop. After Singapore and Malaysia, ten finalists advance to the Grand Finale in Bangkok.</p>
              <Link className="btn btn-quiet arrow" href="/competition">How the competition works </Link></div></div>
          <CompetitionJourney />
        </div>
      </section>

      {/* Grand Finale + prize pool */}
      <section className="section dark finale-band">
        <div className="wrap">
          <div className="head side" style={{ marginBottom: 32 }}>
            <div><Eyebrow>Grand Finale · Day {COMPETITION.finale.day}</Eyebrow><h2>The Top 10 take the stage in Bangkok.</h2>
              <ul className="finale-date" aria-label="Grand Finale"><li>2 August 2027</li><li>{COMPETITION.finale.city}, {COMPETITION.finale.country}</li><li>Planned open to the public</li></ul></div>
            <p className="lead">The {COMPETITION.finale.name} is not only a pitching competition: it combines a public conference, a live pitching showcase on the main stage and an exhibition of the finalists&rsquo; projects.</p>
          </div>
          <GrandFinale />
          <div style={{ marginTop: 24 }}><PrizePool dark /></div>
          <p className="small muted" style={{ marginTop: 16 }}>Public attendance is subject to final venue capacity, event approvals and operational arrangements.</p>
        </div>
      </section>

      {/* University exposure */}
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>University exposure</Eyebrow><h2>Campus visits we are planning.</h2></div>
            <p className="lead">We are planning engagement with a leading university in each country. Status is shown honestly: planned until agreed in writing.</p></div>
          <Universities s={s} />
        </div>
      </section>

      {/* Previous GIF */}
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Previous GIF</Eyebrow><h2>GIF 2026, Singapore.</h2></div>
            <div><p className="lead">Batch 2 ran from 17 to 20 November 2026: four days of project incubation on the NUS campus, campus tours and evenings exploring the city.</p><Link className="btn btn-secondary arrow" href="/previous-gif">See GIF 2026 </Link></div></div>
          <PhotoBand />
        </div>
      </section>

      {/* Testimonials */}
      <section className="section">
        <div className="wrap"><div className="head"><Eyebrow>Testimonials</Eyebrow><h2>In delegates&rsquo; own words.</h2></div><Testimonials items={testimonials} /></div>
      </section>

      {promoted(s, "mentoring") && (
        <section className="section alt">
          <div className="wrap"><div className="head side"><div><Eyebrow>Mentors</Eyebrow><h2>Founders who are still students.</h2></div>
            <p className="lead">Our mentors build startups while they study, so they know what it takes to turn a student idea into something real.</p></div>
            <MentorPlaceholders mentors={mentors} /></div>
        </section>
      )}

      {/* FAQ */}
      <section className="section alt">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow>FAQ</Eyebrow><h2>Questions, answered.</h2><p className="muted" style={{ marginTop: 16 }}>More in the <Link href="/faq">full FAQ</Link>, or write to <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>.</p></div>
          <FaqList items={visibleFaq(faq, s).slice(0, 7)} />
        </div>
      </section>

      {/* Key dates */}
      <section className="section tight">
        <div className="wrap">
          <Eyebrow>Key dates</Eyebrow>
          <div className="table-wrap"><table className="t"><tbody>
            {keyDates(s).map((d) => <tr key={d.label}><td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtRange(d.date, "end" in d ? d.end : undefined)}</td><td>{d.label}</td></tr>)}
          </tbody></table></div>
        </div>
      </section>
      <FinalCta title="Your project deserves a bigger room." body={`${openingLine(s)} Register from your IELSco Dashboard; you can save a draft and finish later.`} />
    </>
  );
}
