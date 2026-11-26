-- T3 only. PostgreSQL >= 15. Apply after catalog core, in one transaction.
-- No budget limits, no journal import, no snapshot updates.
-- Job, run and budget rows live in private so PostgREST does not expose them.
-- Budget windows are UTC half-open ranges. No default periods are inserted.

create schema private;

create function private.reject_sensitive_keys(payload jsonb) returns void
language plpgsql set search_path = '' as $$
declare secret_key text;
begin
  if payload is null or pg_catalog.jsonb_typeof(payload) <> 'object' then
    raise exception 'metadata_must_be_object' using errcode = '23514';
  end if;
  for secret_key in select pg_catalog.jsonb_object_keys(payload) loop
    if secret_key ~* '(token|secret|password|authorization|api[-_]?key|credential)' then
      raise exception 'sensitive_field_rejected' using errcode = '23514';
    end if;
  end loop;
end;
$$;

create function private.collection_job_transition_ok(from_status text, to_status text) returns boolean
language sql immutable set search_path = '' as $$
  select (from_status, to_status) in (
    ('queued', 'running'),
    ('queued', 'cancelled'),
    ('running', 'ingesting'),
    ('running', 'failed'),
    ('running', 'cancelled'),
    ('ingesting', 'running'),
    ('ingesting', 'succeeded'),
    ('ingesting', 'partial'),
    ('ingesting', 'failed'),
    ('ingesting', 'cancelled'),
    ('failed', 'queued')
  );
$$;

create table private.collection_jobs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  provider text not null check (provider in ('subimpact', 'aurelix', 'thewolves', 'aurelixplayreviews', 'datatrail', 'asokeyword')),
  collection_mode text not null check (collection_mode in ('details', 'search', 'charts', 'developers', 'reviews', 'keywords', 'negative')),
  scope jsonb not null,
  dedupe_key text not null check (length(btrim(dedupe_key)) between 1 and 200),
  scheduled_for timestamptz not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'ingesting', 'succeeded', 'partial', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default pg_catalog.now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_sanitized text check (error_sanitized is null or length(error_sanitized) <= 1000),
  constraint collection_jobs_scope_window unique (dedupe_key, scheduled_for),
  constraint collection_jobs_attempt_cap check (attempt_count <= max_attempts),
  constraint collection_jobs_lease check (
    (status in ('running', 'ingesting') and lease_token is not null and lease_expires_at is not null)
    or (status not in ('running', 'ingesting') and lease_token is null and lease_expires_at is null)
  ),
  constraint collection_jobs_terminal check (
    (status in ('succeeded', 'partial') and completed_at is not null and started_at is not null)
    or (status = 'cancelled' and completed_at is not null)
    or (status not in ('succeeded', 'partial', 'cancelled') and completed_at is null)
  ),
  constraint collection_jobs_times check (
    pg_catalog.isfinite(created_at) and pg_catalog.isfinite(updated_at)
    and pg_catalog.isfinite(scheduled_for) and pg_catalog.isfinite(next_attempt_at)
    and updated_at >= created_at
    and (started_at is null or (pg_catalog.isfinite(started_at) and started_at >= created_at))
    and (completed_at is null or (
      pg_catalog.isfinite(completed_at) and (started_at is null or completed_at >= started_at)
    ))
    and (lease_expires_at is null or pg_catalog.isfinite(lease_expires_at))
  )
);
create index collection_jobs_scheduled_idx on private.collection_jobs (scheduled_for) where status = 'queued';
create index collection_jobs_retry_idx on private.collection_jobs (status, next_attempt_at);
create index collection_jobs_lease_idx on private.collection_jobs (lease_expires_at) where lease_expires_at is not null;

