-- Run after the T2 migration in a disposable PostgreSQL >= 15 database.
-- Requires the Supabase anon/authenticated/service_role roles. Always rolls back.
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

select pg_temp.ok((select count(*) = 4 and bool_and(relrowsecurity)
  from pg_class where oid in ('public.developers'::regclass, 'public.apps'::regclass,
    'public.app_listings'::regclass, 'public.app_snapshots'::regclass)), 'four catalog tables enable RLS') as passed;
select pg_temp.ok((select count(*) = 0 from pg_policies where schemaname = 'public'
  and tablename in ('developers','apps','app_listings','app_snapshots')), 'no permissive client policies') as passed;

insert into public.developers (id,store,store_developer_id,name,first_seen_at,last_seen_at) values
  ('00000000-0000-0000-0000-000000000001','ios','123','Shared name','2026-11-26Z','2026-11-26Z'),
  ('00000000-0000-0000-0000-000000000002','play','123','Shared name','2026-11-26Z','2026-11-26Z');
select pg_temp.ok((select count(*) = 2 from public.developers), 'developer identity includes store, not name') as passed;
select pg_temp.rejects($q$insert into public.developers (store,store_developer_id,first_seen_at,last_seen_at)
  values ('ios','123','2026-11-26Z','2026-11-26Z')$q$, '23505', 'duplicate developer rejected') as passed;

insert into public.apps (id,store,store_app_id,canonical_url,developer_id,first_seen_at,last_seen_at) values
  ('00000000-0000-0000-0000-000000000011','ios','123','https://apps.apple.com/app/id123','00000000-0000-0000-0000-000000000001','2026-11-26Z','2026-11-26Z'),
  ('00000000-0000-0000-0000-000000000012','play','com.example.app','https://play.google.com/store/apps/details?id=com.example.app','00000000-0000-0000-0000-000000000002','2026-11-26Z','2026-11-26Z');
select pg_temp.rejects($q$update public.apps set developer_id='00000000-0000-0000-0000-000000000002'
  where store='ios'$q$, '23503', 'cross-store developer FK rejected') as passed;
select pg_temp.rejects($q$insert into public.apps (store,store_app_id,canonical_url,first_seen_at,last_seen_at)
  values ('ios','123','https://apps.apple.com/app/id123','2026-11-26Z','2026-11-26Z')$q$, '23505', 'same app from another provider cannot duplicate identity') as passed;
select pg_temp.rejects($q$update public.apps set store_app_id='com.fake' where store='ios'$q$, '23514', 'iOS identity requires numeric ID') as passed;
select pg_temp.rejects($q$update public.apps set canonical_url='https://example.invalid/' where store='ios'$q$, '23514', 'canonical URL cannot point elsewhere') as passed;

insert into public.app_listings (id,app_id,store,country,requested_language,first_seen_at,expires_at)
  overriding system value values
  (1,'00000000-0000-0000-0000-000000000011','ios','TR','tr','2026-11-26Z','2026-11-27Z'),
  (2,'00000000-0000-0000-0000-000000000011','ios','US','en','2026-11-26Z','2026-11-27Z'),
  (3,'00000000-0000-0000-0000-000000000011','ios','TR','en','2026-11-26Z','2026-11-27Z'),
  (4,'00000000-0000-0000-0000-000000000012','play','US','en','2026-11-26Z','2026-11-27Z');
