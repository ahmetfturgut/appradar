-- P1 ranking intelligence (Trending, New Releases, App Details rankings). Read-only.
-- Applied to the development Supabase project via appradar_meta.schema_migrations (2026-11-26).
-- Apply after 20261126000800_read_services, in one transaction.
-- SECURITY INVOKER, empty search_path, executable by service_role only (which may read private.*).
-- No tables, no writes, no new indexes: existing discovery_snapshots_history_idx and
-- discovery_entries_app_idx cover these queries.
--
-- Comparability facts come from the run that produced each snapshot:
--   run_validation_status / run_truncated  private.provider_runs
--   run_incomplete_reason                  provider_runs.error_sanitized (assessment reason; null = complete)
--   requested_depth                        provider_runs.expected_count, else the job scope's maxResults
-- The TypeScript layer (src/lib/intel/ranking.ts) decides eligibility from these facts; the SQL only reports them.

-- Snapshot facts for chart and new-app lists, newest first.
create function public.appradar_read_chart_facts(
  p_kind text default null, p_store text default null, p_country text default null,
  p_language text default null, p_category text default null, p_context text default null,
  p_source text default null, p_since timestamptz default null, p_limit integer default 200
) returns table (
  id bigint, kind text, source text, source_build text, store text, country text, requested_language text,
  context text, category text, coverage_status text, entry_count integer, observed_at timestamptz,
  observed_time_basis text, collected_at timestamptz, run_validation_status text, run_truncated boolean,
  run_incomplete_reason text, run_collection_mode text, requested_depth integer
)
language sql stable set search_path = '' as $$
  select s.id, s.kind, s.source, s.source_build, s.store, s.country, s.requested_language, s.context, s.category,
    s.coverage_status, s.entry_count, s.observed_at, s.observed_time_basis, s.collected_at,
    pr.validation_status, pr.truncated,
    case when pr.error_sanitized is null then null
         when pr.error_sanitized ~ '^[a-z][a-z0-9_:]{0,79}$' then pr.error_sanitized else 'other' end,
    job.collection_mode,
    coalesce(pr.expected_count,
      case when job.scope->>'maxResults' ~ '^[0-9]{1,4}$' then (job.scope->>'maxResults')::integer end)
  from public.discovery_snapshots as s
  left join private.provider_runs as pr on pr.provider = s.source and pr.external_run_id = s.source_run_id
  left join private.collection_jobs as job on job.id = pr.job_id
  where s.kind in ('chart', 'new_apps') and s.expires_at > pg_catalog.now()
    and (p_kind is null or s.kind = p_kind)
    and (p_store is null or s.store = p_store)
    and (p_country is null or s.country = p_country)
    and (p_language is null or s.requested_language = p_language)
    and (p_category is null or s.category = p_category)
    and (p_context is null or s.context = p_context)
    and (p_source is null or s.source = p_source)
    and (p_since is null or s.observed_at >= p_since)
  order by s.observed_at desc, s.id desc
  limit least(greatest(coalesce(p_limit, 200), 1), 1000);
$$;

-- Every snapshot (in the window) of each chart/new-app list the app appeared in at least once,
-- with the app's position or null when it was not in that snapshot. Null is "not observed in
-- this list", never a confirmed drop.
create function public.appradar_read_app_chart_history(
  p_app_id uuid, p_country text default null, p_language text default null,
  p_since timestamptz default null, p_limit integer default 500
) returns table (
  id bigint, kind text, source text, source_build text, store text, country text, requested_language text,
  context text, category text, coverage_status text, entry_count integer, observed_at timestamptz,
  observed_time_basis text, collected_at timestamptz, run_validation_status text, run_truncated boolean,
  run_incomplete_reason text, run_collection_mode text, requested_depth integer,
  app_present boolean, app_position integer
)
language sql stable set search_path = '' as $$
  with appeared as (
    select distinct s.kind, s.source, s.store, s.country, s.requested_language, s.context, s.category
    from public.discovery_entries as e
    join public.discovery_snapshots as s on s.id = e.snapshot_id
    where e.app_id = p_app_id and s.kind in ('chart', 'new_apps') and s.expires_at > pg_catalog.now()
      and (p_country is null or s.country = p_country)
      and (p_language is null or s.requested_language = p_language)
      and (p_since is null or s.observed_at >= p_since)
  )
  select s.id, s.kind, s.source, s.source_build, s.store, s.country, s.requested_language, s.context, s.category,
    s.coverage_status, s.entry_count, s.observed_at, s.observed_time_basis, s.collected_at,
    pr.validation_status, pr.truncated,
    case when pr.error_sanitized is null then null
         when pr.error_sanitized ~ '^[a-z][a-z0-9_:]{0,79}$' then pr.error_sanitized else 'other' end,
    job.collection_mode,
    coalesce(pr.expected_count,
      case when job.scope->>'maxResults' ~ '^[0-9]{1,4}$' then (job.scope->>'maxResults')::integer end),
    e.app_id is not null, e.position
  from public.discovery_snapshots as s
  join appeared as a on a.kind = s.kind and a.source = s.source and a.store = s.store and a.country = s.country
    and a.requested_language = s.requested_language and a.context = s.context and a.category is not distinct from s.category
  left join private.provider_runs as pr on pr.provider = s.source and pr.external_run_id = s.source_run_id
  left join private.collection_jobs as job on job.id = pr.job_id
  left join public.discovery_entries as e on e.snapshot_id = s.id and e.app_id = p_app_id
  where s.expires_at > pg_catalog.now() and (p_since is null or s.observed_at >= p_since)
  order by s.observed_at desc, s.id desc
  limit least(greatest(coalesce(p_limit, 500), 1), 2000);
