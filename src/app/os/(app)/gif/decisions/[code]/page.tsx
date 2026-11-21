"use client";

// One programme decision: background, options with pros and cons, the recommendation, what depends on it, its
// history, and (for Arba and Farrel) the answer actions. Answers go through os_programme_decide, which records who and
// why, writes the company decision log, updates the facts the option settles, releases waiting tasks and flags
// dependent outputs for revision. Nothing is published.
import Link from "next/link";
import { use, useState } from "react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { Empty, ErrorLine, Field, KeyValue, Loading, PageTitle, Section, Select, btn, btnPrimary, input, linkCls, muted, panel } from "@/components/os/ui";
import { DECISION_COLS, OPEN_DECISION, ToneBadge, decide, useProgrammeRights, type Decision, type DecisionOption } from "@/components/os/programme";
import { fmtDate, fmtDateTime, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

const ACTIONS: { key: string; label: string; approver: boolean; needs: ("option" | "text" | "reason")[]; reasonRequired?: boolean; hint: string }[] = [
  { key: "approve_recommendation", label: "Approve the recommendation", approver: true, needs: ["text", "reason"], hint: "Records the recommended option as the decision. Add a note or reason if useful." },
  { key: "select_option", label: "Choose another option", approver: true, needs: ["option", "text", "reason"], reasonRequired: true, hint: "Pick the option and say why." },
  { key: "custom", label: "Write a different answer", approver: true, needs: ["text", "reason"], reasonRequired: true, hint: "Your own decision, in words, and the reason. No facts are changed automatically; update them in Programme facts." },
  { key: "request_research", label: "Ask for more research", approver: true, needs: ["reason"], hint: "Sets the status to Needs Research. Say what is missing." },
  { key: "reject_option", label: "Rule out one option", approver: true, needs: ["option", "reason"], hint: "The option stays visible, marked as ruled out." },
  { key: "defer", label: "Revisit later", approver: true, needs: ["reason"], hint: "Sets the status to Revisit Later." },
  { key: "not_applicable", label: "Mark not applicable", approver: true, needs: ["reason"], hint: "Closes the decision without an answer." },
  { key: "needs_external", label: "Waiting for external confirmation", approver: false, needs: ["reason"], hint: "For example, a university or vendor has to confirm first." },
  { key: "awaiting_approval", label: "Ready for founder approval", approver: false, needs: ["reason"], hint: "Research is done and the recommendation is ready." },
  { key: "comment", label: "Comment", approver: false, needs: ["reason"], reasonRequired: true, hint: "Adds a note to the history. Doesn't change the status." },
];

type LogRow = { id: number; action: string; option_key: string | null; note: string | null; status_before: string | null; status_after: string | null; person_id: string | null; at: string };
type ImpactRow = { kind: string; ref: string; title: string | null; depth: number; via: string | null };

export default function DecisionPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { supabase } = useOsMe();
  const people = useDirectory()?.peopleById ?? new Map();
  const dec = useQuery<Decision | null>((s) => s.from("os_programme_decisions").select(DECISION_COLS).eq("code", code).maybeSingle(), [code]);
  const log = useQuery<LogRow[]>((s) => s.from("os_programme_decision_log").select("*").eq("decision_code", code).order("at", { ascending: false }), [code]);
  const pid = dec.data?.project_id;
  const impact = useQuery<ImpactRow[]>((s) => pid ? s.rpc("os_programme_preview_impact", { p_project: pid, p_kind: "decision", p_ref: code }) : Promise.resolve({ data: [], error: null }), [pid, code]);
  const evidence = useQuery<{ from_kind: string; from_ref: string }[]>((s) => pid ? s.from("os_programme_links").select("from_kind, from_ref").eq("project_id", pid).eq("to_kind", "decision").eq("to_ref", code) : Promise.resolve({ data: [], error: null }), [pid, code]);
  const rights = useProgrammeRights(pid);
  const [action, setAction] = useState("approve_recommendation");
  const [option, setOption] = useState("");
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  if (dec.loading && !dec.data) return <Loading />;
  const d = dec.data;
  if (!d) return <Empty title="Decision not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/gif?tab=decisions" className={btn}>Back to decisions</Link>} />;
  const open = OPEN_DECISION(d.status);
  const allowed = ACTIONS.filter((a) => (rights.approve || (!a.approver && rights.edit)) && (open ? !(a.key === "approve_recommendation" && !d.recommended_option) : a.key === "comment"));
  const reopenAllowed = rights.approve && !open;
  const cur = [...allowed, ...(reopenAllowed ? [{ key: "reopen", label: "Reopen", approver: true, needs: ["reason"] as ("option" | "text" | "reason")[], reasonRequired: true, hint: "Back to Pending Decision. The company log entry is marked superseded and dependent outputs are flagged again." }] : [])].find((a) => a.key === action)
    ?? allowed[0];
  const choosable = d.options.filter((o) => !o.rejected);
  const due = open ? relativeDue(d.suggested_deadline) : null;

  async function submit() {
    if (!cur) return;
    setBusy(true); setErr(null); setResult(null);
    const r = await decide(supabase, d!.code, cur.key, cur.needs.includes("option") ? option || null : null, cur.needs.includes("text") ? text.trim() || null : null, reason.trim() || null);
    setBusy(false);
    if (r.error) return setErr(r.error);
    setResult(r.data?.change ? `Saved: ${r.data.status}. Change ${r.data.change} lists what to revise.` : `Saved: ${r.data?.status}.`);
    setText(""); setReason(""); setOption("");
    dec.reload(); log.reload(); impact.reload();
  }
  const missing = !cur || (cur.needs.includes("option") && !option) || (cur.key === "custom" && text.trim().length < 3) || (cur.reasonRequired && reason.trim().length < 3)
    || (["request_research", "reject_option", "defer", "not_applicable", "needs_external", "awaiting_approval"].includes(cur.key) && reason.trim().length < 3);

  return (
    <div className="max-w-4xl">
      <PageTitle title={d.title} crumbs={[{ href: "/os/gif", label: "GIF Summer 2027" }, { href: "/os/gif?tab=decisions", label: "Decisions" }]}
        description={<span className="flex flex-wrap items-center gap-2"><span>{d.code}</span><ToneBadge value={d.priority} /><ToneBadge value={d.status} />
          {open && d.suggested_deadline && <span className={cn(due?.overdue && "font-medium text-[#A12D2F]")}>Suggested deadline {fmtDate(d.suggested_deadline)}{due?.overdue ? ` (${due.label})` : ""}</span>}
          <span>Owner {personLabel(people, d.owner_person_id)}</span></span>} />

      {!open && d.status === "Decided" && (
        <div className="mb-6 rounded-xl border border-[#BFE3CC] bg-[#F3FAF5] p-3 text-sm">
          <p className="font-semibold text-[#22663F]">Decided{d.decided_on ? ` on ${fmtDate(d.decided_on)}` : ""}{d.decided_by ? ` by ${personLabel(people, d.decided_by)}` : ""}</p>
          <p className="mt-1">{d.final_decision}</p>
          {d.decision_reason && <p className={cn("mt-1", muted)}>Reason: {d.decision_reason}</p>}
          {d.os_decision_id && <p className={cn("mt-1 text-xs", muted)}>Company decision log: {d.os_decision_id}</p>}
        </div>
      )}

      <div className="space-y-6">
        <Section title="The question"><p className="text-sm">{d.question}</p></Section>
        <Section title="Context">
          <div className={cn(panel, "p-3")}>
            <KeyValue items={[
              { label: "Background", value: d.background }, { label: "Why it matters", value: d.why_it_matters },
              { label: "Current situation", value: d.current_situation }, { label: "Evidence and conflicts", value: d.evidence },
              { label: "Information still needed", value: d.info_needed }, { label: "If this waits", value: d.delay_consequence },
              { label: "Why this deadline", value: d.deadline_basis }, { label: "Depends on", value: d.dependencies },
            ].filter((i) => i.value)} />
          </div>
        </Section>

        {d.options.length > 0 && (
          <Section title="Options">
            <div className="grid gap-3 md:grid-cols-2">
              {d.options.map((o) => <OptionCard key={o.key} o={o} recommended={o.key === d.recommended_option} chosen={o.key === d.final_option} />)}
            </div>
          </Section>
        )}
        {d.recommendation && (
          <Section title="Recommendation">
            <p className={cn(panel, "p-3 text-sm")}>{d.recommendation}<span className={cn("mt-1 block text-xs", muted)}>A recommendation, not a decision, until an approver answers.</span></p>
          </Section>
        )}

        {cur && (
          <Section title={open ? "Answer" : "Add to this decision"}>
            <div className={cn(panel, "space-y-3 p-3")} data-testid="gif-decide">
              <ErrorLine message={err} />
              {result && <p role="status" className="rounded-lg bg-[#E7F4EC] px-3 py-2 text-sm text-[#22663F]">{result} <Link href="/os/gif?tab=changes" className={linkCls}>Changes</Link></p>}
              <Field label="Action" hint={cur.hint}>{(id) => <Select id={id} value={cur.key} onChange={(v) => { setAction(v); setErr(null); }}
                options={[...allowed, ...(reopenAllowed ? [{ key: "reopen", label: "Reopen" }] : [])].map((a) => ({ value: a.key, label: a.label }))} />}</Field>
              {cur.needs.includes("option") && (
                <Field label="Option">{(id) => <Select id={id} value={option} onChange={setOption} placeholder="Choose…"
                  options={(cur.key === "reject_option" ? d.options.filter((o) => !o.rejected) : choosable).map((o) => ({ value: o.key, label: `${o.key}. ${o.label}` }))} />}</Field>
              )}
              {cur.needs.includes("text") && (
                <Field label={cur.key === "custom" ? "Your decision" : "Note (optional)"}>{(id) => <textarea id={id} rows={3} className={input} value={text} onChange={(e) => setText(e.target.value)} />}</Field>
              )}
              <Field label={cur.key === "comment" ? "Comment" : cur.reasonRequired || cur.key !== "approve_recommendation" ? "Reason" : "Reason (optional)"}>
                {(id) => <textarea id={id} rows={2} className={input} value={reason} onChange={(e) => setReason(e.target.value)} />}
              </Field>
              <button type="button" className={btnPrimary} disabled={busy || missing} onClick={submit}>{busy ? "Saving…" : cur.label}</button>
            </div>
          </Section>
        )}
        {!cur && <p className={cn("text-sm", muted)}>Arba and Farrel answer decisions. Programme editors can comment and mark items as waiting for external confirmation or ready for approval.</p>}

        <Section title="What this affects">
          <ul className={cn(panel, "divide-y divide-[#F0F2F5] text-sm")}>
            {(impact.data ?? []).filter((i) => i.depth <= 2).map((i) => (
              <li key={`${i.kind}:${i.ref}`} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="min-w-0"><span className="mr-2 text-xs text-[#66768A]">{i.kind}{i.depth > 1 ? " (indirect)" : ""}</span>{i.title ?? i.ref}</span>
                <span className="shrink-0 text-xs text-[#8593A3]">{i.kind === "country_plan" ? "" : i.ref}</span>
              </li>
            ))}
            {!(impact.data ?? []).length && <li className={cn("px-3 py-2", muted)}>Nothing linked yet.</li>}
          </ul>
          {(evidence.data ?? []).length > 0 && <p className={cn("mt-2 text-xs", muted)}>Evidence from: {(evidence.data ?? []).map((e) => e.from_ref).join(", ")} (<Link href="/os/gif?tab=research" className={linkCls}>Research</Link>)</p>}
        </Section>

        <Section title="History">
          <ul className="space-y-2 text-sm">
            {(log.data ?? []).map((l) => (
              <li key={l.id} className={cn(panel, "px-3 py-2")}>
                <p><span className="font-medium">{personLabel(people, l.person_id, "Someone")}</span> · {l.action.replace(/_/g, " ")}{l.option_key ? ` (${l.option_key})` : ""}{l.status_before !== l.status_after ? ` · ${l.status_before} → ${l.status_after}` : ""}</p>
                {l.note && <p className={muted}>{l.note}</p>}
                <p className="text-xs text-[#8593A3]">{fmtDateTime(l.at)}</p>
              </li>
            ))}
            {!(log.data ?? []).length && <li className={muted}>No answers or comments yet.</li>}
          </ul>
        </Section>
      </div>
    </div>
  );
}

