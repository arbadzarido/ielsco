"use client";

// The Finance workspace: queues (to approve, verify, pay, reconcile), the company ledger, budgets, cash flow and
// reports, and setup. Only people with Finance access reach these tabs; the database returns nothing to anyone else.
import { useMemo, useState } from "react";
import { useOsMe } from "./OsProvider";
import { useDirectory, useQuery } from "./data";
import { BudgetTable, CashflowTable, Money, NewTrxSheet, TrxList, downloadCsv, flError, monthRange, useCategories, useFinRoles } from "./finance";
import { CompanySelect, useDefaultCompany } from "./pickers";
import { Badge, ErrorLine, Field, Loading, Section, Select, Sheet as SheetImpl, Stat, btn, btnDanger, btnPrimary, input, muted, panel } from "./ui";
import { fmtDate, personLabel, todayJakarta } from "@/lib/os/meta";
import { BUDGET_COLUMNS, KIND_LABEL, TRX_COLUMNS, TRX_STATUS_LABEL, formatIDR, ledgerTotals, parseIDR, toCsv, trxStage, type BudgetRow, type BudgetSummary, type CashflowRow, type TrxKind, type TrxRow, type TrxStatus } from "@/lib/os/finance";
import { workspaceHref } from "@/lib/os/workspaces";
import { cn } from "@/lib/utils";

const useLedger = (deps: unknown[] = []) => useQuery<TrxRow[]>((s) => s.from("os_fin_transactions").select(TRX_COLUMNS).order("txn_date", { ascending: false }).limit(2000), deps);

export function FinanceOverview() {
  const { me } = useOsMe();
  const fin = useFinRoles();
  const rows = useLedger();
  const today = todayJakarta();
  const [mStart, mEnd] = monthRange(today);
  const l = rows.data ?? [];
  const pid = me.person.id;
  const toApprove = l.filter((t) => t.kind !== "income" && t.status === "requested" && t.requested_by !== pid && t.payee_person_id !== pid);
  const toVerify = l.filter((t) => (t.kind === "income" && t.status === "requested") || (t.kind !== "income" && t.status === "approved"));
  const toSettle = l.filter((t) => t.status === "verified");
  const toReconcile = l.filter((t) => ["paid", "received"].includes(t.status));
  const month = ledgerTotals(l.filter((t) => (t.settled_on ?? t.txn_date) >= mStart && (t.settled_on ?? t.txn_date) <= mEnd));
  const overdue = l.filter((t) => t.due_date && t.due_date < today && ["approved", "verified"].includes(t.status));
  const [sheet, setSheet] = useState<TrxKind | null>(null);
  if (!rows.data) return <Loading />;
  const href = (tab: string, q = "") => `${workspaceHref("FIN", "ledger")}${q}`.replace("?tab=ledger", `?tab=${tab}`);
  return (
    <div className="space-y-6" data-testid="os-fin-overview">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fin.approver && <Stat label="To approve" value={toApprove.length} tone={toApprove.length ? "amber" : undefined} href={href("ledger", "&status=requested")} />}
        <Stat label="To verify" value={toVerify.length} href={href("ledger", "&queue=verify")} />
        <Stat label="To pay or receive" value={toSettle.length} href={href("ledger", "&status=verified")} />
        <Stat label="To reconcile" value={toReconcile.length} href={href("ledger", "&queue=reconcile")} />
        <Stat label="Paid out this month" value={formatIDR(month.cashOut)} />
        <Stat label="Received this month" value={formatIDR(month.cashIn)} />
        <Stat label="Committed, not paid" value={formatIDR(ledgerTotals(l).committedOut)} hint="Approved or verified expenses" />
        <Stat label="Overdue payments" value={overdue.length} tone={overdue.length ? "red" : undefined} />
      </div>
      {fin.operate && <div className="flex flex-wrap gap-2"><button type="button" className={btn} onClick={() => setSheet("expense")}>Record an expense</button><button type="button" className={btn} onClick={() => setSheet("income")}>Record income</button></div>}
      {fin.approver && <Section title="Waiting for your approval"><TrxList rows={toApprove} empty="Nothing to approve" testId="os-fin-to-approve" /></Section>}
      <Section title="Waiting for Finance"><TrxList rows={[...toVerify, ...toSettle]} empty="Nothing waiting" testId="os-fin-queue" /></Section>
      {sheet && <NewTrxSheet open kind={sheet} fin={fin} onClose={() => { setSheet(null); rows.reload(); }} />}
    </div>
  );
}

