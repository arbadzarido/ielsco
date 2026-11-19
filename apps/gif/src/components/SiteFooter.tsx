import Link from "next/link";
import Image from "next/image";
import { DOCS } from "@/lib/legal";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="grid g4">
          <div>
            <Image src="/brand/iels-white.png" alt="IELSco" width={120} height={31} />
            <p style={{ marginTop: 16 }}>The Global Impact Fellowship is a programme of IELSco (PT English Space Berkah Indonesia).</p>
            <p>Villa Regency 2 Blok AB 4 No. 8, Pasar Kemis, Tangerang 15560, Indonesia</p>
          </div>
          <div>
            <h4>Programme</h4>
            <ul>
              <li><Link href="/about">About GIF</Link></li>
              <li><Link href="/program">Program</Link></li>
              <li><Link href="/opportunities">Opportunities</Link></li>
              <li><Link href="/selection-process">Selection Process</Link></li>
              <li><Link href="/mentoring">Mentorship</Link></li>
              <li><Link href="/previous-gif">Previous GIF</Link></li>
            </ul>
          </div>
          <div>
            <h4>Applicants</h4>
            <ul>
              <li><Link href="/apply">Apply</Link></li>
              <li><Link href="/application-status">Application status</Link></li>
              <li><Link href="/sponsorship">Sponsorship support</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><a href="mailto:hello@ielsco.com">hello@ielsco.com</a></li>
              <li><a href="https://wa.me/6288297253491" rel="noopener noreferrer" target="_blank">WhatsApp +62 882-9725-3491</a></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              {DOCS.map((d) => <li key={d.slug}><Link href={`/${d.slug}`}>{d.title}</Link></li>)}
            </ul>
          </div>
        </div>
        <div className="legal">
          © {new Date().getFullYear()} PT English Space Berkah Indonesia · NIB 0905260045155 · <a href="https://www.ielsco.com">ielsco.com</a>.
          University names are used to describe planned engagement only and do not imply endorsement.
        </div>
      </div>
    </footer>
  );
}