create function private.collection_jobs_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.reject_sensitive_keys(new.scope);
  if tg_op = 'INSERT' then
    if new.status <> 'queued' or new.attempt_count <> 0 or new.lease_token is not null
       or new.started_at is not null or new.completed_at is not null then
      raise exception 'jobs_start_queued' using errcode = '23514';
    end if;
    return new;
  end if;

  if old.status in ('running', 'ingesting') then
    if new.lease_token is distinct from old.lease_token then
      if not (new.status = 'running' and old.lease_expires_at <= pg_catalog.clock_timestamp()) then
        raise exception 'lease_fence' using errcode = '42501';
      end if;
    elsif pg_catalog.current_setting('appradar.lease_token', true) is distinct from old.lease_token::text then
      raise exception 'lease_fence' using errcode = '42501';
    elsif old.lease_expires_at <= pg_catalog.clock_timestamp() then
      raise exception 'lease_expired' using errcode = '42501';
    end if;
  end if;

  if new.status is distinct from old.status
     and not private.collection_job_transition_ok(old.status, new.status) then
    raise exception 'invalid_job_transition' using errcode = '23514';
  end if;

  if old.status = 'queued' and new.status = 'running' then
    new.attempt_count := old.attempt_count + 1;
    new.started_at := coalesce(old.started_at, pg_catalog.clock_timestamp());
    if new.attempt_count > new.max_attempts then
      raise exception 'max_attempts_exceeded' using errcode = '23514';
    end if;
  end if;

  if new.status in ('succeeded', 'partial', 'cancelled') then
    new.started_at := coalesce(new.started_at, old.started_at);
    new.completed_at := coalesce(old.completed_at, pg_catalog.clock_timestamp());
    new.lease_token := null;
    new.lease_expires_at := null;
  elsif new.status = 'failed' then
    new.completed_at := null;
    new.lease_token := null;
    new.lease_expires_at := null;
  elsif new.status = 'queued' then
    new.completed_at := null;
    new.lease_token := null;
    new.lease_expires_at := null;
  end if;

  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

create trigger collection_jobs_guard before insert or update on private.collection_jobs
  for each row execute function private.collection_jobs_guard();

create table private.budget_periods (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  period_type text not null check (period_type in ('daily', 'monthly')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  limit_usd numeric(18,6) not null check (limit_usd >= 0 and limit_usd < 'Infinity'::numeric),
  reserved_usd numeric(18,6) not null default 0 check (reserved_usd >= 0 and reserved_usd < 'Infinity'::numeric),
  spent_usd numeric(18,6) not null default 0 check (spent_usd >= 0 and spent_usd < 'Infinity'::numeric),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint budget_periods_identity unique (period_type, period_start),
  constraint budget_periods_utc_start check (period_start = pg_catalog.date_trunc(
    case period_type when 'daily' then 'day' else 'month' end,
    period_start at time zone 'UTC') at time zone 'UTC'),
  constraint budget_periods_utc_end check (period_end = case period_type
    when 'daily' then period_start + interval '1 day'
    else period_start + interval '1 month' end),
  constraint budget_periods_times check (
    pg_catalog.isfinite(period_start) and pg_catalog.isfinite(period_end)
    and pg_catalog.isfinite(created_at) and pg_catalog.isfinite(updated_at)
    and updated_at >= created_at)
);
-- period_type then start is already unique. Overlap is rejected so a timestamp hits one row.

create function private.budget_periods_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from private.budget_periods existing
    where existing.period_type = new.period_type
      and existing.id <> new.id
      and existing.period_start < new.period_end
      and new.period_start < existing.period_end
  ) then
    raise exception 'budget_period_overlap' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := pg_catalog.clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger budget_periods_guard before insert or update on private.budget_periods
  for each row execute function private.budget_periods_guard();