const STATUSES = Object.keys(TRX_STATUS_LABEL) as TrxStatus[];
export function FinanceLedger({ initialStatus, queue }: { initialStatus?: string | null; queue?: string | null }) {
  const dir = useDirectory();
  const rows = useLedger();
  const [status, setStatus] = useState(initialStatus ?? (queue === "verify" ? "queue:verify" : queue === "reconcile" ? "queue:reconcile" : ""));
  const [kind, setKind] = useState("");
  const [company, setCompany] = useState("");
  const [division, setDivision] = useState("");
  const [q, setQ] = useState("");
  const shown = (rows.data ?? []).filter((t) =>
    (!status || (status === "queue:verify" ? (t.kind === "income" ? t.status === "requested" : t.status === "approved") : status === "queue:reconcile" ? ["paid", "received"].includes(t.status) : t.status === status))
    && (!kind || t.kind === kind) && (!company || t.company_code === company) && (!division || t.division_id === division)
    && (!q || `${t.description} ${t.counterparty ?? ""} ${t.id}`.toLowerCase().includes(q.toLowerCase())));
  const totals = ledgerTotals(shown);
  const people = dir?.peopleById ?? new Map();
  const exportCsv = () => downloadCsv(`ledger-${todayJakarta()}.csv`, toCsv(
    ["ID", "Type", "Company", "Division", "Project", "Category", "Description", "Counterparty", "Amount (IDR)", "Direction", "Status", "Date", "Due", "Settled on", "Requested by", "Request"],
    shown.map((t) => [t.id, KIND_LABEL[t.kind], t.company_code, dir?.divisionById.get(t.division_id ?? "")?.name ?? "", t.project_id, t.category_code, t.description, t.counterparty, t.amount, t.direction, trxStage(t).label, t.txn_date, t.due_date, t.settled_on, personLabel(people, t.requested_by), t.request_id])));
  return (
    <Section title="Transactions" action={<button type="button" className={btn} onClick={exportCsv} disabled={!shown.length}>Download CSV</button>}>
      <div className="mb-3 grid gap-2 sm:grid-cols-5" data-testid="os-fin-filters">
        <Select ariaLabel="Status" value={status} onChange={setStatus} placeholder="Any status" options={[{ value: "queue:verify", label: "To verify" }, { value: "queue:reconcile", label: "To reconcile" }, ...STATUSES.map((s) => ({ value: s, label: TRX_STATUS_LABEL[s] }))]} />
        <Select ariaLabel="Type" value={kind} onChange={setKind} placeholder="Any type" options={(["expense", "reimbursement", "income"] as const).map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        <Select ariaLabel="Company" value={company} onChange={setCompany} placeholder="Any company" options={[{ value: "IEL", label: "IELSco" }, { value: "ELC", label: "Elco AI" }, { value: "HQ", label: "HQ" }]} />
        <Select ariaLabel="Division" value={division} onChange={setDivision} placeholder="Any division" options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} />
        <input aria-label="Search" className={input} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className={cn("mb-3 text-xs", muted)} data-testid="os-fin-totals">
        In this list: cash in {formatIDR(totals.cashIn)}, cash out {formatIDR(totals.cashOut)}, committed {formatIDR(totals.committedOut)}, asked {formatIDR(totals.requestedOut)}, expected in {formatIDR(totals.expectedIn)}.
      </p>
      <ErrorLine message={rows.error} />
      {rows.data ? <TrxList rows={shown} empty="No transactions match" testId="os-fin-ledger" /> : <Loading />}
    </Section>
  );
}

