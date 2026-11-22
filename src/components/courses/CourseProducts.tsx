import { ArrowUpRight, Check } from "lucide-react";
import { body, btnAccent, btnPrimary, btnSecondary, card, container, eyebrow, h1, h2, h3, lead, section } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { COMPARISON_ROWS, IELSCOURSE_TAGLINE, PATHS, PRODUCT_CARDS, helpMeChooseUrl, joinUrl, waitlistUrl } from "./products";

const JOIN_STEPS = [
  ["Message us", "Tap Join. The message is prefilled; add your level and goal."],
  ["Confirm your class", "The team confirms an open cohort and its schedule with you. If none is open, you join the waiting list for the next one."],
  ["Pay by bank transfer", "You receive an invoice for the month and pay in full before your membership starts."],
  ["Start learning", "Once your payment is verified, your membership is activated, you are assigned to your class and you get your schedule and Elco AI access."],
];

// IELScourse landing sections 1-6: hero, three product cards, comparison, which-fits-you, Collective and Studio details.
export function CourseProducts() {
  return (
    <>
      <section className="bg-white pb-[48px] pt-[40px] md:pb-[72px] md:pt-[64px]" aria-labelledby="hero">
        <div className={container}>
          <p className={eyebrow}>IELScourse</p>
          <h1 id="hero" className={cn(h1, "mt-4 max-w-[900px]")}>Find Your Way to Better English.</h1>
          <p className={cn(lead, "mt-6 max-w-[680px]")}>
            Choose the learning experience that fits your goals: learn with a community, grow in a small group, or work one-on-one with a mentor.
          </p>
          <p className="mt-3 text-[15px] font-semibold text-[#577E90]">{IELSCOURSE_TAGLINE}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#courses" className={btnPrimary} data-testid="hero-primary-cta">Explore Our Courses</a>
            <a href="#path" className={btnSecondary}>Find Your Learning Path</a>
          </div>
        </div>
      </section>

      <section id="courses" className="scroll-mt-20 border-t border-[#E6E9EE] bg-white pb-[64px] pt-[48px] md:pb-[88px]" aria-labelledby="courses-h">
        <div className={container}>
          <h2 id="courses-h" className="sr-only">Three ways to learn</h2>
          <ul className="grid gap-6 lg:grid-cols-3" data-testid="product-cards">
            {PRODUCT_CARDS.map((p) => (
              <li key={p.id} data-testid={`product-${p.id}`} className={cn(card, "flex flex-col p-7", p.id === "one" && "border-[#2F4157]")}>
                <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#E56668]">{p.name}</p>
                <h3 className={cn(h3, "mt-1 text-[22px]")}>{p.kind}</h3>
                <p className="mt-5 text-[34px] font-extrabold leading-none tracking-[-0.02em]">{p.price}</p>
                <p className="mt-1 text-[14px] text-[#2F4157]/70">{p.per}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.points.map((t) => <li key={t} className="flex gap-2.5 text-[15px] leading-snug text-[#2F4157]"><Check size={17} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{t}</li>)}
                </ul>
                <a href={p.anchor} className={cn(p.id === "one" ? btnPrimary : btnSecondary, "mt-6")}>{p.cta}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="compare" className="scroll-mt-20 border-t border-[#E6E9EE] bg-[#F8FAFC] py-[64px] md:py-[96px]" aria-labelledby="compare-h">
        <div className={container}>
          <p className={eyebrow}>Compare</p>
          <h2 id="compare-h" className={cn(h2, "mt-3")}>How the three differ</h2>
          <div className="mt-10 hidden overflow-hidden rounded-[20px] border border-[#E6E9EE] bg-white md:block">
            <table className="w-full border-collapse text-left text-[15px]" data-testid="compare-table">
              <caption className="sr-only">Comparison of IELScourse Collective, Studio and One</caption>
              <thead><tr className="border-b border-[#E6E9EE] bg-[#F8FAFC]"><th scope="col" className="px-5 py-4 font-semibold">Feature</th><th scope="col" className="px-5 py-4 font-semibold">Collective</th><th scope="col" className="px-5 py-4 font-semibold">Studio</th><th scope="col" className="px-5 py-4 font-semibold">One</th></tr></thead>
              <tbody>{COMPARISON_ROWS.map((r) => (
                <tr key={r.feature} className="border-b border-[#E6E9EE] last:border-0"><th scope="row" className="px-5 py-4 font-medium text-[#2F4157]">{r.feature}</th><td className="px-5 py-4">{r.collective}</td><td className="px-5 py-4">{r.studio}</td><td className="px-5 py-4">{r.one}</td></tr>))}</tbody>
            </table>
          </div>
          <ul className="mt-8 space-y-4 md:hidden" data-testid="compare-stacked">
            {COMPARISON_ROWS.map((r) => (
              <li key={r.feature} className={cn(card, "p-5")}>
                <p className="text-[15px] font-bold">{r.feature}</p>
                <dl className="mt-2 space-y-1.5 text-[15px]">
                  {([["Collective", r.collective], ["Studio", r.studio], ["One", r.one]] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-[#577E90]">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
                </dl>
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-[760px] text-[15px] text-[#2F4157]/75">
            Every product combines live learning with a tutor, daily practice with Elco AI and the IELS Circle community, but not with the same level of tutor
            interaction or the same access terms. Check the row for each product before you choose.
          </p>
        </div>
      </section>

      <section id="path" className="scroll-mt-20 border-t border-[#E6E9EE] bg-white py-[64px] md:py-[96px]" aria-labelledby="path-h">
        <div className={container}>
          <p className={eyebrow}>Find your path</p>
          <h2 id="path-h" className={cn(h2, "mt-3")}>Which learning experience fits you?</h2>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {PATHS.map((p) => (
              <li key={p.id} className="border-t-2 border-[#2F4157] pt-5">
                <h3 className={cn(h3, "text-[22px]")}>{p.name}</h3>
                <p className={cn(body, "mt-2")}>{p.text}</p>
                <a href={p.anchor} className="mt-4 inline-flex items-center gap-1.5 text-[16px] font-semibold text-[#2F4157] underline underline-offset-4 hover:text-[#E56668]">{p.cta}</a>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[15px] text-[#2F4157]/75">Still unsure? <a href={helpMeChooseUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4 hover:text-[#E56668]">Tell us your goal on WhatsApp</a> and we will point you to the right one.</p>
        </div>
      </section>

      {([
        { id: "collective" as const, name: "IELScourse Collective", kind: "Public group classes", price: "Rp199,000 a month", intro: "Affordable, structured English learning in a collaborative group, with a tutor leading every class.",
          facts: ["3 live classes a week (target 12 a month)", "Structured General English curriculum with conversation and group activities", "Classes of up to 20 students; the team opens a class once enough students have registered", "Community sessions on Wednesday and Saturday through IELS Circle, separate from your paid classes", "Elco AI while your membership is active", "Progress monitoring each month"] },
        { id: "studio" as const, name: "IELScourse Studio", kind: "Semi-private small group", price: "Rp399,000 a month", intro: "Small-group English learning with more speaking time, closer tutor guidance and a plan for your group.",
          facts: ["1 live session a week (target 4 a month)", "3 to 5 students per group, so everyone speaks and gets feedback", "A structured learning plan with tutor feedback and progress monitoring", "Speaking and communication practice", "Elco AI while your membership is active", "IELS Circle membership included"] },
      ]).map((p, i) => (
        <section key={p.id} id={p.id} className={cn("scroll-mt-20 border-t border-[#E6E9EE] py-[64px] md:py-[96px]", i === 0 ? "bg-[#F8FAFC]" : "bg-white")} aria-labelledby={`${p.id}-h`}>
          <div className={cn(container, "grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16")}>
            <div>
              <p className={eyebrow}>{p.kind}</p>
              <h2 id={`${p.id}-h`} className={cn(h2, "mt-3")}>{p.name}</h2>
              <p className={cn(lead, "mt-4")}>{p.intro}</p>
              <p className="mt-5 text-[28px] font-extrabold tracking-[-0.02em]">{p.price}</p>
              <ul className="mt-5 space-y-3">{p.facts.map((t) => <li key={t} className="flex gap-3 text-[16px] leading-snug text-[#2F4157]"><Check size={19} className="mt-0.5 shrink-0 text-[#2D7A58]" aria-hidden="true" />{t}</li>)}</ul>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href={joinUrl(p.id)} target="_blank" rel="noopener noreferrer" className={btnAccent} data-testid={`join-${p.id}`}>Join {p.id === "collective" ? "Collective" : "Studio"} <ArrowUpRight size={18} aria-hidden="true" /></a>
                <a href={waitlistUrl(p.id)} target="_blank" rel="noopener noreferrer" className={btnSecondary}>Join the waiting list</a>
              </div>
              <p className="mt-4 text-[14px] text-[#2F4157]/65">No place is held until you pay and the team confirms a class with an open schedule. If no class is open yet, we add you to the waiting list for the next one.</p>
            </div>
            <div>
              <h3 className={cn(h3, "text-[20px]")}>How joining works</h3>
              <ol className="mt-5 space-y-5">
                {JOIN_STEPS.map(([t, d], n) => (
                  <li key={t} className="flex gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{n + 1}</span>
                    <div><p className="text-[17px] font-bold">{t}</p><p className={cn(body, "mt-1 text-[15px]")}>{d}</p></div></li>
                ))}
              </ol>
              <p className="mt-6 text-[14px] text-[#2F4157]/65">Memberships are monthly and renew by a new invoice each month. Your Elco AI access and class place run for the month you have paid for.</p>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
