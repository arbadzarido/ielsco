"use client";

// The Legal workspace: letters (outgoing, numbered on approval; incoming, numbered on receipt), agreements, the
// compliance calendar and numbering rules with the number register. Every step is a database function (os_letter_*,
// os_agreement_*, os_compliance_*, os_number_rule_save) that checks who may take it; numbers are only ever issued there.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOsMe } from "./OsProvider";
import { useDirectory, useQuery } from "./data";
import { flError } from "./finance";
import { SheetShell } from "./finance-workspace";
import { CompanySelect, PersonSelect, useDefaultCompany } from "./pickers";
import { Badge, Empty, ErrorLine, Field, Loading, RowList, Section, Select, Stat, btn, btnDanger, btnPrimary, input, muted, panel } from "./ui";
import { addDays, companyName, fmtDate, personLabel, todayJakarta } from "@/lib/os/meta";
import { parseIDR, formatIDR } from "@/lib/os/finance";
import {
  AGREEMENT_COLUMNS, AGREEMENT_KIND, AGREEMENT_STATUS, COMPLIANCE_COLUMNS, LETTER_COLUMNS, LETTER_STATUS, REGISTER_COLUMNS, RULE_COLUMNS, RULE_KIND_LABEL, RULE_PRESETS, TOKENS,
  daysUntil, dueBand, formatNumber, formatProblem, type AgreementRow, type ComplianceRow, type LetterRow, type NumberRule, type RegisterRow, type RuleKind,
} from "@/lib/os/legal";
import { workspaceHref } from "@/lib/os/workspaces";
import { cn } from "@/lib/utils";

export interface LegRoles { ready: boolean; view: boolean; operate: boolean; signer: boolean }
export function useLegRoles(): LegRoles {
  const q = useQuery<{ view: boolean; operate: boolean; signer: boolean }>(async (s) => {
    const [v, o, g] = await Promise.all([s.rpc("os_leg_view"), s.rpc("os_leg_operate"), s.rpc("os_leg_signer")]);
    return { data: { view: v.data === true, operate: o.data === true, signer: g.data === true }, error: null };
  }, []);
  return { ready: Boolean(q.data), view: q.data?.view ?? false, operate: q.data?.operate ?? false, signer: q.data?.signer ?? false };
}
export const useRules = () => useQuery<NumberRule[]>((s) => s.from("os_number_rules").select(RULE_COLUMNS).order("company_code").order("kind").order("type_code"), []);
const useLetters = () => useQuery<LetterRow[]>((s) => s.from("os_letters").select(LETTER_COLUMNS).order("created_at", { ascending: false }).limit(1000), []);
const useAgreements = () => useQuery<AgreementRow[]>((s) => s.from("os_agreements").select(AGREEMENT_COLUMNS).order("created_at", { ascending: false }).limit(1000), []);
const useCompliance = () => useQuery<ComplianceRow[]>((s) => s.from("os_compliance_items").select(COMPLIANCE_COLUMNS).order("due_date").limit(1000), []);

const BAND_TONE = { overdue: "red", "7": "red", "30": "amber", "60": "neutral" } as const;
export function DueBadge({ date }: { date: string | null | undefined }) {
  const today = todayJakarta();
  const band = dueBand(date, today);
  const d = daysUntil(date, today);
  if (!band || d == null) return null;
  return <Badge tone={BAND_TONE[band]}>{band === "overdue" ? `${-d} days overdue` : d === 0 ? "Today" : `In ${d} days`}</Badge>;
}

