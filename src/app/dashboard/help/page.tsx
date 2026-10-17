"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ChevronDown, Mail, Search } from "lucide-react";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { EmptyState, PageHeader } from "@/components/dashboard/PageStates";
import { btnSecondary, cardGloss, focusRing, inputClass } from "@/components/dashboard/ui";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ELCO_ENABLED } from "@/lib/elco";
import { cn } from "@/lib/utils";

// Answers describe how the dashboard works after the product reset. Keep them factual: no promised features.
const TOPICS = [
  {
    id: "start",
    title: "Getting started",
    items: [
      { q: "What should I do first?", a: "Set your goals in My Goals: whether you want to study, work or explore, and where in the world. Explore and People then suggest resources and members that fit." },
      { q: "How do I save a resource for later?", a: "Tap the bookmark on any resource or collection in Explore. Everything you save is in My Shelf, on any device you sign in to." },
      { q: "Can I change my goals later?", a: "Yes, any time in My Goals. You can choose up to five destinations, or none if you haven't decided." },
    ],
  },
  {
    id: "people",
    title: "People & privacy",
    items: [
      { q: "Who can see my profile?", a: "Nobody, unless you turn on \"Show me in People\" in your Profile. You choose which details are shown, such as your country, goals or links." },
      { q: "Can I message other members?", a: "There's no chat inside IELS. Members can add a LinkedIn link to their profile if they're happy to be contacted." },
    ],
  },
  {
    id: "courses",
    title: "Courses & purchases",
    items: [
      { q: "Do IELS courses renew automatically?", a: "No. IELS courses are one-time purchases. Nothing renews or charges you again." },
      { q: "Where do I find my course?", a: "Once your enrolment is confirmed, the course appears in My Learning with your sessions and progress." },
      { q: "I paid but don't see my course.", a: "Email support@ielsco.com with your name and payment proof, and we'll check it." },
      ...(ELCO_ENABLED ? [{ q: "Where do I manage Elco AI?", a: "Elco is a separate app with its own account and plans. Manage those inside Elco." }] : []),
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      { q: "How do I change my password or language?", a: "Go to Settings. If you sign in with Google, there's no IELS password to change." },
      { q: "How do I delete my account?", a: "Email support@ielsco.com from your account's email address, and we'll delete it and confirm." },
    ],
  },
  {
    id: "gif",
    title: "GIF Singapore",
    items: [
      { q: "Where is the GIF delegate portal?", a: "Delegates find GIF Singapore in the dashboard menu and on Home. It shows your screening status, submissions and announcements." },
    ],
  },
];

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <li className="border-b border-[#E3E7ED] last:border-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className={cn("flex w-full items-start justify-between gap-4 rounded-lg py-4 text-left text-lg font-semibold hover:text-[#577E90]", focusRing)}
        >
          {q}
          <ChevronDown size={18} aria-hidden="true" className={cn("mt-1 shrink-0 text-[#2F4157]/50 transition-transform", open && "rotate-180")} />
        </button>
      </h3>
      <p id={id} hidden={!open} className="pb-4 text-base leading-relaxed text-[#2F4157]/75">{a}</p>
    </li>
  );
}

function HelpView() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const topics = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOPICS;
    return TOPICS.map((tp) => ({ ...tp, items: tp.items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(q)) })).filter((tp) => tp.items.length);
  }, [query]);

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-10 md:px-6 md:py-14" data-testid="help-page">
      <PageHeader title={t("nav.help")} description="Answers to common questions, and how to reach the IELS team." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-6">
          <div className="relative">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F4157]/40" />
            <input type="search" data-testid="help-search" aria-label="Search help" placeholder="Search help, e.g. password, course, privacy" value={query} onChange={(e) => setQuery(e.target.value)} className={cn(inputClass, "pl-11")} />
          </div>
          {topics.length === 0 && <EmptyState title="No answers found" body="Try another word, or email us and we'll help directly." />}
          {topics.map((tp) => (
            <section key={tp.id} aria-labelledby={`help-${tp.id}`} className={cn(cardGloss, "px-6 pt-5 md:px-8")}>
              <h2 id={`help-${tp.id}`} className="text-sm font-semibold uppercase tracking-[0.12em] text-[#577E90]">{tp.title}</h2>
              <ul>{tp.items.map((i) => <Faq key={i.q} {...i} />)}</ul>
            </section>
          ))}
        </div>

        <aside className={cn(cardGloss, "space-y-4 p-6 lg:sticky lg:top-24")} aria-labelledby="help-contact">
          <Mail size={22} className="text-[#577E90]" aria-hidden="true" />
          <h2 id="help-contact" className="text-xl font-bold">Still need help?</h2>
          <p className="text-base text-[#2F4157]/70">Email us about anything: account problems, payments, or something that isn&apos;t working.</p>
          <a href="mailto:support@ielsco.com" data-testid="help-email" className={cn(btnSecondary, "w-full")}>support@ielsco.com</a>
          <p className="text-base text-[#2F4157]/70">
            Direct to the founder: <a href="mailto:arbadza@ielsco.com" className="font-semibold text-[#577E90] underline-offset-4 hover:underline">arbadza@ielsco.com</a>
          </p>
          <p className="text-sm text-[#2F4157]/60">
            For course or GIF questions, include your full name and the email you use for IELS. See also <Link href="/dashboard/settings" className="font-semibold text-[#577E90] underline-offset-4 hover:underline">Settings</Link>.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return <DashboardPage>{() => <HelpView />}</DashboardPage>;
}
