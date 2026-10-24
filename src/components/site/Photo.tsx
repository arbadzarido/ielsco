import Image from "next/image";
import { cn } from "@/lib/utils";

// The one way public pages show photographs: real IELSco moments from public/images/site/ (toned as one set by
// scripts/tone-photos.py), a fixed ratio, one corner radius and a hairline border. Captions are optional and factual.
export const PHOTOS = {
  communityInPerson: { src: "/images/site/community-in-person.webp", alt: "A large group of IELS members at an in-person session" },
  teamCampusVisit: { src: "/images/site/team-campus-visit.webp", alt: "IELS team members at a university visit" },
  onlineSession: { src: "/images/site/online-session.webp", alt: "Participants in an online IELS session" },
  onlineCohort: { src: "/images/site/online-cohort.webp", alt: "An online IELS cohort on a video call" },
  gathering: { src: "/images/site/gathering.webp", alt: "IELS members smiling together at a meet-up" },
  teamPortrait: { src: "/images/site/team-portrait.webp", alt: "Members of the IELS team" },
  speaker: { src: "/images/site/speaker.webp", alt: "A participant speaking into a microphone at an IELS event" },
  discussion: { src: "/images/site/discussion.webp", alt: "Participants in a small-group discussion" },
} as const;
export type PhotoKey = keyof typeof PHOTOS;

const RATIO = { wide: "aspect-[16/10]", landscape: "aspect-[4/3]", square: "aspect-square", banner: "aspect-[21/9]" } as const;

export function Photo({ photo, ratio = "landscape", priority, sizes = "(min-width: 1024px) 540px, 100vw", position = "center", caption, alt, className }: {
  photo: PhotoKey; ratio?: keyof typeof RATIO; priority?: boolean; sizes?: string; position?: string; caption?: string; alt?: string; className?: string;
}) {
  const p = PHOTOS[photo];
  return (
    <figure className={className}>
      <div className={cn("relative overflow-hidden rounded-[24px] border border-[#E6E9EE] bg-[#F1F4F8]", RATIO[ratio])}>
        <Image src={p.src} alt={alt ?? p.alt} fill priority={priority} sizes={sizes} className="object-cover" style={{ objectPosition: position }} />
      </div>
      {caption && <figcaption className="mt-3 text-[14px] text-[#2F4157]/65">{caption}</figcaption>}
    </figure>
  );
}
