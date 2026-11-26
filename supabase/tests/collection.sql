-- T3 checks. Disposable PostgreSQL >= 15 with Supabase roles. Always rolls back.
begin;

create function pg_temp.ok(condition boolean, label text) returns text
language plpgsql as $$ begin
  if condition is distinct from true then raise exception 'FAIL: %', label; end if;
  return label;
end $$;
create function pg_temp.rejects(statement text, expected_state text, label text) returns text
language plpgsql as $$ declare actual_state text; begin
  begin execute statement;
  exception when others then
    get stacked diagnostics actual_state = returned_sqlstate;
    if actual_state = expected_state then return label; end if;
    raise exception 'FAIL: % (SQLSTATE %, expected %)', label, actual_state, expected_state;
  end;
  raise exception 'FAIL: % (statement unexpectedly succeeded)', label;
end $$;

select pg_temp.ok(to_regclass('private.collection_jobs') is not null
  and to_regclass('private.provider_runs') is not null
  and to_regclass('private.budget_periods') is not null, 'private tables exist') as passed;
select pg_temp.ok((select conname = 'app_snapshots_provider_run_fk' from pg_constraint
  where conrelid = 'public.app_snapshots'::regclass and contype = 'f'
    and pg_get_constraintdef(oid) like '%provider_runs%'), 'snapshot FK targets provider_runs') as passed;

insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for)
values ('aurelix', 'details', '{"country":"US"}'::jsonb, 'scope-a', '2099-01-01T00:00:00Z');
select pg_temp.rejects($q$insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for)
  values ('aurelix','details','{}'::jsonb,'scope-a','2099-01-01T00:00:00Z')$q$, '23505', 'duplicate scope window rejected') as passed;
insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for)
values ('aurelix', 'details', '{}'::jsonb, 'scope-a', '2099-02-01T00:00:00Z');
select pg_temp.ok((select count(*) = 2 from private.collection_jobs where dedupe_key = 'scope-a'), 'later window can repeat the same scope') as passed;
select pg_temp.rejects($q$select private.transition_collection_job(
  (select id from private.collection_jobs where scheduled_for = '2099-01-01T00:00:00Z'),
  null, 'succeeded', null)$q$, '23514', 'queued job cannot jump to succeeded') as passed;

insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for, next_attempt_at)
values ('subimpact', 'search', '{}'::jsonb, 'claim-me', pg_catalog.clock_timestamp() - interval '1 minute', pg_catalog.clock_timestamp() - interval '1 minute');
select pg_temp.ok(private.claim_collection_job(60) = (select id from private.collection_jobs where dedupe_key = 'claim-me'), 'queued job is claimed') as passed;
select pg_temp.ok((select status = 'running' and attempt_count = 1 and lease_token is not null from private.collection_jobs where dedupe_key = 'claim-me'), 'claim opens one attempt and a lease') as passed;
select pg_temp.ok(private.claim_collection_job(60) is null, 'active lease is not claimed again') as passed;

select pg_catalog.set_config('appradar.lease_token', (select lease_token::text from private.collection_jobs where dedupe_key = 'claim-me'), true);
update private.collection_jobs set lease_expires_at = pg_catalog.clock_timestamp() - interval '1 second' where dedupe_key = 'claim-me';
select pg_temp.rejects($q$select private.transition_collection_job(
  (select id from private.collection_jobs where dedupe_key = 'claim-me'),
  (select lease_token from private.collection_jobs where dedupe_key = 'claim-me'),
  'ingesting', null)$q$, '42501', 'expired lease cannot transition') as passed;
select pg_temp.ok(private.claim_collection_job(60) = (select id from private.collection_jobs where dedupe_key = 'claim-me')
  and (select attempt_count = 1 from private.collection_jobs where dedupe_key = 'claim-me'), 'expired lease can be claimed without a new attempt') as passed;
select pg_temp.rejects($q$select private.transition_collection_job(
  (select id from private.collection_jobs where dedupe_key = 'claim-me'),
  '00000000-0000-0000-0000-000000000099'::uuid, 'ingesting', null)$q$, '42501', 'old lease token cannot update the new lease') as passed;
