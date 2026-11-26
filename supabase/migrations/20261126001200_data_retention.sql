-- B2 data retention. Apply after 20261126001100_field_freshness, in one transaction.
-- Adds functions and one single-row lock table. No existing object is changed, no data is
-- touched on apply, nothing is scheduled. No retention period is stored here: every call
-- passes the complete policy, and a missing value raises instead of using a default.
--
-- A row is due when LEAST(its expires_at, its age anchor + policy days) <= now(). An existing
-- expiry is therefore never extended. developers, apps and watchlist_items are never deleted.
-- Everything is SECURITY INVOKER with an empty search_path and executable by service_role only.

-- Overlap protection. A lease row, not an advisory lock: batches are separate PostgREST
-- transactions, so the lock has to survive between them.
create table private.retention_lock (
  singleton boolean primary key default true check (singleton),
  holder uuid not null,
  expires_at timestamptz not null
);
alter table private.retention_lock enable row level security;
revoke all on private.retention_lock from public, anon, authenticated, service_role;
grant select, insert, update, delete on private.retention_lock to service_role;

-- Needed to see saved listings before touching them. Supabase default privileges already grant this.
grant select on public.watchlist_items to service_role;

create function private.retention_check(p_policy jsonb) returns void
language plpgsql immutable set search_path = '' as $$
declare
  c_categories constant text[] := array['listing_current', 'app_snapshots', 'discovery_history',
    'keyword_history', 'reviews', 'collection_jobs', 'provider_runs', 'budget_records'];
  c_providers constant text[] := array['subimpact', 'aurelix', 'thewolves', 'aurelixplayreviews', 'datatrail', 'asokeyword'];
  v_key text;
  v_value jsonb;
  v_provider record;
begin
  if p_policy is null or pg_catalog.jsonb_typeof(p_policy) is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_policy->'categories') is distinct from 'object'
     or pg_catalog.jsonb_typeof(p_policy->'providers') is distinct from 'object' then
    raise exception 'retention_policy_missing' using errcode = '23514';
  end if;
  foreach v_key in array c_categories loop
    if not (p_policy->'categories') ? v_key then
      raise exception 'retention_policy_missing' using errcode = '23514';
    end if;
  end loop;
  for v_key, v_value in
    select e.key, e.value from pg_catalog.jsonb_each(p_policy->'categories') as e
  loop
    if not v_key = any (c_categories) or pg_catalog.jsonb_typeof(v_value) <> 'number'
       or v_value::text !~ '^[1-9][0-9]{0,2}$' or v_value::text::integer > 730 then
      raise exception 'retention_policy_invalid' using errcode = '23514';
    end if;
  end loop;
  for v_provider in select e.key, e.value from pg_catalog.jsonb_each(p_policy->'providers') as e loop
    if not v_provider.key = any (c_providers) or pg_catalog.jsonb_typeof(v_provider.value) <> 'object' then
      raise exception 'retention_policy_invalid' using errcode = '23514';
    end if;
    for v_key, v_value in select e.key, e.value from pg_catalog.jsonb_each(v_provider.value) as e loop
      -- Budget periods are shared by all providers, so they take no provider limit.
      if not v_key = any (c_categories) or v_key = 'budget_records' or pg_catalog.jsonb_typeof(v_value) <> 'number'
         or v_value::text !~ '^[1-9][0-9]{0,2}$' or v_value::text::integer > 730 then
        raise exception 'retention_policy_invalid' using errcode = '23514';
      end if;
    end loop;
  end loop;
end;
$$;

-- Provider limit when configured, otherwise the category limit.
create function private.retention_days(p_policy jsonb, p_category text, p_provider text) returns integer
language plpgsql immutable set search_path = '' as $$
declare v_days integer;
begin
  v_days := coalesce((p_policy->'providers'->p_provider->>p_category)::integer, (p_policy->'categories'->>p_category)::integer);
  if v_days is null then
    raise exception 'retention_policy_missing' using errcode = '23514';
  end if;
  return v_days;
end;
$$;

create function private.retention_due(p_expires_at timestamptz, p_anchor timestamptz, p_days integer) returns boolean
language sql stable set search_path = '' as $$
  select least(p_expires_at, p_anchor + pg_catalog.make_interval(days => p_days)) <= pg_catalog.now();
$$;

