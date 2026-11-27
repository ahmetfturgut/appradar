-- LOCAL REHEARSAL ONLY. A stand-in for the parts of a hosted Supabase database that the migrations
-- depend on. Never run this against a hosted project. Run by a superuser on an empty database.
-- Reproduced: API roles, the non-superuser `postgres` migration role, auth.users, auth.uid(),
-- and Supabase's default privileges, which expose new public objects to API roles until revoked.
-- Not reproduced: GoTrue, PostgREST, the real auth schema, extensions, platform event triggers or hooks.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'postgres') then create role postgres login nosuperuser createdb createrole bypassrls; end if;
end $$;
grant anon, authenticated, service_role to postgres;

create schema auth;
create table auth.users (id uuid primary key, email text, created_at timestamptz not null default now());
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role, postgres;
grant select, insert, delete, references on auth.users to postgres;
grant execute on function auth.uid() to anon, authenticated, service_role, postgres;

grant usage on schema public to anon, authenticated, service_role;
grant usage, create on schema public to postgres;
alter default privileges for role postgres in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
