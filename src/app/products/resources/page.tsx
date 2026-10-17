"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";

import {
  RESOURCES,
  CATEGORIES,
  PAGE_SIZE,
  Resource,
  ResourceType,
} from "@/data/resources";

/* ---------- BUTTON STYLES ---------- */
const BTN_PRIMARY =
  "bg-[#E56668] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#C04C4E] transition";

const BTN_SECONDARY =
  "bg-[#294154] text-white font-semibold px-6 py-3 rounded-full hover:bg-[#21363f] transition";

const BTN_GHOST =
  "bg-white border border-gray-200 text-[#294154] font-medium px-4 py-2 rounded-full hover:bg-gray-50 transition";

/* ---------- CARD ---------- */
function ResourceCard({ r }: { r: Resource }) {
  return (
    <article className="bg-white rounded-2xl border border-gray-200 flex flex-col h-full transition hover:shadow-lg hover:-translate-y-1 overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-36 bg-[#f8fafb]">
        {r.thumbnail ? (
          <Image
            src={r.thumbnail}
            alt={r.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-4xl">
            📘
          </div>
        )}

        <span className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-[#294154] text-white font-semibold">
          {r.type}
        </span>
      </div>

      {/* CONTENT */}
      <div className="p-5 flex-1">
        <h3 className="text-lg font-bold text-[#294154]">
          {r.title}
        </h3>

        <p className="mt-2 text-sm text-gray-600 line-clamp-3">
          {r.description}
        </p>

        {/* TAGS */}
        {r.tags && (
          <div className="mt-4 text-xs text-gray-400">
            {r.tags.slice(0, 3).map((t) => (
              <span key={t} className="mr-2">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-gray-100 px-5 py-4">
        <Button
          asChild
          className="w-full bg-[#E56668] text-white font-semibold py-2 rounded-full hover:bg-[#C04C4E] transition"
        >
          <Link href={r.url} target="_blank">
            Download Resource
          </Link>
        </Button>
      </div>
    </article>
  );
}


/* ---------- PAGE ---------- */
export default function ResourcesPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<ResourceType | "All">("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return RESOURCES.filter((r) => {
      const matchCategory =
        category === "All" || r.type === category;
      const matchQuery =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q));

      return matchCategory && matchQuery;
    });
  }, [query, category]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const paged = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-[#f8fbfc] to-[#fff6f6] text-[#294154]">

      <div className="max-w-6xl mx-auto px-6 py-14">
        {/* HERO */}
        <section className="grid lg:grid-cols-12 gap-8 items-center mb-14">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl font-extrabold">
              Learn. Access. Grow.
            </h1>

            <p className="text-gray-700 max-w-xl">
              Curated learning resources to help you study smarter —
              from IELTS prep to professional communication.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className={BTN_PRIMARY}>
                <Link href="https://drive.google.com/" target="_blank">
                  Access Free E-Books
                </Link>
              </Button>

              <Button asChild className={BTN_SECONDARY}>
                <Link href="/circle">
                  Join IELS Circle
                </Link>
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <Image
              src="/images/contents/general/ielsresources.svg"
              alt="IELS Resources"
              width={420}
              height={420}
            />
          </div>
        </section>

        {/* FILTERS */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border mb-10">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <Button
                  key={c}
                  className={
                    category === c ? BTN_SECONDARY : BTN_GHOST
                  }
                  onClick={() => {
                    setCategory(c);
                    setPage(1);
                  }}
                >
                  {c}
                </Button>
              ))}
            </div>

            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search resources..."
              className="w-full md:w-80 border border-gray-200 rounded-full px-4 py-3 text-sm"
            />
          </div>
        </section>

        {/* GRID */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {paged.map((r) => (
            <ResourceCard key={r.id} r={r} />
          ))}
        </section>

        {/* PAGINATION */}
        <section className="flex items-center justify-center gap-4">
          <Button
            className={BTN_GHOST}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </Button>

          <span className="text-sm">
            Page {page} of {totalPages}
          </span>

          <Button
            className={BTN_GHOST}
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </section>

        {/* CTA */}
        <section className="mt-14 bg-white rounded-2xl p-8 text-center border shadow-sm">
          <h3 className="text-xl font-bold mb-4">
            Need custom learning resources?
          </h3>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className={BTN_PRIMARY}>
              <a href="mailto:hello@ielsco.com">
                Email Us
              </a>
            </Button>

            <Button asChild className={BTN_SECONDARY}>
              <Link href="/partners">
                Partnership Kits
              </Link>
            </Button>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}