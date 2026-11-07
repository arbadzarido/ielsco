"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useOsMe } from "@/components/os/OsProvider";
import { friendlyError, useDirectory, useMyScope, useQuery } from "@/components/os/data";
import { PersonSelect } from "@/components/os/pickers";
import { RecordSheet } from "@/components/os/records";
import { Empty, ErrorLine, Field, Loading, PageTitle, RowList, Section, Sheet, StatusBadge, btn, btnGhost, btnPrimary, muted } from "@/components/os/ui";
import { WORKSPACES, companyName, fmtDate, personLabel, relativeDue } from "@/lib/os/meta";
import { cn } from "@/lib/utils";

type Cycle = { id: string; name: string; company_code: string; period_start: string; period_end: string; self_due: string | null; manager_due: string | null; status: string };
type Review = { id: string; cycle_id: string; person_id: string; reviewer_person_id: string | null; status: string; updated_at: string };

export default function ReviewsPage() {
  const { me, supabase } = useOsMe();
  const scope = useMyScope();
  const dir = useDirectory();
  const people = dir?.peopleById ?? new Map();
  const cycles = useQuery<Cycle[]>((s) => s.from("os_review_cycles").select("id, name, company_code, period_start, period_end, self_due, manager_due, status").order("period_end", { ascending: false }), []);
  const reviews = useQuery<Review[]>((s) => s.from("os_reviews").select("id, cycle_id, person_id, reviewer_person_id, status, updated_at").order("updated_at", { ascending: false }), []);
  const [cycleSheet, setCycleSheet] = useState<Cycle | "new" | null>(null);
  const [addFor, setAddFor] = useState<Cycle | null>(null);
  const [person, setPerson] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const byCycle = new Map((cycles.data ?? []).map((c) => [c.id, c]));
  const mine = (reviews.data ?? []).filter((r) => r.person_id === me.person.id);
  const toWrite = (reviews.data ?? []).filter((r) => r.person_id !== me.person.id);
  const canOpen = me.isAdmin || scope.isManager;

  async function addReview() {
    if (!addFor || !person) return;
    setErr(null);
    const { error } = await supabase.from("os_reviews").insert({ cycle_id: addFor.id, person_id: person, reviewer_person_id: reviewer || null });
    if (error) return setErr(/duplicate|unique/i.test(error.message) ? "That person already has a review in this cycle." : friendlyError(error.message));
    setAddFor(null); setPerson(""); setReviewer(""); reviews.reload();
  }
  const due = (r: Review, who: "self" | "manager") => { const c = byCycle.get(r.cycle_id); const d = who === "self" ? c?.self_due : c?.manager_due; const rd = relativeDue(d); return d ? <span className={cn("text-xs", rd?.overdue && "font-medium text-[#A12D2F]")}>{rd?.overdue ? rd.label : fmtDate(d)}</span> : <span className={cn("text-xs", muted)}>—</span>; };

  return (
    <div>
      <PageTitle title="Performance reviews" description="Reviews are private to the person, their manager and founders. Nothing here is ranked or scored automatically."
        actions={me.isAdmin ? <button type="button" className={btnPrimary} onClick={() => setCycleSheet("new")}><Plus size={16} aria-hidden="true" />Review cycle</button> : undefined} />
      <ErrorLine message={reviews.error ?? err} />
      {reviews.loading && !reviews.data ? <Loading /> : (
        <div className="space-y-6">
          <Section title="My reviews">
            <RowList rows={mine} rowKey={(r) => r.id} rowHref={(r) => `/os/reviews/${r.id}`}
              empty={<Empty compact title="No reviews for you yet" body="When a review cycle opens, your review appears here for your self-assessment." />}
              columns={[
                { key: "c", label: "Cycle", primary: true, className: "w-[40%]", render: (r) => byCycle.get(r.cycle_id)?.name ?? r.cycle_id },
                { key: "s", label: "Status", className: "w-32", render: (r) => <StatusBadge value={r.status} /> },
                { key: "rv", label: "Reviewer", className: "w-36", render: (r) => personLabel(people, r.reviewer_person_id, "Not assigned") },
                { key: "d", label: "Self-assessment due", className: "w-36", render: (r) => due(r, "self") },
              ]} />
          </Section>
          {(toWrite.length > 0 || canOpen) && (
            <Section title="Reviews you write or oversee">
              <RowList rows={toWrite} rowKey={(r) => r.id} rowHref={(r) => `/os/reviews/${r.id}`}
                empty={<Empty compact title="None yet" body={me.isAdmin ? "Open a review cycle, then add a review for each person." : "Reviews for the people you manage appear here."} />}
                columns={[
                  { key: "p", label: "Person", primary: true, className: "w-[30%]", render: (r) => personLabel(people, r.person_id) },
                  { key: "c", label: "Cycle", className: "w-[25%]", render: (r) => <span className="truncate">{byCycle.get(r.cycle_id)?.name ?? r.cycle_id}</span> },
                  { key: "s", label: "Status", className: "w-32", render: (r) => <StatusBadge value={r.status} /> },
                  { key: "d", label: "Manager review due", className: "w-36", render: (r) => due(r, "manager") },
                ]} />
            </Section>
          )}
          {!!cycles.data?.length && (
            <Section title="Cycles">
              <ul className="space-y-2">
                {cycles.data.map((c) => {
                  const rs = (reviews.data ?? []).filter((r) => r.cycle_id === c.id);
                  const done = rs.filter((r) => ["Completed", "Acknowledged"].includes(r.status)).length;
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#E6E9EE] bg-white px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 font-medium">{c.name} <span className={cn("font-normal", muted)}>· {companyName(c.company_code)} · {fmtDate(c.period_start)} – {fmtDate(c.period_end)}</span></span>
                      <span className={cn("text-xs", muted)}>{done} of {rs.length} complete</span>
                      <StatusBadge value={c.status} />
                      {canOpen && c.status !== "Closed" && <button type="button" className={btnGhost} onClick={() => setAddFor(c)}>Add review</button>}
                      {me.isAdmin && <button type="button" className={btnGhost} onClick={() => setCycleSheet(c)}>Edit</button>}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>
      )}
      <RecordSheet open={!!cycleSheet} title={cycleSheet === "new" ? "New review cycle" : `Cycle ${cycleSheet?.id ?? ""}`} table="os_review_cycles" record={cycleSheet === "new" ? null : cycleSheet}
        defaults={{ company_code: cycleSheet === "new" ? "IEL" : undefined, status: "Draft" }}
        fields={[{ key: "name", label: "Name", required: true, hint: "For example H1 2027." },
          ...(cycleSheet === "new" ? [{ key: "company_code", label: "Company", kind: "select" as const, options: WORKSPACES.map((w) => ({ value: w.code, label: w.name })), required: true }] : []),
          { key: "period_start", label: "Period start", kind: "date", required: true }, { key: "period_end", label: "Period end", kind: "date", required: true },
          { key: "self_due", label: "Self-assessment due", kind: "date" }, { key: "manager_due", label: "Manager review due", kind: "date" },
          { key: "status", label: "Status", kind: "select", options: ["Draft", "Open", "Closed"], required: true }]}
        onClose={() => setCycleSheet(null)} onSaved={() => { setCycleSheet(null); cycles.reload(); }} />
      <Sheet open={!!addFor} onClose={() => setAddFor(null)} title={`Add a review to ${addFor?.name ?? ""}`}
        footer={<><button type="button" className={btn} onClick={() => setAddFor(null)}>Cancel</button><button type="button" className={btnPrimary} onClick={addReview} disabled={!person}>Add</button></>}>
        <div className="space-y-4">
          <ErrorLine message={err} />
          <Field label="Person">{(id) => <PersonSelect id={id} value={person} onChange={setPerson} placeholder="Choose…" />}</Field>
          <Field label="Reviewer" hint="Usually their manager.">{(id) => <PersonSelect id={id} value={reviewer} onChange={setReviewer} placeholder="Choose…" />}</Field>
          <p className={cn("text-xs", muted)}>Managers can add reviews for people in the divisions they manage; founders for anyone.</p>
        </div>
      </Sheet>
    </div>
  );
}
