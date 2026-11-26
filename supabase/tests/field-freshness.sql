-- Focused B1 regression, disposable local database only. The runner applies B1 at the marker.
begin;
create function pg_temp.ok(condition boolean, label text) returns text language plpgsql as $$
begin if condition is distinct from true then raise exception 'FAIL: %', label; end if; return label; end $$;
create function pg_temp.run(p_provider text, p_mode text, p_run text) returns void language plpgsql as $$
declare job uuid; begin
 insert into private.collection_jobs(provider,collection_mode,scope,dedupe_key,scheduled_for)
 values(p_provider,p_mode,'{}',p_run,'2026-01-01') returning id into job;
 insert into private.provider_runs(job_id,attempt_number,provider,actor_id,actor_build_id,external_run_id,input_hash,execution_status,validation_status)
 values(job,1,p_provider,'fixture','build',p_run,repeat('a',64),'succeeded','accepted');
end $$;
create function pg_temp.save(p_provider text,p_run text,p_day int,extra jsonb,p_mode text default 'details') returns jsonb language plpgsql as $$
declare stamp text := format('2026-01-%sT00:00:00Z',lpad(p_day::text,2,'0'));
begin
 return public.appradar_persist_app_observations(p_provider,p_run,jsonb_build_array(jsonb_build_object(
  'source',p_provider,'sourceRunId',p_run,'sourceBuild','1','schemaVersion',2,'store','ios','storeAppId','111',
  'country','US','requestedLanguage','en','collectionContext',jsonb_build_object('mode',p_mode,'context','c','category',null),
  'observationRole',case when p_mode='details' then 'detail' else 'discovery' end,
  'observedAt',stamp,'collectedAt',stamp,'observedTimeBasis','collection',
  'idempotencyKey',encode(sha256(p_run::bytea),'hex'),'payloadHash',encode(sha256((p_run||extra::text)::bytea),'hex'),
  'contentHash',encode(sha256(extra::text::bytea),'hex'),'seriesKey',p_provider||'/'||p_mode,'fieldStatus','{}'::jsonb) || extra),'2099-01-01');
end $$;
select pg_temp.run('aurelix','details','Primary01');
select pg_temp.run('subimpact','details','Secondary10');
select pg_temp.save('aurelix','Primary01',1,'{"name":"Primary","ratingValue":3.5,"ratingCount":100,"priceAmount":2,"currency":"USD","isFree":false}');
select pg_temp.save('subimpact','Secondary10',10,'{"ratingValue":4.7,"priceAmount":3,"currency":"EUR","isFree":false}');
select pg_temp.ok((select rating_value=3.5 from public.app_listings),'legacy precedence reproduced before forward migration') as passed;
-- APPLY B1 HERE
select pg_temp.ok(private.observation_wins(
 '{"source":"subimpact","role":"discovery","observedAt":"2026-01-20","collectedAt":"2026-01-20","runId":"D","build":"1"}',
 '{"source":"aurelix","role":"detail","observedAt":"2026-01-01","collectedAt":"2026-01-01","runId":"A","build":"1"}'),
 'detail and discovery are distinct authority tiers even when discovery is newer') as passed;

