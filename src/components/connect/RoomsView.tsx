"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { DashboardCtx } from "@/components/dashboard/DashboardPage";
import { EmptyState } from "@/components/dashboard/PageStates";
import { btnPrimary, cardGloss, focusRing, inputClass, labelClass, tag } from "@/components/dashboard/ui";
import { connectApi } from "@/lib/connect/api";
import { eventDay, upcomingOfficialEvents } from "@/lib/connect/events";
import { label, ROOM_CATEGORIES } from "@/lib/connect/options";
import { formatInZone } from "@/lib/connect/time";
import type { Room, RoomState } from "@/lib/connect/types";
import { cn } from "@/lib/utils";
import { ConnectFrame, LoadGate, useLoad } from "./shared";

export const STATE_LABEL: Record<RoomState, { text: string; cls: string }> = {
  open: { text: "Open", cls: "bg-[#E8F3EE] text-[#2E6B4F]" },
  full: { text: "Full", cls: "bg-[#FDECEC] text-[#B4383A]" },
  closed: { text: "Registration closed", cls: "bg-[#F1F4F8] text-[#2F4157]/70" },
  live: { text: "Happening now", cls: "bg-[#FFF4DD] text-[#8A5A00]" },
  completed: { text: "Completed", cls: "bg-[#F1F4F8] text-[#2F4157]/70" },
  cancelled: { text: "Cancelled", cls: "bg-[#FDECEC] text-[#B4383A]" },
  draft: { text: "Not published", cls: "bg-[#F1F4F8] text-[#2F4157]/70" },
};

export function RoomCard({ room }: { room: Room }) {
  const s = STATE_LABEL[room.state];
  return (
    <Link href={`/dashboard/connect/rooms/${room.id}`} data-testid={`room-card-${room.id}`} className={cn(cardGloss, "flex h-full flex-col gap-2 p-5 hover:border-[#577E90]", focusRing)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.cls)}>{s.text}</span>
        <span className={tag}>{label("category", room.category)}</span>
        {room.is_host && <span className={tag}>You host</span>}
        {room.is_registered && <span className={tag}>Registered</span>}
      </div>
      <h3 className="text-lg font-bold">{room.title}</h3>
      <p className="text-sm text-[#2F4157]/70">{formatInZone(room.starts_at, room.timezone)} · {room.duration_min} min</p>
      <p className="text-sm text-[#2F4157]/60">Hosted by {room.host.display_name} · {label("language", room.language)} · {room.registered_count}/{room.capacity} registered</p>
      <p className="mt-auto pt-1 text-xs font-semibold uppercase tracking-wide text-[#577E90]">Community room · {room.delivery === "discord" ? "on Discord" : "external link"}</p>
    </Link>
  );
}

type Scope = "discover" | "joined" | "hosting";

export function RoomsView({ supabase }: DashboardCtx) {
  const [scope, setScope] = useState<Scope>("discover");
  const [category, setCategory] = useState("");
  const [past, setPast] = useState(false);
  const data = useLoad(() => connectApi.rooms(supabase, scope, { category, past: scope !== "discover" && past, limit: 50 }), [supabase, scope, category, past]);
  const events = upcomingOfficialEvents(4);

  return (
    <ConnectFrame title="Rooms & events" description="Community rooms are hosted by members. Official IELS events are run by the IELS team and keep their own registration."
      actions={<Link href="/dashboard/connect/rooms/new" className={btnPrimary} data-testid="room-new"><Plus size={18} /> Host a room</Link>}>
      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div role="tablist" aria-label="Rooms" className="flex flex-wrap gap-2">
            {([["discover", "Upcoming"], ["joined", "Joined"], ["hosting", "Hosting"]] as const).map(([v, t]) => (
              <button key={v} role="tab" type="button" aria-selected={scope === v} onClick={() => setScope(v)}
                className={cn("rounded-full px-4 py-2 text-base font-semibold", focusRing, scope === v ? "bg-[#2F4157] text-white" : "border border-[#E3E7ED] bg-white")}>{t}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {scope !== "discover" && (
              <label className="flex items-center gap-2 text-base"><input type="checkbox" checked={past} onChange={(e) => setPast(e.target.checked)} /> Include past rooms</label>
            )}
            <div>
              <label htmlFor="room-cat" className={labelClass}>Category</label>
              <select id="room-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                <option value="">All</option>
                {ROOM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <LoadGate state={data.state} onRetry={data.reload} label="Loading rooms…" />
        {data.state.s === "ready" && data.state.data.length === 0 && (
          <EmptyState title={scope === "discover" ? "No upcoming rooms" : scope === "joined" ? "You haven't joined a room" : "You aren't hosting a room"}
            body={scope === "hosting" ? "Host an English practice hour, a study session or a culture exchange." : "Rooms that members publish appear here."}
            action={<Link href="/dashboard/connect/rooms/new" className={btnPrimary}>Host a room</Link>} />
        )}
        {data.state.s === "ready" && data.state.data.length > 0 && (
          <div data-testid="rooms-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.state.data.map((r) => <RoomCard key={r.id} room={r} />)}</div>
        )}
      </section>

      <section className="space-y-4 border-t border-[#E3E7ED]/60 pt-8" aria-labelledby="official-heading">
        <div>
          <h2 id="official-heading" className="text-2xl font-bold">Official IELS events</h2>
          <p className="text-base text-[#2F4157]/65">Registration, fees and certificates for these follow each event&apos;s own page.</p>
        </div>
        {events.length === 0 ? (
          <p data-testid="rooms-no-events" className="text-base text-[#2F4157]/60">No upcoming official events right now. <Link href="/dashboard/events" className="font-semibold underline">See past events</Link></p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {events.map((e) => (
              <Link key={e.id} href={e.href} className={cn(cardGloss, "overflow-hidden hover:border-[#577E90]", focusRing)}>
                <div className="relative aspect-[4/3] bg-[#F1F4F8]"><Image src={e.poster} alt="" fill sizes="(max-width: 640px) 100vw, 25vw" className="object-cover" /></div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#E56668]">Official IELS event</p>
                  <p className="font-bold">{e.title}</p>
                  <p className="text-sm text-[#2F4157]/65">{eventDay(e.date)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </ConnectFrame>
  );
}
