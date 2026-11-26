-- T7 only. Apply after reviews, in one transaction.
-- popularity is a source score (Apple Search Popularity or proxy), never search volume.

create table public.keyword_snapshots (
  id bigint generated always as identity primary key,
  source text not null check (source = 'asokeyword'),
  source_run_id text not null,
  source_build text not null check (length(btrim(source_build)) between 1 and 100),
  schema_version smallint not null check (schema_version = 2),
  store text not null check (store in ('ios', 'play')),
  keyword text not null check (length(keyword) between 1 and 10000),
  country text not null check (country ~ '^[A-Z]{2}$'),
  requested_language text not null check (length(requested_language) between 2 and 35),
  effective_language text check (length(effective_language) between 2 and 35),
  relevant_filters jsonb not null check (jsonb_typeof(relevant_filters) = 'object'),
  coverage_status text not null check (coverage_status in ('bounded', 'partial', 'truncated')),
  observed_at timestamptz not null check (isfinite(observed_at)),
  collected_at timestamptz not null check (isfinite(collected_at)),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null check (isfinite(expires_at)),
  constraint keyword_snapshots_run_context unique (source, source_run_id, store, country, requested_language, keyword),
  constraint keyword_snapshots_id_store unique (id, store),
  constraint keyword_snapshots_run_fk foreign key (source, source_run_id)
    references private.provider_runs (provider, external_run_id)
);
create index keyword_snapshots_history_idx on public.keyword_snapshots
  (store, country, requested_language, keyword, observed_at desc);
create index keyword_snapshots_expiry_idx on public.keyword_snapshots (expires_at);

create table public.keyword_entries (
  id bigint generated always as identity primary key,
  snapshot_id bigint not null,
  store text not null,
  row_type text not null check (row_type in ('ranking', 'suggestion', 'metrics')),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  -- Series identity: includes build, filters and Apple/proxy/unknown popularity source.
  context_key text not null check (context_key ~ '^[a-f0-9]{64}$'),
  measurement_method text not null check (length(measurement_method) between 1 and 300),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  rank integer check (rank > 0),
  app_id uuid,
  store_app_id text,
  app_name text,
  developer_name text,
  rating_value numeric check (rating_value between 0 and 5),
  suggestion text,
  popularity numeric check (popularity between 0 and 100),
  popularity_proxy numeric check (popularity_proxy between 0 and 100),
  popularity_source text check (popularity_source in ('apple', 'proxy')),
  difficulty numeric check (difficulty between 0 and 100),
  measured_at timestamptz check (isfinite(measured_at)),
  stale boolean,
  metrics_error text,
  field_status jsonb not null check (jsonb_typeof(field_status) = 'object'),
  checked_at timestamptz not null check (isfinite(checked_at)),
  foreign key (snapshot_id, store) references public.keyword_snapshots (id, store) on delete cascade,
  foreign key (app_id, store) references public.apps (id, store),
  constraint keyword_entries_ranking check (row_type <> 'ranking' or (rank is not null and store_app_id is not null)),
  constraint keyword_entries_suggestion check (row_type <> 'suggestion' or suggestion is not null),
  constraint keyword_entries_metrics_only check (row_type = 'metrics'
    or (popularity is null and popularity_proxy is null and popularity_source is null and difficulty is null))
);
create index keyword_entries_snapshot_idx on public.keyword_entries (snapshot_id);
create index keyword_entries_series_idx on public.keyword_entries (context_key, checked_at desc);
create index keyword_entries_app_idx on public.keyword_entries (app_id) where app_id is not null;

create trigger keyword_snapshots_immutable before update on public.keyword_snapshots
  for each row execute function private.reject_history_update();
create trigger keyword_entries_immutable before update on public.keyword_entries
  for each row execute function private.reject_history_update();