select pg_temp.run('subimpact','details','Secondary11');
select pg_temp.run('aurelix','details','Older09');
select pg_temp.run('aurelix','developers','Discovery20');
select pg_temp.run('aurelix','details','Equal11');
select pg_temp.run('subimpact','details','EqualSecondary11');
select pg_temp.run('subimpact','details','Secondary12');
select pg_temp.run('subimpact','details','Flag13');
select pg_temp.run('subimpact','details','Flag14');
select pg_temp.run('subimpact','details','Amount15');
set local role service_role;
select pg_temp.save('subimpact','Secondary11',11,'{"name":"New detail","ratingValue":4.8,"ratingCount":200,"priceAmount":4,"currency":"EUR","isFree":false}');
select pg_temp.ok((select rating_value=4.8 and price_amount=4 and currency='EUR' and field_provenance->'rating_value'->>'source'='subimpact' from public.app_listings),'newer compatible detail beats old preferred source') as passed;
select pg_temp.save('aurelix','Older09',9,'{"name":"Older primary","ratingValue":2,"priceAmount":1,"currency":"USD","isFree":false,"version":"1.0"}');
select pg_temp.ok((select name='New detail' and rating_value=4.8 and currency='EUR' and version='1.0' from public.app_listings),'late old preferred detail cannot roll back newer detail; can fill an unknown field') as passed;
select pg_temp.ok((select field_provenance->'version'->>'observedAt'='2026-01-09T00:00:00Z' and field_provenance->'rating_value'->>'observedAt'='2026-01-11T00:00:00Z' from public.app_listings),'each field retains its own actual observation timestamp') as passed;
select pg_temp.save('aurelix','Discovery20',20,'{"name":"Discovery","ratingValue":5,"priceAmount":9,"currency":"JPY","isFree":false,"reviewCount":17}','developers');
select pg_temp.ok((select rating_value=4.8 and name='New detail' and price_amount=4 and currency='EUR' and review_count=17 from public.app_listings),'new discovery cannot overwrite detail but may fill an unobserved field') as passed;
select pg_temp.ok((select last_observed_at='2026-01-20' and field_provenance->'rating_value'->>'observedAt'='2026-01-11T00:00:00Z' and field_provenance->'review_count'->>'observedAt'='2026-01-20T00:00:00Z' from public.app_listings),'unrelated update advances listing time, not metric time') as passed;
select pg_temp.ok((select s.source_run_id='Secondary11' from public.app_listings l join public.app_snapshots s on s.id=l.latest_snapshot_id),'representative pointer uses the same authority/time rules') as passed;
select pg_temp.save('aurelix','Equal11',11,'{"ratingValue":4.6,"priceAmount":6,"currency":"GBP","isFree":false}');
select pg_temp.save('subimpact','EqualSecondary11',11,'{"ratingValue":1,"priceAmount":7,"currency":"EUR","isFree":false}');
select pg_temp.ok((select rating_value=4.6 and currency='GBP' from public.app_listings),'Aurelix preferred at equal observation time, independent of ingest order') as passed;
select pg_temp.save('subimpact','Secondary12',12,'{"ratingValue":4.4,"ratingCount":null,"priceAmount":4,"currency":"CAD","isFree":false}');
select pg_temp.ok((select rating_value=4.4 and rating_count=200 and field_provenance->'rating_count'->>'observedAt'='2026-01-11T00:00:00Z' and price_amount=4 and currency='CAD' from public.app_listings),'null does not erase or refresh a field; amount and currency move together') as passed;
select pg_temp.save('subimpact','Flag13',13,'{"isFree":false}');
select pg_temp.ok((select price_amount=4 and currency='CAD' and field_provenance->'price'->>'observedAt'='2026-01-12T00:00:00Z' from public.app_listings),'matching bare free flag cannot refresh retained amount/currency') as passed;
select pg_temp.save('subimpact','Flag14',14,'{"isFree":true}');
select pg_temp.ok((select price_amount is null and currency is null and is_free and field_provenance->'price'->>'observedAt'='2026-01-14T00:00:00Z' from public.app_listings),'contradictory accepted flag clears amount and currency atomically') as passed;
select pg_temp.save('subimpact','Amount15',15,'{"priceAmount":2,"currency":"EUR"}');
select pg_temp.ok((select price_amount=2 and currency='EUR' and is_free is null from public.app_listings),'new amount does not inherit a contradictory old free flag') as passed;
select pg_temp.ok(pg_temp.save('subimpact','Amount15',15,'{"priceAmount":2,"currency":"EUR"}')->>'duplicates'='1','replaying completed run remains idempotent') as passed;
reset role;
select pg_temp.ok((select count(*)=11 from public.app_snapshots),'all distinct observations kept, without blending historical source/method series') as passed;
select pg_temp.ok((select count(*)=2 from public.app_snapshots
 where (source_run_id='Primary01' and rating_value=3.5 and currency='USD')
    or (source_run_id='Secondary10' and rating_value=4.7 and currency='EUR')),
 'subsequent ingestion leaves pre-migration historical values intact') as passed;
select pg_temp.ok((select count(distinct series_key)=3 from public.app_snapshots),
 'provider/detail/discovery historical series remain separate') as passed;
do $$ begin
 begin update public.app_snapshots set rating_value=0;
 exception when sqlstate '55000' then return;
 end;
 raise exception 'FAIL: snapshot immutability';
end $$;
select pg_temp.ok(not has_function_privilege('anon','public.appradar_persist_app_observations(text,text,jsonb,timestamptz)','execute') and not has_function_privilege('authenticated','public.appradar_persist_app_observations(text,text,jsonb,timestamptz)','execute'),'function replacement preserves restricted privileges') as passed;
rollback;
