begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '61000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'images-owner-a@revvbase.test',
    crypt('not-a-real-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '61000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'images-owner-b@revvbase.test',
    crypt('not-a-real-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now()
  );

insert into public.listings (
  id, seller_id, vehicle_type, make, model, year, odometer_km,
  price_inr, city, fuel_type, previous_owners, status
)
values
  (
    '62000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001',
    'motorcycle', 'Test', 'Active Bike', 2024, 1000,
    100000, 'Pune', 'petrol', 1, 'active'
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000001',
    'scooter', 'Test', 'Draft Scooter', 2024, 1000,
    90000, 'Pune', 'petrol', 1, 'draft'
  ),
  (
    '62000000-0000-4000-8000-000000000004',
    '61000000-0000-4000-8000-000000000001',
    'motorcycle', 'Test', 'Deleted Bike', 2024, 1000,
    80000, 'Pune', 'petrol', 1, 'deleted'
  );

insert into public.listing_images (
  id, listing_id, storage_key, position
)
values
  (
    '63000000-0000-4000-8000-000000000001',
    '62000000-0000-4000-8000-000000000001',
    '61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000001/64000000-0000-4000-8000-000000000001.webp',
    0
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    '62000000-0000-4000-8000-000000000002',
    '61000000-0000-4000-8000-000000000001/62000000-0000-4000-8000-000000000002/64000000-0000-4000-8000-000000000002.webp',
    0
  );

do $$
begin
  if not exists (
    select 1
    from public.listing_image_policy
    where singleton
      and config_schema_version = 1
      and source_config_path = 'src/config/app-settings.json'
      and images_required is false
      and max_images_per_listing = 5
      and canonical_mime_type = 'image/webp'
      and canonical_max_bytes = 1048576
  ) then
    raise exception 'Image policy assertion failed: deployed mirror must match the versioned JSON release checklist';
  end if;
end;
$$;

set local role anon;

do $$
begin
  if (select count(*) from public.listings where id::text like '62000000-%') <> 1 then
    raise exception 'Image RLS assertion failed: anonymous readers must see only active listings';
  end if;

  if (select count(*) from public.listing_images where id::text like '63000000-%') <> 1 then
    raise exception 'Image RLS assertion failed: anonymous readers must see only active-listing metadata';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  new_status text;
begin
  insert into public.listings (
    id, seller_id, vehicle_type, make, model, year, odometer_km,
    price_inr, city, fuel_type, previous_owners
  ) values (
    '62000000-0000-4000-8000-000000000003',
    '61000000-0000-4000-8000-000000000001',
    'bicycle', 'Test', 'Default Draft', 2024, 0,
    10000, 'Pune', 'not_applicable', 1
  ) returning status into new_status;

  if new_status <> 'draft' then
    raise exception 'Image RLS assertion failed: browser-created listing must default to draft';
  end if;

  if (select count(*) from public.listings where id::text like '62000000-%') <> 4 then
    raise exception 'Image RLS assertion failed: owner must see active, draft, and deleted owned records';
  end if;

  if (select count(*) from public.listing_images where id::text like '63000000-%') <> 2 then
    raise exception 'Image RLS assertion failed: owner must see metadata on owned drafts';
  end if;

  begin
    update public.listings
      set status = 'active'
      where id = '62000000-0000-4000-8000-000000000002';
    raise exception 'Image RLS assertion failed: direct draft publication unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.listings
      set status = 'deleted'
      where id = '62000000-0000-4000-8000-000000000002';
    raise exception 'Image RLS assertion failed: direct draft deletion transition unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.listings
      set status = 'draft'
      where id = '62000000-0000-4000-8000-000000000001';
    raise exception 'Image RLS assertion failed: direct active-to-draft transition unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.listings
      set status = 'deleted'
      where id = '62000000-0000-4000-8000-000000000001';
    raise exception 'Image RLS assertion failed: direct active deletion transition unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    delete from public.listings
      where id = '62000000-0000-4000-8000-000000000002';
    raise exception 'Image RLS assertion failed: direct listing deletion unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.listing_images
      set position = 4
      where id = '63000000-0000-4000-8000-000000000002';
    raise exception 'Image RLS assertion failed: direct metadata mutation unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.register_listing_image(
      '62000000-0000-4000-8000-000000000002',
      '61000000-0000-4000-8000-000000000002/62000000-0000-4000-8000-000000000002/64000000-0000-4000-8000-000000000003.webp'
    );
    raise exception 'Image RLS assertion failed: forged owner key unexpectedly registered';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

do $$
declare
  changed integer;
begin
  update public.listings
    set status = 'active'
    where id = '62000000-0000-4000-8000-000000000004';
  get diagnostics changed = row_count;

  if changed <> 0 then
    raise exception 'Image RLS assertion failed: browser restored a deleted listing';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"61000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.listings where id::text like '62000000-%') <> 1 then
    raise exception 'Image RLS assertion failed: non-owner must see the active fixture only';
  end if;

  if (select count(*) from public.listing_images where id::text like '63000000-%') <> 1 then
    raise exception 'Image RLS assertion failed: non-owner must see active-listing metadata only';
  end if;
end;
$$;

reset role;
rollback;

select 'Listing image RLS assertions passed' as result;