select pg_temp.ok((select count(*) = 3 from public.app_listings where store='ios'), 'country and requested language remain separate contexts') as passed;
select pg_temp.rejects($q$insert into public.app_listings (app_id,store,country,requested_language,first_seen_at,expires_at)
  values ('00000000-0000-0000-0000-000000000011','ios','TR','tr','2026-11-26Z','2026-11-27Z')$q$, '23505', 'duplicate listing context rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set store='play' where id=1$q$, '23503', 'listing must match app store') as passed;
select pg_temp.rejects($q$update public.app_listings set app_id='00000000-0000-0000-0000-000000000099' where id=1$q$, '23503', 'orphan listing rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set country='tr' where id=1$q$, '23514', 'noncanonical country rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set requested_language='' where id=1$q$, '23514', 'empty requested language rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set effective_language='unknown language' where id=1$q$, '23514', 'invalid effective language rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set rating_count=-1 where id=1$q$, '23514', 'negative count rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set rating_value=5.01 where id=1$q$, '23514', 'out of scale rating rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set rating_value='NaN'::numeric where id=1$q$, '23514', 'NaN rating rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set price_amount=1 where id=1$q$, '23514', 'price requires currency') as passed;
select pg_temp.rejects($q$update public.app_listings set price_amount=-1,currency='USD' where id=1$q$, '23514', 'negative price rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set price_amount='NaN'::numeric,currency='USD' where id=1$q$, '23514', 'NaN price rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set price_amount=2,currency='USD',is_free=true where id=1$q$, '23514', 'free flag cannot contradict price') as passed;
select pg_temp.rejects($q$update public.app_listings set installs_lower_bound=1000 where id=1$q$, '23514', 'unsupported iOS install metric rejected') as passed;
select pg_temp.rejects($q$update public.app_listings set released_at='2026-11-25Z' where id=1$q$, '23514', 'release date requires precision') as passed;
select pg_temp.rejects($q$update public.app_listings set released_at='2026-11-25 12:00Z',released_at_precision='date' where id=1$q$, '23514', 'date-only metadata cannot claim a time') as passed;
select pg_temp.rejects($q$update public.app_listings set field_provenance='[]'::jsonb where id=1$q$, '23514', 'provenance must be an object') as passed;
select pg_temp.rejects($q$update public.app_listings set expires_at=null where id=1$q$, '23502', 'retention deadline must be supplied, not invented') as passed;
select pg_temp.rejects($q$update public.app_listings set expires_at='infinity' where id=1$q$, '23514', 'infinite retention cannot bypass explicit deadline') as passed;
select pg_temp.rejects($q$update public.app_listings set released_at='infinity',released_at_precision='datetime' where id=1$q$, '23514', 'infinity is not an unknown release date') as passed;
update public.app_listings set rating_value=0,rating_count=0,price_amount=0,currency='TRY',is_free=true where id=1;
update public.app_listings set price_amount=6.990001,currency='USD',is_free=false where id=2;
update public.app_listings set installs_lower_bound=100000000,installs_text='100,000,000+' where id=4;
select pg_temp.ok((select rating_count=0 and rating_value=0 and effective_language is null and released_at is null from public.app_listings where id=1), 'real zeros and unknown dates/language remain distinct') as passed;
select pg_temp.ok((select price_amount=6.990001 from public.app_listings where id=2), 'country prices retain numeric precision') as passed;
select pg_temp.ok((select installs_lower_bound=100000000 from public.app_listings where id=4), 'Play install lower bound supported') as passed;

create function pg_temp.snapshot(patch jsonb) returns bigint language plpgsql as $$
declare result_id bigint;
begin
  insert into public.app_snapshots (
    listing_id,store,source,source_run_id,source_build,schema_version,idempotency_key,payload_hash,content_hash,series_key,
    effective_language,observation_role,collection_mode,collection_context,collection_category,rank,
    observed_at,observed_time_basis,collected_at,price_amount,currency,is_free,rating_value,rating_count,
    review_count,installs_text,installs_lower_bound,released_at,released_at_precision,
    store_updated_at,store_updated_at_precision,field_status,expires_at)
  select listing_id,store,source,source_run_id,source_build,schema_version,idempotency_key,payload_hash,content_hash,series_key,
    effective_language,observation_role,collection_mode,collection_context,collection_category,rank,
    observed_at,observed_time_basis,collected_at,price_amount,currency,is_free,rating_value,rating_count,
    review_count,installs_text,installs_lower_bound,released_at,released_at_precision,
    store_updated_at,store_updated_at_precision,field_status,expires_at
  from jsonb_populate_record(null::public.app_snapshots, jsonb_build_object(
    'listing_id',1,'store','ios','source','aurelix','source_run_id','Run1','source_build','0.2.23','schema_version',2,
    'idempotency_key',repeat('a',64),'payload_hash',repeat('b',64),'content_hash',repeat('c',64),'series_key','aurelix-v2',
    'observation_role','detail','collection_mode','details','collection_context','sample',
    'observed_at','2026-11-26T00:00:00Z','observed_time_basis','collection','collected_at','2026-11-26T00:00:00Z',
    'field_status','{}'::jsonb,'expires_at','2026-11-27T00:00:00Z') || patch)
  returning id into result_id;
  return result_id;
end $$;

select pg_temp.snapshot('{}'::jsonb);
select pg_temp.rejects($q$select pg_temp.snapshot('{}')$q$, '23505', 'same idempotency key cannot duplicate observation') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('idempotency_key',repeat('d',64)))$q$, '23505', 'same run context with unknown language/category still deduplicates') as passed;
select pg_temp.snapshot(jsonb_build_object('source_run_id','Run2','idempotency_key',repeat('d',64)));
select pg_temp.snapshot(jsonb_build_object('source','subimpact','source_run_id','Run3','source_build','0.1.1','idempotency_key',repeat('e',64)));
select pg_temp.ok((select count(*)=3 from public.app_snapshots), 'new runs/providers retain distinct observations for one app') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'schema_version',1))$q$, '23514', 'legacy v1 requires explicit conversion') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'store','play'))$q$, '23503', 'snapshot must match listing store') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'installs_text','100+'))$q$, '23514', 'iOS snapshot cannot invent installs') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key','invalid'))$q$, '23514', 'invalid hash rejected') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'rating_count',-1))$q$, '23514', 'snapshot count constraints enforced') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'price_amount',1))$q$, '23514', 'snapshot price requires currency') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'observed_at','2099-01-01T00:00:00Z'))$q$, '23514', 'future observation rejected') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'observed_at','2026-11-25T00:00:00Z'))$q$, '23514', 'collection fallback equals collected time') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'field_status','{"rating_count":"guessed"}'::jsonb))$q$, '23514', 'unsupported field status rejected') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'field_status','{"rating_count":1}'::jsonb))$q$, '23514', 'non-string field status rejected') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'observation_role','discovery'))$q$, '23514', 'role must agree with collection mode') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'observation_role','discovery','collection_mode','charts'))$q$, '23514', 'charts require category and rank') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'collection_category','6007'))$q$, '23514', 'detail cannot manufacture another category context') as passed;
select pg_temp.rejects($q$select pg_temp.snapshot(jsonb_build_object('source_run_id','Run4','idempotency_key',repeat('f',64),'rank',1))$q$, '23514', 'detail rank cannot be confused with search/chart rank') as passed;
select pg_temp.rejects($q$update public.app_snapshots set rating_count=20$q$, '55000', 'snapshots remain immutable even for owner') as passed;
update public.app_listings set latest_snapshot_id=(select min(id) from public.app_snapshots) where id=1;
select pg_temp.rejects($q$update public.app_listings set latest_snapshot_id=(select min(id) from public.app_snapshots) where id=2$q$, '23503', 'latest pointer cannot reference another listing') as passed;
select pg_temp.rejects($q$delete from public.app_snapshots where id=(select min(id) from public.app_snapshots)$q$, '23503', 'referenced latest snapshot cannot be deleted silently') as passed;

