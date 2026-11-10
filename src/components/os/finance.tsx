"use client";

// Finance building blocks: who the viewer is to Finance, the transaction list, the form to ask for money or report
// income, budget and cash-flow tables. Every step is a database function (os_fin_*) that checks who may take it, and
// every list is an ordinary query, so RLS decides what appears. Bank references are never selected here.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOsMe } from "./OsProvider";
import { useDirectory, useQuery } from "./data";
import { CompanySelect, PersonSelect, useDefaultCompany } from "./pickers";
import { useMyWorkspaces } from "./workspaces";
import { Badge, Empty, ErrorLine, Field, Loading, RowList, Select, Sheet, btn, btnPrimary, input, muted, panel } from "./ui";
import { fmtDate, personLabel, todayJakarta } from "@/lib/os/meta";
import { KIND_LABEL, budgetUse, formatIDR, parseIDR, trxStage, type BudgetSummary, type CashflowRow, type TrxKind, type TrxRow } from "@/lib/os/finance";
import { cn } from "@/lib/utils";

/** The database's refusals are short sentences written for people; anything that looks like SQL becomes one line. */
export function flError(message: string | null | undefined): string | null {
  if (!message) return null;
  if (/^Not allowed$|permission denied|row-level security|42501/i.test(message)) return "You don't have permission to do that.";
  if (/check constraint|violates|duplicate key|syntax|relation|column|function|operator|invalid input/i.test(message)) return "One of the values isn't allowed. Check the form and try again.";
  if (/^[A-Z][^{}<>]{2,140}$/.test(message)) return message;
  return "That couldn't be done. Please try again.";
}

export interface FinRoles { ready: boolean; view: boolean; operate: boolean; approver: boolean }
export function useFinRoles(): FinRoles {
  const q = useQuery<{ view: boolean; operate: boolean; approver: boolean }>(async (s) => {
    const [v, o, a] = await Promise.all([s.rpc("os_fin_view"), s.rpc("os_fin_operate"), s.rpc("os_fin_approver")]);
    return { data: { view: v.data === true, operate: o.data === true, approver: a.data === true }, error: null };
  }, []);
  return { ready: Boolean(q.data), view: q.data?.view ?? false, operate: q.data?.operate ?? false, approver: q.data?.approver ?? false };
}

export interface Category { code: string; name: string; direction: "expense" | "income"; active: boolean }
export function useCategories() {
  return useQuery<Category[]>((s) => s.from("os_fin_categories").select("code, name, direction, active").order("name"), []);
}

export function Money({ value, className }: { value: number | string | null | undefined; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatIDR(value)}</span>;
}

export function TrxList({ rows, empty, testId, showRequester = true }: { rows: TrxRow[]; empty?: string; testId?: string; showRequester?: boolean }) {
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  return (
    <RowList rows={rows} rowKey={(t) => t.id} rowHref={(t) => `/os/finance/${t.id}`} testId={testId}
      empty={<Empty compact title={empty ?? "Nothing here"} />}
      columns={[
        { key: "d", label: "Description", primary: true, className: "w-[30%]", render: (t) => <span className="truncate">{t.description}</span> },
        { key: "k", label: "Type", className: "w-28", render: (t) => <span className="text-xs">{KIND_LABEL[t.kind]}</span> },
        { key: "a", label: "Amount", className: "w-36 text-right", render: (t) => <Money value={t.kind === "income" ? t.amount : -t.amount} className={cn("text-sm font-medium", t.kind === "income" ? "text-[#1D6B4F]" : "text-[#1F2D3D]")} /> },
        { key: "s", label: "Status", className: "w-48", render: (t) => { const st = trxStage(t); return <Badge tone={st.tone}>{st.label}</Badge>; } },
        { key: "v", label: "Division", className: "w-32", hideOnMobile: true, render: (t) => <span className="truncate text-xs">{dir?.divisionById.get(t.division_id ?? "")?.name ?? "Company-wide"}</span> },
        ...(showRequester ? [{ key: "r", label: "By", className: "w-32", hideOnMobile: true, render: (t: TrxRow) => <span className="truncate text-xs">{personLabel(people, t.requested_by)}</span> }] : []),
        { key: "t", label: "Date", className: "w-24", render: (t) => <span className="text-xs">{fmtDate(t.settled_on ?? t.txn_date)}</span> },
      ]} />
  );
}

