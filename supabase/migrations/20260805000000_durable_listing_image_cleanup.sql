create table public.listing_image_cleanup_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  storage_key text not null unique,
  state text not null default 'pending' check (
    state in ('pending', 'processing', 'completed', 'cancelled', 'dead')
  ),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  next_attempt_at timestamptz not null default timezone('utc', now()),
  claimed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

comment on table public.listing_image_cleanup_jobs is
  'Durable outbox for idempotent canonical object deletion after transactional listing/image state changes.';

create or replace function public.cancel_listing_image_cleanup_on_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listing_image_cleanup_jobs
  set state = 'cancelled', claimed_at = null, completed_at = timezone('utc', now()),
      last_error = null
  where storage_key = new.storage_key and state in ('pending', 'processing');
  return new;
end;
$$;

revoke execute on function public.cancel_listing_image_cleanup_on_registration()
  from public, anon, authenticated;

create trigger listing_images_cancel_cleanup_intent
after insert on public.listing_images
for each row execute function public.cancel_listing_image_cleanup_on_registration();

create index listing_image_cleanup_jobs_pending_owner_idx
  on public.listing_image_cleanup_jobs (seller_id, created_at)
  where state = 'pending';

alter table public.listing_image_cleanup_jobs enable row level security;
revoke all on table public.listing_image_cleanup_jobs from public, anon, authenticated;
grant select, insert, update on table public.listing_image_cleanup_jobs to service_role;

