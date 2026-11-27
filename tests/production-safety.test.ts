// Option A safety: collection target isolation, closed production catalog reads and migration tooling.
// Fully offline: fake fetchers and a fake SQL executor. No database, provider or psql is used.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { assertDevelopmentEnvironment, collectionTargetProblems, developmentCollectionRpc, developmentEnvironmentProblems } from "../src/lib/collection/target.ts";
import { indexingHeaderRules, publicIndexingApproved } from "../src/lib/config/indexing.ts";
import { landingMetadata, legalMetadata } from "../src/lib/landing/metadata.ts";
import { createReadClient } from "../src/lib/read/client.ts";
import { catalogDisplayClosed } from "../src/lib/read/display-policy.ts";
import { exploreApps, getDashboard } from "../src/lib/read/index.ts";
import { reviewContentEnabled, storeDescriptionEnabled } from "../src/lib/read/shared.ts";
import { productionConfigProblems } from "../src/lib/config/production.ts";
import { apply, inspect, LEDGER_ROWS_SQL, loadInventory, migrationScript, MigrationError, parseTarget, PREFLIGHT_SQL, sha256, type Migration, type Sql } from "../src/lib/migrate/runner.ts";
import { developmentRefs, psqlInvocation, sanitizeError } from "../src/lib/migrate/cli.ts";
import { dictionaries } from "../src/lib/landing/dictionaries.ts";
import { legalDictionaries } from "../src/lib/landing/legal.ts";

const DEV = "devprojectrefabcdefg", PROD = "prodprojectrefhijklm";
const jwt = (claims: object) => `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
const devEnv = {
  APPRADAR_DEVELOPMENT_PROJECT_REF: DEV, SUPABASE_URL: `https://${DEV}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fixture",
};

