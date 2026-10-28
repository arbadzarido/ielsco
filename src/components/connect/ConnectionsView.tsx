"use client";

import Link from "next/link";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { Avatar } from "@/components/dashboard/Avatar";
import { EmptyState } from "@/components/dashboard/PageStates";
import { btnPrimary, btnSecondary, card, focusRing } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { labels } from "@/lib/connect/options";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, PersonCard, SafetyMenu, useLoad, when } from "./shared";

const NONE = <EmptyState title="No connections yet" body="Send a Letter Intro to someone in Discover, or say yes after a Quick Match." action={<Link href="/dashboard/connect/discover" className={btnPrimary}>Discover people</Link>} />;

export function ConnectionsView(ctx: DashboardCtx) {
  const data = useLoad(() => connectApi.connections(ctx.supabase), [ctx.supabase]);
  return (
    <ConnectFrame title="My connections" description="People you're mutually connected with.">
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && (data.state.data.length === 0 ? NONE : (
        <div data-testid="connections-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.state.data.map((c) => (
            <PersonCard key={c.person.id} person={c.person}
              reasons={[`Connected ${when(c.connected_at)} via ${c.source === "intro" ? "Letter Intro" : "Quick Match"}`,
                ...(c.person.timezone ? [`Time zone: ${c.person.timezone}`] : []),
                ...(c.person.availability_days.length ? [`Usually free: ${labels("day", c.person.availability_days).join(", ")}`] : [])]}
              footer={c.blocked ? <p className="text-sm text-[#2F4157]/60">Blocked. Messaging is off.</p> : (
                <>
                  <Link href={`/dashboard/connect/messages/${c.person.id}`} className={btnPrimary}>Message{c.unread ? ` (${c.unread})` : ""}</Link>
                  <Link href={`/dashboard/connect/people/${c.person.id}`} className={btnSecondary}>Passport</Link>
                  <SafetyMenu supabase={ctx.supabase} person={c.person} context="profile" onBlocked={data.reload} />
                </>
              )} />
          ))}
        </div>
      ))}
    </ConnectFrame>
  );
}

export function MessagesView(ctx: DashboardCtx) {
  const data = useLoad(() => connectApi.connections(ctx.supabase), [ctx.supabase]);
  return (
    <ConnectFrame title="Messages" description="Private conversations with your connections. Only the two of you can read them.">
      <LoadGate state={data.state} onRetry={data.reload} />
      {data.state.s === "ready" && (data.state.data.length === 0 ? NONE : (
        <ul data-testid="conversation-list" className={cn(card, "divide-y divide-[#E3E7ED]")}>
          {data.state.data.map((c) => (
            <li key={c.person.id}>
              <Link href={`/dashboard/connect/messages/${c.person.id}`} className={cn("flex items-center gap-3 p-4 hover:bg-[#F7F8FA]", focusRing)}>
                <Avatar name={c.person.display_name} url={c.person.avatar_url} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("truncate text-base", c.unread ? "font-bold" : "font-semibold")}>{c.person.display_name}</span>
                    <span className="shrink-0 text-sm text-[#2F4157]/55">{when(c.last_at ?? c.connected_at)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-[#2F4157]/65">{c.blocked ? "Blocked" : c.last_body ? `${c.last_mine ? "You: " : ""}${c.last_body}` : "Say hello 👋"}</span>
                    {c.unread > 0 && <span className="rounded-full bg-[#E56668] px-2 py-0.5 text-xs font-bold text-white" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ))}
    </ConnectFrame>
  );
}
