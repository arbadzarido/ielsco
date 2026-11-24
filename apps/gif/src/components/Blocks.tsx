import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NextDeadline, Price } from "@/components/Client";
import { COMPETITION, PHOTOS, type Photo, type Mentor, type Testimonial, type Faq } from "@/lib/content";
import type { Pathway, Settings } from "@/lib/settings";
import { DEFAULT_SETTINGS, mentoringPrice, pathwayOpen, pathwayOpensAt, promoted } from "@/lib/settings";
import { applyHref, selfFundedAvailability } from "@/lib/availability";
import { minInstallment } from "@/lib/pricing";
import { fmtDate } from "@/lib/format";
import { CAMPUS_PHOTOS, PLACES } from "@/lib/places";

// Elco, the IELSco mascot, as a small companion (one per page, never in the hero). Decorative: aria-hidden.
// Motion is CSS only (globals.css, "Elco companion"): a slow float, a rise-in on scroll, a hop on hover; off with reduced motion.
export type ElcoPose = "thinking" | "trophy" | "explaining" | "presenting" | "writing" | "talking" | "reading" | "relaxed";
export function Elco({ pose, className = "" }: { pose: ElcoPose; className?: string }) {
  return (
    <span className={`elco ${className}`.trim()} aria-hidden="true" data-pose={pose}>
      <Image src={`/elco/${pose}.svg`} alt="" width={160} height={130} unoptimized />
    </span>
  );
}

// IELSco eyebrow: teal, uppercase, no editorial numbering (n is accepted for older call sites and ignored).
export function Eyebrow({ children }: { n?: string; children: ReactNode }) {
  return <div className="eyebrow"><span>{children}</span></div>;
}

export function PageHero({ eyebrow, title, lead, children, dark = true }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; dark?: boolean }) {
  return (
    <section className={dark ? "page-hero" : "section"} style={dark ? undefined : { paddingBottom: 40 }}>
      <div className="wrap">
        <div className="eyebrow">{dark && <Image src="/brand/gif-icon-white.png" alt="" width={289} height={300} />}<span>{eyebrow}</span></div>
        <h1>{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children && <div style={{ marginTop: 28 }}>{children}</div>}
      </div>
    </section>
  );
}

export function Figure({ p, sizes = "(min-width: 900px) 33vw, 100vw", priority = false, className = "photo", style }: { p: Photo; sizes?: string; priority?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <figure className={className} style={style}>
      <Image src={p.src} alt={p.alt} width={p.w} height={p.h} sizes={sizes} priority={priority} />
      <figcaption>{p.caption}</figcaption>
    </figure>
  );
}

export function deadlines(s: Settings) {
  // Fully Funded milestones only while that pathway is promoted (24 Nov 2026 Self-Funded campaign).
  const ff = promoted(s, "fully_funded") ? [
    { to: pathwayOpensAt(s, "fully_funded"), label: "Fully Funded applications open in" },
    { to: s.dates.phase1_close, label: "Phase 1 (Fully Funded) closes in" },
    { to: s.dates.phase2_close, label: "Phase 2 closes in" },
    { to: s.dates.phase3_submit_close, label: "Phase 3 video submissions close in" },
    { to: s.dates.results, label: "Results are announced in" },
  ] : [];
  return [...ff, { to: s.dates.programme_start, label: "GIF Summer 2027 starts in" }, { to: `${COMPETITION.finale.date}T09:00:00+07:00`, label: "The Grand Finale in Bangkok is in" }];
}

export function DeadlineStrip({ s }: { s: Settings }) {
  return (
    <div className="strip">
      <div className="wrap">
        <NextDeadline items={deadlines(s)} />
        <span className="small">All deadlines are 23:59 Western Indonesia Time (WIB, UTC+7).</span>
      </div>
    </div>
  );
}

// "20 November 2026" style label of a pathway's registration opening date (WIB).
export const opensLabel = (s: Settings, p: Pathway) => fmtDate(pathwayOpensAt(s, p), { day: "numeric", month: "long", year: "numeric" });

