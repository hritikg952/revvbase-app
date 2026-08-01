create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  city text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_display_name_length check (
    display_name is null or char_length(trim(display_name)) between 1 and 100
  ),
  constraint profiles_city_length check (
    city is null or char_length(trim(city)) between 1 and 100
  )
);

comment on table public.profiles is 'Public-facing profile data for Supabase Auth users.';

create table public.vehicle_catalog (
  id uuid primary key default extensions.gen_random_uuid(),
  vehicle_type text not null,
  make text not null,
  model text not null,
  fuel_type text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint vehicle_catalog_vehicle_type check (
    vehicle_type in ('motorcycle', 'scooter', 'electric_two_wheeler', 'bicycle')
  ),
  constraint vehicle_catalog_fuel_type check (
    fuel_type in ('petrol', 'diesel', 'electric', 'hybrid', 'not_applicable')
  ),
  constraint vehicle_catalog_make_length check (char_length(trim(make)) between 1 and 100),
  constraint vehicle_catalog_model_length check (char_length(trim(model)) between 1 and 100),
  constraint vehicle_catalog_unique_model unique (vehicle_type, make, model)
);

comment on table public.vehicle_catalog is 'Reference makes and models used to assist listing entry.';

create table public.listings (
  id uuid primary key default extensions.gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  vehicle_type text not null,
  make text not null,
  model text not null,
  year smallint not null,
  odometer_km integer not null,
  price_inr bigint not null,
  city text not null,
  fuel_type text not null,
  previous_owners smallint not null default 1,
  insurance_valid_until date,
  description text,
  image_url text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint listings_vehicle_type check (
    vehicle_type in ('motorcycle', 'scooter', 'electric_two_wheeler', 'bicycle')
  ),
  constraint listings_fuel_type check (
    fuel_type in ('petrol', 'diesel', 'electric', 'hybrid', 'not_applicable')
  ),
  constraint listings_status check (status in ('active', 'deleted')),
  constraint listings_make_length check (char_length(trim(make)) between 1 and 100),
  constraint listings_model_length check (char_length(trim(model)) between 1 and 100),
  constraint listings_city_length check (char_length(trim(city)) between 1 and 100),
  constraint listings_year_range check (year between 1900 and 2100),
  constraint listings_odometer_nonnegative check (odometer_km >= 0),
  constraint listings_price_positive check (price_inr > 0),
  constraint listings_previous_owners_range check (previous_owners between 0 and 20),
  constraint listings_description_length check (
    description is null or char_length(description) <= 5000
  ),
  constraint listings_image_url_length check (
    image_url is null or char_length(image_url) <= 2048
  )
);

comment on table public.listings is 'Second-hand two-wheeler listings owned by Supabase Auth users.';
comment on column public.listings.status is 'Soft-deletion state. Public clients can only read active rows.';

create index listings_public_feed_idx
  on public.listings (created_at desc)
  where status = 'active';

create index listings_seller_idx
  on public.listings (seller_id, created_at desc);

create index listings_city_idx
  on public.listings (city)
  where status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.vehicle_catalog enable row level security;
alter table public.listings enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.vehicle_catalog from anon, authenticated;
revoke all on table public.listings from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;
grant select on table public.vehicle_catalog to anon, authenticated;
grant select on table public.listings to anon, authenticated;
grant insert, update on table public.listings to authenticated;

create policy "Profiles are publicly readable"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Vehicle catalog is publicly readable"
on public.vehicle_catalog
for select
to anon, authenticated
using (true);

create policy "Active listings are publicly readable"
on public.listings
for select
to anon, authenticated
using (status = 'active');

create policy "Owners can read all their listings"
on public.listings
for select
to authenticated
using ((select auth.uid()) = seller_id);

create policy "Owners can create active listings"
on public.listings
for insert
to authenticated
with check (
  (select auth.uid()) = seller_id
  and status = 'active'
);

create policy "Owners can update their listings"
on public.listings
for update
to authenticated
using ((select auth.uid()) = seller_id)
with check ((select auth.uid()) = seller_id);
