-- Listing-specific buyer/seller negotiations. All mutations go through the
-- RPCs below so booking is atomic and cannot be forged from the browser.
alter table public.listings drop constraint listings_status;
alter table public.listings add constraint listings_status check (status in ('draft', 'active', 'booked', 'deleted'));

-- Existing browser updates cannot change lifecycle status. The protected RPCs
-- below set a transaction-local capability immediately before their update.
create or replace function public.protect_listing_lifecycle_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.role()) in ('anon', 'authenticated') then
    if new.status is distinct from old.status
      and current_setting('app.allow_listing_lifecycle', true) is distinct from 'true' then
      raise insufficient_privilege using message = 'Listing status changes require protected lifecycle authority.';
    end if;
    if new.seller_id is distinct from old.seller_id then
      raise insufficient_privilege using message = 'Listing ownership cannot be changed.';
    end if;
  end if;
  return new;
end; $$;

drop policy if exists "Active listings are publicly readable" on public.listings;
create policy "Public listings are readable"
on public.listings for select to anon using (status in ('active', 'booked'));

drop policy if exists "Authenticated users can read active or owned listings" on public.listings;
create policy "Authenticated users can read public or owned listings"
on public.listings for select to authenticated using (status in ('active', 'booked') or (select auth.uid()) = seller_id);

drop policy if exists "Active listing image metadata is publicly readable" on public.listing_images;
create policy "Public listing image metadata is readable"
on public.listing_images for select to anon using (exists (
  select 1 from public.listings where listings.id = listing_images.listing_id and listings.status in ('active', 'booked')
));

drop policy if exists "Authenticated users can read public or owned image metadata" on public.listing_images;
create policy "Authenticated users can read public or owned image metadata"
on public.listing_images for select to authenticated using (exists (
  select 1 from public.listings where listings.id = listing_images.listing_id and (listings.status in ('active', 'booked') or listings.seller_id = (select auth.uid()))
));

create table public.listing_conversations (
  id uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_message_at timestamptz not null default timezone('utc', now()),
  constraint listing_conversations_status check (status in ('open', 'agreed', 'locked')),
  constraint listing_conversations_participants_differ check (buyer_id <> seller_id)
);
create unique index listing_conversations_one_open_buyer_idx on public.listing_conversations(listing_id, buyer_id) where status = 'open';
create index listing_conversations_participant_activity_idx on public.listing_conversations(buyer_id, last_message_at desc);
create index listing_conversations_seller_activity_idx on public.listing_conversations(seller_id, last_message_at desc);
create trigger listing_conversations_set_updated_at before update on public.listing_conversations for each row execute function public.set_updated_at();

create table public.negotiation_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  conversation_id uuid not null references public.listing_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  body text,
  offer_amount_inr bigint,
  offer_status text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint negotiation_messages_kind check (kind in ('text', 'offer')),
  constraint negotiation_messages_offer_status check (offer_status is null or offer_status in ('pending', 'superseded', 'declined', 'accepted')),
  constraint negotiation_messages_text_shape check ((kind = 'text' and char_length(trim(coalesce(body, ''))) between 1 and 2000 and offer_amount_inr is null and offer_status is null) or (kind = 'offer' and offer_amount_inr > 0 and offer_status is not null and (body is null or char_length(trim(body)) <= 2000)))
);
create unique index negotiation_messages_one_pending_offer_idx on public.negotiation_messages(conversation_id) where kind = 'offer' and offer_status = 'pending';
create index negotiation_messages_conversation_created_idx on public.negotiation_messages(conversation_id, created_at);

create table public.conversation_reads (
  conversation_id uuid not null references public.listing_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

alter table public.listing_conversations enable row level security;
alter table public.negotiation_messages enable row level security;
alter table public.conversation_reads enable row level security;
revoke all on public.listing_conversations, public.negotiation_messages, public.conversation_reads from anon, authenticated;
grant select on public.listing_conversations, public.negotiation_messages, public.conversation_reads to authenticated;

create policy "Participants can read conversations" on public.listing_conversations for select to authenticated using ((select auth.uid()) in (buyer_id, seller_id));
create policy "Participants can read negotiation messages" on public.negotiation_messages for select to authenticated using (exists (select 1 from public.listing_conversations c where c.id = negotiation_messages.conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)));
create policy "Participants can read their conversation reads" on public.conversation_reads for select to authenticated using ((select auth.uid()) = user_id and exists (select 1 from public.listing_conversations c where c.id = conversation_reads.conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)));

create or replace function public.assert_conversation_participant(p_conversation_id uuid)
returns public.listing_conversations language plpgsql security definer set search_path = '' as $$
declare c public.listing_conversations;
begin
  select * into c from public.listing_conversations where id = p_conversation_id for update;
  if c.id is null or auth.uid() is null or auth.uid() not in (c.buyer_id, c.seller_id) then raise insufficient_privilege using message = 'You are not a participant in this negotiation.'; end if;
  return c;
end; $$;

