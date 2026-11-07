"use client";

import Link from "next/link";
import { use, useState } from "react";
import { Lock } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useQuery } from "@/components/os/data";
import { Empty, ErrorLine, KeyValue, Loading, PageTitle, Section, StatusBadge, btn, btnPrimary, input, linkCls, muted, panel } from "@/components/os/ui";
import { fmtDate, fmtDateTime, personLabel } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Review = {
  id: string; cycle_id: string; person_id: string; reviewer_person_id: string | null; status: string; self_assessment: string | null; self_submitted_at: string | null;
  manager_assessment: string | null; kpi_achievement: string | null; objective_achievement: string | null; feedback: string | null; strengths: string | null;
  development_areas: string | null; development_plan: string | null; manager_submitted_at: string | null; acknowledged_at: string | null;
  os_review_cycles: { name: string; period_start: string; period_end: string; self_due: string | null; manager_due: string | null; status: string } | null;
};
const MANAGER_FIELDS: [keyof Review, string, string][] = [
  ["manager_assessment", "Manager assessment", "Overall view of the period, in words."],
  ["kpi_achievement", "KPI achievement", "What happened against the KPIs they&apos;re accountable for. Describe; don't score."],
  ["objective_achievement", "Objective achievement", "Progress on their objectives and key results."],
  ["strengths", "Strengths", ""], ["development_areas", "Development areas", ""],
  ["development_plan", "Development plan", "Agreed actions, support and dates."], ["feedback", "Feedback", "Anything else to share with them."],
];

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me, supabase } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const review = useQuery<Review | null>((s) => s.from("os_reviews").select("*, os_review_cycles(name, period_start, period_end, self_due, manager_due, status)").eq("id", id).maybeSingle() as never, [id]);
  const kpis = useQuery<{ id: string; name: string }[]>((s) => review.data ? s.from("os_kpis").select("id, name").eq("owner_person_id", review.data.person_id) : Promise.resolve({ data: [], error: null }), [review.data?.person_id]);
  const objectives = useQuery<{ id: string; title: string; status: string; period: string }[]>((s) => review.data ? s.from("os_objectives").select("id, title, status, period").eq("owner_person_id", review.data.person_id) : Promise.resolve({ data: [], error: null }), [review.data?.person_id]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  if (review.loading && !review.data) return <Loading />;
  const r = review.data;
  if (!r) return <Empty title="Review not found" body="It doesn't exist, or it's private to someone else." action={<Link href="/os/reviews" className={btn}>Back to reviews</Link>} />;
  const isSelf = r.person_id === me.person.id;
  const isReviewer = !isSelf; // RLS only returns this review to the person, their reviewer or managers, founders and People Leads.
  const closed = ["Completed", "Acknowledged"].includes(r.status);
  const selfEditable = isSelf && ["Not started", "Self-assessment"].includes(r.status);
  const managerEditable = isReviewer && !closed;
  const val = (k: keyof Review) => draft[k as string] ?? (r[k] as string | null) ?? "";

  async function save(patch: Record<string, unknown>, msg: string) {
    setErr(null); setSaved(null);
    const { data, error } = await supabase.from("os_reviews").update(patch).eq("id", id).select("id").maybeSingle();
    if (error || !data) return setErr(error ? friendlyError(error.message) : "You can't change this review.");
    setDraft({}); setSaved(msg); review.reload();
  }
  const selfPatch = () => ({ self_assessment: val("self_assessment") || null });
  const managerPatch = () => Object.fromEntries(MANAGER_FIELDS.map(([k]) => [k, val(k) || null]));

  return (
    <div>
      <PageTitle title={`${personLabel(people, r.person_id)}: ${r.os_review_cycles?.name ?? r.cycle_id}`} crumbs={[{ href: "/os/reviews", label: "Reviews" }]}
        description={<span className="flex items-center gap-2"><Lock size={13} aria-hidden="true" />{r.id} · Private to {isSelf ? "you" : personLabel(people, r.person_id)}, the reviewer, their managers and founders</span>}
        actions={<StatusBadge value={r.status} />} />
      <ErrorLine message={err} />
      {saved && <p role="status" className="mb-3 rounded-lg bg-[#EEF6F0] px-3 py-2 text-sm text-[#25633A]">{saved}</p>}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Section title="Self-assessment">
            {selfEditable ? (
              <div className="space-y-2">
                <textarea aria-label="Self-assessment" rows={8} className={input} value={val("self_assessment")} onChange={(e) => setDraft({ ...draft, self_assessment: e.target.value })}
                  placeholder="What you worked on, what went well, what was hard, and what you'd like support with." data-testid="os-self-assessment" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => save({ ...selfPatch(), status: "Self-assessment" }, "Draft saved.")}>Save draft</button>
                  <button type="button" className={btnPrimary} disabled={!val("self_assessment").trim()} onClick={() => confirm("Submit your self-assessment to your reviewer? You can't edit it afterwards.") && save({ ...selfPatch(), status: "Manager review" }, "Submitted to your reviewer.")}>Submit</button>
                </div>
              </div>
            ) : r.self_assessment ? <p className={cn(panel, "whitespace-pre-wrap p-4 text-sm")}>{r.self_assessment}</p>
              : <p className={cn("text-sm", muted)}>{isSelf ? "Submitted." : "Not written yet."}</p>}
            {r.self_submitted_at && <p className={cn("mt-1 text-xs", muted)}>Submitted {fmtDateTime(r.self_submitted_at)}</p>}
          </Section>
          <Section title="Manager review">
            {managerEditable ? (
              <div className="space-y-4">
                {MANAGER_FIELDS.map(([k, label, hint]) => (
                  <label key={k} className="block text-xs font-medium text-[#3A4B60]">{label}
                    <textarea rows={k === "manager_assessment" ? 5 : 3} className={cn(input, "mt-1")} value={val(k)} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                    {hint && <span className={cn("mt-0.5 block font-normal", muted)}>{hint}</span>}
                  </label>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btn} onClick={() => save(managerPatch(), "Saved.")}>Save</button>
                  <button type="button" className={btnPrimary} disabled={!val("manager_assessment").trim()} onClick={() => confirm("Complete this review? It becomes read-only and the person is asked to acknowledge it.") && save({ ...managerPatch(), status: "Completed" }, "Review completed.")}>Complete review</button>
                </div>
              </div>
            ) : (r.manager_submitted_at || closed) ? (
              <div className={cn(panel, "space-y-3 p-4 text-sm")}>
                {MANAGER_FIELDS.filter(([k]) => r[k]).map(([k, label]) => <div key={k}><h3 className="text-xs font-medium text-[#66768A]">{label}</h3><p className="mt-0.5 whitespace-pre-wrap">{r[k] as string}</p></div>)}
              </div>
            ) : <p className={cn("text-sm", muted)}>Your reviewer hasn&apos;t completed this yet.</p>}
            {isSelf && r.status === "Completed" && (
              <button type="button" className={cn(btnPrimary, "mt-3")} onClick={() => save({ status: "Acknowledged" }, "Acknowledged.")}>Acknowledge</button>
            )}
          </Section>
        </div>
        <aside className="space-y-4">
          <section className={cn(panel, "p-4")}>
            <KeyValue items={[
              { label: "Person", value: <Link href={`/os/people/${r.person_id}`} className={linkCls}>{personLabel(people, r.person_id)}</Link> },
              { label: "Reviewer", value: personLabel(people, r.reviewer_person_id, "Not assigned") },
              { label: "Period", value: r.os_review_cycles ? `${fmtDate(r.os_review_cycles.period_start)} – ${fmtDate(r.os_review_cycles.period_end)}` : "—" },
              { label: "Self-assessment due", value: fmtDate(r.os_review_cycles?.self_due) },
              { label: "Manager review due", value: fmtDate(r.os_review_cycles?.manager_due) },
              { label: "Completed", value: r.manager_submitted_at ? fmtDateTime(r.manager_submitted_at) : "—" },
              { label: "Acknowledged", value: r.acknowledged_at ? fmtDateTime(r.acknowledged_at) : "—" },
            ]} />
          </section>
          <section className={cn(panel, "p-4")}>
            <h2 className="mb-2 text-sm font-semibold">For reference</h2>
            <p className={cn("mb-1 text-xs", muted)}>KPIs they&apos;re accountable for</p>
            {kpis.data?.length ? <ul className="mb-3 space-y-1 text-sm">{kpis.data.map((k) => <li key={k.id}><Link href={`/os/kpis/${k.id}`} className="hover:underline">{k.id} · {k.name}</Link></li>)}</ul> : <p className="mb-3 text-sm">None</p>}
            <p className={cn("mb-1 text-xs", muted)}>Objectives they own</p>
            {objectives.data?.length ? <ul className="space-y-1 text-sm">{objectives.data.map((o) => <li key={o.id} className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate">{o.title}</span><StatusBadge value={o.status} /></li>)}</ul> : <p className="text-sm">None</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
