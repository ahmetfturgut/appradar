// Applies supabase/migrations to ONE explicitly named, non-development Supabase project through psql.
// Pure decisions and orchestration; the process wrapper is in cli.ts so tests need no database.
//
// Safety rules:
//  - the target ref is given on the command line and must equal the ref inside the connection string;
//  - the development project must be declared, and is refused;
//  - nothing is written until the database passed a read-only preflight;
//  - each migration and its ledger row commit in one transaction; the first error stops the run;
//  - applied entries must be an exact, checksum-identical prefix of the committed manifest.
import { createHash } from "node:crypto";
import { PROJECT_REF } from "../collection/target.ts";

export class MigrationError extends Error {
  readonly code: string;
  constructor(code: string, detail = "") { super(detail ? `${code}: ${detail}` : code); this.code = code; }
}

export interface Migration { file: string; sha256: string; sql: string }
export interface ManifestEntry { file: string; sha256: string }

const FILE_NAME = /^\d{14}_[a-z0-9_]+\.sql$/;
export const sha256 = (content: string | Uint8Array) => createHash("sha256").update(content).digest("hex");

/** The directory must match the committed manifest exactly: same files, same order, same bytes. */
export function loadInventory(manifest: ManifestEntry[], files: string[], read: (file: string) => string): Migration[] {
  const present = files.filter(f => f.endsWith(".sql")).sort();
  const expected = manifest.map(m => m.file);
  if (!expected.length) throw new MigrationError("manifest_empty");
  if (expected.some((f, i) => !FILE_NAME.test(f) || (i > 0 && f <= expected[i - 1]!))) throw new MigrationError("manifest_order_or_name_invalid");
  if (present.length !== expected.length || present.some((f, i) => f !== expected[i])) {
    throw new MigrationError("inventory_differs_from_manifest", `found ${present.length}, expected ${expected.length}`);
  }
  return manifest.map(({ file, sha256: pinned }) => {
    const sql = read(file);
    if (sha256(sql) !== pinned) throw new MigrationError("migration_changed_since_manifest", file);
    return { file, sha256: pinned, sql };
  });
}

export interface Target { host: string; port: string; user: string; password: string; database: string; sslmode: string; ref: string }

/**
 * Parses the connection string without ever echoing it. Accepts only the two Supabase forms:
 * direct `postgres@db.<ref>.supabase.co` and session pooler `postgres.<ref>@*.pooler.supabase.com:5432`.
 */
export function parseTarget(connection: string, targetRef: string, forbiddenRefs: readonly string[]): Target {
  if (!PROJECT_REF.test(targetRef)) throw new MigrationError("target_ref_invalid");
  if (!forbiddenRefs.length) throw new MigrationError("development_project_not_declared");
  if (forbiddenRefs.includes(targetRef)) throw new MigrationError("target_is_development_project");
  let url: URL;
  try { url = new URL(connection); } catch { throw new MigrationError("database_url_unparseable"); }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") throw new MigrationError("database_url_not_postgres");
  // libpq lets query parameters override the host or user, so only sslmode is allowed.
  for (const key of url.searchParams.keys()) if (key !== "sslmode") throw new MigrationError("database_url_has_extra_parameters");
  const sslmode = url.searchParams.get("sslmode") ?? "require";
  if (sslmode !== "require" && sslmode !== "verify-full") throw new MigrationError("database_url_requires_tls");
  if (url.hash) throw new MigrationError("database_url_has_fragment");

  let user: string, password: string;
  try { user = decodeURIComponent(url.username); password = decodeURIComponent(url.password); } catch { throw new MigrationError("database_url_unparseable"); }
  if (!password || /[\r\n\0]/.test(password)) throw new MigrationError("database_url_password_missing");
  const host = url.hostname.toLowerCase(), port = url.port || "5432", database = url.pathname.slice(1);
  if (database !== "postgres") throw new MigrationError("database_name_unexpected");
  if (port !== "5432") throw new MigrationError("database_port_must_be_5432_session_mode");

  const direct = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  const pooled = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(host) ? user.match(/^postgres\.([a-z0-9]+)$/) : null;
  const ref = direct && user === "postgres" ? direct[1]! : pooled ? pooled[1]! : null;
  if (!ref) throw new MigrationError("database_target_not_recognised");
  if (forbiddenRefs.some(f => host.includes(f) || user.includes(f))) throw new MigrationError("target_is_development_project");
  if (ref !== targetRef) throw new MigrationError("database_url_does_not_match_target_ref");
  return { host, port, user, password, database, sslmode, ref };
}

