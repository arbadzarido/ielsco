import {
  BookOpen, FileText, Globe, GraduationCap, Headphones, Landmark, PlayCircle, Wrench,
} from "lucide-react";
import type { Resource, ResourceCategory, ResourceType } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

export const TYPE_ICONS: Record<ResourceType, typeof Globe> = {
  Website: Globe,
  Article: FileText,
  Video: PlayCircle,
  Podcast: Headphones,
  Course: GraduationCap,
  "Official page": Landmark,
  Tool: Wrench,
  Template: BookOpen,
};

// Consistent fallback visual (no fabricated thumbnails): brand tone by topic + type icon.
const TONES: Record<ResourceCategory, string> = {
  "English Speaking": "bg-[#577E90] text-white",
  "English for Interviews": "bg-[#2F4157] text-white",
  "Workplace Communication": "bg-[#2F4157] text-white",
  "Academic English": "bg-[#E9E3DA] text-[#2F4157]",
  "Writing & Applications": "bg-[#E9E3DA] text-[#2F4157]",
  "Vocabulary & Grammar": "bg-[#577E90]/15 text-[#2F4157]",
  "Learning Strategies": "bg-[#577E90]/15 text-[#2F4157]",
};

export function ResourceThumb({ resource, variant = "square", className }: { resource: Resource; variant?: "square" | "band"; className?: string }) {
  const Icon = TYPE_ICONS[resource.type];
  if (resource.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={resource.image} alt="" className={cn("object-cover", variant === "square" ? "h-14 w-14 rounded-xl" : "h-28 w-full", className)} />;
  }
  if (variant === "square") {
    return (
      <span aria-hidden="true" className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", TONES[resource.category], className)}>
        <Icon size={22} />
      </span>
    );
  }
  return (
    <div aria-hidden="true" className={cn("relative flex h-28 items-end justify-between overflow-hidden px-5 pb-4", TONES[resource.category], className)}>
      <span className="text-sm font-semibold uppercase tracking-[0.14em] opacity-80">{resource.type}</span>
      <Icon size={56} strokeWidth={1.2} className="absolute -right-2 -top-2 opacity-25" />
    </div>
  );
}