-- A listing mixes providers field by field, so the strictest contributing limit applies.
create function private.retention_listing_due(
  p_expires_at timestamptz, p_anchor timestamptz, p_provenance jsonb, p_policy jsonb
) returns boolean
language sql stable set search_path = '' as $$
  select private.retention_due(p_expires_at, p_anchor, coalesce(
    (select min(private.retention_days(p_policy, 'listing_current', f.value->>'source'))::integer
     from pg_catalog.jsonb_each(p_provenance) as f),
    private.retention_days(p_policy, 'listing_current', null)));
$$;

-- Metric groups (B1 provenance keys) whose own observation is older than the listing limit.
create function private.retention_stale_metrics(p_provenance jsonb, p_policy jsonb) returns text[]
language sql stable set search_path = '' as $$
  select coalesce(pg_catalog.array_agg(f.key order by f.key), '{}'::text[])
  from pg_catalog.jsonb_each(p_provenance) as f
  where f.key in ('rating_value', 'rating_count', 'review_count', 'price', 'installs_text', 'installs_lower_bound')
    and private.retention_due(null, (f.value->>'observedAt')::timestamptz,
      private.retention_days(p_policy, 'listing_current', f.value->>'source'));
$$;

-- Settled money and a known outcome. Anything unknown, running or reserved is never eligible,
-- and one unresolved attempt keeps the whole job with all of its runs.
create function private.retention_job_final(p_job_id uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from private.collection_jobs as j
    where j.id = p_job_id
      and (j.status in ('succeeded', 'partial', 'cancelled') or (j.status = 'failed' and j.attempt_count >= j.max_attempts))
  ) and not exists (
    select 1 from private.provider_runs as r
    where r.job_id = p_job_id and (
      r.execution_status in ('unknown', 'running')
      or r.cost_status in ('reserved', 'unknown')
      -- 'pending' is resolved only when the paid start was never requested.
      or (r.execution_status = 'pending' and (r.started_at is not null or r.external_run_id is not null)))
  );
$$;

-- p_projected = true (report only): observations that are themselves due count as already removed.
create function private.retention_run_eligible(p_run_id uuid, p_policy jsonb, p_projected boolean) returns boolean
language sql stable set search_path = '' as $$
  select exists (
    select 1 from private.provider_runs as r
    where r.id = p_run_id
      and private.retention_job_final(r.job_id)
      and private.retention_due(null, coalesce(greatest(r.finished_at, r.updated_at), r.updated_at),
        private.retention_days(p_policy, 'provider_runs', r.provider))
      -- Runs leave only together with closed budget windows, so a retained window keeps all its runs.
      and not exists (
        select 1 from private.budget_periods as b
        where b.id in (r.daily_budget_period_id, r.monthly_budget_period_id)
          and (b.reserved_usd <> 0
            or not private.retention_due(null, b.period_end, private.retention_days(p_policy, 'budget_records', null))))
      and not exists (
        select 1 from public.app_snapshots as s where s.source = r.provider and s.source_run_id = r.external_run_id
          and not (p_projected and private.retention_due(s.expires_at, s.collected_at,
            private.retention_days(p_policy, 'app_snapshots', s.source))))
      and not exists (
        select 1 from public.discovery_snapshots as s where s.source = r.provider and s.source_run_id = r.external_run_id
          and not (p_projected and private.retention_due(s.expires_at, s.collected_at,
            private.retention_days(p_policy, 'discovery_history', s.source))))
      and not exists (
        select 1 from public.keyword_snapshots as s where s.source = r.provider and s.source_run_id = r.external_run_id
          and not (p_projected and private.retention_due(s.expires_at, s.collected_at,
            private.retention_days(p_policy, 'keyword_history', s.source))))
      and not exists (
        select 1 from public.review_observations as o where o.source = r.provider and o.source_run_id = r.external_run_id
          and not (p_projected and private.retention_due(o.expires_at, o.last_seen_at,
            private.retention_days(p_policy, 'reviews', o.source))))
  );
$$;

