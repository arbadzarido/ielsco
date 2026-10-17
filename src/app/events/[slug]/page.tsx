import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/footer";
import { EventCta } from "@/components/events/EventCta";
import { eventsData } from "@/data/events";
import { generateSlug } from "@/utils/slug";
import { container, textLink, siteRoot } from "@/components/site/ui";
import { cn } from "@/lib/utils";

function findEventBySlug(slug: string) {
  return eventsData.find((event) => generateSlug(event.title) === slug);
}

interface EventDetailPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return eventsData.map((e) => ({ slug: generateSlug(e.title) }));
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = findEventBySlug(slug);
  if (!event) return { title: "Event Not Found - IELS", description: "The requested event could not be found." };
  return {
    title: event.seo.meta_title,
    description: event.seo.meta_description,
    keywords: event.seo.meta_keywords,
    openGraph: { title: event.seo.meta_title, description: event.seo.meta_description, images: [event.poster], type: "article" },
    twitter: { card: "summary_large_image", title: event.seo.meta_title, description: event.seo.meta_description, images: [event.poster] },
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = findEventBySlug(slug);
  if (!event) notFound();

  return (
    <div className={cn(siteRoot, "bg-white")} data-testid="event-detail">
      <div className={cn(container, "pb-[72px] pt-[32px] md:pt-[48px]")}>
        <Link href="/events" className={textLink}><ArrowLeft size={16} aria-hidden="true" /> All events</Link>
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,460px)_1fr] lg:gap-14">
          <div className="overflow-hidden rounded-[24px] border border-[#E6E9EE] lg:sticky lg:top-[96px]">
            <Image src={event.poster} alt={`${event.title} poster`} width={600} height={800} className="h-auto w-full" priority />
          </div>
          <div>
            <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.015em] text-[#1A2534] sm:text-[40px]">{event.title}</h1>
            <EventCta event={event} className="mt-6" />
            <div
              className="mt-8 border-t border-[#E6E9EE] pt-8 text-[16px] leading-[1.7] text-[#2F4157]/85 [&_a]:font-semibold [&_a]:text-[#2F4157] [&_a]:underline [&_li]:mb-1 [&_ol]:ml-6 [&_ol]:list-decimal [&_strong]:text-[#1A2534] [&_ul]:ml-6 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
