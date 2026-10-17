import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { Program } from "@/data/dashboard/programs";
import { btnPrimary, btnSecondary } from "../ui";
import { cn } from "@/lib/utils";

// Editorial row (title column + details column) instead of identical boxed cards.
export function ProgramCard({ program }: { program: Program }) {
  return (
    <article data-testid={`program-card-${program.id}`} className="grid gap-4 border-t border-[#E3E7ED]/70 py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:gap-10">
      <div>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#577E90]">{program.status}</p>
        <h3 className="text-2xl font-bold">{program.name}</h3>
      </div>
      <div className="flex flex-col">
      <p className="mb-4 text-base leading-relaxed text-[#2F4157]/75">{program.summary}</p>
      <ul className="mb-5 space-y-1.5 text-base text-[#2F4157]/80">
        {program.points.map((p) => (
          <li key={p} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#577E90]" />{p}</li>
        ))}
      </ul>
      {program.note && <p className="mb-5 text-sm text-[#2F4157]/55">{program.note}</p>}
      <div className="mt-auto flex flex-wrap gap-2">
        {program.actions.map((a, i) =>
          a.external ? (
            <a key={a.href} href={a.href} target="_blank" rel="noopener noreferrer" className={cn(i === 0 ? btnPrimary : btnSecondary, "px-4 py-2")}>
              {a.label} <ExternalLink size={14} />
            </a>
          ) : (
            <Link key={a.href} href={a.href} data-testid={`program-action-${program.id}-${i}`} className={cn(i === 0 ? btnPrimary : btnSecondary, "px-4 py-2")}>
              {a.label}
            </Link>
          )
        )}
      </div>
      </div>
    </article>
  );
}