select private.transition_collection_job((select id from private.collection_jobs where dedupe_key = 'claim-me'),
  (select lease_token from private.collection_jobs where dedupe_key = 'claim-me'), 'failed', 'sanitized');
select private.retry_collection_job((select id from private.collection_jobs where dedupe_key = 'claim-me'), pg_catalog.clock_timestamp());
select pg_temp.ok((select status = 'queued' and attempt_count = 1 and lease_token is null from private.collection_jobs where dedupe_key = 'claim-me'), 'retry requeues the same job') as passed;
select private.transition_collection_job((select id from private.collection_jobs where dedupe_key = 'claim-me'), null, 'cancelled', null);

insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for)
values ('aurelix', 'details', '{}'::jsonb, 'run-a', '2099-03-01T00:00:00Z'),
       ('aurelix', 'details', '{}'::jsonb, 'run-b', '2099-03-02T00:00:00Z'),
       ('datatrail', 'charts', '{}'::jsonb, 'run-c', '2099-03-03T00:00:00Z');
insert into private.provider_runs (job_id, attempt_number, provider, actor_id, actor_build_id, input_hash)
select id, 1, provider, 'actor', 'build', repeat('b', 64) from private.collection_jobs where dedupe_key = 'run-a';
insert into private.provider_runs (job_id, attempt_number, provider, actor_id, actor_build_id, input_hash)
select id, 1, provider, 'actor', 'build', repeat('b', 64) from private.collection_jobs where dedupe_key = 'run-b';
select pg_temp.ok((select count(*) = 2 and count(external_run_id) = 0 from private.provider_runs), 'pending runs may omit external ids') as passed;
select pg_temp.rejects($q$insert into private.provider_runs (job_id, attempt_number, provider, actor_id, actor_build_id, external_run_id, input_hash)
  select id, 1, provider, 'actor', 'build', 'SameRun', repeat('c', 64) from private.collection_jobs where dedupe_key = 'run-a'$q$, '23505', 'duplicate job attempt rejected') as passed;
update private.provider_runs set external_run_id = 'SameRun'
where job_id = (select id from private.collection_jobs where dedupe_key = 'run-a');
select pg_temp.rejects($q$update private.provider_runs set external_run_id = 'SameRun'
  where job_id = (select id from private.collection_jobs where dedupe_key = 'run-b')$q$, '23505', 'duplicate external run rejected') as passed;