export function FinanceBudgets() {
  const { supabase, me } = useOsMe();
  const fin = useFinRoles();
  const dir = useDirectory();
  const [company, setCompany] = useState("");
  const summary = useQuery<BudgetSummary[]>((s) => s.rpc("os_fin_budget_summary", { p_company: company || null, p_division: null, p_on: null }) as never, [company]);
  const pending = useQuery<BudgetRow[]>((s) => s.from("os_fin_budgets").select(BUDGET_COLUMNS).eq("status", "proposed").order("created_at"), []);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const act = async (id: string, action: string) => {
    setErr(null);
    const { error } = await supabase.rpc("os_fin_budget_act", { p_id: id, p_action: action, p_note: note[id] || null });
    if (error) return setErr(flError(error.message));
    summary.reload(); pending.reload();
  };
  return (
    <div className="space-y-6">
      <Section title="Waiting for approval" action={fin.operate ? <button type="button" className={btn} onClick={() => setCreating(true)} data-testid="os-budget-new">Propose a budget</button> : undefined}>
        <ErrorLine message={err} />
        {pending.data?.length ? (
          <ul className={cn(panel, "divide-y divide-[#F0F2F5]")} data-testid="os-budgets-pending">
            {pending.data.map((b) => (
              <li key={b.id} className="space-y-2 px-3 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-3"><span className="font-medium">{b.name}</span><Money value={b.amount} className="font-semibold" />
                  <span className={cn("text-xs", muted)}>{b.id} · {b.company_code} · {dir?.divisionById.get(b.division_id ?? "")?.name ?? "Company-wide"} · {fmtDate(b.period_start)} to {fmtDate(b.period_end)} · proposed by {personLabel(dir?.peopleById ?? new Map(), b.created_by)}</span></div>
                {fin.approver && b.created_by !== me.person.id && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input aria-label={`Note for ${b.id}`} className={cn(input, "sm:flex-1")} placeholder="Note (needed to reject)" value={note[b.id] ?? ""} onChange={(e) => setNote({ ...note, [b.id]: e.target.value })} />
                    <button type="button" className={btnPrimary} onClick={() => act(b.id, "approve")} data-testid={`os-budget-approve-${b.id}`}>Approve</button>
                    <button type="button" className={btnDanger} onClick={() => act(b.id, "reject")}>Reject</button>
                  </div>
                )}
                {b.created_by === me.person.id && <p className={cn("text-xs", muted)}>Someone else approves a budget you proposed.</p>}
              </li>
            ))}
          </ul>
        ) : <p className={cn("text-sm", muted)}>No budgets waiting.</p>}
      </Section>
      <Section title="Budgets against spending">
        <div className="mb-3 max-w-xs"><Select ariaLabel="Company" value={company} onChange={setCompany} placeholder="All companies" options={[{ value: "IEL", label: "IELSco" }, { value: "ELC", label: "Elco AI" }, { value: "HQ", label: "HQ" }]} /></div>
        <p className={cn("mb-3 text-xs", muted)}>Spent counts paid and reconciled expenses in the budget&apos;s period, company, division, project and category. Committed is approved or verified but not yet paid.</p>
        <BudgetTable rows={summary.data} testId="os-budgets" />
        {fin.operate && (summary.data ?? []).some((b) => b.status === "approved") && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className={muted}>Close a finished budget:</span>
            {(summary.data ?? []).filter((b) => b.status === "approved").map((b) => (
              <button key={b.budget_id} type="button" className={btn} onClick={() => act(b.budget_id, "close")}>Close {b.name}</button>
            ))}
          </div>
        )}
      </Section>
      {creating && <BudgetSheet onClose={() => { setCreating(false); pending.reload(); summary.reload(); }} />}
    </div>
  );
}

