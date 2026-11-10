"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useOsMe } from "@/components/os/OsProvider";
import { useDirectory, useQuery } from "@/components/os/data";
import { BudgetTable, CashflowTable, NewTrxSheet, TrxList, monthRange, useFinRoles } from "@/components/os/finance";
import { CompanySelect } from "@/components/os/pickers";
import { useMyWorkspaces } from "@/components/os/workspaces";
import { ErrorLine, Field, Loading, PageTitle, Section, Select, Stat, btn, btnPrimary, muted, panel } from "@/components/os/ui";
import { todayJakarta } from "@/lib/os/meta";
import { TRX_COLUMNS, formatIDR, isClosed, ledgerTotals, type BudgetSummary, type CashflowRow, type TrxKind, type TrxRow } from "@/lib/os/finance";
import { cn } from "@/lib/utils";

// Everyone's own expenses, reimbursements and income reports, and, for a division lead, their division's approved
// budget, spending and cash flow. Never the company ledger: that lives in the Finance workspace, for Finance.
export default function MoneyPage() {
  const { me } = useOsMe();
  const fin = useFinRoles();
  const pid = me.person.id;
  const mine = useQuery<TrxRow[]>((s) => s.from("os_fin_transactions").select(TRX_COLUMNS).or(`requested_by.eq.${pid},payee_person_id.eq.${pid}`).order("created_at", { ascending: false }).limit(300), [pid]);
  const [sheet, setSheet] = useState<TrxKind | null>(null);
  const { list } = useMyWorkspaces();
  const led = (list ?? []).filter((w) => w.is_lead && w.privacy === "open");
  const open = (mine.data ?? []).filter((t) => !isClosed(t));
  const guest = me.person.org_role === "guest";

  return (
    <div data-testid="os-money-page">
      <PageTitle title="Expenses and income" description="Ask for an expense or a reimbursement, report income, and follow each one until it's paid or received."
        actions={guest ? undefined : <>
          <button type="button" className={btnPrimary} onClick={() => setSheet("expense")} data-testid="os-new-expense">Ask for an expense</button>
          <button type="button" className={btn} onClick={() => setSheet("reimbursement")}>Ask to be paid back</button>
          <button type="button" className={btn} onClick={() => setSheet("income")} data-testid="os-new-income">Report income</button>
        </>} />
      {fin.view && <p className={cn(panel, "mb-4 p-3 text-sm")}>You work in Finance. The company ledger, approvals and payments are in the <Link href="/os/d/fin" className="font-medium underline">Finance workspace</Link>.</p>}
      <div className="space-y-6">
        <Section title={`Yours (${open.length} open)`}>
          <ErrorLine message={mine.error} />
          {mine.data ? <TrxList rows={mine.data} showRequester={false} empty="You haven't submitted anything yet" testId="os-money-mine" /> : <Loading />}
        </Section>
        {led.length > 0 && <DivisionMoney divisions={led.map((w) => ({ id: w.division_id, name: w.name }))} />}
      </div>
      {sheet && <NewTrxSheet open kind={sheet} fin={fin} onClose={() => setSheet(null)} />}
    </div>
  );
}

/** A lead's own division: its transactions (status and amounts only), approved budgets and settled cash flow. */
function DivisionMoney({ divisions }: { divisions: { id: string; name: string }[] }) {
  const { me } = useOsMe();
  const dir = useDirectory();
  const today = todayJakarta();
  const [division, setDivision] = useState(divisions[0].id);
  const [company, setCompany] = useState<string>(me.companies.find((c) => c !== "HQ") ?? me.companies[0] ?? "IEL");
  const [from] = monthRange(today, -5);
  const [, to] = monthRange(today, 0);
  const rows = useQuery<TrxRow[]>((s) => s.from("os_fin_transactions").select(TRX_COLUMNS).eq("division_id", division).eq("company_code", company).order("txn_date", { ascending: false }).limit(500), [division, company]);
  const budgets = useQuery<BudgetSummary[]>((s) => s.rpc("os_fin_budget_summary", { p_company: company, p_division: division, p_on: null }) as never, [division, company]);
  const flow = useQuery<CashflowRow[]>((s) => s.rpc("os_fin_cashflow", { p_company: company, p_from: from, p_to: to, p_division: division }) as never, [division, company, from, to]);
  const totals = useMemo(() => ledgerTotals(rows.data ?? []), [rows.data]);
  const name = dir?.divisionById.get(division)?.name ?? division;
  return (
    <Section title={`Your division: ${name}`}>
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        {divisions.length > 1 && <Field label="Division">{(id) => <Select id={id} value={division} onChange={setDivision} options={divisions.map((d) => ({ value: d.id, label: d.name }))} />}</Field>}
        <Field label="Company">{(id) => <CompanySelect id={id} value={company} onChange={setCompany} includeHq={false} />}</Field>
      </div>
      <p className={cn("mb-3 text-xs", muted)}>As the division&apos;s lead you see its requests, approved budgets and spending. Bank details and other divisions&apos; money stay with Finance.</p>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="os-division-totals">
        <Stat label="Paid out" value={formatIDR(totals.cashOut)} />
        <Stat label="Committed, not paid" value={formatIDR(totals.committedOut)} />
        <Stat label="Asked, not approved" value={formatIDR(totals.requestedOut)} />
        <Stat label="Income received" value={formatIDR(totals.cashIn)} />
      </div>
      <div className="space-y-6">
        <div><h3 className="mb-2 text-sm font-semibold">Approved budgets</h3><BudgetTable rows={budgets.data} testId="os-division-budgets" /><ErrorLine message={budgets.error} /></div>
        <div><h3 className="mb-2 text-sm font-semibold">Cash flow, last six months</h3><CashflowTable rows={flow.data} testId="os-division-cashflow" /><ErrorLine message={flow.error} /></div>
        <div><h3 className="mb-2 text-sm font-semibold">Transactions</h3>{rows.data ? <TrxList rows={rows.data} empty="No transactions for this division" testId="os-division-ledger" /> : <Loading />}</div>
      </div>
    </Section>
  );
}
