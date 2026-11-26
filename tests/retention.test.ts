// B2 retention. The database scenarios run in a disposable in-memory PGlite when
// RETENTION_PGLITE_PATH points at an existing local module; nothing is installed or contacted.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { PersistenceError, type Rpc } from "../src/lib/persistence/rpc.ts";
import { executionBlocks, parsePolicy, type RetentionPolicy } from "../src/lib/retention/policy.ts";
import { RETENTION_STEPS, runCleanup } from "../src/lib/retention/run.ts";

const exampleText = readFileSync(new URL("../src/lib/retention/policy.example.json", import.meta.url), "utf8");
const example = parsePolicy(exampleText);
const approved: RetentionPolicy = {
  ...example, approval: { approvedBy: "synthetic-test", approvedAt: "2026-01-01T00:00:00Z", evidence: "synthetic local test only" },
};
const open = { RETENTION_CLEANUP_EXECUTION: "true" };
const raw = () => JSON.parse(exampleText) as Record<string, unknown> & { categories: Record<string, unknown> };

test("example policy holds the planning defaults and is not approved", () => {
  assert.deepEqual(example.categories, {
    listing_current: 30, app_snapshots: 365, discovery_history: 365, keyword_history: 365,
    reviews: 90, collection_jobs: 90, provider_runs: 365, budget_records: 365,
  });
  assert.deepEqual([example.providers, example.approval], [{}, null]);
  assert.deepEqual(executionBlocks({}, example), ["RETENTION_CLEANUP_EXECUTION_not_true", "policy_not_approved"]);
});

test("missing or invalid configuration is refused, with field paths only", () => {
  for (const key of ["version", "categories", "providers", "approval"]) {
    const policy = raw();
    delete policy[key];
    assert.throws(() => parsePolicy(JSON.stringify(policy)), /^Error: retention_policy_invalid:/, key);
  }
  for (const category of Object.keys(example.categories)) {
    const policy = raw();
    delete policy.categories[category];
    assert.throws(() => parsePolicy(JSON.stringify(policy)), new RegExp(`categories\\.${category}`));
  }
  for (const value of [0, -1, 1.5, 731, "30", null]) {
    const policy = raw();
    policy.categories.reviews = value;
    assert.throws(() => parsePolicy(JSON.stringify(policy)), /categories\.reviews/);
  }
  for (const providers of [{ unknownProvider: { reviews: 5 } }, { aurelix: { budget_records: 5 } }, { aurelix: { typo: 5 } }]) {
    assert.throws(() => parsePolicy(JSON.stringify({ ...raw(), providers })), /retention_policy_invalid/);
  }
  assert.throws(() => parsePolicy(JSON.stringify({ ...raw(), approval: { approvedBy: "x" } })), /approval/);
  assert.throws(() => parsePolicy("{private"), /^Error: retention_policy_invalid:json$/);
  assert.deepEqual(parsePolicy(JSON.stringify({ ...raw(), providers: { thewolves: { reviews: 7 } } })).providers.thewolves, { reviews: 7 });
});

test("execution needs the environment flag and an approval; neither reaches the database otherwise", async () => {
  let calls = 0;
  const rpc: Rpc = async () => { calls++; throw new Error("must not be called"); };
  await assert.rejects(runCleanup(rpc, { policy: example, env: open, execute: true }), /policy_not_approved/);
  await assert.rejects(runCleanup(rpc, { policy: approved, env: {}, execute: true }), /RETENTION_CLEANUP_EXECUTION_not_true/);
  await assert.rejects(runCleanup(rpc, { policy: approved, env: open, execute: true, batchSize: 501 }), /batch_size/);
  assert.equal(calls, 0);
});

test("dry run is the default and calls only the read-only report", async () => {
  const names: string[] = [];
  const rpc: Rpc = async name => {
    names.push(name);
    return { eligible: Object.fromEntries(RETENTION_STEPS.map(s => [s.step, 0])), preserved: {} };
  };
  const result = await runCleanup(rpc, { policy: example, env: {}, execute: false });
  assert.equal(result.dryRun, true);
  assert.deepEqual(names, ["appradar_retention_report"]);
});