function BudgetSheet({ onClose }: { onClose: () => void }) {
  const { supabase } = useOsMe();
  const dir = useDirectory();
  const cats = useCategories();
  const company0 = useDefaultCompany();
  const today = todayJakarta();
  const [m0, m1] = monthRange(today);
  const [company, setCompany] = useState(company0);
  const [division, setDivision] = useState("");
  const [project, setProject] = useState("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [start, setStart] = useState(m0);
  const [end, setEnd] = useState(m1);
  const [amount, setAmount] = useState("");
  const [request, setRequest] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const projects = useQuery<{ id: string; name: string }[]>((s) => s.from("os_projects").select("id, name").eq("company_code", company).order("name").limit(300), [company]);
  const requests = useQuery<{ id: string; title: string }[]>((s) => s.from("os_requests").select("id, title").in("type_code", ["budget", "campaign_expense"]).order("created_at", { ascending: false }).limit(100), []);
  const value = parseIDR(amount);
  const save = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc("os_fin_budget_save", { p_id: null, p_company: company, p_division: division || null, p_project: project || null, p_category: category || null,
      p_name: name, p_start: start, p_end: end, p_amount: value, p_notes: notes || null, p_request: request || null });
    setBusy(false);
    if (error) return setErr(flError(error.message));
    onClose();
  };
  return (
    <SheetShell title="Propose a budget" onClose={onClose} onSave={save} disabled={busy || !value || name.trim().length < 3} saveLabel="Propose">
      <Field label="Name">{(id) => <input id={id} className={input} value={name} maxLength={160} onChange={(e) => setName(e.target.value)} placeholder="Operations, November" />}</Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Company">{(id) => <CompanySelect id={id} value={company} onChange={setCompany} />}</Field>
        <Field label="Division">{(id) => <Select id={id} value={division} onChange={setDivision} placeholder="Company-wide" options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} />}</Field>
        <Field label="Project">{(id) => <Select id={id} value={project} onChange={setProject} placeholder="No project" options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.name }))} />}</Field>
        <Field label="Category">{(id) => <Select id={id} value={category} onChange={setCategory} placeholder="Any category" options={(cats.data ?? []).filter((c) => c.direction === "expense").map((c) => ({ value: c.code, label: c.name }))} />}</Field>
        <Field label="From">{(id) => <input id={id} type="date" className={input} value={start} onChange={(e) => setStart(e.target.value)} />}</Field>
        <Field label="To">{(id) => <input id={id} type="date" className={input} value={end} min={start} onChange={(e) => setEnd(e.target.value)} />}</Field>
        <Field label="Amount (IDR)" hint={value ? formatIDR(value) : "Whole rupiah"}>{(id) => <input id={id} className={input} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />}</Field>
        <Field label="From a request">{(id) => <Select id={id} value={request} onChange={setRequest} placeholder="None" options={(requests.data ?? []).map((r) => ({ value: r.id, label: `${r.id} · ${r.title}` }))} />}</Field>
      </div>
      <Field label="Notes">{(id) => <textarea id={id} className={cn(input, "min-h-16")} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />}</Field>
      <ErrorLine message={err} />
    </SheetShell>
  );
}

