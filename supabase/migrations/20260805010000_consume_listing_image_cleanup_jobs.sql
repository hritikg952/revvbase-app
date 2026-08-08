alter table public.listing_image_cleanup_jobs
  drop constraint listing_image_cleanup_jobs_state_check,
  add column next_attempt_at timestamptz not null default timezone('utc', now()),
  add column claimed_at timestamptz,
  add constraint listing_image_cleanup_jobs_state_check check (
    state in ('reserved', 'pending', 'processing', 'completed', 'cancelled', 'dead')
  );

create or replace function public.cancel_listing_image_cleanup_on_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.listing_image_cleanup_jobs
  set state = 'cancelled', claimed_at = null,
      completed_at = timezone('utc', now()), last_error = null
  where storage_key = new.storage_key and state in ('reserved', 'pending', 'processing');
  return new;
end;
$$;

revoke execute on function public.cancel_listing_image_cleanup_on_registration()
  from public, anon, authenticated;

create trigger listing_images_cancel_cleanup_intent
after insert on public.listing_images
for each row execute function public.cancel_listing_image_cleanup_on_registration();

create or replace function public.complete_listing_image_cleanup(p_job_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.listing_image_cleanup_jobs
  set state = 'completed', completed_at = timezone('utc', now()),
      claimed_at = null, last_error = null
  where id = p_job_id and state in ('pending', 'processing');
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
  set state = case
        when attempts >= 5
          then 'dead'
        else 'pending'
      end,
      attempts = attempts,
      claimed_at = null,
      next_attempt_at = timezone('utc', now()) +
        make_interval(secs => least(3600, (30 * power(
          2,
          greatest(attempts - 1, 0)
        ))::integer)),
      last_error = left(p_error, 2000)
  where id = p_job_id and state in ('pending', 'processing');
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
  with expired_attempts as (
    update public.listing_image_cleanup_jobs as jobs
    set state = 'dead', claimed_at = null,
        completed_at = timezone('utc', now()),
        last_error = coalesce(jobs.last_error, 'Cleanup lease expired after maximum attempts.')
    where jobs.state = 'processing'
      and jobs.claimed_at <= timezone('utc', now()) - interval '5 minutes'
      and jobs.attempts >= 5
  ), eligible as (
    select jobs.id
    from public.listing_image_cleanup_jobs as jobs
    where jobs.attempts < 5
      and (
        (jobs.state = 'pending' and jobs.next_attempt_at <= timezone('utc', now()))
        or (jobs.state = 'processing' and jobs.claimed_at <= timezone('utc', now()) - interval '5 minutes')
        or (jobs.state = 'reserved' and jobs.created_at <= timezone('utc', now()) - interval '5 minutes')
      )
      and (p_seller_id is null or jobs.seller_id = p_seller_id)
    order by jobs.next_attempt_at, jobs.created_at
    for update skip locked
    limit greatest(1, least(50, p_limit))
  ), claimed as (
    update public.listing_image_cleanup_jobs as jobs
    set state = 'processing', attempts = jobs.attempts + 1,
        claimed_at = timezone('utc', now())
    from eligible
    where jobs.id = eligible.id
    returning jobs.id, jobs.storage_key
  )
  select claimed.id, claimed.storage_key from claimed;
end;
$$;

create or replace function public.reserve_listing_upload_cleanup(
  p_user_id uuid,
  p_listing_id uuid,
  p_storage_key text,
  p_activate boolean default false
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
  select * into owned_listing from public.listings where id = p_listing_id for update;
  if owned_listing.id is null or owned_listing.seller_id <> p_user_id
    or owned_listing.status not in ('draft', 'active') then
    raise insufficient_privilege using message = 'The listing is not owned by the caller.';
  end if;
  if split_part(p_storage_key, '/', 1) <> p_user_id::text
    or split_part(p_storage_key, '/', 2) <> p_listing_id::text
    or p_storage_key !~ ('^' || p_user_id::text || '/' || p_listing_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]webp$') then
    raise insufficient_privilege using message = 'The photo key does not belong to this listing.';
  end if;
  if exists (select 1 from public.listing_images where listing_id = p_listing_id and storage_key = p_storage_key) then
    raise check_violation using message = 'A registered photo must use the normal delete action.';
  end if;
  insert into public.listing_image_cleanup_jobs (seller_id, listing_id, storage_key, state)
  values (p_user_id, p_listing_id, p_storage_key, case when p_activate then 'pending' else 'reserved' end)
  on conflict (storage_key) do update
    set state = case
      when p_activate and public.listing_image_cleanup_jobs.state = 'reserved' then 'pending'
      else public.listing_image_cleanup_jobs.state
    end,
    claimed_at = null,
    completed_at = case when p_activate then null else public.listing_image_cleanup_jobs.completed_at end
  returning id into job_id;
  return query select owned_listing.status, job_id, p_storage_key;
end;
$$;

revoke execute on function public.reserve_listing_upload_cleanup(uuid, uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.reserve_listing_upload_cleanup(uuid, uuid, text, boolean)
  to service_role;

revoke execute on function public.claim_listing_image_cleanup_jobs(integer, uuid)
  from public, anon, authenticated;
grant execute on function public.claim_listing_image_cleanup_jobs(integer, uuid)
  to service_role;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

do $$
declare
  existing_job_id bigint;
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'service_role_key') then
    raise exception 'listing-image-cleanup-retry requires Vault secrets project_url and service_role_key; provision them securely then rerun this migration.';
  end if;
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
end;
$$;