// One line for CTAs: which pathways are open right now.
export function openingLine(s: Settings = DEFAULT_SETTINGS): string {
  if (!promoted(s, "fully_funded") && !promoted(s, "mentoring")) {
    return pathwayOpen(s, "self_funded").open
      ? `Self-Funded registration is open: ${s.slots.self_funded_early} Super Early Bird places, then ${s.slots.self_funded_regular} Regular places.`
      : "Self-Funded registration is not open right now.";
  }
  if (pathwayOpen(s, "fully_funded").open) return "Registration is open for every pathway.";
  const early = (["self_funded", "mentoring"] as Pathway[]).filter((p) => pathwayOpen(s, p).open);
  if (early.length === 2) return `Self-Funded and Project Mentoring registration is open now. Fully Funded applications open on ${opensLabel(s, "fully_funded")}.`;
  return `Fully Funded applications open on ${opensLabel(s, "fully_funded")}.`;
}

export function Pathways({ s, compact = false }: { s: Settings; compact?: boolean }) {
  const ffOpen = pathwayOpen(s, "fully_funded");
  const m = mentoringPrice(s);
  return (
    <div className="grid g3">
      <article className="pathway ff">
        <span className="kicker">Pathway A · Competitive</span>
        <h3>Fully Funded application</h3>
        <div className="price">IDR {s.prices.elco_pro_idr.toLocaleString("en-US")}<span className="small muted"> · Phase 1 with {s.prices.elco_pro_months} months of Elco Pro</span></div>
        <ul>
          <li>{s.slots.fully_funded} Fully Funded places (programme fee, accommodation and in-programme transport; flights not included) and {s.slots.partial_funded} Partial Funded places</li>
          <li>Three phases: application with Elco Pro and social media tasks, essay and pitch deck, video pitch</li>
          <li>Phase 1 open until {fmtDate(s.dates.phase1_close, { day: "numeric", month: "long", year: "numeric" })}</li>
          {!compact && <li>Elco Pro is yours to keep, selected or not</li>}
        </ul>
        <div className="btn-row">
          {ffOpen.open
            ? <Link className="btn btn-primary" href="/apply?pathway=fully_funded" data-track="pathway_select" data-pathway="fully_funded">Apply</Link>
            : <Link className="btn btn-secondary" href="/fully-funded" data-track="pathway_view" data-pathway="fully_funded">Opens {opensLabel(s, "fully_funded")}</Link>}
          <Link className="btn btn-quiet arrow" href="/fully-funded" data-track="pathway_view" data-pathway="fully_funded">Details </Link>
        </div>
      </article>
      <article className="pathway mt">
        <span className="kicker">Pathway B · Guided</span>
        <h3>Project Mentoring Program</h3>
        <div className="price"><Price idr={m.price.IDR} usd={m.price.USD} /><span className="small muted"> · {m.tier === "early" ? "Early Bird" : "Regular"}</span></div>
        <ul>
          <li>15 weekly sessions, Tuesdays, 2 Feb – 11 May 2027</li>
          <li>Go straight to Phase 3 of the selection</li>
          <li>Cashback if you are selected (conditional)</li>
          {!compact && <li>Regular price <Price idr={s.prices.mentoring_regular.IDR} usd={s.prices.mentoring_regular.USD} /></li>}
        </ul>
        <div className="btn-row">
          <Link className="btn btn-primary" href="/apply?pathway=mentoring" data-track="pathway_select" data-pathway="mentoring">Join mentoring</Link>
          <Link className="btn btn-quiet arrow" href="/mentoring" data-track="pathway_view" data-pathway="mentoring">Details </Link>
        </div>
      </article>
      <article className="pathway">
        <span className="kicker">Pathway C · Direct</span>
        <h3>Self-Funded</h3>
        <div className="price"><Price idr={s.prices.self_funded_total.IDR} usd={s.prices.self_funded_total.USD} /></div>
        <ul>
          <li>Direct registration: no essay, deck or video</li>
          <li>Deposit from <Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} />, the rest in installments</li>
          <li>Seat confirmed when your first payment is verified</li>
        </ul>
        <div className="btn-row">
          <Link className="btn btn-primary" href="/apply?pathway=self_funded" data-track="pathway_select" data-pathway="self_funded">Register</Link>
          <Link className="btn btn-quiet arrow" href="/self-funded" data-track="pathway_view" data-pathway="self_funded">Details </Link>
        </div>
      </article>
    </div>
  );
}

