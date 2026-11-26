-- T2 only. PostgreSQL >= 15. Apply through the migration runner / one transaction.
-- Supabase roles must already exist. No Auth, ingestion, scheduler or retention policy.

create table public.developers (
  id uuid primary key default gen_random_uuid(),
  store text not null check (store in ('ios', 'play')),
  store_developer_id text not null check (store_developer_id = btrim(store_developer_id) and length(store_developer_id) between 1 and 200),
  name text check (name is null or length(btrim(name)) between 1 and 10000),
  store_url text,
  first_seen_at timestamptz not null check (isfinite(first_seen_at)),
  last_seen_at timestamptz not null check (isfinite(last_seen_at)),
  constraint developers_store_identity unique (store, store_developer_id),
  constraint developers_id_store unique (id, store),
  constraint developers_seen_order check (last_seen_at >= first_seen_at)
);

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  store text not null check (store in ('ios', 'play')),
  store_app_id text not null check (length(store_app_id) between 1 and 255),
  canonical_url text not null,
  developer_id uuid,
  first_seen_at timestamptz not null check (isfinite(first_seen_at)),
  last_seen_at timestamptz not null check (isfinite(last_seen_at)),
  constraint apps_store_identity unique (store, store_app_id),
  constraint apps_id_store unique (id, store),
  constraint apps_developer_same_store foreign key (developer_id, store) references public.developers (id, store),
  constraint apps_store_id_format check (
    (store = 'ios' and store_app_id ~ '^[0-9]+$') or
    (store = 'play' and store_app_id ~ '^[A-Za-z][A-Za-z0-9_]*([.][A-Za-z0-9_]+)+$')
  ),
  -- This is a country-neutral identity link; localized links are derived from listings.
  constraint apps_canonical_url check (canonical_url = case store
    when 'ios' then 'https://apps.apple.com/app/id' || store_app_id
    when 'play' then 'https://play.google.com/store/apps/details?id=' || store_app_id end),
  constraint apps_seen_order check (last_seen_at >= first_seen_at)
);
create index apps_developer_idx on public.apps (developer_id) where developer_id is not null;