// ── Overview ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function LegalOverview() {
  const letters = useLetters();
  const agreements = useAgreements();
  const compliance = useCompliance();
  const leg = useLegRoles();
  const today = todayJakarta();
  if (!letters.data || !agreements.data || !compliance.data) return <Loading />;
  const upcoming = [
    ...agreements.data.filter((a) => a.status === "active").flatMap((a) => [
      ...(a.end_date ? [{ key: `${a.id}e`, href: `/os/legal/${a.id}`, title: `${a.title} ends`, date: a.end_date }] : []),
      ...(a.renewal_date ? [{ key: `${a.id}r`, href: `/os/legal/${a.id}`, title: `${a.title} renews`, date: a.renewal_date }] : []),
    ]),
    ...compliance.data.filter((c) => c.status === "open").map((c) => ({ key: c.id, href: workspaceHref("LEG", "compliance"), title: c.title, date: c.due_date })),
  ].filter((x) => (daysUntil(x.date, today) ?? 999) <= 60).sort((a, b) => a.date.localeCompare(b.date));
  const waitingL = letters.data.filter((l) => l.status === "in_review");
  const waitingA = agreements.data.filter((a) => a.status === "under_review");
  return (
    <div className="space-y-6" data-testid="os-leg-overview">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Letters to approve" value={waitingL.length} tone={waitingL.length && leg.signer ? "amber" : undefined} href={workspaceHref("LEG", "letters")} />
        <Stat label="Agreements under review" value={waitingA.length} href={workspaceHref("LEG", "agreements")} />
        <Stat label="Active agreements" value={agreements.data.filter((a) => a.status === "active").length} href={workspaceHref("LEG", "agreements")} />
        <Stat label="Due in 60 days" value={upcoming.length} tone={upcoming.some((u) => u.date < today) ? "red" : undefined} href={workspaceHref("LEG", "compliance")} />
      </div>
      <Section title="Coming up">
        {upcoming.length ? (
          <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-leg-upcoming">
            {upcoming.map((u) => <li key={u.key} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"><a href={u.href} className="min-w-0 flex-1 truncate font-medium hover:underline">{u.title}</a><span className={cn("text-xs", muted)}>{fmtDate(u.date)}</span><DueBadge date={u.date} /></li>)}
          </ul>
        ) : <p className={cn("text-sm", muted)}>Nothing ends, renews or falls due in the next 60 days.</p>}
        <p className={cn("mt-2 text-xs", muted)}>Reminders arrive in notifications 60, 30 and 7 days before, and when something is overdue.</p>
      </Section>
      {leg.signer && waitingL.length > 0 && <Section title="Letters waiting for approval"><LetterList rows={waitingL} /></Section>}
    </div>
  );
}

// ── Letters ───────────────────────────────────────────────────────────────────────────────────────────────────────
export function LetterList({ rows, testId }: { rows: LetterRow[]; testId?: string }) {
  return (
    <RowList rows={rows} rowKey={(l) => l.id} rowHref={(l) => `/os/legal/${l.id}`} testId={testId} empty={<Empty compact title="No letters" />}
      columns={[
        { key: "s", label: "Subject", primary: true, className: "w-[34%]", render: (l) => <span className="truncate">{l.subject}</span> },
        { key: "n", label: "Number", className: "w-56", render: (l) => <span className={cn("text-xs font-medium", l.status === "void" && "line-through")}>{l.number ?? "Not numbered yet"}</span> },
        { key: "c", label: "Other party", className: "w-40", hideOnMobile: true, render: (l) => <span className="truncate text-xs">{l.direction === "incoming" ? "From" : "To"} {l.counterparty}</span> },
        { key: "t", label: "Status", className: "w-40", render: (l) => <Badge tone={LETTER_STATUS[l.status].tone}>{LETTER_STATUS[l.status].label}</Badge> },
        { key: "d", label: "Date", className: "w-24", render: (l) => <span className="text-xs">{fmtDate(l.received_date ?? l.letter_date)}</span> },
      ]} />
  );
}

export function LegalLetters() {
  const letters = useLetters();
  const leg = useLegRoles();
  const [sheet, setSheet] = useState<"outgoing" | "incoming" | null>(null);
  const [company, setCompany] = useState("");
  const rows = (letters.data ?? []).filter((l) => !company || l.company_code === company);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {leg.operate && <button type="button" className={btnPrimary} onClick={() => setSheet("outgoing")} data-testid="os-letter-new">Draft an outgoing letter</button>}
        {leg.operate && <button type="button" className={btn} onClick={() => setSheet("incoming")} data-testid="os-letter-incoming">Register an incoming letter</button>}
        <div className="ml-auto w-48"><Select ariaLabel="Company" value={company} onChange={setCompany} placeholder="All companies" options={[{ value: "IEL", label: "IELSco" }, { value: "ELC", label: "Elco AI" }, { value: "HQ", label: "HQ" }]} /></div>
      </div>
      <ErrorLine message={letters.error} />
      <Section title="Outgoing">{letters.data ? <LetterList rows={rows.filter((l) => l.direction === "outgoing")} testId="os-letters-out" /> : <Loading />}</Section>
      <Section title="Incoming">{letters.data ? <LetterList rows={rows.filter((l) => l.direction === "incoming")} testId="os-letters-in" /> : <Loading />}</Section>
      {sheet && <LetterSheet direction={sheet} onClose={() => { setSheet(null); letters.reload(); }} />}
    </div>
  );
}

