-- Company OS division workspaces, phase 3: Finance and Legal foundations.
--
-- Finance is a control system, not accounting software. One transaction record (TRX-) per expense, reimbursement or
-- income line, moving through states that never blur: requested -> approved (expenses) -> verified -> paid / received
-- -> reconciled, or rejected / cancelled. Only paid, received and reconciled lines are actual cash; approved and
-- verified expenses are commitments; requested lines are only asks. Amounts are whole rupiah (bigint).
--
-- Legal keeps registers: letters (incoming and outgoing), agreements (contracts, MoUs, NDAs), compliance deadlines,
-- and configurable numbering rules. A number is issued in one locked step that also writes the number register, so
-- two people can't receive the same number and a voided number stays in the register forever.
--
-- Who does what is configurable through the Phase 1 workspace roles, never hardcoded to people:
--   Finance: founders and Finance Approver / Lead approve; Finance members, officers, approvers and leads (or an edit
--   grant) verify, pay and reconcile; Finance viewers read.
--   Legal: founders and Legal Signatory / Lead approve and issue; Legal members and above register and draft.
--   Numbering rules: founders only.
-- Today nobody holds a Finance or Legal role, so founders alone run both.
--
-- Files stay in Google Drive: receipts, letters and agreements are os_documents linked through os_document_links.
-- Cross-division asks stay os_requests (Phase 2); Finance and Legal records link back to them.
--
-- Additive only: new tables and functions, new nullable columns, new values in check lists. Phase 2's
-- os_request_submit gains two optional arguments (project or partnership link), so it is recreated.

-- ── Who runs Finance and Legal ─────────────────────────────────────────────────────────────────────────────────────
create or replace function public.os_division_by_code(p_code text) returns text
language sql stable security definer set search_path = '' as $$ select id from public.os_divisions where code = p_code $$;

create or replace function public.os_fin_view() returns boolean language sql stable security definer set search_path = '' as $$
  select public.os_workspace_access(public.os_division_by_code('FIN'), 'view') $$;
create or replace function public.os_fin_operate() returns boolean language sql stable security definer set search_path = '' as $$
  select public.os_workspace_access(public.os_division_by_code('FIN'), 'edit') $$;
create or replace function public.os_fin_approver() returns boolean language sql stable security definer set search_path = '' as $$
  select public.os_is_staff() and (public.os_is_founder() or public.os_workspace_role_active(public.os_division_by_code('FIN'), array['approver', 'lead'])) $$;
create or replace function public.os_leg_view() returns boolean language sql stable security definer set search_path = '' as $$
  select public.os_workspace_access(public.os_division_by_code('LEG'), 'view') $$;
create or replace function public.os_leg_operate() returns boolean language sql stable security definer set search_path = '' as $$
  select public.os_workspace_access(public.os_division_by_code('LEG'), 'edit') $$;
create or replace function public.os_leg_signer() returns boolean language sql stable security definer set search_path = '' as $$
  select public.os_is_staff() and (public.os_is_founder() or public.os_workspace_role_active(public.os_division_by_code('LEG'), array['signatory', 'lead'])) $$;

-- People to tell: 'fin_approvers', 'fin_operators', 'leg_signers', 'leg_operators'. Founders when nobody holds the role.
create or replace function public.os_fl_people(p_group text) returns setof text
language sql stable security definer set search_path = '' as $$
  with div as (select public.os_division_by_code(case when p_group like 'fin%' then 'FIN' else 'LEG' end) d),
  roles as (
    select r.person_id from public.os_workspace_roles r, div
    where r.division_id = div.d and r.revoked_at is null and (r.expires_at is null or r.expires_at > now())
      and r.role = any (case p_group when 'fin_approvers' then array['approver', 'lead'] when 'leg_signers' then array['signatory', 'lead']
                                     else array['member', 'officer', 'approver', 'signatory', 'lead'] end)
  )
  select person_id from roles
  union select p.id from public.os_people p where p.org_role = 'founder' and p.status = 'active'
$$;

-- ── Shared history for Finance and Legal records ───────────────────────────────────────────────────────────────────
create table if not exists public.os_record_events (
  id               bigint generated always as identity primary key,
  entity_type      text not null check (entity_type in ('transaction', 'budget', 'letter', 'agreement', 'compliance', 'number_rule')),
  entity_id        text not null,
  at               timestamptz not null default now(),
  actor_person_id  text references public.os_people (id),
  action           text not null,
  from_status      text,
  to_status        text,
  note             text check (note is null or length(note) <= 2000)
);
create index if not exists os_record_events_entity_idx on public.os_record_events (entity_type, entity_id, id);

