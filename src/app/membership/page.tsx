import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus, CalendarClock } from "lucide-react";
import Footer from "@/components/footer";
import { Photo } from "@/components/site/Photo";
import { Faq } from "@/components/site/Faq";
import { InquiryForm } from "@/components/site/InquiryForm";
import { body, btnPrimary, btnSecondary, card, container, eyebrow, h1, h2, h3, lead, pill, section, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";
import { idr, dateTimeWib } from "@/lib/format";
import { publicSupabase } from "@/lib/supabase/public";
import { COMPARISON, FREE_FEATURES, MEMBER_BENEFITS, MEMBERSHIP_FAQ, NOT_INCLUDED, PRICES_PUBLIC } from "@/data/membership";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "IELS Membership: sessions, feedback and a study buddy for your applications | IELSco",
  description: "Start free with the opportunity board, IELS Circle and free resources. Members add live application clinics, written feedback on a CV or essay, a study buddy and a private member group.",
  alternates: { canonical: "https://ielsco.com/membership" },
  openGraph: { title: "IELS Membership", description: "What you get for free, what members add, and how it works.", url: "https://ielsco.com/membership", images: ["/images/site/discussion.webp"] },
};

type Plan = { code: string; name: string; months: number; price_idr: number; billing_enabled: boolean };
type Session = { id: string; title: string; kind: string; starts_at: string; host_name: string | null; members_only: boolean };

async function load() {
  try {
    const sb = publicSupabase();
    const [plans, sessions] = await Promise.all([
      sb.from("membership_plans").select("code, name, months, price_idr, billing_enabled").order("sort"),
      sb.rpc("list_member_sessions", { p_limit: 3 }),
    ]);
    return { plans: (plans.data ?? []) as Plan[], sessions: (sessions.data ?? []) as Session[] };
  } catch {
    return { plans: [] as Plan[], sessions: [] as Session[] };
  }
}

const KIND: Record<string, string> = { application_clinic: "Application clinic", workshop: "Workshop", speaking_club: "Speaking club", qna: "Q&A", networking: "Networking" };