export function Universities({ s }: { s: Settings }) {
  return (
    <>
      <div className="campuses">
        {s.universities.map((u) => {
          const photo = CAMPUS_PHOTOS[u.name];
          return (
            <article className="campus" key={u.name}>
              {photo && (
                <div className="ph">
                  <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 720px) 33vw, 100vw" />
                  <span className="photo-credit">{photo.credit.author} · {photo.credit.license}</span>
                </div>
              )}
              <div className="body">
                <span className="country">{u.country}</span>
                <h3>{u.name}</h3>
                <p style={{ margin: "4px 0 0" }}><span className={`badge ${u.status === "confirmed" ? "ok" : "planned"}`}>{u.status === "confirmed" ? "Confirmed" : "Planned engagement · subject to confirmation"}</span></p>
              </div>
            </article>
          );
        })}
      </div>
      <p className="tiny muted" style={{ marginTop: 16, maxWidth: "80ch" }}>
        Not organisers, partners or endorsers of GIF unless marked &ldquo;Confirmed&rdquo;. Independent reference photos, no official marks
        (<Link href="/photo-credits">credits</Link>).
      </p>
    </>
  );
}

export function MentorPlaceholders({ mentors }: { mentors: Mentor[] }) {
  if (mentors.length) {
    return (
      <div className="grid g3">
        {mentors.map((m) => (
          <div className="item" key={m.name}>
            {m.photo && <Image src={m.photo} alt={m.name} width={320} height={320} style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "50%", marginBottom: 14 }} />}
            <h4>{m.name}</h4>
            <p className="small muted">{m.role}, {m.org}</p>
            {m.bio && <p className="small">{m.bio}</p>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="grid g4" style={{ gridTemplateColumns: undefined }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div className="placeholder" key={i}>
            <span className="ph-mark" aria-hidden="true" />
            <strong>Mentor profile coming soon</strong>
            <span className="small">Student startup founder · NUS, UTM or Chulalongkorn</span>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 18 }}>Five mentors, all student startup founders, from NUS, UTM and Chulalongkorn. Names and profiles are published once each mentor confirms.</p>
    </>
  );
}

export function Testimonials({ items }: { items: Testimonial[] }) {
  const ok = items.filter((t) => t.consent && t.status !== "pending" && t.quote.trim().length > 0);
  if (!ok.length) {
    return <div className="notice"><p>Delegate stories from GIF 2026 will appear here once delegates have shared them with us and agreed to publication.</p></div>;
  }
  return (
    <div className="grid g3">
      {ok.map((t) => (
        <blockquote className="item" key={t.name} style={{ margin: 0 }}>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "var(--deep)" }}>&ldquo;{t.quote}&rdquo;</p>
          <footer className="small muted">{t.name}, {t.role}</footer>
        </blockquote>
      ))}
    </div>
  );
}

export function FaqList({ items }: { items: Faq[] }) {
  return <div>{items.map((f) => <details className="faq" key={f.q}><summary>{f.q}</summary><div className="answer"><p>{f.a}</p></div></details>)}</div>;
}

export function PhotoBand() {
  return (
    <div className="photo-band">
      <Figure p={PHOTOS.museumGroup} className="photo wide" sizes="(min-width: 900px) 50vw, 100vw" />
      <Figure p={PHOTOS.classroom} sizes="(min-width: 900px) 25vw, 50vw" />
      <Figure p={PHOTOS.awarding} sizes="(min-width: 900px) 25vw, 50vw" />
      <Figure p={PHOTOS.nusSelfie} sizes="(min-width: 900px) 25vw, 50vw" />
      <Figure p={PHOTOS.mrt} sizes="(min-width: 900px) 25vw, 50vw" />
      <Figure p={PHOTOS.marina} sizes="(min-width: 900px) 25vw, 50vw" />
      <Figure p={PHOTOS.museumSelfie} sizes="(min-width: 900px) 25vw, 50vw" />
    </div>
  );
}

export function FinalCta({ title = "Your project deserves a bigger room.", body = `${openingLine()} Register from your IELSco Dashboard; you can save a draft and finish later.` }: { title?: string; body?: string }) {
  return (
    <section className="section dark cta-night">
      <div className="bg" aria-hidden="true"><Image src={PLACES.cbdDusk.src} alt="" fill sizes="100vw" quality={65} /></div>
      <div className="wrap">
        <div className="head side" style={{ marginBottom: 0 }}>
          <h2>{title}</h2>
          <div>
            <p className="lead">{body}</p>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <a className="btn btn-light" href={applyHref("self_funded")} data-track="apply_click" data-pathway="self_funded">Apply Now</a>
              <Link className="btn btn-secondary" href="/self-funded" data-track="explore_click">Self-Funded details</Link>
            </div>
          </div>
        </div>
      </div>
      <p className="photo-credit">Photo: Singapore at dusk · {PLACES.cbdDusk.credit.author}, {PLACES.cbdDusk.credit.license}</p>
    </section>
  );
}

