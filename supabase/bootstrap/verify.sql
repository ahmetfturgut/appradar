-- Read-only post-migration checks. Raises on the first violation; changes nothing.
-- Run through: node --import tsx src/lib/migrate/cli.ts --target-ref <ref> --verify
do $verify$
declare
  v_expected constant text[] := array[
    'public.developers','public.apps','public.app_listings','public.app_snapshots','public.discovery_snapshots',
    'public.discovery_entries','public.reviews','public.review_observations','public.keyword_snapshots',
    'public.keyword_entries','public.watchlist_items','private.collection_jobs','private.budget_periods',
    'private.provider_runs','private.retention_lock'];
  v_bad text;
begin
  select pg_catalog.string_agg(t, ', ') into v_bad from pg_catalog.unnest(v_expected) t where pg_catalog.to_regclass(t) is null;
  if v_bad is not null then raise exception 'missing_tables: %', v_bad; end if;

  select pg_catalog.string_agg(n.nspname || '.' || c.relname, ', ') into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public','private') and c.relkind in ('r','p') and not c.relrowsecurity;
  if v_bad is not null then raise exception 'rls_disabled: %', v_bad; end if;

  select pg_catalog.string_agg(n.nspname || '.' || c.relname, ', ') into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public','private') and c.relkind in ('r','p','v','m','f')
     and (pg_catalog.has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       or pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'));
  if v_bad is not null then raise exception 'anon_has_privileges: %', v_bad; end if;

  select pg_catalog.string_agg(n.nspname || '.' || c.relname, ', ') into v_bad
    from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public','private') and c.relkind in ('r','p','v','m','f')
     and not (n.nspname = 'public' and c.relname = 'watchlist_items')
     and (pg_catalog.has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       or pg_catalog.has_any_column_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES'));
  if v_bad is not null then raise exception 'authenticated_has_privileges: %', v_bad; end if;

  if not (pg_catalog.has_table_privilege('authenticated', 'public.watchlist_items', 'SELECT')
      and pg_catalog.has_table_privilege('authenticated', 'public.watchlist_items', 'INSERT')
      and pg_catalog.has_table_privilege('authenticated', 'public.watchlist_items', 'DELETE'))
     or pg_catalog.has_table_privilege('authenticated', 'public.watchlist_items', 'UPDATE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'watchlist_grants_unexpected';
  end if;

  if (select pg_catalog.count(*) from pg_catalog.pg_policies
       where schemaname = 'public' and tablename = 'watchlist_items'
         and policyname in ('watchlist_items_select_own','watchlist_items_insert_own','watchlist_items_delete_own')) <> 3
     or (select pg_catalog.count(*) from pg_catalog.pg_policies where schemaname in ('public','private')) <> 3 then
    raise exception 'rls_policies_unexpected';
  end if;

  if pg_catalog.has_schema_privilege('anon', 'private', 'USAGE') or pg_catalog.has_schema_privilege('authenticated', 'private', 'USAGE')
     or pg_catalog.has_schema_privilege('anon', 'appradar_meta', 'USAGE') or pg_catalog.has_schema_privilege('authenticated', 'appradar_meta', 'USAGE') then
    raise exception 'internal_schema_exposed';
  end if;

  select pg_catalog.string_agg(p.oid::pg_catalog.regprocedure::text, ', ') into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname like 'appradar\_%'
     and (pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') or pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  if v_bad is not null then raise exception 'client_can_execute: %', v_bad; end if;

  select pg_catalog.string_agg(p.oid::pg_catalog.regprocedure::text, ', ') into v_bad
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where p.prosecdef and (n.nspname = 'private' or (n.nspname = 'public' and p.proname like 'appradar\_%'));
  if v_bad is not null then raise exception 'security_definer_functions: %', v_bad; end if;
end
$verify$;
select 'verification_passed';