export default async function MembershipPage() {
  const { plans, sessions } = await load();
  const showPrices = PRICES_PUBLIC && plans.some((p) => p.billing_enabled);

  return (
    <div className={cn(siteRoot, "min-h-screen overflow-x-hidden bg-white text-[#1A2534]")} data-testid="membership-page">
      <section className="bg-white pb-[56px] pt-[40px] md:pb-[88px] md:pt-[64px]" aria-labelledby="hero">
        <div className={cn(container, "grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16")}>
          <div>
            <p className={eyebrow}>IELS Membership</p>
            <h1 id="hero" className={cn(h1, "mt-4")}>Support for the applications that matter to you</h1>
            <p className={cn(lead, "mt-6 max-w-[580px]")}>
              Everyone can use the opportunity board, IELS Circle and our free resources. Members add the personal part:
              live application clinics, written feedback on a CV or essay, a study buddy with the same goal, and a private
              member group.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={showPrices ? "#plans" : "#founding"} className={btnPrimary} data-testid="membership-primary-cta">
                {showPrices ? "See plans" : "Join the founding-member list"} <ArrowRight size={18} aria-hidden="true" />
              </a>
              <Link href="/sign-up" className={btnSecondary}>Create a free account</Link>
            </div>
            <p className="mt-4 text-[14px] text-[#2F4157]/60">No automatic renewal · Paid once per period through Midtrans</p>
          </div>
          <Photo photo="discussion" ratio="landscape" priority position="40% center" />
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="free">
        <div className={container}>
          <div className="max-w-[640px]">
            <p className={eyebrow}>Free account</p>
            <h2 id="free" className={cn(h2, "mt-3")}>Start free. It stays useful.</h2>
            <p className={cn(lead, "mt-4")}>A free account is not a trial. It is how most people use IELS.</p>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_FEATURES.map((f) => (
              <li key={f.title} className={cn(card, "p-6")}>
                <Check size={20} className="text-[#2D7A58]" aria-hidden="true" />
                <p className="mt-4 text-[17px] font-bold text-[#1A2534]">{f.title}</p>
                <p className={cn(body, "mt-1.5 text-[15px]")}>{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="member">
        <div className={container}>
          <div className="max-w-[680px]">
            <p className={eyebrow}>What members add</p>
            <h2 id="member" className={cn(h2, "mt-3")}>Five things, each with clear limits</h2>
            <p className={cn(lead, "mt-4")}>We list how often each one happens and how you use it, so you know exactly what you are paying for.</p>
          </div>
          <ol className="mt-10 space-y-5">
            {MEMBER_BENEFITS.map((b, i) => (
              <li key={b.id} className={cn(card, "grid gap-6 p-7 md:grid-cols-[56px_1.1fr_1fr]")} data-testid={`benefit-${b.id}`}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF2F7] text-[15px] font-bold text-[#2F4157]">{i + 1}</span>
                <div>
                  <h3 className={h3}>{b.title}</h3>
                  <p className={cn(body, "mt-2")}>{b.what}</p>
                </div>
                <dl className="grid gap-3 text-[15px]">
                  <div><dt className="font-semibold text-[#1A2534]">How often</dt><dd className="text-[#2F4157]/75">{b.howOften}</dd></div>
                  <div><dt className="font-semibold text-[#1A2534]">How you use it</dt><dd className="text-[#2F4157]/75">{b.howToJoin}</dd></div>
                </dl>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="compare">
        <div className={container}>
          <h2 id="compare" className={h2}>Free and member, side by side</h2>
          <div className="mt-8 overflow-x-auto rounded-[20px] border border-[#E6E9EE]">
            <table className="w-full border-collapse text-left text-[14px] sm:text-[15px]">
              <caption className="sr-only">Comparison of the free account and IELS membership</caption>
              <thead>
                <tr className="border-b border-[#E6E9EE] bg-[#F8FAFC]">
                  <th scope="col" className="px-3 py-3 sm:px-5 sm:py-4 font-semibold text-[#1A2534]">Feature</th>
                  <th scope="col" className="w-[24%] px-3 py-3 sm:px-5 sm:py-4 font-semibold text-[#1A2534]">Free account</th>
                  <th scope="col" className="w-[24%] px-3 py-3 sm:px-5 sm:py-4 font-semibold text-[#1A2534]">Member</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r) => (
                  <tr key={r.feature} className="border-b border-[#E6E9EE] last:border-0">
                    <th scope="row" className="px-3 py-3 sm:px-5 sm:py-4 font-medium text-[#2F4157]">{r.feature}</th>
                    {[r.free, r.member].map((v, i) => (
                      <td key={i} className="px-3 py-3 sm:px-5 sm:py-4 text-[#2F4157]">
                        {v === true ? <><Check size={18} className="text-[#2D7A58]" aria-hidden="true" /><span className="sr-only">Included</span></>
                          : v === false ? <><Minus size={18} className="text-[#2F4157]/35" aria-hidden="true" /><span className="sr-only">Not included</span></>
                          : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="how">
        <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:gap-16")}>
          <div>
            <p className={eyebrow}>How it works</p>
            <h2 id="how" className={cn(h2, "mt-3")}>From sign-up to your first session</h2>
            <ol className="mt-8 space-y-6">
              {[
                ["Create a free account", "Takes a minute. Everything free is available straight away."],
                ["Tell us your goal", "Where you want to go and what you're applying for. It shapes your recommendations and buddy match."],
                ["Become a member", "Choose 3 or 12 months and pay once through Midtrans. Membership starts when Midtrans confirms the payment."],
                ["Use it from your dashboard", "Member sessions, the feedback request, buddy matching and the member group link all appear there."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F4157] text-[14px] font-bold text-white">{i + 1}</span>
                  <div><p className="text-[17px] font-bold text-[#1A2534]">{t}</p><p className={cn(body, "mt-1")}>{d}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-6">
            <div className={cn(card, "p-7")}>
              <h3 className={h3}>What membership doesn&apos;t include or promise</h3>
              <ul className="mt-4 space-y-3">
                {NOT_INCLUDED.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] leading-relaxed text-[#2F4157]/80"><Minus size={18} className="mt-0.5 shrink-0 text-[#2F4157]/40" aria-hidden="true" />{t}</li>
                ))}
              </ul>
            </div>
            {sessions.length > 0 && (
              <div className={cn(card, "p-7")} data-testid="membership-sessions">
                <h3 className={h3}>Upcoming member sessions</h3>
                <ul className="mt-4 space-y-3">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex gap-3">
                      <CalendarClock size={18} className="mt-0.5 shrink-0 text-[#577E90]" aria-hidden="true" />
                      <div><p className="text-[15px] font-semibold text-[#1A2534]">{s.title}</p><p className="text-[14px] text-[#2F4157]/65">{KIND[s.kind] ?? "Session"} · {dateTimeWib(s.starts_at)}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {showPrices ? (
        <section id="plans" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="plans-h">
          <div className={container}>
            <h2 id="plans-h" className={h2}>Plans</h2>
            <p className={cn(lead, "mt-3 max-w-[640px]")}>Same membership, two lengths. Paid once; nothing renews automatically.</p>
            <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:max-w-[860px]">
              {plans.filter((p) => p.billing_enabled).map((p) => (
                <li key={p.code} className={cn(card, "flex flex-col p-8")} data-testid={`plan-${p.code}`}>
                  <p className="text-[15px] font-semibold text-[#577E90]">{p.months} months</p>
                  <p className="mt-2 text-[36px] font-extrabold text-[#1A2534]">{idr(p.price_idr)}</p>
                  <p className="text-[15px] text-[#2F4157]/65">≈ {idr(Math.round(p.price_idr / p.months / 1000) * 1000)} a month</p>
                  <Link href={`/dashboard/membership?plan=${p.code}`} className={cn(btnPrimary, "mt-8")}>Become a member</Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section id="founding" className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="founding-h">
          <div className={cn(container, "grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16")}>
            <div>
              <span className={pill}>Opening soon</span>
              <h2 id="founding-h" className={cn(h2, "mt-4")}>Be one of the founding members</h2>
              <p className={cn(lead, "mt-4")}>
                We&apos;re opening membership to a first group so we can keep sessions small and reviews thorough. Leave your
                email and we&apos;ll tell you the price and the first session dates before anyone else. Joining the list costs
                nothing and commits you to nothing.
              </p>
            </div>
            <div className={cn(card, "p-7 sm:p-8")}>
              <InquiryForm
                kind="membership_waitlist"
                fields={["message"]}
                labels={{ message: "What are you working toward? (optional)" }}
                submitLabel="Join the list"
                successTitle="You're on the list"
                successText="We'll email you before membership opens, with the price and the first session dates."
              />
            </div>
          </div>
        </section>
      )}

      <section className={cn(section, "border-t border-[#E6E9EE]")} aria-labelledby="faq">
        <div className={cn(container, "max-w-[860px]")}>
          <h2 id="faq" className={h2}>Questions</h2>
          <Faq className="mt-8" items={MEMBERSHIP_FAQ} />
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: MEMBERSHIP_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }) }} />
      <Footer />
    </div>
  );
}
