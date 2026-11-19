-- Rollback for 20261123000000_gif_programme_platform.sql. DESTROYS all GIF platform data (applications, payments,
-- consents). Only for use before real applicants exist, or after exporting the data. Storage objects in the bucket must be
-- deleted first (Supabase refuses to drop a non-empty bucket).
begin;
drop schema if exists gif cascade;
delete from storage.buckets where id = 'gif-applications';
delete from supabase_migrations.schema_migrations where version = '20261123000000';
commit;
