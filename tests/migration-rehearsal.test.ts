// Real-PostgreSQL migration rehearsal on a disposable local cluster. Skipped unless
// APPRADAR_REHEARSAL_PG_BIN points at a local PostgreSQL 15+ bin directory; nothing is installed or
// contacted beyond 127.0.0.1. This validates SQL and the runner, not hosted Supabase behaviour.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { psql } from "../src/lib/migrate/cli.ts";
import { apply, inspect, loadInventory, migrationScript, MigrationError, sha256, type ManifestEntry, type Sql, type Target } from "../src/lib/migrate/runner.ts";

const bin = process.env.APPRADAR_REHEARSAL_PG_BIN;

const freePort = () => new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => { const { port } = server.address() as { port: number }; server.close(() => resolve(port)); });
});
const code = (expected: string) => (error: unknown) => (error as MigrationError).code === expected;
const sqlError = (pattern: RegExp) => (error: unknown) => { assert.match((error as Error).message, pattern); return true; };

test("migrations, ledger, failure handling, verification and isolation on real PostgreSQL", { skip: !bin && "Set APPRADAR_REHEARSAL_PG_BIN to a local PostgreSQL bin directory." }, async t => {
  const dir = mkdtempSync(join(tmpdir(), "appradar-rehearsal-")), data = join(dir, "data"), port = await freePort();
  const password = "local-rehearsal-only";
  const env = { PATH: `${bin}:${process.env.PATH}`, HOME: dir, LC_ALL: "en_US.UTF-8" };
  const run = (program: string, args: string[]) => execFileSync(join(bin!, program), args, { env: env as unknown as NodeJS.ProcessEnv, stdio: "pipe" });
  writeFileSync(join(dir, "pw"), password, { mode: 0o600 });
  run("initdb", ["-D", data, "-U", "supabase_admin", `--pwfile=${join(dir, "pw")}`, "--auth=scram-sha-256", "--encoding=UTF8", "--locale=en_US.UTF-8"]);
  run("pg_ctl", ["-D", data, "-w", "-l", join(dir, "server.log"), "-o", `-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`, "start"]);
  try {
    // Built by hand: the CLI's hosted-target parser is deliberately not usable for a local server.
    const target = (user: string, database = "postgres"): Target => ({ host: "127.0.0.1", port: String(port), user, password, database, sslmode: "disable", ref: "local" });
    const admin = psql(target("supabase_admin"), env);
    const shim = await readFile("supabase/tests/local-supabase-shim.sql", "utf8");
    await admin(shim, { transaction: true });
    await admin(`alter role postgres password '${password}'; alter database postgres owner to postgres;`);
    const db = psql(target("postgres"), env);
    const ledger = await readFile("supabase/bootstrap/ledger.sql", "utf8");
    const verify = await readFile("supabase/bootstrap/verify.sql", "utf8");
    const manifest = JSON.parse(await readFile("supabase/migrations.manifest.json", "utf8")) as ManifestEntry[];
    const files = await readdir("supabase/migrations");
    const sources = new Map(await Promise.all(files.map(async f => [f, await readFile(`supabase/migrations/${f}`, "utf8")] as const)));
    const inventory = loadInventory(manifest, files, f => sources.get(f)!);
    const one = async (sql: Sql, query: string) => (await sql(query)).trim();

    await t.test("the stand-in reproduces Supabase's open default privileges and non-superuser migrator", async () => {
      assert.equal(await one(db, "select rolsuper from pg_roles where rolname = current_user;"), "f");
      await db("create table public.t_probe (id int);");
      assert.equal(await one(db, "select has_table_privilege('anon', 'public.t_probe', 'select');"), "t");
      await db("drop table public.t_probe;");
      assert.ok(Number(await one(db, "select current_setting('server_version_num');")) >= 150000);
    });

    await t.test("a failing migration rolls back completely and the run stops", async () => {
      assert.equal((await inspect(db, inventory)).pending.length, 13);
      const broken = inventory.map((m, i) => i !== 4 ? m : { ...m, sql: `${m.sql}\ncreate table public.t_must_roll_back (id int);\nselect 1/0;\n`, sha256: sha256("broken") });
      await assert.rejects(apply(db, broken, ledger), /migration_failed: 20261126000500_reviews\.sql was rolled back; 4 applied in this run\. sql_failed: .*division by zero/);
      assert.equal(await one(db, "select count(*) from appradar_meta.schema_migrations;"), "4");
      assert.equal(await one(db, "select coalesce(to_regclass('public.reviews')::text, 'absent') || ',' || coalesce(to_regclass('public.t_must_roll_back')::text, 'absent');"), "absent,absent");
      assert.equal(await one(db, "select coalesce(to_regclass('public.keyword_snapshots')::text, 'absent');"), "absent", "later migrations never started");
    });

    await t.test("resumption applies only the remaining migrations with matching checksums", async () => {
      const outcome = await apply(db, inventory, ledger);
      assert.deepEqual(outcome, { applied: inventory.slice(4).map(m => m.file), total: 13 });
      const rows = (await one(db, "select version || ' ' || checksum from appradar_meta.schema_migrations order by version;")).split("\n");
      assert.deepEqual(rows, manifest.map(m => `${m.file} ${m.sha256}`));
      assert.deepEqual(await apply(db, inventory, ledger), { applied: [], total: 13 });
    });

    await t.test("changed migrations and duplicate application are refused without effect", async () => {
      const changed = inventory.map((m, i) => i === 0 ? { ...m, sha256: sha256("edited") } : m);
      await assert.rejects(apply(db, changed, ledger), code("applied_migration_was_changed"));
      await assert.rejects(apply(db, inventory.slice(1), ledger), code("ledger_does_not_match_inventory"));
      await assert.rejects(db(migrationScript(inventory[0]!), { transaction: true }), sqlError(/duplicate key value/));
      assert.equal(await one(db, "select count(*) from appradar_meta.schema_migrations;"), "13");
    });

    await t.test("verification passes and detects real weakenings", async () => {
      assert.match(await db(verify), /verification_passed/);
      assert.equal(await one(db, "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public','private') and c.relkind = 'r' and c.relrowsecurity;"), "15");
      const weakenings: [string, string, RegExp][] = [
        ["grant select on public.apps to anon;", "revoke select on public.apps from anon;", /anon_has_privileges/],
        ["grant select (name) on public.developers to authenticated;", "revoke select (name) on public.developers from authenticated;", /authenticated_has_privileges/],
        ["alter table public.reviews disable row level security;", "alter table public.reviews enable row level security;", /rls_disabled/],
        ["grant update on public.watchlist_items to authenticated;", "revoke update on public.watchlist_items from authenticated;", /watchlist_grants_unexpected/],
        ["grant execute on function public.appradar_set_media_suppression(uuid, boolean, boolean) to anon;", "revoke execute on function public.appradar_set_media_suppression(uuid, boolean, boolean) from anon;", /client_can_execute/],
        ["grant usage on schema private to authenticated;", "revoke usage on schema private from authenticated;", /internal_schema_exposed/],
      ];
      for (const [weaken, restore, expected] of weakenings) {
        await db(weaken);
        await assert.rejects(db(verify), sqlError(expected), weaken);
        await db(restore);
      }
      assert.match(await db(verify), /verification_passed/);
    });

    await t.test("watchlist rows are isolated per user; the catalog is closed to API roles", async () => {
      const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
      await db(`insert into auth.users (id) values ('${A}'), ('${B}');
        insert into public.apps (store, store_app_id, canonical_url, first_seen_at, last_seen_at)
          select 'ios', (1000 + n)::text, 'https://apps.apple.com/app/id' || (1000 + n), now(), now() from generate_series(1, 51) n;
        insert into public.app_listings (app_id, store, country, requested_language, first_seen_at, expires_at)
          select id, store, 'US', 'en', now(), now() + interval '30 days' from public.apps;`);
      const as = (user: string, sql: string) => db(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${user}"}', false) \\g /dev/null\n${sql}`);
      const ids = (await one(db, "select id from public.apps order by store_app_id;")).split("\n");
      const insert = (id: string, owner?: string) => `insert into public.watchlist_items (${owner ? "user_id, " : ""}app_id, country, requested_language) values (${owner ? `'${owner}', ` : ""}'${id}', 'US', 'en');`;

      await as(A, insert(ids[0]!));
      await as(B, insert(ids[1]!));
      assert.equal((await as(A, "select count(*) || ',' || min(user_id::text) from public.watchlist_items;")).trim(), `1,${A}`);
      assert.equal((await as(B, `delete from public.watchlist_items where user_id = '${A}' returning 1;`)).trim(), "", "B cannot delete A's rows");
      await assert.rejects(as(B, insert(ids[2]!, A)), sqlError(/row-level security/));
      await assert.rejects(as(A, `update public.watchlist_items set user_id = '${B}';`), sqlError(/permission denied/));
      for (const table of ["apps", "app_listings", "app_snapshots", "reviews", "discovery_entries", "keyword_entries"]) {
        await assert.rejects(as(A, `select count(*) from public.${table};`), sqlError(/permission denied/), table);
        await assert.rejects(db(`set role anon; select count(*) from public.${table};`), sqlError(/permission denied/), table);
      }
      await assert.rejects(db("set role anon; select count(*) from public.watchlist_items;"), sqlError(/permission denied/));
      await assert.rejects(as(A, "select public.appradar_read_catalog_stats();"), sqlError(/permission denied/));
      assert.ok((await one(db, "set role service_role; select count(*) from public.apps;")) === "51");
      assert.ok((await db("set role service_role; select public.appradar_read_catalog_stats();")).trim().length > 0);

      for (const id of ids.slice(2, 51)) await as(A, insert(id));
      assert.equal((await as(A, "select count(*) from public.watchlist_items;")).trim(), "50");
      await assert.rejects(as(A, insert(ids[1]!)), sqlError(/watchlist_limit_reached/));

      await db(`delete from auth.users where id = '${A}';`);
      assert.equal(await one(db, `select count(*) filter (where user_id = '${A}') || ',' || count(*) from public.watchlist_items;`), "0,1", "account deletion cascades only that user");
    });

    await t.test("preflight refuses databases that are not a clean or tool-managed Supabase project", async () => {
      for (const name of ["no_supabase", "unrecorded", "foreign_ledger"]) await admin(`create database ${name} template template0;`);
      const on = (database: string) => psql(target("supabase_admin", database), env);
      await assert.rejects(apply(on("no_supabase"), inventory, ledger), code("target_is_not_a_supabase_project"));
      for (const database of ["unrecorded", "foreign_ledger"]) await on(database)(shim, { transaction: true });
      await on("unrecorded")("create table public.apps (id int);");
      await assert.rejects(apply(on("unrecorded"), inventory, ledger), code("target_has_unrecorded_schema"));
      // The shape a development-style ledger has: no checksums.
      await on("foreign_ledger")("create schema appradar_meta; create table appradar_meta.schema_migrations (version text primary key, applied_at timestamptz default now());");
      await assert.rejects(apply(on("foreign_ledger"), inventory, ledger), code("ledger_not_recognised"));
      for (const database of ["no_supabase", "foreign_ledger"]) assert.equal((await on(database)("select coalesce(to_regclass('public.apps')::text, 'absent');")).trim(), "absent");
    });
  } finally {
    run("pg_ctl", ["-D", data, "-m", "immediate", "-w", "stop"]);
    rmSync(dir, { recursive: true, force: true });
  }
});