export function LetterSheet({ direction, onClose, letter }: { direction: "outgoing" | "incoming"; onClose: () => void; letter?: LetterRow }) {
  const { supabase } = useOsMe();
  const router = useRouter();
  const dir = useDirectory();
  const rules = useRules();
  const company0 = useDefaultCompany();
  const today = todayJakarta();
  const legDiv = (dir?.divisions ?? []).find((d) => d.code === "LEG")?.id ?? "";
  const [company, setCompany] = useState(letter?.company_code ?? (company0 === "HQ" ? "IEL" : company0));
  // Until the person picks one, the issuing division is Legal (the directory may load after the form opens).
  const [divisionPick, setDivision] = useState<string | null>(letter ? letter.division_id ?? "" : null);
  const division = divisionPick ?? legDiv;
  const [rule, setRule] = useState(letter?.rule_id ?? "");
  const [subject, setSubject] = useState(letter?.subject ?? "");
  const [counterparty, setCounterparty] = useState(letter?.counterparty ?? "");
  const [date, setDate] = useState(letter?.letter_date ?? today);
  const [received, setReceived] = useState(today);
  const [sensitivity, setSensitivity] = useState(letter?.sensitivity ?? "Internal");
  const [related, setRelated] = useState(letter?.related_type && letter.related_id ? `${letter.related_type}:${letter.related_id}` : "");
  const [notes, setNotes] = useState(letter?.notes ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const kinds: RuleKind[] = direction === "incoming" ? ["incoming_letter"] : ["outgoing_letter", "memorandum", "other"];
  const options = (rules.data ?? []).filter((r) => r.active && r.company_code === company && kinds.includes(r.kind));
  const chosen = options.find((r) => r.id === rule) ?? (options.length === 1 ? options[0] : undefined);
  const save = async () => {
    setBusy(true); setErr(null);
    const [rt, rid] = related ? related.split(":") : [null, null];
    const { data, error } = await supabase.rpc("os_letter_save", { p_id: letter?.id ?? null, p_direction: direction, p_company: company, p_division: division || null, p_rule: chosen?.id ?? null,
      p_subject: subject, p_counterparty: counterparty, p_letter_date: date || null, p_received_date: direction === "incoming" ? received : null, p_sensitivity: sensitivity,
      p_related_type: rt, p_related_id: rid, p_notes: notes || null });
    setBusy(false);
    if (error) return setErr(flError(error.message));
    onClose(); if (!letter) router.push(`/os/legal/${data}`);
  };
  return (
    <SheetShell title={letter ? "Edit letter" : direction === "incoming" ? "Register an incoming letter" : "Draft an outgoing letter"} onClose={onClose} onSave={save}
      disabled={busy || !chosen || subject.trim().length < 3 || !counterparty.trim()} saveLabel={letter ? "Save" : direction === "incoming" ? "Register and number" : "Save draft"}>
      <p className={cn("text-xs", muted)}>{direction === "incoming" ? "It gets the next incoming number as soon as it's registered." : "The number is generated when a signatory approves it, never before."}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company">{(id) => <CompanySelect id={id} value={company} onChange={(v) => { setCompany(v); setRule(""); }} />}</Field>
        <Field label="Numbering rule">{(id) => <Select id={id} value={chosen?.id ?? ""} onChange={setRule} placeholder={options.length ? "Choose a rule" : "No rule set up for this company"} options={options.map((r) => ({ value: r.id, label: `${r.type_code} · ${r.name}` }))} />}</Field>
        <Field label="Issuing division" hint="Used for {division} in the number.">{(id) => <Select id={id} value={division} onChange={setDivision} placeholder="None" options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))} />}</Field>
        <Field label="Sensitivity">{(id) => <Select id={id} value={sensitivity} onChange={setSensitivity} options={["Internal", "Confidential", "Restricted"]} />}</Field>
      </div>
      {chosen && <p className={cn("text-xs", muted)}>Numbers look like <span className="font-medium text-[#1F2D3D]">{formatNumber(chosen.format, { company, type: chosen.type_code, division: dir?.divisionById.get(division)?.code ?? null, date: today, seq: 7 })}</span></p>}
      <Field label="Subject">{(id) => <input id={id} className={input} value={subject} maxLength={300} onChange={(e) => setSubject(e.target.value)} />}</Field>
      <Field label={direction === "incoming" ? "From" : "To"}>{(id) => <input id={id} className={input} value={counterparty} maxLength={200} onChange={(e) => setCounterparty(e.target.value)} />}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Letter date">{(id) => <input id={id} type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        {direction === "incoming" && <Field label="Received on">{(id) => <input id={id} type="date" className={input} value={received} max={today} onChange={(e) => setReceived(e.target.value)} />}</Field>}
      </div>
      <RelatedSelect value={related} onChange={setRelated} company={company} requests />
      <Field label="Notes">{(id) => <textarea id={id} className={cn(input, "min-h-16")} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />}</Field>
      <p className={cn("text-xs", muted)}>Keep the letter itself in Google Drive and link it from the letter&apos;s page.</p>
      <ErrorLine message={err} />
    </SheetShell>
  );
}

