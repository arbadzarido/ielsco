import type { Metadata } from "next";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { getContent } from "@/lib/cms";
import { MENTORING_SESSIONS } from "@/lib/content";
import { mentoringPrice } from "@/lib/settings";
import { fmtDate } from "@/lib/format";
import { CurrencyToggle, Price } from "@/components/Client";
import { Eyebrow, FinalCta, MentorPlaceholders, PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "Project Mentoring Program", description: "15 weekly mentoring sessions from 2 February to 11 May 2027, then straight to Phase 3 of the GIF Summer 2027 selection.", robots: { index: false, follow: true } /* not promoted in the Self-Funded campaign (24 Nov 2026); the page still works */ };
export const revalidate = 300;

export default async function Mentoring() {
  const s = await currentSettingsSafe();
  const mentors = await getContent("mentors");
  const m = mentoringPrice(s);
  return (
    <>
      <PageHero eyebrow="Pathway B · Project Mentoring Program" title="Fifteen Tuesdays from problem to pitch."
        lead="Weekly sessions from 2 February to 11 May 2027 with student startup founders from NUS, UTM and Chulalongkorn. Mentees skip Phases 1 and 2 and go straight to Phase 3, evaluated exactly like every other applicant.">
        <div className="btn-row"><Link className="btn btn-light" href="/apply?pathway=mentoring" data-track="pathway_select" data-pathway="mentoring">Join the mentoring</Link></div>
      </PageHero>
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="01">Price</Eyebrow><h2>Early Bird and Regular.</h2></div><CurrencyToggle /></div>
          <div className="grid g3">
            <div className="item"><span className="kicker">Early Bird {m.tier === "early" ? "· current" : "· ended"}</span><p className="big-number"><Price idr={s.prices.mentoring_early.IDR} usd={s.prices.mentoring_early.USD} /></p>
              <p className="small muted">{s.dates.mentoring_early_bird_until ? `Until ${fmtDate(s.dates.mentoring_early_bird_until, { day: "numeric", month: "long", year: "numeric" })}, 23:59 WIB.` : "The Early Bird end date will be announced here in advance."}</p></div>
            <div className="item"><span className="kicker">Regular</span><p className="big-number"><Price idr={s.prices.mentoring_regular.IDR} usd={s.prices.mentoring_regular.USD} /></p><p className="small muted">After the Early Bird period.</p></div>
            <div className="item"><span className="kicker">Who pays what</span><p className="small">Indonesian participants pay the IDR price; international participants pay the USD price. Each team member enrols individually.</p></div>
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap grid split" style={{ alignItems: "start" }}>
          <div><Eyebrow n="02">Selection shortcut and cashback</Eyebrow><h2>Straight to Phase 3.</h2></div>
          <div>
            <p className="lead">You skip Phases 1 and 2. In Phase 3 (25–31 May 2027) you submit a 3–5 minute video presentation and are evaluated on the same seven criteria as everyone else.</p>
            <div className="table-wrap" style={{ marginTop: 20 }}><table className="t"><thead><tr><th>If your result is</th><th>Cashback</th></tr></thead><tbody>
              <tr><td>Fully Funded</td><td><Price idr={s.cashback.fully_funded.IDR} usd={s.cashback.fully_funded.USD} /></td></tr>
              <tr><td>Partial Funded</td><td><Price idr={s.cashback.partial_funded.IDR} usd={s.cashback.partial_funded.USD} /></td></tr>
              <tr><td>Not Selected</td><td>No cashback. You keep the complete mentoring programme.</td></tr>
            </tbody></table></div>
            <p className="small muted" style={{ marginTop: 12 }}><strong>Who gets it:</strong> enrolled mentees whose mentoring fee is verified and who are selected on 1 June 2027. <strong>Verification:</strong> we check your identity, enrolment and payment and ask for a bank account in your name (a parent&rsquo;s or guardian&rsquo;s if you are under 18). <strong>When:</strong> by bank transfer after results are published, within 30 days of verification. See the <Link href="/mentoring-terms">Mentoring Program Terms</Link>.</p>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="03">Curriculum</Eyebrow><h2>15 sessions, every Tuesday.</h2></div><p className="lead">Problem identification, design thinking, ideation, research, development, business model, impact measurement, sustainability, pitch deck and pitching. Session times are sent to enrolled mentees.</p></div>
          <div className="table-wrap"><table className="t">
            <thead><tr><th>#</th><th>Tuesday</th><th>Session</th><th>Theme</th></tr></thead>
            <tbody>{MENTORING_SESSIONS.map(([d, t, k], i) => <tr key={d}><td style={{ color: "var(--gif-sky-ink)", fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td><td style={{ whiteSpace: "nowrap" }}>{fmtDate(d, { day: "numeric", month: "short" })}</td><td>{t}</td><td className="muted small">{k}</td></tr>)}</tbody>
          </table></div>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap"><div className="head"><Eyebrow n="04">Mentors</Eyebrow><h2>Five student startup founders.</h2></div><MentorPlaceholders mentors={mentors} /></div>
      </section>
      <FinalCta title="Start mentoring on 2 February 2027." body="Enrol now: register, pay the mentoring fee, and your sessions and Phase 3 access appear in your portal." />
    </>
  );
}
