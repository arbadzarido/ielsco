import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, LEGAL_SOURCES } from "@/lib/legal-docs";
import { DOCS, LEGAL_VERSION } from "@/lib/legal";

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const d = LEGAL_DOCS[(await params).doc];
  return d ? { title: d.title, description: d.intro.slice(0, 155) } : {};
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const d = LEGAL_DOCS[(await params).doc];
  if (!d) notFound();
  return (
    <section className="section">
      <div className="wrap grid split" style={{ alignItems: "start" }}>
        <aside className="no-print">
          <div className="eyebrow">Legal</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {DOCS.map((x) => <li key={x.slug}><Link href={`/${x.slug}`} aria-current={x.slug === d.slug ? "page" : undefined} style={{ fontWeight: x.slug === d.slug ? 600 : 400 }}>{x.title}</Link></li>)}
          </ul>
        </aside>
        <article className="legal-doc">
          <h1 style={{ fontSize: "clamp(34px, 4.4vw, 52px)" }}>{d.title}</h1>
          <div className="notice warn" style={{ marginTop: 20 }}><p><strong>Draft for legal review.</strong> Version {LEGAL_VERSION}. This document is being reviewed by Indonesian counsel. It is not legal advice and does not claim compliance with any regulation. Items in [brackets] are pending final decisions.</p></div>
          <p className="lead">{d.intro}</p>
          {d.blocks.map((b, i) => (
            <section key={i}>
              {b.h && <h2>{b.h}</h2>}
              {b.p?.map((p, j) => <p key={j}>{p}</p>)}
              {b.ul && <ul>{b.ul.map((x, j) => <li key={j}>{x}</li>)}</ul>}
            </section>
          ))}
          <h2>Sources consulted</h2>
          <ul className="small">{LEGAL_SOURCES.map((s) => <li key={s.href}><a href={s.href} rel="noopener noreferrer" target="_blank">{s.label}</a></li>)}</ul>
          <p className="small muted">Questions: <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>.</p>
        </article>
      </div>
    </section>
  );
}
