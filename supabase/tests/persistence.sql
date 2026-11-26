-- T4-T7 checks with synthetic data. Disposable PostgreSQL >= 15 only; always rolls back.
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

create function pg_temp.run(p_provider text, p_mode text, p_run text, p_validation text default 'accepted') returns void
language plpgsql as $$ declare v_job uuid; begin
  insert into private.collection_jobs (provider, collection_mode, scope, dedupe_key, scheduled_for)
  values (p_provider, p_mode, '{}', p_run, '2099-01-01T00:00:00Z') returning id into v_job;
  insert into private.provider_runs (job_id, attempt_number, provider, actor_id, actor_build_id, external_run_id, input_hash,
    execution_status, validation_status, truncated)
  values (v_job, 1, p_provider, 'actor', 'build', p_run, repeat('a', 64), 'succeeded', p_validation, p_validation = 'truncated');
end $$;
create function pg_temp.h(value text) returns text language sql as $$ select encode(sha256(value::bytea), 'hex') $$;

create function pg_temp.app(p_run text, p_mode text, p_day int, extra jsonb) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'source', 'aurelix', 'sourceRunId', p_run, 'sourceBuild', '1', 'schemaVersion', 2, 'store', 'ios', 'storeAppId', '111',
    'country', 'US', 'requestedLanguage', 'en', 'collectionContext', jsonb_build_object('mode', p_mode, 'context', 'c', 'category', null),
    'observationRole', case p_mode when 'details' then 'detail' else 'discovery' end,
    'observedAt', format('2026-01-%sT00:00:00Z', lpad(p_day::text, 2, '0')),
    'collectedAt', format('2026-01-%sT00:00:00Z', lpad(p_day::text, 2, '0')), 'observedTimeBasis', 'collection',
    'idempotencyKey', pg_temp.h(p_run), 'payloadHash', pg_temp.h(p_run || extra::text), 'contentHash', pg_temp.h(extra::text),
    'seriesKey', 'aurelix/x', 'fieldStatus', '{}'::jsonb) || extra) $$;
create function pg_temp.save_app(p_run text, p_mode text, p_day int, extra jsonb) returns jsonb language sql as $$
  select public.appradar_persist_app_observations('aurelix', p_run, pg_temp.app(p_run, p_mode, p_day, extra), '2099-01-01T00:00:00Z') $$;

select pg_temp.run('aurelix', 'details', 'Detail10');
select pg_temp.run('aurelix', 'details', 'Detail05');
select pg_temp.run('aurelix', 'details', 'Detail12');
select pg_temp.run('aurelix', 'developers', 'List20');
select pg_temp.run('aurelix', 'details', 'Rejected', 'rejected');

set local role service_role;
select pg_temp.save_app('Detail10', 'details', 10, '{"name":"Detailed","priceAmount":2,"currency":"USD","isFree":false,"description":"Long"}');
select pg_temp.ok(pg_temp.save_app('Detail10', 'details', 10, '{"name":"Detailed","priceAmount":2,"currency":"USD","isFree":false,"description":"Long"}')
  ->>'duplicates' = '1', 'replay is a duplicate') as passed;
select pg_temp.save_app('Detail05', 'details', 5, '{"name":"Older","version":"1.0"}');
select pg_temp.save_app('Detail12', 'details', 12, '{"name":null,"ratingCount":0}');
select pg_temp.save_app('List20', 'developers', 20, '{"name":"Summary","priceAmount":9,"currency":"EUR","isFree":false,"reviewCount":7}');
select pg_temp.ok((select name = 'Detailed' and price_amount = 2 and currency = 'USD' and description = 'Long'
  and version = '1.0' and rating_count = 0 and review_count = 7 from public.app_listings),
  'older, null and summary values do not overwrite; gaps are filled') as passed;
select pg_temp.ok((select count(*) = 4 from public.app_snapshots)
  and (select s.source_run_id = 'Detail12' from public.app_listings l join public.app_snapshots s on s.id = l.latest_snapshot_id),
  'history kept and latest pointer stays on newest detail') as passed;
select pg_temp.rejects($q$select pg_temp.save_app('Rejected', 'details', 13, '{"name":"x"}')$q$, 'P0006', 'rejected run is not persisted') as passed;
reset role;

select pg_temp.run('aurelix', 'charts', 'Chart1', 'truncated');
select pg_temp.run('thewolves', 'reviews', 'Rev1');
select pg_temp.run('thewolves', 'reviews', 'Rev2');
select pg_temp.run('thewolves', 'reviews', 'Rev3');
select pg_temp.run('asokeyword', 'keywords', 'Key1');
set local role service_role;