insert into private.provider_runs (job_id, attempt_number, provider, actor_id, actor_build_id, input_hash, reported_cost)
select id, 1, provider, 'actor', 'build', repeat('d', 64), 0 from private.collection_jobs where dedupe_key = 'run-c';
select pg_temp.ok((select reported_cost is null from private.provider_runs where external_run_id = 'SameRun')
  and (select reported_cost = 0 from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-c')), 'unknown cost stays null and zero stays zero') as passed;
update private.provider_runs set execution_status = 'succeeded', validation_status = 'rejected'
where external_run_id = 'SameRun';
select pg_temp.ok((select execution_status = 'succeeded' and validation_status = 'rejected' and not truncated
  from private.provider_runs where external_run_id = 'SameRun'), 'execution and validation stay independent') as passed;
select pg_temp.rejects($q$update private.provider_runs set truncated = true, validation_status = 'accepted' where external_run_id = 'SameRun'$q$, '23514', 'truncated output cannot be accepted') as passed;

insert into private.budget_periods (period_type, period_start, period_end, limit_usd) values
  ('daily', pg_catalog.date_trunc('day', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC',
    pg_catalog.date_trunc('day', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC' + interval '1 day', 100),
  ('monthly', pg_catalog.date_trunc('month', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC',
    pg_catalog.date_trunc('month', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC' + interval '1 month', 5),
  ('monthly', pg_catalog.date_trunc('month', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC' + interval '1 month',
    pg_catalog.date_trunc('month', pg_catalog.clock_timestamp() at time zone 'UTC') at time zone 'UTC' + interval '2 months', 1);
select private.reserve_provider_run_budget((select id from private.provider_runs where external_run_id = 'SameRun'), 1);
select private.reserve_provider_run_budget((select id from private.provider_runs where external_run_id = 'SameRun'), 1);
select pg_temp.ok((select reserved_usd = 1 and spent_usd = 0 from private.budget_periods where period_type = 'daily')
  and (select reserved_usd = 1 and spent_usd = 0 from private.budget_periods where period_type = 'monthly' and limit_usd = 5), 'daily and monthly reserve once') as passed;
update private.budget_periods set limit_usd = 1.5 where period_type = 'daily';
select pg_temp.rejects($q$select private.reserve_provider_run_budget((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-b')), 1)$q$, 'P0001', 'daily limit blocks reservation') as passed;
update private.budget_periods set limit_usd = 100 where period_type = 'daily';
select pg_temp.rejects($q$select private.reserve_provider_run_budget((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-b')), 5)$q$, 'P0002', 'monthly limit blocks reservation') as passed;
select pg_temp.ok((select reserved_usd = 1 from private.budget_periods where period_type = 'daily')
  and (select reserved_usd = 1 from private.budget_periods where period_type = 'monthly' and limit_usd = 5), 'failed limit check leaves both budgets unchanged') as passed;

select private.settle_provider_run_cost((select id from private.provider_runs where external_run_id = 'SameRun'), 1.5);
select private.settle_provider_run_cost((select id from private.provider_runs where external_run_id = 'SameRun'), 1.5);
select pg_temp.ok((select spent_usd = 1.5 and reserved_usd = 0 from private.budget_periods where period_type = 'daily')
  and (select spent_usd = 1.5 and reserved_usd = 0 from private.budget_periods where period_type = 'monthly' and limit_usd = 5)
  and (select spent_usd = 0 and reserved_usd = 0 from private.budget_periods where period_type = 'monthly' and limit_usd = 1)
  and (select settled_cost = 1.5 and cost_status = 'settled' from private.provider_runs where external_run_id = 'SameRun'), 'over-reserve settlement stays on the original periods and is idempotent') as passed;

select private.reserve_provider_run_budget((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-b')), 1);
select private.release_provider_run_reservation((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-b')));
select private.release_provider_run_reservation((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-b')));
select pg_temp.ok((select reserved_usd = 0 and spent_usd = 1.5 from private.budget_periods where period_type = 'daily')
  and (select cost_status = 'released' and settled_cost is null from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-b')), 'duplicate release does not change the balance') as passed;

select private.reserve_provider_run_budget((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-c')), 1);
select private.mark_provider_run_cost_unknown((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-c')));
select pg_temp.rejects($q$select private.release_provider_run_reservation((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-c')))$q$, 'P0003', 'unknown cost keeps the reservation') as passed;
select pg_temp.ok((select cost_status = 'unknown' and reserved_cost = 1 and settled_cost is null
  from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'run-c'))
  and (select reserved_usd = 1 from private.budget_periods where period_type = 'daily'), 'unknown cost is not stored as zero') as passed;

insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for, next_attempt_at)
values ('aurelix', 'details', '{}'::jsonb, 'unknown-start', pg_catalog.clock_timestamp() - interval '1 minute', pg_catalog.clock_timestamp() - interval '1 minute');
insert into private.provider_runs (job_id, attempt_number, provider, actor_id, actor_build_id, input_hash)
select id, 1, provider, 'actor', 'build', repeat('e', 64) from private.collection_jobs where dedupe_key = 'unknown-start';
select private.mark_provider_run_start_unknown((select id from private.provider_runs where job_id = (select id from private.collection_jobs where dedupe_key = 'unknown-start')));
select pg_temp.rejects($q$insert into private.provider_runs (job_id, attempt_number, provider, actor_id, actor_build_id, input_hash)
  select id, 2, provider, 'actor', 'build', repeat('f', 64) from private.collection_jobs where dedupe_key = 'unknown-start'$q$, 'P0005', 'unknown start does not open another paid run') as passed;
select pg_temp.ok(private.claim_collection_job(30) is null, 'unknown start is not claimed into a new attempt') as passed;

insert into public.developers (id, store, store_developer_id, name, first_seen_at, last_seen_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'ios', 'dev', 'Dev', '2026-11-26Z', '2026-11-26Z');
insert into public.apps (id, store, store_app_id, canonical_url, developer_id, first_seen_at, last_seen_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'ios', '123', 'https://apps.apple.com/app/id123', '00000000-0000-0000-0000-0000000000a1', '2026-11-26Z', '2026-11-26Z');
insert into public.app_listings (id, app_id, store, country, requested_language, first_seen_at, expires_at)
  overriding system value values
  (1, '00000000-0000-0000-0000-0000000000b1', 'ios', 'US', 'en', '2026-11-26Z', '2026-11-27Z');
select pg_temp.rejects($q$insert into public.app_snapshots (
  listing_id, store, source, source_run_id, source_build, schema_version, idempotency_key, payload_hash, content_hash, series_key,
  observation_role, collection_mode, collection_context, observed_at, observed_time_basis, collected_at, field_status, expires_at)
  values (1,'ios','aurelix','MissingRun','0.2.23',2,repeat('1',64),repeat('2',64),repeat('3',64),'series','detail','details','sample',
    '2026-11-26T00:00:00Z','collection','2026-11-26T00:00:00Z','{}'::jsonb,'2026-11-27T00:00:00Z')$q$, '23503', 'snapshot without provider run rejected') as passed;
insert into public.app_snapshots (
  listing_id, store, source, source_run_id, source_build, schema_version, idempotency_key, payload_hash, content_hash, series_key,
  observation_role, collection_mode, collection_context, observed_at, observed_time_basis, collected_at, field_status, expires_at)
values (1,'ios','aurelix','SameRun','0.2.23',2,repeat('4',64),repeat('5',64),repeat('6',64),'series','detail','details','sample',
  '2026-11-26T00:00:00Z','collection','2026-11-26T00:00:00Z','{}'::jsonb,'2026-11-27T00:00:00Z');
select pg_temp.rejects($q$update public.app_snapshots set rating_count = 1$q$, '55000', 'snapshot immutability still holds') as passed;

select pg_temp.ok(not has_schema_privilege('anon', 'private', 'USAGE')
  and not has_schema_privilege('authenticated', 'private', 'USAGE')
  and not has_table_privilege('anon', 'private.collection_jobs', 'SELECT')
  and not has_table_privilege('authenticated', 'private.provider_runs', 'SELECT')
  and not has_function_privilege('anon', 'private.reserve_provider_run_budget(uuid,numeric)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.settle_provider_run_cost(uuid,numeric)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.release_provider_run_reservation(uuid)', 'EXECUTE'), 'client roles cannot reach private data or budget functions') as passed;
set local role anon;
select pg_temp.rejects($q$select private.claim_collection_job(30)$q$, '42501', 'anon cannot claim jobs') as passed;
select pg_temp.rejects($q$select private.reserve_provider_run_budget('00000000-0000-0000-0000-0000000000aa'::uuid, 1)$q$, '42501', 'anon cannot reserve budget') as passed;
reset role;
set local role authenticated;
select pg_temp.rejects($q$select private.settle_provider_run_cost('00000000-0000-0000-0000-0000000000aa'::uuid, 1)$q$, '42501', 'authenticated cannot settle budget') as passed;
select pg_temp.rejects($q$select private.release_provider_run_reservation('00000000-0000-0000-0000-0000000000aa'::uuid)$q$, '42501', 'authenticated cannot release budget') as passed;
reset role;

grant usage on schema private to anon;
grant select on private.collection_jobs to anon;
set local role anon;
select pg_temp.ok((select count(*) = 0 from private.collection_jobs), 'anon RLS hides jobs even with a table grant') as passed;
reset role;

set local role service_role;
select pg_temp.ok(has_table_privilege('service_role', 'private.provider_runs', 'UPDATE')
  and (select count(*) >= 1 from private.collection_jobs), 'service role can read private rows') as passed;
reset role;

rollback;