/** Link a Legal record to a project or partnership the viewer can see. */
export function RelatedSelect({ value, onChange, company, requests }: { value: string; onChange: (v: string) => void; company: string; requests?: boolean }) {
  const reqs = useQuery<{ id: string; title: string }[]>((s) => (requests ? s.from("os_requests").select("id, title").eq("company_code", company).in("type_code", ["contract_review", "employment_document"]).order("created_at", { ascending: false }).limit(100) : Promise.resolve({ data: [], error: null })) as never, [company, requests]);
  const projects = useQuery<{ id: string; name: string }[]>((s) => s.from("os_projects").select("id, name").eq("company_code", company).order("name").limit(300), [company]);
  const partners = useQuery<{ id: string; organisation: string }[]>((s) => s.from("os_partnerships").select("id, organisation").eq("company_code", company).order("organisation").limit(300), [company]);
  return (
    <Field label="About">{(id) => <Select id={id} value={value} onChange={onChange} placeholder="Not linked" options={[
      ...(reqs.data ?? []).map((r) => ({ value: `request:${r.id}`, label: `Request · ${r.id} ${r.title}` })),
      ...(partners.data ?? []).map((p) => ({ value: `partnership:${p.id}`, label: `Partnership · ${p.organisation}` })),
      ...(projects.data ?? []).map((p) => ({ value: `project:${p.id}`, label: `Project · ${p.name}` })),
    ]} />}</Field>
  );
}

// ── Agreements ────────────────────────────────────────────────────────────────────────────────────────────────────
export function AgreementList({ rows, testId }: { rows: AgreementRow[]; testId?: string }) {
  return (
    <RowList rows={rows} rowKey={(a) => a.id} rowHref={(a) => `/os/legal/${a.id}`} testId={testId} empty={<Empty compact title="No agreements" />}
      columns={[
        { key: "t", label: "Agreement", primary: true, className: "w-[32%]", render: (a) => <span className="truncate">{a.title}</span> },
        { key: "k", label: "Type", className: "w-20", render: (a) => <span className="text-xs">{AGREEMENT_KIND[a.kind]}</span> },
        { key: "p", label: "With", className: "w-40", hideOnMobile: true, render: (a) => <span className="truncate text-xs">{a.counterparty}</span> },
        { key: "s", label: "Status", className: "w-28", render: (a) => <Badge tone={AGREEMENT_STATUS[a.status].tone}>{AGREEMENT_STATUS[a.status].label}</Badge> },
        { key: "e", label: "Ends", className: "w-44", render: (a) => <span className="flex items-center gap-1 text-xs">{fmtDate(a.end_date)}{a.status === "active" && <DueBadge date={a.end_date} />}</span> },
      ]} />
  );
}

export function LegalAgreements() {
  const rows = useAgreements();
  const leg = useLegRoles();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const shown = (rows.data ?? []).filter((a) => !status || a.status === status);
  return (
    <Section title="Agreements, contracts, MoUs and NDAs" action={leg.operate ? <button type="button" className={btnPrimary} onClick={() => setCreating(true)} data-testid="os-agreement-new">New agreement</button> : undefined}>
      <div className="mb-3 w-56"><Select ariaLabel="Status" value={status} onChange={setStatus} placeholder="Any status" options={Object.entries(AGREEMENT_STATUS).map(([k, v]) => ({ value: k, label: v.label }))} /></div>
      <ErrorLine message={rows.error} />
      {rows.data ? <AgreementList rows={shown} testId="os-agreements" /> : <Loading />}
      {creating && <AgreementSheet onClose={() => { setCreating(false); rows.reload(); }} />}
    </Section>
  );
}

