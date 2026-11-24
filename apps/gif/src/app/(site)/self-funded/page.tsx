import type { Metadata } from "next";
import Link from "next/link";
import { currentSettingsSafe } from "@/lib/cohort";
import { internationalCardEnabled, minInstallment } from "@/lib/pricing";
import { fmtDate } from "@/lib/format";
import { COMPETITION } from "@/lib/content";
import { applyHref } from "@/lib/availability";
import { selfFundedCap } from "@/lib/settings";
import { CurrencyToggle, Price } from "@/components/Client";
import { Allocations, Eyebrow, FinalCta, PageHero } from "@/components/Blocks";

export const metadata: Metadata = { title: "Self-Funded", description: "Register directly for GIF Summer 2027: 20 Super Early Bird places, then 50 Regular Self-Funded places, with a flexible deposit to confirm your seat." };
export const revalidate = 300;

export default async function SelfFunded() {
  const s = await currentSettingsSafe();
  const apply = applyHref("self_funded");
  return (
    <>
      <PageHero eyebrow="Self-Funded · GIF Summer 2027" title="Secure your place on the route to Bangkok."
        lead={`No essay, no pitch deck, no video. Register from your IELSco Dashboard, pay a deposit you choose, and your seat is confirmed once it is verified. The first ${s.slots.self_funded_early} confirmed delegates secure the Super Early Bird fee.`}>
        <div className="btn-row"><a className="btn btn-sky" href={apply} data-track="pathway_select" data-pathway="self_funded">Register now</a></div>
      </PageHero>
      <section className="section">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>Allocations</Eyebrow><h2>Two allocations, one programme.</h2></div>
            <div><p className="lead">Super Early Bird and Regular delegates take part in exactly the same eight days, competition and Grand Finale. Only the fee differs.</p><CurrencyToggle /></div></div>
          <Allocations s={s} />
        </div>
      </section>
      <section className="section alt">
        <div className="wrap">
          <div className="head side"><div><Eyebrow>How you pay</Eyebrow><h2>A deposit you choose, the rest in installments.</h2></div></div>
          <div className="grid g3">
            <div className="item"><span className="kicker">1 · Deposit, from</span><p className="big-number"><Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} /></p>
              <p className="small muted">You choose the amount, up to the full fee. {s.dates.deposit_due_days ? `Due within ${s.dates.deposit_due_days} days of registering; ` : ""}your seat is confirmed once it is verified.</p></div>
            <div className="item"><span className="kicker">2 · Balance, in installments</span><p className="big-number" style={{ fontSize: 22 }}>Each payment from <Price idr={s.payments.min_installment_idr} usd={minInstallment(s, "USD")} /></p>
              <p className="small muted">{s.dates.balance_due ? `Due by ${fmtDate(s.dates.balance_due, { day: "numeric", month: "long", year: "numeric" })}. A last, smaller payment can clear the remainder.` : "Due during participant preparation; the exact date is shown in your portal."}</p></div>
            <div className="item"><span className="kicker">3 · Super Early Bird</span><p className="big-number" style={{ fontSize: 22 }}>Applied automatically</p>
              <p className="small muted">Everyone registers at the Regular fee. If your deposit is verified as one of the first {s.slots.self_funded_early}, your fee is reduced to <Price idr={s.prices.self_funded_early_total.IDR} usd={s.prices.self_funded_early_total.USD} /> and your portal shows the new balance.</p></div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap grid g2">
          <div className="item"><Eyebrow>Currencies</Eyebrow>{internationalCardEnabled(s) ? <h3>IDR online; USD by invoice or card.</h3> : <h3>IDR online, USD by invoice.</h3>}
            <p className="muted" style={{ marginTop: 12 }}>{internationalCardEnabled(s)
              ? `Indonesian participants pay the IDR price online through Midtrans. International delegates keep their USD price and choose: request an invoice and pay by bank transfer, or pay by Visa or Mastercard through Midtrans, which charges in IDR at a fixed rate of USD 1 = IDR ${s.payments.usd_idr_card_rate.toLocaleString("en-US")}.`
              : "Indonesian participants pay the IDR price online through Midtrans. International delegates pay in USD by invoice and bank transfer, verified by IELSco finance."}</p></div>
          <div className="item"><Eyebrow>Seats</Eyebrow><h3>{selfFundedCap(s)} Self-Funded places.</h3>
            <p className="muted" style={{ marginTop: 12 }}>{s.slots.self_funded_early} Super Early Bird and {s.slots.self_funded_regular} Regular places, confirmed in the order deposits are verified. Registration closes when they are taken; you will see this before paying.</p></div>
          <div className="item"><Eyebrow>What you take part in</Eyebrow><h3>The full programme and competition.</h3>
            <p className="muted" style={{ marginTop: 12 }}>Eight days from Singapore through Malaysia to Thailand, all three competition stages, and the {COMPETITION.finale.name} in Bangkok, where the Top {COMPETITION.finalists} pitch and exhibit. <Link href="/competition">How the competition works</Link>.</p></div>
          <div className="item"><Eyebrow>Teams and refunds</Eyebrow><h3>Register with up to two friends.</h3><p className="muted" style={{ marginTop: 12 }}>Each team member is a delegate with their own profile and payments. Refunds depend on when and why you withdraw: read the <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link> before paying.</p></div>
        </div>
      </section>
      <FinalCta title="Ready when you are." body="Registration takes about ten minutes on your IELSco Dashboard. You can save it and come back." />
    </>
  );
}
