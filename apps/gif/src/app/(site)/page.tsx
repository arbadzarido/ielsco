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
import { Allocations, DeadlineStrip, Elco, Eyebrow, FaqList, FinalCta, MentorPlaceholders, openingLine, PrizePool, Testimonials, Universities } from "@/components/Blocks";
import { DESTINATIONS, PLACES } from "@/lib/places";

export const revalidate = 300;

// Home: the Self-Funded recruitment campaign (24 Nov 2026), editorial refresh (25 Nov 2026): the original Marina Bay hero with
// shorter wording and the prize pool as its headline number, black-and-white photography against the sky/teal identity, and one section per question a visitor has.
// Fully Funded and Mentoring are not promoted here while settings.campaign.public_pathways leaves them out.
export default async function Home() {
  const s = await currentSettingsSafe();
  const [faq, mentors, testimonials] = await Promise.all([getContent("faq"), getContent("mentors"), getContent("testimonials")]);
  const apply = applyHref("self_funded");
  const ld = { "@context": "https://schema.org", "@type": "EducationEvent", name: "Global Impact Fellowship Summer 2027", startDate: "2027-07-27", endDate: "2027-08-03",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled",
    location: [{ "@type": "Place", name: "Singapore", address: { "@type": "PostalAddress", addressCountry: "SG" } }, { "@type": "Place", name: "Malaysia", address: { "@type": "PostalAddress", addressCountry: "MY" } }, { "@type": "Place", name: "Thailand", address: { "@type": "PostalAddress", addressCountry: "TH" } }],
    organizer: { "@type": "Organization", name: "IELSco", legalName: "PT English Space Berkah Indonesia", url: "https://www.ielsco.com" },
    maximumAttendeeCapacity: s.slots.capacity, image: "https://gif.ielsco.com/photos/nus-sign.jpg" };
  const stageOf = Object.fromEntries(COMPETITION.stages.map((st) => [st.country, st])) as Record<string, (typeof COMPETITION.stages)[number]>;
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      {/* Hero: Marina Bay under the signature gradient (original background), with the prize pool as the headline number. */}
      <section className="gif-hero" aria-labelledby="hero-heading">
        <div className="bg" aria-hidden="true">
          <Image src={PLACES.marinaBay.src} alt="" fill priority sizes="100vw" quality={70} />
        </div>
        <div className="wrap inner">
          <Image className="mark" src="/brand/gif-logo.png" alt="Global Impact Fellowship" width={238} height={87} priority />
          <p className="status">Self-Funded registration is open</p>
          <h1 id="hero-heading">Build a project. Cross three countries. <span className="accent">Pitch it in Bangkok.</span></h1>
          <div className="hero-prize" data-testid="hero-prize">
            <span className="kick">Compete for a share of</span>
            <span className="amt">USD {COMPETITION.prizePoolUsd.toLocaleString("en-US")}</span>
            <span className="lbl">total prize pool · Grand Finale in Bangkok</span>
          </div>
          <p className="eyebrow">27 July – 3 August 2027 · Singapore → Malaysia → Thailand</p>
          <div className="btn-row">
            <a className="btn btn-sky" href={apply} data-track="apply_click" data-pathway="self_funded">Apply Now <span aria-hidden="true">→</span></a>
            <Link className="btn btn-secondary" href="/competition" data-track="explore_click">See the competition</Link>
          </div>
        </div>
        <p className="credit">Photo: Marina Bay, Singapore · {PLACES.marinaBay.credit.author}, {PLACES.marinaBay.credit.license} · <Link href="/photo-credits">Credits</Link></p>
      </section>
      <DeadlineStrip s={s} />

      {/* What GIF is, in numbers */}
      <section className="section intro">
        <div className="wrap intro-grid">
          <div>
            <Eyebrow>What is GIF</Eyebrow>
            <h2>A travelling fellowship built around your project.</h2>
            <p className="lead">Bring a problem from your community. Leave with a tested social-impact project, pitched on an international stage.</p>
            <p className="intro-who">For high school and university students · solo or in teams of 2–3</p>
          </div>
          <dl className="numbers">
            <div><dt>Days on the road</dt><dd>8</dd></div>
            <div><dt>Countries</dt><dd>3</dd></div>
            <div><dt>Competition stages</dt><dd>3</dd></div>
            <div><dt>Finalists in Bangkok</dt><dd>{COMPETITION.finalists}</dd></div>
          </dl>
        </div>
      </section>

      {/* Route: one card per country, carrying its competition stage */}
      <section className="section alt" id="route">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>The route</Eyebrow><h2>Three countries. Three stages.</h2></div>
            <p className="lead">Each stop is a stage of the competition. Singapore and Malaysia decide the Top {COMPETITION.finalists}; Thailand is the finale. <Link href="/competition">How it works</Link></p></div>
          <ol className="destinations">
            {DESTINATIONS.map((d) => {
              const st = stageOf[d.country];
              return (
                <li className="dest" key={d.country}>
                  <div className="ph"><Image src={d.photo.src} alt={d.photo.alt} fill sizes="(min-width: 900px) 33vw, 100vw" style={{ objectPosition: ("focus" in d.photo && d.photo.focus) || "50% 50%" }} /></div>
                  <span className="photo-credit">{d.photo.credit.author} · {d.photo.credit.license}</span>
                  <span className="dest-num" aria-hidden="true">{d.stop}</span>
                  <div className="body">
                    <h3><span className="flag" aria-hidden="true">{d.flag}</span>{d.country}</h3>
                    <span className="where">{d.place}, {d.city}</span>
                    {st && (
                      <div className="dest-stage">
                        <span className="lbl">Stage {String(st.n).padStart(2, "0")} · {st.weight}%</span>
                        <span className="ttl">{st.title}</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Grand Finale + prize pool */}
      <section className="section dark finale-band" id="competition">
        <div className="wrap">
          <div className="finale-top">
            <div>
              <Eyebrow>Grand Finale · Day {COMPETITION.finale.day}</Eyebrow>
              <h2>The Top {COMPETITION.finalists} take the stage in Bangkok.</h2>
              <ul className="finale-date" aria-label="Grand Finale"><li>2 August 2027</li><li>{COMPETITION.finale.city}, {COMPETITION.finale.country}</li><li>Planned open to the public</li></ul>
            </div>
            <ul className="finale-parts-mini">
              <li><b>Main stage</b>Live pitches to the public, guests and judges.</li>
              <li><b>Innovation booths</b>Demos, visitor feedback and Public Choice voting.</li>
            </ul>
          </div>
          <PrizePool dark />
          <p className="tiny muted" style={{ marginTop: 14 }}>{COMPETITION.finale.name}. Public attendance is subject to venue capacity, approvals and arrangements.</p>
        </div>
      </section>

      {/* Self-Funded admission */}
      <section className="section" id="admission">
        <div className="wrap">
          <div className="head side">
            <div><Eyebrow>Self-Funded admission</Eyebrow><h2>Twenty Super Early Bird places. Then fifty more.</h2></div>
            <div className="admit-side">
              <p className="lead">No essay or video. Your place is confirmed when your first payment is verified.</p>
              <CurrencyToggle />
            </div>
          </div>
          <Allocations s={s} />
          <ul className="paybar" aria-label="How you pay">
            <li><span>Deposit from</span><b><Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} /></b></li>
            <li><span>The rest</span><b>In installments</b></li>
            <li><span>Apply on</span><b>IELSco Dashboard</b></li>
          </ul>
          <div className="btn-row" style={{ marginTop: 24 }}>
            <a className="btn btn-primary" href={apply} data-track="apply_click" data-pathway="self_funded">Apply Now</a>
            <Link className="btn btn-quiet arrow" href="/self-funded">Fees, payments and seats </Link>
          </div>
        </div>
      </section>

      {/* Universities */}
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Campus visits</Eyebrow><h2>A university in every country.</h2></div>
            <p className="lead">Planned engagement, shown as planned until agreed in writing.</p></div>
          <Universities s={s} />
        </div>
      </section>

      {/* Previous GIF: a layered mosaic */}
      <section className="section prev">
        <div className="wrap prev-grid">
          <div className="prev-copy">
            <Eyebrow>Previous GIF</Eyebrow>
            <h2>GIF 2026, Singapore.</h2>
            <dl className="prev-stats"><div><dt>Delegates</dt><dd>12</dd></div><div><dt>Teams</dt><dd>4</dd></div><div><dt>Days</dt><dd>4</dd></div></dl>
            <p className="muted">17–20 November 2026: project incubation on the NUS campus and evenings in the city.</p>
            <Link className="btn btn-secondary arrow" href="/previous-gif">See GIF 2026 </Link>
            <div className="prev-voices"><Testimonials items={testimonials} /></div>
          </div>
          <div className="mosaic">
            <figure className="m1"><Image src={PHOTOS.classroom.src} alt={PHOTOS.classroom.alt} fill sizes="(min-width: 1000px) 24vw, 50vw" /></figure>
            <figure className="m2"><Image src={PHOTOS.museumGroup.src} alt={PHOTOS.museumGroup.alt} fill sizes="(min-width: 1000px) 30vw, 60vw" /></figure>
            <figure className="m3"><Image src={PHOTOS.awarding.src} alt={PHOTOS.awarding.alt} fill sizes="(min-width: 1000px) 18vw, 40vw" style={{ objectPosition: "50% 78%" }} /></figure>
            <span className="mosaic-shape" aria-hidden="true" />
          </div>
        </div>
      </section>

      {promoted(s, "mentoring") && (
        <section className="section alt">
          <div className="wrap"><div className="head side"><div><Eyebrow>Mentors</Eyebrow><h2>Founders who are still students.</h2></div>
            <p className="lead">Our mentors build startups while they study.</p></div>
            <MentorPlaceholders mentors={mentors} /></div>
        </section>
      )}

      {/* FAQ + key dates */}
      <section className="section alt">
        <div className="wrap qa-grid">
          <div>
            <div className="qa-head">
              <div><Eyebrow>FAQ</Eyebrow><h2>Questions, answered.</h2></div>
              <Elco pose="thinking" />
            </div>
            <FaqList items={visibleFaq(faq, s).slice(0, 6)} />
            <p className="small muted" style={{ marginTop: 16 }}>More in the <Link href="/faq">full FAQ</Link>, or write to <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>.</p>
          </div>
          <aside className="dates-card" aria-labelledby="dates-h">
            <Eyebrow>Key dates</Eyebrow>
            <h3 id="dates-h" className="sr-only">Key dates</h3>
            <ol>
              {keyDates(s).map((d) => <li key={d.label} className={d.key ? "key" : undefined}><span className="when">{fmtRange(d.date, "end" in d ? d.end : undefined)}</span><span>{d.label}</span></li>)}
            </ol>
          </aside>
        </div>
      </section>
      <FinalCta title="Your project deserves a bigger room." body={`${openingLine(s)} Save a draft and finish later.`} />
    </>
  );
}
