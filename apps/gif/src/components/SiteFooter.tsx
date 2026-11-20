import Link from "next/link";
import Image from "next/image";
import { DOCS } from "@/lib/legal";

// Mirrors the IELSco site footer (white, hairline, logo column + link columns, legal bar), with the GIF logo beside IELSco.
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="logos">
              <Image src="/brand/gif-logo.png" alt="Global Impact Fellowship" width={238} height={87} style={{ height: 44, width: "auto" }} />
              <span className="sep" aria-hidden="true" />
              <a href="https://www.ielsco.com" aria-label="IELSco"><Image src="/brand/iels-navy.png" alt="IELSco" width={100} height={26} style={{ height: 26, width: "auto" }} /></a>
            </div>
            <p style={{ marginTop: 18, maxWidth: 420 }}>The Global Impact Fellowship is an international youth programme by IELSco, Indonesia&apos;s English learning community.</p>
            <p className="tiny" style={{ maxWidth: 420 }}>PT English Space Berkah Indonesia · Villa Regency 2 Blok AB 4 No. 8, Pasar Kemis, Tangerang 15560, Indonesia</p>
          </div>
          <div className="links">
            <div>
              <p className="col-title">Programme</p>
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
              <p className="col-title">Applicants</p>
              <ul>
                <li><Link href="/apply">Apply</Link></li>
                <li><Link href="/application-status">Application status</Link></li>
                <li><Link href="/sponsorship">Sponsorship support</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <p className="col-title">Contact</p>
              <ul>
                <li><a href="mailto:hello@ielsco.com">hello@ielsco.com</a></li>
                <li><a href="https://wa.me/6288297253491" rel="noopener noreferrer" target="_blank">WhatsApp</a></li>
                <li><a href="https://www.ielsco.com">ielsco.com</a></li>
              </ul>
            </div>
            <div>
              <p className="col-title">Legal</p>
              <ul>
                {DOCS.map((d) => <li key={d.slug}><Link href={`/${d.slug}`}>{d.title}</Link></li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="bottom">
        <div className="wrap">
          <span>© {new Date().getFullYear()} PT English Space Berkah Indonesia · NIB 0905260045155</span>
          <span>University names describe planned engagement only and do not imply endorsement. <Link href="/photo-credits">Photo credits</Link></span>
        </div>
      </div>
    </footer>
  );
}