-- The one definition of eligibility, shared by the report and the delete batches.
create function private.retention_candidates(p_step text, p_policy jsonb, p_projected boolean)
returns table (id text)
language sql stable set search_path = '' as $$
  select o.id::text from public.review_observations as o
  where p_step = 'review_observations'
    and private.retention_due(o.expires_at, o.last_seen_at, private.retention_days(p_policy, 'reviews', o.source))
  union all
  -- The persist function always writes a review with an observation; none left means cleanup removed them.
  select r.id::text from public.reviews as r
  where p_step = 'reviews'
    and not exists (
      select 1 from public.review_observations as o where o.review_id = r.id
        and not (p_projected and private.retention_due(o.expires_at, o.last_seen_at,
          private.retention_days(p_policy, 'reviews', o.source))))
  union all
  select s.id::text from public.keyword_snapshots as s
  where p_step = 'keyword_snapshots'
    and private.retention_due(s.expires_at, s.collected_at, private.retention_days(p_policy, 'keyword_history', s.source))
  union all
  select s.id::text from public.discovery_snapshots as s
  where p_step = 'discovery_snapshots'
    and private.retention_due(s.expires_at, s.collected_at, private.retention_days(p_policy, 'discovery_history', s.source))
  union all
  select s.id::text from public.app_snapshots as s
  where p_step = 'app_snapshots'
    and private.retention_due(s.expires_at, s.collected_at, private.retention_days(p_policy, 'app_snapshots', s.source))
  union all
  -- Old metrics inside a listing that is otherwise still current.
  select l.id::text from public.app_listings as l
  where p_step = 'listing_metrics'
    and not private.retention_listing_due(l.expires_at, coalesce(l.last_observed_at, l.first_seen_at), l.field_provenance, p_policy)
    and pg_catalog.cardinality(private.retention_stale_metrics(l.field_provenance, p_policy)) > 0
  union all
  -- Due listings whose row must stay (saved by a user, or still holding history): content is cleared.
  select l.id::text from public.app_listings as l
  where p_step = 'listing_content'
    and private.retention_listing_due(l.expires_at, coalesce(l.last_observed_at, l.first_seen_at), l.field_provenance, p_policy)
    and (l.expires_at > pg_catalog.now() or l.field_provenance <> '{}'::jsonb
      or pg_catalog.num_nonnulls(l.effective_language, l.name, l.developer_name, l.category_name, l.category_key, l.version,
        l.released_at, l.store_updated_at, l.price_amount, l.currency, l.is_free, l.rating_value, l.rating_count,
        l.review_count, l.installs_text, l.installs_lower_bound, l.description, l.icon_url, l.screenshot_urls) > 0)
    and (exists (select 1 from public.watchlist_items as w where w.app_id = l.app_id and w.country = l.country
          and w.requested_language = l.requested_language)
      or exists (select 1 from public.app_snapshots as s where s.listing_id = l.id
          and not (p_projected and private.retention_due(s.expires_at, s.collected_at,
            private.retention_days(p_policy, 'app_snapshots', s.source)))))
  union all
  -- watchlist_items cascades from this row, so a saved listing is never a delete candidate.
  select l.id::text from public.app_listings as l
  where p_step = 'listings'
    and private.retention_listing_due(l.expires_at, coalesce(l.last_observed_at, l.first_seen_at), l.field_provenance, p_policy)
    and not exists (select 1 from public.watchlist_items as w where w.app_id = l.app_id and w.country = l.country
          and w.requested_language = l.requested_language)
    and not exists (select 1 from public.app_snapshots as s where s.listing_id = l.id
          and not (p_projected and private.retention_due(s.expires_at, s.collected_at,
            private.retention_days(p_policy, 'app_snapshots', s.source))))
  union all
  select r.id::text from private.provider_runs as r
  where p_step = 'provider_runs' and private.retention_run_eligible(r.id, p_policy, p_projected)
  union all
  select j.id::text from private.collection_jobs as j
  where p_step = 'collection_jobs'
    and private.retention_job_final(j.id)
    and private.retention_due(null, coalesce(j.completed_at, j.updated_at),
      private.retention_days(p_policy, 'collection_jobs', j.provider))
    and not exists (select 1 from private.provider_runs as r where r.job_id = j.id
      and not (p_projected and private.retention_run_eligible(r.id, p_policy, true)))
  union all
  select b.id::text from private.budget_periods as b
  where p_step = 'budget_periods'
    and b.reserved_usd = 0
    and private.retention_due(null, b.period_end, private.retention_days(p_policy, 'budget_records', null))
    and not exists (select 1 from private.provider_runs as r
      where (r.daily_budget_period_id = b.id or r.monthly_budget_period_id = b.id)
        and not (p_projected and private.retention_run_eligible(r.id, p_policy, true)));
$$;

-- A caller that cannot see every watchlist row would treat saved listings as unsaved.
create function private.retention_require_watchlist_visibility() returns void
language plpgsql stable set search_path = '' as $$
begin
  if pg_catalog.row_security_active('public.watchlist_items') then
    raise exception 'retention_watchlist_not_visible' using errcode = '42501';
  end if;
