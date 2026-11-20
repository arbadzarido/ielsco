import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { legalDocs, LEGAL_SLUGS, LEGAL_SOURCES, type Version } from "@/lib/legal-docs";
import { DOCS, LEGAL_VERSION } from "@/lib/legal";
import { currentSettingsSafe } from "@/lib/cohort";

export const dynamicParams = false;
export const revalidate = 300;
export function generateStaticParams() {
  return LEGAL_SLUGS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const d = legalDocs(await currentSettingsSafe())[(await params).doc];
  return d ? { title: d.en.title, description: d.en.intro.slice(0, 155) } : {};
}

function Body({ v }: { v: Version }) {
  return (
    <>
      <p className="lead">{v.intro}</p>
      {v.blocks.map((b, i) => (
        <section key={i}>
          {b.h && <h2>{b.h}</h2>}
          {b.p?.map((p, j) => <p key={j}>{p}</p>)}
          {b.ul && <ul>{b.ul.map((x, j) => <li key={j}>{x}</li>)}</ul>}
        </section>
      ))}
    </>
  );
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const d = legalDocs(await currentSettingsSafe())[(await params).doc];
  if (!d) notFound();
  return (
    <section className="section">
      <div className="wrap grid split" style={{ alignItems: "start" }}>
        <aside className="no-print">
          <div className="eyebrow">Legal</div>
          <ul className="legal-nav">
            {DOCS.map((x) => <li key={x.slug}><Link href={`/${x.slug}`} aria-current={x.slug === d.slug ? "page" : undefined}>{x.title}</Link></li>)}
          </ul>
        </aside>
        <article className="legal-doc">
          {/* English reading version first; the Bahasa Indonesia text below is the official, prevailing version (founder decision). */}
          <div lang="en" id="english">
            <h1 style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }}>{d.en.title}</h1>
            <div className="notice warn" style={{ marginTop: 20 }}>
              <p><strong>Draft for legal review.</strong> Version {LEGAL_VERSION}. This document is being reviewed by Indonesian legal counsel. It is not legal advice and does not claim compliance with any regulation. Sections in [square brackets] await a final decision.</p>
              <p><strong>Official language.</strong> The Bahasa Indonesia version is the official version of this document and prevails if the two differ. This English translation is provided for convenience. <a href="#bahasa-indonesia">Read the Bahasa Indonesia version ↓</a></p>
            </div>
            <Body v={d.en} />
          </div>
          <hr className="rule" style={{ margin: "56px 0 24px" }} />
          <div lang="id" id="bahasa-indonesia">
            <div className="eyebrow">Official version · Bahasa Indonesia</div>
            <h2 style={{ fontSize: "clamp(26px, 3.2vw, 36px)", marginTop: 0 }}>{d.id.title}</h2>
            <Body v={d.id} />
          </div>
          <h2>Sources consulted</h2>
          <ul className="small">{LEGAL_SOURCES.map((s) => <li key={s.href}><a href={s.href} rel="noopener noreferrer" target="_blank">{s.label}</a></li>)}</ul>
          <p className="small muted">Questions: <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>.</p>
        </article>
      </div>
    </section>
  );
}