create table public.app_listings (
  id bigint generated always as identity primary key,
  app_id uuid not null,
  -- Repeated only to enforce same-store FKs and unsupported iOS metrics in SQL.
  store text not null check (store in ('ios', 'play')),
  country text not null check (country ~ '^[A-Z]{2}$'),
  requested_language text not null check (requested_language ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' and length(requested_language) <= 35),
  effective_language text check (effective_language is null or (effective_language ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' and length(effective_language) <= 35)),
  name text check (name is null or length(btrim(name)) between 1 and 10000),
  developer_name text,
  category_name text,
  category_key text,
  version text,
  released_at timestamptz check (isfinite(released_at)),
  released_at_precision text check (released_at_precision in ('date', 'datetime')),
  store_updated_at timestamptz check (isfinite(store_updated_at)),
  store_updated_at_precision text check (store_updated_at_precision in ('date', 'datetime')),
  price_amount numeric(18,6) check (price_amount >= 0 and price_amount < 'Infinity'::numeric),
  currency text check (currency ~ '^[A-Z]{3}$'),
  is_free boolean,
  rating_value numeric check (rating_value between 0 and 5),
  rating_count bigint check (rating_count >= 0),
  review_count bigint check (review_count >= 0),
  installs_text text,
  installs_lower_bound bigint check (installs_lower_bound >= 0),
  latest_snapshot_id bigint,
  field_provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(field_provenance) = 'object'),
  first_seen_at timestamptz not null check (isfinite(first_seen_at)),
  last_observed_at timestamptz check (isfinite(last_observed_at)),
  expires_at timestamptz not null check (isfinite(expires_at)),
  constraint app_listings_app_same_store foreign key (app_id, store) references public.apps (id, store),
  constraint app_listings_context unique (app_id, country, requested_language),
  constraint app_listings_id_store unique (id, store),
  constraint app_listings_price_currency check (price_amount is null or currency is not null),
  constraint app_listings_free_price check (price_amount is null or is_free is null or (price_amount = 0) = is_free),
  constraint app_listings_ios_installs check (store <> 'ios' or (installs_text is null and installs_lower_bound is null)),
  constraint app_listings_release_precision check ((released_at is null) = (released_at_precision is null)),
  constraint app_listings_update_precision check ((store_updated_at is null) = (store_updated_at_precision is null)),
  constraint app_listings_release_day check (released_at_precision <> 'date' or released_at at time zone 'UTC' = date_trunc('day', released_at at time zone 'UTC')),
  constraint app_listings_update_day check (store_updated_at_precision <> 'date' or store_updated_at at time zone 'UTC' = date_trunc('day', store_updated_at at time zone 'UTC'))
);
create index app_listings_catalog_idx on public.app_listings (country, requested_language, category_key, rating_count desc nulls last, id);
create index app_listings_expiry_idx on public.app_listings (expires_at);

create table public.app_snapshots (
  id bigint generated always as identity primary key,
  listing_id bigint not null,
  store text not null check (store in ('ios', 'play')),
  -- T3 will relate these external run identifiers to provider_runs. No stub run table.
  source text not null check (source in ('aurelix', 'subimpact', 'datatrail')),
  source_run_id text not null check (source_run_id ~ '^[A-Za-z0-9]+$'),
  source_build text not null check (length(btrim(source_build)) between 1 and 100),
  schema_version smallint not null check (schema_version = 2),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  series_key text not null check (length(btrim(series_key)) between 1 and 200),
  effective_language text check (effective_language is null or (effective_language ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' and length(effective_language) <= 35)),
  observation_role text not null check (observation_role in ('detail', 'discovery')),
  collection_mode text not null check (collection_mode in ('details', 'search', 'charts', 'developers', 'reviews', 'negative')),
  collection_context text not null check (length(collection_context) <= 500),
  collection_category text check (length(collection_category) between 1 and 100),
  rank integer check (rank > 0),
  observed_at timestamptz not null check (isfinite(observed_at)),
  observed_time_basis text not null check (observed_time_basis in ('source', 'collection')),
  collected_at timestamptz not null check (isfinite(collected_at)),
  version text,
  released_at timestamptz check (isfinite(released_at)),
  released_at_precision text check (released_at_precision in ('date', 'datetime')),
  store_updated_at timestamptz check (isfinite(store_updated_at)),
  store_updated_at_precision text check (store_updated_at_precision in ('date', 'datetime')),
  price_amount numeric(18,6) check (price_amount >= 0 and price_amount < 'Infinity'::numeric),
  currency text check (currency ~ '^[A-Z]{3}$'),
  is_free boolean,
  rating_value numeric check (rating_value between 0 and 5),
  rating_count bigint check (rating_count >= 0),
  review_count bigint check (review_count >= 0),
  installs_text text,
  installs_lower_bound bigint check (installs_lower_bound >= 0),
  field_status jsonb not null check (
    jsonb_typeof(field_status) = 'object' and not jsonb_path_exists(field_status,
      '$.* ? (@.type() != "string" || (@ != "available" && @ != "missing" && @ != "unsupported"))')
  ),
  expires_at timestamptz not null check (isfinite(expires_at)),
  constraint app_snapshots_listing_same_store foreign key (listing_id, store) references public.app_listings (id, store),
  constraint app_snapshots_id_listing unique (id, listing_id),
  -- NULL effective language/category still represent one observation context.
  constraint app_snapshots_run_context unique nulls not distinct
    (listing_id, source, source_run_id, effective_language, observation_role, collection_mode, collection_context, collection_category),
  constraint app_snapshots_role_mode check (observation_role = case when collection_mode in ('details', 'negative') then 'detail' else 'discovery' end),
  constraint app_snapshots_category_mode check (collection_mode = 'charts' or collection_category is null),
  constraint app_snapshots_rank_mode check (rank is null or collection_mode in ('charts', 'search')),
  constraint app_snapshots_chart_context check (collection_mode <> 'charts' or (collection_category is not null and rank is not null and length(btrim(collection_context)) > 0)),
  constraint app_snapshots_search_context check (collection_mode <> 'search' or (rank is not null and length(btrim(collection_context)) > 0)),
  constraint app_snapshots_price_currency check (price_amount is null or currency is not null),
  constraint app_snapshots_free_price check (price_amount is null or is_free is null or (price_amount = 0) = is_free),
  constraint app_snapshots_ios_installs check (store <> 'ios' or (installs_text is null and installs_lower_bound is null)),
  constraint app_snapshots_observation_time check (observed_at <= collected_at + interval '5 minutes' and (observed_time_basis <> 'collection' or observed_at = collected_at)),
  constraint app_snapshots_release_precision check ((released_at is null) = (released_at_precision is null)),
  constraint app_snapshots_update_precision check ((store_updated_at is null) = (store_updated_at_precision is null)),
  constraint app_snapshots_release_day check (released_at_precision <> 'date' or released_at at time zone 'UTC' = date_trunc('day', released_at at time zone 'UTC')),
  constraint app_snapshots_update_day check (store_updated_at_precision <> 'date' or store_updated_at at time zone 'UTC' = date_trunc('day', store_updated_at at time zone 'UTC'))
);
create index app_snapshots_history_idx on public.app_snapshots (listing_id, series_key, observed_at desc);
create index app_snapshots_run_idx on public.app_snapshots (source, source_run_id);
create index app_snapshots_expiry_idx on public.app_snapshots (expires_at);
alter table public.app_listings add constraint app_listings_latest_same_listing
  foreign key (latest_snapshot_id, id) references public.app_snapshots (id, listing_id)
  deferrable initially immediate;

create function public.appradar_reject_snapshot_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'App snapshots are immutable; insert a new observation'
    using errcode = '55000';
end;
$$;
revoke all on function public.appradar_reject_snapshot_update() from public, anon, authenticated, service_role;
create trigger app_snapshots_immutable before update on public.app_snapshots
  for each row execute function public.appradar_reject_snapshot_update();

-- Closed by default: no client policies, RPCs, Auth or publication decision in T2.
alter table public.developers enable row level security;
alter table public.apps enable row level security;
alter table public.app_listings enable row level security;
alter table public.app_snapshots enable row level security;
revoke all on public.developers, public.apps, public.app_listings, public.app_snapshots from public, anon, authenticated, service_role;
revoke all on sequence public.app_listings_id_seq, public.app_snapshots_id_seq from public, anon, authenticated, service_role;
grant usage on schema public to service_role;
grant select, insert, delete on public.developers, public.apps, public.app_listings to service_role;
-- Server upserts may refresh data, not move an existing identity/history to another app.
grant update (name, store_url, first_seen_at, last_seen_at) on public.developers to service_role;
grant update (developer_id, first_seen_at, last_seen_at) on public.apps to service_role;
grant update (effective_language, name, developer_name, category_name, category_key, version,
  released_at, released_at_precision, store_updated_at, store_updated_at_precision,
  price_amount, currency, is_free, rating_value, rating_count, review_count,
  installs_text, installs_lower_bound, latest_snapshot_id, field_provenance,
  first_seen_at, last_observed_at, expires_at) on public.app_listings to service_role;
grant select, insert, delete on public.app_snapshots to service_role;
grant usage, select on sequence public.app_listings_id_seq, public.app_snapshots_id_seq to service_role;
