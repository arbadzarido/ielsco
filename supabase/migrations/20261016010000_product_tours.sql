-- IELSco product tour completion (additive, idempotent). One row per user per tour.
-- The Elco app keeps its own table in its own Supabase project; completing one never affects the other.
-- Touches no existing table.

create table if not exists public.product_tours (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tour_key text not null check (tour_key ~ '^[a-z0-9-]{1,40}$'),
  version int not null default 1 check (version between 1 and 100),
  status text not null check (status in ('completed', 'skipped')),
  updated_at timestamptz not null default now(),
  primary key (user_id, tour_key)
);

alter table public.product_tours enable row level security;

drop policy if exists "product_tours_select_own" on public.product_tours;
create policy "product_tours_select_own" on public.product_tours
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "product_tours_insert_own" on public.product_tours;
create policy "product_tours_insert_own" on public.product_tours
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "product_tours_update_own" on public.product_tours;
create policy "product_tours_update_own" on public.product_tours
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.product_tours to authenticated;
revoke all on public.product_tours from anon;
