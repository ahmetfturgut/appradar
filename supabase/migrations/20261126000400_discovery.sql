-- T5 only. Apply after app persistence, in one transaction.
-- A snapshot describes what one run returned. Absence from it is not a rank drop or removal.

create table public.discovery_snapshots (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('search', 'chart', 'developer', 'new_apps')),
  source text not null check (source in ('aurelix', 'subimpact', 'datatrail')),
  source_run_id text not null,
  source_build text not null check (length(btrim(source_build)) between 1 and 100),
  store text not null check (store in ('ios', 'play')),
  country text not null check (country ~ '^[A-Z]{2}$'),
  requested_language text not null check (length(requested_language) between 2 and 35),
  effective_language text check (length(effective_language) between 2 and 35),
  context text not null check (length(context) between 1 and 500),
  category text check (length(category) between 1 and 100),
  -- 'bounded' is a capped list, never the whole market. 'partial' lost invalid rows.
  coverage_status text not null check (coverage_status in ('bounded', 'partial', 'truncated')),
  entry_count integer not null check (entry_count > 0),
  observed_at timestamptz not null check (isfinite(observed_at)),
  observed_time_basis text not null check (observed_time_basis in ('source', 'collection')),
  collected_at timestamptz not null check (isfinite(collected_at)),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null check (isfinite(expires_at)),
  constraint discovery_snapshots_run_context unique nulls not distinct
    (source, source_run_id, store, country, requested_language, kind, context, category),
  constraint discovery_snapshots_id_store unique (id, store),
  constraint discovery_snapshots_run_fk foreign key (source, source_run_id)
    references private.provider_runs (provider, external_run_id)
);
create index discovery_snapshots_history_idx on public.discovery_snapshots
  (kind, store, country, requested_language, context, observed_at desc);
create index discovery_snapshots_expiry_idx on public.discovery_snapshots (expires_at);

create table public.discovery_entries (
  snapshot_id bigint not null,
  store text not null,
  app_id uuid not null,
  position integer check (position > 0),
  observation_key text not null check (observation_key ~ '^[a-f0-9]{64}$'),
  primary key (snapshot_id, app_id),
  foreign key (snapshot_id, store) references public.discovery_snapshots (id, store) on delete cascade,
  foreign key (app_id, store) references public.apps (id, store)
);
create index discovery_entries_app_idx on public.discovery_entries (app_id);

create function private.reject_history_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'history_is_immutable' using errcode = '55000';
end;
$$;
create trigger discovery_snapshots_immutable before update on public.discovery_snapshots
  for each row execute function private.reject_history_update();
create trigger discovery_entries_immutable before update on public.discovery_entries
  for each row execute function private.reject_history_update();

create function public.appradar_persist_discovery(
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
  if p_snapshots is null or pg_catalog.jsonb_typeof(p_snapshots) <> 'array' then
    raise exception 'snapshots_must_be_array' using errcode = '23514';
  end if;

  for s in select item.value from pg_catalog.jsonb_array_elements(p_snapshots) as item(value)
    order by item.value->>'context', item.value->>'category'
  loop
    if s->>'source' is distinct from p_provider or s->>'sourceRunId' is distinct from p_external_run_id
       or s->>'mode' is distinct from v_mode
       or v_mode not in ('search', 'charts', 'developers')
       or (s->>'kind' = 'search') <> (v_mode = 'search')
       or (s->>'kind' = 'developer') <> (v_mode = 'developers') then
      raise exception 'snapshot_run_mismatch' using errcode = '23514';
    end if;
    perform private.require_expiry(p_expires_at, (s->>'collectedAt')::timestamptz);

    v_id := null;
    insert into public.discovery_snapshots (kind, source, source_run_id, source_build, store, country,
      requested_language, effective_language, context, category, coverage_status, entry_count,
      observed_at, observed_time_basis, collected_at, payload_hash, expires_at)
    values (s->>'kind', p_provider, p_external_run_id, s->>'sourceBuild', s->>'store', s->>'country',
      s->>'requestedLanguage', s->>'effectiveLanguage', s->>'context', s->>'category',
      case when v_truncated then 'truncated' when coalesce(v_invalid, 0) > 0 then 'partial' else 'bounded' end,
      pg_catalog.jsonb_array_length(s->'entries'), (s->>'observedAt')::timestamptz, s->>'observedTimeBasis',
      (s->>'collectedAt')::timestamptz, s->>'payloadHash', p_expires_at)
    on conflict on constraint discovery_snapshots_run_context do nothing
    returning id into v_id;

    if v_id is null then
      select payload_hash into v_hash from public.discovery_snapshots
      where source = p_provider and source_run_id = p_external_run_id and store = s->>'store'
        and country = s->>'country' and requested_language = s->>'requestedLanguage'
        and kind = s->>'kind' and context = s->>'context' and category is not distinct from s->>'category';
      if v_hash = s->>'payloadHash' then v_duplicates := v_duplicates + 1;
      else v_conflicts := v_conflicts + 1; end if;
      continue;
    end if;
    v_inserted := v_inserted + 1;

    for e in select item.value from pg_catalog.jsonb_array_elements(s->'entries') as item(value)
      order by item.value->>'storeAppId'
    loop
      if s->>'kind' <> 'developer' and e->>'position' is null then
        raise exception 'ranked_entry_requires_position' using errcode = '23514';
      end if;
      -- Identity only: a summary never writes listing state from here.
      v_app := private.upsert_app_identity(s->>'store', e->>'storeAppId', (s->>'observedAt')::timestamptz);
      insert into public.discovery_entries (snapshot_id, store, app_id, position, observation_key)
      values (v_id, s->>'store', v_app, (e->>'position')::integer, e->>'observationKey');
    end loop;
  end loop;

  return pg_catalog.jsonb_build_object('inserted', v_inserted, 'duplicates', v_duplicates, 'conflicts', v_conflicts);
end;
$$;

alter table public.discovery_snapshots enable row level security;
alter table public.discovery_entries enable row level security;
revoke all on public.discovery_snapshots, public.discovery_entries from public, anon, authenticated, service_role;
revoke all on sequence public.discovery_snapshots_id_seq from public, anon, authenticated, service_role;
grant select, insert, delete on public.discovery_snapshots, public.discovery_entries to service_role;
grant usage, select on sequence public.discovery_snapshots_id_seq to service_role;
revoke all on function private.reject_history_update(), public.appradar_persist_discovery(text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.appradar_persist_discovery(text, text, jsonb, timestamptz) to service_role;
