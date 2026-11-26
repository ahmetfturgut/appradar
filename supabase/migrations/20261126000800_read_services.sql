-- T8 read helpers. Apply after collection bridge, in one transaction. Not applied remotely yet.
-- Read-only, SECURITY INVOKER, empty search_path, executable by service_role only.
-- Expired rows (expires_at <= now()) are never returned. Unknown values stay null.

-- Catalog totals over listings that have not expired.
create function public.appradar_read_catalog_stats(p_store text default null, p_country text default null)
returns jsonb
language sql stable set search_path = '' as $$
  with l as (
    select listing.app_id, listing.store, listing.country, listing.category_name, listing.last_observed_at
    from public.app_listings as listing
    where listing.expires_at > pg_catalog.now()
      and (p_store is null or listing.store = p_store)
      and (p_country is null or listing.country = p_country)
  )
  select pg_catalog.jsonb_build_object(
    'apps', (select count(distinct app_id) from l),
    'listings', (select count(*) from l),
    'iosApps', (select count(distinct app_id) from l where store = 'ios'),
    'playApps', (select count(distinct app_id) from l where store = 'play'),
    'developers', (select count(distinct app.developer_id) from public.apps as app
      where app.developer_id is not null and app.id in (select app_id from l)),
    'countries', (select count(distinct country) from l),
    'categories', (select count(distinct category_name) from l where category_name is not null),
    'uncategorizedListings', (select count(*) from l where category_name is null),
    'latestObservedAt', (select max(last_observed_at) from l),
    'oldestObservedAt', (select min(last_observed_at) from l),
    'chartSnapshots', (select count(*) from public.discovery_snapshots as s
      where s.kind = 'chart' and s.expires_at > pg_catalog.now()
        and (p_store is null or s.store = p_store) and (p_country is null or s.country = p_country)),
    'keywordSnapshots', (select count(*) from public.keyword_snapshots as k
      where k.expires_at > pg_catalog.now()
        and (p_store is null or k.store = p_store) and (p_country is null or k.country = p_country))
  );
$$;

-- Missing categories are reported as a null category, never folded into another bucket.
create function public.appradar_read_category_distribution(
  p_store text default null, p_country text default null, p_language text default null, p_limit integer default 100
) returns table (category text, app_count bigint, listing_count bigint)
language sql stable set search_path = '' as $$
  select listing.category_name, count(distinct listing.app_id), count(*)
  from public.app_listings as listing
  where listing.expires_at > pg_catalog.now()
    and (p_store is null or listing.store = p_store)
    and (p_country is null or listing.country = p_country)
    and (p_language is null or listing.requested_language = p_language)
  group by listing.category_name
  order by count(distinct listing.app_id) desc, listing.category_name nulls last
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

-- Latest snapshot per list definition (kind, source, store, country, language, context, category).
create function public.appradar_read_latest_discovery(
  p_kind text default null, p_store text default null, p_country text default null,
  p_language text default null, p_category text default null, p_limit integer default 50
) returns table (
  id bigint, kind text, source text, store text, country text, requested_language text, effective_language text,
  context text, category text, coverage_status text, entry_count integer, observed_at timestamptz,
  observed_time_basis text, collected_at timestamptz, previous_observed_at timestamptz, snapshot_count bigint
)
language sql stable set search_path = '' as $$
  select w.id, w.kind, w.source, w.store, w.country, w.requested_language, w.effective_language, w.context,
    w.category, w.coverage_status, w.entry_count, w.observed_at, w.observed_time_basis, w.collected_at,
    w.previous_observed_at, w.snapshot_count
  from (
    select s.*,
      pg_catalog.row_number() over series as rn,
      pg_catalog.lead(s.observed_at) over series as previous_observed_at,
      count(*) over (partition by s.kind, s.source, s.store, s.country, s.requested_language, s.context, s.category) as snapshot_count
    from public.discovery_snapshots as s
    where s.expires_at > pg_catalog.now()
      and (p_kind is null or s.kind = p_kind)
      and (p_store is null or s.store = p_store)
      and (p_country is null or s.country = p_country)
      and (p_language is null or s.requested_language = p_language)
      and (p_category is null or s.category = p_category)
    window series as (partition by s.kind, s.source, s.store, s.country, s.requested_language, s.context, s.category
      order by s.observed_at desc, s.id desc)
  ) as w
  where w.rn = 1
  order by w.observed_at desc, w.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- Chart position changes between the two latest snapshots of the same list definition.
