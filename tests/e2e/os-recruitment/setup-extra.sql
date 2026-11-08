-- Extra stand-ins for the Company OS e2e database so the careers migrations apply too (run after
-- tests/e2e/company-os/setup-db.sql, before the migrations): the IELSco site-admin helper and a minimal storage schema.
create table if not exists public.staff_roles (user_id uuid primary key, role text, note text);
create or replace function public.is_site_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.staff_roles r where r.user_id = (select auth.uid()) and r.role = 'admin') $$;
grant execute on function public.is_site_admin() to anon, authenticated;
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated; grant all on storage.objects to anon, authenticated;