select public.appradar_persist_discovery('aurelix', 'Chart1', jsonb_build_array(jsonb_build_object(
  'kind', 'chart', 'mode', 'charts', 'source', 'aurelix', 'sourceRunId', 'Chart1', 'sourceBuild', '1', 'store', 'ios',
  'country', 'US', 'requestedLanguage', 'en', 'context', 'topFree', 'category', '6007', 'observedAt', '2026-01-21T00:00:00Z',
  'observedTimeBasis', 'collection', 'collectedAt', '2026-01-21T00:00:00Z', 'payloadHash', pg_temp.h('chart'),
  'entries', jsonb_build_array(jsonb_build_object('storeAppId', '222', 'position', 1, 'observationKey', pg_temp.h('e'))))), '2099-01-01T00:00:00Z');
select pg_temp.ok((select coverage_status = 'truncated' from public.discovery_snapshots)
  and (select count(*) = 1 from public.app_listings), 'truncated coverage is recorded and no listing is written') as passed;

create function pg_temp.save_review(p_run text, p_day int, p_text text) returns jsonb language sql as $$
  select public.appradar_persist_reviews('thewolves', p_run, jsonb_build_array(jsonb_build_object(
    'source', 'thewolves', 'sourceRunId', p_run, 'sourceBuild', '1', 'schemaVersion', 2, 'store', 'ios', 'storeAppId', '111',
    'canonicalReviewKey', pg_temp.h('review'), 'reviewIdNamespace', 'actor:synthetic', 'sourceReviewId', 'r1',
    'country', 'US', 'requestedLanguage', 'en', 'rating', 4, 'text', p_text, 'fieldStatus', '{}'::jsonb,
    'idempotencyKey', pg_temp.h(p_run), 'payloadHash', pg_temp.h(p_run), 'contentHash', pg_temp.h(coalesce(p_text, '')),
    'observedAt', format('2026-01-0%sT00:00:00Z', p_day), 'collectedAt', format('2026-01-0%sT00:00:00Z', p_day),
    'observedTimeBasis', 'collection')), '2099-01-01T00:00:00Z') $$;
select pg_temp.save_review('Rev1', 1, 'first');
select pg_temp.ok(pg_temp.save_review('Rev2', 2, 'first')->>'unchanged' = '1', 'unchanged review adds no history') as passed;
select pg_temp.save_review('Rev3', 3, 'edited');
select pg_temp.ok((select count(*) = 1 and min(body) = 'edited' from public.reviews)
  and (select count(*) = 2 from public.review_observations), 'one review, two meaningful versions') as passed;
select pg_temp.rejects($q$update public.review_observations set body = 'x'$q$, '42501', 'review history is not writable') as passed;

create function pg_temp.save_keyword() returns jsonb language sql as $$
  select public.appradar_persist_keywords('asokeyword', 'Key1', jsonb_build_array(jsonb_build_object(
    'source', 'asokeyword', 'sourceRunId', 'Key1', 'sourceBuild', '1', 'schemaVersion', 2, 'store', 'ios', 'keyword', 'habit',
    'country', 'US', 'requestedLanguage', 'en', 'relevantFilters', '{}'::jsonb, 'observedAt', '2026-01-01T00:00:00Z',
    'collectedAt', '2026-01-01T00:00:00Z', 'payloadHash', pg_temp.h('key'), 'entries', jsonb_build_array(jsonb_build_object(
      'rowType', 'metrics', 'idempotencyKey', pg_temp.h('metrics'), 'keywordContextKey', pg_temp.h('ctx'),
      'measurementMethod', 'm', 'payloadHash', pg_temp.h('m'), 'popularity', 56, 'popularitySource', 'apple',
      'difficulty', null, 'fieldStatus', '{}'::jsonb, 'checkedAt', '2026-01-01T00:00:00Z')))), '2099-01-01T00:00:00Z') $$;
select pg_temp.save_keyword();
select pg_temp.ok(pg_temp.save_keyword()->>'duplicates' = '1' and (select count(*) = 1 and min(popularity) = 56
  and bool_and(difficulty is null) from public.keyword_entries), 'keyword replay is idempotent and unknown stays null') as passed;
reset role;

select pg_temp.ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.discovery_snapshots'::regclass,
  'public.discovery_entries'::regclass, 'public.reviews'::regclass, 'public.review_observations'::regclass,
  'public.keyword_snapshots'::regclass, 'public.keyword_entries'::regclass))
  and not has_table_privilege('anon', 'public.reviews', 'select')
  and not has_table_privilege('authenticated', 'public.reviews', 'select')
  and not has_function_privilege('anon', 'public.appradar_persist_reviews(text,text,jsonb,timestamptz)', 'execute'),
  'clients have no access') as passed;
rollback;