create or replace function public.create_initial_offer(p_listing_id uuid, p_amount_inr bigint, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid(); l public.listings; c public.listing_conversations;
begin
  if caller is null or p_amount_inr <= 0 then raise insufficient_privilege using message = 'A positive offer and authentication are required.'; end if;
  select * into l from public.listings where id = p_listing_id for update;
  if l.id is null or l.status <> 'active' then raise check_violation using message = 'This listing is not accepting offers.'; end if;
  if l.seller_id = caller then raise insufficient_privilege using message = 'You cannot make an offer on your own listing.'; end if;
  select * into c from public.listing_conversations where listing_id = p_listing_id and buyer_id = caller and status = 'open' for update;
  if c.id is null then insert into public.listing_conversations(listing_id, buyer_id, seller_id) values (p_listing_id, caller, l.seller_id) returning * into c; end if;
  insert into public.negotiation_messages(conversation_id, sender_id, kind, offer_amount_inr, offer_status) values (c.id, caller, 'offer', p_amount_inr, 'pending');
  if nullif(trim(p_note), '') is not null then insert into public.negotiation_messages(conversation_id, sender_id, kind, body) values (c.id, caller, 'text', trim(p_note)); end if;
  update public.listing_conversations set last_message_at = timezone('utc', now()) where id = c.id;
  return c.id;
end; $$;

create or replace function public.send_negotiation_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.listing_conversations; message_id uuid;
begin
  c := public.assert_conversation_participant(p_conversation_id);
  if c.status not in ('open', 'agreed') then raise check_violation using message = 'This negotiation is closed.'; end if;
  insert into public.negotiation_messages(conversation_id, sender_id, kind, body) values (c.id, auth.uid(), 'text', trim(p_body)) returning id into message_id;
  update public.listing_conversations set last_message_at = timezone('utc', now()) where id = c.id;
  return message_id;
end; $$;

create or replace function public.make_counter_offer(p_conversation_id uuid, p_amount_inr bigint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.listing_conversations; message_id uuid; listing_status text;
begin
  c := public.assert_conversation_participant(p_conversation_id);
  select status into listing_status from public.listings where id = c.listing_id for update;
  if c.status <> 'open' or listing_status <> 'active' or p_amount_inr <= 0 then raise check_violation using message = 'This negotiation is not accepting offers.'; end if;
  update public.negotiation_messages set offer_status = 'superseded' where conversation_id = c.id and kind = 'offer' and offer_status = 'pending';
  insert into public.negotiation_messages(conversation_id, sender_id, kind, offer_amount_inr, offer_status) values (c.id, auth.uid(), 'offer', p_amount_inr, 'pending') returning id into message_id;
  update public.listing_conversations set last_message_at = timezone('utc', now()) where id = c.id;
  return message_id;
end; $$;

create or replace function public.decline_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.negotiation_messages; c public.listing_conversations;
begin
  select * into m from public.negotiation_messages where id = p_offer_id and kind = 'offer' for update;
  c := public.assert_conversation_participant(m.conversation_id);
  if m.id is null or m.offer_status <> 'pending' or c.status <> 'open' then raise check_violation using message = 'This offer is no longer pending.'; end if;
  update public.negotiation_messages set offer_status = 'declined' where id = m.id;
end; $$;

create or replace function public.accept_offer(p_offer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.negotiation_messages; c public.listing_conversations; l public.listings;
begin
  select * into m from public.negotiation_messages where id = p_offer_id and kind = 'offer' for update;
  c := public.assert_conversation_participant(m.conversation_id);
  select * into l from public.listings where id = c.listing_id for update;
  if auth.uid() <> c.seller_id or m.id is null or m.offer_status <> 'pending' or c.status <> 'open' or l.status <> 'active' then raise insufficient_privilege using message = 'Only the seller can accept a pending offer on an active listing.'; end if;
  update public.negotiation_messages set offer_status = 'accepted' where id = m.id;
  update public.negotiation_messages set offer_status = 'superseded' where conversation_id = c.id and kind = 'offer' and offer_status = 'pending';
  perform set_config('app.allow_listing_lifecycle', 'true', true);
  update public.listings set status = 'booked' where id = l.id;
  update public.listing_conversations set status = case when id = c.id then 'agreed' else 'locked' end where listing_id = l.id and status in ('open', 'agreed');
end; $$;

create or replace function public.reopen_booked_listing(p_listing_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.listings;
begin
  select * into l from public.listings where id = p_listing_id for update;
  if l.id is null or l.seller_id <> auth.uid() or l.status <> 'booked' then raise insufficient_privilege using message = 'Only the owner can reopen a booked listing.'; end if;
  perform set_config('app.allow_listing_lifecycle', 'true', true);
  update public.listings set status = 'active' where id = l.id;
  update public.listing_conversations set status = 'locked' where listing_id = l.id and status = 'agreed';
end; $$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.listing_conversations;
begin
  c := public.assert_conversation_participant(p_conversation_id);
  insert into public.conversation_reads(conversation_id, user_id, last_read_at) values (c.id, auth.uid(), timezone('utc', now())) on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
end; $$;

revoke all on function public.assert_conversation_participant(uuid) from public, anon, authenticated;
revoke all on function public.create_initial_offer(uuid, bigint, text), public.send_negotiation_message(uuid, text), public.make_counter_offer(uuid, bigint), public.decline_offer(uuid), public.accept_offer(uuid), public.reopen_booked_listing(uuid), public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.create_initial_offer(uuid, bigint, text), public.send_negotiation_message(uuid, text), public.make_counter_offer(uuid, bigint), public.decline_offer(uuid), public.accept_offer(uuid), public.reopen_booked_listing(uuid), public.mark_conversation_read(uuid) to authenticated;

alter publication supabase_realtime add table public.listing_conversations, public.negotiation_messages;
