-- Collection bridge. Apply after 20261126000600, in one transaction.
-- Does not change previously applied migrations.
--
-- 1) service_role can execute the private trigger helpers and the trigger functions those
--    statements invoke. anon and authenticated stay revoked.
-- 2) public wrappers are SECURITY INVOKER, search_path is empty, and only service_role may
--    execute them. Job mutations require a live lease. Recording an already paid run id,
--    marking that start unknown, settlement and the unsettled list are not lease-fenced:
--    they cannot open a new paid start or release a reservation.
-- Budget arithmetic stays in the T3 functions.

grant execute on function
  private.reject_sensitive_keys(jsonb),
  private.collection_job_transition_ok(text, text),
  private.collection_jobs_guard(),
  private.budget_periods_guard(),
  private.provider_runs_guard()
to service_role;

create function private.require_lease(p_job_id uuid, p_lease_token uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from private.collection_jobs
  where id = p_job_id and lease_token = p_lease_token and status in ('running', 'ingesting')
    and lease_expires_at > pg_catalog.clock_timestamp()
  for update;
  if not found then
    raise exception 'lease_lost' using errcode = '42501';
  end if;
end;
$$;

create function private.require_job_run(p_job_id uuid, p_run_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  perform 1 from private.provider_runs where id = p_run_id and job_id = p_job_id for update;
  if not found then
    raise exception 'provider_run_not_found' using errcode = 'P0001';
  end if;
end;
$$;

create function private.run_json(r private.provider_runs) returns jsonb
language sql stable set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'id', r.id, 'attempt', r.attempt_number, 'actorBuildId', r.actor_build_id, 'inputHash', r.input_hash,
    'externalRunId', r.external_run_id, 'datasetId', r.dataset_id, 'executionStatus', r.execution_status,
    'validationStatus', r.validation_status, 'costStatus', r.cost_status,
    'startRequested', r.started_at is not null);
$$;

-- A target with a live job or an unresolved start is not enqueued again, whatever the window.
create function public.appradar_collection_enqueue(
  p_provider text, p_mode text, p_scope jsonb, p_dedupe_key text, p_scheduled_for timestamptz, p_max_attempts integer
) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_dedupe_key, 0));
  select id into v_id from private.collection_jobs
  where dedupe_key = p_dedupe_key and scheduled_for = p_scheduled_for;
  if found then
    return pg_catalog.jsonb_build_object('jobId', v_id, 'created', false, 'reason', 'window_exists');
  end if;
  select job.id into v_id from private.collection_jobs as job
  where job.dedupe_key = p_dedupe_key and (
    job.status in ('queued', 'running', 'ingesting')
    or exists (select 1 from private.provider_runs as run where run.job_id = job.id and (
      run.execution_status = 'unknown' or (run.execution_status = 'running' and run.external_run_id is not null))))
  limit 1;
  if found then
    return pg_catalog.jsonb_build_object('jobId', v_id, 'created', false, 'reason', 'target_busy_or_unresolved');
  end if;
  insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for, max_attempts)
  values (p_provider, p_mode, p_scope, p_dedupe_key, p_scheduled_for, p_max_attempts)
  returning id into v_id;
  return pg_catalog.jsonb_build_object('jobId', v_id, 'created', true, 'reason', null);
end;
$$;

create function public.appradar_collection_claim(p_lease_seconds integer) returns jsonb
language plpgsql set search_path = '' as $$
declare v_id uuid; j private.collection_jobs%rowtype; r private.provider_runs%rowtype; v_run jsonb;
begin
  v_id := private.claim_collection_job(p_lease_seconds);
  if v_id is null then
    return 'null'::jsonb;
  end if;
  select * into j from private.collection_jobs where id = v_id;
  select * into r from private.provider_runs where job_id = v_id and attempt_number = j.attempt_count;
  if found then v_run := private.run_json(r); end if;
  return pg_catalog.jsonb_build_object('leaseToken', j.lease_token, 'run', v_run, 'job', pg_catalog.jsonb_build_object(
    'id', j.id, 'provider', j.provider, 'mode', j.collection_mode, 'scope', j.scope,
    'attempt', j.attempt_count, 'maxAttempts', j.max_attempts, 'scheduledFor', j.scheduled_for));
end;
$$;

-- Heartbeat. A short value defers the job: it becomes claimable again without using an attempt.
create function public.appradar_collection_renew(p_job_id uuid, p_lease_token uuid, p_lease_seconds integer) returns boolean
language plpgsql set search_path = '' as $$
begin
  if p_lease_seconds is null or p_lease_seconds < 1 or p_lease_seconds > 3600 then
    raise exception 'invalid_lease_seconds' using errcode = '23514';
  end if;
  perform private.require_lease(p_job_id, p_lease_token);
  perform pg_catalog.set_config('appradar.lease_token', p_lease_token::text, true);
  update private.collection_jobs
  set lease_expires_at = pg_catalog.clock_timestamp() + make_interval(secs => p_lease_seconds)
  where id = p_job_id;
  return true;
