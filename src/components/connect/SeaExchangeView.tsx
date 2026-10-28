"use client";

import Link from "next/link";
import { MessageSquareText, Mic, UserSearch } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { ACCENTS, btnPrimary, btnSecondary, cardGloss, focusRing } from "@/components/dashboard/ui";
import { ElcoMascot } from "@/components/elco/ElcoMascot";
import { circlesApi, connectApi } from "@/lib/connect/api";
import { storyItems } from "@/lib/pulse";
import { usePublishedStories } from "@/lib/stories/usePublishedStories";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { CircleCard } from "./CirclesView";
import { PulseCard } from "./PulseView";
import { RoomCard } from "./RoomsView";
import { ConnectFrame, useLoad } from "./shared";

// Conversation prompts. They ask for members' own perspectives and make no claims about any country; members answer
// in the Cross-Cultural Connections Circle, in a room, or in a conversation with someone they meet.
export const SEA_THEMES = [
  { id: "everyday", title: "Everyday life", accent: "teal" as const, prompts: [
    "What is one everyday habit that differs between your country and another SEA country?",
    "Describe a normal weekday for a young person where you live.",
  ] },
  { id: "traditions", title: "Traditions & customs", accent: "coral" as const, prompts: [
    "What is a local tradition you would like other Southeast Asians to know about?",
    "Which festival or holiday do you look forward to every year, and why?",
  ] },
  { id: "food-language", title: "Food, languages & expressions", accent: "amber" as const, prompts: [
    "Which dish from home would you cook for a friend from another country?",
    "What is a word or expression from your language that is hard to translate?",
  ] },
  { id: "study-work", title: "Campus, study & work culture", accent: "violet" as const, prompts: [
    "What is one thing young people in your country are working toward right now?",
    "How do students usually talk to their teachers or lecturers where you live?",
  ] },
  { id: "perspectives", title: "Misunderstandings & similarities", accent: "green" as const, prompts: [
    "What is one thing people often misunderstand about your country?",
    "What surprised you most when you met someone from another SEA country?",
  ] },
];
const ALL_PROMPTS = SEA_THEMES.flatMap((t) => t.prompts.map((p) => ({ theme: t, prompt: p })));

// Same prompt for everyone during an ISO-ish week (no randomness, no server state).
export function promptOfTheWeek(now = new Date()) {
  const week = Math.floor((now.getTime() - Date.UTC(2026, 0, 5)) / (7 * 864e5));
  return ALL_PROMPTS[((week % ALL_PROMPTS.length) + ALL_PROMPTS.length) % ALL_PROMPTS.length];
}

export function PromptActions({ prompt, small }: { prompt: string; small?: boolean }) {
  const q = encodeURIComponent(prompt);
  const cls = cn(btnSecondary, small && "px-3 py-1.5 text-sm");
  return (
    <div className="flex flex-wrap gap-2">
      <Link href={`/dashboard/circles/cross-cultural?draft=${q}`} onClick={() => track("sea_prompt_used", { action: "circle" })} className={cn(small ? cls : btnPrimary)}>
        <MessageSquareText size={16} aria-hidden="true" /> Answer in the Circle
      </Link>
      <Link href={`/dashboard/connect/rooms/new?category=culture_exchange&topic=${q}`} onClick={() => track("sea_prompt_used", { action: "room" })} className={cls}>
        <Mic size={16} aria-hidden="true" /> Host a room on it
      </Link>
      {!small && (
        <Link href="/dashboard/connect/discover?goal=culture_exchange" onClick={() => track("sea_prompt_used", { action: "people" })} className={cls}>
          <UserSearch size={16} aria-hidden="true" /> Find exchange partners
        </Link>
      )}
    </div>
  );
}

export function SeaExchangeView({ supabase }: DashboardCtx) {
  const week = promptOfTheWeek();
  const stories = storyItems(usePublishedStories(6)).slice(0, 3);
  const related = useLoad(async () => {
    const [circles, rooms] = await Promise.all([
      circlesApi.list(supabase).catch(() => []),
      connectApi.rooms(supabase, "discover", { limit: 50 }).catch(() => []),
    ]);
    return { circle: circles.find((c) => c.id === "cross-cultural") ?? null, rooms: rooms.filter((r) => ["culture_exchange", "language_exchange"].includes(r.category)).slice(0, 3) };
  }, [supabase]);
  const a = ACCENTS[week.theme.accent];

  return (
    <ConnectFrame title="SEA Cultural Exchange" description="Everyday life, traditions, food, languages and ambitions across Southeast Asia, told by members themselves. Pick a prompt and start a conversation.">
      <section data-testid="sea-week" className={cn(cardGloss, "relative overflow-hidden bg-gradient-to-br p-6 md:p-8", a.gradient)}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <ElcoMascot mood="wave" size={112} />
          <div className="flex-1 space-y-3">
            <p className={cn("text-sm font-semibold uppercase tracking-wide", a.text)}>Prompt of the week · {week.theme.title}</p>
            <h2 className="text-2xl font-semibold md:text-3xl">{week.prompt}</h2>
            <PromptActions prompt={week.prompt} />
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="sea-themes">
        <h2 id="sea-themes" className="text-2xl font-bold">More conversation prompts</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SEA_THEMES.map((t) => {
            const ta = ACCENTS[t.accent];
            return (
              <article key={t.id} className={cn(cardGloss, "overflow-hidden")}>
                <div className={cn("h-2", ta.strong)} aria-hidden="true" />
                <div className="space-y-4 p-5">
                  <h3 className={cn("text-lg font-semibold", ta.text)}>{t.title}</h3>
                  <ul className="space-y-4">
                    {t.prompts.map((p) => (
                      <li key={p} className="space-y-2">
                        <p className="text-base font-medium">“{p}”</p>
                        <PromptActions prompt={p} small />
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
        <p className="text-sm text-[#2F4157]/60">Everyone speaks for themselves, not for a whole country. Be curious and kind; report anything disrespectful.</p>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Where these conversations happen</h2>
          {related.state.s === "ready" && related.state.data.circle ? (
            <CircleCard circle={related.state.data.circle} footer={<Link href="/dashboard/circles/cross-cultural" className={btnPrimary}>Open Circle</Link>} />
          ) : <p className="text-base text-[#2F4157]/60">Cross-Cultural Connections Circle</p>}
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Upcoming culture rooms</h2>
          {related.state.s === "ready" && related.state.data.rooms.length > 0
            ? related.state.data.rooms.map((r) => <RoomCard key={r.id} room={r} />)
            : <p className="text-base text-[#2F4157]/60">None scheduled yet. <Link href="/dashboard/connect/rooms/new?category=culture_exchange" className={cn("font-semibold underline", focusRing)}>Host a culture exchange</Link></p>}
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Member stories</h2>
          {stories.length ? stories.map((s) => <PulseCard key={s.id} item={s} compact />) : <p className="text-base text-[#2F4157]/60">Stories appear here once published.</p>}
        </div>
      </section>
    </ConnectFrame>
  );
}
