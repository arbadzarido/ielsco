import { NextResponse } from "next/server";
import { getAccount, can } from "@/lib/auth";
import { currentCohort } from "@/lib/cohort";
import { listApplicants, toCsv } from "@/lib/admin";
import { q } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/request";

// CSV exports for staff with the export permission. GET (a download link), so it is protected by the session cookie
// (SameSite=Lax, HttpOnly) and the role check; every export is audited.
export async function GET(req: Request) {
  const a = await getAccount();
  if (!a || !can(a.staffRole, "export")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const cohort = await currentCohort();
  let rows: Record<string, unknown>[];
  if (type === "applicants") {
    const f = Object.fromEntries(["q", "pathway", "status", "country", "mode", "payment"].map((k) => [k, url.searchParams.get(k) ?? undefined]));
    const apps = await listApplicants(cohort.id, f, 5000);
    const ids = apps.map((x) => x.id);
    const people = ids.length ? await q<Record<string, unknown>>(
      `select a.code, a.pathway, a.mode, a.team_name, a.status, a.payment_status, a.outcome, a.submitted_at, p.role, p.legal_name, p.email, p.whatsapp, p.nationality, p.residence_country,
         p.date_of_birth, p.institution, p.education_level, p.academic_background, p.country_of_study, p.currency, p.seat_status, a.discovery_source
       from gif.participants p join gif.applications a on a.id = p.application_id where a.id = any($1) order by a.code, p.role`, [ids]) : [];
    rows = people;
  } else if (type === "payments") {
    rows = await q(`select p.created_at, p.paid_at, a.code, pt.legal_name, pt.email, p.kind, p.gateway, p.order_id, p.gateway_txn_id, p.payment_type, p.amount, p.currency, p.status,
        p.is_duplicate, p.receipt_no, p.manual_reference, (select coalesce(sum(r.amount), 0) from gif.refunds r where r.payment_id = p.id and r.status = 'succeeded') as refunded
      from gif.payments p join gif.applications a on a.id = p.application_id join gif.participants pt on pt.id = p.participant_id where a.cohort_id = $1 order by p.created_at`, [cohort.id]);
  } else if (type === "obligations") {
    rows = await q(`select a.code, pt.legal_name, pt.email, o.kind, o.label, o.amount, o.currency, o.due_at, o.status, o.paid_at
      from gif.obligations o join gif.applications a on a.id = o.application_id join gif.participants pt on pt.id = o.participant_id where a.cohort_id = $1 order by a.code`, [cohort.id]);
  } else {
    return NextResponse.json({ error: "unknown export" }, { status: 400 });
  }
  await audit(a.email, "export", "cohort", cohort.id, { type, rows: rows.length }, await clientIp());
  return new NextResponse("﻿" + toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="gif-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
