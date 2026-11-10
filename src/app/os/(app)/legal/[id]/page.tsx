"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { Money, flError } from "@/components/os/finance";
import { AgreementSheet, DueBadge, LetterSheet, useLegRoles, useRules } from "@/components/os/legal";
import { Badge, Empty, ErrorLine, Field, KeyValue, Loading, PageTitle, Section, btn, btnDanger, btnPrimary, input, muted, panel } from "@/components/os/ui";
import { companyName, fmtDate, fmtDateTime, personLabel } from "@/lib/os/meta";
import { EVENT_LABEL } from "@/lib/os/finance";
import { AGREEMENT_COLUMNS, AGREEMENT_KIND, AGREEMENT_STATUS, LETTER_COLUMNS, LETTER_STATUS, agreementActions, letterActions, type AgreementRow, type LegalAction, type LetterRow } from "@/lib/os/legal";
import { cn } from "@/lib/utils";

type Event = { id: number; at: string; actor_person_id: string | null; action: string; note: string | null };
type Approval = { id: string; approver_person_id: string; decision: string; note: string | null; decided_at: string };

const ACTION: Record<LegalAction, string> = { edit: "Edit", submit: "Send for approval", approve: "Approve and number", return: "Return for changes", void: "Void", archive: "Archive", terminate: "Terminate", expire: "Mark expired" };

// One letter (LTR-) or agreement (AGR-). Only Legal, the person who drafted it and an agreement's owner can read it.
export default function LegalRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const type = id.startsWith("AGR-") ? "agreement" : "letter";
  const { me } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const leg = useLegRoles();
  const rules = useRules();
  const letter = useQuery<LetterRow | null>((s) => (type === "letter" ? s.from("os_letters").select(LETTER_COLUMNS).eq("id", id).maybeSingle() : Promise.resolve({ data: null, error: null })) as never, [id]);
  const agreement = useQuery<AgreementRow | null>((s) => (type === "agreement" ? s.from("os_agreements").select(AGREEMENT_COLUMNS).eq("id", id).maybeSingle() : Promise.resolve({ data: null, error: null })) as never, [id]);
  const events = useQuery<Event[]>((s) => s.from("os_record_events").select("id, at, actor_person_id, action, note").eq("entity_type", type).eq("entity_id", id).order("id"), [id]);
  const approvals = useQuery<Approval[]>((s) => s.from("os_approvals").select("id, approver_person_id, decision, note, decided_at").eq("entity_type", type).eq("entity_id", id).order("decided_at"), [id]);
  const [editing, setEditing] = useState(false);
  const reload = () => { letter.reload(); agreement.reload(); events.reload(); approvals.reload(); };
  const q = type === "letter" ? letter : agreement;
  if (q.loading && !q.data) return <Loading />;
  if (!q.data) return <Empty title="Not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os" className={btn}>Home</Link>} />;
  const legMe = { personId: me.person.id, operator: leg.operate, signer: leg.signer };
  const l = letter.data, a = agreement.data;
  const actions = !leg.ready ? [] : l ? letterActions(l, legMe) : agreementActions(a!, legMe);
  const rule = (rules.data ?? []).find((r) => r.id === (l?.rule_id ?? a?.rule_id));
  const related = (l ?? a)!.related_type && (l ?? a)!.related_id ? { type: (l ?? a)!.related_type!, id: (l ?? a)!.related_id! } : null;
  const relHref = related ? (related.type === "project" ? `/os/projects/${related.id}` : related.type === "partnership" ? `/os/partnerships/${related.id}` : `/os/requests/${related.id}`) : null;
  const status = l ? LETTER_STATUS[l.status] : AGREEMENT_STATUS[a!.status];

  return (
    <div data-testid="os-legal-page">
      <PageTitle crumbs={[{ href: `/os/d/leg?tab=${l ? "letters" : "agreements"}`, label: l ? "Letters" : "Agreements" }]} title={l ? l.subject : a!.title}
        description={<span>{id} · {l ? (l.direction === "incoming" ? "Incoming letter" : "Outgoing letter") : AGREEMENT_KIND[a!.kind]} · {companyName((l ?? a)!.company_code)}</span>}
        actions={<Badge tone={status.tone}>{status.label}</Badge>} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div className={cn(panel, "p-4")}>
            <p className="text-xs font-medium text-[#66768A]">Number</p>
            <p className={cn("mt-1 text-2xl font-semibold tracking-tight", (l?.status === "void") && "line-through")} data-testid="os-legal-number">{(l?.number ?? a?.number) || "Not numbered yet"}</p>
            {!(l?.number ?? a?.number) && <p className={cn("mt-1 text-xs", muted)}>{rule ? `Generated from "${rule.name}" when a signatory approves it.` : "No numbering rule chosen."}</p>}
            {l?.void_reason && <p className="mt-2 text-sm text-[#A12D2F]">Voided: {l.void_reason}. The number stays in the register and is never reused.</p>}
          </div>
          {actions.length > 0 && <Actions type={type} id={id} actions={actions} onEdit={() => setEditing(true)} onDone={reload} />}
          <Section title="Files in Google Drive"><LinkedDocuments type={type} id={id} /></Section>
          <EntityFeed type={type} id={id} />
        </div>
        <aside className="space-y-6">
          <KeyValue items={l ? [
            { label: l.direction === "incoming" ? "From" : "To", value: l.counterparty },
            { label: "Letter date", value: fmtDate(l.letter_date) },
            ...(l.received_date ? [{ label: "Received", value: fmtDate(l.received_date) }] : []),
            { label: "Rule", value: rule ? `${rule.type_code} · ${rule.name}` : "—" },
            { label: "Division", value: dir?.divisionById.get(l.division_id ?? "")?.name ?? "—" },
            { label: "Sensitivity", value: l.sensitivity },
            { label: "Drafted by", value: personLabel(people, l.created_by) },
            ...(l.decided_by ? [{ label: "Decided by", value: `${personLabel(people, l.decided_by)} · ${fmtDateTime(l.decided_at)}` }] : []),
            ...(related ? [{ label: "About", value: <Link className="underline" href={relHref!}>{related.id}</Link> }] : []),
            ...(l.notes ? [{ label: "Notes", value: l.notes }] : []),
          ] : [
            { label: "With", value: a!.counterparty },
            { label: "Starts", value: fmtDate(a!.start_date) },
            { label: "Ends", value: <span className="flex items-center gap-1">{fmtDate(a!.end_date)}{a!.status === "active" && <DueBadge date={a!.end_date} />}</span> },
            ...(a!.renewal_date ? [{ label: "Renewal", value: <span className="flex items-center gap-1">{fmtDate(a!.renewal_date)}{a!.status === "active" && <DueBadge date={a!.renewal_date} />}</span> }] : []),
            ...(a!.notice_days != null ? [{ label: "Notice", value: `${a!.notice_days} days` }] : []),
            { label: "Renews automatically", value: a!.auto_renew ? "Yes" : "No" },
            ...(a!.value_amount ? [{ label: "Value", value: <Money value={a!.value_amount} /> }] : []),
            { label: "Owner", value: personLabel(people, a!.owner_person_id, "No owner") },
            { label: "Sensitivity", value: a!.sensitivity },
            ...(related ? [{ label: "About", value: <Link className="underline" href={relHref!}>{related.id}</Link> }] : []),
            ...(a!.notes ? [{ label: "Notes", value: a!.notes }] : []),
          ]} />
          {!!approvals.data?.length && (
            <Section title="Approvals">
              <ul className="space-y-2 text-sm">{approvals.data.map((x) => <li key={x.id}><Badge tone={x.decision === "approved" ? "green" : "red"}>{x.decision === "approved" ? "Approved" : "Returned"}</Badge> {personLabel(people, x.approver_person_id)} · {fmtDateTime(x.decided_at)}{x.note ? `: ${x.note}` : ""}</li>)}</ul>
            </Section>
          )}
          <Section title="History">
            <ol className="space-y-2 text-sm" data-testid="os-legal-history">
              {(events.data ?? []).map((e) => <li key={e.id}><span className="font-medium">{personLabel(people, e.actor_person_id, "Someone")}</span> {EVENT_LABEL[e.action] ?? e.action}<span className={cn("block text-xs", muted)}>{fmtDateTime(e.at)}{e.note ? ` · ${e.note}` : ""}</span></li>)}
            </ol>
          </Section>
        </aside>
      </div>
      {editing && l && <LetterSheet direction={l.direction} letter={l} onClose={() => { setEditing(false); reload(); }} />}
      {editing && a && <AgreementSheet agreement={a} onClose={() => { setEditing(false); reload(); }} />}
    </div>
  );
}