end;
$$;

-- Finishes the job and, when a retry time is given and attempts remain, requeues it in the same transaction.
create function public.appradar_collection_finish(
  p_job_id uuid, p_lease_token uuid, p_status text, p_error text, p_retry_at timestamptz
) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform private.require_lease(p_job_id, p_lease_token);
  perform private.transition_collection_job(p_job_id, p_lease_token, p_status, p_error);
  if p_status = 'failed' and p_retry_at is not null and exists (
    select 1 from private.collection_jobs where id = p_job_id and attempt_count < max_attempts
  ) then
    perform private.retry_collection_job(p_job_id, p_retry_at);
    return true;
  end if;
  return false;
end;
$$;

create function public.appradar_collection_ingesting(p_job_id uuid, p_lease_token uuid) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform private.require_lease(p_job_id, p_lease_token);
  perform private.transition_collection_job(p_job_id, p_lease_token, 'ingesting', null);
  return true;
end;
$$;

create function public.appradar_collection_create_run(p_job_id uuid, p_lease_token uuid, p_run jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare j private.collection_jobs%rowtype; r private.provider_runs%rowtype;
begin
  perform private.require_lease(p_job_id, p_lease_token);
  select * into j from private.collection_jobs where id = p_job_id;
  select * into r from private.provider_runs where job_id = p_job_id and attempt_number = j.attempt_count;
  if not found then
    insert into private.provider_runs
      (job_id, attempt_number, provider, actor_id, actor_build_id, input_hash, input_redacted, estimated_cost)
    values (p_job_id, j.attempt_count, j.provider, p_run->>'actorId', p_run->>'actorBuildId', p_run->>'inputHash',
      p_run->'input', (p_run->>'estimatedCost')::numeric)
    returning * into r;
  end if;
  return private.run_json(r);
end;
$$;

create function public.appradar_collection_reserve(p_job_id uuid, p_lease_token uuid, p_run_id uuid, p_amount numeric) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform private.require_lease(p_job_id, p_lease_token);
  perform private.require_job_run(p_job_id, p_run_id);
  perform private.reserve_provider_run_budget(p_run_id, p_amount);
  return true;
end;
$$;

-- One-time ticket, committed before the paid POST. started_at set without external_run_id means "maybe running".
create function public.appradar_collection_begin_start(p_job_id uuid, p_lease_token uuid, p_run_id uuid) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform private.require_lease(p_job_id, p_lease_token);
  update private.provider_runs set started_at = pg_catalog.clock_timestamp()
  where id = p_run_id and job_id = p_job_id and started_at is null and external_run_id is null
    and execution_status = 'pending' and cost_status = 'reserved';
  return found;
end;
$$;

-- Not lease fenced on purpose: the identity of an already paid run must never be lost.
create function public.appradar_collection_record_external(p_run_id uuid, p_external_run_id text, p_dataset_id text) returns boolean
language plpgsql set search_path = '' as $$
begin
  update private.provider_runs
  set external_run_id = p_external_run_id, dataset_id = p_dataset_id, execution_status = 'running'
  where id = p_run_id and started_at is not null and (external_run_id is null or external_run_id = p_external_run_id)
    and execution_status in ('pending', 'unknown', 'running');
  if not found then
    raise exception 'external_run_not_recorded' using errcode = '23514';
  end if;
  return true;
end;
$$;

-- Not lease fenced: marking can only block further spending.
create function public.appradar_collection_start_unknown(p_run_id uuid) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform 1 from private.provider_runs
  where id = p_run_id and external_run_id is null and execution_status = 'pending' and started_at is not null
  for update;
  if not found then
    return false;
  end if;
  perform private.mark_provider_run_start_unknown(p_run_id);
  return true;
end;
$$;

create function public.appradar_collection_update_run(p_job_id uuid, p_lease_token uuid, p_run_id uuid, p_patch jsonb) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform private.require_lease(p_job_id, p_lease_token);
  if p_patch->>'executionStatus' in ('pending', 'unknown') then
    raise exception 'execution_status_not_patchable' using errcode = '23514';
  end if;
  update private.provider_runs set
    execution_status = coalesce(p_patch->>'executionStatus', execution_status),
    validation_status = coalesce(p_patch->>'validationStatus', validation_status),
    dataset_id = coalesce(p_patch->>'datasetId', dataset_id),
    finished_at = greatest(coalesce((p_patch->>'finishedAt')::timestamptz, finished_at), case when p_patch ? 'finishedAt' then created_at end),
    page_offset = coalesce((p_patch->>'pageOffset')::integer, page_offset),
    expected_count = coalesce((p_patch->>'expectedCount')::integer, expected_count),
    received_count = coalesce((p_patch->>'receivedCount')::integer, received_count),
    valid_count = coalesce((p_patch->>'validCount')::integer, valid_count),
    invalid_count = coalesce((p_patch->>'invalidCount')::integer, invalid_count),
    truncated = coalesce((p_patch->>'truncated')::boolean, truncated),
    error_sanitized = coalesce(p_patch->>'error', error_sanitized)
  where id = p_run_id and job_id = p_job_id and execution_status <> 'unknown';
  if not found then
    raise exception 'run_update_not_allowed' using errcode = '23514';
  end if;
  return true;
end;
$$;

-- Only for a reservation whose paid POST was never requested.
create function public.appradar_collection_release(p_job_id uuid, p_lease_token uuid, p_run_id uuid) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform private.require_lease(p_job_id, p_lease_token);
  perform 1 from private.provider_runs
  where id = p_run_id and job_id = p_job_id and cost_status = 'reserved' and started_at is null and external_run_id is null
  for update;
  if not found then
    return false;
  end if;
  perform private.release_provider_run_reservation(p_run_id);
  return true;
end;
$$;

-- Settlement follows provider truth and is idempotent, so it needs no lease.
create function public.appradar_collection_settle(
  p_run_id uuid, p_execution_status text, p_actual numeric, p_charged_events jsonb
) returns boolean
language plpgsql set search_path = '' as $$
begin
  if p_execution_status not in ('succeeded', 'failed', 'aborted') then
    raise exception 'settlement_requires_terminal_run' using errcode = '23514';
  end if;
  update private.provider_runs
  set execution_status = case when execution_status = 'running' then p_execution_status else execution_status end,
      charged_events = coalesce(p_charged_events, charged_events)
  where id = p_run_id and external_run_id is not null and execution_status <> 'unknown';
  if not found then
    raise exception 'settlement_not_allowed' using errcode = '23514';
  end if;
  perform private.settle_provider_run_cost(p_run_id, p_actual);
  return true;
end;
$$;

-- Finished runs awaiting a cost, plus running runs whose job no longer drives them.
create function public.appradar_collection_unsettled(p_limit integer) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(pg_catalog.jsonb_agg(item.value), '[]'::jsonb) from (
    select pg_catalog.jsonb_build_object('runId', run.id, 'externalRunId', run.external_run_id, 'scope', job.scope) as value
    from private.provider_runs as run join private.collection_jobs as job on job.id = run.job_id
    where run.cost_status = 'reserved' and run.external_run_id is not null and (
      run.execution_status in ('succeeded', 'failed', 'aborted')
      or (run.execution_status = 'running' and job.status not in ('running', 'ingesting')))
    order by run.created_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
  ) as item;
$$;

-- Creates the current UTC day and month only. An existing row is not raised and is not
-- replaced. A stored limit above the configured limit refuses the call.
create function public.appradar_collection_ensure_budgets(p_daily numeric, p_monthly numeric) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  v_day timestamptz;
  v_month timestamptz;
  v_daily_id uuid;
  v_monthly_id uuid;
  v_daily_limit numeric;
  v_monthly_limit numeric;
  v_daily_created boolean := false;
  v_monthly_created boolean := false;
begin
  if p_daily is null or p_monthly is null or p_daily < 0 or p_monthly < 0
     or p_daily >= 'Infinity'::numeric or p_monthly >= 'Infinity'::numeric then
    raise exception 'budget_not_configured' using errcode = 'P0004';
  end if;
  v_day := pg_catalog.date_trunc('day', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC';
  v_month := pg_catalog.date_trunc('month', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC';

  -- The overlap trigger rejects a second insert of the same window before ON CONFLICT can apply.
  select id, limit_usd into v_daily_id, v_daily_limit from private.budget_periods
  where period_type = 'daily' and period_start = v_day for update;
  if not found then
    begin
      insert into private.budget_periods (period_type, period_start, period_end, limit_usd)
      values ('daily', v_day, v_day + interval '1 day', p_daily)
      returning id, limit_usd into v_daily_id, v_daily_limit;
      v_daily_created := true;
    exception
      when unique_violation then null;
      when check_violation then
        if sqlerrm is distinct from 'budget_period_overlap' then raise; end if;
    end;
    if not v_daily_created then
      select id, limit_usd into v_daily_id, v_daily_limit from private.budget_periods
      where period_type = 'daily' and period_start = v_day for update;
    end if;
  end if;
  if v_daily_id is null or v_daily_limit > p_daily then
    raise exception 'budget_limit_exceeds_configuration' using errcode = 'P0004';
  end if;

  select id, limit_usd into v_monthly_id, v_monthly_limit from private.budget_periods
  where period_type = 'monthly' and period_start = v_month for update;
  if not found then
    begin
      insert into private.budget_periods (period_type, period_start, period_end, limit_usd)
      values ('monthly', v_month, v_month + interval '1 month', p_monthly)
      returning id, limit_usd into v_monthly_id, v_monthly_limit;
      v_monthly_created := true;
    exception
      when unique_violation then null;
      when check_violation then
        if sqlerrm is distinct from 'budget_period_overlap' then raise; end if;
    end;
    if not v_monthly_created then
      select id, limit_usd into v_monthly_id, v_monthly_limit from private.budget_periods
      where period_type = 'monthly' and period_start = v_month for update;
    end if;
  end if;
  if v_monthly_id is null or v_monthly_limit > p_monthly then
    raise exception 'budget_limit_exceeds_configuration' using errcode = 'P0004';
  end if;

  return pg_catalog.jsonb_build_object(
    'dailyId', v_daily_id, 'monthlyId', v_monthly_id,
    'createdDaily', v_daily_created, 'createdMonthly', v_monthly_created);
end;
$$;

-- Operator evidence only. confirm_absent is the sole release, and only for a start that
-- still has no external id. Nothing here inserts a retry or a new paid run.
create function public.appradar_collection_reconcile(
  p_run_id uuid, p_decision text, p_evidence text, p_external_run_id text default null, p_actual numeric default null
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_run private.provider_runs%rowtype;
begin
  if p_decision not in ('confirm_absent', 'attach_run', 'confirm_cost') then
    raise exception 'reconciliation_decision_rejected' using errcode = '23514';
  end if;
  if p_evidence is null or length(btrim(p_evidence)) < 12 or length(p_evidence) > 500
     or p_evidence ~* '(token|secret|password|authorization|api[-_]?key|credential)' then
    raise exception 'reconciliation_evidence_required' using errcode = '23514';
  end if;
  select * into v_run from private.provider_runs where id = p_run_id for update;
  if not found then
    raise exception 'provider_run_not_found' using errcode = 'P0001';
  end if;

  if p_decision = 'confirm_absent' then
    if p_external_run_id is not null or p_actual is not null
       or v_run.execution_status <> 'unknown' or v_run.external_run_id is not null
       or v_run.started_at is null or v_run.cost_status <> 'reserved' then
      raise exception 'reconciliation_not_allowed' using errcode = '23514';
    end if;
    update private.provider_runs
    set execution_status = 'aborted', validation_status = 'rejected', error_sanitized = 'reconciled_absent'
    where id = p_run_id;
    perform private.release_provider_run_reservation(p_run_id);
    return pg_catalog.jsonb_build_object('decision', p_decision, 'released', true, 'retried', false);
  end if;

  if p_decision = 'attach_run' then
    if p_actual is not null or p_external_run_id is null or p_external_run_id !~ '^[A-Za-z0-9]+$'
       or v_run.external_run_id is not null or v_run.started_at is null
       or v_run.execution_status <> 'unknown' or v_run.cost_status <> 'reserved' then
      raise exception 'reconciliation_not_allowed' using errcode = '23514';
    end if;
    update private.provider_runs
    set external_run_id = p_external_run_id, execution_status = 'running', error_sanitized = 'reconciled_attached'
    where id = p_run_id;
    return pg_catalog.jsonb_build_object('decision', p_decision, 'released', false, 'retried', false);
  end if;

  if p_external_run_id is not null or p_actual is null or p_actual < 0 or p_actual >= 'Infinity'::numeric
     or v_run.external_run_id is null or v_run.execution_status not in ('succeeded', 'failed', 'aborted')
     or v_run.cost_status not in ('reserved', 'unknown', 'settled') then
    raise exception 'reconciliation_not_allowed' using errcode = '23514';
  end if;
  if v_run.cost_status = 'unknown' then
    update private.provider_runs set cost_status = 'reserved' where id = p_run_id and cost_status = 'unknown';
  end if;
  perform private.settle_provider_run_cost(p_run_id, p_actual);
  return pg_catalog.jsonb_build_object('decision', p_decision, 'released', false, 'retried', false, 'settled', p_actual);
end;
$$;

do $$
declare f record;
begin
  for f in
    select p.oid::pg_catalog.regprocedure as signature, n.nspname from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'public' and p.proname like 'appradar\_collection\_%')
       or (n.nspname = 'private' and p.proname in ('require_lease', 'require_job_run', 'run_json'))
  loop
    execute pg_catalog.format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute pg_catalog.format('grant execute on function %s to service_role', f.signature);
  end loop;
end;
$$;
