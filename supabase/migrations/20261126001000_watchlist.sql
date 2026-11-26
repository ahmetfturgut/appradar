-- P3 personal watchlist: the first user-owned table. Not applied remotely.
-- Apply after 20261126000900_ranking_intelligence, in one transaction.
--
-- Security model
--   * Row Level Security: authenticated users can SELECT, INSERT and DELETE only rows where
--     user_id = auth.uid(). There is no UPDATE grant or policy, so ownership cannot be reassigned
--     and rows cannot be edited. anon has no privileges at all.
--   * The app writes with the signed-in user's session (publishable key + JWT), never service_role.
--   * Identity: user_id → auth.users (cascade on account deletion); (app_id, country, requested_language)
--     → app_listings' unique listing context, so only real catalog contexts can be saved. Store is not
--     stored: it is determined by the canonical app.
--   * Capacity: at most 50 rows per user, enforced by a trigger that serialises inserts per user with a
--     transaction-scoped advisory lock, so concurrent inserts cannot exceed the limit.
--   * Adding a row never triggers collection: there are no triggers or functions that enqueue jobs.

create table public.watchlist_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app_id uuid not null,
  country text not null check (country ~ '^[A-Z]{2}$'),
  requested_language text not null check (requested_language ~ '^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$' and length(requested_language) <= 35),
  created_at timestamptz not null default pg_catalog.now(),
  constraint watchlist_items_pkey primary key (user_id, app_id, country, requested_language),
  -- Listing deletion (retention expiry purge) removes the saved entry instead of leaving a dangling row.
  constraint watchlist_items_listing foreign key (app_id, country, requested_language)
    references public.app_listings (app_id, country, requested_language) on delete cascade
);

create index watchlist_items_user_created_idx on public.watchlist_items (user_id, created_at desc);
create index watchlist_items_listing_idx on public.watchlist_items (app_id, country, requested_language);

-- Per-user capacity. SECURITY INVOKER: the count runs under the caller's RLS, which exposes exactly
-- the caller's own rows. The advisory lock is keyed by user, so two concurrent inserts for the same
-- user are counted one after the other.
create function public.appradar_watchlist_enforce_limit() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('appradar_watchlist:' || new.user_id::text, 0));
  select count(*) into v_count from public.watchlist_items where user_id = new.user_id;
  if v_count >= 50 then
    raise exception 'watchlist_limit_reached' using errcode = 'P0001', hint = 'A watchlist holds at most 50 apps.';
  end if;
  return new;
end;
$$;

create trigger watchlist_items_limit before insert on public.watchlist_items
  for each row execute function public.appradar_watchlist_enforce_limit();

alter table public.watchlist_items enable row level security;

create policy watchlist_items_select_own on public.watchlist_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy watchlist_items_insert_own on public.watchlist_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy watchlist_items_delete_own on public.watchlist_items
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.watchlist_items from public, anon, authenticated;
grant select, insert, delete on public.watchlist_items to authenticated;
-- service_role keeps its default bypass for operations, but the application never uses it here.

revoke all on function public.appradar_watchlist_enforce_limit() from public, anon, authenticated;