create table private.provider_runs (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  job_id uuid not null references private.collection_jobs (id),
  attempt_number integer not null check (attempt_number > 0),
  provider text not null check (provider in ('subimpact', 'aurelix', 'thewolves', 'aurelixplayreviews', 'datatrail', 'asokeyword')),
  actor_id text not null check (length(btrim(actor_id)) between 1 and 100),
  actor_build_id text not null check (length(btrim(actor_build_id)) between 1 and 100),
  external_run_id text check (external_run_id ~ '^[A-Za-z0-9]+$'),
  dataset_id text check (dataset_id is null or length(btrim(dataset_id)) between 1 and 100),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  input_redacted jsonb not null default '{}'::jsonb,
  -- execution_status and validation_status are independent. unknown start is explicit.
  execution_status text not null default 'pending' check (execution_status in ('pending', 'unknown', 'running', 'succeeded', 'failed', 'aborted')),
  validation_status text not null default 'pending' check (validation_status in ('pending', 'accepted', 'rejected', 'truncated')),
  page_offset integer not null default 0 check (page_offset >= 0),
  expected_count integer check (expected_count is null or expected_count >= 0),
  received_count integer check (received_count is null or received_count >= 0),
  valid_count integer check (valid_count is null or valid_count >= 0),
  invalid_count integer check (invalid_count is null or invalid_count >= 0),
  truncated boolean not null default false,
  estimated_cost numeric(18,6) check (estimated_cost is null or (estimated_cost >= 0 and estimated_cost < 'Infinity'::numeric)),
  reserved_cost numeric(18,6) check (reserved_cost is null or (reserved_cost >= 0 and reserved_cost < 'Infinity'::numeric)),
  reported_cost numeric(18,6) check (reported_cost is null or (reported_cost >= 0 and reported_cost < 'Infinity'::numeric)),
  settled_cost numeric(18,6) check (settled_cost is null or (settled_cost >= 0 and settled_cost < 'Infinity'::numeric)),
  cost_status text not null default 'unset' check (cost_status in ('unset', 'reserved', 'unknown', 'settled', 'released')),
  charged_events jsonb not null default '{}'::jsonb,
  daily_budget_period_id uuid references private.budget_periods (id),
  monthly_budget_period_id uuid references private.budget_periods (id),
  reserved_at timestamptz,
  error_sanitized text check (error_sanitized is null or length(error_sanitized) <= 1000),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  started_at timestamptz,
  finished_at timestamptz,
  -- Default UNIQUE is NULLS DISTINCT: many pending runs may omit external_run_id.
  constraint provider_runs_external_identity unique (provider, external_run_id),
  constraint provider_runs_job_attempt unique (job_id, attempt_number),
  constraint provider_runs_truncation check (not truncated or validation_status <> 'accepted'),
  constraint provider_runs_cost_link check (
    (cost_status = 'unset' and reserved_cost is null and settled_cost is null and reserved_at is null
      and daily_budget_period_id is null and monthly_budget_period_id is null)
    or (cost_status in ('reserved', 'unknown', 'released') and reserved_cost is not null and settled_cost is null
      and reserved_at is not null and daily_budget_period_id is not null and monthly_budget_period_id is not null)
    or (cost_status = 'settled' and reserved_cost is not null and settled_cost is not null
      and reserved_at is not null and daily_budget_period_id is not null and monthly_budget_period_id is not null)
  ),
  constraint provider_runs_times check (
    pg_catalog.isfinite(created_at) and pg_catalog.isfinite(updated_at) and updated_at >= created_at
    and (started_at is null or (pg_catalog.isfinite(started_at) and started_at >= created_at))
    and (finished_at is null or (pg_catalog.isfinite(finished_at) and finished_at >= created_at))
    and (reserved_at is null or pg_catalog.isfinite(reserved_at))
  )
);
create index provider_runs_execution_idx on private.provider_runs (execution_status);

create function private.provider_runs_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform private.reject_sensitive_keys(new.input_redacted);
  perform private.reject_sensitive_keys(new.charged_events);
  if tg_op = 'INSERT' and exists (
    select 1 from private.provider_runs existing
    where existing.job_id = new.job_id and existing.execution_status = 'unknown'
  ) then
    raise exception 'unknown_start_blocks_new_run' using errcode = 'P0005';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := pg_catalog.clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger provider_runs_guard before insert or update on private.provider_runs
  for each row execute function private.provider_runs_guard();

create function private.claim_collection_job(p_lease_seconds integer) returns uuid
language plpgsql set search_path = '' as $$
declare claimed uuid;
begin
  if p_lease_seconds is null or p_lease_seconds < 1 or p_lease_seconds > 3600 then
    raise exception 'invalid_lease_seconds' using errcode = '23514';
  end if;
  update private.collection_jobs as job
  set status = 'running',
      lease_token = pg_catalog.gen_random_uuid(),
      lease_expires_at = pg_catalog.clock_timestamp() + make_interval(secs => p_lease_seconds)
  where job.id = (
    select candidate.id from private.collection_jobs as candidate
    where not exists (
      select 1 from private.provider_runs as run
      where run.job_id = candidate.id and run.execution_status = 'unknown'
    ) and ((
      candidate.status = 'queued'
      and candidate.next_attempt_at <= pg_catalog.clock_timestamp()
      and candidate.scheduled_for <= pg_catalog.clock_timestamp()
      and candidate.attempt_count < candidate.max_attempts
    ) or (
      candidate.status in ('running', 'ingesting')
      and candidate.lease_expires_at <= pg_catalog.clock_timestamp()
    ))
    order by candidate.scheduled_for, candidate.next_attempt_at, candidate.created_at
    for update skip locked
    limit 1
  )
  returning job.id into claimed;
  return claimed;
end;
$$;

