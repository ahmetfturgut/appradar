-- T6 only. Apply after discovery, in one transaction.
-- Review content is private: no client policy or grant. No reviewer identity is stored.

create table public.reviews (
  id bigint generated always as identity primary key,
  canonical_review_key text not null unique check (canonical_review_key ~ '^[a-f0-9]{64}$'),
  app_id uuid not null,
  store text not null check (store in ('ios', 'play')),
  -- Identity is scoped to one provider namespace. Namespaces are never merged.
  review_id_namespace text not null check (review_id_namespace ~ '^actor:.+'),
  source_review_id text not null check (length(source_review_id) between 1 and 10000),
  rating numeric not null check (rating between 0 and 5),
  title text,
  body text,
  reviewed_at timestamptz check (isfinite(reviewed_at)),
  app_version text,
  developer_reply text,
  developer_reply_at timestamptz check (isfinite(developer_reply_at)),
  helpful_votes bigint check (helpful_votes >= 0),
  total_votes bigint check (total_votes >= 0),
  current_observed_at timestamptz not null check (isfinite(current_observed_at)),
  first_seen_at timestamptz not null check (isfinite(first_seen_at)),
  last_seen_at timestamptz not null check (isfinite(last_seen_at)),
  expires_at timestamptz not null check (isfinite(expires_at)),
  constraint reviews_namespace_identity unique (app_id, review_id_namespace, source_review_id),
  foreign key (app_id, store) references public.apps (id, store)
);
create index reviews_app_date_idx on public.reviews (app_id, reviewed_at desc);
create index reviews_expiry_idx on public.reviews (expires_at);

