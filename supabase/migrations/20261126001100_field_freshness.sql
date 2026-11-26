-- B1: apply after 20261126001000_watchlist in one transaction.
-- Forward-only function replacement. No backfill, snapshot mutation, new table or privilege expansion.
-- Existing quality values remain readable; role is the authority boundary, not a provider's quality score.
-- Order: detail > discovery; within the same tier newer observedAt wins; at equal time prefer
-- Aurelix detail, then collectedAt, source, runId and build (deterministic ties).
-- Thus an old detail may replace discovery (a different method), but cannot roll back newer detail.
create or replace function private.observation_wins(p_old jsonb, p_new jsonb) returns boolean
language sql stable set search_path = '' as $$
  select case
    when p_new->>'observedAt' is null or p_new->>'role' is null
      or p_new->>'role' not in ('detail', 'discovery') then false
    when p_old is null or p_old->>'observedAt' is null or p_old->>'role' is null
      or p_old->>'role' not in ('detail', 'discovery') then true
    else
      (case when p_new->>'role' = 'detail' then 2 else 1 end,
       (p_new->>'observedAt')::timestamptz,
       case when p_new->>'role' = 'detail' and p_new->>'source' = 'aurelix' then 1 else 0 end,
       (p_new->>'collectedAt')::timestamptz, p_new->>'source', p_new->>'runId', p_new->>'build')
      >
      (case when p_old->>'role' = 'detail' then 2 else 1 end,
       (p_old->>'observedAt')::timestamptz,
       case when p_old->>'role' = 'detail' and p_old->>'source' = 'aurelix' then 1 else 0 end,
       (p_old->>'collectedAt')::timestamptz, p_old->>'source', p_old->>'runId', p_old->>'build')
  end;
$$;

create or replace function public.appradar_persist_app_observations(
  p_provider text, p_external_run_id text, p_observations jsonb, p_expires_at timestamptz
) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_mode text;
  o jsonb;
  l public.app_listings%rowtype;
  s public.app_snapshots%rowtype;
  v_app uuid;
  v_developer uuid;
  v_snapshot bigint;
  v_hash text;
  v_observed timestamptz;
  v_collected timestamptz;
  v_role text;
  v_stamp jsonb;
  prov jsonb;
  v_price numeric;
  v_free boolean;
  v_inserted integer := 0;
  v_duplicates integer := 0;
  v_conflicts integer := 0;