-- change = previous_position - position (positive is a rise). An app missing from the
-- previous snapshot has a null previous_position: absence is not a rank drop or a new entry.
create function public.appradar_read_ranking_changes(
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
  with ranked as (
    select s.id, s.source, s.store, s.country, s.requested_language, s.context, s.category,
      s.coverage_status, s.observed_at,
      pg_catalog.row_number() over (partition by s.source, s.store, s.country, s.requested_language, s.context, s.category
        order by s.observed_at desc, s.id desc) as rn
    from public.discovery_snapshots as s
    where s.kind = 'chart' and s.expires_at > pg_catalog.now()
      and (p_store is null or s.store = p_store)
      and (p_country is null or s.country = p_country)
      and (p_language is null or s.requested_language = p_language)
      and (p_category is null or s.category = p_category)
      and (p_context is null or s.context = p_context)
  ), pairs as (
    select cur.id as cur_id, prev.id as prev_id, cur.source, cur.store, cur.country, cur.requested_language,
      cur.context, cur.category, cur.coverage_status, prev.coverage_status as prev_coverage,
      cur.observed_at, prev.observed_at as prev_observed_at
    from ranked as cur
    join ranked as prev on prev.rn = 2 and prev.source = cur.source and prev.store = cur.store
      and prev.country = cur.country and prev.requested_language = cur.requested_language
      and prev.context = cur.context and prev.category is not distinct from cur.category
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

-- Latest snapshot per keyword context (store, country, language, keyword), paginated.
create function public.appradar_read_keyword_latest(
  p_store text default null, p_country text default null, p_language text default null,
  p_query text default null, p_limit integer default 25, p_offset integer default 0
) returns table (
  snapshot_id bigint, keyword text, store text, country text, requested_language text, effective_language text,
  coverage_status text, observed_at timestamptz, collected_at timestamptz, snapshot_count bigint, total_count bigint
)
language sql stable set search_path = '' as $$
  select w.id, w.keyword, w.store, w.country, w.requested_language, w.effective_language, w.coverage_status,
    w.observed_at, w.collected_at, w.snapshot_count, count(*) over ()
  from (
    select k.*,
      pg_catalog.row_number() over series as rn,
      count(*) over (partition by k.store, k.country, k.requested_language, k.keyword) as snapshot_count
    from public.keyword_snapshots as k
    where k.expires_at > pg_catalog.now()
      and (p_store is null or k.store = p_store)
      and (p_country is null or k.country = p_country)
      and (p_language is null or k.requested_language = p_language)
      and (p_query is null or k.keyword ilike '%' || pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
        p_query, '\', '\\'), '%', '\%'), '_', '\_') || '%')
    window series as (partition by k.store, k.country, k.requested_language, k.keyword order by k.observed_at desc, k.id desc)
  ) as w
  where w.rn = 1
  order by w.keyword, w.store, w.country, w.requested_language
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset least(greatest(coalesce(p_offset, 0), 0), 10000);
$$;

create index if not exists app_listings_released_idx on public.app_listings (store, released_at desc)
  where released_at is not null;
create index if not exists app_listings_observed_idx on public.app_listings (last_observed_at desc nulls last);
create index if not exists reviews_app_rating_idx on public.reviews (app_id, rating);

revoke all on function
  public.appradar_read_catalog_stats(text, text),
  public.appradar_read_category_distribution(text, text, text, integer),
  public.appradar_read_latest_discovery(text, text, text, text, text, integer),
  public.appradar_read_ranking_changes(text, text, text, text, text, integer, integer),
  public.appradar_read_keyword_latest(text, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function
  public.appradar_read_catalog_stats(text, text),
  public.appradar_read_category_distribution(text, text, text, integer),
  public.appradar_read_latest_discovery(text, text, text, text, text, integer),
  public.appradar_read_ranking_changes(text, text, text, text, text, integer, integer),
  public.appradar_read_keyword_latest(text, text, text, text, integer, integer)
  to service_role;
