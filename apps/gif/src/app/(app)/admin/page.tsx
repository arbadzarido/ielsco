import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { currentCohort } from "@/lib/cohort";
import { kpis } from "@/lib/admin";
import { paymentsState } from "@/lib/payments/gateway";
import { STATUS_LABEL, PATHWAY_LABEL, type Status } from "@/lib/status";
import { formatMoney } from "@/lib/pricing";
import { countryName } from "@/lib/format";

const FUNNEL = [["page_view", "Page views (consented)"], ["apply_click", "Apply clicks"], ["pathway_select", "Pathway chosen"], ["application_started", "Applications started"],
  ["application_completed", "Applications submitted"], ["payment_initiated", "Payments initiated"], ["payment_succeeded", "Payments succeeded"], ["payment_failed", "Payments failed or expired"]] as const;

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireStaff("read");
  const sp = await searchParams;
  const cohort = await currentCohort();
  const k = await kpis(cohort.id);
  const s = cohort.settings;
  const total = (st: string[]) => k.byStatus.filter((x) => st.includes(x.status)).reduce((n, x) => n + x.n, 0);
  const submitted = k.byStatus.filter((x) => !["draft", "withdrawn"].includes(x.status)).reduce((n, x) => n + x.n, 0);
  const drafts = total(["draft"]);
  const pay = paymentsState();
  const f = Object.fromEntries(k.funnel.map((x) => [x.event, x.n]));
  return (
    <>
      {sp.denied && <div className="notice warn"><p>Your role can&rsquo;t open that page.</p></div>}
      <div className="eyebrow">{cohort.name} · capacity {cohort.capacity}</div>
      <h1>Overview</h1>
      {!pay.ready && <div className="notice warn"><p>Online payments are off: {pay.reason}.</p></div>}
      {pay.ready && pay.env === "sandbox" && <div className="notice"><p>Payments are in <strong>Sandbox</strong> mode (test money only).</p></div>}
      <dl className="kpis" style={{ marginTop: 20 }}>
        <div><dt>Submitted applications</dt><dd>{submitted}</dd></div>
        <div><dt>Drafts</dt><dd>{drafts}</dd></div>
        <div><dt>Confirmed seats</dt><dd>{k.seats?.confirmed ?? 0} / {cohort.capacity}</dd></div>
        <div><dt>Remaining capacity</dt><dd>{cohort.capacity - (k.seats?.confirmed ?? 0)}</dd></div>
        <div><dt>Teams / individuals</dt><dd>{k.teams?.teams ?? 0} / {k.teams?.individuals ?? 0}</dd></div>
        <div><dt>People in applications</dt><dd>{k.seats?.people ?? 0}</dd></div>
        <div><dt>Awaiting payment</dt><dd>{total(["awaiting_payment", "payment_verification"])}</dd></div>
        <div><dt>Conversion (submitted → paid step)</dt><dd>{submitted ? Math.round((100 * total(["phase_1_completed", "phase_2_in_progress", "phase_2_submitted", "phase_3_in_progress", "phase_3_submitted", "under_evaluation", "selected_fully_funded", "selected_partial_funded", "not_selected", "confirmed_participant"])) / submitted) : 0}%</dd></div>
      </dl>

      <h2>Applicants by pathway</h2>
      <div className="table-wrap"><table className="t compact"><thead><tr><th>Pathway</th><th>Started</th><th>Submitted</th></tr></thead><tbody>
        {(["fully_funded", "mentoring", "self_funded"] as const).map((p) => { const r = k.byPathway.find((x) => x.pathway === p); return <tr key={p}><td><Link href={`/admin/applicants?pathway=${p}`}>{PATHWAY_LABEL[p]}</Link></td><td>{r?.n ?? 0}</td><td>{r?.submitted ?? 0}</td></tr>; })}
      </tbody></table></div>

      <div className="grid g2">
        <section>
          <h2>Revenue (verified)</h2>
          <div className="table-wrap"><table className="t compact"><thead><tr><th>Currency</th><th>Received</th><th>Refunded</th><th>Pending</th></tr></thead><tbody>
            {k.money.length ? k.money.map((m) => <tr key={m.currency}><td>{m.currency}</td><td>{formatMoney(m.paid, m.currency as "IDR")}</td><td>{formatMoney(m.refunded, m.currency as "IDR")}</td><td>{formatMoney(m.pending, m.currency as "IDR")}</td></tr>) : <tr><td colSpan={4} className="muted">No payments yet.</td></tr>}
          </tbody></table></div>
          <h2>Outstanding</h2>
          <div className="table-wrap"><table className="t compact"><thead><tr><th>Item</th><th>Count</th><th>Amount</th></tr></thead><tbody>
            {k.outstanding.length ? k.outstanding.map((o) => <tr key={o.currency + o.kind}><td>{o.kind.replace("_", " ")}</td><td>{o.n}</td><td>{formatMoney(o.amount, o.currency as "IDR")}</td></tr>) : <tr><td colSpan={3} className="muted">Nothing outstanding.</td></tr>}
          </tbody></table></div>
        </section>
        <section>
          <h2>By status</h2>
          <div className="table-wrap"><table className="t compact"><tbody>
            {k.byStatus.sort((a, b) => b.n - a.n).map((x) => <tr key={x.status}><td><Link href={`/admin/applicants?status=${x.status}`}>{STATUS_LABEL[x.status as Status]}</Link></td><td>{x.n}</td></tr>)}
          </tbody></table></div>
          <h2>Countries (nationality)</h2>
          <div className="table-wrap"><table className="t compact"><tbody>{k.countries.map((c) => <tr key={c.country}><td>{countryName(c.country)}</td><td>{c.n}</td></tr>)}</tbody></table></div>
        </section>
      </div>

      <h2>Funnel, last 90 days</h2>
      <p className="small muted">Browser events count only visitors who allowed analytics; server events (started, submitted, payments) count everyone, without identifiers.</p>
      <div className="table-wrap"><table className="t compact"><tbody>{FUNNEL.map(([e, l]) => <tr key={e}><td>{l}</td><td>{f[e] ?? 0}</td></tr>)}</tbody></table></div>
      <p className="small muted" style={{ marginTop: 20 }}>Places: {s.slots.fully_funded} Fully Funded, {s.slots.partial_funded} Partial Funded.</p>
    </>
  );
}