test("CLI refuses without a policy or open gates and never prints configuration values", () => {
  const secret = "sb_secret_synthetic_do_not_print";
  const cli = (args: string[], env: Record<string, string> = {}) => {
    try {
      execFileSync(process.execPath, ["--import", "tsx", "src/lib/retention/cli.ts", ...args], {
        cwd: new URL("..", import.meta.url), env: { PATH: process.env.PATH ?? "", NODE_ENV: "test", ...env }, encoding: "utf8", stdio: "pipe",
      });
      return "succeeded";
    } catch (error) {
      const failed = error as { stdout: string; stderr: string };
      return failed.stdout + failed.stderr;
    }
  };
  const policy = "src/lib/retention/policy.example.json";
  assert.match(cli([]), /retention_policy_required/);
  assert.match(cli(["--policy", "does-not-exist.json"]), /retention_policy_unreadable/);
  assert.match(cli(["--policy", policy]), /supabase_configuration_missing/);
  const refused = cli(["--policy", policy, "--execute"], { SUPABASE_URL: "https://synthetic.invalid", SUPABASE_SERVICE_ROLE_KEY: secret });
  assert.match(refused, /retention_execution_closed:RETENTION_CLEANUP_EXECUTION_not_true,policy_not_approved/);
  const badUrl = cli(["--policy", policy], { SUPABASE_URL: `not a url ${secret}`, SUPABASE_SERVICE_ROLE_KEY: secret });
  assert.doesNotMatch(refused + badUrl, /synthetic\.invalid|sb_secret/);
});

// ---------------------------------------------------------------- database scenarios

