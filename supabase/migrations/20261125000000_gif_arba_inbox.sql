-- Words We Leave Behind: messages written to "Arba" also appear in Arba's own "Messages left for you" inbox
-- (the GIF admin account, public.gif_admins), not only in the admin moderation view. Still anonymous: no sender is
-- returned. Messages to Farrel stay in the admin view. Community-wall sharing remains for delegate recipients only.
create or replace function public.gif_my_received_messages()
returns table (id uuid, body text, created_at timestamptz, read_at timestamptz, favourite boolean, wall_status text, sender_allows_wall boolean)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.body, m.created_at, m.read_at, m.favourite, m.wall_status,
         case when m.recipient_staff is null then m.sender_allows_wall else false end
    from public.gif_messages m
   where m.hidden_at is null
     and ((m.recipient_delegate_id is not null and m.recipient_delegate_id = public.gif_my_delegate_id())
       or (m.recipient_staff = 'arba' and public.gif_is_admin()))
   order by m.created_at desc
$$;

create or replace function public.gif_update_received_message(p_id uuid, p_read boolean, p_favourite boolean, p_request_wall boolean)
returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare me uuid := public.gif_my_delegate_id(); m record;
begin
  select * into m from public.gif_messages
   where id = p_id and hidden_at is null
     and ((recipient_delegate_id is not null and recipient_delegate_id = me) or (recipient_staff = 'arba' and public.gif_is_admin()));
  if not found then raise exception 'Message not found.' using errcode = '42501'; end if;
  update public.gif_messages set
    read_at = case when p_read is null then read_at when p_read then coalesce(read_at, now()) else null end,
    favourite = coalesce(p_favourite, favourite),
    wall_status = case
      when m.recipient_staff is not null then wall_status
      when p_request_wall is true and m.sender_allows_wall and m.wall_status in ('none', 'declined') then 'requested'
      when p_request_wall is false and m.wall_status in ('requested', 'approved') then 'none'
      else wall_status end
   where id = p_id;
end $$;