create or replace function public.reserve_listing_image_deletion(
  p_user_id uuid,
  p_listing_id uuid,
  p_image_id uuid,
  p_storage_key text
)
returns table (listing_status text, cleanup_job_id uuid, cleanup_storage_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_listing public.listings%rowtype;
  owned_image public.listing_images%rowtype;
  images_required boolean;
  image_count integer;
  job_id uuid;
begin
  select * into owned_listing
  from public.listings
  where id = p_listing_id
  for update;

  if owned_listing.id is null or owned_listing.seller_id <> p_user_id
    or owned_listing.status not in ('draft', 'active') then
    raise insufficient_privilege using message = 'The listing is not owned by the caller.';
  end if;

  select * into owned_image
  from public.listing_images
  where id = p_image_id
    and listing_id = p_listing_id
    and storage_key = p_storage_key
  for update;

  if owned_image.id is null then
    raise insufficient_privilege using message = 'The photo does not belong to this listing.';
  end if;

  select policy.images_required into images_required
  from public.listing_image_policy as policy
  where policy.singleton;

  select count(*) into image_count
  from public.listing_images
  where listing_id = p_listing_id;

  if images_required and owned_listing.status = 'active' and image_count = 1 then
    update public.listings set status = 'draft' where id = p_listing_id;
    owned_listing.status := 'draft';
  end if;

  insert into public.listing_image_cleanup_jobs (
    seller_id, listing_id, storage_key
  ) values (
    p_user_id, p_listing_id, owned_image.storage_key
  )
  on conflict (storage_key) do update
    set state = 'pending', attempts = 0, last_error = null,
        next_attempt_at = timezone('utc', now()), claimed_at = null,
        completed_at = null
  returning id into job_id;

  delete from public.listing_images where id = owned_image.id;

  return query select owned_listing.status, job_id, owned_image.storage_key;
end;
$$;

create or replace function public.reserve_listing_deletion(
  p_user_id uuid,
  p_listing_id uuid
)
returns table (listing_status text, cleanup_job_id uuid, cleanup_storage_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_listing public.listings%rowtype;
begin
  select * into owned_listing
  from public.listings
  where id = p_listing_id
  for update;

  if owned_listing.id is null or owned_listing.seller_id <> p_user_id
    or owned_listing.status not in ('draft', 'active') then
    raise insufficient_privilege using message = 'The listing is not owned by the caller.';
  end if;

  insert into public.listing_image_cleanup_jobs (
    seller_id, listing_id, storage_key
  )
  select p_user_id, p_listing_id, images.storage_key
  from public.listing_images as images
  where images.listing_id = p_listing_id
  on conflict (storage_key) do update
    set state = 'pending', attempts = 0, last_error = null,
        next_attempt_at = timezone('utc', now()), claimed_at = null,
        completed_at = null;

  delete from public.listing_images where listing_id = p_listing_id;
  update public.listings set status = 'deleted' where id = p_listing_id;

  if not exists (
    select 1 from public.listing_image_cleanup_jobs as jobs
    where jobs.listing_id = p_listing_id and jobs.state = 'pending'
  ) then
    return query select 'deleted'::text, null::uuid, null::text;
  else
    return query
      select 'deleted'::text, jobs.id, jobs.storage_key
      from public.listing_image_cleanup_jobs as jobs
      where jobs.listing_id = p_listing_id and jobs.state = 'pending'
      order by jobs.created_at;
  end if;
end;
$$;

create or replace function public.reserve_listing_upload_cleanup(
  p_user_id uuid,
  p_listing_id uuid,
  p_storage_key text
)
returns table (listing_status text, cleanup_job_id uuid, cleanup_storage_key text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_listing public.listings%rowtype;
  job_id uuid;
begin
  select * into owned_listing
  from public.listings
  where id = p_listing_id
  for update;

  if owned_listing.id is null or owned_listing.seller_id <> p_user_id
    or owned_listing.status not in ('draft', 'active') then
    raise insufficient_privilege using message = 'The listing is not owned by the caller.';
  end if;

  if split_part(p_storage_key, '/', 1) <> p_user_id::text
    or split_part(p_storage_key, '/', 2) <> p_listing_id::text
    or p_storage_key !~ (
      '^' || p_user_id::text || '/' || p_listing_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]webp$'
    ) then
    raise insufficient_privilege using message = 'The photo key does not belong to this listing.';
  end if;

  if exists (
    select 1 from public.listing_images
    where listing_id = p_listing_id and storage_key = p_storage_key
  ) then
    raise check_violation using message = 'A registered photo must use the normal delete action.';
  end if;

  insert into public.listing_image_cleanup_jobs (
    seller_id, listing_id, storage_key
  ) values (
    p_user_id, p_listing_id, p_storage_key
  )
  on conflict (storage_key) do update
    set state = 'pending', attempts = 0, last_error = null,
        next_attempt_at = timezone('utc', now()), claimed_at = null,
        completed_at = null
  returning id into job_id;

  return query select owned_listing.status, job_id, p_storage_key;
end;
$$;

create or replace function public.complete_listing_image_cleanup(p_job_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listing_image_cleanup_jobs
  set state = 'completed', completed_at = timezone('utc', now()),
      claimed_at = null, last_error = null
  where id = p_job_id;
$$;

create or replace function public.fail_listing_image_cleanup(
  p_job_id uuid,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listing_image_cleanup_jobs
  set state = case when attempts >= 5 then 'dead' else 'pending' end,
      claimed_at = null,
      next_attempt_at = timezone('utc', now()) +
        make_interval(secs => least(3600, (30 * power(2, greatest(attempts - 1, 0)))::integer)),
      last_error = left(p_error, 2000)
  where id = p_job_id and state = 'processing';
end;
$$;

create or replace function public.claim_listing_image_cleanup_jobs(
  p_limit integer,
  p_seller_id uuid default null
)
returns table (cleanup_job_id uuid, cleanup_storage_key text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with eligible as (
    select jobs.id
    from public.listing_image_cleanup_jobs as jobs
    where jobs.state = 'pending'
      and jobs.attempts < 5
      and jobs.next_attempt_at <= timezone('utc', now())
      and (p_seller_id is null or jobs.seller_id = p_seller_id)
    order by jobs.next_attempt_at, jobs.created_at
    for update skip locked
    limit greatest(1, least(50, p_limit))
  ), claimed as (
    update public.listing_image_cleanup_jobs as jobs
    set state = 'processing',
        attempts = jobs.attempts + 1,
        claimed_at = timezone('utc', now())
    from eligible
    where jobs.id = eligible.id
    returning jobs.id, jobs.storage_key
  )
  select claimed.id, claimed.storage_key from claimed;
end;
$$;

revoke execute on function public.reserve_listing_image_deletion(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.reserve_listing_deletion(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.reserve_listing_upload_cleanup(uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.complete_listing_image_cleanup(uuid)
  from public, anon, authenticated;
revoke execute on function public.fail_listing_image_cleanup(uuid, text)
  from public, anon, authenticated;
revoke execute on function public.claim_listing_image_cleanup_jobs(integer, uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_listing_image_deletion(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.reserve_listing_deletion(uuid, uuid)
  to service_role;
grant execute on function public.reserve_listing_upload_cleanup(uuid, uuid, text)
  to service_role;
grant execute on function public.complete_listing_image_cleanup(uuid)
  to service_role;
grant execute on function public.fail_listing_image_cleanup(uuid, text)
  to service_role;
grant execute on function public.claim_listing_image_cleanup_jobs(integer, uuid)
  to service_role;

create or replace function public.publish_listing_with_image_policy(
  p_user_id uuid,
  p_listing_id uuid
)
returns table (listing_status text, image_required boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_listing public.listings%rowtype;
  requires_image boolean;
  image_count integer;
begin
  select * into owned_listing
  from public.listings
  where id = p_listing_id
  for update;

  if owned_listing.id is null or owned_listing.seller_id <> p_user_id then
    raise insufficient_privilege using message = 'The listing is not owned by the caller.';
  end if;
  if owned_listing.status <> 'draft' then
    raise check_violation using message = 'Only a draft listing can be published.';
  end if;

  select policy.images_required into requires_image
  from public.listing_image_policy as policy
  where policy.singleton;
  select count(*) into image_count
  from public.listing_images
  where listing_id = p_listing_id;

  if requires_image and image_count = 0 then
    return query select 'draft'::text, true;
    return;
  end if;

  update public.listings set status = 'active' where id = p_listing_id;
  return query select 'active'::text, false;
end;
$$;

revoke execute on function public.publish_listing_with_image_policy(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.publish_listing_with_image_policy(uuid, uuid)
  to service_role;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  if exists (
    select 1 from vault.decrypted_secrets where name = 'project_url'
  ) and exists (
    select 1 from vault.decrypted_secrets where name = 'service_role_key'
  ) then
    select jobid into existing_job_id
    from cron.job
    where jobname = 'listing-image-cleanup-retry';
    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'listing-image-cleanup-retry',
      '*/5 * * * *',
      $command$
        select net.http_post(
          url := (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'project_url'
          ) || '/functions/v1/listing-image-cleanup-retry',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (
              select decrypted_secret from vault.decrypted_secrets
              where name = 'service_role_key'
            )
          ),
          body := '{}'::jsonb
        );
      $command$
    );
  end if;
end;
$$;
