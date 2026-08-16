begin;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'negotiation-seller@revvbase.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Seller"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'negotiation-buyer@revvbase.test', crypt('not-a-real-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Buyer"}', now(), now());

insert into public.listings (id, seller_id, vehicle_type, make, model, year, odometer_km, price_inr, city, fuel_type, previous_owners, status)
values ('31000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'motorcycle', 'Test', 'Negotiation Bike', 2023, 1000, 100000, 'Pune', 'petrol', 1, 'active');

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"21000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare conversation_id uuid; offer_id uuid;
begin
  conversation_id := public.create_initial_offer('31000000-0000-4000-8000-000000000001', 85000, 'Can I see it Saturday?');
  select id into offer_id from public.negotiation_messages where conversation_id = conversation_id and kind = 'offer';
  if (select count(*) from public.negotiation_messages where conversation_id = conversation_id) <> 2 then raise exception 'Initial offer must retain its optional note'; end if;
  begin perform public.accept_offer(offer_id); raise exception 'Buyer unexpectedly accepted own offer'; exception when insufficient_privilege then null; end;
  perform public.make_counter_offer(conversation_id, 90000);
  if (select count(*) from public.negotiation_messages where conversation_id = conversation_id and offer_status = 'pending') <> 1 then raise exception 'Only one offer may be pending'; end if;
end $$;

select set_config('request.jwt.claim.sub', '21000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"21000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare offer_id uuid; conversation_id uuid;
begin
  select id, conversation_id into offer_id, conversation_id from public.negotiation_messages where offer_status = 'pending';
  perform public.decline_offer(offer_id);
  perform public.restore_declined_offer(offer_id);
  perform public.accept_offer(offer_id);
  if (select status from public.listings where id = '31000000-0000-4000-8000-000000000001') <> 'booked' then raise exception 'Accepted offer must book listing'; end if;
  if (select status from public.listing_conversations where id = conversation_id) <> 'agreed' then raise exception 'Accepted thread must remain available for coordination'; end if;
  perform public.undo_accepted_offer(offer_id);
  if (select status from public.listings where id = '31000000-0000-4000-8000-000000000001') <> 'active' then raise exception 'Seller must be able to undo an accidental acceptance'; end if;
  if (select status from public.listing_conversations where id = conversation_id) <> 'open' then raise exception 'Undoing acceptance must restore the selected negotiation'; end if;
  perform public.accept_offer(offer_id);
  perform public.reopen_booked_listing('31000000-0000-4000-8000-000000000001');
  if (select status from public.listings where id = '31000000-0000-4000-8000-000000000001') <> 'active' then raise exception 'Seller must be able to reopen booked listing'; end if;
end $$;

reset role;
rollback;

select 'Negotiation RLS assertions passed' as result;