create or replace function public.os_fl_log(p_type text, p_id text, p_action text, p_from text, p_to text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.os_record_events (entity_type, entity_id, actor_person_id, action, from_status, to_status, note)
  values (p_type, p_id, public.os_current_person(), p_action, p_from, p_to, nullif(trim(coalesce(p_note, '')), ''));
end $$;

create or replace function public.os_fl_tell(p_group text, p_person text, p_kind text, p_type text, p_id text, p_title text, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare who text; n bigint := (select max(id) from public.os_record_events where entity_type = p_type and entity_id = p_id);
begin
  if p_person is not null then
    perform public.os_notify(p_person, p_kind, p_type, p_id, p_title, p_body, 'fl:' || p_type || ':' || p_id || ':' || coalesce(n, 0) || ':' || p_person);
  end if;
  if p_group is not null then
    for who in select * from public.os_fl_people(p_group) loop
      perform public.os_notify(who, p_kind, p_type, p_id, p_title, p_body, 'fl:' || p_type || ':' || p_id || ':' || coalesce(n, 0) || ':' || who);
    end loop;
  end if;
end $$;

-- ── Finance configuration: categories and cash accounts ────────────────────────────────────────────────────────────
create table if not exists public.os_fin_categories (
  code        text primary key check (code ~ '^[a-z0-9_]{2,40}$'),
  name        text not null check (length(trim(name)) between 1 and 80),
  direction   text not null check (direction in ('expense', 'income')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.os_fin_accounts (
  id             text primary key check (id ~ '^FAC-[0-9]{4,}$'),
  company_code   text not null references public.os_companies (code),
  name           text not null check (length(trim(name)) between 1 and 80),
  kind           text not null check (kind in ('bank', 'cash', 'e_wallet', 'other')),
  institution    text check (institution is null or length(institution) <= 80),
  account_last4  text check (account_last4 is null or account_last4 ~ '^[0-9]{4}$'),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ── Budgets ────────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_fin_budgets (
  id             text primary key check (id ~ '^BUD-[0-9]{4,}$'),
  company_code   text not null references public.os_companies (code),
  division_id    text references public.os_divisions (id),
  project_id     text references public.os_projects (id),
  category_code  text references public.os_fin_categories (code),
  name           text not null check (length(trim(name)) between 3 and 160),
  period_start   date not null,
  period_end     date not null,
  amount         bigint not null check (amount > 0 and amount <= 1000000000000000),
  status         text not null default 'proposed' check (status in ('proposed', 'approved', 'closed', 'rejected')),
  request_id     text references public.os_requests (id),
  notes          text check (notes is null or length(notes) <= 2000),
  created_by     text references public.os_people (id),
  approved_by    text references public.os_people (id),
  approved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (period_end >= period_start)
);
create index if not exists os_fin_budgets_scope_idx on public.os_fin_budgets (company_code, division_id, period_start);

-- ── Transactions ───────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.os_fin_transactions (
  id                 text primary key check (id ~ '^TRX-[0-9]{4,}$'),
  kind               text not null check (kind in ('expense', 'reimbursement', 'income')),
  direction          text not null generated always as (case when kind = 'income' then 'in' else 'out' end) stored,
  company_code       text not null references public.os_companies (code),
  division_id        text references public.os_divisions (id),
  project_id         text references public.os_projects (id),
  category_code      text references public.os_fin_categories (code),
  budget_id          text references public.os_fin_budgets (id),
  request_id         text references public.os_requests (id),
  description        text not null check (length(trim(description)) between 3 and 1000),
  counterparty       text check (counterparty is null or length(counterparty) <= 200),
  amount             bigint not null check (amount > 0 and amount <= 1000000000000000),
  txn_date           date not null,
  due_date           date,
  status             text not null default 'requested'
                     check (status in ('requested', 'approved', 'verified', 'paid', 'received', 'reconciled', 'rejected', 'cancelled')),
  requested_by       text not null references public.os_people (id),
  payee_person_id    text references public.os_people (id),
  approved_by        text references public.os_people (id),
  approved_at        timestamptz,
  verified_by        text references public.os_people (id),
  verified_at        timestamptz,
  settled_by         text references public.os_people (id),
  settled_on         date,
  settled_at         timestamptz,
  payment_method     text check (payment_method is null or payment_method in ('transfer', 'cash', 'e_wallet', 'card', 'other')),
  account_id         text references public.os_fin_accounts (id),
  payment_reference  text check (payment_reference is null or length(payment_reference) <= 120),
  reconciled_by      text references public.os_people (id),
  reconciled_at      timestamptz,
  statement_reference text check (statement_reference is null or length(statement_reference) <= 120),
  closed_reason      text check (closed_reason is null or length(closed_reason) <= 1000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (kind <> 'reimbursement' or payee_person_id is not null),
  check (status not in ('paid', 'received') or kind <> 'income' or status = 'received'),
  check (status <> 'received' or kind = 'income'),
  check (status <> 'paid' or kind <> 'income')
);
create index if not exists os_fin_transactions_scope_idx on public.os_fin_transactions (company_code, division_id, status, txn_date);
create index if not exists os_fin_transactions_requester_idx on public.os_fin_transactions (requested_by);

-- Who can read a transaction: Finance; the person who asked or is paid back; the lead of its (open) division in that
-- company. Nobody else, and division leads never see Finance's accounts.
create or replace function public.os_fin_can_view_transaction(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_fin_transactions t where t.id = p_id and public.os_is_staff()
    and (public.os_fin_view()
         or t.requested_by = public.os_current_person() or t.payee_person_id = public.os_current_person()
         or (t.division_id is not null and not public.os_division_restricted(t.division_id) and public.os_in_company(t.company_code)
             and public.os_workspace_lead(t.division_id))))
$$;

create or replace function public.os_fin_can_view_budget(p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.os_fin_budgets b where b.id = p_id and public.os_is_staff()
    and (public.os_fin_view()
         or (b.status in ('approved', 'closed') and b.division_id is not null and not public.os_division_restricted(b.division_id)
             and public.os_in_company(b.company_code) and public.os_workspace_lead(b.division_id))))
$$;

-- Ask for money out, or report money in. Staff report for a division they work in; Finance for any.
create or replace function public.os_fin_submit(p_kind text, p_company text, p_division text, p_amount bigint, p_txn_date date, p_description text,
  p_category text default null, p_project text default null, p_counterparty text default null, p_due date default null,
  p_request text default null, p_budget text default null, p_payee text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); new_id text; t record;
begin
  if me is null or not public.os_is_staff() then raise exception 'Only Company OS staff can submit finance requests' using errcode = '42501'; end if;
  if p_kind not in ('expense', 'reimbursement', 'income') then raise exception 'Unknown transaction type' using errcode = '22023'; end if;
  if not (public.os_is_founder() or public.os_in_company(p_company)) or p_company not in (select code from public.os_companies) then
    raise exception 'Choose a company you work in' using errcode = '42501';
  end if;
  if p_division is null or not (public.os_fin_operate() or public.os_workspace_access(p_division, 'edit')) then
    raise exception 'Choose a division you work in' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'The amount must be more than zero' using errcode = '22023'; end if;
  if p_txn_date is null or p_txn_date > (now() at time zone 'Asia/Jakarta')::date + 366 then raise exception 'Give a date within the next year' using errcode = '22023'; end if;
  if p_project is not null and not exists (select 1 from public.os_projects x where x.id = p_project and x.company_code = p_company and public.os_can_view_project(x.id)) then
    raise exception 'That project isn''t in this company or you can''t see it' using errcode = '22023';
  end if;
  if p_category is not null and not exists (select 1 from public.os_fin_categories c where c.code = p_category and c.active
       and c.direction = case when p_kind = 'income' then 'income' else 'expense' end) then
    raise exception 'Choose a category for this type' using errcode = '22023';
  end if;
  if p_request is not null and not public.os_can_view_request(p_request) then raise exception 'That request isn''t visible to you' using errcode = '22023'; end if;
  if p_budget is not null and not (public.os_fin_view() or public.os_fin_can_view_budget(p_budget)) then raise exception 'That budget isn''t visible to you' using errcode = '22023'; end if;
  new_id := public.os_next_id('TRX');
  insert into public.os_fin_transactions (id, kind, company_code, division_id, project_id, category_code, budget_id, request_id, description, counterparty,
    amount, txn_date, due_date, requested_by, payee_person_id)
  values (new_id, p_kind, p_company, p_division, p_project, p_category, p_budget, p_request, trim(p_description), nullif(trim(coalesce(p_counterparty, '')), ''),
    p_amount, p_txn_date, p_due, me, case when p_kind = 'reimbursement' then coalesce(p_payee, me) end);
  perform public.os_fl_log('transaction', new_id, 'submitted', null, 'requested', null);
  if p_kind = 'income' then
    perform public.os_fl_tell('fin_operators', null, 'finance_update', 'transaction', new_id, 'Income to verify: ' || left(trim(p_description), 80), 'IDR ' || p_amount || '.');
  else
    perform public.os_fl_tell('fin_approvers', null, 'finance_update', 'transaction', new_id, 'Expense to approve: ' || left(trim(p_description), 80), 'IDR ' || p_amount || '.');
  end if;
  return new_id;
end $$;

-- The requester edits an ask while nobody has acted on it.
create or replace function public.os_fin_update(p_id text, p_amount bigint, p_txn_date date, p_description text, p_category text default null,
  p_counterparty text default null, p_due date default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare t public.os_fin_transactions;
begin
  select * into t from public.os_fin_transactions where id = p_id for update;
  if t.id is null or t.requested_by <> public.os_current_person() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if t.status <> 'requested' then raise exception 'Only a request nobody has acted on can be edited' using errcode = 'P0002'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'The amount must be more than zero' using errcode = '22023'; end if;
  if p_category is not null and not exists (select 1 from public.os_fin_categories c where c.code = p_category and c.active
       and c.direction = case when t.kind = 'income' then 'income' else 'expense' end) then
    raise exception 'Choose a category for this type' using errcode = '22023';
  end if;
  update public.os_fin_transactions set amount = p_amount, txn_date = p_txn_date, description = trim(p_description), category_code = p_category,
    counterparty = nullif(trim(coalesce(p_counterparty, '')), ''), due_date = p_due, updated_at = now() where id = p_id;
  perform public.os_fl_log('transaction', p_id, 'updated', 'requested', 'requested', 'IDR ' || t.amount || ' -> IDR ' || p_amount);
  return 'requested';
end $$;

-- Every move after submission. Rules:
--   approve / reject (expenses): Finance approvers; never the requester or the person being paid back.
--   verify: Finance (expenses after approval, income straight away); never the requester, except a founder's own income report.
--   pay (expenses) / receive (income): Finance, after verification; never the requester or payee for an expense.
--   reconcile: Finance, after payment or receipt, against a statement reference.
--   cancel: the requester before verification, or Finance before payment, with a reason.
create or replace function public.os_fin_act(p_id text, p_action text, p_note text default null, p_settled_on date default null,
  p_method text default null, p_account text default null, p_reference text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); t public.os_fin_transactions; prev text; nxt text; note text := nullif(trim(coalesce(p_note, '')), '');
begin
  select * into t from public.os_fin_transactions where id = p_id for update;
  if t.id is null or not public.os_fin_can_view_transaction(p_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  prev := t.status;
  if p_action in ('approve', 'reject') then
    if t.kind = 'income' or t.status <> 'requested' then raise exception 'This isn''t waiting for approval' using errcode = 'P0002'; end if;
    if not public.os_fin_approver() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if me in (t.requested_by, t.payee_person_id) then raise exception 'You can''t approve your own expense' using errcode = '42501'; end if;
    if p_action = 'reject' and note is null then raise exception 'Give a reason' using errcode = '22023'; end if;
    nxt := case when p_action = 'approve' then 'approved' else 'rejected' end;
    insert into public.os_approvals (entity_type, entity_id, step, approver_person_id, decision, note)
    values ('transaction', t.id, 1, me, case when p_action = 'approve' then 'approved' else 'declined' end, note);
    update public.os_fin_transactions set status = nxt, approved_by = me, approved_at = now(), closed_reason = case when nxt = 'rejected' then note end, updated_at = now() where id = t.id;
  elsif p_action = 'verify' then
    if not public.os_fin_operate() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if not ((t.kind = 'income' and t.status = 'requested') or (t.kind <> 'income' and t.status = 'approved')) then
      raise exception 'This can''t be verified now' using errcode = 'P0002';
    end if;
    if me = t.requested_by and not (t.kind = 'income' and public.os_is_founder()) then raise exception 'Someone else verifies your own request' using errcode = '42501'; end if;
    nxt := 'verified';
    update public.os_fin_transactions set status = nxt, verified_by = me, verified_at = now(), updated_at = now() where id = t.id;
  elsif p_action in ('pay', 'receive') then
    if not public.os_fin_operate() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if t.status <> 'verified' or (p_action = 'pay') <> (t.kind <> 'income') then raise exception 'This can''t be settled now' using errcode = 'P0002'; end if;
    if p_action = 'pay' and me in (t.requested_by, t.payee_person_id) then raise exception 'You can''t pay your own expense' using errcode = '42501'; end if;
    if p_settled_on is null or p_settled_on > (now() at time zone 'Asia/Jakarta')::date then raise exception 'Give the date it was paid or received' using errcode = '22023'; end if;
    if p_method is null or p_method not in ('transfer', 'cash', 'e_wallet', 'card', 'other') then raise exception 'Choose how it was paid' using errcode = '22023'; end if;
    if p_account is not null and not exists (select 1 from public.os_fin_accounts a where a.id = p_account and a.company_code = t.company_code and a.active) then
      raise exception 'Choose an account of this company' using errcode = '22023';
    end if;
    nxt := case when p_action = 'pay' then 'paid' else 'received' end;
    update public.os_fin_transactions set status = nxt, settled_by = me, settled_on = p_settled_on, settled_at = now(), payment_method = p_method,
      account_id = p_account, payment_reference = nullif(trim(coalesce(p_reference, '')), ''), updated_at = now() where id = t.id;
  elsif p_action = 'reconcile' then
    if not public.os_fin_operate() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if t.status not in ('paid', 'received') then raise exception 'Only paid or received lines are reconciled' using errcode = 'P0002'; end if;
    if coalesce(trim(p_reference), '') = '' then raise exception 'Give the statement reference' using errcode = '22023'; end if;
    nxt := 'reconciled';
    update public.os_fin_transactions set status = nxt, reconciled_by = me, reconciled_at = now(), statement_reference = trim(p_reference), updated_at = now() where id = t.id;
  elsif p_action = 'cancel' then
    if note is null then raise exception 'Give a reason' using errcode = '22023'; end if;
    if not ((me = t.requested_by and t.status in ('requested', 'approved')) or (public.os_fin_operate() and t.status in ('requested', 'approved', 'verified'))) then
      raise exception 'This can''t be cancelled now' using errcode = 'P0002';
    end if;
    nxt := 'cancelled';
    update public.os_fin_transactions set status = nxt, closed_reason = note, updated_at = now() where id = t.id;
  else raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform public.os_fl_log('transaction', t.id, p_action, prev, nxt, coalesce(note, case when p_action = 'reconcile' then trim(p_reference) end));
  perform public.os_fl_tell(case when p_action = 'approve' then 'fin_operators' end, t.requested_by, 'finance_update', 'transaction', t.id,
    initcap(nxt) || ': ' || left(t.description, 80), coalesce(note, 'IDR ' || t.amount || '.'));
  return nxt;
end $$;

-- Budgets: Finance proposes, an approver approves (not the person who proposed it), Finance closes.
create or replace function public.os_fin_budget_save(p_id text, p_company text, p_division text, p_project text, p_category text, p_name text,
  p_start date, p_end date, p_amount bigint, p_notes text default null, p_request text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare b public.os_fin_budgets; new_id text;
begin
  if not public.os_fin_operate() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'The amount must be more than zero' using errcode = '22023'; end if;
  if p_start is null or p_end is null or p_end < p_start then raise exception 'The period ends after it starts' using errcode = '22023'; end if;
  if p_project is not null and not exists (select 1 from public.os_projects x where x.id = p_project and x.company_code = p_company) then
    raise exception 'That project isn''t in this company or you can''t see it' using errcode = '22023';
  end if;
  if p_request is not null and not public.os_can_view_request(p_request) then raise exception 'That request isn''t visible to you' using errcode = '22023'; end if;
  if p_id is null then
    new_id := public.os_next_id('BUD');
    insert into public.os_fin_budgets (id, company_code, division_id, project_id, category_code, name, period_start, period_end, amount, notes, request_id, created_by)
    values (new_id, p_company, p_division, p_project, p_category, trim(p_name), p_start, p_end, p_amount, p_notes, p_request, public.os_current_person());
    perform public.os_fl_log('budget', new_id, 'proposed', null, 'proposed', 'IDR ' || p_amount);
    perform public.os_fl_tell('fin_approvers', null, 'finance_update', 'budget', new_id, 'Budget to approve: ' || trim(p_name), 'IDR ' || p_amount || '.');
    return new_id;
  end if;
  select * into b from public.os_fin_budgets where id = p_id for update;
  if b.id is null or b.status <> 'proposed' then raise exception 'Only a proposed budget can be edited' using errcode = 'P0002'; end if;
  update public.os_fin_budgets set company_code = p_company, division_id = p_division, project_id = p_project, category_code = p_category, name = trim(p_name),
    period_start = p_start, period_end = p_end, amount = p_amount, notes = p_notes, request_id = p_request, updated_at = now() where id = p_id;
  perform public.os_fl_log('budget', p_id, 'updated', 'proposed', 'proposed', 'IDR ' || b.amount || ' -> IDR ' || p_amount);
  return p_id;
end $$;

create or replace function public.os_fin_budget_act(p_id text, p_action text, p_note text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); b public.os_fin_budgets; nxt text;
begin
  select * into b from public.os_fin_budgets where id = p_id for update;
  if b.id is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_action in ('approve', 'reject') then
    if b.status <> 'proposed' then raise exception 'This isn''t waiting for approval' using errcode = 'P0002'; end if;
    if not public.os_fin_approver() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if b.created_by = me then raise exception 'Someone else approves a budget you proposed' using errcode = '42501'; end if;
    if p_action = 'reject' and coalesce(trim(p_note), '') = '' then raise exception 'Give a reason' using errcode = '22023'; end if;
    nxt := case when p_action = 'approve' then 'approved' else 'rejected' end;
    insert into public.os_approvals (entity_type, entity_id, step, approver_person_id, decision, note)
    values ('budget', b.id, 1, me, case when p_action = 'approve' then 'approved' else 'declined' end, nullif(trim(coalesce(p_note, '')), ''));
    update public.os_fin_budgets set status = nxt, approved_by = me, approved_at = now(), updated_at = now() where id = b.id;
  elsif p_action = 'close' then
    if not public.os_fin_operate() or b.status <> 'approved' then raise exception 'Only an approved budget can be closed' using errcode = 'P0002'; end if;
    nxt := 'closed';
    update public.os_fin_budgets set status = nxt, updated_at = now() where id = b.id;
  else raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform public.os_fl_log('budget', b.id, p_action, b.status, nxt, p_note);
  return nxt;
end $$;

-- Budget against spending. Committed = approved or verified expenses (not yet cash); actual = paid or reconciled.
-- A division lead sees their own division's approved budgets; Finance sees all.
create or replace function public.os_fin_budget_summary(p_company text default null, p_division text default null, p_on date default null)
returns table (budget_id text, name text, company_code text, division_id text, project_id text, category_code text, period_start date, period_end date,
               status text, budget bigint, requested bigint, committed bigint, actual bigint, remaining bigint)
language sql stable security definer set search_path = '' as $$
  select b.id, b.name, b.company_code, b.division_id, b.project_id, b.category_code, b.period_start, b.period_end, b.status, b.amount,
         coalesce(sum(t.amount) filter (where t.status = 'requested'), 0)::bigint,
         coalesce(sum(t.amount) filter (where t.status in ('approved', 'verified')), 0)::bigint,
         coalesce(sum(t.amount) filter (where t.status in ('paid', 'reconciled')), 0)::bigint,
         (b.amount - coalesce(sum(t.amount) filter (where t.status in ('approved', 'verified', 'paid', 'reconciled')), 0))::bigint
  from public.os_fin_budgets b
  left join public.os_fin_transactions t
    on t.kind <> 'income' and t.company_code = b.company_code
   and (b.division_id is null or t.division_id = b.division_id)
   and (b.project_id is null or t.project_id = b.project_id)
   and (b.category_code is null or t.category_code = b.category_code)
   and t.txn_date between b.period_start and b.period_end
  where public.os_fin_can_view_budget(b.id)
    and (p_company is null or b.company_code = p_company) and (p_division is null or b.division_id = p_division)
    and (p_on is null or p_on between b.period_start and b.period_end)
  group by b.id
  order by b.period_start desc, b.name
$$;

-- Totals by month for a company (and optionally a division). Cash in and out count only settled lines, by the date
-- they were settled; commitments and expected income are shown apart. Finance, or the division's lead for their own.
create or replace function public.os_fin_cashflow(p_company text, p_from date, p_to date, p_division text default null)
returns table (month date, cash_in bigint, cash_out bigint, net bigint, committed_out bigint, expected_in bigint, requested_out bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (public.os_fin_view() or (p_division is not null and not public.os_division_restricted(p_division) and public.os_in_company(p_company)
          and public.os_workspace_lead(p_division))) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
  with months as (select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date m),
  t as (select * from public.os_fin_transactions x where x.company_code = p_company and (p_division is null or x.division_id = p_division))
  select m.m,
    coalesce((select sum(amount) from t where kind = 'income' and status in ('received', 'reconciled') and date_trunc('month', settled_on) = m.m), 0)::bigint,
    coalesce((select sum(amount) from t where kind <> 'income' and status in ('paid', 'reconciled') and date_trunc('month', settled_on) = m.m), 0)::bigint,
    (coalesce((select sum(amount) from t where kind = 'income' and status in ('received', 'reconciled') and date_trunc('month', settled_on) = m.m), 0)
     - coalesce((select sum(amount) from t where kind <> 'income' and status in ('paid', 'reconciled') and date_trunc('month', settled_on) = m.m), 0))::bigint,
    coalesce((select sum(amount) from t where kind <> 'income' and status in ('approved', 'verified') and date_trunc('month', coalesce(due_date, txn_date)) = m.m), 0)::bigint,
    coalesce((select sum(amount) from t where kind = 'income' and status = 'verified' and date_trunc('month', coalesce(due_date, txn_date)) = m.m), 0)::bigint,
    coalesce((select sum(amount) from t where kind <> 'income' and status = 'requested' and date_trunc('month', txn_date) = m.m), 0)::bigint
  from months m order by m.m;
end $$;

-- ── Legal numbering ────────────────────────────────────────────────────────────────────────────────────────────────
-- A rule per company, kind and type code, with a format such as {company}/{type}/{division}/{month_roman}/{year}/{seq:3}
-- (IEL/SK/LEG/XI/2026/007). Tokens: {company} {type} {division} {year} {yy} {month} {month_roman} {seq} {seq:N}.
-- The counter restarts each year, each month, or never, per rule.
create table if not exists public.os_number_rules (
  id            uuid primary key default gen_random_uuid(),
  company_code  text not null references public.os_companies (code),
  kind          text not null check (kind in ('outgoing_letter', 'incoming_letter', 'agreement', 'memorandum', 'other')),
  type_code     text not null check (type_code ~ '^[A-Z0-9][A-Z0-9.-]{0,11}$'),
  name          text not null check (length(trim(name)) between 1 and 120),
  format        text not null check (length(format) between 6 and 120 and format like '%{seq%'),
  reset         text not null default 'yearly' check (reset in ('yearly', 'monthly', 'never')),
  active        boolean not null default true,
  created_by    text references public.os_people (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_code, kind, type_code)
);

create table if not exists public.os_number_counters (
  rule_id     uuid not null references public.os_number_rules (id),
  period_key  text not null,
  last_value  int not null check (last_value >= 1),
  primary key (rule_id, period_key)
);

-- Every number ever issued. Never deleted; a mistake is marked void with a reason.
create table if not exists public.os_number_register (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid not null references public.os_number_rules (id),
  company_code  text not null references public.os_companies (code),
  kind          text not null,
  period_key    text not null,
  seq           int not null check (seq >= 1),
  number        text not null unique,
  entity_type   text not null check (entity_type in ('letter', 'agreement')),
  entity_id     text not null,
  issued_by     text references public.os_people (id),
  issued_at     timestamptz not null default now(),
  status        text not null default 'issued' check (status in ('issued', 'void')),
  void_reason   text check (void_reason is null or length(void_reason) <= 1000),
  voided_by     text references public.os_people (id),
  voided_at     timestamptz,
  unique (rule_id, period_key, seq)
);

create or replace function public.os_month_roman(p_month int) returns text language sql immutable set search_path = '' as $$
  select (array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])[p_month] $$;

create or replace function public.os_format_number(p_format text, p_company text, p_type text, p_division text, p_date date, p_seq int)
returns text language plpgsql immutable set search_path = '' as $$
declare out text := p_format; m text[]; w int;
begin
  out := replace(out, '{company}', p_company);
  out := replace(out, '{type}', p_type);
  out := replace(out, '{division}', coalesce(p_division, ''));
  out := replace(out, '{year}', to_char(p_date, 'YYYY'));
  out := replace(out, '{yy}', to_char(p_date, 'YY'));
  out := replace(out, '{month_roman}', public.os_month_roman(extract(month from p_date)::int));
  out := replace(out, '{month}', to_char(p_date, 'MM'));
  loop
    m := regexp_match(out, '\{seq:([1-9])\}');
    exit when m is null;
    w := m[1]::int;
    out := replace(out, '{seq:' || m[1] || '}', lpad(p_seq::text, greatest(w, length(p_seq::text)), '0'));
  end loop;
  return replace(out, '{seq}', p_seq::text);
end $$;

-- Founders configure rules. Changing a rule never touches numbers already issued; its counter carries on.
create or replace function public.os_number_rule_save(p_id uuid, p_company text, p_kind text, p_type text, p_name text, p_format text, p_reset text, p_active boolean default true)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare rid uuid; old_fmt text;
begin
  if not public.os_is_founder() then raise exception 'Only founders configure numbering' using errcode = '42501'; end if;
  if p_format !~ '\{seq(:[1-9])?\}' then raise exception 'The format needs {seq} or {seq:N}' using errcode = '22023'; end if;
  if p_format ~ '\{(?!(company|type|division|year|yy|month|month_roman|seq|seq:[1-9])\})[^}]*\}' then raise exception 'Unknown token in the format' using errcode = '22023'; end if;
  if p_reset = 'yearly' and p_format !~ '\{(year|yy)\}' then raise exception 'A yearly sequence needs {year} or {yy} in the format' using errcode = '22023'; end if;
  if p_reset = 'monthly' and (p_format !~ '\{(year|yy)\}' or p_format !~ '\{(month|month_roman)\}') then raise exception 'A monthly sequence needs the year and month in the format' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.os_number_rules (company_code, kind, type_code, name, format, reset, active, created_by)
    values (p_company, p_kind, upper(trim(p_type)), trim(p_name), p_format, p_reset, coalesce(p_active, true), public.os_current_person()) returning id into rid;
    perform public.os_fl_log('number_rule', rid::text, 'created', null, case when coalesce(p_active, true) then 'active' else 'inactive' end, p_format);
  else
    select format into old_fmt from public.os_number_rules where id = p_id for update;
    if old_fmt is null then raise exception 'Unknown rule' using errcode = 'P0002'; end if;
    update public.os_number_rules set name = trim(p_name), format = p_format, reset = p_reset, active = coalesce(p_active, true), updated_at = now() where id = p_id;
    rid := p_id;
    perform public.os_fl_log('number_rule', rid::text, 'changed', null, case when coalesce(p_active, true) then 'active' else 'inactive' end, old_fmt || ' -> ' || p_format);
  end if;
  return rid;
end $$;

-- Issue the next number: the counter row is locked by the upsert, the register row is written in the same
-- transaction, and both roll back together. Internal: called only by the letter and agreement functions.
create or replace function public.os_issue_number(p_rule uuid, p_division text, p_entity_type text, p_entity_id text, p_date date)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare r public.os_number_rules; pk text; n int; num text; dcode text;
begin
  select * into r from public.os_number_rules where id = p_rule;
  if r.id is null or not r.active then raise exception 'Choose an active numbering rule' using errcode = '22023'; end if;
  pk := case r.reset when 'yearly' then to_char(p_date, 'YYYY') when 'monthly' then to_char(p_date, 'YYYY-MM') else 'all' end;
  insert into public.os_number_counters as c (rule_id, period_key, last_value) values (r.id, pk, 1)
  on conflict (rule_id, period_key) do update set last_value = c.last_value + 1
  returning last_value into n;
  select code into dcode from public.os_divisions where id = p_division;
  if dcode is null and r.format like '%{division}%' then raise exception 'Choose the issuing division' using errcode = '22023'; end if;
  num := public.os_format_number(r.format, r.company_code, r.type_code, dcode, p_date, n);
  insert into public.os_number_register (rule_id, company_code, kind, period_key, seq, number, entity_type, entity_id, issued_by)
  values (r.id, r.company_code, r.kind, pk, n, num, p_entity_type, p_entity_id, public.os_current_person());
  return num;
end $$;
revoke all on function public.os_issue_number(uuid, text, text, text, date) from public, anon, authenticated;

-- ── Letters ────────────────────────────────────────────────────────────────────────────────────────────────────────
-- Outgoing: draft -> in_review -> issued (the number is generated on approval) or back to draft; void keeps the number.
-- Incoming: registered (numbered on receipt) -> archived; void keeps the number.
create table if not exists public.os_letters (
  id              text primary key check (id ~ '^LTR-[0-9]{4,}$'),
  direction       text not null check (direction in ('incoming', 'outgoing')),
  company_code    text not null references public.os_companies (code),
  division_id     text not null references public.os_divisions (id),
  rule_id         uuid not null references public.os_number_rules (id),
  subject         text not null check (length(trim(subject)) between 3 and 300),
  counterparty    text not null check (length(trim(counterparty)) between 2 and 200),
  letter_date     date not null,
  received_date   date,
  number          text unique,
  status          text not null check (status in ('draft', 'in_review', 'issued', 'registered', 'archived', 'void')),
  sensitivity     text not null default 'Internal' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  related_type    text check (related_type is null or related_type in ('project', 'partnership', 'request')),
  related_id      text,
  notes           text check (notes is null or length(notes) <= 2000),
  created_by      text references public.os_people (id),
  decided_by      text references public.os_people (id),
  decided_at      timestamptz,
  void_reason     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists os_letters_scope_idx on public.os_letters (company_code, direction, letter_date desc);

-- ── Agreements (contracts, MoUs, NDAs) and compliance deadlines ───────────────────────────────────────────────────
-- draft -> under_review -> active (approved by a signer; numbered if a rule is chosen) -> expired / terminated.
create table if not exists public.os_agreements (
  id              text primary key check (id ~ '^AGR-[0-9]{4,}$'),
  kind            text not null check (kind in ('contract', 'mou', 'nda', 'agreement', 'other')),
  company_code    text not null references public.os_companies (code),
  division_id     text not null references public.os_divisions (id),
  rule_id         uuid references public.os_number_rules (id),
  number          text unique,
  title           text not null check (length(trim(title)) between 3 and 300),
  counterparty    text not null check (length(trim(counterparty)) between 2 and 200),
  start_date      date,
  end_date        date,
  renewal_date    date,
  notice_days     int check (notice_days is null or notice_days between 0 and 365),
  auto_renew      boolean not null default false,
  value_amount    bigint check (value_amount is null or value_amount >= 0),
  status          text not null default 'draft' check (status in ('draft', 'under_review', 'active', 'expired', 'terminated')),
  owner_person_id text references public.os_people (id),
  sensitivity     text not null default 'Confidential' check (sensitivity in ('Internal', 'Confidential', 'Restricted')),
  related_type    text check (related_type is null or related_type in ('project', 'partnership', 'request')),
  related_id      text,
  notes           text check (notes is null or length(notes) <= 2000),
  created_by      text references public.os_people (id),
  decided_by      text references public.os_people (id),
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists os_agreements_dates_idx on public.os_agreements (status, end_date);

create table if not exists public.os_compliance_items (
  id              text primary key check (id ~ '^CPL-[0-9]{4,}$'),
  company_code    text not null references public.os_companies (code),
  title           text not null check (length(trim(title)) between 3 and 200),
  due_date        date not null,
  recurrence      text not null default 'none' check (recurrence in ('none', 'monthly', 'quarterly', 'yearly')),
  owner_person_id text references public.os_people (id),
  agreement_id    text references public.os_agreements (id),
  status          text not null default 'open' check (status in ('open', 'done', 'waived')),
  notes           text check (notes is null or length(notes) <= 2000),
  created_by      text references public.os_people (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists os_compliance_due_idx on public.os_compliance_items (status, due_date);

create or replace function public.os_leg_can_view(p_type text, p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_is_staff() and (public.os_leg_view() or case p_type
    when 'letter' then exists (select 1 from public.os_letters x where x.id = p_id and x.created_by = public.os_current_person())
    when 'agreement' then exists (select 1 from public.os_agreements x where x.id = p_id and public.os_current_person() in (x.owner_person_id, x.created_by))
    when 'compliance' then exists (select 1 from public.os_compliance_items x where x.id = p_id and x.owner_person_id = public.os_current_person())
    else false end)
$$;

-- A record a Legal record points to must be one the caller can see.
create or replace function public.os_leg_check_related(p_type text, p_id text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_type is null and p_id is null then return; end if;
  if p_type is null or p_id is null or p_type not in ('project', 'partnership', 'request') or not public.os_can_view_entity(p_type, p_id) then
    raise exception 'That linked record isn''t visible to you' using errcode = '22023';
  end if;
end $$;

create or replace function public.os_leg_check_rule(p_rule uuid, p_company text, p_kinds text[]) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_rule is null then return; end if;
  if not exists (select 1 from public.os_number_rules r where r.id = p_rule and r.active and r.company_code = p_company and r.kind = any (p_kinds)) then
    raise exception 'Choose an active numbering rule of this company for this kind of record' using errcode = '22023';
  end if;
end $$;

-- Draft or edit an outgoing letter, or register an incoming one (numbered at once). Legal staff only.
create or replace function public.os_letter_save(p_id text, p_direction text, p_company text, p_division text, p_rule uuid, p_subject text, p_counterparty text,
  p_letter_date date, p_received_date date default null, p_sensitivity text default 'Internal', p_related_type text default null, p_related_id text default null,
  p_notes text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare l public.os_letters; new_id text; num text;
begin
  if not public.os_leg_operate() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_direction not in ('incoming', 'outgoing') then raise exception 'Unknown direction' using errcode = '22023'; end if;
  if p_rule is null then raise exception 'Choose a numbering rule' using errcode = '22023'; end if;
  perform public.os_leg_check_rule(p_rule, p_company, case when p_direction = 'incoming' then array['incoming_letter'] else array['outgoing_letter', 'memorandum', 'other'] end);
  perform public.os_leg_check_related(p_related_type, p_related_id);
  if p_id is null then
    new_id := public.os_next_id('LTR');
    insert into public.os_letters (id, direction, company_code, division_id, rule_id, subject, counterparty, letter_date, received_date, status, sensitivity,
      related_type, related_id, notes, created_by)
    values (new_id, p_direction, p_company, p_division, p_rule, trim(p_subject), trim(p_counterparty), p_letter_date,
      case when p_direction = 'incoming' then coalesce(p_received_date, (now() at time zone 'Asia/Jakarta')::date) end,
      case when p_direction = 'incoming' then 'registered' else 'draft' end, coalesce(p_sensitivity, 'Internal'), p_related_type, p_related_id, p_notes,
      public.os_current_person());
    if p_direction = 'incoming' then
      num := public.os_issue_number(p_rule, p_division, 'letter', new_id, coalesce(p_received_date, (now() at time zone 'Asia/Jakarta')::date));
      update public.os_letters set number = num where id = new_id;
      perform public.os_fl_log('letter', new_id, 'registered', null, 'registered', num);
    else
      perform public.os_fl_log('letter', new_id, 'drafted', null, 'draft', null);
    end if;
    return new_id;
  end if;
  select * into l from public.os_letters where id = p_id for update;
  if l.id is null or l.direction <> 'outgoing' or l.status <> 'draft' then raise exception 'Only a draft can be edited' using errcode = 'P0002'; end if;
  update public.os_letters set company_code = p_company, division_id = p_division, rule_id = p_rule, subject = trim(p_subject), counterparty = trim(p_counterparty),
    letter_date = p_letter_date, sensitivity = coalesce(p_sensitivity, sensitivity), related_type = p_related_type, related_id = p_related_id, notes = p_notes,
    updated_at = now() where id = p_id;
  perform public.os_fl_log('letter', p_id, 'updated', 'draft', 'draft', null);
  return p_id;
end $$;

-- submit (Legal staff) -> approve / return (a signer who didn't draft it). Approval issues the number.
-- void (a signer, with a reason) keeps the number in the register. archive (Legal staff) for incoming letters.
create or replace function public.os_letter_act(p_id text, p_action text, p_note text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); l public.os_letters; nxt text; num text; note text := nullif(trim(coalesce(p_note, '')), '');
begin
  select * into l from public.os_letters where id = p_id for update;
  if l.id is null or not public.os_leg_can_view('letter', p_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_action = 'submit' then
    if not public.os_leg_operate() or l.status <> 'draft' then raise exception 'Only a draft can be sent for approval' using errcode = 'P0002'; end if;
    nxt := 'in_review';
    update public.os_letters set status = nxt, updated_at = now() where id = l.id;
    perform public.os_fl_log('letter', l.id, 'submitted', l.status, nxt, note);
    perform public.os_fl_tell('leg_signers', null, 'legal_update', 'letter', l.id, 'Letter to approve: ' || left(l.subject, 80), 'To ' || l.counterparty || '.');
  elsif p_action in ('approve', 'return') then
    if l.status <> 'in_review' then raise exception 'This letter isn''t waiting for approval' using errcode = 'P0002'; end if;
    if not public.os_leg_signer() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if l.created_by = me then raise exception 'Someone else approves a letter you drafted' using errcode = '42501'; end if;
    if p_action = 'return' and note is null then raise exception 'Say what needs to change' using errcode = '22023'; end if;
    insert into public.os_approvals (entity_type, entity_id, step, approver_person_id, decision, note)
    values ('letter', l.id, 1, me, case when p_action = 'approve' then 'approved' else 'declined' end, note);
    if p_action = 'approve' then
      num := public.os_issue_number(l.rule_id, l.division_id, 'letter', l.id, (now() at time zone 'Asia/Jakarta')::date);
      nxt := 'issued';
      update public.os_letters set status = nxt, number = num, decided_by = me, decided_at = now(), letter_date = (now() at time zone 'Asia/Jakarta')::date, updated_at = now() where id = l.id;
    else
      nxt := 'draft';
      update public.os_letters set status = nxt, decided_by = me, decided_at = now(), updated_at = now() where id = l.id;
    end if;
    perform public.os_fl_log('letter', l.id, case when p_action = 'approve' then 'issued' else 'returned' end, l.status, nxt, coalesce(num, note));
    perform public.os_fl_tell(null, l.created_by, 'legal_update', 'letter', l.id, case when p_action = 'approve' then 'Letter issued: ' || num else 'Letter returned: ' || left(l.subject, 80) end, coalesce(note, ''));
  elsif p_action = 'void' then
    if l.status not in ('issued', 'registered', 'archived') then raise exception 'Only a numbered letter can be voided' using errcode = 'P0002'; end if;
    if not public.os_leg_signer() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if note is null then raise exception 'Give a reason' using errcode = '22023'; end if;
    nxt := 'void';
    update public.os_letters set status = nxt, void_reason = note, updated_at = now() where id = l.id;
    update public.os_number_register set status = 'void', void_reason = note, voided_by = me, voided_at = now() where entity_type = 'letter' and entity_id = l.id and status = 'issued';
    perform public.os_fl_log('letter', l.id, 'voided', l.status, nxt, l.number || ': ' || note);
  elsif p_action = 'archive' then
    if not public.os_leg_operate() or l.status not in ('registered', 'issued') then raise exception 'This letter can''t be archived now' using errcode = 'P0002'; end if;
    nxt := 'archived';
    update public.os_letters set status = nxt, updated_at = now() where id = l.id;
    perform public.os_fl_log('letter', l.id, 'archived', l.status, nxt, note);
  else raise exception 'Unknown action' using errcode = '22023';
  end if;
  return nxt;
end $$;

create or replace function public.os_agreement_save(p_id text, p_kind text, p_company text, p_division text, p_title text, p_counterparty text,
  p_start date default null, p_end date default null, p_renewal date default null, p_notice_days int default null, p_auto_renew boolean default false,
  p_value bigint default null, p_owner text default null, p_rule uuid default null, p_sensitivity text default 'Confidential',
  p_related_type text default null, p_related_id text default null, p_notes text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare a public.os_agreements; new_id text;
begin
  if not public.os_leg_operate() then raise exception 'Not allowed' using errcode = '42501'; end if;
  perform public.os_leg_check_rule(p_rule, p_company, array['agreement', 'memorandum', 'other']);
  perform public.os_leg_check_related(p_related_type, p_related_id);
  if p_id is null then
    new_id := public.os_next_id('AGR');
    insert into public.os_agreements (id, kind, company_code, division_id, title, counterparty, start_date, end_date, renewal_date, notice_days, auto_renew,
      value_amount, owner_person_id, rule_id, sensitivity, related_type, related_id, notes, created_by)
    values (new_id, p_kind, p_company, p_division, trim(p_title), trim(p_counterparty), p_start, p_end, p_renewal, p_notice_days, coalesce(p_auto_renew, false),
      p_value, p_owner, p_rule, coalesce(p_sensitivity, 'Confidential'), p_related_type, p_related_id, p_notes, public.os_current_person());
    perform public.os_fl_log('agreement', new_id, 'drafted', null, 'draft', null);
    return new_id;
  end if;
  select * into a from public.os_agreements where id = p_id for update;
  if a.id is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if a.status in ('expired', 'terminated') then raise exception 'A closed agreement can''t be edited' using errcode = 'P0002'; end if;
  if a.status = 'active' and (p_kind, p_company, p_counterparty, coalesce(p_rule::text, '')) is distinct from (a.kind, a.company_code, a.counterparty, coalesce(a.rule_id::text, '')) then
    raise exception 'An active agreement keeps its type, company, party and number' using errcode = 'P0002';
  end if;
  update public.os_agreements set kind = p_kind, company_code = p_company, division_id = p_division, title = trim(p_title), counterparty = trim(p_counterparty),
    start_date = p_start, end_date = p_end, renewal_date = p_renewal, notice_days = p_notice_days, auto_renew = coalesce(p_auto_renew, false), value_amount = p_value,
    owner_person_id = p_owner, rule_id = p_rule, sensitivity = coalesce(p_sensitivity, sensitivity), related_type = p_related_type, related_id = p_related_id,
    notes = p_notes, updated_at = now() where id = p_id;
  perform public.os_fl_log('agreement', p_id, 'updated', a.status, a.status, null);
  return p_id;
end $$;

-- submit (Legal staff) -> approve / return (a signer who didn't draft it; approval numbers it if a rule is set)
-- -> terminate / expire (Legal staff, with a note).
create or replace function public.os_agreement_act(p_id text, p_action text, p_note text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); a public.os_agreements; nxt text; num text; note text := nullif(trim(coalesce(p_note, '')), '');
begin
  select * into a from public.os_agreements where id = p_id for update;
  if a.id is null or not public.os_leg_can_view('agreement', p_id) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_action = 'submit' then
    if not public.os_leg_operate() or a.status <> 'draft' then raise exception 'Only a draft can be sent for approval' using errcode = 'P0002'; end if;
    nxt := 'under_review';
    perform public.os_fl_tell('leg_signers', null, 'legal_update', 'agreement', a.id, 'Agreement to approve: ' || left(a.title, 80), 'With ' || a.counterparty || '.');
  elsif p_action in ('approve', 'return') then
    if a.status <> 'under_review' then raise exception 'This agreement isn''t waiting for approval' using errcode = 'P0002'; end if;
    if not public.os_leg_signer() then raise exception 'Not allowed' using errcode = '42501'; end if;
    if a.created_by = me then raise exception 'Someone else approves an agreement you drafted' using errcode = '42501'; end if;
    if p_action = 'return' and note is null then raise exception 'Say what needs to change' using errcode = '22023'; end if;
    insert into public.os_approvals (entity_type, entity_id, step, approver_person_id, decision, note)
    values ('agreement', a.id, 1, me, case when p_action = 'approve' then 'approved' else 'declined' end, note);
    nxt := case when p_action = 'approve' then 'active' else 'draft' end;
    if p_action = 'approve' and a.rule_id is not null and a.number is null then
      num := public.os_issue_number(a.rule_id, a.division_id, 'agreement', a.id, coalesce(a.start_date, (now() at time zone 'Asia/Jakarta')::date));
    end if;
    update public.os_agreements set number = coalesce(num, number), decided_by = me, decided_at = now() where id = a.id;
    perform public.os_fl_tell(null, a.created_by, 'legal_update', 'agreement', a.id, case when p_action = 'approve' then 'Agreement approved: ' else 'Agreement returned: ' end || left(a.title, 80), coalesce(note, num, ''));
  elsif p_action in ('terminate', 'expire') then
    if not public.os_leg_operate() or a.status <> 'active' then raise exception 'Only an active agreement can be closed' using errcode = 'P0002'; end if;
    if note is null then raise exception 'Give a reason' using errcode = '22023'; end if;
    nxt := case when p_action = 'terminate' then 'terminated' else 'expired' end;
  else raise exception 'Unknown action' using errcode = '22023';
  end if;
  update public.os_agreements set status = nxt, updated_at = now() where id = a.id;
  perform public.os_fl_log('agreement', a.id, p_action, a.status, nxt, coalesce(num, note));
  return nxt;
end $$;

create or replace function public.os_compliance_save(p_id text, p_company text, p_title text, p_due date, p_recurrence text default 'none',
  p_owner text default null, p_agreement text default null, p_notes text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare new_id text;
begin
  if not public.os_leg_operate() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_id is null then
    new_id := public.os_next_id('CPL');
    insert into public.os_compliance_items (id, company_code, title, due_date, recurrence, owner_person_id, agreement_id, notes, created_by)
    values (new_id, p_company, trim(p_title), p_due, coalesce(p_recurrence, 'none'), p_owner, p_agreement, p_notes, public.os_current_person());
    perform public.os_fl_log('compliance', new_id, 'created', null, 'open', p_due::text);
    return new_id;
  end if;
  update public.os_compliance_items set company_code = p_company, title = trim(p_title), due_date = p_due, recurrence = coalesce(p_recurrence, 'none'),
    owner_person_id = p_owner, agreement_id = p_agreement, notes = p_notes, updated_at = now() where id = p_id and status = 'open';
  if not found then raise exception 'Only an open item can be edited' using errcode = 'P0002'; end if;
  perform public.os_fl_log('compliance', p_id, 'updated', 'open', 'open', p_due::text);
  return p_id;
end $$;

-- done: a recurring item rolls forward to its next due date and stays open; waive needs a reason.
create or replace function public.os_compliance_act(p_id text, p_action text, p_note text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare c public.os_compliance_items; nxt_due date;
begin
  select * into c from public.os_compliance_items where id = p_id for update;
  if c.id is null or c.status <> 'open' then raise exception 'This item isn''t open' using errcode = 'P0002'; end if;
  if not (public.os_leg_operate() or c.owner_person_id = public.os_current_person()) then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_action = 'done' then
    nxt_due := case c.recurrence when 'monthly' then (c.due_date + interval '1 month')::date when 'quarterly' then (c.due_date + interval '3 months')::date
                                 when 'yearly' then (c.due_date + interval '1 year')::date end;
    if nxt_due is null then
      update public.os_compliance_items set status = 'done', updated_at = now() where id = p_id;
      perform public.os_fl_log('compliance', p_id, 'done', 'open', 'done', p_note);
      return 'done';
    end if;
    update public.os_compliance_items set due_date = nxt_due, updated_at = now() where id = p_id;
    perform public.os_fl_log('compliance', p_id, 'done', 'open', 'open', 'Done for ' || c.due_date || '; next due ' || nxt_due || coalesce('. ' || nullif(trim(coalesce(p_note, '')), ''), ''));
    return 'open';
  elsif p_action = 'waive' then
    if coalesce(trim(p_note), '') = '' then raise exception 'Give a reason' using errcode = '22023'; end if;
    update public.os_compliance_items set status = 'waived', updated_at = now() where id = p_id;
    perform public.os_fl_log('compliance', p_id, 'waived', 'open', 'waived', p_note);
    return 'waived';
  end if;
  raise exception 'Unknown action' using errcode = '22023';
end $$;

-- Reminders 60, 30 and 7 days before an agreement ends or renews and before a compliance deadline, plus overdue.
-- Written for the caller when they open Company OS (no scheduler needed), once per item, date and threshold.
create or replace function public.os_legal_reminders() returns int
language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); today date := (now() at time zone 'Asia/Jakarta')::date; legal boolean := public.os_leg_operate(); n int := 0; x record;
begin
  if me is null or not public.os_is_staff() then return 0; end if;
  for x in
    select 'agreement' as t, a.id, a.title, d.kind, d.on_date from public.os_agreements a
      cross join lateral (values ('ends', a.end_date), ('renews', a.renewal_date)) d(kind, on_date)
      where a.status = 'active' and d.on_date is not null and d.on_date <= today + 60 and (legal or a.owner_person_id = me)
    union all
    select 'compliance', c.id, c.title, 'is due', c.due_date from public.os_compliance_items c
      where c.status = 'open' and c.due_date <= today + 60 and (legal or c.owner_person_id = me)
  loop
    insert into public.os_notifications (person_id, kind, entity_type, entity_id, title, body, actor_person_id, dedupe_key)
    values (me, 'legal_reminder', x.t, x.id,
      left(case when x.on_date < today then 'Overdue: ' else '' end || x.title || ' ' || x.kind || ' ' || to_char(x.on_date, 'DD Mon YYYY'), 200),
      case when x.on_date < today then (today - x.on_date) || ' days ago.' else (x.on_date - today) || ' days left.' end, null,
      'legrem:' || x.t || ':' || x.id || ':' || x.kind || ':' || x.on_date || ':' ||
        case when x.on_date < today then 'overdue' when x.on_date - today <= 7 then '7' when x.on_date - today <= 30 then '30' else '60' end || ':' || me)
    on conflict (dedupe_key) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- ── Payment details stay with Finance ──────────────────────────────────────────────────────────────────────────────
-- Requesters and division leads read a transaction's status and amounts, never which account paid it or the bank
-- references: those columns have no grant, and Finance reads them through this function.
create or replace function public.os_fin_payment_details(p_ids text[])
returns table (id text, account_id text, payment_reference text, statement_reference text)
language sql stable security definer set search_path = '' as $$
  select t.id, t.account_id, t.payment_reference, t.statement_reference from public.os_fin_transactions t
  where t.id = any (p_ids) and public.os_is_staff() and public.os_fin_view()
$$;

-- Cash accounts (bank, cash box, e-wallet): Finance approvers add and retire them. Only the last four digits are kept.
create or replace function public.os_fin_account_save(p_id text, p_company text, p_name text, p_kind text, p_institution text default null,
  p_last4 text default null, p_active boolean default true) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare new_id text;
begin
  if not public.os_fin_approver() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_id is null then
    new_id := public.os_next_id('FAC');
    insert into public.os_fin_accounts (id, company_code, name, kind, institution, account_last4, active)
    values (new_id, p_company, trim(p_name), p_kind, nullif(trim(coalesce(p_institution, '')), ''), nullif(trim(coalesce(p_last4, '')), ''), coalesce(p_active, true));
    return new_id;
  end if;
  update public.os_fin_accounts set name = trim(p_name), kind = p_kind, institution = nullif(trim(coalesce(p_institution, '')), ''),
    account_last4 = nullif(trim(coalesce(p_last4, '')), ''), active = coalesce(p_active, true) where id = p_id;
  if not found then raise exception 'Unknown account' using errcode = 'P0002'; end if;
  return p_id;
end $$;

-- ── Phase 2 requests: new routes and a link to the project or partnership they are about ──────────────────────────
insert into public.os_request_types (code, name, description, from_division_id, to_division_id, needs_approval, sort_order) values
  ('campaign_expense', 'Campaign expense request', 'Money for a Growth campaign. The requesting division''s lead approves first.', 'DIV-03', 'DIV-08', true, 7),
  ('employment_document', 'Employment document request', 'An employment contract, offer letter or other people document from Legal.', 'DIV-05', 'DIV-09', false, 8)
on conflict (code) do nothing;

alter table public.os_requests add column if not exists related_type text check (related_type is null or related_type in ('project', 'partnership'));
alter table public.os_requests add column if not exists related_id text;
do $$ begin
  alter table public.os_requests add constraint os_requests_related_pair check ((related_type is null) = (related_id is null));
exception when duplicate_object then null; end $$;

drop function if exists public.os_request_submit(text, text, text, text, text, date);
create or replace function public.os_request_submit(p_type text, p_company text, p_title text, p_brief text, p_priority text, p_due date,
  p_related_type text default null, p_related_id text default null)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare me text := public.os_current_person(); t public.os_request_types; r public.os_requests;
begin
  if me is null or not public.os_is_staff() then raise exception 'Only Company OS staff can send requests' using errcode = '42501'; end if;
  select * into t from public.os_request_types where code = p_type and active;
  if t.code is null then raise exception 'Unknown request type' using errcode = '22023'; end if;
  if not (public.os_is_founder() or (public.os_in_company(p_company) and public.os_workspace_access(t.from_division_id, 'edit'))) then
    raise exception 'Only people in the requesting division can send this request' using errcode = '42501';
  end if;
  if p_due is null or p_due < (now() at time zone 'Asia/Jakarta')::date then raise exception 'The deadline must be today or later' using errcode = '22023'; end if;
  if (p_related_type is null) <> (p_related_id is null) or (p_related_type is not null and (p_related_type not in ('project', 'partnership')
      or not public.os_can_view_entity(p_related_type, p_related_id))) then
    raise exception 'That linked record isn''t visible to you' using errcode = '22023';
  end if;
  insert into public.os_requests (id, type_code, company_code, from_division_id, to_division_id, requester_person_id, title, brief, priority, due_date,
    approval_status, related_type, related_id)
  values (public.os_next_id('REQ'), t.code, p_company, t.from_division_id, t.to_division_id, me, trim(p_title), trim(p_brief),
          coalesce(p_priority, 'P3 Normal'), p_due, case when t.needs_approval then 'pending' else 'not_needed' end, p_related_type, p_related_id)
  returning * into r;
  perform public.os_request_log(r, 'submitted', null, null);
  if t.needs_approval then
    perform public.os_request_tell(r, 'approvers', 'request_approval', 'Approve request: ' || r.title, t.name || ' to ' || (select name from public.os_divisions where id = t.to_division_id) || ', due ' || r.due_date || '.');
  else
    perform public.os_request_tell(r, 'receivers', 'request_new', 'New request: ' || r.title, t.name || ', due ' || r.due_date || '.');
  end if;
  return r.id;
end $$;

-- ── Records point to each other: comments, Drive documents, notifications, approvals, history ────────────────────
create or replace function public.os_can_view_entity(p_type text, p_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case p_type
    when 'project' then public.os_can_view_project(p_id)
    when 'task' then public.os_can_view_task(p_id)
    when 'document' then public.os_can_view_document(p_id)
    when 'partnership' then exists (select 1 from public.os_partnerships x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.related_project_id, '')) or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'decision' then exists (select 1 from public.os_decisions x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.project_id, '')))
    when 'meeting' then exists (select 1 from public.os_meetings x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', ''))
    when 'campaign' then exists (select 1 from public.os_campaign_items x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', coalesce(x.related_project_id, '')) or (public.os_is_staff() and public.os_current_person() in (x.owner_person_id, x.creator_person_id, x.reviewer_person_id))))
    when 'campaign_plan' then public.os_can_view_campaign(p_id)
    when 'objective' then exists (select 1 from public.os_objectives x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', '') or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'kpi' then exists (select 1 from public.os_kpis x where x.id = p_id and public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', ''))
    when 'product' then exists (select 1 from public.os_product_items x where x.id = p_id and (public.os_can_view(x.company_code, x.division_id, x.sensitivity, 'project', '') or (public.os_is_staff() and x.owner_person_id = public.os_current_person())))
    when 'timeline' then exists (select 1 from public.os_timeline_items x where x.id = p_id and public.os_can_view(x.company_code, null, x.sensitivity, 'project', ''))
    when 'event' then public.os_can_view_event(p_id)
    when 'request' then public.os_can_view_request(p_id)
    when 'transaction' then public.os_fin_can_view_transaction(p_id)
    when 'budget' then public.os_fin_can_view_budget(p_id)
    when 'letter' then public.os_leg_can_view('letter', p_id)
    when 'agreement' then public.os_leg_can_view('agreement', p_id)
    when 'compliance' then public.os_leg_can_view('compliance', p_id)
    when 'number_rule' then public.os_leg_view()
    else false
  end
$$;

do $$ begin
  alter table public.os_document_links drop constraint if exists os_document_links_entity_type_check;
  alter table public.os_document_links add constraint os_document_links_entity_type_check check (entity_type in
    ('project', 'task', 'meeting', 'partnership', 'decision', 'campaign', 'objective', 'kpi', 'event', 'timeline', 'campaign_plan', 'request',
     'transaction', 'budget', 'letter', 'agreement', 'compliance'));
  alter table public.os_comments drop constraint if exists os_comments_entity_type_check;
  alter table public.os_comments add constraint os_comments_entity_type_check check (entity_type in
    ('project', 'task', 'document', 'partnership', 'decision', 'meeting', 'campaign', 'objective', 'kpi', 'product', 'timeline', 'event', 'campaign_plan', 'request',
     'transaction', 'budget', 'letter', 'agreement', 'compliance'));
  alter table public.os_notifications drop constraint if exists os_notifications_kind_check;
  alter table public.os_notifications add constraint os_notifications_kind_check check (kind in
    ('event_invited', 'event_rescheduled', 'event_cancelled', 'task_assigned', 'task_due_changed', 'candidate_new', 'candidate_assigned',
     'access_requested', 'access_decided', 'request_new', 'request_approval', 'request_update', 'finance_update', 'legal_update', 'legal_reminder'));
  alter table public.os_notifications drop constraint if exists os_notifications_entity_type_check;
  alter table public.os_notifications add constraint os_notifications_entity_type_check check (entity_type in
    ('event', 'task', 'candidate', 'access_request', 'request', 'transaction', 'budget', 'letter', 'agreement', 'compliance'));
  alter table public.os_approvals drop constraint if exists os_approvals_entity_type_check;
  alter table public.os_approvals add constraint os_approvals_entity_type_check check (entity_type in ('request', 'transaction', 'budget', 'letter', 'agreement'));
end $$;

drop policy if exists os_approvals_read on public.os_approvals;
create policy os_approvals_read on public.os_approvals for select to authenticated
  using (case entity_type when 'request' then public.os_can_view_request(entity_id) else public.os_can_view_entity(entity_type, entity_id) end);

-- A receipt or invoice for your own expense: anyone on staff may register a Finance document they own, kept
-- Confidential in the Finance workspace, so Finance (and they) can see it and nobody else.
drop policy if exists os_documents_insert_receipt on public.os_documents;
create policy os_documents_insert_receipt on public.os_documents for insert to authenticated
  with check (public.os_is_staff() and owner_person_id = public.os_current_person() and doc_type = 'FIN' and sensitivity = 'Confidential'
              and status = 'Draft' and division_id = public.os_division_by_code('FIN') and public.os_in_company(company_code));

-- ── Row-level security: reads only; every write goes through the functions above ─────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['os_record_events', 'os_fin_categories', 'os_fin_accounts', 'os_fin_budgets', 'os_fin_transactions', 'os_number_rules',
    'os_number_counters', 'os_number_register', 'os_letters', 'os_agreements', 'os_compliance_items'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  foreach t in array array['os_fin_categories', 'os_fin_accounts', 'os_fin_budgets', 'os_fin_transactions', 'os_number_rules', 'os_number_register',
    'os_letters', 'os_agreements', 'os_compliance_items'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.os_audit_row()', t || '_audit', t);
  end loop;
end $$;

grant select on public.os_record_events, public.os_fin_categories, public.os_fin_accounts, public.os_fin_budgets, public.os_number_rules,
  public.os_number_register, public.os_letters, public.os_agreements, public.os_compliance_items to authenticated;
grant select (id, kind, direction, company_code, division_id, project_id, category_code, budget_id, request_id, description, counterparty, amount,
  txn_date, due_date, status, requested_by, payee_person_id, approved_by, approved_at, verified_by, verified_at, settled_by, settled_on, settled_at,
  payment_method, reconciled_by, reconciled_at, closed_reason, created_at, updated_at) on public.os_fin_transactions to authenticated;
-- Finance sets up categories; anyone on staff may read them to pick one.
grant insert, update on public.os_fin_categories to authenticated;

drop policy if exists os_record_events_read on public.os_record_events;
create policy os_record_events_read on public.os_record_events for select to authenticated using (public.os_can_view_entity(entity_type, entity_id));
drop policy if exists os_fin_categories_read on public.os_fin_categories;
create policy os_fin_categories_read on public.os_fin_categories for select to authenticated using ((select public.os_is_staff()));
drop policy if exists os_fin_categories_write on public.os_fin_categories;
create policy os_fin_categories_write on public.os_fin_categories for insert to authenticated with check ((select public.os_fin_operate()));
drop policy if exists os_fin_categories_update on public.os_fin_categories;
create policy os_fin_categories_update on public.os_fin_categories for update to authenticated using ((select public.os_fin_operate())) with check ((select public.os_fin_operate()));
drop policy if exists os_fin_accounts_read on public.os_fin_accounts;
create policy os_fin_accounts_read on public.os_fin_accounts for select to authenticated using ((select public.os_fin_view()));
drop policy if exists os_fin_budgets_read on public.os_fin_budgets;
create policy os_fin_budgets_read on public.os_fin_budgets for select to authenticated using (public.os_fin_can_view_budget(id));
drop policy if exists os_fin_transactions_read on public.os_fin_transactions;
create policy os_fin_transactions_read on public.os_fin_transactions for select to authenticated using (public.os_fin_can_view_transaction(id));
drop policy if exists os_number_rules_read on public.os_number_rules;
create policy os_number_rules_read on public.os_number_rules for select to authenticated using ((select public.os_leg_view()));
drop policy if exists os_number_register_read on public.os_number_register;
create policy os_number_register_read on public.os_number_register for select to authenticated using ((select public.os_leg_view()));
drop policy if exists os_letters_read on public.os_letters;
create policy os_letters_read on public.os_letters for select to authenticated using (public.os_leg_can_view('letter', id));
drop policy if exists os_agreements_read on public.os_agreements;
create policy os_agreements_read on public.os_agreements for select to authenticated using (public.os_leg_can_view('agreement', id));
drop policy if exists os_compliance_items_read on public.os_compliance_items;
create policy os_compliance_items_read on public.os_compliance_items for select to authenticated using (public.os_leg_can_view('compliance', id));

-- The default outgoing-letter rule the founders chose (IEL/SK/LEG/XI/2026/007), one sequence per company, restarting
-- each year. Founders change it or add rules for incoming letters, agreements and memorandums in Legal settings.
insert into public.os_number_rules (company_code, kind, type_code, name, format, reset)
select c.code, 'outgoing_letter', 'SK', 'Outgoing letter (Surat Keluar)', '{company}/{type}/{division}/{month_roman}/{year}/{seq:3}', 'yearly'
from public.os_companies c where c.code in ('IEL', 'ELC')
on conflict (company_code, kind, type_code) do nothing;

-- ── Function privileges ────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array['os_fl_log(text, text, text, text, text, text)', 'os_fl_tell(text, text, text, text, text, text, text)',
    'os_fl_people(text)', 'os_issue_number(uuid, text, text, text, date)', 'os_leg_check_related(text, text)', 'os_leg_check_rule(uuid, text, text[])'] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array['os_division_by_code(text)', 'os_fin_view()', 'os_fin_operate()', 'os_fin_approver()', 'os_leg_view()', 'os_leg_operate()',
    'os_leg_signer()', 'os_fin_can_view_transaction(text)', 'os_fin_can_view_budget(text)', 'os_leg_can_view(text, text)',
    'os_fin_submit(text, text, text, bigint, date, text, text, text, text, date, text, text, text)',
    'os_fin_update(text, bigint, date, text, text, text, date)', 'os_fin_act(text, text, text, date, text, text, text)',
    'os_fin_budget_save(text, text, text, text, text, text, date, date, bigint, text, text)', 'os_fin_budget_act(text, text, text)',
    'os_fin_budget_summary(text, text, date)', 'os_fin_cashflow(text, date, date, text)', 'os_fin_payment_details(text[])', 'os_fin_account_save(text, text, text, text, text, text, boolean)',
    'os_month_roman(int)', 'os_format_number(text, text, text, text, date, int)',
    'os_number_rule_save(uuid, text, text, text, text, text, text, boolean)',
    'os_letter_save(text, text, text, text, uuid, text, text, date, date, text, text, text, text)', 'os_letter_act(text, text, text)',
    'os_agreement_save(text, text, text, text, text, text, date, date, date, int, boolean, bigint, text, uuid, text, text, text, text)',
    'os_agreement_act(text, text, text)', 'os_compliance_save(text, text, text, date, text, text, text, text)', 'os_compliance_act(text, text, text)',
    'os_legal_reminders()', 'os_request_submit(text, text, text, text, text, date, text, text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
