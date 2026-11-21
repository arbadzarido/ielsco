#!/usr/bin/env python3
"""Generate the GIF Summer 2027 seed migration from inventory.py.

    python3 scripts/company-os/gif27/build_seed.py            # writes the migration
    python3 scripts/company-os/gif27/build_seed.py --check    # validates references only

The migration is idempotent: every row is inserted only if its code (or key) does not exist yet, existing tasks are
adopted by adding programme metadata without changing them, and nothing outside the programme tables is updated.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import inventory as I  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "supabase", "migrations", "20261129010000_company_os_gif_summer_2027.sql")


def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def arr(xs):
    return "array[" + ", ".join(q(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"


def P(pid):
    return "null" if pid is None else f"(select id from public.os_people where id = {q(pid)})"


def jb(o):
    return q(json.dumps(o, ensure_ascii=False)) + "::jsonb"


# ── Validation ─────────────────────────────────────────────────────────────────────────────────────────────────────
fact_keys = {f[0] for f in I.FACTS}
dec_codes = {d["code"] for d in I.DECISIONS}
task_codes = {t["code"] for t in I.TASKS}
out_codes = {o[0] for o in I.OUTPUTS}
res_codes = {r[0] for r in I.RESEARCH}
risk_codes = {r[0] for r in I.RISKS}
bud_codes = {b[0] for b in I.BUDGET}
errors = []


def need(kind, ref, where):
    pool = {"fact": fact_keys, "decision": dec_codes, "task": task_codes, "output": out_codes, "research": res_codes,
            "risk": risk_codes, "budget": bud_codes}[kind]
    if ref not in pool:
        errors.append(f"{where}: unknown {kind} {ref}")


for name, codes in [("decision", [d["code"] for d in I.DECISIONS]), ("task", [t["code"] for t in I.TASKS]),
                    ("output", [o[0] for o in I.OUTPUTS]), ("fact", [f[0] for f in I.FACTS])]:
    dup = {c for c in codes if codes.count(c) > 1}
    if dup:
        errors.append(f"duplicate {name}: {sorted(dup)}")
for d in I.DECISIONS:
    for k, pool in [("tasks", "task"), ("outputs", "output"), ("facts", "fact"), ("research", "research"), ("risks", "risk")]:
        for r in d[k]:
            need(pool, r, d["code"])
    keys = [o["key"] for o in d["options"]]
    if d["recommended"] and d["recommended"] not in keys:
        errors.append(f"{d['code']}: recommended {d['recommended']} not an option")
    for o in d["options"]:
        for fk in o["fact_updates"]:
            need("fact", fk, d["code"] + " option " + o["key"])
for t in I.TASKS:
    for r in t["depends"]:
        need("task", r, t["code"])
    for r in t["decisions"]:
        need("decision", r, t["code"])
    for r in t["outputs"]:
        need("output", r, t["code"])
    for r in t["budget"]:
        need("budget", r, t["code"])
    for r in t["research"]:
        need("research", r, t["code"])
    if t["owner"] not in I.NAME:
        errors.append(f"{t['code']}: owner")
for r in I.RESEARCH:
    for x in r[8]:
        need("decision", x, r[0])
for f, targets in I.FACT_LINKS.items():
    need("fact", f, "FACT_LINKS")
    for x in targets:
        need("budget" if x.startswith("GIF-BUD") else "output", x, "FACT_LINKS " + f)
for b in I.BUDGET:
    for fk in (b[10], b[11]):
        if fk:
            need("fact", fk, b[0])
for fnd in I.FINDINGS:
    if fnd[6]:
        need("decision", fnd[6], fnd[0])
for m in I.MILESTONES:
    for ref in (m[11] or "").split(", "):
        if ref.startswith("GIF-DEC"):
            need("decision", ref, m[0])
        elif ref.startswith("GIF-T"):
            need("task", ref, m[0])
if errors:
    print("\n".join(errors))
    sys.exit(1)
if "--check" in sys.argv:
    print("ok:", len(I.FACTS), "facts,", len(I.DECISIONS), "decisions,", len(I.TASKS), "tasks,", len(I.RESEARCH), "research,",
          len(I.RISKS), "risks,", len(I.BUDGET), "budget lines,", len(I.OUTPUTS), "outputs,", len(I.MILESTONES), "milestones")
    sys.exit(0)

# ── Links (one dependency graph) ───────────────────────────────────────────────────────────────────────────────────
links = []  # (from_kind, from_ref, to_kind, to_ref, relation)
for d in I.DECISIONS:
    for r in d["facts"]:
        links.append(("decision", d["code"], "fact", r, "affects"))
    for r in d["outputs"]:
        links.append(("decision", d["code"], "output", r, "affects"))
    for r in d["tasks"]:
        links.append(("decision", d["code"], "task", r, "blocks"))
    for r in d["risks"]:
        links.append(("decision", d["code"], "risk", r, "informs"))
    for r in d["research"]:
        links.append(("research", r, "decision", d["code"], "evidence_for"))
for t in I.TASKS:
    for r in t["decisions"]:
        links.append(("decision", r, "task", t["code"], "blocks"))
    for r in t["depends"]:
        links.append(("task", r, "task", t["code"], "blocks"))
    for r in t["research"]:
        links.append(("research", r, "task", t["code"], "informs"))
    for r in t["budget"]:
        links.append(("task", t["code"], "budget", r, "informs"))
for r in I.RESEARCH:
    for x in r[8]:
        links.append(("research", r[0], "decision", x, "evidence_for"))
for f, targets in I.FACT_LINKS.items():
    for x in targets:
        links.append(("fact", f, "budget" if x.startswith("GIF-BUD") else "output", x, "affects"))
for b in I.BUDGET:
    for fk in (b[10], b[11]):
        if fk:
            links.append(("fact", fk, "budget", b[0], "affects"))
for c in I.PROGRAMME["countries"]:
    links.append(("decision", "GIF-DEC-004", "country_plan", f"{c}:Accommodation", "affects"))
    links.append(("decision", "GIF-DEC-016", "country_plan", f"{c}:Local community support", "affects"))
    links.append(("decision", "GIF-DEC-018", "country_plan", f"{c}:Institutional engagement", "affects"))
for s in ["Arrival and departure", "Accommodation", "Transportation", "Institutional engagement", "Venues"]:
    links.append(("decision", "GIF-DEC-002", "country_plan", f"Malaysia:{s}", "affects"))
links.append(("decision", "GIF-DEC-003", "country_plan", "Malaysia:Transportation", "affects"))
links.append(("decision", "GIF-DEC-003", "country_plan", "Thailand:Transportation", "affects"))
seen = set()
links = [l for l in links if not (l in seen or seen.add(l)) and not (l[0] == l[2] and l[1] == l[3])]

# ── SQL ────────────────────────────────────────────────────────────────────────────────────────────────────────────
L = []
w = L.append
w("""-- GIF Summer 2027: initial programme workspace content (generated by scripts/company-os/gif27/build_seed.py from
-- scripts/company-os/gif27/inventory.py; regenerate rather than edit by hand).
--
-- Runs only if the GIF project PRJ-0033 exists. Idempotent: rows are inserted only when their code or key is new, the
-- four existing GIF tasks (TSK-0106, TSK-0107, TSK-0114, TSK-0115) are adopted by adding programme metadata without
-- changing them, and no existing record outside the programme tables is updated. Old timeline rows, calendar events,
-- people and permissions are left as they are; conflicts are listed as findings for the founders.
--
-- Every item says what it is: facts and decisions carry a status (Decided only with a founder decision on record),
-- costs are "Not estimated" until there is a quote, and partners start at "To research".