export function FinanceCashflow() {
  const dir = useDirectory();
  const today = todayJakarta();
  const company0 = useDefaultCompany();
  const [company, setCompany] = useState(company0);
  const [months, setMonths] = useState("6");
  const [division, setDivision] = useState("");
  const [from] = monthRange(today, -(Number(months) - 1));
  const [, to] = monthRange(today);
  const flow = useQuery<CashflowRow[]>((s) => s.rpc("os_fin_cashflow", { p_company: company, p_from: from, p_to: to, p_division: division || null }) as never, [company, from, to, division]);
  const rows = useLedger();
  const byDivision = useMemo(() => {
    const inRange = (rows.data ?? []).filter((t) => t.company_code === company && (t.settled_on ?? t.txn_date) >= from && (t.settled_on ?? t.txn_date) <= to);
    const m = new Map<string, TrxRow[]>();
    inRange.forEach((t) => m.set(t.division_id ?? "", [...(m.get(t.division_id ?? "") ?? []), t]));
    return [...m.entries()].map(([d, list]) => ({ division: d, ...ledgerTotals(list) })).sort((a, b) => b.cashOut - a.cashOut);
  }, [rows.data, company, from, to]);
  const name = (d: string) => dir?.divisionById.get(d)?.name ?? "Company-wide";
  const exportCsv = () => downloadCsv(`cashflow-${company}-${from}-${to}.csv`, toCsv(["Month", "Cash in", "Cash out", "Net", "Committed out", "Expected in", "Asked, not approved"],
    (flow.data ?? []).map((r) => [r.month.slice(0, 7), r.cash_in, r.cash_out, r.net, r.committed_out, r.expected_in, r.requested_out])));
  return (
    <div className="space-y-6">
      <Section title="Cash flow" action={<button type="button" className={btn} onClick={exportCsv} disabled={!flow.data?.length}>Download CSV</button>}>
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <Field label="Company">{(id) => <CompanySelect id={id} value={company} onChange={setCompany} />}</Field>
          <Field label="Period">{(id) => <Select id={id} value={months} onChange={setMonths} options={[{ value: "3", label: "Last 3 months" }, { value: "6", label: "Last 6 months" }, { value: "12", label: "Last 12 months" }]} />}</Field>
          <Field label="Division">{(id) => <Select id={id} value={division} onChange={setDivision} placeholder="All divisions" options={(dir?.divisions ?? []).map((d) => ({ value: d.id, label: d.name }))} />}</Field>
        </div>
        <ErrorLine message={flow.error} />
        <CashflowTable rows={flow.data} testId="os-fin-cashflow" />
      </Section>
      <Section title="By division, this period">
        {byDivision.length ? (
          <div className={cn(panel, "overflow-x-auto")}>
            <table className="w-full min-w-[560px] text-sm" data-testid="os-fin-by-division">
              <thead className="border-b border-[#E6E9EE] bg-[#FAFBFC] text-left text-xs text-[#66768A]"><tr>{["Division", "Paid out", "Committed", "Asked", "Received"].map((h, i) => <th key={h} scope="col" className={cn("px-3 py-2 font-medium", i && "text-right")}>{h}</th>)}</tr></thead>
              <tbody>{byDivision.map((r) => (
                <tr key={r.division} className="border-b border-[#F0F2F5]"><th scope="row" className="px-3 py-2 text-left font-medium">{name(r.division)}</th>
                  <td className="px-3 py-2 text-right"><Money value={r.cashOut} /></td><td className="px-3 py-2 text-right"><Money value={r.committedOut} /></td>
                  <td className="px-3 py-2 text-right"><Money value={r.requestedOut} /></td><td className="px-3 py-2 text-right"><Money value={r.cashIn} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className={cn("text-sm", muted)}>No transactions in this period.</p>}
      </Section>
    </div>
  );
}

type Account = { id: string; company_code: string; name: string; kind: string; institution: string | null; account_last4: string | null; active: boolean };
export function FinanceSetup() {
  const { supabase } = useOsMe();
  const fin = useFinRoles();
  const cats = useCategories();
  const accounts = useQuery<Account[]>((s) => s.from("os_fin_accounts").select("id, company_code, name, kind, institution, account_last4, active").order("company_code").order("name"), []);
  const [c, setC] = useState({ code: "", name: "", direction: "expense" });
  const [a, setA] = useState({ company: "IEL", name: "", kind: "bank", institution: "", last4: "" });
  const [err, setErr] = useState<string | null>(null);
  const addCat = async () => {
    setErr(null);
    const { error } = await supabase.from("os_fin_categories").insert({ code: c.code.trim().toLowerCase(), name: c.name.trim(), direction: c.direction });
    if (error) return setErr(/duplicate/.test(error.message) ? "That code is already used." : flError(error.message));
    setC({ code: "", name: "", direction: c.direction }); cats.reload();
  };
  const toggleCat = async (code: string, active: boolean) => { const { error } = await supabase.from("os_fin_categories").update({ active }).eq("code", code); if (error) setErr(flError(error.message)); cats.reload(); };
  const saveAcc = async (id: string | null, v: typeof a, active = true) => {
    setErr(null);
    const { error } = await supabase.rpc("os_fin_account_save", { p_id: id, p_company: v.company, p_name: v.name, p_kind: v.kind, p_institution: v.institution || null, p_last4: v.last4 || null, p_active: active });
    if (error) return setErr(flError(error.message));
    if (!id) setA({ ...a, name: "", institution: "", last4: "" });
    accounts.reload();
  };
  return (
    <div className="space-y-6">
      <ErrorLine message={err} />
      <Section title="Categories">
        <p className={cn("mb-2 text-xs", muted)}>Staff choose a category when they submit. Retired categories stay on old lines.</p>
        {cats.data?.length ? (
          <ul className={cn(panel, "mb-3 divide-y divide-[#F0F2F5]")} data-testid="os-fin-categories">
            {cats.data.map((x) => <li key={x.code} className="flex items-center gap-2 px-3 py-2 text-sm"><span className="flex-1">{x.name} <span className={cn("text-xs", muted)}>{x.code} · {x.direction}</span></span>{!x.active && <Badge>Retired</Badge>}
              {fin.operate && <button type="button" className={btn} onClick={() => toggleCat(x.code, !x.active)}>{x.active ? "Retire" : "Restore"}</button>}</li>)}
          </ul>
        ) : <p className={cn("mb-3 text-sm", muted)}>No categories yet.</p>}
        {fin.operate && (
          <form className="grid gap-2 sm:grid-cols-[1fr_1.5fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); addCat(); }} data-testid="os-fin-category-form">
            <input aria-label="Category code" className={input} placeholder="code, e.g. events" value={c.code} onChange={(e) => setC({ ...c, code: e.target.value })} />
            <input aria-label="Category name" className={input} placeholder="Name" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
            <Select ariaLabel="Direction" value={c.direction} onChange={(v) => setC({ ...c, direction: v })} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} />
            <button type="submit" className={btn} disabled={!/^[a-z0-9_]{2,40}$/.test(c.code.trim().toLowerCase()) || !c.name.trim()}>Add</button>
          </form>
        )}
      </Section>
      <Section title="Cash accounts">
        <p className={cn("mb-2 text-xs", muted)}>Where money is paid from and received into. Only the last four digits of an account number are kept. Founders and Finance approvers add them.</p>
        {accounts.data?.length ? (
          <ul className={cn(panel, "mb-3 divide-y divide-[#F0F2F5]")} data-testid="os-fin-accounts">
            {accounts.data.map((x) => <li key={x.id} className="flex items-center gap-2 px-3 py-2 text-sm"><span className="flex-1">{x.name} <span className={cn("text-xs", muted)}>{x.id} · {x.company_code} · {x.institution ?? x.kind}{x.account_last4 ? ` ··${x.account_last4}` : ""}</span></span>{!x.active && <Badge>Retired</Badge>}
              {fin.approver && <button type="button" className={btn} onClick={() => saveAcc(x.id, { company: x.company_code, name: x.name, kind: x.kind, institution: x.institution ?? "", last4: x.account_last4 ?? "" }, !x.active)}>{x.active ? "Retire" : "Restore"}</button>}</li>)}
          </ul>
        ) : <p className={cn("mb-3 text-sm", muted)}>No accounts yet.</p>}
        {fin.approver && (
          <form className="grid gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); saveAcc(null, a); }} data-testid="os-fin-account-form">
            <CompanySelect ariaLabel="Account company" value={a.company} onChange={(v) => setA({ ...a, company: v })} />
            <input aria-label="Account name" className={input} placeholder="Name, e.g. Operating account" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} />
            <Select ariaLabel="Account kind" value={a.kind} onChange={(v) => setA({ ...a, kind: v })} options={[{ value: "bank", label: "Bank" }, { value: "cash", label: "Cash" }, { value: "e_wallet", label: "E-wallet" }, { value: "other", label: "Other" }]} />
            <input aria-label="Bank or provider" className={input} placeholder="Bank or provider" value={a.institution} onChange={(e) => setA({ ...a, institution: e.target.value })} />
            <input aria-label="Last four digits" className={input} placeholder="Last 4 digits" inputMode="numeric" maxLength={4} value={a.last4} onChange={(e) => setA({ ...a, last4: e.target.value.replace(/\D/g, "") })} />
            <button type="submit" className={btn} disabled={!a.name.trim() || (a.last4 !== "" && a.last4.length !== 4)}>Add account</button>
          </form>
        )}
      </Section>
    </div>
  );
}

/** A small sheet with Cancel and a primary button, shared by the Finance and Legal forms. */
export function SheetShell({ title, onClose, onSave, disabled, saveLabel = "Save", children }: { title: string; onClose: () => void; onSave: () => void; disabled?: boolean; saveLabel?: string; children: React.ReactNode }) {
  return (
    <SheetImpl open onClose={onClose} title={title} footer={<><button type="button" className={btn} onClick={onClose}>Cancel</button><button type="button" className={btnPrimary} disabled={disabled} onClick={onSave} data-testid="os-sheet-save">{saveLabel}</button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!disabled) onSave(); }}>{children}</form>
    </SheetImpl>
  );
}