$$;

-- Fix: the T8 version paired the two latest snapshots unconditionally. Pairs now require both
-- snapshots to be complete (accepted run, not truncated, no assessment reason, coverage 'bounded'),
-- with a known requested depth that the snapshot fully met, and the same depth on both sides.
-- The previous snapshot is the latest such snapshot before the current one, so an incomparable
-- run in between is skipped instead of silently compared. Signature and columns are unchanged.
create or replace function public.appradar_read_ranking_changes(
  p_store text default null, p_country text default null, p_language text default null,
  p_category text default null, p_context text default null,
  p_series_limit integer default 10, p_position_limit integer default 50
) returns table (
  snapshot_id bigint, previous_snapshot_id bigint, source text, store text, country text,
  requested_language text, context text, category text, coverage_status text, previous_coverage_status text,
  observed_at timestamptz, previous_observed_at timestamptz, app_id uuid, "position" integer,
  previous_position integer, change integer
)
language sql stable set search_path = '' as $$
  with eligible as (
    select s.id, s.source, s.store, s.country, s.requested_language, s.context, s.category, s.coverage_status,
      s.observed_at, s.entry_count as depth
    from public.discovery_snapshots as s
    join private.provider_runs as pr on pr.provider = s.source and pr.external_run_id = s.source_run_id
    join private.collection_jobs as job on job.id = pr.job_id
    where s.kind = 'chart' and s.expires_at > pg_catalog.now() and s.coverage_status = 'bounded'
      and pr.validation_status = 'accepted' and not pr.truncated and pr.error_sanitized is null
      and job.collection_mode = 'charts'
      and s.entry_count = coalesce(pr.expected_count,
        case when job.scope->>'maxResults' ~ '^[0-9]{1,4}$' then (job.scope->>'maxResults')::integer end)
      and (p_store is null or s.store = p_store)
      and (p_country is null or s.country = p_country)
      and (p_language is null or s.requested_language = p_language)
      and (p_category is null or s.category = p_category)
      and (p_context is null or s.context = p_context)
  ), latest as (
    select e.*, pg_catalog.row_number() over (partition by e.source, e.store, e.country, e.requested_language, e.context, e.category
      order by e.observed_at desc, e.id desc) as rn
    from eligible as e
  ), pairs as (
    select cur.id as cur_id, prev.id as prev_id, cur.source, cur.store, cur.country, cur.requested_language,
      cur.context, cur.category, cur.coverage_status, prev.coverage_status as prev_coverage,
      cur.observed_at, prev.observed_at as prev_observed_at
    from latest as cur
    join lateral (
      select p.id, p.coverage_status, p.observed_at from eligible as p
      where p.source = cur.source and p.store = cur.store and p.country = cur.country
        and p.requested_language = cur.requested_language and p.context = cur.context
        and p.category is not distinct from cur.category and p.depth = cur.depth
        and (p.observed_at, p.id) < (cur.observed_at, cur.id)
      order by p.observed_at desc, p.id desc limit 1
    ) as prev on true
    where cur.rn = 1
    order by cur.observed_at desc, cur.id desc
    limit least(greatest(coalesce(p_series_limit, 10), 1), 50)
  )
  select p.cur_id, p.prev_id, p.source, p.store, p.country, p.requested_language, p.context, p.category,
    p.coverage_status, p.prev_coverage, p.observed_at, p.prev_observed_at, e.app_id, e.position,
    pe.position, pe.position - e.position
  from pairs as p
  join public.discovery_entries as e on e.snapshot_id = p.cur_id
  left join public.discovery_entries as pe on pe.snapshot_id = p.prev_id and pe.app_id = e.app_id
  where e.position is not null and e.position <= least(greatest(coalesce(p_position_limit, 50), 1), 200)
  order by p.observed_at desc, p.cur_id, e.position;
$$;

revoke all on function
  public.appradar_read_chart_facts(text, text, text, text, text, text, text, timestamptz, integer),
  public.appradar_read_app_chart_history(uuid, text, text, timestamptz, integer),
  public.appradar_read_ranking_changes(text, text, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function
  public.appradar_read_chart_facts(text, text, text, text, text, text, text, timestamptz, integer),
  public.appradar_read_app_chart_history(uuid, text, text, timestamptz, integer),
  public.appradar_read_ranking_changes(text, text, text, text, text, integer, integer)
  to service_role;