begin
  select job_mode into v_mode from private.require_ingestible_run(p_provider, p_external_run_id, false);
  if p_observations is null or pg_catalog.jsonb_typeof(p_observations) <> 'array' then
    raise exception 'observations_must_be_array' using errcode = '23514';
  end if;

  -- Stable order keeps row locks consistent between concurrent batches.
  for o in select item.value from pg_catalog.jsonb_array_elements(p_observations) as item(value)
    order by item.value->>'store', item.value->>'storeAppId', item.value->>'country',
      item.value->>'requestedLanguage', item.value->>'observedAt', item.value->>'idempotencyKey'
  loop
    if o->>'source' is distinct from p_provider or o->>'sourceRunId' is distinct from p_external_run_id
       or o->'collectionContext'->>'mode' is distinct from v_mode then
      raise exception 'observation_run_mismatch' using errcode = '23514';
    end if;
    v_observed := (o->>'observedAt')::timestamptz;
    v_collected := (o->>'collectedAt')::timestamptz;
    v_role := o->>'observationRole';
    perform private.require_expiry(p_expires_at, v_collected);

    v_app := private.upsert_app_identity(o->>'store', o->>'storeAppId', v_observed);
    insert into public.app_listings (app_id, store, country, requested_language, first_seen_at, expires_at)
    values (v_app, o->>'store', o->>'country', o->>'requestedLanguage', v_observed, p_expires_at)
    on conflict (app_id, country, requested_language) do nothing;
    select * into l from public.app_listings
    where app_id = v_app and country = o->>'country' and requested_language = o->>'requestedLanguage' for update;

    -- A replayed observation changes nothing.
    select payload_hash into v_hash from public.app_snapshots where idempotency_key = o->>'idempotencyKey';
    if found then
      if v_hash = o->>'payloadHash' then v_duplicates := v_duplicates + 1;
      else v_conflicts := v_conflicts + 1; end if;
      continue;
    end if;

    insert into public.app_snapshots (
      listing_id, store, source, source_run_id, source_build, schema_version, idempotency_key, payload_hash, content_hash, series_key,
      effective_language, observation_role, collection_mode, collection_context, collection_category, rank,
      observed_at, observed_time_basis, collected_at, version, released_at, released_at_precision,
      store_updated_at, store_updated_at_precision, price_amount, currency, is_free, rating_value,
      rating_count, review_count, installs_text, installs_lower_bound, field_status, expires_at)
    values (
      l.id, o->>'store', p_provider, p_external_run_id, o->>'sourceBuild', (o->>'schemaVersion')::smallint,
      o->>'idempotencyKey', o->>'payloadHash', o->>'contentHash', o->>'seriesKey', o->>'language', v_role,
      o->'collectionContext'->>'mode', o->'collectionContext'->>'context', o->'collectionContext'->>'category',
      (o->>'rank')::integer, v_observed, o->>'observedTimeBasis', v_collected, o->>'version',
      (o->>'releasedAt')::timestamptz, o->>'releasedAtPrecision',
      (o->>'listingUpdatedAt')::timestamptz, o->>'listingUpdatedAtPrecision',
      (o->>'priceAmount')::numeric, o->>'currency', (o->>'isFree')::boolean, (o->>'ratingValue')::numeric,
      (o->>'ratingCount')::bigint, (o->>'reviewCount')::bigint, o->>'installsText', (o->>'installsLowerBound')::bigint,
      o->'fieldStatus', p_expires_at)
    returning id into v_snapshot;
    v_inserted := v_inserted + 1;

    v_stamp := pg_catalog.jsonb_build_object(
      'quality', private.observation_quality(p_provider, v_role), 'observedAt', o->>'observedAt',
      'collectedAt', o->>'collectedAt', 'runId', p_external_run_id, 'source', p_provider,
      'build', o->>'sourceBuild', 'role', v_role, 'timeBasis', o->>'observedTimeBasis');
    prov := l.field_provenance;

    -- Unknown (null) incoming values never reach a column.
    if o->>'language' is not null and private.observation_wins(prov->'effective_language', v_stamp) then
      l.effective_language := o->>'language'; prov := prov || pg_catalog.jsonb_build_object('effective_language', v_stamp); end if;
    if o->>'name' is not null and private.observation_wins(prov->'name', v_stamp) then
      l.name := o->>'name'; prov := prov || pg_catalog.jsonb_build_object('name', v_stamp); end if;
    if o->>'developerName' is not null and private.observation_wins(prov->'developer_name', v_stamp) then
      l.developer_name := o->>'developerName'; prov := prov || pg_catalog.jsonb_build_object('developer_name', v_stamp); end if;
    if o->>'category' is not null and private.observation_wins(prov->'category_name', v_stamp) then
      l.category_name := o->>'category'; prov := prov || pg_catalog.jsonb_build_object('category_name', v_stamp); end if;
    if o->>'version' is not null and private.observation_wins(prov->'version', v_stamp) then
      l.version := o->>'version'; prov := prov || pg_catalog.jsonb_build_object('version', v_stamp); end if;
    if o->>'releasedAt' is not null and private.observation_wins(prov->'released_at', v_stamp) then
      l.released_at := (o->>'releasedAt')::timestamptz; l.released_at_precision := o->>'releasedAtPrecision';
      prov := prov || pg_catalog.jsonb_build_object('released_at', v_stamp); end if;
    if o->>'listingUpdatedAt' is not null and private.observation_wins(prov->'store_updated_at', v_stamp) then
      l.store_updated_at := (o->>'listingUpdatedAt')::timestamptz; l.store_updated_at_precision := o->>'listingUpdatedAtPrecision';
      prov := prov || pg_catalog.jsonb_build_object('store_updated_at', v_stamp); end if;

    -- price_amount, currency and is_free move as one group.
    v_price := (o->>'priceAmount')::numeric;
    v_free := (o->>'isFree')::boolean;
    if (v_price is not null or v_free is not null) and private.observation_wins(prov->'price', v_stamp) then
      if v_price is not null then
        l.is_free := coalesce(v_free, case when l.is_free = (v_price = 0) then l.is_free end);
        l.price_amount := v_price; l.currency := o->>'currency';
        prov := prov || pg_catalog.jsonb_build_object('price', v_stamp);
      elsif l.price_amount is null or (l.price_amount = 0) = v_free then
        l.is_free := v_free;
        -- A bare is_free flag must not claim ownership of a retained amount.
        if l.price_amount is null then prov := prov || pg_catalog.jsonb_build_object('price', v_stamp); end if;
      else
        -- The retained amount is contradicted by a better observation: it is now unknown.
        l.price_amount := null; l.currency := null; l.is_free := v_free;
        prov := prov || pg_catalog.jsonb_build_object('price', v_stamp);
      end if;
    end if;

    if o->>'ratingValue' is not null and private.observation_wins(prov->'rating_value', v_stamp) then
      l.rating_value := (o->>'ratingValue')::numeric; prov := prov || pg_catalog.jsonb_build_object('rating_value', v_stamp); end if;
    if o->>'ratingCount' is not null and private.observation_wins(prov->'rating_count', v_stamp) then
      l.rating_count := (o->>'ratingCount')::bigint; prov := prov || pg_catalog.jsonb_build_object('rating_count', v_stamp); end if;
    if o->>'reviewCount' is not null and private.observation_wins(prov->'review_count', v_stamp) then
      l.review_count := (o->>'reviewCount')::bigint; prov := prov || pg_catalog.jsonb_build_object('review_count', v_stamp); end if;
    if o->>'installsText' is not null and private.observation_wins(prov->'installs_text', v_stamp) then
      l.installs_text := o->>'installsText'; prov := prov || pg_catalog.jsonb_build_object('installs_text', v_stamp); end if;
    if o->>'installsLowerBound' is not null and private.observation_wins(prov->'installs_lower_bound', v_stamp) then
      l.installs_lower_bound := (o->>'installsLowerBound')::bigint; prov := prov || pg_catalog.jsonb_build_object('installs_lower_bound', v_stamp); end if;
    if o->>'description' is not null and private.observation_wins(prov->'description', v_stamp) then
      l.description := o->>'description'; prov := prov || pg_catalog.jsonb_build_object('description', v_stamp); end if;
    if o->>'iconUrl' is not null and private.observation_wins(prov->'icon_url', v_stamp) then
      l.icon_url := o->>'iconUrl'; prov := prov || pg_catalog.jsonb_build_object('icon_url', v_stamp); end if;
    if pg_catalog.jsonb_typeof(o->'screenshotUrls') = 'array' and private.observation_wins(prov->'screenshot_urls', v_stamp) then
      l.screenshot_urls := o->'screenshotUrls'; prov := prov || pg_catalog.jsonb_build_object('screenshot_urls', v_stamp); end if;

    -- Representative snapshot follows the same authority/time ordering; not every field comes from it.
    if l.latest_snapshot_id is null then
      l.latest_snapshot_id := v_snapshot;
    else
      select * into s from public.app_snapshots where id = l.latest_snapshot_id;
      if private.observation_wins(pg_catalog.jsonb_build_object(
        'source', s.source, 'role', s.observation_role, 'observedAt', s.observed_at,
        'collectedAt', s.collected_at, 'runId', s.source_run_id, 'build', s.source_build), v_stamp) then
        l.latest_snapshot_id := v_snapshot;
      end if;
    end if;

    update public.app_listings set
      effective_language = l.effective_language, name = l.name, developer_name = l.developer_name,
      category_name = l.category_name, version = l.version, released_at = l.released_at,
      released_at_precision = l.released_at_precision, store_updated_at = l.store_updated_at,
      store_updated_at_precision = l.store_updated_at_precision, price_amount = l.price_amount,
      currency = l.currency, is_free = l.is_free, rating_value = l.rating_value, rating_count = l.rating_count,
      review_count = l.review_count, installs_text = l.installs_text, installs_lower_bound = l.installs_lower_bound,
      description = l.description, icon_url = l.icon_url, screenshot_urls = l.screenshot_urls,
      latest_snapshot_id = l.latest_snapshot_id, field_provenance = prov,
      first_seen_at = least(l.first_seen_at, v_observed),
      last_observed_at = greatest(l.last_observed_at, v_observed),
      expires_at = greatest(l.expires_at, p_expires_at)
    where id = l.id;

    if o->>'developerStoreId' is not null then
      insert into public.developers as developer (store, store_developer_id, name, first_seen_at, last_seen_at)
      values (o->>'store', pg_catalog.btrim(o->>'developerStoreId'), o->>'developerName', v_observed, v_observed)
      on conflict (store, store_developer_id) do update set
        name = case when excluded.name is not null and (developer.name is null
            or (v_role = 'detail' and excluded.last_seen_at >= developer.last_seen_at))
          then excluded.name else developer.name end,
        first_seen_at = least(developer.first_seen_at, excluded.first_seen_at),
        last_seen_at = greatest(developer.last_seen_at, excluded.last_seen_at)
      returning developer.id into v_developer;
      update public.apps set developer_id = v_developer
      where id = v_app and (developer_id is null or (v_role = 'detail' and v_observed >= last_seen_at));
    end if;
  end loop;

  return pg_catalog.jsonb_build_object('inserted', v_inserted, 'duplicates', v_duplicates, 'conflicts', v_conflicts);
end;
$$;

revoke all on function private.observation_wins(jsonb, jsonb),
  public.appradar_persist_app_observations(text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function private.observation_wins(jsonb, jsonb),
  public.appradar_persist_app_observations(text, text, jsonb, timestamptz) to service_role;