/** Ask for an expense or reimbursement, or report income. Staff choose a division they can edit; Finance any. */
export function NewTrxSheet({ open, onClose, kind: initialKind = "expense", fin, division: initialDivision, request }: {
  open: boolean; onClose: () => void; kind?: TrxKind; fin: FinRoles; division?: string; request?: string;
}) {
  const { supabase, me } = useOsMe();
  const router = useRouter();
  const dir = useDirectory();
  const { list } = useMyWorkspaces();
  const defaultCompany = useDefaultCompany();
  const cats = useCategories();
  const today = todayJakarta();
  const divisions = useMemo(() => (dir?.divisions ?? []).filter((d) => fin.operate || (list ?? []).some((w) => w.division_id === d.id && w.access === "edit")), [dir, list, fin.operate]);
  const [kind, setKind] = useState<TrxKind>(initialKind);
  const [company, setCompany] = useState(defaultCompany === "HQ" ? "IEL" : defaultCompany);
  const [division, setDivision] = useState(initialDivision ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [due, setDue] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [payee, setPayee] = useState(me.person.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const projects = useQuery<{ id: string; name: string }[]>((s) => s.from("os_projects").select("id, name").eq("company_code", company).not("status", "in", "(Completed,Cancelled)").order("name").limit(300), [company]);
  const div = division || (divisions.length === 1 ? divisions[0].id : "");
  const value = parseIDR(amount);
  const submit = async () => {
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("os_fin_submit", {
      p_kind: kind, p_company: company, p_division: div, p_amount: value, p_txn_date: date, p_description: description,
      p_category: category || null, p_project: project || null, p_counterparty: counterparty || null, p_due: due || null,
      p_request: request ?? null, p_budget: null, p_payee: kind === "reimbursement" ? payee : null,
    });
    setBusy(false);
    if (error) return setErr(flError(error.message));
    onClose(); router.push(`/os/finance/${data}`);
  };
  const ready = div && value && description.trim().length >= 3;
  return (
    <Sheet open={open} onClose={onClose} title={kind === "income" ? "Report income" : kind === "reimbursement" ? "Ask to be paid back" : "Ask for an expense"} footer={
      <>
        <button type="button" className={btn} onClick={onClose}>Cancel</button>
        <button type="button" className={btnPrimary} disabled={busy || !ready} onClick={submit} data-testid="os-trx-submit">{busy ? "Sending…" : kind === "income" ? "Report income" : "Send for approval"}</button>
      </>}>
      {dir && list && !divisions.length ? (
        <Empty compact title="No division to submit for" body="Expenses and income are submitted for a division you work in." />
      ) : (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ready) submit(); }} data-testid="os-trx-form">
          <Field label="Type">{(id) => <Select id={id} value={kind} onChange={(v) => { setKind(v as TrxKind); setCategory(""); }} options={[
            { value: "expense", label: "Expense (Finance pays a supplier)" }, { value: "reimbursement", label: "Reimbursement (you or a colleague paid)" }, { value: "income", label: "Income (money coming in)" },
          ]} />}</Field>
          <p className={cn("text-xs", muted)}>{kind === "income"
            ? "Income counts as received only after Finance verifies it and records the receipt."
            : "A founder approves it first, then Finance verifies and pays. Approved is not paid: it shows as committed until Finance records the payment."}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company">{(id) => <CompanySelect id={id} value={company} onChange={(v) => { setCompany(v); setProject(""); }} includeHq={fin.operate} />}</Field>
            <Field label="Division">{(id) => <Select id={id} value={div} onChange={setDivision} placeholder="Choose a division" options={divisions.map((d) => ({ value: d.id, label: d.name }))} />}</Field>
          </div>
          <Field label="What it's for">{(id) => <input id={id} className={input} value={description} maxLength={1000} onChange={(e) => setDescription(e.target.value)} placeholder="Chairs for the open day" />}</Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount (IDR)" hint={value ? formatIDR(value) : "Whole rupiah, for example 1.500.000"}>{(id) => <input id={id} className={input} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={Boolean(amount) && !value} />}</Field>
            <Field label={kind === "income" ? "Date" : "Date needed or spent"}>{(id) => <input id={id} type="date" className={input} value={date} max={addYear(today)} onChange={(e) => setDate(e.target.value)} />}</Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={kind === "income" ? "From (payer)" : "Paid to (supplier)"}>{(id) => <input id={id} className={input} value={counterparty} maxLength={200} onChange={(e) => setCounterparty(e.target.value)} />}</Field>
            <Field label={kind === "income" ? "Expected by" : "Payment due"}>{(id) => <input id={id} type="date" className={input} value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
          </div>
          {kind === "reimbursement" && <Field label="Pay back" hint="Defaults to you.">{(id) => <PersonSelect id={id} value={payee} onChange={setPayee} placeholder="Choose a person" />}</Field>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category">{(id) => <Select id={id} value={category} onChange={setCategory} placeholder={cats.data?.length ? "No category" : "No categories set up yet"} options={(cats.data ?? []).filter((c) => c.active && c.direction === (kind === "income" ? "income" : "expense")).map((c) => ({ value: c.code, label: c.name }))} />}</Field>
            <Field label="Project">{(id) => <Select id={id} value={project} onChange={setProject} placeholder="No project" options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />}</Field>
          </div>
          {request && <p className={cn("text-xs", muted)}>Linked to request {request}.</p>}
          <p className={cn("text-xs", muted)}>Add the receipt or invoice from Google Drive on the next page.</p>
          <ErrorLine message={err} />
        </form>
      )}
    </Sheet>
  );
}
const addYear = (d: string) => `${Number(d.slice(0, 4)) + 1}${d.slice(4)}`;

export function BudgetTable({ rows, testId }: { rows: BudgetSummary[] | null; testId?: string }) {
  const dir = useDirectory();
  if (!rows) return <Loading />;
  if (!rows.length) return <Empty compact title="No budgets" body="Finance sets budgets; a founder approves them." />;
  return (
    <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid={testId}>
      {rows.map((b) => {
        const use = budgetUse(b);
        return (
          <li key={b.budget_id} className="space-y-2 px-3 py-3 text-sm" data-testid={`os-budget-${b.budget_id}`}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium">{b.name}</span>
              <span className={cn("text-xs", muted)}>{b.budget_id} · {b.company_code} · {dir?.divisionById.get(b.division_id ?? "")?.name ?? "Company-wide"}{b.project_id ? ` · ${b.project_id}` : ""} · {fmtDate(b.period_start)} to {fmtDate(b.period_end)}</span>
              {b.status !== "approved" && <Badge tone={b.status === "proposed" ? "amber" : b.status === "rejected" ? "red" : "neutral"}>{b.status[0].toUpperCase() + b.status.slice(1)}</Badge>}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#EEF1F5]" role="img" aria-label={`${use.pct}% of the budget used or committed`}>
              <div className={cn("h-full rounded-full", use.over ? "bg-[#A12D2F]" : use.pct > 85 ? "bg-[#B7791F]" : "bg-[#2F4157]")} style={{ width: `${use.pct}%` }} />
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
              {[["Budget", b.budget], ["Spent (paid)", b.actual], ["Committed (approved, unpaid)", b.committed], ["Asked, not approved", b.requested], [use.over ? "Over budget" : "Remaining", use.over ? -use.over : b.remaining]].map(([l, v]) => (
                <div key={String(l)}><dt className={muted}>{l}</dt><dd className={cn("font-medium", l === "Over budget" && "text-[#A12D2F]")}><Money value={v as number} /></dd></div>
              ))}
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

export function CashflowTable({ rows, testId }: { rows: CashflowRow[] | null; testId?: string }) {
  if (!rows) return <Loading />;
  const total = rows.reduce((a, r) => ({ cash_in: a.cash_in + Number(r.cash_in), cash_out: a.cash_out + Number(r.cash_out), committed_out: a.committed_out + Number(r.committed_out), expected_in: a.expected_in + Number(r.expected_in), requested_out: a.requested_out + Number(r.requested_out) }),
    { cash_in: 0, cash_out: 0, committed_out: 0, expected_in: 0, requested_out: 0 });
  const month = (m: string) => new Date(`${m.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <div className={cn(panel, "overflow-x-auto")} data-testid={testId}>
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Cash flow by month. Cash in and out count only settled lines.</caption>
        <thead className="border-b border-[#E6E9EE] bg-[#FAFBFC] text-left text-xs text-[#66768A]">
          <tr>{["Month", "Cash in", "Cash out", "Net", "Committed out", "Expected in", "Asked, not approved"].map((h, i) => <th key={h} scope="col" className={cn("px-3 py-2 font-medium", i && "text-right")}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className="border-b border-[#F0F2F5]">
              <th scope="row" className="px-3 py-2 text-left font-medium">{month(r.month)}</th>
              <td className="px-3 py-2 text-right"><Money value={r.cash_in} /></td>
              <td className="px-3 py-2 text-right"><Money value={r.cash_out} /></td>
              <td className={cn("px-3 py-2 text-right font-medium", Number(r.net) < 0 && "text-[#A12D2F]")}><Money value={r.net} /></td>
              <td className={cn("px-3 py-2 text-right", muted)}><Money value={r.committed_out} /></td>
              <td className={cn("px-3 py-2 text-right", muted)}><Money value={r.expected_in} /></td>
              <td className={cn("px-3 py-2 text-right", muted)}><Money value={r.requested_out} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-[#FAFBFC] font-semibold">
          <tr>
            <th scope="row" className="px-3 py-2 text-left">Total</th>
            <td className="px-3 py-2 text-right"><Money value={total.cash_in} /></td>
            <td className="px-3 py-2 text-right"><Money value={total.cash_out} /></td>
            <td className={cn("px-3 py-2 text-right", total.cash_in - total.cash_out < 0 && "text-[#A12D2F]")}><Money value={total.cash_in - total.cash_out} /></td>
            <td className="px-3 py-2 text-right"><Money value={total.committed_out} /></td>
            <td className="px-3 py-2 text-right"><Money value={total.expected_in} /></td>
            <td className="px-3 py-2 text-right"><Money value={total.requested_out} /></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Save rows as a CSV file the viewer downloads (built in the browser from what they can already read). */
export function downloadCsv(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** First and last day of the month `offset` months from the given date. */
export function monthRange(today: string, offset = 0): [string, string] {
  const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + offset);
  const end = new Date(d); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0);
  return [d.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}
