"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { EntityFeed } from "@/components/os/feed";
import { LinkedDocuments } from "@/components/os/linked-docs";
import { Money, flError, useCategories, useFinRoles } from "@/components/os/finance";
import { Badge, Empty, ErrorLine, Field, KeyValue, Loading, PageTitle, Section, Select, btn, btnDanger, btnPrimary, input, muted, panel } from "@/components/os/ui";
import { companyName, fmtDate, fmtDateTime, personLabel, todayJakarta } from "@/lib/os/meta";
import { ACTION_LABEL, EVENT_LABEL, KIND_LABEL, PAYMENT_METHODS, TRX_COLUMNS, finActions, formatIDR, parseIDR, trxStage, type FinAction, type TrxRow } from "@/lib/os/finance";
import { cn } from "@/lib/utils";

type Event = { id: number; at: string; actor_person_id: string | null; action: string; from_status: string | null; to_status: string | null; note: string | null };
type Approval = { id: string; approver_person_id: string; decision: string; note: string | null; decided_at: string };
type Payment = { id: string; account_id: string | null; payment_reference: string | null; statement_reference: string | null };
type Account = { id: string; company_code: string; name: string; kind: string; institution: string | null; account_last4: string | null; active: boolean };

export default function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { me } = useOsMe();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const fin = useFinRoles();
  const trx = useQuery<TrxRow | null>((s) => s.from("os_fin_transactions").select(TRX_COLUMNS).eq("id", id).maybeSingle(), [id]);
  const events = useQuery<Event[]>((s) => s.from("os_record_events").select("id, at, actor_person_id, action, from_status, to_status, note").eq("entity_type", "transaction").eq("entity_id", id).order("id"), [id]);
  const approvals = useQuery<Approval[]>((s) => s.from("os_approvals").select("id, approver_person_id, decision, note, decided_at").eq("entity_type", "transaction").eq("entity_id", id).order("decided_at"), [id]);
  const pay = useQuery<Payment[]>((s) => (fin.view ? s.rpc("os_fin_payment_details", { p_ids: [id] }) : Promise.resolve({ data: [], error: null })) as never, [id, fin.view]);
  const cats = useCategories();
  const [docsKey, setDocsKey] = useState(0);
  const reload = () => { trx.reload(); events.reload(); approvals.reload(); pay.reload(); setDocsKey((k) => k + 1); };

  if (trx.loading && !trx.data) return <Loading />;
  const t = trx.data;
  if (!t) return <Empty title="Not found" body="It doesn't exist, or you don't have access to it." action={<Link href="/os/finance" className={btn}>Back</Link>} />;
  const stage = trxStage(t);
  const actions = fin.ready ? finActions(t, { personId: me.person.id, founder: me.person.org_role === "founder", approver: fin.approver, operator: fin.operate }) : [];
  const p = pay.data?.[0];
  const division = dir?.divisionById.get(t.division_id ?? "")?.name ?? "Company-wide";

  return (
    <div data-testid="os-trx-page">
      <PageTitle crumbs={[fin.view ? { href: "/os/d/fin?tab=ledger", label: "Finance" } : { href: "/os/finance", label: "Expenses and income" }]} title={t.description}
        description={<span>{t.id} · {KIND_LABEL[t.kind]} · {companyName(t.company_code)} · {division}</span>}
        actions={<Badge tone={stage.tone}>{stage.label}</Badge>} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div className={cn(panel, "p-4")}>
            <p className="text-xs font-medium text-[#66768A]">{t.kind === "income" ? "Amount in" : "Amount out"}</p>
            <p className="mt-1 text-3xl font-semibold" data-testid="os-trx-amount"><Money value={t.amount} /></p>
            <Steps t={t} />
          </div>
          {actions.length > 0 && <Actions t={t} actions={actions} onDone={reload} />}
          <Section title="Receipts and invoices">
            <p className={cn("mb-2 text-xs", muted)}>Files stay in Google Drive. Register the receipt&apos;s Drive link here; Finance and you can open it, nobody else.</p>
            <AddReceipt t={t} onDone={reload} />
            <div className="mt-3"><LinkedDocuments key={docsKey} type="transaction" id={t.id} /></div>
          </Section>
          <EntityFeed type="transaction" id={t.id} />
        </div>
        <aside className="space-y-6">
          <KeyValue items={[
            { label: "Asked by", value: personLabel(people, t.requested_by) },
            ...(t.payee_person_id ? [{ label: "Paid back to", value: personLabel(people, t.payee_person_id) }] : []),
            { label: t.kind === "income" ? "From" : "Paid to", value: t.counterparty ?? "—" },
            { label: "Date", value: fmtDate(t.txn_date) },
            ...(t.due_date ? [{ label: t.kind === "income" ? "Expected by" : "Due", value: fmtDate(t.due_date) }] : []),
            { label: "Category", value: (cats.data ?? []).find((c) => c.code === t.category_code)?.name ?? t.category_code ?? "—" },
            { label: "Project", value: t.project_id ? <Link className="underline" href={`/os/projects/${t.project_id}`}>{t.project_id}</Link> : "—" },
            { label: "Request", value: t.request_id ? <Link className="underline" href={`/os/requests/${t.request_id}`}>{t.request_id}</Link> : "—" },
            ...(t.budget_id ? [{ label: "Budget", value: t.budget_id }] : []),
            ...(t.settled_on ? [{ label: t.kind === "income" ? "Received on" : "Paid on", value: fmtDate(t.settled_on) }] : []),
            ...(t.payment_method ? [{ label: "Method", value: PAYMENT_METHODS.find((m) => m.value === t.payment_method)?.label ?? t.payment_method }] : []),
            ...(p?.payment_reference ? [{ label: "Payment reference", value: p.payment_reference }] : []),
            ...(p?.statement_reference ? [{ label: "Statement reference", value: p.statement_reference }] : []),
            ...(t.closed_reason ? [{ label: t.status === "rejected" ? "Reason rejected" : "Reason", value: t.closed_reason }] : []),
          ]} />
          {!!approvals.data?.length && (
            <Section title="Approvals">
              <ul className="space-y-2 text-sm">{approvals.data.map((a) => <li key={a.id}><Badge tone={a.decision === "approved" ? "green" : "red"}>{a.decision === "approved" ? "Approved" : "Rejected"}</Badge> {personLabel(people, a.approver_person_id)} · {fmtDateTime(a.decided_at)}{a.note ? `: ${a.note}` : ""}</li>)}</ul>
            </Section>
          )}
          <Section title="History">
            <ol className="space-y-2 text-sm" data-testid="os-trx-history">
              {(events.data ?? []).map((e) => <li key={e.id}><span className="font-medium">{personLabel(people, e.actor_person_id, "Someone")}</span> {EVENT_LABEL[e.action] ?? e.action}<span className={cn("block text-xs", muted)}>{fmtDateTime(e.at)}{e.note ? ` · ${e.note}` : ""}</span></li>)}
            </ol>
          </Section>
        </aside>
      </div>
    </div>
  );
}