function OptionCard({ o, recommended, chosen }: { o: DecisionOption; recommended: boolean; chosen: boolean }) {
  const rows = [["Pros", o.pros], ["Cons", o.cons], ["Cost", o.cost], ["Operations", o.operations], ["Participants", o.participant]].filter(([, v]) => v);
  return (
    <article className={cn(panel, "p-3", recommended && "border-[#9FB8C6]", o.rejected && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{o.key}. {o.label}</h3>
        <span className="flex gap-1">{recommended && <ToneBadge tone="blue">Recommended</ToneBadge>}{chosen && <ToneBadge tone="green">Chosen</ToneBadge>}{o.rejected && <ToneBadge tone="neutral">Ruled out</ToneBadge>}</span>
      </div>
      {o.summary && <p className="mt-1 text-sm">{o.summary}</p>}
      {rows.length > 0 && <dl className="mt-2 space-y-1 text-sm">{rows.map(([k, v]) => <div key={k}><dt className="inline font-medium">{k}: </dt><dd className="inline text-[#3A4B60]">{v}</dd></div>)}</dl>}
      {o.fact_updates && Object.keys(o.fact_updates).length > 0 && <p className={cn("mt-2 text-xs", muted)}>Choosing this sets: {Object.entries(o.fact_updates).map(([k, v]) => `${k} = ${v}`).join("; ")}</p>}
      {o.rejected_note && <p className={cn("mt-1 text-xs", muted)}>Ruled out: {o.rejected_note}</p>}
    </article>
  );
}
