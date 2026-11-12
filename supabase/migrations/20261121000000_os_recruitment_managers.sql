-- Company OS Recruitment: every active founder and manager is on the recruitment team.
--
-- Until now the page opened only for a founder signed in with an authenticator code (os_is_founder needs aal2) or for
-- someone holding a 'recruitment' grant, so in practice only one founder could use it. Founders and managers now get
-- view and edit access by their role. Unchanged:
--   * grants still give access to anyone else (e.g. an interviewer or a member helping with screening);
--   * stage configuration and turning an accepted candidate into a person record stay founder-only (with MFA);
--   * interview events and recruitment tasks keep their own Restricted visibility.
-- Additive and idempotent: only this function's body changes; no data is changed.

create or replace function public.os_recruitment_access(p_level text default 'view') returns boolean
language sql stable security definer set search_path = '' as $$
  select public.os_is_staff() and (
    public.os_is_founder()
    or exists (select 1 from public.os_people p
               where p.id = public.os_current_person() and p.status = 'active' and p.org_role in ('founder', 'manager'))
    or exists (select 1 from public.os_grants g
               where g.person_id = public.os_current_person() and g.resource_type = 'recruitment'
                 and g.resource_id in ('2027', 'ALL') and g.revoked_at is null and (g.expires_at is null or g.expires_at > now())
                 and (p_level = 'view' or g.level = 'edit')))
$$;