-- One row per content change within a country/language context, not per run.
create table public.review_observations (
  id bigint generated always as identity primary key,
  review_id bigint not null references public.reviews (id) on delete cascade,
  source text not null check (source in ('aurelix', 'thewolves', 'aurelixplayreviews')),
  source_run_id text not null,
  source_build text not null check (length(btrim(source_build)) between 1 and 100),
  schema_version smallint not null check (schema_version = 2),
  idempotency_key text not null unique check (idempotency_key ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  country text not null check (country ~ '^[A-Z]{2}$'),
  requested_language text not null check (length(requested_language) between 2 and 35),
  effective_language text check (length(effective_language) between 2 and 35),
  rating numeric not null check (rating between 0 and 5),
  title text,
  body text,
  reviewed_at timestamptz check (isfinite(reviewed_at)),
  app_version text,
  developer_reply text,
  developer_reply_at timestamptz check (isfinite(developer_reply_at)),
  field_status jsonb not null check (jsonb_typeof(field_status) = 'object'),
  observed_at timestamptz not null check (isfinite(observed_at)),
  observed_time_basis text not null check (observed_time_basis in ('source', 'collection')),
  collected_at timestamptz not null check (isfinite(collected_at)),
  last_seen_at timestamptz not null check (isfinite(last_seen_at)),
  expires_at timestamptz not null check (isfinite(expires_at)),
  constraint review_observations_run_fk foreign key (source, source_run_id)
    references private.provider_runs (provider, external_run_id)
);
create index review_observations_history_idx on public.review_observations
  (review_id, country, requested_language, observed_at desc);
create index review_observations_expiry_idx on public.review_observations (expires_at);

create function private.review_observations_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if pg_catalog.to_jsonb(new) - 'last_seen_at' - 'expires_at'
     is distinct from pg_catalog.to_jsonb(old) - 'last_seen_at' - 'expires_at' then
    raise exception 'history_is_immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger review_observations_immutable before update on public.review_observations
  for each row execute function private.review_observations_guard();

create function public.appradar_persist_reviews(
  p_provider text, p_external_run_id text, p_reviews jsonb, p_expires_at timestamptz
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_mode text;
  o jsonb;
  v_app uuid;
  r public.reviews%rowtype;
  prev public.review_observations%rowtype;
  v_hash text;
  v_observed timestamptz;
  v_collected timestamptz;
  v_newer boolean;
  v_inserted integer := 0;
  v_unchanged integer := 0;
  v_duplicates integer := 0;
  v_conflicts integer := 0;
begin
  select job_mode into v_mode from private.require_ingestible_run(p_provider, p_external_run_id, false);
  if v_mode <> 'reviews' or p_reviews is null or pg_catalog.jsonb_typeof(p_reviews) <> 'array' then
    raise exception 'review_batch_invalid' using errcode = '23514';
  end if;

  for o in select item.value from pg_catalog.jsonb_array_elements(p_reviews) as item(value)
    order by item.value->>'canonicalReviewKey', item.value->>'observedAt', item.value->>'idempotencyKey'
  loop
    if o->>'source' is distinct from p_provider or o->>'sourceRunId' is distinct from p_external_run_id then
      raise exception 'review_run_mismatch' using errcode = '23514';
    end if;
    v_observed := (o->>'observedAt')::timestamptz;
    v_collected := (o->>'collectedAt')::timestamptz;
    perform private.require_expiry(p_expires_at, v_collected);

    v_app := private.upsert_app_identity(o->>'store', o->>'storeAppId', v_observed);
    insert into public.reviews (canonical_review_key, app_id, store, review_id_namespace, source_review_id,
      rating, current_observed_at, first_seen_at, last_seen_at, expires_at)
    values (o->>'canonicalReviewKey', v_app, o->>'store', o->>'reviewIdNamespace', o->>'sourceReviewId',
      (o->>'rating')::numeric, v_observed, v_observed, v_observed, p_expires_at)
    on conflict (canonical_review_key) do nothing;
    select * into r from public.reviews where canonical_review_key = o->>'canonicalReviewKey' for update;
    if r.app_id <> v_app or r.review_id_namespace <> o->>'reviewIdNamespace' or r.source_review_id <> o->>'sourceReviewId' then
      raise exception 'review_identity_mismatch' using errcode = '23514';
    end if;

    select payload_hash into v_hash from public.review_observations where idempotency_key = o->>'idempotencyKey';
    if found then
      if v_hash = o->>'payloadHash' then v_duplicates := v_duplicates + 1;
      else v_conflicts := v_conflicts + 1; end if;
      continue;
    end if;

    -- Compare with the state in force at that time, so late replays do not duplicate history.
    select * into prev from public.review_observations
    where review_id = r.id and country = o->>'country' and requested_language = o->>'requestedLanguage'
      and effective_language is not distinct from o->>'language' and observed_at <= v_observed
    order by observed_at desc, id desc limit 1;
    if found and prev.content_hash = o->>'contentHash' then
      update public.review_observations set
        last_seen_at = greatest(last_seen_at, v_observed), expires_at = greatest(expires_at, p_expires_at)
      where id = prev.id;
      v_unchanged := v_unchanged + 1;
    else
      insert into public.review_observations (review_id, source, source_run_id, source_build, schema_version,
        idempotency_key, payload_hash, content_hash, country, requested_language, effective_language, rating,
        title, body, reviewed_at, app_version, developer_reply, developer_reply_at, field_status,
        observed_at, observed_time_basis, collected_at, last_seen_at, expires_at)
      values (r.id, p_provider, p_external_run_id, o->>'sourceBuild', (o->>'schemaVersion')::smallint,
        o->>'idempotencyKey', o->>'payloadHash', o->>'contentHash', o->>'country', o->>'requestedLanguage',
        o->>'language', (o->>'rating')::numeric, o->>'title', o->>'text', (o->>'reviewedAt')::timestamptz,
        o->>'appVersion', o->>'developerReply', (o->>'developerReplyAt')::timestamptz, o->'fieldStatus',
        v_observed, o->>'observedTimeBasis', v_collected, v_observed, p_expires_at);
      v_inserted := v_inserted + 1;
    end if;

    -- Current view: newer observations win; unknown values only ever fill gaps.
    v_newer := v_observed >= r.current_observed_at;
    update public.reviews set
      rating = case when v_newer then (o->>'rating')::numeric else rating end,
      title = case when v_newer then coalesce(o->>'title', title) else coalesce(title, o->>'title') end,
      body = case when v_newer then coalesce(o->>'text', body) else coalesce(body, o->>'text') end,
      reviewed_at = case when v_newer then coalesce((o->>'reviewedAt')::timestamptz, reviewed_at)
        else coalesce(reviewed_at, (o->>'reviewedAt')::timestamptz) end,
      app_version = case when v_newer then coalesce(o->>'appVersion', app_version) else coalesce(app_version, o->>'appVersion') end,
      developer_reply = case when v_newer then coalesce(o->>'developerReply', developer_reply)
        else coalesce(developer_reply, o->>'developerReply') end,
      developer_reply_at = case when v_newer then coalesce((o->>'developerReplyAt')::timestamptz, developer_reply_at)
        else coalesce(developer_reply_at, (o->>'developerReplyAt')::timestamptz) end,
      helpful_votes = case when v_newer then coalesce((o->>'helpfulVotes')::bigint, helpful_votes)
        else coalesce(helpful_votes, (o->>'helpfulVotes')::bigint) end,
      total_votes = case when v_newer then coalesce((o->>'totalVotes')::bigint, total_votes)
        else coalesce(total_votes, (o->>'totalVotes')::bigint) end,
      current_observed_at = greatest(current_observed_at, v_observed),
      first_seen_at = least(first_seen_at, v_observed),
      last_seen_at = greatest(last_seen_at, v_observed),
      expires_at = greatest(expires_at, p_expires_at)
    where id = r.id;
  end loop;

  return pg_catalog.jsonb_build_object('inserted', v_inserted, 'unchanged', v_unchanged,
    'duplicates', v_duplicates, 'conflicts', v_conflicts);
end;
$$;

alter table public.reviews enable row level security;
alter table public.review_observations enable row level security;
revoke all on public.reviews, public.review_observations from public, anon, authenticated, service_role;
revoke all on sequence public.reviews_id_seq, public.review_observations_id_seq from public, anon, authenticated, service_role;
grant select, insert, delete on public.reviews, public.review_observations to service_role;
grant update (rating, title, body, reviewed_at, app_version, developer_reply, developer_reply_at, helpful_votes,
  total_votes, current_observed_at, first_seen_at, last_seen_at, expires_at) on public.reviews to service_role;
grant update (last_seen_at, expires_at) on public.review_observations to service_role;
grant usage, select on sequence public.reviews_id_seq, public.review_observations_id_seq to service_role;
revoke all on function private.review_observations_guard(), public.appradar_persist_reviews(text, text, jsonb, timestamptz)
  from public, anon, authenticated;
grant execute on function public.appradar_persist_reviews(text, text, jsonb, timestamptz) to service_role;