function Actions({ type, id, actions, onEdit, onDone }: { type: "letter" | "agreement"; id: string; actions: LegalAction[]; onEdit: () => void; onDone: () => void }) {
  const { supabase } = useOsMe();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async (action: LegalAction) => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc(type === "letter" ? "os_letter_act" : "os_agreement_act", { p_id: id, p_action: action, p_note: note || null });
    setBusy(false);
    if (error) return setErr(flError(error.message));
    setNote(""); onDone();
  };
  const needsNote = actions.some((a) => ["return", "void", "terminate", "expire"].includes(a));
  return (
    <Section title="Next step">
      <div className={cn(panel, "space-y-3 p-4")} data-testid="os-legal-actions">
        {needsNote && <Field label="Note" hint="Needed to return, void, terminate or mark expired.">{(fid) => <input id={fid} className={input} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} data-testid="os-legal-note" />}</Field>}
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => a === "edit"
            ? <button key={a} type="button" className={btn} onClick={onEdit}>Edit</button>
            : <button key={a} type="button" disabled={busy} data-testid={`os-legal-${a}`} onClick={() => run(a)} className={["void", "terminate", "return"].includes(a) ? btnDanger : ["approve", "submit"].includes(a) ? btnPrimary : btn}>{ACTION[a]}</button>)}
        </div>
        {actions.includes("approve") && <p className={cn("text-xs", muted)}>Approving issues the next number from the rule. It can&apos;t be undone; a mistake is voided and the number stays in the register.</p>}
        <ErrorLine message={err} />
      </div>
    </Section>
  );
}
