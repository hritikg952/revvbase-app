alter table public.negotiation_messages
  add column offer_resolved_by uuid references auth.users(id) on delete set null;

create or replace function public.decline_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.negotiation_messages; c public.listing_conversations;
begin
  select * into m from public.negotiation_messages where id = p_offer_id and kind = 'offer' for update;
  c := public.assert_conversation_participant(m.conversation_id);
  if m.id is null or m.offer_status <> 'pending' or c.status <> 'open' then raise check_violation using message = 'This offer is no longer pending.'; end if;
  update public.negotiation_messages set offer_status = 'declined', offer_resolved_by = auth.uid() where id = m.id;
end; $$;

create or replace function public.restore_declined_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.negotiation_messages; c public.listing_conversations; listing_status text;
begin
  select * into m from public.negotiation_messages where id = p_offer_id and kind = 'offer' for update;
  c := public.assert_conversation_participant(m.conversation_id);
  select status into listing_status from public.listings where id = c.listing_id for update;
  if m.id is null or m.offer_status <> 'declined' or m.offer_resolved_by <> auth.uid() or c.status <> 'open' or listing_status <> 'active' then raise insufficient_privilege using message = 'Only the person who declined this offer can restore it while the negotiation is open.'; end if;
  if exists (select 1 from public.negotiation_messages where conversation_id = c.id and kind = 'offer' and offer_status = 'pending') then raise check_violation using message = 'A newer offer is already pending.'; end if;
  update public.negotiation_messages set offer_status = 'pending', offer_resolved_by = null where id = m.id;
end; $$;

create or replace function public.accept_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.negotiation_messages; c public.listing_conversations; l public.listings;
begin
  select * into m from public.negotiation_messages where id = p_offer_id and kind = 'offer' for update;
  c := public.assert_conversation_participant(m.conversation_id);
  select * into l from public.listings where id = c.listing_id for update;
  if auth.uid() <> c.seller_id or m.id is null or m.offer_status <> 'pending' or c.status <> 'open' or l.status <> 'active' then raise insufficient_privilege using message = 'Only the seller can accept a pending offer on an active listing.'; end if;
  update public.negotiation_messages set offer_status = 'accepted', offer_resolved_by = auth.uid() where id = m.id;
  update public.negotiation_messages set offer_status = 'superseded' where conversation_id = c.id and kind = 'offer' and offer_status = 'pending';
  perform set_config('app.allow_listing_lifecycle', 'true', true);
  update public.listings set status = 'booked' where id = l.id;
  update public.listing_conversations set status = case when id = c.id then 'agreed' else 'locked' end where listing_id = l.id and status in ('open', 'agreed');
end; $$;

create or replace function public.undo_accepted_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.negotiation_messages; c public.listing_conversations; l public.listings;
begin
  select * into m from public.negotiation_messages where id = p_offer_id and kind = 'offer' for update;
  c := public.assert_conversation_participant(m.conversation_id);
  select * into l from public.listings where id = c.listing_id for update;
  if m.id is null or auth.uid() <> c.seller_id or m.offer_status <> 'accepted' or m.offer_resolved_by <> auth.uid() or c.status <> 'agreed' or l.status <> 'booked' then raise insufficient_privilege using message = 'Only the seller who accepted this offer can undo it while the listing is booked.'; end if;
  perform set_config('app.allow_listing_lifecycle', 'true', true);
  update public.listings set status = 'active' where id = l.id;
  update public.listing_conversations set status = 'open' where id = c.id;
  update public.negotiation_messages set offer_status = 'pending', offer_resolved_by = null where id = m.id;
end; $$;

revoke all on function public.restore_declined_offer(uuid), public.undo_accepted_offer(uuid) from public, anon;
grant execute on function public.restore_declined_offer(uuid), public.undo_accepted_offer(uuid) to authenticated;