create function public.appradar_persist_keywords(
  p_provider text, p_external_run_id text, p_snapshots jsonb, p_expires_at timestamptz
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_mode text;
  v_truncated boolean;
  v_invalid integer;
  s jsonb;
  e jsonb;
  v_id bigint;
  v_hash text;
  v_app uuid;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_conflicts integer := 0;
begin
  select job_mode, run_truncated, run_invalid_count into v_mode, v_truncated, v_invalid
  from private.require_ingestible_run(p_provider, p_external_run_id, true);
  if v_mode <> 'keywords' or p_snapshots is null or pg_catalog.jsonb_typeof(p_snapshots) <> 'array' then
    raise exception 'keyword_batch_invalid' using errcode = '23514';
  end if;

  for s in select item.value from pg_catalog.jsonb_array_elements(p_snapshots) as item(value)
    order by item.value->>'keyword'
  loop
    if s->>'source' is distinct from p_provider or s->>'sourceRunId' is distinct from p_external_run_id then
      raise exception 'keyword_run_mismatch' using errcode = '23514';
    end if;
    perform private.require_expiry(p_expires_at, (s->>'collectedAt')::timestamptz);

    v_id := null;
    insert into public.keyword_snapshots (source, source_run_id, source_build, schema_version, store, keyword,
      country, requested_language, effective_language, relevant_filters, coverage_status,
      observed_at, collected_at, payload_hash, expires_at)
    values (p_provider, p_external_run_id, s->>'sourceBuild', (s->>'schemaVersion')::smallint, s->>'store',
      s->>'keyword', s->>'country', s->>'requestedLanguage', s->>'effectiveLanguage', s->'relevantFilters',
      case when v_truncated then 'truncated' when coalesce(v_invalid, 0) > 0 then 'partial' else 'bounded' end,
      (s->>'observedAt')::timestamptz, (s->>'collectedAt')::timestamptz, s->>'payloadHash', p_expires_at)
    on conflict on constraint keyword_snapshots_run_context do nothing
    returning id into v_id;

    if v_id is null then
      select payload_hash into v_hash from public.keyword_snapshots
      where source = p_provider and source_run_id = p_external_run_id and store = s->>'store'
        and country = s->>'country' and requested_language = s->>'requestedLanguage' and keyword = s->>'keyword';
      if v_hash = s->>'payloadHash' then v_duplicates := v_duplicates + 1;
      else v_conflicts := v_conflicts + 1; end if;
      continue;
    end if;
    v_inserted := v_inserted + 1;

    for e in select item.value from pg_catalog.jsonb_array_elements(s->'entries') as item(value)
      order by item.value->>'storeAppId', item.value->>'idempotencyKey'
    loop
      v_app := null;
      -- An app id this catalog cannot validate is kept as text and left unlinked.
      if e->>'rowType' = 'ranking' and (
           (s->>'store' = 'ios' and e->>'storeAppId' ~ '^[0-9]+$') or
           (s->>'store' = 'play' and e->>'storeAppId' ~ '^[A-Za-z][A-Za-z0-9_]*([.][A-Za-z0-9_]+)+$'))
         and length(e->>'storeAppId') <= 255 then
        v_app := private.upsert_app_identity(s->>'store', e->>'storeAppId', (e->>'checkedAt')::timestamptz);
      end if;
      insert into public.keyword_entries (snapshot_id, store, row_type, idempotency_key, context_key,
        measurement_method, payload_hash, rank, app_id, store_app_id, app_name, developer_name, rating_value,
        suggestion, popularity, popularity_proxy, popularity_source, difficulty, measured_at, stale,
        metrics_error, field_status, checked_at)
      values (v_id, s->>'store', e->>'rowType', e->>'idempotencyKey', e->>'keywordContextKey',
        e->>'measurementMethod', e->>'payloadHash', (e->>'rank')::integer, v_app, e->>'storeAppId', e->>'appName',
        e->>'developerName', (e->>'ratingValue')::numeric, e->>'suggestion', (e->>'popularity')::numeric,
        (e->>'popularityProxy')::numeric, e->>'popularitySource', (e->>'difficulty')::numeric,
        (e->>'measuredAt')::timestamptz, (e->>'stale')::boolean, e->>'metricsError', e->'fieldStatus',
        (e->>'checkedAt')::timestamptz);
    end loop;
  end loop;

  return pg_catalog.jsonb_build_object('inserted', v_inserted, 'duplicates', v_duplicates, 'conflicts', v_conflicts);
end;
$$;

alter table public.keyword_snapshots enable row level security;
alter table public.keyword_entries enable row level security;
revoke all on public.keyword_snapshots, public.keyword_entries from public, anon, authenticated, service_role;
revoke all on sequence public.keyword_snapshots_id_seq, public.keyword_entries_id_seq from public, anon, authenticated, service_role;
grant select, insert, delete on public.keyword_snapshots, public.keyword_entries to service_role;
grant usage, select on sequence public.keyword_snapshots_id_seq, public.keyword_entries_id_seq to service_role;
revoke all on function public.appradar_persist_keywords(text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.appradar_persist_keywords(text, text, jsonb, timestamptz) to service_role;
