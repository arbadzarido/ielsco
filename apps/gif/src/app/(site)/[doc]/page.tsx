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
  return d ? { title: `${d.id.title} / ${d.en.title}`, description: d.id.intro.slice(0, 155), alternates: { languages: { id: `/${d.slug}`, en: `/${d.slug}#english` } } } : {};
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
          <div className="eyebrow">Dokumen hukum · Legal</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {DOCS.map((x) => <li key={x.slug}><Link href={`/${x.slug}`} aria-current={x.slug === d.slug ? "page" : undefined} style={{ fontWeight: x.slug === d.slug ? 600 : 400 }}>{x.title_id}<span className="tiny muted" style={{ display: "block" }}>{x.title}</span></Link></li>)}
          </ul>
        </aside>
        <article className="legal-doc">
          <div lang="id">
            <h1 style={{ fontSize: "clamp(34px, 4.4vw, 52px)" }}>{d.id.title}</h1>
            <div className="notice warn" style={{ marginTop: 20 }}><p><strong>Draf untuk ditinjau penasihat hukum.</strong> Versi {LEGAL_VERSION}. Dokumen ini sedang ditinjau oleh penasihat hukum Indonesia, bukan nasihat hukum, dan tidak menyatakan kepatuhan terhadap peraturan apa pun. Bagian dalam [kurung siku] menunggu keputusan akhir. Versi Bahasa Indonesia adalah versi utama; terjemahan bahasa Inggris tersedia di bawah.</p>
              <p className="small"><a href="#english">English translation ↓</a></p></div>
            <Body v={d.id} />
          </div>
          <hr className="rule" style={{ margin: "56px 0 24px" }} />
          <div lang="en" id="english">
            <div className="eyebrow">English translation</div>
            <h2 style={{ fontSize: "clamp(28px, 3.4vw, 40px)", marginTop: 0 }}>{d.en.title}</h2>
            <p className="small muted">Draft for legal review. Version {LEGAL_VERSION}. The Bahasa Indonesia version above prevails.</p>
            <Body v={d.en} />
          </div>
          <h2>Sumber · Sources consulted</h2>
          <ul className="small">{LEGAL_SOURCES.map((s) => <li key={s.href}><a href={s.href} rel="noopener noreferrer" target="_blank">{s.label}</a></li>)}</ul>
          <p className="small muted">Pertanyaan / Questions: <a href="mailto:hello@ielsco.com">hello@ielsco.com</a>.</p>
        </article>
      </div>
    </section>
  );
}
