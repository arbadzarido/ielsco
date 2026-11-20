import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NextDeadline, Price } from "@/components/Client";
import { PHOTOS, type Photo, type Mentor, type Testimonial, type Faq } from "@/lib/content";
import type { Settings } from "@/lib/settings";
import { balanceOf, mentoringPrice } from "@/lib/settings";
import { fmtDate } from "@/lib/format";

export function Eyebrow({ n, children }: { n?: string; children: ReactNode }) {
  return <div className="eyebrow">{n && <span className="num">{n}</span>}<span>{children}</span></div>;
}

export function PageHero({ eyebrow, title, lead, children, dark = true }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode; dark?: boolean }) {
  return (
    <section className={`section ${dark ? "dark" : ""}`} style={{ paddingBottom: "clamp(40px, 6vw, 72px)" }}>
      <div className="wrap">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 style={{ maxWidth: "16ch", color: dark ? "#fff" : undefined }}>{title}</h1>
        {lead && <p className="lead" style={{ marginTop: 24 }}>{lead}</p>}
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
  return [
    { to: s.dates.launch, label: "Applications open in" },
    { to: s.dates.phase1_close, label: "Phase 1 (Fully Funded) closes in" },
    { to: s.dates.phase2_close, label: "Phase 2 closes in" },
    { to: s.dates.phase3_submit_close, label: "Phase 3 video submissions close in" },
    { to: s.dates.results, label: "Results are announced in" },
    { to: s.dates.programme_start, label: "GIF Summer 2027 starts in" },
  ];
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

export function Pathways({ s, compact = false }: { s: Settings; compact?: boolean }) {
  const m = mentoringPrice(s);
  const bal = balanceOf(s);
  return (
    <div className="grid g3">
      <article className="pathway ff">
        <span className="kicker">Pathway A · Competitive</span>
        <h3>Fully Funded application</h3>
        <div className="price">IDR {s.prices.elco_pro_idr.toLocaleString("en-US")}<span className="small muted serif"> · Phase 1 with {s.prices.elco_pro_months} months of Elco Pro</span></div>
        <ul>
          <li>{s.slots.fully_funded} Fully Funded places (programme fee, accommodation and in-programme transport; flights not included) and {s.slots.partial_funded} Partial Funded places</li>
          <li>Three phases: application with Elco Pro and social media tasks, essay and pitch deck, video pitch</li>
          <li>Phase 1 open until {fmtDate(s.dates.phase1_close, { day: "numeric", month: "long", year: "numeric" })}</li>
          {!compact && <li>Elco Pro is yours to keep, selected or not</li>}
        </ul>
        <div className="btn-row">
          <Link className="btn btn-primary" href="/apply?pathway=fully_funded" data-track="pathway_select" data-pathway="fully_funded">Apply</Link>
          <Link className="btn btn-quiet arrow" href="/fully-funded" data-track="pathway_view" data-pathway="fully_funded">Details </Link>
        </div>
      </article>
      <article className="pathway mt">
        <span className="kicker">Pathway B · Guided</span>
        <h3>Project Mentoring Program</h3>
        <div className="price"><Price idr={m.price.IDR} usd={m.price.USD} /><span className="small muted serif"> · {m.tier === "early" ? "Early Bird" : "Regular"}</span></div>
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
          <li>Deposit <Price idr={s.prices.self_funded_deposit.IDR} usd={s.prices.self_funded_deposit.USD} />, balance <Price idr={bal.IDR} usd={bal.USD} /></li>
          <li>Seat confirmed when your deposit is verified</li>
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
      <div className="grid g3">
        {s.universities.map((u) => (
          <div className="item" key={u.name}>
            <span className="kicker">{u.country}</span>
            <h3>{u.name}</h3>
            <p style={{ marginTop: 10 }}><span className={`badge ${u.status === "confirmed" ? "ok" : "planned"}`}>{u.status === "confirmed" ? "Confirmed" : "Planned engagement"}</span></p>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 24, maxWidth: "70ch" }}>
        University engagement is planned and is marked &ldquo;Confirmed&rdquo; here only once agreed in writing. These institutions are not
        organisers, partners or endorsers of GIF unless stated as confirmed.
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
            <strong className="serif" style={{ fontSize: 19, fontWeight: 500, color: "var(--ink)" }}>Mentor profile coming soon</strong>
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
          <p className="serif" style={{ fontSize: 22, lineHeight: 1.35 }}>&ldquo;{t.quote}&rdquo;</p>
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

export function FinalCta({ title = "Your project deserves a bigger room.", body = "Applications for GIF Summer 2027 open on 25 November 2026. Choose the pathway that fits you and start today; you can save a draft and finish later." }: { title?: string; body?: string }) {
  return (
    <section className="section dark">
      <div className="wrap">
        <div className="head side">
          <h2>{title}</h2>
          <div>
            <p className="lead">{body}</p>
            <div className="btn-row" style={{ marginTop: 24 }}>
              <Link className="btn btn-light" href="/apply" data-track="apply_click">Apply Now</Link>
              <Link className="btn btn-secondary" href="/opportunities" data-track="explore_click">Explore Opportunities</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
