import type { Metadata } from "next";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { internationalCardEnabled, minInstallment } from "@/lib/pricing";
import { fmtDate } from "@/lib/format";
import { CurrencyToggle, Price } from "@/components/Client";
import { Eyebrow, FinalCta, PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "Self-Funded", description: "Register directly for GIF Summer 2027: USD 899 for international participants, IDR 14,999,000 for Indonesian participants, with a deposit to secure your seat." };
export const revalidate = 300;

export default async function SelfFunded() {
  const s = await currentSettingsSafe();
  return (
    <>
      <PageHero eyebrow="Pathway C · Self-Funded" title="Register directly. Confirm with a deposit."
        lead="No essay, no pitch deck, no video. Register, pay the deposit, and your seat is confirmed once the deposit is verified.">
        <div className="btn-row"><Link className="btn btn-light" href="/apply?pathway=self_funded" data-track="pathway_select" data-pathway="self_funded">Register now</Link></div>
      </PageHero>
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow n="01">Price</Eyebrow><h2>One fee, paid your way.</h2></div><CurrencyToggle /></div>
          <div className="grid g3">
            <div className="item"><span className="kicker">Programme fee</span><p className="big-number"><Price idr={s.prices.self_funded_total.IDR} usd={s.prices.self_funded_total.USD} /></p><p className="small muted">Per delegate.</p></div>
            <div className="item"><span className="kicker">1 · Deposit, from</span><p className="big-number"><Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} /></p>
              <p className="small muted">You choose the amount, up to the full fee. {s.dates.deposit_due_days ? `Due within ${s.dates.deposit_due_days} days of registering; ` : ""}your seat is confirmed once it is verified.</p></div>
            <div className="item"><span className="kicker">2 · Balance, in installments</span><p className="big-number" style={{ fontSize: 22 }}>Each payment from <Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} /></p>
              <p className="small muted">{s.dates.balance_due ? `Due by ${fmtDate(s.dates.balance_due, { day: "numeric", month: "long", year: "numeric" })}.` : "Due during participant preparation; the exact date is shown in your portal."}</p></div>
          </div>
        </div>
      </section>
      <section className="section alt">
        <div className="wrap grid g2">
          <div className="item"><Eyebrow n="02">How to pay</Eyebrow>{internationalCardEnabled(s) ? <h3>IDR online; USD by invoice or card.</h3> : <h3>IDR online, USD by invoice.</h3>}
            <p className="muted" style={{ marginTop: 12 }}>{internationalCardEnabled(s)
              ? `Indonesian participants pay the IDR price online through Midtrans. International delegates keep their USD price and choose: request an invoice and pay by bank transfer, or pay by Visa or Mastercard through Midtrans, which charges in IDR at a fixed rate of USD 1 = IDR ${s.payments.usd_idr_card_rate.toLocaleString("en-US")}.`
              : "Indonesian participants pay the IDR price online through Midtrans. International delegates pay in USD by invoice and bank transfer, verified by IELSco finance."}</p></div>
          <div className="item"><Eyebrow n="03">Seats</Eyebrow><h3>Up to {s.slots.capacity} delegates in total.</h3>
            <p className="muted" style={{ marginTop: 12 }}>Seats are confirmed in the order deposits are verified. Registration closes when the programme is full; you will see this before paying.</p></div>
          <div className="item"><Eyebrow n="04">Teams</Eyebrow><h3>Register with up to two friends.</h3><p className="muted" style={{ marginTop: 12 }}>Each team member is a delegate with their own profile, deposit and balance.</p></div>
          <div className="item"><Eyebrow n="05">Refunds</Eyebrow><h3>Read before you pay.</h3><p className="muted" style={{ marginTop: 12 }}>Deposit and balance refunds depend on when and why you withdraw. See the <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p></div>
        </div>
      </section>
      <FinalCta title="Ready when you are." body="Registration takes about ten minutes. You can save it and come back." />
    </>
  );
}