/** Runs one SQL script on the verified target. `transaction` wraps the whole script (psql --single-transaction). */
export type Sql = (script: string, options?: { transaction?: boolean }) => Promise<string>;

const APP_TABLES = ["public.developers", "public.apps", "public.app_listings", "public.watchlist_items", "private.collection_jobs", "private.retention_lock"];

export const PREFLIGHT_SQL = `select pg_catalog.json_build_object(
  'version', pg_catalog.current_setting('server_version_num')::int,
  'supabase', pg_catalog.to_regclass('auth.users') is not null
    and (select pg_catalog.count(*) from pg_catalog.pg_roles where rolname in ('anon','authenticated','service_role')) = 3,
  'ledger', pg_catalog.to_regclass('appradar_meta.schema_migrations') is not null,
  'ledgerColumns', (select coalesce(pg_catalog.json_agg(column_name order by column_name), '[]'::json) from information_schema.columns
     where table_schema = 'appradar_meta' and table_name = 'schema_migrations'),
  'appTables', (select pg_catalog.count(*) from pg_catalog.unnest(array[${APP_TABLES.map(t => `'${t}'`).join(",")}]) t
     where pg_catalog.to_regclass(t) is not null)
);`;
export const LEDGER_ROWS_SQL = `select coalesce(pg_catalog.json_agg(pg_catalog.json_build_object('version', version, 'checksum', checksum) order by version), '[]'::json) from appradar_meta.schema_migrations;`;

const json = (output: string): unknown => {
  try { return JSON.parse(output.trim()); } catch { throw new MigrationError("unexpected_database_response"); }
};

export interface State { ledger: boolean; applied: Migration[]; pending: Migration[] }

/** Read-only. Decides what would be applied, or refuses. */
export async function inspect(sql: Sql, inventory: Migration[]): Promise<State> {
  const pre = json(await sql(PREFLIGHT_SQL)) as { version?: number; supabase?: boolean; ledger?: boolean; ledgerColumns?: string[]; appTables?: number };
  if (pre.supabase !== true) throw new MigrationError("target_is_not_a_supabase_project");
  if (!pre.version || pre.version < 150000) throw new MigrationError("postgres_15_or_newer_required");
  if (!pre.ledger) {
    if (pre.appTables !== 0) throw new MigrationError("target_has_unrecorded_schema");
    return { ledger: false, applied: [], pending: inventory };
  }
  // A ledger without checksums (for example the development one) is never adopted.
  if (JSON.stringify(pre.ledgerColumns) !== JSON.stringify(["applied_at", "checksum", "version"])) throw new MigrationError("ledger_not_recognised");
  const rows = json(await sql(LEDGER_ROWS_SQL)) as { version: string; checksum: string }[];
  if (!rows.length && pre.appTables !== 0) throw new MigrationError("target_has_unrecorded_schema");
  rows.forEach((row, i) => {
    const expected = inventory[i];
    if (!expected || row.version !== expected.file) throw new MigrationError("ledger_does_not_match_inventory", row.version);
    if (row.checksum !== expected.sha256) throw new MigrationError("applied_migration_was_changed", row.version);
  });
  return { ledger: true, applied: inventory.slice(0, rows.length), pending: inventory.slice(rows.length) };
}

/** The ledger insert runs first: if the version is already recorded, nothing of the migration executes. */
export function migrationScript(m: Migration): string {
  if (!FILE_NAME.test(m.file) || !/^[0-9a-f]{64}$/.test(m.sha256)) throw new MigrationError("manifest_order_or_name_invalid");
  return `select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('appradar_migrations'));
insert into appradar_meta.schema_migrations (version, checksum) values ('${m.file}', '${m.sha256}');
${m.sql}`;
}

export async function apply(sql: Sql, inventory: Migration[], ledgerSql: string, log: (line: string) => void = () => {}): Promise<{ applied: string[]; total: number }> {
  const state = await inspect(sql, inventory);
  if (!state.ledger) await sql(ledgerSql, { transaction: true });
  const applied: string[] = [];
  for (const migration of state.pending) {
    try {
      await sql(migrationScript(migration), { transaction: true });
    } catch (error) {
      throw new MigrationError("migration_failed", `${migration.file} was rolled back; ${applied.length} applied in this run. ${error instanceof Error ? error.message : ""}`.trim());
    }
    applied.push(migration.file);
    log(`applied ${migration.file}`);
  }
  const after = await inspect(sql, inventory);
  if (after.pending.length) throw new MigrationError("ledger_incomplete_after_apply");
  return { applied, total: after.applied.length };
}
