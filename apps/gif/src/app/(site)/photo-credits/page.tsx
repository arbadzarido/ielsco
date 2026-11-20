import type { Metadata } from "next";
import Image from "next/image";
import { ALL_CREDITS } from "@/lib/places";
import { PageHero } from "@/components/Blocks";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Sources and licences of the destination and campus photographs used on the GIF Summer 2027 website.",
};

export default function PhotoCredits() {
  return (
    <>
      <PageHero eyebrow="Photo credits" title="The photographs on this site." lead="Destination and campus photographs come from Wikimedia Commons under Creative Commons licences. GIF 2026 photographs are IELSco's own." />
      <section className="section">
        <div className="wrap narrow">
          <ul className="credits">
            {ALL_CREDITS.map((p) => (
              <li key={p.key}>
                <Image src={p.src} alt={p.alt} width={240} height={160} sizes="240px" />
                <div className="small">
                  <strong style={{ display: "block", color: "var(--deep)" }}>{p.credit.title}</strong>
                  Photo by {p.credit.author}, <a href={p.credit.licenseUrl} rel="license noopener noreferrer" target="_blank">{p.credit.license}</a>, via{" "}
                  <a href={p.credit.source} rel="noopener noreferrer" target="_blank">Wikimedia Commons</a>. {p.credit.changes}
                </div>
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 24 }}>
            Adapted versions of CC BY-SA photographs are shared under the same licence. Campus photographs are independent photographs used for
            reference only: they do not indicate a partnership, sponsorship or endorsement, and campus visits are planned until confirmed in
            writing. No university logo or official mark is used on this website. Photographs of GIF 2026 delegates were taken by IELSco during
            the programme in Singapore (17–20 November 2026).
          </p>
        </div>
      </section>
    </>
  );
}