end;
$$;

-- Dry run. STABLE: PostgreSQL itself refuses writes from here. Counts only, no row content or ids.
create function public.appradar_retention_report(p_policy jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_step text;
  v_eligible jsonb := '{}'::jsonb;
begin
  perform private.retention_check(p_policy);
  perform private.retention_require_watchlist_visibility();
  foreach v_step in array array['review_observations', 'reviews', 'keyword_snapshots', 'discovery_snapshots', 'app_snapshots',
    'listing_metrics', 'listing_content', 'listings', 'provider_runs', 'collection_jobs', 'budget_periods']
  loop
    v_eligible := v_eligible || pg_catalog.jsonb_build_object(v_step,
      (select count(*) from private.retention_candidates(v_step, p_policy, true)));
  end loop;
  return pg_catalog.jsonb_build_object('eligible', v_eligible, 'preserved', pg_catalog.jsonb_build_object(
    'dueWatchlistedListings', (select count(*) from public.app_listings as l
      where private.retention_listing_due(l.expires_at, coalesce(l.last_observed_at, l.first_seen_at), l.field_provenance, p_policy)
        and exists (select 1 from public.watchlist_items as w where w.app_id = l.app_id and w.country = l.country
          and w.requested_language = l.requested_language)),
    'unfinishedJobs', (select count(*) from private.collection_jobs as j where not private.retention_job_final(j.id)),
    'unknownRuns', (select count(*) from private.provider_runs as r where r.execution_status = 'unknown' or r.cost_status = 'unknown'),
    'unsettledRuns', (select count(*) from private.provider_runs as r where r.cost_status in ('reserved', 'unknown')),
    'periodsWithReservations', (select count(*) from private.budget_periods as b where b.reserved_usd <> 0)));
end;
$$;

-- One bounded batch of one step, in one transaction. Requires an approved policy and the lease.
create function public.appradar_retention_batch(p_policy jsonb, p_step text, p_holder uuid, p_limit integer) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_ids text[];
  v_big bigint[];
  v_uuid uuid[];
  v_rows integer := 0;
  v_children bigint := 0;
begin
  perform private.retention_check(p_policy);
  if pg_catalog.jsonb_typeof(p_policy->'approval') is distinct from 'object'
     or coalesce(pg_catalog.btrim(p_policy->'approval'->>'approvedBy'), '') = ''
     or coalesce(pg_catalog.btrim(p_policy->'approval'->>'approvedAt'), '') = '' then
    raise exception 'retention_policy_not_approved' using errcode = '42501';
  end if;
  if p_step is null or not p_step = any (array['review_observations', 'reviews', 'keyword_snapshots', 'discovery_snapshots',
       'app_snapshots', 'listing_metrics', 'listing_content', 'listings', 'provider_runs', 'collection_jobs', 'budget_periods'])
     or p_holder is null or p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'retention_batch_invalid' using errcode = '23514';
  end if;
  perform private.retention_require_watchlist_visibility();

  insert into private.retention_lock as held (singleton, holder, expires_at)
  values (true, p_holder, pg_catalog.clock_timestamp() + interval '5 minutes')
  on conflict (singleton) do update set holder = excluded.holder, expires_at = excluded.expires_at
  where held.holder = excluded.holder or held.expires_at <= pg_catalog.clock_timestamp();
  if not found then
    raise exception 'retention_cleanup_locked' using errcode = 'P0007';
  end if;

  v_ids := array(select c.id from private.retention_candidates(p_step, p_policy, false) as c order by c.id limit p_limit);

  -- Lock rows that collectors or users can change meanwhile, then judge eligibility again on the
  -- locked set. A watchlist insert holds a key lock on its listing, so that listing is skipped.
  -- Snapshot tables are immutable and carry no UPDATE privilege.
  if p_step = 'review_observations' then
    v_ids := array(select t.id::text from public.review_observations as t where t.id = any (v_ids::bigint[]) order by t.id for update skip locked);
  elsif p_step = 'reviews' then
    v_ids := array(select t.id::text from public.reviews as t where t.id = any (v_ids::bigint[]) order by t.id for update skip locked);
  elsif p_step in ('listing_metrics', 'listing_content', 'listings') then
    v_ids := array(select t.id::text from public.app_listings as t where t.id = any (v_ids::bigint[]) order by t.id for update skip locked);
  elsif p_step = 'provider_runs' then
    v_ids := array(select t.id::text from private.provider_runs as t where t.id = any (v_ids::uuid[]) order by t.id for update skip locked);
  elsif p_step = 'collection_jobs' then
    v_ids := array(select t.id::text from private.collection_jobs as t where t.id = any (v_ids::uuid[]) order by t.id for update skip locked);
  elsif p_step = 'budget_periods' then
    v_ids := array(select t.id::text from private.budget_periods as t where t.id = any (v_ids::uuid[]) order by t.id for update skip locked);
  end if;
  v_ids := array(select c.id from private.retention_candidates(p_step, p_policy, false) as c where c.id = any (v_ids));

  if p_step in ('provider_runs', 'collection_jobs', 'budget_periods') then
    v_uuid := v_ids::uuid[];
  else
    v_big := v_ids::bigint[];
  end if;

  case p_step
  when 'review_observations' then
    delete from public.review_observations where id = any (v_big);
  when 'reviews' then
    delete from public.reviews where id = any (v_big);
  when 'keyword_snapshots' then
    v_children := (select count(*) from public.keyword_entries where snapshot_id = any (v_big));
    delete from public.keyword_snapshots where id = any (v_big);
  when 'discovery_snapshots' then
    v_children := (select count(*) from public.discovery_entries where snapshot_id = any (v_big));
    delete from public.discovery_snapshots where id = any (v_big);
  when 'app_snapshots' then
    update public.app_listings set latest_snapshot_id = null where latest_snapshot_id = any (v_big);
    delete from public.app_snapshots where id = any (v_big);
  when 'listing_metrics' then
    update public.app_listings as l set
      rating_value = case when 'rating_value' = any (m.keys) then null else l.rating_value end,
      rating_count = case when 'rating_count' = any (m.keys) then null else l.rating_count end,
      review_count = case when 'review_count' = any (m.keys) then null else l.review_count end,
      price_amount = case when 'price' = any (m.keys) then null else l.price_amount end,
      currency = case when 'price' = any (m.keys) then null else l.currency end,
      is_free = case when 'price' = any (m.keys) then null else l.is_free end,
      installs_text = case when 'installs_text' = any (m.keys) then null else l.installs_text end,
      installs_lower_bound = case when 'installs_lower_bound' = any (m.keys) then null else l.installs_lower_bound end,
      field_provenance = l.field_provenance - m.keys
    from (select t.id, private.retention_stale_metrics(t.field_provenance, p_policy) as keys
          from public.app_listings as t where t.id = any (v_big)) as m
    where l.id = m.id;
  when 'listing_content' then
    -- Cleared values become unknown (null), never zero. expires_at only ever moves earlier.
    update public.app_listings set
      effective_language = null, name = null, developer_name = null, category_name = null, category_key = null,
      version = null, released_at = null, released_at_precision = null, store_updated_at = null,
      store_updated_at_precision = null, price_amount = null, currency = null, is_free = null, rating_value = null,
      rating_count = null, review_count = null, installs_text = null, installs_lower_bound = null,
      description = null, icon_url = null, screenshot_urls = null, field_provenance = '{}'::jsonb,
      expires_at = least(expires_at, pg_catalog.now())
    where id = any (v_big);
  when 'listings' then
    delete from public.app_listings where id = any (v_big);
  when 'provider_runs' then
    delete from private.provider_runs where id = any (v_uuid);
  when 'collection_jobs' then
    delete from private.collection_jobs where id = any (v_uuid);
  when 'budget_periods' then
    delete from private.budget_periods where id = any (v_uuid);
  end case;
  get diagnostics v_rows = row_count;

  return pg_catalog.jsonb_build_object('affected', v_rows, 'cascaded', v_children);
end;
$$;

create function public.appradar_retention_release(p_holder uuid) returns boolean
language plpgsql set search_path = '' as $$
begin
  delete from private.retention_lock where holder = p_holder;
  return found;
end;
$$;

do $$
declare f record;
begin
  for f in
    select p.oid::pg_catalog.regprocedure as signature from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where (n.nspname = 'public' and p.proname like 'appradar\_retention\_%')
       or (n.nspname = 'private' and p.proname like 'retention\_%')
  loop
    execute pg_catalog.format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute pg_catalog.format('grant execute on function %s to service_role', f.signature);
  end loop;
end;
$$;
