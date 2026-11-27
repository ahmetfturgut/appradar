-- Migration ledger, applied once before the first migration (src/lib/migrate/cli.ts does this).
-- Same location as the development project's ledger; never exposed to API clients.
create schema if not exists appradar_meta;
revoke all on schema appradar_meta from public, anon, authenticated;
create table if not exists appradar_meta.schema_migrations (
  version    text        primary key,
  checksum   text        not null check (checksum ~ '^[0-9a-f]{64}$'),
  applied_at timestamptz not null default pg_catalog.now()
);
alter table appradar_meta.schema_migrations enable row level security;
revoke all on appradar_meta.schema_migrations from public, anon, authenticated;
