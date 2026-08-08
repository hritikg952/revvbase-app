alter table public.listing_image_cleanup_jobs
  drop constraint listing_image_cleanup_jobs_state_check,
  add column next_attempt_at timestamptz not null default timezone('utc', now()),
  add column claimed_at timestamptz,
  add constraint listing_image_cleanup_jobs_state_check check (
    state in ('pending', 'processing', 'completed', 'cancelled', 'dead')
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
  where storage_key = new.storage_key and state in ('pending', 'processing');
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
        when attempts + case when state = 'pending' then 1 else 0 end >= 5
          then 'dead'
        else 'pending'
      end,
      attempts = attempts + case when state = 'pending' then 1 else 0 end,
      claimed_at = null,
      next_attempt_at = timezone('utc', now()) +
        make_interval(secs => least(3600, (30 * power(
          2,
          greatest(attempts + case when state = 'pending' then 1 else 0 end - 1, 0)
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
    set state = 'processing', attempts = jobs.attempts + 1,
        claimed_at = timezone('utc', now())
    from eligible
    where jobs.id = eligible.id
    returning jobs.id, jobs.storage_key
  )
  select claimed.id, claimed.storage_key from claimed;
end;
$$;

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