create function private.transition_collection_job(p_job_id uuid, p_lease_token uuid, p_status text, p_error text default null) returns void
language plpgsql set search_path = '' as $$
declare updated_rows integer;
begin
  perform pg_catalog.set_config('appradar.lease_token', p_lease_token::text, true);
  update private.collection_jobs
  set status = p_status, error_sanitized = p_error
  where id = p_job_id;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 1 then
    raise exception 'job_not_found' using errcode = 'P0001';
  end if;
end;
$$;

create function private.retry_collection_job(p_job_id uuid, p_next_attempt_at timestamptz) returns void
language plpgsql set search_path = '' as $$
declare updated_rows integer;
begin
  if p_next_attempt_at is null or not pg_catalog.isfinite(p_next_attempt_at) then
    raise exception 'invalid_next_attempt' using errcode = '23514';
  end if;
  update private.collection_jobs
  set status = 'queued', next_attempt_at = p_next_attempt_at, error_sanitized = null
  where id = p_job_id and status = 'failed' and attempt_count < max_attempts;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 1 then
    raise exception 'retry_not_allowed' using errcode = '23514';
  end if;
end;
$$;

create function private.reserve_provider_run_budget(p_run_id uuid, p_amount numeric) returns void
language plpgsql set search_path = '' as $$
declare
  v_run private.provider_runs%rowtype;
  v_daily private.budget_periods%rowtype;
  v_monthly private.budget_periods%rowtype;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_amount is null or p_amount < 0 or p_amount >= 'Infinity'::numeric then
    raise exception 'invalid_reservation_amount' using errcode = '23514';
  end if;
  select * into v_run from private.provider_runs where id = p_run_id for update;
  if not found then
    raise exception 'provider_run_not_found' using errcode = 'P0001';
  end if;
  if v_run.cost_status = 'reserved' and v_run.reserved_cost = p_amount then
    return;
  end if;
  if v_run.cost_status <> 'unset' or v_run.execution_status = 'unknown' then
    raise exception 'reservation_not_allowed' using errcode = '23514';
  end if;

  select * into v_daily from private.budget_periods
  where period_type = 'daily' and period_start <= v_now and v_now < period_end
  order by period_start limit 1 for update;
  if not found then
    raise exception 'budget_not_configured' using errcode = 'P0004';
  end if;
  select * into v_monthly from private.budget_periods
  where period_type = 'monthly' and period_start <= v_now and v_now < period_end
  order by period_start limit 1 for update;
  if not found then
    raise exception 'budget_not_configured' using errcode = 'P0004';
  end if;
  if v_daily.reserved_usd + v_daily.spent_usd + p_amount > v_daily.limit_usd then
    raise exception 'daily_budget_exceeded' using errcode = 'P0001';
  end if;
  if v_monthly.reserved_usd + v_monthly.spent_usd + p_amount > v_monthly.limit_usd then
    raise exception 'monthly_budget_exceeded' using errcode = 'P0002';
  end if;

  update private.budget_periods
  set reserved_usd = reserved_usd + p_amount
  where id = v_daily.id;
  update private.budget_periods
  set reserved_usd = reserved_usd + p_amount
  where id = v_monthly.id;
  update private.provider_runs
  set cost_status = 'reserved', reserved_cost = p_amount, reserved_at = v_now,
      daily_budget_period_id = v_daily.id, monthly_budget_period_id = v_monthly.id
  where id = p_run_id;
end;
$$;

create function private.settle_provider_run_cost(p_run_id uuid, p_actual numeric) returns void
language plpgsql set search_path = '' as $$
declare v_run private.provider_runs%rowtype;
begin
  if p_actual is null or p_actual < 0 or p_actual >= 'Infinity'::numeric then
    raise exception 'invalid_actual_cost' using errcode = '23514';
  end if;
  select * into v_run from private.provider_runs where id = p_run_id for update;
  if not found then
    raise exception 'provider_run_not_found' using errcode = 'P0001';
  end if;
  if v_run.cost_status = 'settled' and v_run.settled_cost = p_actual then
    return;
  end if;
  if v_run.cost_status = 'unknown' or v_run.execution_status = 'unknown' then
    raise exception 'unknown_cost_reservation_held' using errcode = 'P0003';
  end if;
  if v_run.cost_status <> 'reserved' then
    raise exception 'settlement_not_allowed' using errcode = '23514';
  end if;

  perform 1 from private.budget_periods where id = v_run.daily_budget_period_id for update;
  perform 1 from private.budget_periods where id = v_run.monthly_budget_period_id for update;
  update private.budget_periods
  set reserved_usd = reserved_usd - v_run.reserved_cost, spent_usd = spent_usd + p_actual
  where id in (v_run.daily_budget_period_id, v_run.monthly_budget_period_id);
  update private.provider_runs
  set cost_status = 'settled', settled_cost = p_actual, reported_cost = p_actual
  where id = p_run_id;
