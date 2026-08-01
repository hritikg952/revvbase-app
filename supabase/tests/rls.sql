begin;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'rls-owner-a@revvbase.test',
    crypt('not-a-real-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'rls-owner-b@revvbase.test',
    crypt('not-a-real-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  );

insert into public.listings (
  id,
  seller_id,
  vehicle_type,
  make,
  model,
  year,
  odometer_km,
  price_inr,
  city,
  fuel_type,
  previous_owners,
  status
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'motorcycle',
    'Test Make',
    'Visible Bike',
    2022,
    1000,
    100000,
    'Pune',
    'petrol',
    1,
    'active'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'scooter',
    'Test Make',
    'Deleted Scooter',
    2021,
    2000,
    75000,
    'Mumbai',
    'petrol',
    1,
    'deleted'
  );

set local role anon;

do $$
begin
  if (
    select count(*)
    from public.listings
    where id in (
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002'
    )
  ) <> 1 then
    raise exception 'RLS assertion failed: anonymous user must see only the active test fixture';
  end if;

  if exists (
    select 1
    from public.listings
    where id = '30000000-0000-4000-8000-000000000002'
  ) then
    raise exception 'RLS assertion failed: anonymous user can see the deleted test fixture';
  end if;

  if (select count(*) from public.vehicle_catalog) < 1 then
    raise exception 'RLS assertion failed: anonymous user must see vehicle catalog rows';
  end if;

  begin
    insert into public.listings (
      seller_id, vehicle_type, make, model, year, odometer_km,
      price_inr, city, fuel_type, previous_owners
    ) values (
      '20000000-0000-4000-8000-000000000001', 'motorcycle',
      'Blocked', 'Anonymous Write', 2024, 0, 1, 'Delhi', 'petrol', 1
    );
    raise exception 'RLS assertion failed: anonymous insert unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
declare
  changed integer;
begin
  if (
    select count(*)
    from public.listings
    where id in (
      '30000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002'
    )
  ) <> 2 then
    raise exception 'RLS assertion failed: owner A must see both of its test fixtures';
  end if;

  insert into public.listings (
    seller_id, vehicle_type, make, model, year, odometer_km,
    price_inr, city, fuel_type, previous_owners
  ) values (
    '20000000-0000-4000-8000-000000000001', 'bicycle',
    'Test', 'Owner Insert', 2023, 500, 12000, 'Bengaluru', 'not_applicable', 1
  );

  update public.listings
  set status = 'deleted'
  where id = '30000000-0000-4000-8000-000000000001';
  get diagnostics changed = row_count;

  if changed <> 1 then
    raise exception 'RLS assertion failed: owner A could not soft-delete own listing';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

do $$
declare
  changed integer;
begin
  update public.listings
  set price_inr = 1
  where seller_id = '20000000-0000-4000-8000-000000000001';
  get diagnostics changed = row_count;

  if changed <> 0 then
    raise exception 'RLS assertion failed: owner B updated owner A rows';
  end if;
end;
$$;

reset role;
rollback;

select 'Hosted RLS assertions passed' as result;
