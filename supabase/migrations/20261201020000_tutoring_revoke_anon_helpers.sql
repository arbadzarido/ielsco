-- Role helper functions are for signed-in users only (Supabase advisor: SECURITY DEFINER executable by anon). Applied to production 22 Nov 2026.
revoke execute on function public.tutoring_is_admin(), public.tutoring_is_mentor(), public.tutoring_is_staff() from public, anon;
grant execute on function public.tutoring_is_admin(), public.tutoring_is_mentor(), public.tutoring_is_staff() to authenticated;
