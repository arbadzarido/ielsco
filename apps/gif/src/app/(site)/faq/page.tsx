import type { Metadata } from "next";
import { getContent } from "@/lib/cms";
import { FaqList, FinalCta, PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "FAQ", description: "Answers about GIF Summer 2027: pathways, payments, selection, mentoring and travel." };
export const revalidate = 300;

export default async function FaqPage() {
  const faq = await getContent("faq");
  const groups = [...new Set(faq.map((f) => f.group))];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <PageHero eyebrow="FAQ" title="Frequently asked questions." lead="Can't find your answer? Email hello@ielsco.com or message us on WhatsApp at +62 882-9725-3491." />
      <section className="section">
        <div className="wrap narrow" style={{ maxWidth: 880 }}>
          {groups.map((g) => (
            <div key={g} style={{ marginBottom: 48 }}>
              <h2 style={{ fontSize: 30, marginBottom: 12 }}>{g}</h2>
              <FaqList items={faq.filter((f) => f.group === g)} />
            </div>
          ))}
        </div>
      </section>
      <FinalCta />
    </>
  );
}