const SEED = `
alter table private.collection_jobs disable trigger collection_jobs_guard;
create function public.t_ago(days int) returns timestamptz language sql stable as $$ select now() - make_interval(days => days) $$;

create function public.t_periods(days int, reserved numeric default 0) returns uuid[] language plpgsql as $$
declare d timestamptz := date_trunc('day', public.t_ago(days) at time zone 'UTC') at time zone 'UTC';
  m timestamptz := date_trunc('month', public.t_ago(days) at time zone 'UTC') at time zone 'UTC';
  v_day uuid; v_month uuid;
begin
  insert into private.budget_periods(period_type, period_start, period_end, limit_usd, reserved_usd)
  select 'daily', d, d + interval '1 day', 5, reserved
  where not exists (select 1 from private.budget_periods where period_type = 'daily' and period_start = d);
  insert into private.budget_periods(period_type, period_start, period_end, limit_usd, reserved_usd)
  select 'monthly', m, ((m at time zone 'UTC') + interval '1 month') at time zone 'UTC', 50, reserved
  where not exists (select 1 from private.budget_periods where period_type = 'monthly' and period_start = m);
  select id into v_day from private.budget_periods where period_type = 'daily' and period_start = d;
  select id into v_month from private.budget_periods where period_type = 'monthly' and period_start = m;
  return array[v_day, v_month];
end $$;

create function public.t_job(key text, status text, days int, provider text default 'aurelix', attempts int default 1, max_attempts int default 3)
returns uuid language sql as $$
  insert into private.collection_jobs(provider, collection_mode, scope, dedupe_key, scheduled_for, status, attempt_count, max_attempts,
    lease_token, lease_expires_at, created_at, updated_at, started_at, completed_at)
  values (provider, 'details', '{}', key, public.t_ago(days), status, attempts, max_attempts,
    case when status in ('running', 'ingesting') then gen_random_uuid() end,
    case when status in ('running', 'ingesting') then public.t_ago(days) end,
    public.t_ago(days), public.t_ago(days), public.t_ago(days),
    case when status in ('succeeded', 'partial', 'cancelled') then public.t_ago(days) end)
  returning id
$$;

create function public.t_run(job uuid, ext text, execution text, cost text, days int, periods uuid[] default null, attempt int default 1)
returns void language sql as $$
  insert into private.provider_runs(job_id, attempt_number, provider, actor_id, actor_build_id, external_run_id, input_hash,
    execution_status, validation_status, cost_status, reserved_cost, settled_cost, reserved_at,
    daily_budget_period_id, monthly_budget_period_id, created_at, updated_at)
  select job, attempt, j.provider, 'synthetic', '1', ext, repeat('a', 64), execution,
    case when execution = 'succeeded' then 'accepted' else 'pending' end, cost,
    case when cost <> 'unset' then 1 end, case when cost = 'settled' then 1 end, case when cost <> 'unset' then public.t_ago(days) end,
    periods[1], periods[2], public.t_ago(days), public.t_ago(days)
  from private.collection_jobs as j where j.id = job
$$;

-- A finished, settled job and run for observations to reference.
create function public.t_done(provider text, ext text, days int) returns void language sql as $$
  select public.t_run(public.t_job(ext, 'succeeded', days, provider), ext, 'succeeded', 'settled', days, public.t_periods(days))
$$;

create function public.t_app(n int) returns uuid language sql as $$
  insert into public.apps(store, store_app_id, canonical_url, first_seen_at, last_seen_at)
  values ('ios', n::text, 'https://apps.apple.com/app/id' || n, public.t_ago(500), now())
  on conflict (store, store_app_id) do update set last_seen_at = excluded.last_seen_at returning id
$$;

create function public.t_listing(n int, observed_days int, expires timestamptz, provenance jsonb default '{}') returns bigint language sql as $$
  insert into public.app_listings(app_id, store, country, requested_language, name, rating_value, rating_count, price_amount,
    currency, is_free, field_provenance, first_seen_at, last_observed_at, expires_at)
  values (public.t_app(n), 'ios', 'US', 'en', 'Synthetic ' || n, 4, 10, 2, 'USD', false, provenance,
    public.t_ago(observed_days), public.t_ago(observed_days), expires)
  returning id
$$;

create function public.t_snapshot(listing bigint, provider text, ext text, days int, expires timestamptz, tag text) returns void language sql as $$
  with s as (
    insert into public.app_snapshots(listing_id, store, source, source_run_id, source_build, schema_version, idempotency_key,
      payload_hash, content_hash, series_key, observation_role, collection_mode, collection_context, observed_at,
      observed_time_basis, collected_at, field_status, expires_at)
    values (listing, 'ios', provider, ext, '1', 2, encode(sha256(tag::bytea), 'hex'), repeat('b', 64), repeat('c', 64), tag,
      'detail', 'details', tag, public.t_ago(days), 'collection', public.t_ago(days), '{}', expires)
    returning id
  )
  update public.app_listings set latest_snapshot_id = s.id from s where app_listings.id = listing
$$;

create function public.t_stamp(provider text, days int) returns jsonb language sql stable as $$
  select jsonb_build_object('source', provider, 'role', 'detail', 'observedAt', public.t_ago(days))
$$;
`;

