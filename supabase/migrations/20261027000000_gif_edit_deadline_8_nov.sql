-- GIF Singapore 2026 delegate profile editing: deadline extended from 20 October to 8 November 2026 (23:59:59 WIB,
-- i.e. until 9 November 2026 00:00 WIB). Used by the gif_guard_delegate trigger on public.gif_delegates and by the
-- "gif docs: upload own" / "gif docs: delete own" storage policies. Keep in sync with EDIT_DEADLINE in
-- src/app/dashboard/gif/delegates/page.tsx. Same signature and attributes as before; existing grants are kept.
create or replace function public.gif_edit_deadline() returns timestamptz
language sql immutable
as $$ select timestamptz '2026-11-09 00:00:00+07' $$;