export function AgreementSheet({ onClose, agreement }: { onClose: () => void; agreement?: AgreementRow }) {
  const { supabase } = useOsMe();
  const router = useRouter();
  const dir = useDirectory();
  const rules = useRules();
  const company0 = useDefaultCompany();
  const a = agreement;
  const [kind, setKind] = useState<string>(a?.kind ?? "mou");
  const [company, setCompany] = useState(a?.company_code ?? (company0 === "HQ" ? "IEL" : company0));
  const [division, setDivision] = useState(a?.division_id ?? "");
  const [title, setTitle] = useState(a?.title ?? "");
  const [counterparty, setCounterparty] = useState(a?.counterparty ?? "");
  const [start, setStart] = useState(a?.start_date ?? "");
  const [end, setEnd] = useState(a?.end_date ?? "");
  const [renewal, setRenewal] = useState(a?.renewal_date ?? "");
  const [notice, setNotice] = useState(a?.notice_days != null ? String(a.notice_days) : "");
  const [autoRenew, setAutoRenew] = useState(a?.auto_renew ?? false);
  const [value, setValue] = useState(a?.value_amount ? String(a.value_amount) : "");
  const [owner, setOwner] = useState(a?.owner_person_id ?? "");
  const [rule, setRule] = useState(a?.rule_id ?? "");
  const [sensitivity, setSensitivity] = useState(a?.sensitivity ?? "Confidential");
  const [related, setRelated] = useState(a?.related_type && a.related_id ? `${a.related_type}:${a.related_id}` : "");
  const [notes, setNotes] = useState(a?.notes ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = (rules.data ?? []).filter((r) => r.active && r.company_code === company && ["agreement", "memorandum", "other"].includes(r.kind));
  const locked = a?.status === "active";
  const save = async () => {
    setBusy(true); setErr(null);
    const [rt, rid] = related ? related.split(":") : [null, null];
    const { data, error } = await supabase.rpc("os_agreement_save", { p_id: a?.id ?? null, p_kind: kind, p_company: company, p_division: division || null, p_title: title, p_counterparty: counterparty,
      p_start: start || null, p_end: end || null, p_renewal: renewal || null, p_notice_days: notice ? Number(notice) : null, p_auto_renew: autoRenew,
      p_value: value ? parseIDR(value) : null, p_owner: owner || null, p_rule: rule || null, p_sensitivity: sensitivity, p_related_type: rt, p_related_id: rid, p_notes: notes || null });
    setBusy(false);
    if (error) return setErr(flError(error.message));
    onClose(); if (!a) router.push(`/os/legal/${data}`);
  };
  return (
    <SheetShell title={a ? "Edit agreement" : "New agreement"} onClose={onClose} onSave={save} disabled={busy || title.trim().length < 3 || !counterparty.trim() || (Boolean(value) && !parseIDR(value))}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type">{(id) => <Select id={id} value={kind} onChange={setKind} disabled={locked} options={Object.entries(AGREEMENT_KIND).map(([k, v]) => ({ value: k, label: v }))} />}</Field>
        <Field label="Company">{(id) => locked ? <input id={id} className={input} value={companyName(company)} disabled /> : <CompanySelect id={id} value={company} onChange={(v) => { setCompany(v); setRule(""); }} />}</Field>
      </div>
      <Field label="Title">{(id) => <input id={id} className={input} value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label="With (other party)">{(id) => <input id={id} className={input} value={counterparty} maxLength={200} disabled={locked} onChange={(e) => setCounterparty(e.target.value)} />}</Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Starts">{(id) => <input id={id} type="date" className={input} value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
        <Field label="Ends">{(id) => <input id={id} type="date" className={input} value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />}</Field>
        <Field label="Renewal date">{(id) => <input id={id} type="date" className={input} value={renewal} onChange={(e) => setRenewal(e.target.value)} />}</Field>
        <Field label="Notice (days)">{(id) => <input id={id} className={input} inputMode="numeric" value={notice} onChange={(e) => setNotice(e.target.value.replace(/\D/g, ""))} />}</Field>
        <Field label="Value (IDR)" hint={value && parseIDR(value) ? formatIDR(parseIDR(value)) : undefined}>{(id) => <input id={id} className={input} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} />}</Field>
        <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} /> Renews automatically</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Owner" hint="Gets the expiry reminders.">{(id) => <PersonSelect id={id} value={owner} onChange={setOwner} placeholder="No owner" />}</Field>
        <Field label="Division">{(id) => <Select id={id} value={division} onChange={setDivision} placeholder="None" options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: `${d.code} · ${d.name}` }))} />}</Field>
        <Field label="Numbering rule" hint="Numbered when a signatory approves it.">{(id) => <Select id={id} value={rule} onChange={setRule} disabled={locked} placeholder="No number" options={options.map((r) => ({ value: r.id, label: `${r.type_code} · ${r.name}` }))} />}</Field>
        <Field label="Sensitivity">{(id) => <Select id={id} value={sensitivity} onChange={setSensitivity} options={["Internal", "Confidential", "Restricted"]} />}</Field>
      </div>
      <RelatedSelect value={related} onChange={setRelated} company={company} requests />
      <Field label="Notes">{(id) => <textarea id={id} className={cn(input, "min-h-16")} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />}</Field>
      <ErrorLine message={err} />
    </SheetShell>
  );
}

