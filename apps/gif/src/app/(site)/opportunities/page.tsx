import type { Metadata } from "next";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { balanceOf, mentoringPrice } from "@/lib/settings";
import { CurrencyToggle, Price } from "@/components/Client";
import { Eyebrow, FinalCta, PageHero, Pathways } from "@/components/Blocks";

export const metadata: Metadata = { title: "Opportunities", description: "Three ways to join GIF Summer 2027: Fully Funded application, Project Mentoring Program and Self-Funded." };
export const revalidate = 300;

export default async function Opportunities() {
  const s = await currentSettingsSafe();
  const m = mentoringPrice(s);
  const bal = balanceOf(s);
  const rows: [string, React.ReactNode, React.ReactNode, React.ReactNode][] = [
    ["What you pay to start", <>IDR {s.prices.elco_pro_idr.toLocaleString("en-US")} for {s.prices.elco_pro_months} months of Elco Pro</>, <><Price idr={m.price.IDR} usd={m.price.USD} /> ({m.tier === "early" ? "Early Bird" : "Regular"})</>, <>Deposit <Price idr={s.prices.self_funded_deposit.IDR} usd={s.prices.self_funded_deposit.USD} /></>],
    ["Programme fee", <>Fully Funded: programme fee, accommodation and in-programme transport covered. Partial Funded: you pay {s.prices.partial_funded_payable ? <Price idr={s.prices.partial_funded_payable.IDR} usd={s.prices.partial_funded_payable.USD} /> : "a reduced contribution"}. Flights not included.</>, "Same as Fully Funded application, depending on your result (or join Self-Funded)", <><Price idr={s.prices.self_funded_total.IDR} usd={s.prices.self_funded_total.USD} /> (balance <Price idr={bal.IDR} usd={bal.USD} />)</>],
    ["Selection", "Phases 1, 2 and 3", "Phase 3 only (same evaluation)", "None: direct registration"],
    ["Essay, deck, video", "Essay and deck (Phase 2), video (Phase 3)", "Video (Phase 3)", "Not required"],
    ["Key dates", "Phase 1 to 10 May 2027; results 1 June", "Sessions 2 Feb – 11 May 2027; Phase 3 from 25 May", "Seat confirmed when the deposit is verified"],
    ["If not selected", "You keep Elco Pro", "You keep the full mentoring; no cashback", "—"],
  ];
  return (
    <>
      <PageHero eyebrow="Opportunities" title="Three pathways to the same eight days."
        lead="Compete for one of 10 Fully Funded or 10 Partial Funded places, get mentored and fast-tracked to the final phase, or register directly as a Self-Funded delegate.">
        <div className="btn-row"><Link className="btn btn-light" href="/apply" data-track="apply_click">Apply Now</Link></div>
      </PageHero>
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="01">Pathways</Eyebrow><h2>Pick the one that fits.</h2></div><CurrencyToggle /></div>
          <Pathways s={s} />
        </div>
      </section>
      <section className="section alt">
        <div className="wrap">
          <div className="head"><Eyebrow n="02">Side by side</Eyebrow><h2>Compare the pathways.</h2></div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th scope="col"></th><th scope="col">Fully Funded application</th><th scope="col">Project Mentoring Program</th><th scope="col">Self-Funded</th></tr></thead>
              <tbody>{rows.map(([k, a, b, c]) => <tr key={k}><th scope="row" style={{ textTransform: "none", letterSpacing: 0, fontSize: 14, color: "var(--ink)" }}>{k}</th><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 16 }}>Prices apply per delegate. Indonesian participants pay the IDR price; international participants pay the USD price. Elco Pro is priced in IDR for everyone.</p>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
