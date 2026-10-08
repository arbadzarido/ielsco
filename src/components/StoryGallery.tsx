"use client";

import { useState } from "react";
import Image from "next/image";
import type { GalleryItem } from "@/data/member-stories";

export default function StoryGallery({
  items,
  authorName,
}: {
  items?: GalleryItem[];
  authorName: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // No gallery data yet — friendly placeholder instead of an empty section.
  if (!items || items.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-[#FAFAFA] flex flex-col items-center justify-center text-center px-4"
          >
            <span className="text-2xl mb-2">📸</span>
            <p className="text-xs text-gray-400">
              Photos from {authorName.split(" ")[0]}&apos;s journey coming soon
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* masonry-style grid — mixed heights via CSS columns, no extra deps */}
      <div className="columns-2 sm:columns-3 gap-3">
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative w-full mb-3 rounded-2xl overflow-hidden block break-inside-avoid"
          >
            <Image
              src={item.image}
              alt={item.caption ?? `${authorName} — moment ${i + 1}`}
              width={500}
              height={500}
              className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* lightbox */}
      {openIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-[#2F4157]/95 flex items-center justify-center p-6"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl leading-none"
            aria-label="Close"
          >
            ×
          </button>

          {openIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex(openIndex - 1);
              }}
              className="absolute left-4 sm:left-8 text-white/70 hover:text-white text-3xl"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}

          <div
            className="relative max-w-3xl w-full max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={items[openIndex].image}
              alt={
                items[openIndex].caption ??
                `${authorName} — moment ${openIndex + 1}`
              }
              width={1000}
              height={1000}
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl mx-auto"
            />
            {items[openIndex].caption && (
              <p className="mt-3 text-center text-white/80 text-sm">
                {items[openIndex].caption}
              </p>
            )}
          </div>

          {openIndex < items.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenIndex(openIndex + 1);
              }}
              className="absolute right-4 sm:right-8 text-white/70 hover:text-white text-3xl"
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}