end;
$$;

create function private.release_provider_run_reservation(p_run_id uuid) returns void
language plpgsql set search_path = '' as $$
declare v_run private.provider_runs%rowtype;
begin
  select * into v_run from private.provider_runs where id = p_run_id for update;
  if not found then
    raise exception 'provider_run_not_found' using errcode = 'P0001';
  end if;
  if v_run.cost_status = 'released' then
    return;
  end if;
  if v_run.cost_status = 'unknown' or v_run.execution_status = 'unknown' then
    raise exception 'unknown_cost_reservation_held' using errcode = 'P0003';
  end if;
  if v_run.cost_status <> 'reserved' then
    raise exception 'release_not_allowed' using errcode = '23514';
  end if;

  perform 1 from private.budget_periods where id = v_run.daily_budget_period_id for update;
  perform 1 from private.budget_periods where id = v_run.monthly_budget_period_id for update;
  update private.budget_periods
  set reserved_usd = reserved_usd - v_run.reserved_cost
  where id in (v_run.daily_budget_period_id, v_run.monthly_budget_period_id);
  update private.provider_runs
  set cost_status = 'released'
  where id = p_run_id;
end;
$$;

create function private.mark_provider_run_start_unknown(p_run_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  update private.provider_runs
  set execution_status = 'unknown'
  where id = p_run_id and execution_status in ('pending', 'running');
  if not found then
    raise exception 'unknown_start_not_allowed' using errcode = '23514';
  end if;
end;
$$;

create function private.mark_provider_run_cost_unknown(p_run_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  update private.provider_runs
  set cost_status = 'unknown'
  where id = p_run_id and cost_status = 'reserved';
  if not found then
    raise exception 'unknown_cost_not_allowed' using errcode = '23514';
  end if;
end;
$$;

-- Clean databases have no snapshots. Do not invent historical runs.
do $$
begin
  if exists (
    select 1 from public.app_snapshots as snapshot
    where not exists (
      select 1 from private.provider_runs as run
      where run.provider = snapshot.source and run.external_run_id = snapshot.source_run_id
    )
  ) then
    raise exception 'T3_BLOCKED: snapshots exist without provider_runs; refusing invented backfill'
      using errcode = '23503';
  end if;
end;
$$;

alter table public.app_snapshots
  add constraint app_snapshots_provider_run_fk
  foreign key (source, source_run_id)
  references private.provider_runs (provider, external_run_id);

alter table private.collection_jobs enable row level security;
alter table private.provider_runs enable row level security;
alter table private.budget_periods enable row level security;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
revoke all on private.collection_jobs, private.provider_runs, private.budget_periods from public, anon, authenticated, service_role;
grant select, insert, update, delete on private.collection_jobs, private.provider_runs, private.budget_periods to service_role;

revoke all on function
  private.reject_sensitive_keys(jsonb),
  private.collection_job_transition_ok(text, text),
  private.collection_jobs_guard(),
  private.budget_periods_guard(),
  private.provider_runs_guard(),
  private.claim_collection_job(integer),
  private.transition_collection_job(uuid, uuid, text, text),
  private.retry_collection_job(uuid, timestamptz),
  private.reserve_provider_run_budget(uuid, numeric),
  private.settle_provider_run_cost(uuid, numeric),
  private.release_provider_run_reservation(uuid),
  private.mark_provider_run_start_unknown(uuid),
  private.mark_provider_run_cost_unknown(uuid)
from public, anon, authenticated, service_role;
grant execute on function
  private.claim_collection_job(integer),
  private.transition_collection_job(uuid, uuid, text, text),
  private.retry_collection_job(uuid, timestamptz),
  private.reserve_provider_run_budget(uuid, numeric),
  private.settle_provider_run_cost(uuid, numeric),
  private.release_provider_run_reservation(uuid),
  private.mark_provider_run_start_unknown(uuid),
  private.mark_provider_run_cost_unknown(uuid)
to service_role;