do $seed$
declare
  v_prj  constant text := 'PRJ-0033';
  v_co   text;
  v_div  text;
  v_task text;
  v_od   text;
  v_opp  text;
  v_tl   text;
begin
  select company_code, division_id into v_co, v_div from public.os_projects where id = v_prj;
  if v_co is null then
    raise notice 'Project % not found: GIF Summer 2027 seed skipped', v_prj;
    return;
  end if;
""")
g = I.PROGRAMME
w(f"""  insert into public.os_programmes (project_id, code, name, starts_on, ends_on, gif_cohort_id, countries, approver_person_ids)
  values (v_prj, {q(g['code'])}, {q(g['name'])}, {q(g['starts_on'])}, {q(g['ends_on'])}, {q(g['gif_cohort_id'])}, {arr(g['countries'])},
          array(select id from public.os_people where id = any ({arr(g['approvers'])}) order by id))
  on conflict (project_id) do nothing;
""")

# Facts
src_dec = {}
for d in I.DECISIONS:
    if d["status"] == "Decided":
        for f in d["facts"]:
            src_dec.setdefault(f, d["code"])
w("  -- Canonical facts")
for i, (key, label, cat, value, unit, status, public, source, notes) in enumerate(I.FACTS):
    w(f"  insert into public.os_programme_facts (project_id, key, label, category, value, unit, status, public_facing, source, source_decision, notes, sort)"
      f" values (v_prj, {q(key)}, {q(label)}, {q(cat)}, {q(value)}, {q(unit)}, {q(status)}, {q(public)}, {q(source)}, {q(src_dec.get(key))}, {q(notes)}, {i * 10})"
      f" on conflict (project_id, key) do nothing;")

# Decisions
w("\n  -- Decisions (open ones carry a recommendation; Decided ones cite the founder decision on record)")
for i, d in enumerate(I.DECISIONS):
    cols = ("project_id, code, title, question, background, why_it_matters, current_situation, evidence, options, recommended_option, "
            "recommendation, info_needed, delay_consequence, dependencies, priority, phase, suggested_deadline, deadline_basis, "
            "owner_person_id, status, sort")
    deps = d["dependencies"]
    if not deps:
        parts = []
        if d["research"]:
            parts.append("Research: " + ", ".join(d["research"]))
        if d["tasks"]:
            parts.append("Tasks: " + ", ".join(d["tasks"]))
        deps = "; ".join(parts) or None
    vals = (f"v_prj, {q(d['code'])}, {q(d['title'])}, {q(d['question'])}, {q(d['background'])}, {q(d['why'])}, {q(d['current'])}, "
            f"{q(d['evidence'])}, {jb(d['options'])}, {q(d['recommended'])}, {q(d['recommendation'])}, {q(d['info_needed'])}, "
            f"{q(d['delay'])}, {q(deps)}, {q(d['priority'])}, {q(d['phase'])}, {q(d['deadline'])}, {q(d['basis'])}, {P(d['owner'])}, "
            f"{q(d['status'])}, {i * 10}")
    if d["status"] == "Decided":
        x = d["decided"]
        w(f"""  if not exists (select 1 from public.os_programme_decisions where code = {q(d['code'])}) then
    insert into public.os_decisions (company_code, division_id, project_id, decision, rationale, changes, decided_on, status, source_link, sensitivity)
    values (v_co, v_div, v_prj, {q(d['code'] + ' ' + d['title'] + ': ' + x['final'])}, {q(x['reason'])}, 'Recorded from the programme decision register (decision made before the register existed)',
            {q(x['on'])}, 'Approved', {q('/os/gif/decisions/' + d['code'])}, 'Internal')
    returning id into v_od;
    insert into public.os_programme_decisions ({cols}, final_decision, decision_reason, decided_on, os_decision_id)
    values ({vals}, {q(x['final'])}, {q(x['reason'])}, {q(x['on'])}, v_od);
  end if;""")
    else:
        w(f"  insert into public.os_programme_decisions ({cols}) values ({vals}) on conflict (code) do nothing;")

# Research
w("\n  -- Research and verification (nothing is verified yet)")
for i, (code, qn, why, country, info, stype, owner, due, _decs) in enumerate(I.RESEARCH):
    w(f"  insert into public.os_programme_research (project_id, code, question, why_it_matters, country, info_required, source_type, owner_person_id, due_date, sort)"
      f" values (v_prj, {q(code)}, {q(qn)}, {q(why)}, {q(country)}, {q(info)}, {q(stype)}, {P(owner)}, {q(due)}, {i * 10}) on conflict (code) do nothing;")

# Risks
w("\n  -- Risks")
for i, (code, title, cat, country, lk, im, prev, mit, cont, esc, owner, review, before) in enumerate(I.RISKS):
    w(f"  insert into public.os_programme_risks (project_id, code, title, category, country, likelihood, impact, prevention, mitigation, contingency, escalation, owner_person_id, review_on, decide_before, sort)"
      f" values (v_prj, {q(code)}, {q(title)}, {q(cat)}, {q(country)}, {lk}, {im}, {q(prev)}, {q(mit)}, {q(cont)}, {q(esc)}, {P(owner)}, {q(review)}, {q(before)}, {i * 10}) on conflict (code) do nothing;")

# Budget
w("\n  -- Budget model (no invented costs: lines stay 'Not estimated' until a quote or approved estimate exists)")
for i, (code, sec, cat, country, act, desc, basis, cur, unit, qty, ufact, qfact, owner, notes) in enumerate(I.BUDGET):
    w(f"  insert into public.os_programme_budget_lines (project_id, code, section, category, country, activity, description, basis, currency, unit_amount, quantity, unit_fact, quantity_fact, owner_person_id, notes, sort)"
      f" values (v_prj, {q(code)}, {q(sec)}, {q(cat)}, {q(country)}, {q(act)}, {q(desc)}, {q(basis)}, {q(cur)}, {q(unit)}, {q(qty)}, {q(ufact)}, {q(qfact)}, {P(owner)}, {q(notes)}, {i * 10}) on conflict (code) do nothing;")

# Outputs
DOC_FOR = {"GIF-OUT-002": "DOC-0054"}
w("\n  -- Outputs register")
for i, (code, title, otype, aud, loc, owner, ver, appr, notes) in enumerate(I.OUTPUTS):
    doc = f"(select id from public.os_documents where id = {q(DOC_FOR[code])})" if code in DOC_FOR else "null"
    w(f"  insert into public.os_programme_outputs (project_id, code, title, output_type, audience, location, os_document_id, owner_person_id, version, approval_status, notes, sort)"
      f" values (v_prj, {q(code)}, {q(title)}, {q(otype)}, {q(aud)}, {q(loc)}, {doc}, {P(owner)}, {q(ver)}, {q(appr)}, {q(notes)}, {i * 10}) on conflict (code) do nothing;")

# Country plans
w("\n  -- Country plans")
LS = {"Singapore": "Indonesian student association (PPI Singapura), host-university clubs, paid local coordinator (GIF-LP-005, -008, -012)",
      "Malaysia": "Indonesian student association (PPI Malaysia), host-university student council, paid local coordinator (GIF-LP-006, -009, -013)",
      "Thailand": "Indonesian student association (PPI Thailand), host-university student organisations, paid local coordinator (GIF-LP-007, -010, -014)"}
for c in I.PROGRAMME["countries"]:
    for i, s in enumerate(I.SECTIONS):
        st, known, open_ = I.COUNTRY_KNOWN.get((c, s), ("Unknown", None, None))
        open_ = open_ or f"Not researched yet. {I.NAME[I.COUNTRY_LEAD[c]]} (country lead) to fill with sources."
        ls = LS[c] if s in ("Local community support", "Daily operations", "Event production", "Activities") else None
        w(f"  insert into public.os_programme_country_plans (project_id, country, section, status, known, open_items, local_support, lead_person_id, sort)"
          f" values (v_prj, {q(c)}, {q(s)}, {q(st)}, {q(known)}, {q(open_)}, {q(ls)}, {P(I.COUNTRY_LEAD[c])}, {i * 10}) on conflict do nothing;")

# Checklists
w("\n  -- Checklists and participant journey")
n = 0
for name, items in I.CHECKLISTS:
    for i, (item, owner, due) in enumerate(items):
        n += 1
        timing = "Every programme day" if name == "Daily on-site" else None
        w(f"  insert into public.os_programme_checklist_items (project_id, code, checklist, item, owner_person_id, due_date, timing, prepare_before_event, sort)"
          f" values (v_prj, {q(f'GIF-CHK-{n:03d}')}, {q(name)}, {q(item)}, {P(owner)}, {q(due)}, {q(timing)}, {q(name == 'Pre-event readiness')}, {i * 10}) on conflict (code) do nothing;")
chk_n = n

# Run sheet skeleton
w("\n  -- Run sheet skeleton (country per day pending GIF-DEC-004)")
n = 0
for di, day in enumerate(I.RUN_DAYS):
    country = "Singapore" if di == 0 else ("Thailand" if di == len(I.RUN_DAYS) - 1 else "TBD")
    main = ("Arrival in Singapore, check-in, welcome and orientation" if di == 0 else
            "Departure from Bangkok; airport transfers" if di == len(I.RUN_DAYS) - 1 else
            "Programme day: sessions to be planned from the approved itinerary")
    rows = [("07:00", "07:30", "Core team briefing", I.FARREL, "Skeleton"),
            (None, None, main, I.RENITA, "Proposed" if di in (0, len(I.RUN_DAYS) - 1) else "Skeleton"),
            ("21:00", "21:30", "Core team debrief and incident review", I.FARREL, "Skeleton")]
    for ri, (s, e, act, lead, st) in enumerate(rows):
        n += 1
        w(f"  insert into public.os_programme_run_sheet (project_id, code, day, country, starts, ends, activity, lead_person_id, status, sort)"
          f" values (v_prj, {q(f'GIF-RUN-{n:03d}')}, {q(day)}, {q(country)}, {q(s)}, {q(e)}, {q(act)}, {P(lead)}, {q(st)}, {ri * 10}) on conflict (code) do nothing;")
run_n = n

# Team and workstreams
w("\n  -- Proposed team allocation (status Proposed until an approver approves it: GIF-DEC-011)")
for (pid, role, acc, sup, approves, esc, lead, onsite, cap, basis) in I.TEAM:
    w(f"  insert into public.os_programme_team (project_id, person_id, programme_role, accountable_for, supports, approves, escalates_to, country_lead, on_site_role, capacity_note, basis)"
      f" select v_prj, {q(pid)}, {q(role)}, {arr(acc)}, {arr(sup)}, {q(approves)}, {q(esc)}, {q(lead)}, {q(onsite)}, {q(cap)}, {q(basis)}"
      f" where exists (select 1 from public.os_people where id = {q(pid)}) on conflict do nothing;")
for (letter, name, acc, sup, local) in I.WORKSTREAMS:
    w(f"  insert into public.os_programme_workstreams (project_id, letter, name, accountable_person_id, support_person_ids, local_support)"
      f" values (v_prj, {q(letter)}, {q(name)}, {P(acc)}, array(select id from public.os_people where id = any ({arr(sup)}) order by id), {q(local)}) on conflict do nothing;")

# Tasks
w("\n  -- Tasks (os_tasks + programme metadata). Existing GIF tasks are adopted, not changed.")
for t in I.TASKS:
    reviewer = None
    if t["approval"]:
        reviewer = I.FARREL if t["owner"] == I.ARBA else I.ARBA
    status = "Ready" if t["due"] <= "2027-01-31" else "Backlog"
    meta_cols = ("task_id, project_id, code, category, phase, country, supporting, external_dependency, effort_hours, deliverable, "
                 "needs_core, local_support, needs_vendor, needs_approval, automatable, simplify, waiting_on, critical_path")
    meta_vals = (f"v_task, v_prj, {q(t['code'])}, {q(t['cat'])}, {t['phase']}, {q(t['country'])}, {q(t['support'])}, {q(t['ext'])}, "
                 f"{q(t['effort'])}, {q(t['deliverable'])}, {q(t['core'])}, {q(t['local'])}, {q(t['vendor'])}, {q(t['approval'])}, "
                 f"{q(t['auto'])}, {q(t['simplify'])}, {q(t['waiting'])}, {q(t['critical'])}")
    if t["adopt"]:
        w(f"""  if not exists (select 1 from public.os_programme_task_meta where code = {q(t['code'])}) then
    select id into v_task from public.os_tasks where id = {q(t['adopt'])} and project_id = v_prj;
    if v_task is not null and not exists (select 1 from public.os_programme_task_meta where task_id = v_task) then
      insert into public.os_programme_task_meta ({meta_cols}) values ({meta_vals});
    end if;
  end if;""")
    else:
        w(f"""  if not exists (select 1 from public.os_programme_task_meta where code = {q(t['code'])}) then
    insert into public.os_tasks (project_id, title, description, definition_of_done, owner_person_id, reviewer_person_id, status, priority, due_date)
    values (v_prj, {q(t['title'])}, {q(t['desc'])}, {q(t['dod'])}, {P(t['owner'])}, {P(reviewer)}, {q(status)}, {q(t['priority'])}, {q(t['due'])})
    returning id into v_task;
    insert into public.os_programme_task_meta ({meta_cols}) values ({meta_vals});
  end if;""")

# Partners
w("\n  -- Local partners and institutions (os_partnerships + programme metadata). None contacted yet for GIF 2027.")
for (code, org, country, city, kind, types, status, notes) in I.PARTNERS:
    w(f"""  if not exists (select 1 from public.os_programme_partner_meta where code = {q(code)}) then
    insert into public.os_partnerships (company_code, division_id, opportunity_type, organisation, source, stage, evidence_status, owner_person_id, related_project_id, next_action, notes, sensitivity)
    values (v_co, (select id from public.os_divisions where id = 'DIV-06'), {q('GIF 2027: ' + kind)}, {q(org)}, 'GIF Summer 2027 local support plan', '1 Identified', null,
            {P(I.SHAFIRA)}, v_prj, 'Research the official contact route', {q(notes)}, 'Internal')
    returning id into v_opp;
    insert into public.os_programme_partner_meta (partnership_id, project_id, code, country, city, party_kind, support_types, status, supervisor_person_id)
    values (v_opp, v_prj, {q(code)}, {q(country)}, {q(city)}, {q(kind)}, {arr(types)}, {q(status)}, {P(I.COUNTRY_LEAD.get(country, I.SHAFIRA))});
  end if;""")

# Findings
w("\n  -- Data-quality findings")
for i, (code, title, detail, ev, sev, action, dec) in enumerate(I.FINDINGS):
    w(f"  insert into public.os_programme_findings (project_id, code, title, detail, evidence, severity, proposed_action, decision_code, sort)"
      f" values (v_prj, {q(code)}, {q(title)}, {q(detail)}, {q(ev)}, {q(sev)}, {q(action)}, {q(dec)}, {i * 10}) on conflict (code) do nothing;")

# Links
w("\n  -- Dependency graph")
for (fk, fr, tk, tr, rel) in links:
    w(f"  insert into public.os_programme_links (project_id, from_kind, from_ref, to_kind, to_ref, relation) values (v_prj, {q(fk)}, {q(fr)}, {q(tk)}, {q(tr)}, {q(rel)}) on conflict do nothing;")

# Milestones on the Master Timeline (WS10)
FACT_FOR_MS = {"Fully Funded applications open": "dates.fully_funded_opens", "Selection results": "dates.results",
               "Balance due": "payments.balance_due", "GIF Summer 2027 programme": "dates.programme",
               "Phase 2 (essay and pitch deck)": "dates.phase2", "Phase 3 (video presentation)": "dates.phase3",
               "Phase 1 closes": "dates.phase1_close", "Participant preparation": "dates.preparation",
               "Route, cities and day split decided": "route.malaysia_city"}
w("\n  -- Milestones on the Master Timeline (workstream WS10). The old GIF rows stay untouched (finding GIF-FND-001).")
for (title, start, due, owner, status, approved, gate, deps, deliv, risk, major, refs) in I.MILESTONES:
    label = "Decided date" if approved else "Proposed date"
    refs_l = [r for r in (refs or "").split(", ") if r]
    if title in FACT_FOR_MS:
        refs_l.append(FACT_FOR_MS[title])
    w(f"""  select id into v_tl from public.os_timeline_items where project_id = v_prj and workstream_code = 'WS10' and title = {q(title)} limit 1;
  if v_tl is null then
    insert into public.os_timeline_items (id, company_code, workstream_code, workstream_name, title, deliverable, owner_person_id, owner_name,
      dependencies, planned_start, due_date, status, decision_gate, risk, is_major, planning_label, linked_refs, project_id, priority, sensitivity)
    values (public.os_next_id('TL', 3), v_co, 'WS10', 'GIF Summer 2027', {q(title)}, {q(deliv)}, {P(owner)}, {q(I.NAME[owner])},
      {q(deps)}, {q(start)}, {q(due)}, {q(status)}, {q(gate)}, {q(risk)}, {q(major)}, {q(label)}, {q(", ".join(refs_l) or None)}, v_prj,
      {q('P1 Critical' if major else 'P2 High')}, 'Internal')
    returning id into v_tl;
  end if;""")
    for r in refs_l:
        if r.startswith("GIF-DEC"):
            kind, rel = "decision", "affects"
        elif r.startswith("GIF-T"):
            kind, rel = "task", "informs"
        else:
            kind, rel = "fact", "affects"
        w(f"  insert into public.os_programme_links (project_id, from_kind, from_ref, to_kind, to_ref, relation) values (v_prj, {q(kind)}, {q(r)}, 'milestone', v_tl, {q(rel)}) on conflict do nothing;")
    w("  v_tl := null;")

# Counters: future records continue after the seeded codes
mx = {"GIF-DEC": max(int(c[-3:]) for c in dec_codes), "GIF-RES": len(I.RESEARCH), "GIF-RSK": len(I.RISKS), "GIF-BUD": len(I.BUDGET),
      "GIF-OUT": max(int(o[0][-3:]) for o in I.OUTPUTS), "GIF-CHK": chk_n, "GIF-RUN": run_n,
      "GIF-FND": len(I.FINDINGS), "GIF-T": max(int(t["code"].split("-")[-1]) for t in I.TASKS),
      "GIF-LP": len(I.PARTNERS), "GIF-CHG": 0}
w("\n  -- Code counters continue after the seeded codes")
for p, v in mx.items():
    w(f"  insert into public.os_programme_counters as c (prefix, last) values ({q(p)}, {v}) on conflict (prefix) do update set last = greatest(c.last, excluded.last);")
w("end $seed$;")
w("")
with open(OUT, "w") as fh:
    fh.write("\n".join(L))
print("wrote", os.path.relpath(OUT, ROOT), "with", len(links), "links,", len(I.TASKS), "tasks,", len(I.DECISIONS), "decisions")