const FIXTURES = `
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000001');

select public.t_done('aurelix', 'OldRun', 500);
select public.t_done('aurelix', 'NewRun', 5);
-- Still referenced by a retained review, so it keeps its own budget windows.
select public.t_done('thewolves', 'ReviewRun', 450);
select public.t_done('asokeyword', 'KeywordRun', 500);

-- 101: expired, unsaved. 102: expired, saved. 103: current with one old metric. 104: current.
select public.t_snapshot(public.t_listing(101, 400, public.t_ago(1)), 'aurelix', 'OldRun', 400, public.t_ago(1), 'snap101');
select public.t_listing(102, 400, public.t_ago(1));
insert into public.watchlist_items(user_id, app_id, country, requested_language)
select '00000000-0000-4000-8000-000000000001', id, 'US', 'en' from public.apps where store_app_id = '102';
select public.t_listing(103, 1, '2099-01-01',
  jsonb_build_object('rating_value', public.t_stamp('aurelix', 40), 'rating_count', public.t_stamp('aurelix', 1), 'price', public.t_stamp('aurelix', 1)));
select public.t_snapshot(public.t_listing(104, 1, '2099-01-01'), 'aurelix', 'NewRun', 1, '2099-01-01', 'snap104');

insert into public.discovery_snapshots(kind, source, source_run_id, source_build, store, country, requested_language, context,
  coverage_status, entry_count, observed_at, observed_time_basis, collected_at, payload_hash, expires_at)
select 'search', 'aurelix', run, '1', 'ios', 'US', 'en', 'synthetic', 'bounded', 1, public.t_ago(days), 'collection', public.t_ago(days),
  repeat('d', 64), '2099-01-01' from (values ('OldRun', 400), ('NewRun', 1)) as v(run, days);
insert into public.discovery_entries(snapshot_id, store, app_id, position, observation_key)
select id, 'ios', public.t_app(101), 1, repeat('e', 64) from public.discovery_snapshots;

insert into public.keyword_snapshots(source, source_run_id, source_build, schema_version, store, keyword, country,
  requested_language, relevant_filters, coverage_status, observed_at, collected_at, payload_hash, expires_at)
values ('asokeyword', 'KeywordRun', '1', 2, 'ios', 'synthetic', 'US', 'en', '{}', 'bounded', public.t_ago(400), public.t_ago(400), repeat('f', 64), '2099-01-01');
insert into public.keyword_entries(snapshot_id, store, row_type, idempotency_key, context_key, measurement_method, payload_hash,
  suggestion, field_status, checked_at)
select id, 'ios', 'suggestion', repeat('1', 64), repeat('2', 64), 'synthetic', repeat('3', 64), 'synthetic', '{}', observed_at from public.keyword_snapshots;

insert into public.reviews(canonical_review_key, app_id, store, review_id_namespace, source_review_id, rating,
  current_observed_at, first_seen_at, last_seen_at, expires_at)
select encode(sha256(tag::bytea), 'hex'), public.t_app(101), 'ios', 'actor:synthetic', tag, 3,
  public.t_ago(days), public.t_ago(days), public.t_ago(days), '2099-01-01' from (values ('old', 100), ('new', 1)) as v(tag, days);
insert into public.review_observations(review_id, source, source_run_id, source_build, schema_version, idempotency_key,
  payload_hash, content_hash, country, requested_language, rating, field_status, observed_at, observed_time_basis,
  collected_at, last_seen_at, expires_at)
select id, 'thewolves', 'ReviewRun', '1', 2, encode(sha256(('o' || source_review_id)::bytea), 'hex'), repeat('4', 64),
  repeat('5', 64), 'US', 'en', 3, '{}', last_seen_at, 'collection', last_seen_at, last_seen_at, expires_at from public.reviews;

-- Everything below is old but unresolved or unsettled and has to survive.
select public.t_job('queued', 'queued', 500, attempts => 0);
select public.t_job('running', 'running', 500);
select public.t_job('retryable', 'failed', 500);
select public.t_run(public.t_job('unknown', 'failed', 500, attempts => 3), null, 'unknown', 'reserved', 500, public.t_periods(600, 1));
select public.t_run(public.t_job('unsettled', 'succeeded', 500), 'Unsettled', 'succeeded', 'reserved', 500, public.t_periods(600, 1));
select public.t_run(public.t_job('costUnknown', 'succeeded', 500), 'CostUnknown', 'succeeded', 'unknown', 500, public.t_periods(600, 1));
-- Cancelled before any paid request: resolved.
select public.t_run(public.t_job('neverStarted', 'cancelled', 500), null, 'pending', 'unset', 500);
`;

const TABLES = [
  "public.developers", "public.apps", "public.app_listings", "public.app_snapshots", "public.discovery_snapshots",
  "public.discovery_entries", "public.keyword_snapshots", "public.keyword_entries", "public.reviews",
  "public.review_observations", "public.watchlist_items", "private.collection_jobs", "private.provider_runs",
  "private.budget_periods", "private.retention_lock",
];