/** The path this line takes, with the current step marked, so approved is never mistaken for paid. */
function Steps({ t }: { t: TrxRow }) {
  const path = t.kind === "income" ? ["requested", "verified", "received", "reconciled"] : ["requested", "approved", "verified", "paid", "reconciled"];
  const label: Record<string, string> = { requested: t.kind === "income" ? "Reported" : "Requested", approved: "Approved", verified: "Verified", paid: "Paid", received: "Received", reconciled: "Reconciled" };
  const at = path.indexOf(t.status);
  if (at < 0) return <p className="mt-3 text-sm font-medium text-[#A12D2F]">{t.status === "rejected" ? "Rejected" : "Cancelled"}. Nothing will be paid or counted.</p>;
  return (
    <ol className="mt-3 flex flex-wrap gap-x-1 gap-y-2 text-xs" aria-label="Progress">
      {path.map((s, i) => (
        <li key={s} className={cn("rounded-full px-2 py-0.5", i < at ? "bg-[#E7F1EC] text-[#1D6B4F]" : i === at ? "bg-[#2F4157] font-semibold text-white" : "bg-[#EEF1F5] text-[#66768A]")} aria-current={i === at ? "step" : undefined}>{label[s]}</li>
      ))}
    </ol>
  );
}

function Actions({ t, actions, onDone }: { t: TrxRow; actions: FinAction[]; onDone: () => void }) {
  const { supabase } = useOsMe();
  const today = todayJakarta();
  const [note, setNote] = useState("");
  const [on, setOn] = useState(today);
  const [method, setMethod] = useState("transfer");
  const [account, setAccount] = useState("");
  const [ref, setRef] = useState("");
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(t.amount));
  const [desc, setDesc] = useState(t.description);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const settling = actions.includes("pay") || actions.includes("receive");
  const accounts = useQuery<Account[]>((s) => (settling ? s.from("os_fin_accounts").select("id, company_code, name, kind, institution, account_last4, active").eq("company_code", t.company_code).eq("active", true) : Promise.resolve({ data: [], error: null })) as never, [settling, t.company_code]);
  const run = async (action: FinAction) => {
    setBusy(true); setErr(null);
    const { error } = action === "edit"
      ? await supabase.rpc("os_fin_update", { p_id: t.id, p_amount: parseIDR(amount), p_txn_date: t.txn_date, p_description: desc, p_category: t.category_code, p_counterparty: t.counterparty, p_due: t.due_date })
      : await supabase.rpc("os_fin_act", { p_id: t.id, p_action: action, p_note: note || null, p_settled_on: ["pay", "receive"].includes(action) ? on : null,
          p_method: ["pay", "receive"].includes(action) ? method : null, p_account: account || null, p_reference: ref || null });
    setBusy(false);
    if (error) return setErr(flError(error.message));
    setNote(""); setRef(""); setEditing(false); onDone();
  };
  const buttons = actions.filter((a) => a !== "edit");
  return (
    <Section title="Next step">
      <div className={cn(panel, "space-y-3 p-4")} data-testid="os-trx-actions">
        {editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="What it's for">{(id) => <input id={id} className={input} value={desc} onChange={(e) => setDesc(e.target.value)} />}</Field>
            <Field label="Amount (IDR)" hint={parseIDR(amount) ? formatIDR(parseIDR(amount)) : "Whole rupiah"}>{(id) => <input id={id} className={input} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
            <div className="flex gap-2 sm:col-span-2"><button type="button" className={btnPrimary} disabled={busy || !parseIDR(amount)} onClick={() => run("edit")}>Save</button><button type="button" className={btn} onClick={() => setEditing(false)}>Cancel</button></div>
          </div>
        ) : (
          <>
            {settling && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={actions.includes("pay") ? "Paid on" : "Received on"}>{(id) => <input id={id} type="date" className={input} value={on} max={today} onChange={(e) => setOn(e.target.value)} />}</Field>
                <Field label="Method">{(id) => <Select id={id} value={method} onChange={setMethod} options={PAYMENT_METHODS} />}</Field>
                <Field label="Account">{(id) => <Select id={id} value={account} onChange={setAccount} placeholder={accounts.data?.length ? "Choose an account" : "No accounts set up"} options={(accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.name}${a.account_last4 ? ` ··${a.account_last4}` : ""}` }))} />}</Field>
                <Field label="Transfer or receipt reference">{(id) => <input id={id} className={input} value={ref} maxLength={120} onChange={(e) => setRef(e.target.value)} />}</Field>
              </div>
            )}
            {actions.includes("reconcile") && <Field label="Bank statement reference">{(id) => <input id={id} className={input} value={ref} maxLength={120} onChange={(e) => setRef(e.target.value)} data-testid="os-trx-statement" />}</Field>}
            {(actions.includes("reject") || actions.includes("cancel")) && <Field label="Note" hint="Needed to reject or cancel.">{(id) => <input id={id} className={input} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} data-testid="os-trx-note" />}</Field>}
            <div className="flex flex-wrap gap-2">
              {buttons.map((a) => (
                <button key={a} type="button" disabled={busy} data-testid={`os-trx-${a}`} onClick={() => run(a)}
                  className={["reject", "cancel"].includes(a) ? btnDanger : ["approve", "verify", "pay", "receive", "reconcile"].includes(a) ? btnPrimary : btn}>{ACTION_LABEL[a]}</button>
              ))}
              {actions.includes("edit") && <button type="button" className={btn} onClick={() => setEditing(true)}>Edit</button>}
            </div>
          </>
        )}
        <ErrorLine message={err} />
      </div>
    </Section>
  );
}

/** Register a receipt that is already in Google Drive, as a Confidential Finance document linked to this line. */
function AddReceipt({ t, onDone }: { t: TrxRow; onDone: () => void }) {
  const dir = useDirectory();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState(`Receipt: ${t.description}`.slice(0, 120));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const finDiv = (dir?.divisions ?? []).find((d) => d.code === "FIN")?.id;
  if (!finDiv || ["rejected", "cancelled"].includes(t.status)) return null;
  const add = async () => {
    setBusy(true); setErr(null);
    const f = new FormData();
    Object.entries({ mode: "register", title, company_code: t.company_code === "HQ" ? "HQ" : t.company_code, division_id: finDiv, doc_type: "FIN", sensitivity: "Confidential", drive_url: url, link_type: "transaction", link_id: t.id })
      .forEach(([k, v]) => f.append(k, v));
    const res = await fetch("/os/api/documents/create", { method: "POST", body: f });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(typeof body.error === "string" ? body.error : "The receipt couldn't be added.");
    setUrl(""); onDone();
  };
  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); add(); }} data-testid="os-receipt-form">
      <input aria-label="Receipt title" className={cn(input, "sm:w-56")} value={title} maxLength={300} onChange={(e) => setTitle(e.target.value)} />
      <input aria-label="Google Drive link to the receipt" className={cn(input, "sm:flex-1")} placeholder="https://drive.google.com/…" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button type="submit" className={btn} disabled={busy || !/^https:\/\/(docs|drive)\.google\.com\//.test(url) || !title.trim()}>{busy ? "Adding…" : "Add receipt"}</button>
      <ErrorLine message={err} />
    </form>
  );
}
