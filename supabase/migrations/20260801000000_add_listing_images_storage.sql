alter table public.listings
  drop constraint listings_status;

alter table public.listings
  alter column status set default 'draft',
  add constraint listings_status check (status in ('draft', 'active', 'deleted'));

comment on column public.listings.status is
  'Lifecycle state. Browser inserts are draft; only protected server authority may transition status.';

drop policy if exists "Active listings are publicly readable" on public.listings;
drop policy if exists "Owners can read all their listings" on public.listings;
drop policy if exists "Authenticated users can read active or owned listings" on public.listings;
drop policy if exists "Owners can create active listings" on public.listings;
drop policy if exists "Owners can update their listings" on public.listings;

create policy "Active listings are publicly readable"
on public.listings
for select
to anon
using (status = 'active');

create policy "Authenticated users can read active or owned listings"
on public.listings
for select
to authenticated
using (
  status = 'active'
  or (select auth.uid()) = seller_id
);

create policy "Owners can create draft listings"
on public.listings
for insert
to authenticated
with check (
  (select auth.uid()) = seller_id
  and status = 'draft'
);

create policy "Owners can edit non-deleted listing details"
on public.listings
for update
to authenticated
using (
  (select auth.uid()) = seller_id
  and status in ('draft', 'active')
)
with check (
  (select auth.uid()) = seller_id
  and status in ('draft', 'active')
);

revoke delete on table public.listings from anon, authenticated;

create or replace function public.protect_listing_lifecycle_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.role()) in ('anon', 'authenticated') then
    if new.status is distinct from old.status then
      raise insufficient_privilege
        using message = 'Listing status changes require protected lifecycle authority.';
    end if;

    if new.seller_id is distinct from old.seller_id then
      raise insufficient_privilege
        using message = 'Listing ownership cannot be changed.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_listing_lifecycle_fields()
  from public, anon, authenticated;

create trigger listings_protect_lifecycle_fields
before update on public.listings
for each row execute function public.protect_listing_lifecycle_fields();

create table public.listing_image_policy (
  singleton boolean primary key default true,
  config_schema_version integer not null,
  images_required boolean not null,
  max_images_per_listing smallint not null,
  canonical_mime_type text not null,
  canonical_max_bytes integer not null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint listing_image_policy_singleton check (singleton),
  constraint listing_image_policy_schema_version check (config_schema_version > 0),
  constraint listing_image_policy_max_images check (max_images_per_listing > 0),
  constraint listing_image_policy_mime check (canonical_mime_type = 'image/webp'),
  constraint listing_image_policy_max_bytes check (canonical_max_bytes > 0)
);

comment on table public.listing_image_policy is
  'Migration-owned authorization mirror for src/config/app-settings.json. Every JSON image-rule release must update this singleton in the same database migration.';
comment on column public.listing_image_policy.images_required is
  'Server-authoritative mirror of images.required; browser configuration is UX-only.';

insert into public.listing_image_policy (
  singleton,
  config_schema_version,
  images_required,
  max_images_per_listing,
  canonical_mime_type,
  canonical_max_bytes
)
values (true, 1, false, 5, 'image/webp', 1048576);

alter table public.listing_image_policy enable row level security;
revoke all on table public.listing_image_policy from public, anon, authenticated;
grant select, update on table public.listing_image_policy to service_role;

create table public.listing_images (
  id uuid primary key default extensions.gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_key text not null unique,
  position smallint not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint listing_images_position_nonnegative check (position >= 0),
  constraint listing_images_key_length check (char_length(storage_key) between 1 and 512),
  constraint listing_images_listing_position_unique unique (listing_id, position)
);

comment on table public.listing_images is
  'Ordered, provider-neutral metadata for canonical listing photos. Position zero is the cover.';
comment on column public.listing_images.storage_key is
  'Opaque provider key. Public URLs are derived only by the active storage adapter.';

create index listing_images_listing_order_idx
  on public.listing_images (listing_id, position);

alter table public.listing_images enable row level security;
revoke all on table public.listing_images from public, anon, authenticated;
grant select on table public.listing_images to anon, authenticated;

create policy "Active listing image metadata is publicly readable"
on public.listing_images
for select
to anon
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and listings.status = 'active'
  )
);

create policy "Authenticated users can read public or owned image metadata"
on public.listing_images
for select
to authenticated
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_images.listing_id
      and (
        listings.status = 'active'
        or listings.seller_id = (select auth.uid())
      )
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-images',
  'listing-images',
  true,
  1048576,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can upload canonical listing images" on storage.objects;
drop policy if exists "Owners can select their listing image objects" on storage.objects;

create policy "Owners can upload canonical listing images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 2
  and storage.extension(name) = 'webp'
  and exists (
    select 1
    from public.listings
    where listings.id::text = (storage.foldername(name))[2]
      and listings.seller_id = (select auth.uid())
      and listings.status in ('draft', 'active')
  )
);

create policy "Owners can select their listing image objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.listings
    where listings.id::text = (storage.foldername(name))[2]
      and listings.seller_id = (select auth.uid())
      and listings.status in ('draft', 'active')
  )
);

create or replace function public.register_listing_image(
  p_listing_id uuid,
  p_storage_key text
)
returns public.listing_images
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  owner_id uuid;
  listing_status text;
  image_count integer;
  next_position smallint;
  maximum_images smallint;
  registered public.listing_images;
begin
  if caller_id is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  select listings.seller_id, listings.status
    into owner_id, listing_status
  from public.listings
  where listings.id = p_listing_id
  for update;

  if owner_id is null
    or owner_id <> caller_id
    or listing_status not in ('draft', 'active') then
    raise insufficient_privilege using message = 'The listing is not owned by the caller.';
  end if;

  if split_part(p_storage_key, '/', 1) <> caller_id::text
    or split_part(p_storage_key, '/', 2) <> p_listing_id::text
    or p_storage_key !~ (
      '^' || caller_id::text || '/' || p_listing_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]webp$'
    ) then
    raise insufficient_privilege using message = 'The storage key is not bound to this owner and listing.';
  end if;

  if not exists (
    select 1
    from storage.objects
    where objects.bucket_id = 'listing-images'
      and objects.name = p_storage_key
      and objects.owner_id = caller_id::text
  ) then
    raise insufficient_privilege using message = 'The canonical storage object does not exist for this owner.';
  end if;

  select policy.max_images_per_listing
    into maximum_images
  from public.listing_image_policy as policy
  where policy.singleton;

  select count(*), coalesce(max(listing_images.position) + 1, 0)
    into image_count, next_position
  from public.listing_images
  where listing_images.listing_id = p_listing_id;

  if image_count >= maximum_images then
    raise check_violation using message = 'This listing already has the maximum number of photos.';
  end if;

  insert into public.listing_images (listing_id, storage_key, position)
  values (p_listing_id, p_storage_key, next_position)
  returning * into registered;

  return registered;
end;
$$;

revoke execute on function public.register_listing_image(uuid, text)
  from public, anon;
grant execute on function public.register_listing_image(uuid, text)
  to authenticated, service_role;
