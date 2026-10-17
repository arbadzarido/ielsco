import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EventData } from "@/data/events";
import { generateSlug } from "@/utils/slug";
import { cardLink, pill } from "@/components/site/ui";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: EventData;
  open?: boolean | null; // null/undefined: status not known yet (computed in the browser)
  onEventClick?: () => void;
}

const fmt = (d: string) => {
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(t));
};

export default function EventCard({ event, open, onEventClick }: EventCardProps) {
  const date = fmt(event.startDate);
  return (
    <Link href={`/events/${generateSlug(event.title)}`} onClick={onEventClick} className={cn(cardLink, "flex h-full flex-col overflow-hidden")} data-testid="event-card">
      <div className="relative aspect-square bg-[#F1F4F8]">
        <Image src={event.poster} alt="" fill sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {open === true && <span className={cn(pill, "border-[#2D7A58]/30 text-[#2D7A58]")}>Registration open</span>}
          {open === false && <span className={cn(pill, "text-[#2F4157]/60")}>Past event</span>}
          {date && <span className="text-[13px] font-medium text-[#2F4157]/60">{date}</span>}
        </div>
        <h3 className="mt-3 text-[18px] font-bold leading-snug text-[#1A2534]">{event.title}</h3>
        <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[#2F4157]/70">{event.seo.meta_description}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-5 text-[15px] font-semibold text-[#2F4157]">Details <ArrowRight size={16} aria-hidden="true" /></span>
      </div>
    </Link>
  );
}
