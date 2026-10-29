import Link from "next/link";
import type { ReactNode } from "react";
import type { Block } from "@/content/articles/types";
import { textLink } from "@/components/site/ui";

// Renders article blocks. Inline syntax is deliberately tiny: [label](url), **bold** and *italic*. Everything else is text, so
// article content can never inject HTML.
const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export function Inline({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const href = m[2];
      out.push(href.startsWith("/")
        ? <Link key={m.index} href={href} className={textLink}>{m[1]}</Link>
        : <a key={m.index} href={href} className={textLink} target="_blank" rel="noopener noreferrer">{m[1]}</a>);
    } else if (m[3]) out.push(<strong key={m.index}>{m[3]}</strong>);
    else out.push(<em key={m.index}>{m[4]}</em>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-[#2F4157]">
      {blocks.map((b, i) => {
        if ("h2" in b) return <h2 key={i} className="pt-4 text-2xl font-bold leading-snug text-[#1A2534]">{b.h2}</h2>;
        if ("p" in b) return <p key={i}><Inline text={b.p} /></p>;
        if ("ul" in b) return <ul key={i} className="list-disc space-y-2 pl-6">{b.ul.map((x, k) => <li key={k}><Inline text={x} /></li>)}</ul>;
        if ("ol" in b) return <ol key={i} className="list-decimal space-y-2 pl-6">{b.ol.map((x, k) => <li key={k}><Inline text={x} /></li>)}</ol>;
        return <p key={i} className="rounded-2xl border border-[#E3E7ED] bg-[#F7F8FA] p-4 text-[15px]"><Inline text={b.note} /></p>;
      })}
    </div>
  );
}
