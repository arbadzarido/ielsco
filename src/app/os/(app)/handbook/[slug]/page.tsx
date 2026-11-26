"use client";

import Link from "next/link";
import { use } from "react";
import { HandbookDocument } from "@/components/os/handbook";
import { Empty, PageTitle, btn } from "@/components/os/ui";
import { handbookBySlug } from "@/content/os/handbook";

export default function HandbookDocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const doc = handbookBySlug(slug);
  if (!doc) return <Empty title="Document not found" body="It may have been renamed." action={<Link href="/os/handbook" className={btn}>Handbook</Link>} />;
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={doc.title} description={doc.summary} crumbs={[{ label: "Handbook", href: "/os/handbook" }]} />
      <HandbookDocument doc={doc} />
    </div>
  );
}
