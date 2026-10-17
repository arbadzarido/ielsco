-- Product reset (My Goals): worldwide, multiple destinations. Additive only; safe to run more than once.
-- destination_countries: ISO 3166-1 alpha-2 codes (max 5), e.g. {SG,JP}. Empty = not decided yet.
-- destination_other:     free text for a place not in the list ("Other"), max 60 characters.
-- destination_country (existing, single display name) is kept and filled by the app with the first destination,
-- so list_member_directory and older code keep working unchanged.
-- RLS: unchanged. The existing owner-only policies and table grants on member_profiles cover the new columns.

alter table public.member_profiles add column if not exists destination_countries text[] not null default '{}';
alter table public.member_profiles add column if not exists destination_other text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'member_profiles_destinations_valid'
                 and conrelid = 'public.member_profiles'::regclass) then
    alter table public.member_profiles add constraint member_profiles_destinations_valid check (
      cardinality(destination_countries) <= 5 and
      array_to_string(destination_countries, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$' and
      (destination_other is null or char_length(btrim(destination_other)) between 1 and 60)
    );
  end if;
end $$;

-- No backfill: existing rows keep destination_country, and the app maps that name to a code (or to "other" text)
-- when it loads the row (withDestinations in lib/dashboard/profile.ts). Nothing is guessed in SQL.