// ── Compliance calendar ───────────────────────────────────────────────────────────────────────────────────────────
export function LegalCompliance() {
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const rows = useCompliance();
  const agreements = useAgreements();
  const leg = useLegRoles();
  const company0 = useDefaultCompany();
  const today = todayJakarta();
  const [show, setShow] = useState("open");
  const [form, setForm] = useState({ company: company0 === "HQ" ? "IEL" : company0, title: "", due: addDays(today, 30), recurrence: "none", owner: "", agreement: "", notes: "" });
  const [note, setNote] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const add = async () => {
    setErr(null);
    const { error } = await supabase.rpc("os_compliance_save", { p_id: null, p_company: form.company, p_title: form.title, p_due: form.due, p_recurrence: form.recurrence, p_owner: form.owner || null, p_agreement: form.agreement || null, p_notes: form.notes || null });
    if (error) return setErr(flError(error.message));
    setForm({ ...form, title: "", notes: "" }); rows.reload();
  };
  const act = async (id: string, action: string) => {
    setErr(null);
    const { error } = await supabase.rpc("os_compliance_act", { p_id: id, p_action: action, p_note: note[id] || null });
    if (error) return setErr(flError(error.message));
    rows.reload();
  };
  const shown = (rows.data ?? []).filter((c) => !show || c.status === show);
  return (
    <div className="space-y-6">
      <Section title="Compliance and renewal calendar">
        <div className="mb-3 w-48"><Select ariaLabel="Show" value={show} onChange={setShow} placeholder="All" options={[{ value: "open", label: "Open" }, { value: "done", label: "Done" }, { value: "waived", label: "Waived" }]} /></div>
        <ErrorLine message={err} />
        {rows.data ? shown.length ? (
          <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-compliance">
            {shown.map((c) => (
              <li key={c.id} className="space-y-2 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{c.title}</span><span className={cn("text-xs", muted)}>{c.id} · {c.company_code} · due {fmtDate(c.due_date)}{c.recurrence !== "none" ? ` · repeats ${c.recurrence}` : ""} · {personLabel(dir?.peopleById ?? new Map(), c.owner_person_id, "No owner")}</span>
                  {c.status === "open" ? <DueBadge date={c.due_date} /> : <Badge tone={c.status === "done" ? "green" : "neutral"}>{c.status === "done" ? "Done" : "Waived"}</Badge>}</div>
                {c.notes && <p className={cn("text-xs", muted)}>{c.notes}</p>}
                {c.status === "open" && (leg.operate || c.owner_person_id) && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input aria-label={`Note for ${c.id}`} className={cn(input, "sm:flex-1")} placeholder="Note (needed to waive)" value={note[c.id] ?? ""} onChange={(e) => setNote({ ...note, [c.id]: e.target.value })} />
                    <button type="button" className={btnPrimary} onClick={() => act(c.id, "done")} data-testid={`os-compliance-done-${c.id}`}>{c.recurrence === "none" ? "Mark done" : "Done, schedule next"}</button>
                    <button type="button" className={btnDanger} onClick={() => act(c.id, "waive")}>Waive</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <Empty compact title="Nothing here" /> : <Loading />}
      </Section>
      {leg.operate && (
        <Section title="Add a deadline">
          <form className={cn(panel, "grid gap-3 p-4 sm:grid-cols-3")} onSubmit={(e) => { e.preventDefault(); add(); }} data-testid="os-compliance-form">
            <Field label="What" className="sm:col-span-2">{(id) => <input id={id} className={input} value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Annual tax report" />}</Field>
            <Field label="Company">{(id) => <CompanySelect id={id} value={form.company} onChange={(v) => setForm({ ...form, company: v })} />}</Field>
            <Field label="Due">{(id) => <input id={id} type="date" className={input} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />}</Field>
            <Field label="Repeats">{(id) => <Select id={id} value={form.recurrence} onChange={(v) => setForm({ ...form, recurrence: v })} options={[{ value: "none", label: "Once" }, { value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly" }, { value: "yearly", label: "Yearly" }]} />}</Field>
            <Field label="Owner">{(id) => <PersonSelect id={id} value={form.owner} onChange={(v) => setForm({ ...form, owner: v })} placeholder="No owner" />}</Field>
            <Field label="Agreement" className="sm:col-span-2">{(id) => <Select id={id} value={form.agreement} onChange={(v) => setForm({ ...form, agreement: v })} placeholder="None" options={(agreements.data ?? []).map((a) => ({ value: a.id, label: `${a.number ?? a.id} · ${a.title}` }))} />}</Field>
            <div className="flex items-end"><button type="submit" className={btnPrimary} disabled={form.title.trim().length < 3 || !form.due}>Add</button></div>
          </form>
        </Section>
      )}
    </div>
  );
}

// ── Numbering rules and the register ──────────────────────────────────────────────────────────────────────────────
export function LegalNumbering() {
  const { me } = useOsMe();
  const founder = me.person.org_role === "founder";
  const rules = useRules();
  const register = useQuery<RegisterRow[]>((s) => s.from("os_number_register").select(REGISTER_COLUMNS).order("issued_at", { ascending: false }).limit(500), []);
  const dir = useDirectory();
  const [editing, setEditing] = useState<NumberRule | "new" | null>(null);
  const [q, setQ] = useState("");
  const today = todayJakarta();
  const shownReg = (register.data ?? []).filter((r) => !q || r.number.toLowerCase().includes(q.toLowerCase()) || r.entity_id.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <Section title="Numbering rules" action={founder ? <button type="button" className={btnPrimary} onClick={() => setEditing("new")} data-testid="os-rule-new">Add a rule</button> : undefined}>
        <p className={cn("mb-2 text-xs", muted)}>Each rule has its own sequence per company. Numbers are generated by the system after approval, are never reused, and a voided number stays in the register.
          {founder ? "" : " Founders set up the rules."}</p>
        <ErrorLine message={rules.error} />
        {rules.data ? rules.data.length ? (
          <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-rules">
            {rules.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-3 text-sm">
                <span className="min-w-0 flex-1"><span className="font-medium">{r.name}</span> <span className={cn("text-xs", muted)}>{companyName(r.company_code)} · {RULE_KIND_LABEL[r.kind]} · restarts {r.reset === "never" ? "never" : r.reset === "yearly" ? "every year" : "every month"}</span>
                  <span className="block break-all text-xs"><code>{r.format}</code> → {formatNumber(r.format, { company: r.company_code, type: r.type_code, division: "LEG", date: today, seq: 7 })}</span></span>
                {!r.active && <Badge>Inactive</Badge>}
                {founder && <button type="button" className={btn} onClick={() => setEditing(r)}>Edit</button>}
              </li>
            ))}
          </ul>
        ) : <Empty compact title="No rules yet" /> : <Loading />}
      </Section>
      <Section title="Number register">
        <div className="mb-3 max-w-xs"><input aria-label="Search the register" className={input} placeholder="Search numbers" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {register.data ? shownReg.length ? (
          <div className={cn(panel, "overflow-x-auto")}>
            <table className="w-full min-w-[560px] text-sm" data-testid="os-register">
              <thead className="border-b border-[#E6E9EE] bg-[#FAFBFC] text-left text-xs text-[#66768A]"><tr>{["Number", "For", "Issued", "By", "Status"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{shownReg.map((r) => (
                <tr key={r.id} className="border-b border-[#F0F2F5]">
                  <td className={cn("break-all px-3 py-2 font-medium", r.status === "void" && "line-through")}>{r.number}</td>
                  <td className="px-3 py-2"><a className="underline" href={`/os/legal/${r.entity_id}`}>{r.entity_id}</a></td>
                  <td className="px-3 py-2 text-xs">{fmtDate(r.issued_at.slice(0, 10))}</td>
                  <td className="px-3 py-2 text-xs">{personLabel(dir?.peopleById ?? new Map(), r.issued_by, "System")}</td>
                  <td className="px-3 py-2">{r.status === "void" ? <span title={r.void_reason ?? ""}><Badge tone="red">Void</Badge> <span className={cn("text-xs", muted)}>{r.void_reason}</span></span> : <Badge tone="green">Issued</Badge>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <Empty compact title="No numbers issued yet" /> : <Loading />}
      </Section>
      {editing && <RuleSheet rule={editing === "new" ? undefined : editing} onClose={() => { setEditing(null); rules.reload(); }} />}
    </div>
  );
}

function RuleSheet({ rule, onClose }: { rule?: NumberRule; onClose: () => void }) {
  const { supabase } = useOsMe();
  const today = todayJakarta();
  const [company, setCompany] = useState(rule?.company_code ?? "IEL");
  const [kind, setKind] = useState<RuleKind>(rule?.kind ?? "incoming_letter");
  const [type, setType] = useState(rule?.type_code ?? "");
  const [name, setName] = useState(rule?.name ?? "");
  const [format, setFormat] = useState(rule?.format ?? "{company}/{type}/{division}/{month_roman}/{year}/{seq:3}");
  const [reset, setReset] = useState<NumberRule["reset"]>(rule?.reset ?? "yearly");
  const [active, setActive] = useState(rule?.active ?? true);
  const [err, setErr] = useState<string | null>(null);
  const problem = formatProblem(format, reset);
  const save = async () => {
    setErr(null);
    const { error } = await supabase.rpc("os_number_rule_save", { p_id: rule?.id ?? null, p_company: company, p_kind: kind, p_type: type, p_name: name, p_format: format, p_reset: reset, p_active: active });
    if (error) return setErr(/duplicate/.test(error.message) ? "This company already has a rule with that type code." : flError(error.message));
    onClose();
  };
  return (
    <SheetShell title={rule ? "Edit numbering rule" : "Add a numbering rule"} onClose={onClose} onSave={save} disabled={Boolean(problem) || !/^[A-Z0-9][A-Z0-9.-]{0,11}$/.test(type.toUpperCase()) || !name.trim()}>
      {!rule && (
        <div className="flex flex-wrap gap-2" aria-label="Starting points">
          {RULE_PRESETS.map((p) => <button key={p.type_code} type="button" className={btn} onClick={() => { setKind(p.kind); setType(p.type_code); setName(p.name); setFormat(p.format); setReset(p.reset); }}>{p.type_code}</button>)}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company">{(id) => rule ? <input id={id} className={input} disabled value={companyName(company)} /> : <CompanySelect id={id} value={company} onChange={setCompany} />}</Field>
        <Field label="For">{(id) => <Select id={id} value={kind} onChange={(v) => setKind(v as RuleKind)} disabled={Boolean(rule)} options={Object.entries(RULE_KIND_LABEL).map(([k, v]) => ({ value: k, label: v }))} />}</Field>
        <Field label="Type code" hint="Letters and numbers, e.g. SK">{(id) => <input id={id} className={input} value={type} disabled={Boolean(rule)} maxLength={12} onChange={(e) => setType(e.target.value.toUpperCase())} />}</Field>
        <Field label="Name">{(id) => <input id={id} className={input} value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />}</Field>
      </div>
      <Field label="Format" hint={`Tokens: ${TOKENS.join(" ")}`}>{(id) => <input id={id} className={input} value={format} maxLength={120} onChange={(e) => setFormat(e.target.value)} data-testid="os-rule-format" />}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sequence restarts">{(id) => <Select id={id} value={reset} onChange={(v) => setReset(v as NumberRule["reset"])} options={[{ value: "yearly", label: "Every year" }, { value: "monthly", label: "Every month" }, { value: "never", label: "Never" }]} />}</Field>
        <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
      </div>
      {problem ? <ErrorLine message={problem} /> : <p className="break-all text-sm" data-testid="os-rule-preview">Preview: <span className="font-semibold">{formatNumber(format, { company, type: type || "XX", division: "LEG", date: today, seq: 7 })}</span></p>}
      {rule && <p className={cn("text-xs", muted)}>Changing the format applies to new numbers only. Numbers already issued keep their text, and the sequence carries on.</p>}
      <ErrorLine message={err} />
    </SheetShell>
  );
}