select pg_temp.ok(not has_table_privilege('anon','public.apps','SELECT') and
  not has_table_privilege('authenticated','public.app_listings','INSERT') and
  not has_sequence_privilege('authenticated','public.app_snapshots_id_seq','USAGE'), 'client grants are closed') as passed;
select pg_temp.ok(has_table_privilege('service_role','public.apps','INSERT') and
  not has_table_privilege('service_role','public.app_snapshots','UPDATE'), 'server grants exclude snapshot updates') as passed;
select pg_temp.ok(not has_column_privilege('service_role','public.apps','store_app_id','UPDATE') and
  has_column_privilege('service_role','public.apps','last_seen_at','UPDATE') and
  not has_column_privilege('service_role','public.app_listings','app_id','UPDATE'), 'server can refresh fields without moving identities') as passed;

-- Test RLS itself, independently of revoked grants. These grants roll back.
grant usage on schema public to anon, authenticated;
grant select,insert,update,delete on public.apps to anon, authenticated;
set local role anon;
select pg_temp.ok((select count(*)=0 from public.apps), 'anon RLS hides market rows') as passed;
select pg_temp.rejects($q$insert into public.apps (store,store_app_id,canonical_url,first_seen_at,last_seen_at)
  values ('ios','999','https://apps.apple.com/app/id999','2026-11-26Z','2026-11-26Z')$q$, '42501', 'anon RLS rejects writes even with table grant') as passed;
reset role;
set local role authenticated;
select pg_temp.ok((select count(*)=0 from public.apps), 'authenticated RLS hides market rows') as passed;
select pg_temp.rejects($q$insert into public.apps (store,store_app_id,canonical_url,first_seen_at,last_seen_at)
  values ('ios','999','https://apps.apple.com/app/id999','2026-11-26Z','2026-11-26Z')$q$, '42501', 'authenticated RLS rejects writes even with table grant') as passed;
reset role;
set local role service_role;
select pg_temp.ok((select count(*)=2 from public.apps), 'trusted server can read market rows') as passed;
update public.apps set last_seen_at='2026-11-26 01:00Z' where store='ios';
select pg_temp.rejects($q$update public.apps set store_app_id='999' where store='ios'$q$, '42501', 'server cannot change canonical identity') as passed;
select pg_temp.rejects($q$update public.app_snapshots set rating_count=20$q$, '42501', 'server cannot update immutable snapshots') as passed;
reset role;

rollback;
