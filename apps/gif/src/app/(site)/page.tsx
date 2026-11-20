import Image from "next/image";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { getContent } from "@/lib/cms";
import { PHOTOS, KEY_DATES, ELCO_PRO_FEATURES } from "@/lib/content";
import { balanceOf, mentoringPrice } from "@/lib/settings";
import { fmtRange } from "@/lib/format";
import { CurrencyToggle, Price } from "@/components/Client";
import { DeadlineStrip, Eyebrow, FaqList, FinalCta, Figure, MentorPlaceholders, Pathways, PhotoBand, Testimonials, Universities } from "@/components/Blocks";

export const revalidate = 300;

export default async function Home() {
  const s = await currentSettingsSafe();
  const [faq, mentors, testimonials] = await Promise.all([getContent("faq"), getContent("mentors"), getContent("testimonials")]);
  const m = mentoringPrice(s);
  const bal = balanceOf(s);
  const ld = { "@context": "https://schema.org", "@type": "EducationEvent", name: "Global Impact Fellowship Summer 2027", startDate: "2027-07-27", endDate: "2027-08-03",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", eventStatus: "https://schema.org/EventScheduled",
    location: [{ "@type": "Place", name: "Singapore", address: { "@type": "PostalAddress", addressCountry: "SG" } }, { "@type": "Place", name: "Malaysia", address: { "@type": "PostalAddress", addressCountry: "MY" } }, { "@type": "Place", name: "Thailand", address: { "@type": "PostalAddress", addressCountry: "TH" } }],
    organizer: { "@type": "Organization", name: "IELSco", legalName: "PT English Space Berkah Indonesia", url: "https://www.ielsco.com" },
    maximumAttendeeCapacity: s.slots.capacity, image: "https://gif.ielsco.com/photos/nus-sign.jpg" };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {/* 1 · Hero */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-bg" aria-hidden="true">
          <Image src={PHOTOS.museumGroup.src} alt="" fill priority sizes="100vw" />
        </div>
        <div className="wrap hero-inner">
          <Image className="gif-mark" src="/brand/gif-logo.png" alt="Global Impact Fellowship" width={238} height={87} priority style={{ height: 72, width: "auto" }} />
          <p className="eyebrow" style={{ justifyContent: "center" }}>Summer 2027 · Singapore, Malaysia, Thailand</p>
          <h1 id="hero-heading">Eight days, three countries, one project that <span className="accent">matters</span>.</h1>
          <p className="lead">GIF Summer 2027 takes high school, undergraduate and college students from Singapore through Malaysia to Thailand to build social impact projects with peers from across the region.</p>
          <div className="btn-row">
            <Link className="btn btn-primary" href="/apply" data-track="apply_click">Apply Now <span aria-hidden="true">→</span></Link>
            <Link className="btn btn-secondary" href="/opportunities" data-track="explore_click">Explore Opportunities</Link>
          </div>
          <ul className="hero-facts" aria-label="Programme facts">
            <li className="pill">27 Jul – 3 Aug 2027</li>
            <li className="pill">SG → MY → TH</li>
            <li className="pill">8 days, 7 nights</li>
            <li className="pill">Up to {s.slots.capacity} delegates</li>
          </ul>
        </div>
      </section>
      <DeadlineStrip s={s} />

      {/* 2 · Overview */}
      <section className="section">
        <div className="wrap">
          <div className="head side">
            <div><Eyebrow n="01">Overview</Eyebrow><h2>A fellowship for students who want to change something.</h2></div>
            <div>
              <p className="lead">The Global Impact Fellowship brings young people together around one question: what problem in your community will you take on, and how? You arrive with an idea; you leave with a sharper project, a pitch and a network across Southeast Asia.</p>
              <p className="muted">Apply on your own or as a team of two or three. Every pathway leads to the same eight days on the road.</p>
            </div>
          </div>
          <div className="grid g4">
            {[["Who", "High school, undergraduate and college students."], ["How", "Individually or in teams of 2–3 (maximum 3)."], ["Where", "Singapore, Malaysia and Thailand, in that order."], ["When", "27 July – 3 August 2027. Applications from 25 November 2026."]].map(([k, v]) => (
              <div className="item" key={k}><span className="kicker">{k}</span><p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.45, color: "var(--deep)", margin: 0 }}>{v}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 · Destinations */}
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="02">Destinations</Eyebrow><h2>One route, three countries.</h2></div>
            <p className="lead">The programme moves from Singapore through Malaysia to Thailand, so the ideas you work on meet three different cities, systems and cultures in eight days.</p></div>
          <ol className="grid g3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[["Singapore", "Start of the route", "Planned engagement with the National University of Singapore, where GIF 2026 delegates worked on their projects."],
              ["Malaysia", "Middle of the route", "Planned engagement with Universiti Malaya."],
              ["Thailand", "End of the route", "Planned engagement with Chulalongkorn University."]].map(([c, k, d], i) => (
              <li className="item" key={c}><span className="index-num">0{i + 1}</span><h3>{c}</h3><span className="kicker" style={{ marginTop: 8 }}>{k}</span><p className="muted">{d}</p></li>
            ))}
          </ol>
          <p className="small muted" style={{ marginTop: 24 }}>The day-by-day itinerary is published to delegates during participant preparation (from 8 June 2027).</p>
        </div>
      </section>

      {/* 4 · University exposure */}
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="03">University exposure</Eyebrow><h2>Campus visits we are planning.</h2></div>
            <p className="lead">We are planning engagement with a leading university in each country. Status is shown honestly: planned until agreed in writing.</p></div>
          <Universities s={s} />
        </div>
      </section>

      {/* 5 · Three pathways */}
      <section className="section alt" id="pathways">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="04">Three pathways</Eyebrow><h2>Choose how you join.</h2></div>
            <div><p className="lead">Compete for a funded place, get mentored and fast-tracked to the final phase, or register directly.</p><CurrencyToggle /></div></div>
          <Pathways s={s} />
        </div>
      </section>

      {/* 6 · Funded opportunities */}
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="05">Funded opportunities</Eyebrow><h2>{s.slots.fully_funded} Fully Funded. {s.slots.partial_funded} Partial Funded.</h2>
            <p className="lead" style={{ marginTop: 20 }}>A competitive, three-phase selection. Partial Funded is an outcome of this selection, not a separate pathway. Funding is never guaranteed.</p>
            <Link className="btn btn-secondary arrow" href="/fully-funded" style={{ marginTop: 12 }}>How the Fully Funded application works </Link></div>
          <div>
            <ol className="timeline">
              <li className="key"><div className="when">Phase 1 · {fmtRange("2026-11-25", "2027-05-10")}</div><div className="what">Online application, 3 months of Elco Pro for IDR {s.prices.elco_pro_idr.toLocaleString("en-US")}, and social media tasks</div><p className="small muted">A real product you keep, not an application fee: {ELCO_PRO_FEATURES.slice(0, 3).join("; ").toLowerCase()}.</p></li>
              <li><div className="when">Phase 2 · {fmtRange("2027-05-11", "2027-05-24")}</div><div className="what">Project essay and pitch deck</div></li>
              <li><div className="when">Phase 3 · {fmtRange("2027-05-25", "2027-05-31")}</div><div className="what">Video presentation (3–5 minutes): 3 days to submit, then 4 days of evaluation</div></li>
              <li className="key"><div className="when">1 June 2027</div><div className="what">Results: Fully Funded, Partial Funded or Not Selected</div></li>
            </ol>
          </div>
        </div>
      </section>

      {/* 7 · Mentoring */}
      <section className="section dark">
        <div className="wrap grid split-r" style={{ alignItems: "center" }}>
          <div>
            <Eyebrow n="06">Mentoring</Eyebrow>
            <h2>Fifteen Tuesdays that take you straight to Phase 3.</h2>
            <p className="lead" style={{ marginTop: 20 }}>From 2 February to 11 May 2027, five student startup founders from NUS, UTM and Chulalongkorn guide you from problem to pitch. Mentees skip Phases 1 and 2 and are evaluated in Phase 3 exactly like everyone else.</p>
            <div className="grid g2" style={{ marginTop: 28 }}>
              <div className="item"><span className="kicker">{m.tier === "early" ? "Early Bird" : "Regular"}</span><p className="big-number"><Price idr={m.price.IDR} usd={m.price.USD} /></p></div>
              <div className="item"><span className="kicker">If selected</span><p>Cashback after verification: <Price idr={s.cashback.fully_funded.IDR} usd={s.cashback.fully_funded.USD} /> (Fully Funded) or <Price idr={s.cashback.partial_funded.IDR} usd={s.cashback.partial_funded.USD} /> (Partial Funded).</p></div>
            </div>
            <div className="btn-row" style={{ marginTop: 20 }}><Link className="btn btn-light" href="/apply?pathway=mentoring" data-track="pathway_select" data-pathway="mentoring">Join the mentoring</Link><Link className="btn btn-secondary" href="/mentoring">See all 15 sessions</Link></div>
          </div>
          <Figure p={PHOTOS.classroom} sizes="(min-width: 1000px) 40vw, 100vw" style={{ maxWidth: 440, marginLeft: "auto" }} />
        </div>
      </section>

      {/* 8 · Self-Funded */}
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="07">Self-Funded</Eyebrow><h2>Register directly. No essay, no deck, no video.</h2></div>
            <p className="lead">Secure a place by paying the deposit. Your seat is confirmed only when the deposit is verified; the balance is paid during participant preparation.</p></div>
          <div className="grid g3">
            <div className="item"><span className="kicker">Programme fee</span><p className="big-number"><Price idr={s.prices.self_funded_total.IDR} usd={s.prices.self_funded_total.USD} /></p></div>
            <div className="item"><span className="kicker">Deposit (confirms your seat)</span><p className="big-number"><Price idr={s.prices.self_funded_deposit.IDR} usd={s.prices.self_funded_deposit.USD} /></p></div>
            <div className="item"><span className="kicker">Balance</span><p className="big-number"><Price idr={bal.IDR} usd={bal.USD} /></p></div>
          </div>
          <p className="small muted" style={{ marginTop: 20 }}>Indonesian participants pay the IDR price; international participants pay the USD price. <Link href="/self-funded">What the fee covers and how to pay</Link>.</p>
        </div>
      </section>

      {/* 9 · Project funding */}
      <section className="section alt">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="08">Project funding</Eyebrow><h2>Ways to fund your place.</h2></div>
          <div className="grid g2">
            <div className="item"><h4>Win a funded place</h4><p className="muted">Ten Fully Funded and ten Partial Funded places are awarded through the selection. Fully Funded covers the programme fee, accommodation and in-programme transport (not international flights); Partial Funded means a reduced contribution. Final details come with your result on 1 June 2027.</p><Link href="/fully-funded">Fully Funded application</Link></div>
            <div className="item"><h4>Approach a sponsor</h4><p className="muted">Schools, universities, companies and local governments sometimes support students. We prepare the documentation you need to ask. We do not guarantee sponsorship.</p><Link href="/sponsorship">Sponsorship support</Link></div>
            <div className="item"><h4>Mentoring cashback</h4><p className="muted">Mentees who are selected receive a cashback after verification. It is conditional on selection.</p><Link href="/mentoring">Mentoring</Link></div>
            <div className="item"><h4>Pay in two steps</h4><p className="muted">Self-Funded delegates pay a deposit to confirm their seat and the balance later.</p><Link href="/self-funded">Self-Funded</Link></div>
          </div>
        </div>
      </section>

      {/* 10 · Conference and awarding */}
      <section className="section">
        <div className="wrap grid split-r" style={{ alignItems: "center" }}>
          <div>
            <Eyebrow n="09">Conference and awarding</Eyebrow>
            <h2>Present the work. Be recognised for it.</h2>
            <p className="lead" style={{ marginTop: 20 }}>The programme includes a conference where delegates present their projects, and an awarding. At GIF 2026, four teams of twelve delegates presented and were awarded certificates of achievement.</p>
          </div>
          <Figure p={PHOTOS.awarding} sizes="(min-width: 1000px) 40vw, 100vw" style={{ maxWidth: 420, marginLeft: "auto" }} />
        </div>
      </section>

      {/* 11 · Previous GIF */}
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="10">Previous GIF</Eyebrow><h2>GIF 2026, Singapore.</h2></div>
            <div><p className="lead">Batch 2 ran from 17 to 20 November 2026: four days of project incubation on the NUS campus, campus tours and evenings exploring the city.</p><Link className="btn btn-secondary arrow" href="/previous-gif">See GIF 2026 </Link></div></div>
          <PhotoBand />
        </div>
      </section>

      {/* 12 · Testimonials */}
      <section className="section">
        <div className="wrap"><div className="head"><Eyebrow n="11">Testimonials</Eyebrow><h2>In delegates&rsquo; own words.</h2></div><Testimonials items={testimonials} /></div>
      </section>

      {/* 13 · Mentors */}
      <section className="section alt">
        <div className="wrap"><div className="head side"><div><Eyebrow n="12">Mentors</Eyebrow><h2>Founders who are still students.</h2></div>
          <p className="lead">Our mentors build startups while they study, so they know what it takes to turn a student idea into something real.</p></div>
          <MentorPlaceholders mentors={mentors} /></div>
      </section>

      {/* 14 · FAQ */}
      <section className="section">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="13">FAQ</Eyebrow><h2>Questions, answered.</h2><p className="muted" style={{ marginTop: 16 }}>More in the <Link href="/faq">full FAQ</Link>, or write to <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>.</p></div>
          <FaqList items={faq.slice(0, 7)} />
        </div>
      </section>

      {/* Key dates, then 15 · Final CTA */}
      <section className="section alt tight">
        <div className="wrap">
          <Eyebrow n="14">Master timeline</Eyebrow>
          <div className="table-wrap"><table className="t"><tbody>
            {KEY_DATES.map((d) => <tr key={d.label}><td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{fmtRange(d.date, "end" in d ? d.end : undefined)}</td><td>{d.label}</td></tr>)}
          </tbody></table></div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