test("collection targets only the explicitly declared development project", () => {
  assert.deepEqual(collectionTargetProblems(devEnv), []);
  assert.deepEqual(collectionTargetProblems({ ...devEnv, NEXT_PUBLIC_SUPABASE_URL: `https://${DEV}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: jwt({ role: "service_role", ref: DEV }) }), []);
  const rejected: [Record<string, string>, string][] = [
    [{ APPRADAR_DEVELOPMENT_PROJECT_REF: "" }, "APPRADAR_DEVELOPMENT_PROJECT_REF_missing"],
    [{ APPRADAR_DEVELOPMENT_PROJECT_REF: "NOT A REF" }, "APPRADAR_DEVELOPMENT_PROJECT_REF_invalid"],
    [{ SUPABASE_URL: `https://${PROD}.supabase.co` }, "SUPABASE_URL_not_development_project"],
    [{ SUPABASE_URL: "http://127.0.0.1:54321" }, "SUPABASE_URL_not_development_project"],
    [{ SUPABASE_URL: `https://${DEV}.supabase.co/rest/v1/` }, "SUPABASE_URL_not_development_project"],
    [{ SUPABASE_URL: `https://${DEV}.supabase.co.evil.example` }, "SUPABASE_URL_not_development_project"],
    [{ SUPABASE_URL: "" }, "SUPABASE_URL_missing"],
    [{ NEXT_PUBLIC_SUPABASE_URL: `https://${PROD}.supabase.co` }, "NEXT_PUBLIC_SUPABASE_URL_not_development_project"],
    [{ APPRADAR_SUPABASE_PROJECT_REF: DEV }, "development_ref_is_declared_production_ref"],
    [{ SUPABASE_SERVICE_ROLE_KEY: jwt({ role: "service_role", ref: PROD }) }, "SUPABASE_SERVICE_ROLE_KEY_project_mismatch"],
    [{ SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_x" }, "SUPABASE_SERVICE_ROLE_KEY_wrong_key_type"],
    [{ NODE_ENV: "production" }, "production_environment"],
  ];
  for (const [override, reason] of rejected) {
    assert.ok(collectionTargetProblems({ ...devEnv, ...override }).includes(reason), reason);
    let requests = 0;
    assert.throws(() => developmentCollectionRpc({ ...devEnv, ...override }, async () => { requests++; return new Response("{}"); }), /^Error: collection_target_closed:/);
    assert.equal(requests, 0);
  }
  assert.doesNotMatch(collectionTargetProblems({ ...devEnv, SUPABASE_URL: "https://private-host.example", SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_hidden" }).join(), /private-host|hidden/);
});

test("a verified development target still reaches the database client", async () => {
  const seen: string[] = [];
  const rpc = developmentCollectionRpc(devEnv, async input => { seen.push(String(input)); return new Response("[]"); });
  await rpc("appradar_fixture", {});
  assert.deepEqual(seen, [`https://${DEV}.supabase.co/rest/v1/rpc/appradar_fixture`]);
});

test("every mutating collection command refuses an unverified target before any request", () => {
  const env = { PATH: process.env.PATH!, SUPABASE_URL: `https://${PROD}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_do_not_print", APIFY_TOKEN: "token-do-not-print", APPRADAR_DEVELOPMENT_PROJECT_REF: DEV };
  const commands: [string, ...string[]][] = [["enqueue", "--provider", "aurelix", "--mode", "details"], ["schedule"], ["work"], ["reconcile"], ["resolve", "--run", "r", "--decision", "confirm_absent", "--evidence", "e"]];
  for (const args of commands) {
    const run = spawnSync(process.execPath, ["--import", "tsx", "src/lib/collection/cli.ts", ...args, "--execute"], { env: env as unknown as NodeJS.ProcessEnv, encoding: "utf8", timeout: 60000 });
    assert.equal(run.status, 1, args[0]);
    assert.match(run.stderr, /^collection_target_closed:SUPABASE_URL_not_development_project/, args[0]);
    assert.doesNotMatch(run.stdout + run.stderr, /do_not_print|do-not-print/);
  }
});

test("production builds never read the third-party catalog", async () => {
  const previous = { ...process.env };
  try {
    let requests = 0;
    const client = createReadClient({ url: `https://${PROD}.supabase.co`, serviceRoleKey: "sb_secret_fixture" }, async () => { requests++; return new Response("[]", { headers: { "content-range": "0-0/0" } }); });
    // No flag opens it.
    Object.assign(process.env, { NODE_ENV: "production", APPRADAR_PUBLIC_COMMERCIAL_DISPLAY_AUTHORIZED: "true", APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "verified", APPRADAR_STORE_DESCRIPTION_ENABLED: "true", APPRADAR_REVIEW_CONTENT_ENABLED: "true" });
    const closed = (error: unknown) => (error as { code?: string }).code === "catalog_display_closed";
    for (const table of ["apps", "developers", "app_listings", "app_snapshots", "discovery_snapshots", "discovery_entries", "reviews", "review_observations", "keyword_snapshots", "keyword_entries"]) {
      await assert.rejects(client.select(table, {}), closed, table);
      await assert.rejects(client.count(table, {}), closed, table);
    }
    await assert.rejects(client.rpc("appradar_read_catalog_stats", {}), closed);
    await assert.rejects(exploreApps({}, client), closed);
    await assert.rejects(getDashboard({}, client), closed);
    assert.equal(requests, 0, "nothing reaches the network");
    assert.equal(storeDescriptionEnabled(), false);
    assert.equal(reviewContentEnabled(), false);

    Object.assign(process.env, { NODE_ENV: "development" });
    assert.equal(catalogDisplayClosed(), false);
    assert.equal(storeDescriptionEnabled(), true, "development behaviour is unchanged");
    await client.select("apps", {});
    assert.equal(requests, 1);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
  }
});

test("only the read client builds PostgREST table requests, so the production gate covers all catalog reads", async () => {
  const offenders: string[] = [];
  for (const name of (await readdir("src", { recursive: true })).filter(n => /\.tsx?$/.test(n))) {
    if (/\/rest\/v1\/(?!rpc)/.test((await readFile(`src/${name}`, "utf8")).replace(/^\s*(\/\/|\*|\/\*).*$/gm, ""))) offenders.push(name);
  }
  assert.deepEqual(offenders.filter(n => !["lib/read/client.ts", "lib/landing/dictionaries.ts"].includes(n)), []);
});

test("production configuration refuses content flags and the development project", () => {
  for (const flag of ["APPRADAR_STORE_ICONS_ENABLED", "APPRADAR_STORE_SCREENSHOTS_ENABLED", "APPRADAR_STORE_DESCRIPTION_ENABLED", "APPRADAR_REVIEW_CONTENT_ENABLED"]) {
    assert.ok(productionConfigProblems({ [flag]: "true" }).includes(`${flag}:must_be_false`), flag);
    assert.ok(!productionConfigProblems({ [flag]: "false" }).includes(`${flag}:must_be_false`), flag);
  }
  assert.ok(productionConfigProblems({ APPRADAR_SUPABASE_PROJECT_REF: DEV, APPRADAR_DEVELOPMENT_PROJECT_REF: DEV }).includes("APPRADAR_SUPABASE_PROJECT_REF:is_development_project"));
});

const url = (user: string, host: string, port = 5432, query = "") => `postgresql://${user}:s3cret%40pw@${host}:${port}/postgres${query}`;

test("migration target must be the named, non-development Supabase project", () => {
  const pooled = parseTarget(url(`postgres.${PROD}`, "aws-0-eu-central-1.pooler.supabase.com"), PROD, [DEV]);
  assert.equal(pooled.ref, PROD); assert.equal(pooled.password, "s3cret@pw"); assert.equal(pooled.sslmode, "require");
  assert.equal(parseTarget(url("postgres", `db.${PROD}.supabase.co`, 5432, "?sslmode=verify-full"), PROD, [DEV]).sslmode, "verify-full");

  const refuse = (connection: string, ref: string, code: string, forbidden = [DEV]) => assert.throws(() => parseTarget(connection, ref, forbidden), (e: unknown) => {
    assert.ok(e instanceof MigrationError); assert.equal(e.code, code, connection.replace(/:[^:@]*@/, ":…@")); assert.doesNotMatch(e.message, /s3cret/); return true;
  });
  refuse(url(`postgres.${DEV}`, "aws-0-x.pooler.supabase.com"), DEV, "target_is_development_project");
  refuse(url(`postgres.${DEV}`, "aws-0-x.pooler.supabase.com"), PROD, "target_is_development_project");
  refuse(url("postgres.otherprojectrefabcde", "aws-0-x.pooler.supabase.com"), PROD, "database_url_does_not_match_target_ref");
  refuse(url("postgres", `db.${DEV}.supabase.co`), PROD, "target_is_development_project");
  refuse(url("postgres", "db.example.com"), PROD, "database_target_not_recognised");
  refuse(url("postgres", "127.0.0.1"), PROD, "database_target_not_recognised");
  refuse(url(`postgres.${PROD}`, "pooler.supabase.com.evil.example"), PROD, "database_target_not_recognised");
  refuse(url("postgres", `db.${PROD}.supabase.co`, 5432, `?host=db.${DEV}.supabase.co`), PROD, "database_url_has_extra_parameters");
  refuse(url("postgres", `db.${PROD}.supabase.co`, 5432, "?sslmode=disable"), PROD, "database_url_requires_tls");
  refuse(url(`postgres.${PROD}`, "aws-0-x.pooler.supabase.com", 6543), PROD, "database_port_must_be_5432_session_mode");
  refuse(url("postgres", `db.${PROD}.supabase.co`), PROD, "development_project_not_declared", []);
  refuse("not a url s3cret", PROD, "database_url_unparseable");

  assert.throws(() => developmentRefs({}, null), /APPRADAR_DEVELOPMENT_PROJECT_REF_missing/);
  assert.deepEqual(developmentRefs({ APPRADAR_DEVELOPMENT_PROJECT_REF: DEV }, `SUPABASE_URL=https://localfilerefabcdefg.supabase.co\nNEXT_PUBLIC_SUPABASE_URL="https://localfilerefabcdefg.supabase.co"\n`), [DEV, "localfilerefabcdefg"]);
});

test("psql receives credentials by environment only, and errors are redacted", () => {
  const target = parseTarget(url("postgres", `db.${PROD}.supabase.co`), PROD, [DEV]);
  const call = psqlInvocation(target, { PATH: "/bin", HOME: "/h", PGHOSTADDR: "10.0.0.1", PGSERVICE: "other", DATABASE_URL: "x" }, true);
  assert.doesNotMatch(call.args.join(" "), /s3cret|supabase\.co/);
  assert.ok(call.args.includes("--single-transaction") && call.args.includes("ON_ERROR_STOP=1") && call.args.includes("-X"));
  assert.deepEqual(Object.keys(call.env).sort(), ["HOME", "PATH", "PGAPPNAME", "PGCONNECT_TIMEOUT", "PGDATABASE", "PGHOST", "PGPASSWORD", "PGPORT", "PGSSLMODE", "PGUSER"]);
  assert.ok(!psqlInvocation(target, {}, false).args.includes("--single-transaction"));
  assert.equal(sanitizeError("NOTICE: x\npsql: error: auth failed for s3cret@pw / s3cret%40pw", target.password), "psql: error: auth failed for *** / ***");
});

const manifest = async () => JSON.parse(await readFile("supabase/migrations.manifest.json", "utf8")) as { file: string; sha256: string }[];
const realInventory = async () => {
  const files = await readdir("supabase/migrations");
  const sources = new Map(await Promise.all(files.map(async f => [f, await readFile(`supabase/migrations/${f}`, "utf8")] as const)));
  return loadInventory(await manifest(), files, f => sources.get(f)!);
};

test("the committed manifest matches the 13 migrations in order and detects changes", async () => {
  const inventory = await realInventory();
  assert.equal(inventory.length, 13);
  assert.equal(inventory[0]!.file, "20261126000100_catalog_core.sql");
  assert.equal(inventory[12]!.file, "20261126001300_media_suppression.sql");
  // Each file must be able to run inside one transaction through psql stdin.
  for (const m of inventory) assert.doesNotMatch(m.sql, /^\s*(begin|commit|rollback)\s*;|\bconcurrently\b|^\\/im, m.file);
  const entry = [{ file: "20260101000000_a.sql", sha256: sha256("select 1;") }];
  assert.throws(() => loadInventory(entry, ["20260101000000_a.sql"], () => "select 2;"), /migration_changed_since_manifest/);
  assert.throws(() => loadInventory(entry, ["20260101000000_a.sql", "20260102000000_new.sql"], () => "select 1;"), /inventory_differs_from_manifest/);
  assert.throws(() => loadInventory(entry, [], () => ""), /inventory_differs_from_manifest/);
});

/** In-memory stand-in for the database as seen through psql. */
function fakeDatabase(options: { supabase?: boolean; appTables?: number; ledgerColumns?: string[]; rows?: { version: string; checksum: string }[]; failOn?: string } = {}) {
  const state = { ledger: !!options.ledgerColumns || !!options.rows, rows: [...(options.rows ?? [])], appTables: options.appTables ?? (options.rows?.length ? 6 : 0) };
  const writes: string[] = [];
  const sql: Sql = async (script, call = {}) => {
    if (script === PREFLIGHT_SQL) return JSON.stringify({ version: 170000, supabase: options.supabase ?? true, ledger: state.ledger, ledgerColumns: state.ledger ? options.ledgerColumns ?? ["applied_at", "checksum", "version"] : [], appTables: state.appTables });
    if (script === LEDGER_ROWS_SQL) return JSON.stringify(state.rows);
    assert.equal(call.transaction, true, "every write is transactional");
    writes.push(script);
    const record = script.match(/values \('([^']+)', '([0-9a-f]{64})'\)/);
    if (!record) { state.ledger = true; return ""; }
    if (record[1] === options.failOn) throw new MigrationError("sql_failed", "ERROR:  boom");
    state.rows.push({ version: record[1]!, checksum: record[2]! }); state.appTables = 6;
    return "";
  };
  return { sql, writes, state };
}
const three: Migration[] = ["20260101000000_a.sql", "20260102000000_b.sql", "20260103000000_c.sql"].map(file => ({ file, sha256: sha256(file), sql: `-- ${file}` }));
const recorded = (n: number) => three.slice(0, n).map(m => ({ version: m.file, checksum: m.sha256 }));

test("preflight refuses unknown, development-like or altered databases without writing", async () => {
  for (const [options, code] of [
    [{ supabase: false }, "target_is_not_a_supabase_project"],
    [{ appTables: 4 }, "target_has_unrecorded_schema"],
    [{ ledgerColumns: ["applied_at", "version"], appTables: 6 }, "ledger_not_recognised"],
    [{ rows: [{ version: three[1]!.file, checksum: three[1]!.sha256 }] }, "ledger_does_not_match_inventory"],
    [{ rows: [...recorded(1), { version: "20269999000000_unknown.sql", checksum: "a".repeat(64) }] }, "ledger_does_not_match_inventory"],
    [{ rows: [{ version: three[0]!.file, checksum: "b".repeat(64) }] }, "applied_migration_was_changed"],
  ] as const) {
    const db = fakeDatabase(options as Parameters<typeof fakeDatabase>[0]);
    await assert.rejects(apply(db.sql, three, "-- ledger"), (e: unknown) => (e as MigrationError).code === code, code);
    assert.deepEqual(db.writes, [], code);
  }
});

test("apply records each migration atomically, stops on the first error and resumes", async () => {
  const failing = fakeDatabase({ failOn: three[1]!.file });
  await assert.rejects(apply(failing.sql, three, "-- ledger"), /migration_failed: 20260102000000_b\.sql was rolled back; 1 applied/);
  assert.equal(failing.writes[0], "-- ledger");
  assert.equal(failing.writes.length, 3, "ledger, first, failed second; the third never starts");
  assert.deepEqual(failing.state.rows, recorded(1));

  const resumed = fakeDatabase({ rows: failing.state.rows });
  assert.deepEqual((await inspect(resumed.sql, three)).pending.map(m => m.file), [three[1]!.file, three[2]!.file]);
  assert.deepEqual(await apply(resumed.sql, three, "-- ledger"), { applied: [three[1]!.file, three[2]!.file], total: 3 });
  assert.equal(resumed.writes.length, 2, "applied migrations are not re-run and the ledger is not recreated");
  assert.deepEqual(await apply(fakeDatabase({ rows: recorded(3) }).sql, three, "-- ledger"), { applied: [], total: 3 });

  const script = migrationScript(three[0]!);
  assert.ok(script.indexOf("insert into appradar_meta.schema_migrations") < script.indexOf(three[0]!.sql), "a duplicate version fails before the migration runs");
  assert.throws(() => migrationScript({ file: "x'; drop table t;--.sql", sha256: "a".repeat(64), sql: "" }), /manifest_order_or_name_invalid/);
});

test("migration CLI refuses the development project and never prints the connection string", () => {
  const run = (target: string, user: string) => spawnSync(process.execPath, ["--import", "tsx", "src/lib/migrate/cli.ts", "--target-ref", target], {
    env: { PATH: process.env.PATH!, APPRADAR_DEVELOPMENT_PROJECT_REF: DEV, APPRADAR_MIGRATION_DATABASE_URL: url(user, "aws-0-x.pooler.supabase.com") } as unknown as NodeJS.ProcessEnv, encoding: "utf8", timeout: 60000,
  });
  const refused = run(DEV, `postgres.${DEV}`);
  assert.equal(refused.status, 1); assert.match(refused.stderr, /^target_is_development_project/);
  const offline = run(PROD, `postgres.${PROD}`);
  assert.equal(offline.status, 0, offline.stderr);
  assert.equal(JSON.parse(offline.stdout).order.length, 13);
  assert.doesNotMatch(refused.stdout + refused.stderr + offline.stdout + offline.stderr, /s3cret|pooler\.supabase\.com/);
});

test("privacy drafts disclose the browser-local appearance preference and remain drafts", () => {
  assert.match(JSON.stringify(legalDictionaries.en), /appearance choice \(Light, Dark or System\) in this browser's local storage/);
  assert.match(JSON.stringify(legalDictionaries.tr), /görünüm tercihinizi \(Açık, Koyu veya Sistem\) bu tarayıcının yerel depolamasında/);
  assert.match(JSON.stringify(legalDictionaries.en), /Owner information is incomplete/);
  assert.ok(dictionaries.en.footer.unpublished.startsWith("Draft"));
});

test("paid tools need the declared development project before the provider token is used", async () => {
  const tools = (await readdir("tools")).filter(f => f.endsWith(".ts"));
  assert.equal(tools.length, 10);
  for (const tool of tools) {
    const source = await readFile(`tools/${tool}`, "utf8");
    const guard = source.indexOf("assertDevelopmentEnvironment(process.env);");
    assert.ok(guard > 0, `${tool} is guarded`);
    assert.ok(guard < source.indexOf("new ApifyClient"), `${tool}: guard precedes the provider client`);
  }
  // No other source file builds a provider client.
  const clients: string[] = [];
  for (const name of (await readdir("src", { recursive: true })).filter(n => /\.ts$/.test(n) && !n.endsWith(".test.ts"))) {
    if ((await readFile(`src/${name}`, "utf8")).includes("new ApifyClient(")) clients.push(name);
  }
  assert.deepEqual(clients, ["lib/collection/cli.ts"]);

  assert.deepEqual(developmentEnvironmentProblems({ APPRADAR_DEVELOPMENT_PROJECT_REF: DEV, SUPABASE_URL: devEnv.SUPABASE_URL }), []);
  for (const env of [{}, { APPRADAR_DEVELOPMENT_PROJECT_REF: DEV }, { APPRADAR_DEVELOPMENT_PROJECT_REF: DEV, SUPABASE_URL: `https://${PROD}.supabase.co` }, { ...devEnv, NODE_ENV: "production" }]) {
    assert.throws(() => assertDevelopmentEnvironment(env), /^Error: collection_target_closed:/);
  }
});

test("tool and retention CLIs refuse paid or destructive runs on an unverified target", () => {
  // `work`-free child processes: nothing is contacted because each refuses first. A fake token proves the order.
  const env = { PATH: process.env.PATH!, APPRADAR_DEVELOPMENT_PROJECT_REF: DEV, SUPABASE_URL: `https://${PROD}.supabase.co`, APIFY_TOKEN: "token-do-not-print", APIFY_COLLECTION_ENABLED: "true", POC_LIMIT_USD: "1", SUPABASE_SERVICE_ROLE_KEY: "sb_secret_do_not_print", RETENTION_CLEANUP_EXECUTION: "true" };
  const spawn = (args: string[]) => spawnSync(process.execPath, ["--import", "tsx", ...args], { env: env as unknown as NodeJS.ProcessEnv, encoding: "utf8", timeout: 60000 });

  // The retention gates themselves stay first: an unapproved policy is refused as before.
  const unapproved = spawn(["src/lib/retention/cli.ts", "--policy", "src/lib/retention/policy.example.json", "--execute"]);
  assert.match(unapproved.stderr, /^retention_execution_closed:policy_not_approved/);

  const policy = { ...JSON.parse(readFileSync("src/lib/retention/policy.example.json", "utf8")), approval: { approvedBy: "test", approvedAt: "2026-11-27T00:00:00Z", evidence: "synthetic evidence used only by this offline refusal test" } };
  const dir = mkdtempSync(join(tmpdir(), "appradar-policy-"));
  try {
    writeFileSync(join(dir, "policy.json"), JSON.stringify(policy));
    const refused = spawn(["src/lib/retention/cli.ts", "--policy", join(dir, "policy.json"), "--execute"]);
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /^collection_target_closed:SUPABASE_URL_not_development_project/);
    assert.doesNotMatch(refused.stdout + refused.stderr, /do_not_print|do-not-print/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("indexing is off by default and headers agree with metadata", () => {
  for (const value of [undefined, "", "false", "TRUE", "1", "yes"]) assert.equal(publicIndexingApproved(value === undefined ? {} : { APPRADAR_PUBLIC_INDEXING_APPROVED: value }), false);
  assert.equal(publicIndexingApproved({ APPRADAR_PUBLIC_INDEXING_APPROVED: "true" }), true);
  assert.deepEqual(indexingHeaderRules(false), [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]);
  assert.equal(indexingHeaderRules(true)[0]!.source, "/:path((?!en$|tr$).*)");
  const production = { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://example.test" };
  for (const locale of ["en", "tr"] as const) {
    assert.deepEqual(landingMetadata(locale, production).robots, { index: false, follow: false });
    assert.equal(landingMetadata(locale, production).alternates!.canonical, `https://example.test/${locale}`);
    assert.deepEqual(legalMetadata(locale, "privacy", { ...production, APPRADAR_PUBLIC_INDEXING_APPROVED: "true" }).robots, { index: false, follow: false });
  }
});
