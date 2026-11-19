import "server-only";
import { q, one } from "./db";

export async function kpis(cohortId: string) {
  const [byPathway, byStatus, money, countries, teams, seats, funnel, outstanding] = await Promise.all([
    q<{ pathway: string; n: number; submitted: number }>(`select pathway, count(*)::int as n, count(*) filter (where status <> 'draft')::int as submitted
      from gif.applications where cohort_id = $1 and status <> 'withdrawn' group by pathway`, [cohortId]),
    q<{ status: string; n: number }>("select status, count(*)::int as n from gif.applications where cohort_id = $1 group by status", [cohortId]),
    q<{ currency: string; paid: number; refunded: number; pending: number }>(`select p.currency,
        coalesce(sum(p.amount) filter (where p.status in ('paid', 'partially_refunded') and not p.is_duplicate), 0)::numeric as paid,
        coalesce((select sum(r.amount) from gif.refunds r join gif.payments x on x.id = r.payment_id join gif.applications ax on ax.id = x.application_id where r.status = 'succeeded' and x.currency = p.currency and ax.cohort_id = $1), 0)::numeric as refunded,
        coalesce(sum(p.amount) filter (where p.status = 'pending'), 0)::numeric as pending
      from gif.payments p join gif.applications a on a.id = p.application_id where a.cohort_id = $1 group by p.currency`, [cohortId]),
    q<{ country: string; n: number }>(`select nationality as country, count(*)::int as n from gif.participants where cohort_id = $1 and withdrawn_at is null group by 1 order by 2 desc limit 15`, [cohortId]),
    one<{ teams: number; individuals: number }>(`select count(*) filter (where mode = 'team')::int as teams, count(*) filter (where mode = 'individual')::int as individuals
      from gif.applications where cohort_id = $1 and status not in ('draft', 'withdrawn')`, [cohortId]),
    one<{ confirmed: number; people: number }>(`select count(*) filter (where seat_status = 'confirmed')::int as confirmed, count(*)::int as people
      from gif.participants where cohort_id = $1 and withdrawn_at is null`, [cohortId]),
    q<{ event: string; n: number }>(`select event, count(*)::int as n from gif.analytics_events where cohort_id = $1 and at > now() - interval '90 days' group by event`, [cohortId]),
    q<{ currency: string; kind: string; n: number; amount: number }>(`select o.currency, o.kind, count(*)::int as n, sum(o.amount)::numeric as amount from gif.obligations o
      join gif.applications a on a.id = o.application_id join gif.participants p on p.id = o.participant_id
      where a.cohort_id = $1 and o.status = 'open' and a.status not in ('withdrawn', 'draft') and p.withdrawn_at is null group by 1, 2 order by 1, 2`, [cohortId]),
  ]);
  return { byPathway, byStatus, money, countries, teams, seats, funnel, outstanding };
}

export type ApplicantFilter = { q?: string; pathway?: string; status?: string; country?: string; mode?: string; payment?: string };

export async function listApplicants(cohortId: string, f: ApplicantFilter, limit = 200, onlyEvaluator?: string) {
  const where = ["a.cohort_id = $1"];
  const params: unknown[] = [cohortId];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
  if (f.q) add("(a.code ilike ? or exists (select 1 from gif.participants x where x.application_id = a.id and (x.legal_name ilike $Q or x.email ilike $Q or x.institution ilike $Q)) or a.team_name ilike $Q)".replace(/\$Q/g, `$${params.length + 1}`), `%${f.q.replace(/[%_]/g, "\\$&")}%`);
  if (onlyEvaluator) add("exists (select 1 from gif.evaluator_assignments e where e.application_id = a.id and e.evaluator_email = ?)", onlyEvaluator);
  if (f.pathway) add("a.pathway = ?", f.pathway);
  if (f.status) add("a.status = ?", f.status);
  if (f.mode) add("a.mode = ?", f.mode);
  if (f.payment) add("a.payment_status = ?", f.payment);
  if (f.country) add("exists (select 1 from gif.participants x where x.application_id = a.id and x.nationality = ?)", f.country.toUpperCase());
  params.push(limit);
  return q<{ id: string; code: string; pathway: string; mode: string; team_name: string | null; status: string; payment_status: string; document_status: string; submitted_at: string | null;
    created_at: string; leader: string | null; email: string; nationality: string | null; people: number }>(
    `select a.id, a.code, a.pathway, a.mode, a.team_name, a.status, a.payment_status, a.document_status, a.submitted_at, a.created_at,
       p.legal_name as leader, acc.email, p.nationality, (select count(*)::int from gif.participants x where x.application_id = a.id and x.withdrawn_at is null) as people
     from gif.applications a join gif.accounts acc on acc.id = a.owner_account_id left join gif.participants p on p.application_id = a.id and p.role = 'leader'
     where ${where.join(" and ")} order by a.created_at desc limit $${params.length}`, params);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // CSV formula injection guard
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}
