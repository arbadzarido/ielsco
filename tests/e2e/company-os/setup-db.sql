-- Local stand-in for the Supabase database the Company OS e2e test runs against (real Postgres, real RLS).
-- Roles and the auth schema mirror what Supabase provides; only the parts the OS uses are modelled.
drop schema if exists public cascade; create schema public;
drop schema if exists auth cascade; create schema auth;
do $$ begin
  create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
do $$ begin
  create role os_gateway login password 'gateway' noinherit; exception when duplicate_object then null; end $$;
grant anon, authenticated, service_role to os_gateway;

create extension if not exists pgcrypto;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, email_confirmed_at timestamptz,
  raw_app_meta_data jsonb default '{}', created_at timestamptz default now());
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  provider text not null, identity_data jsonb not null, created_at timestamptz default now());
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(), updated_at timestamptz default now(), refreshed_at timestamp);
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
-- The gateway logs in as os_gateway (like PostgREST's authenticator) and also plays GoTrue, so it owns auth writes.
grant usage on schema auth to os_gateway;
grant all on all tables in schema auth to os_gateway;