// ── Self-Funded campaign (24 Nov 2026) ─────────────────────────────────────────────────────────────────────────────

const moneyPair = (m: { IDR: number; USD: number }) => <Price idr={m.IDR} usd={m.USD} />;

// The two Self-Funded allocations with live availability. Places are never shown as taken unless counted.
export async function Allocations({ s, tone = "light" }: { s: Settings; tone?: "light" | "dark" }) {
  const a = await selfFundedAvailability();
  const earlyGone = a ? a.earlyLeft === 0 : false;
  return (
    <div className={`allocations ${tone}`} data-testid="allocations">
      <article className={`alloc alloc-early${earlyGone ? " is-full" : ""}`}>
        <div className="alloc-top"><span className="alloc-tag">Super Early Bird</span>
          <span className="alloc-left" data-testid="early-left">{a ? (earlyGone ? "Allocation full" : `${a.earlyLeft} of ${a.earlyTotal} places left`) : `${s.slots.self_funded_early} places`}</span></div>
        <p className="alloc-price">{moneyPair(s.prices.self_funded_early_total)}</p>
        <p className="alloc-note">For the first {s.slots.self_funded_early} delegates whose deposit is verified. Your fee is reduced automatically when your place is confirmed.</p>
        {a && <div className="alloc-bar" aria-hidden="true"><span style={{ width: `${Math.round(((a.earlyTotal - a.earlyLeft) / Math.max(1, a.earlyTotal)) * 100)}%` }} /></div>}
      </article>
      <article className="alloc alloc-regular">
        <div className="alloc-top"><span className="alloc-tag">Regular Self-Funded</span>
          <span className="alloc-left" data-testid="regular-left">{a ? `${a.regularLeft} of ${a.regularTotal} places left` : `${s.slots.self_funded_regular} places`}</span></div>
        <p className="alloc-price">{moneyPair(s.prices.self_funded_total)}</p>
        <p className="alloc-note">The next {s.slots.self_funded_regular} places, once the Super Early Bird places are taken.</p>
      </article>
    </div>
  );
}

export function PrizePool({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`prize${dark ? " on-dark" : ""}`} data-testid="prize-pool">
      <div className="prize-head">
        <span className="prize-kicker">Total prize pool</span>
        <p className="prize-amount">USD {COMPETITION.prizePoolUsd.toLocaleString("en-US")}</p>
        <p className="prize-sub">{COMPETITION.finalists} finalists · {COMPETITION.awards.length} award levels · 1 Grand Finale</p>
      </div>
      <ol className="prize-levels">
        {COMPETITION.awards.map((w) => (
          <li key={w.level}><strong>{w.level}</strong><span>{w.recipients} {w.recipients === 1 ? "recipient" : "recipients"}</span></li>
        ))}
      </ol>
      <p className="prize-fine">Shared by ten recipients from the Top {COMPETITION.finalists}; levels do not receive equal amounts, and each level&rsquo;s amount is announced before the programme. Taking part does not guarantee a place in the Top {COMPETITION.finalists} or any prize.</p>
    </div>
  );
}

export function CompetitionJourney() {
  return (
    <ol className="journey" data-testid="journey">
      {COMPETITION.stages.map((st) => (
        <li key={st.n} className={st.n === 3 ? "finale" : undefined}>
          <div className="journey-meta"><span className="journey-stage">Stage {st.n} · {st.country}</span><span className="journey-weight">{st.weight}%</span></div>
          <h3>{st.title}</h3>
          <p>{st.body}</p>
          {st.n === 2 && <p className="journey-cut">Top {COMPETITION.finalists} selected for Thailand</p>}
        </li>
      ))}
    </ol>
  );
}

export function GrandFinale() {
  return (
    <div className="grid g2 finale-parts">
      <div className="item"><span className="kicker">A · Final stage pitching</span><h3>On the main stage</h3>
        <p className="muted">The Top {COMPETITION.finalists} present their projects live to public audiences, international delegates, invited guests, judges and people from the startup and social-impact ecosystem.</p></div>
      <div className="item"><span className="kicker">B · Innovation Booth Expo</span><h3>At their own booth</h3>
        <p className="muted">Each finalist project has a booth where visitors explore the project, meet the team, try prototypes or demonstrations, ask questions, give feedback and take part in Public Choice voting.</p></div>
    </div>
  );
}
