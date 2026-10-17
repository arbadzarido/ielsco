-- Member profile photos (idempotent). New bucket `member-avatars` in the IELSco project (Elco has its own bucket in
-- its own project). The older, unused `avatars` bucket is left untouched.
-- Objects live at "<user id>/<random>.<webp|jpg|png>": public read through the public object URL, no listing of other
-- members' folders, writes only by the owner, no overwrites (no UPDATE policy; every new photo gets a new name).
-- member_profiles.avatar_url may only be set to the member's own uploaded photo, a Google account photo (what the
-- sign-up prefill already uses), or null. Existing values are never re-checked unless they change.

do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'storage schema not found; skipping member-avatars bucket and policies';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('member-avatars', 'member-avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
  on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  drop policy if exists "member_avatars_insert_own" on storage.objects;
  drop policy if exists "member_avatars_select_own" on storage.objects;
  drop policy if exists "member_avatars_delete_own" on storage.objects;

  execute $p$create policy "member_avatars_insert_own" on storage.objects for insert to authenticated with check (
    bucket_id = 'member-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
    and lower(storage.extension(name)) in ('webp', 'jpg', 'jpeg', 'png'))$p$;
  execute $p$create policy "member_avatars_select_own" on storage.objects for select to authenticated using (
    bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
  execute $p$create policy "member_avatars_delete_own" on storage.objects for delete to authenticated using (
    bucket_id = 'member-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)$p$;
end $$;

create or replace function public.member_profiles_check_avatar_url() returns trigger
language plpgsql set search_path = '' as $$
declare
  own_prefix text := '/storage/v1/object/public/member-avatars/' || new.user_id::text || '/';
begin
  if new.avatar_url is null or (tg_op = 'UPDATE' and new.avatar_url is not distinct from old.avatar_url) then
    return new;
  end if;
  -- Profile saves are upserts: the INSERT trigger fires before ON CONFLICT, so an unchanged stored value must pass.
  if tg_op = 'INSERT' and exists (select 1 from public.member_profiles m
                                  where m.user_id = new.user_id and m.avatar_url = new.avatar_url) then
    return new;
  end if;
  -- Google account photo (OAuth profile picture), as prefilled at sign-up.
  if new.avatar_url ~ '^https://lh3\.googleusercontent\.com/a/[A-Za-z0-9_=-]+$' then
    return new;
  end if;
  -- The member's own uploaded photo in this project's member-avatars bucket.
  if new.avatar_url ~ ('^https://[a-z0-9]+\.supabase\.co' || own_prefix || '[A-Za-z0-9_-]{8,64}\.(webp|jpg|jpeg|png)$')
     or new.avatar_url ~ ('^http://(127\.0\.0\.1|localhost):[0-9]+' || own_prefix || '[A-Za-z0-9_-]{8,64}\.(webp|jpg|jpeg|png)$') then
    return new;
  end if;
  raise exception 'avatar_url must point to your own uploaded profile photo' using errcode = '22023';
end $$;

drop trigger if exists member_profiles_check_avatar_url on public.member_profiles;
create trigger member_profiles_check_avatar_url before insert or update of avatar_url on public.member_profiles
  for each row execute function public.member_profiles_check_avatar_url();