const path = process.env.RETENTION_PGLITE_PATH;

test("retention against the real migrations", { skip: !path && "Set RETENTION_PGLITE_PATH to an existing local PGlite module; no dependencies are installed." }, async t => {
  const { PGlite } = await import(pathToFileURL(path!).href);

  async function database() {
    const db = new PGlite();
    await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; grant usage on schema auth to authenticated, service_role;");
    const directory = new URL("../supabase/migrations/", import.meta.url);
    for (const name of (await readdir(directory)).filter(n => n.endsWith(".sql")).sort()) {
      await db.exec(`begin;\n${await readFile(new URL(name, directory), "utf8")}\ncommit;`);
    }
    await db.exec(SEED);
    await db.exec(FIXTURES);

    /** Same contract as supabaseRpc, executed as service_role. */
    const rpc: Rpc = async (name, args) => {
      const keys = Object.keys(args);
      const values = keys.map(k => typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k]);
      await db.exec("set role service_role");
      try {
        return (await db.query(`select public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as result`, values)).rows[0].result;
      } catch (error) {
        throw new PersistenceError(`persistence_rejected_${(error as { code: string }).code}`);
      } finally {
        await db.exec("reset role");
      }
    };
    const rows = async (sql: string) => (await db.query(sql)).rows as Record<string, unknown>[];
    const count = async (from: string) => Number((await rows(`select count(*) as n from ${from}`))[0]!.n);
    const dump = async () => Object.fromEntries(await Promise.all(TABLES.map(async table =>
      [table, (await rows(`select to_jsonb(t)::text as data from ${table} as t order by 1`)).map(r => r.data)])));
    const eligible = async (policy: RetentionPolicy) => {
      const result = await runCleanup(rpc, { policy, env: {}, execute: false });
      assert.ok(result.dryRun);
      return Object.fromEntries(result.tables.map(row => [row.step, row.eligible]));
    };
    const execute = async (options: { batchSize?: number; maxBatches?: number } = {}) => {
      const result = await runCleanup(rpc, { policy: approved, env: open, execute: true, ...options });
      assert.ok(!result.dryRun);
      return result;
    };
    return { db, rpc, rows, count, dump, eligible, execute };
  }

  const expected = {
    review_observations: 1, reviews: 1, keyword_snapshots: 1, discovery_snapshots: 1, app_snapshots: 1,
    listing_metrics: 1, listing_content: 1, listings: 1,
    // OldRun, KeywordRun, neverStarted. ReviewRun still backs the retained review.
    provider_runs: 3, collection_jobs: 3,
    // The day and month windows of the 500 day runs only.
    budget_periods: 2,
  };

  await t.test("dry run reports by step without writing, even in a read-only transaction", async () => {
    const d = await database();
    const before = await d.dump();
    const counts = await d.eligible(example);
    assert.deepEqual(counts, expected);
    await d.db.exec("begin read only");
    await d.rpc("appradar_retention_report", { p_policy: example });
    await d.db.exec("commit");
    assert.deepEqual(await d.dump(), before);
    await d.db.close();
  });

  await t.test("execution matches the dry run, keeps protected rows and is repeatable", async () => {
    const d = await database();
    const planned = await d.eligible(approved);
    const identities = await d.rows("select to_jsonb(a)::text as data from public.apps a order by 1");
    const watchlist = await d.rows("select * from public.watchlist_items");
    const keptSnapshot = await d.rows("select to_jsonb(s)::text as data from public.app_snapshots s where series_key = 'snap104'");

    // A foreign-key violation anywhere in the order would surface as completed = false.
    const first = await d.execute();
    assert.equal(first.completed, true, JSON.stringify(first));
    assert.deepEqual(Object.fromEntries(first.tables.map(r => [r.step, r.affected])), planned);
    assert.ok(first.completed && Object.keys(first.stillEligible!).length === 0);
    assert.equal(first.tables.find(r => r.step === "keyword_snapshots")!.cascaded, 1);

    assert.deepEqual(await d.rows("select to_jsonb(a)::text as data from public.apps a order by 1"), identities);
    assert.deepEqual(await d.rows("select * from public.watchlist_items"), watchlist);
    assert.deepEqual(await d.rows("select to_jsonb(s)::text as data from public.app_snapshots s"), keptSnapshot);

    const listings = await d.rows(`select a.store_app_id as app, l.name, l.rating_value::text as rating, l.rating_count::text as ratings,
      l.price_amount::text as price, l.field_provenance ? 'rating_value' as has_rating, l.expires_at <= now() as expired
      from public.app_listings l join public.apps a on a.id = l.app_id order by 1`);
    assert.deepEqual(listings.map(l => l.app), ["102", "103", "104"]);
    assert.deepEqual(listings[0], { app: "102", name: null, rating: null, ratings: null, price: null, has_rating: false, expired: true });
    assert.deepEqual([listings[1]!.name, listings[1]!.rating, listings[1]!.ratings, listings[1]!.price, listings[1]!.has_rating, listings[1]!.expired],
      ["Synthetic 103", null, "10", "2.000000", false, false]);
    assert.equal(listings[2]!.rating, "4");

    const jobs = (await d.rows("select dedupe_key from private.collection_jobs order by 1")).map(r => r.dedupe_key);
    assert.deepEqual(jobs, ["NewRun", "ReviewRun", "costUnknown", "queued", "retryable", "running", "unknown", "unsettled"]);
    assert.equal(await d.count("private.provider_runs where execution_status = 'unknown'"), 1);
    assert.equal(await d.count("private.provider_runs where cost_status in ('reserved','unknown')"), 3);
    assert.equal(await d.count("private.budget_periods where reserved_usd <> 0"), 2);
    assert.equal(await d.count("private.budget_periods p where exists (select 1 from private.provider_runs r where r.external_run_id = 'ReviewRun' and p.id in (r.daily_budget_period_id, r.monthly_budget_period_id))"), 2);
    // Every remaining run still has both of its budget windows.
    assert.equal(await d.count("private.provider_runs where cost_status <> 'unset' and (daily_budget_period_id is null or monthly_budget_period_id is null)"), 0);
    assert.equal(await d.count("public.reviews"), 1);
    assert.equal(await d.count("public.discovery_entries"), 1);
    assert.equal(await d.count("private.retention_lock"), 0);

    const settled = await d.dump();
    const second = await d.execute();
    assert.equal(second.completed, true);
    assert.equal(second.tables.reduce((n, r) => n + r.affected, 0), 0);
    assert.deepEqual(await d.dump(), settled);
    await d.db.close();
  });

  await t.test("bounded batches stop at the limit and a later run finishes", async () => {
    const d = await database();
    const first = await d.execute({ batchSize: 1, maxBatches: 1 });
    assert.equal(first.completed, true, JSON.stringify(first));
    assert.ok(first.tables.every(r => r.affected <= 1 && r.batches === 1));
    assert.ok(first.completed && Object.keys(first.stillEligible!).length > 0);
    const rest = await d.execute({ batchSize: 1, maxBatches: 100 });
    assert.ok(rest.completed && Object.keys(rest.stillEligible!).length === 0, JSON.stringify(rest));
    assert.equal(await d.count("public.watchlist_items"), 1);
    await d.db.close();
  });

  await t.test("provider limits apply per provider; expires_at is honoured and never extended", async () => {
    const d = await database();
    await d.db.exec(`select public.t_done('subimpact', 'SubRun', 50); select public.t_done('aurelix', 'AurRun', 50);
      select public.t_snapshot(public.t_listing(201, 1, '2099-01-01'), 'subimpact', 'SubRun', 50, '2099-01-01', 'sub50');
      select public.t_snapshot(public.t_listing(202, 1, '2099-01-01'), 'aurelix', 'AurRun', 50, '2099-01-01', 'aur50');
      select public.t_snapshot(public.t_listing(203, 1, '2099-01-01'), 'aurelix', 'AurRun', 2, public.t_ago(1), 'shortExpiry');`);
    const base = (await d.eligible(example)).app_snapshots!;
    assert.equal(base, 2, "the 400 day snapshot and the one whose own expiry passed");
    const limited: RetentionPolicy = { ...approved, providers: { subimpact: { app_snapshots: 30 } } };
    assert.equal((await d.eligible(limited)).app_snapshots, base + 1);
    // A longer limit does not revive anything already past its stored expiry.
    const longer = { ...approved, categories: { ...approved.categories, app_snapshots: 730 } };
    assert.equal((await d.eligible(longer)).app_snapshots, 2);
    const expiries = "select id, expires_at::text from public.app_listings order by id";
    const before = new Map((await d.rows(expiries)).map(r => [r.id, r.expires_at]));
    const result = await runCleanup(d.rpc, { policy: limited, env: open, execute: true });
    assert.ok(!result.dryRun && result.completed, JSON.stringify(result));
    assert.equal(await d.count("public.app_snapshots where series_key in ('sub50','shortExpiry')"), 0);
    assert.equal(await d.count("public.app_snapshots where series_key = 'aur50'"), 1);
    for (const row of await d.rows(expiries)) {
      assert.ok(Date.parse(String(row.expires_at)) <= Date.parse(String(before.get(row.id))), "expiry moved later");
    }
    await d.db.close();
  });

  await t.test("the database refuses incomplete or unapproved policies and client roles", async () => {
    const d = await database();
    const before = await d.dump();
    const batch = (policy: unknown, step = "listings") =>
      d.rpc("appradar_retention_batch", { p_policy: policy, p_step: step, p_holder: "00000000-0000-4000-8000-00000000000a", p_limit: 10 });
    const incomplete = structuredClone(approved) as unknown as { categories: Record<string, unknown> };
    delete incomplete.categories.reviews;
    for (const policy of [incomplete, { ...approved, providers: undefined }, { ...approved, categories: { ...approved.categories, reviews: 0 } }]) {
      await assert.rejects(d.rpc("appradar_retention_report", { p_policy: policy }), /23514/);
      await assert.rejects(batch(policy), /23514/);
    }
    await assert.rejects(batch(example), /42501/);
    await assert.rejects(batch(approved, "apps"), /23514/);
    for (const role of ["anon", "authenticated"]) {
      await d.db.exec(`set role ${role}`);
      await assert.rejects(d.db.query("select public.appradar_retention_report('{}'::jsonb)"), /permission denied/);
      await assert.rejects(d.db.query("select * from private.retention_lock"), /permission denied/);
      await d.db.exec("reset role");
    }
    // Without row-level-security bypass saved listings would be invisible: refuse instead.
    await d.db.exec("alter role service_role nobypassrls");
    await assert.rejects(d.rpc("appradar_retention_report", { p_policy: approved }), /42501/);
    await assert.rejects(batch(approved), /42501/);
    assert.deepEqual(await d.dump(), before);
    await d.db.close();
  });

  await t.test("a live lease blocks a second execution and an abandoned one expires", async () => {
    const d = await database();
    const holder = "00000000-0000-4000-8000-00000000000b";
    await d.rpc("appradar_retention_batch", { p_policy: approved, p_step: "listing_metrics", p_holder: holder, p_limit: 1 });
    const before = await d.dump();
    const blocked = await d.execute();
    assert.equal(blocked.completed, false);
    assert.deepEqual(blocked.failure, { step: "review_observations", error: "retention_cleanup_locked" });
    assert.deepEqual(await d.dump(), before, "the blocked run changed nothing and kept the other lease");
    await d.db.exec("update private.retention_lock set expires_at = now() - interval '1 second'");
    assert.equal((await d.execute()).completed, true);
    await d.db.close();
  });
});
