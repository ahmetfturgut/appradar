// node --experimental-transform-types --test src/lib/collection/collection.test.ts
// The database scenarios need a DISPOSABLE PostgreSQL with all migrations plus the proposed bridge applied;
// point psql at it with PG* variables and set COLLECTION_TEST_PSQL=1. No network or Apify calls are made.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Run } from "../../poc/apify.ts";
import { sources, type Job } from "../../poc/plan.ts";
import { PersistenceError, type Rpc } from "../persistence/rpc.ts";
import { closedGates, CollectionConfig } from "./config.ts";
import { assessDataset, readDataset } from "./dataset.ts";
import { buildJob, enqueue, planJobs, scheduleDue } from "./jobs.ts";
import { collectionStore } from "./store.ts";
import { reconcileCosts, reportedCost, runNextJob, type Apify, type WorkerDeps } from "./worker.ts";

const example = CollectionConfig.parse(JSON.parse(readFileSync(new URL("./config.example.json", import.meta.url), "utf8")));
const samples = (name: string): unknown[] =>
  JSON.parse(readFileSync(new URL(`../../../tests/fixtures/${name}.json`, import.meta.url), "utf8")).redactedSamples;

test("example config covers all six providers and enables nothing", async () => {
  const planned = planJobs(example, new Date("2026-11-26T12:00:00Z"));
  assert.equal(new Set(planned.map(p => p.job.provider)).size, 6);
  assert.equal(planJobs(example, new Date(), { onlyEnabled: true }).length, 0);
  assert.deepEqual(await scheduleDue({ enqueue: async () => { throw new Error("must not write"); } }, example, new Date()), []);
  const closed = closedGates({
    APIFY_TOKEN: "t", APIFY_COLLECTION_ENABLED: "true",
    APPRADAR_THIRD_PARTY_RIGHTS_STATUS: "verified", POC_DATA_USE_CONFIRMED: "true",
  }, example);
  assert.ok(closed.includes("COLLECTION_PAID_EXECUTION_not_true"));
  assert.ok(closed.includes("retentionDays_not_configured"));
  assert.ok(closed.includes("budget_limits_missing"));
  assert.equal(closed.length, 3);
});

test("window and dedupe key are stable inside a frequency window", () => {
  const a = planJobs(example, new Date("2026-11-26T00:00:01Z"));
  const b = planJobs(example, new Date("2026-11-26T23:59:59Z"));
  assert.deepEqual([a[0]!.dedupeKey, a[0]!.scheduledFor], [b[0]!.dedupeKey, b[0]!.scheduledFor]);
});

test("empty, invalid and truncated datasets are not successes", async () => {
  const job = buildJob("aurelix", "charts", { store: "ios", country: "US", chart: "topFree", maxResults: 3 });
  const at = new Date().toISOString();
  assert.equal(assessDataset(job, "r1", at, [], false).verdict, "rejected");
  assert.equal(assessDataset(job, "r1", at, [{ status: "error" }], false).verdict, "rejected");
  const rows = samples("aurelix-ios-charts-topfree-6007");
  assert.equal(assessDataset(job, "r1", at, rows, false).complete, false);
  assert.equal(assessDataset(job, "r1", at, rows, false).reason, "coverage_uncertain");
  assert.equal(assessDataset(job, "r1", at, rows, false, { usageConfirmedBelowCap: true }).complete, true);
  assert.equal(assessDataset(job, "r1", at, rows, false, { chargeCapReached: true, usageConfirmedBelowCap: true }).complete, false);
  assert.equal(assessDataset(job, "r1", at, rows, false, { chargeCapReached: true }).reason, "charge_cap_stop");
  assert.equal(assessDataset(job, "r1", at, rows.slice(0, 2), false, { usageConfirmedBelowCap: true }).complete, false);
  assert.equal(assessDataset(job, "r1", at, [...rows, {}], false).complete, false);
  assert.equal(assessDataset(job, "r1", at, rows, true).verdict, "truncated");
  // Hard persist bound: provider overfetch beyond maxResults is discarded, not ranked.
  if (rows.length > 3) {
    const capped = assessDataset(job, "r1", at, rows, false, { usageConfirmedBelowCap: true });
    assert.equal(capped.apps.length, 3);
    assert.equal(capped.counts.expected, 3);
    assert.ok(capped.counts.received >= 3);
  }
  assert.deepEqual(reportedCost({ usageTotalUsd: 0, chargedEventCounts: {} }), { kind: "confirmed", usd: 0 });
  assert.equal(reportedCost({ usageTotalUsd: 0 }).kind, "unknown");
  assert.equal(reportedCost({ usageTotalUsd: null }).kind, "unknown");
  assert.equal(reportedCost({ usageTotalUsd: 0.02, chargedEventCounts: { result: 1 } }).kind, "unknown");
  const read = await readDataset(async (_id, _offset, limit) => Array<unknown>(limit ?? 0).fill({}), "d");
  assert.deepEqual([read.rows.length, read.truncated], [200, true]);
});

// ---------------------------------------------------------------- database scenarios

const sql = (statement: string) =>
  execFileSync("psql", ["-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"], { input: statement, encoding: "utf8", stdio: "pipe" }).trim();
const literal = (v: unknown) => v === null ? "null" : `$arg$${typeof v === "object" ? JSON.stringify(v) : String(v)}$arg$`;
/** Same contract as supabaseRpc, executed as service_role. */
const rpc: Rpc = async (name, args) => {
  const list = Object.entries(args).map(([k, v]) => `${k} => ${literal(v)}`).join(", ");
  try {
    return JSON.parse(sql(`set role service_role; select to_jsonb(public.${name}(${list}));`));
  } catch (error) {
    const state = /ERROR:\s+([A-Z0-9]{5}):/.exec(String((error as { stderr?: string }).stderr))?.[1];
    if (!state) throw error;
    throw new PersistenceError(`persistence_rejected_${state}`);
  }
};

function fakeApify(rows: unknown[], settings: { status?: Run["status"]; startError?: boolean; usageTotalUsd?: number | null; events?: Record<string, number> } = {}) {
  const calls = { start: 0 };
  let n = 0;
  const finishedAt = new Date().toISOString();
  const make = (job: Job, id: string): Run => ({
    id, actId: sources[job.provider].actorId, status: settings.status ?? "SUCCEEDED", buildId: sources[job.provider].buildId,
    defaultDatasetId: "dataset1", defaultKeyValueStoreId: "store1", startedAt: finishedAt, finishedAt,
    usageTotalUsd: settings.usageTotalUsd === undefined ? 0.02 : settings.usageTotalUsd,
    ...(settings.events === undefined ? { chargedEventCounts: { "app-result": rows.length } } : { chargedEventCounts: settings.events }),
  });
  const apify: Apify = {
    start: async job => { calls.start++; if (settings.startError) throw new Error("socket hang up"); return make(job, `Run${Date.now()}${n++}`); },
    getRun: async (id, job) => make(job, id),
    readPage: async (_id, offset, limit = 50) => rows.slice(offset, offset + limit),
  };
  return { apify, calls };
}

test("worker against the T1-T7 schema", { skip: process.env.COLLECTION_TEST_PSQL !== "1" }, async t => {
  const store = collectionStore(rpc);
  const config = CollectionConfig.parse({ maxAttempts: 2, retentionDays: 7 });
  let target = 0;
  /** A fresh charts target per scenario so scenarios do not block each other. */
  const queue = async () => {
    const job = buildJob("aurelix", "charts", { store: "ios", country: "US", chart: "topFree", maxResults: 3, category: String(6007) });
    const key = `test:${Date.now()}:${target++}`;
    const planned = { job, dedupeKey: key, scheduledFor: new Date(Date.now() - 1000).toISOString(), maxAttempts: config.maxAttempts };
    const [result] = await enqueue(store, [planned]);
    return { planned, jobId: result!.jobId };
  };
  const rows = samples("aurelix-ios-charts-topfree-6007");
  const deps = (apify: Apify, extra: Partial<WorkerDeps> = {}): WorkerDeps =>
    ({ store, apify, rpc, retentionDays: 7, sleep: async () => {}, budgetLimits: { dailyUsd: 1, monthlyUsd: 10 }, ...extra });
  const runRow = (jobId: string) => sql(`select execution_status||','||validation_status||','||cost_status from private.provider_runs where job_id='${jobId}' order by attempt_number desc limit 1`);
  const jobRow = (jobId: string) => sql(`select status||','||attempt_count from private.collection_jobs where id='${jobId}'`);
  const expireLease = (jobId: string) => sql(`begin; select set_config('appradar.lease_token', lease_token::text, true) from private.collection_jobs where id='${jobId}';
    update private.collection_jobs set lease_expires_at = now() - interval '1 second' where id='${jobId}'; commit;`);

  await t.test("without a budget nothing is started", async () => {
    const { jobId } = await queue();
    const fake = fakeApify(rows);
    const outcome = await runNextJob(deps(fake.apify, { budgetLimits: null }));
    assert.deepEqual([outcome.status, "reason" in outcome && outcome.reason, fake.calls.start], ["failed", "budget_not_configured", 0]);
    assert.equal(jobRow(jobId), "failed,1");
  });

  await t.test("success persists and a positive reported cost stays reserved until an operator confirms it", async () => {
    const { jobId, planned } = await queue();
    assert.equal((await enqueue(store, [planned]))[0]!.created, false);
    const fake = fakeApify(rows);
    const outcome = await runNextJob(deps(fake.apify));
    assert.equal(outcome.status, "succeeded", JSON.stringify(outcome));
    assert.equal(runRow(jobId), "succeeded,accepted,reserved");
    assert.equal(sql("select count(*) from public.app_snapshots"), "3");
    assert.equal(sql("select count(*) from public.discovery_snapshots"), "1");
    const later = await reconcileCosts({ store, apify: fake.apify });
    assert.equal(later.settled, 0);
    assert.equal(runRow(jobId), "succeeded,accepted,reserved");
    const runId = sql(`select id from private.provider_runs where job_id='${jobId}'`);
    await assert.rejects(store.reconcile(runId, "confirm_cost", "short", { actualUsd: 0.02 }), /23514/);
    await store.reconcile(runId, "confirm_cost", "provider invoice matches this run", { actualUsd: 0.02 });
    await store.reconcile(runId, "confirm_cost", "provider invoice matches this run", { actualUsd: 0.02 });
    assert.equal(runRow(jobId), "succeeded,accepted,settled");
  });

  await t.test("confirmed zero settles and a missing amount does not", async () => {
    const zero = await queue();
    assert.equal((await runNextJob(deps(fakeApify(rows, { usageTotalUsd: 0, events: {} }).apify))).status, "succeeded");
    assert.equal(runRow(zero.jobId).endsWith(",settled"), true);
    const missing = await queue();
    const outcome = await runNextJob(deps(fakeApify(rows, { usageTotalUsd: null, events: {} }).apify));
    assert.equal(outcome.status, "partial");
    assert.equal(runRow(missing.jobId).endsWith(",reserved"), true);
  });

  await t.test("lost start response blocks the target and holds the money", async () => {
    const { jobId, planned } = await queue();
    const fake = fakeApify(rows, { startError: true });
    assert.equal((await runNextJob(deps(fake.apify))).status, "start_unknown");
    assert.equal(runRow(jobId), "unknown,pending,reserved");
    const again = await enqueue(store, [{ ...planned, scheduledFor: new Date().toISOString() }]);
    assert.deepEqual([again[0]!.created, again[0]!.reason], [false, "target_busy_or_unresolved"]);
    assert.equal((await runNextJob(deps(fake.apify))).status, "idle");
    assert.equal(fake.calls.start, 1);
  });

  await t.test("crash between POST and recording the id never posts twice", async () => {
    const { jobId } = await queue();
    const fake = fakeApify(rows);
    const broken = { ...store, recordExternal: async () => { throw new Error("db down"); } };
    const first = await runNextJob(deps(fake.apify, { store: broken }));
    assert.ok("externalRunId" in first && first.externalRunId);
    expireLease(jobId);
    assert.equal((await runNextJob(deps(fake.apify))).status, "start_unknown");
    assert.equal(fake.calls.start, 1);
    assert.equal(runRow(jobId), "unknown,pending,reserved");
  });

  await t.test("ingest failure after a paid run resumes the same run", async () => {
    const { jobId } = await queue();
    const fake = fakeApify(rows);
    const down: Apify = { ...fake.apify, readPage: async () => { throw new Error("read failed"); } };
    assert.equal((await runNextJob(deps(down))).status, "deferred");
    assert.equal(jobRow(jobId), "ingesting,1");
    expireLease(jobId);
    const resumed = await runNextJob(deps(fake.apify));
    assert.equal(resumed.status, "succeeded", JSON.stringify(resumed));
    assert.equal(fake.calls.start, 1);
    assert.equal(jobRow(jobId), "succeeded,1");
  });

  await t.test("a stale lease cannot write", async () => {
    const { jobId } = await queue();
    const claim = (await store.claim(300))!;
    assert.equal(claim.job.id, jobId);
    await assert.rejects(store.renew({ ...claim, leaseToken: "00000000-0000-4000-8000-000000000000" }, 60), /42501/);
    await store.finish(claim, "failed", "test");
    await assert.rejects(store.finish(claim, "failed", "test"), /42501/);
  });

  await t.test("failed actor run is retried once, empty dataset is not", async () => {
    const { jobId } = await queue();
    const failed = fakeApify([], { status: "FAILED" });
    const options = { retryBackoffSeconds: -10 };
    assert.equal((await runNextJob(deps(failed.apify, { options }))).status, "retry_scheduled");
    assert.equal((await runNextJob(deps(failed.apify, { options }))).status, "failed");
    assert.deepEqual([jobRow(jobId), failed.calls.start], ["failed,2", 2]);
    const empty = await queue();
    const outcome = await runNextJob(deps(fakeApify([]).apify));
    assert.deepEqual([outcome.status, "reason" in outcome && outcome.reason], ["failed", "dataset_empty"]);
    assert.equal(runRow(empty.jobId).split(",")[1], "rejected");
  });

  await t.test("keyword rows reach T7; underfilled charts are partial", async () => {
    const job = buildJob("asokeyword", "keywords", { store: "ios", country: "US", term: "habit tracker", maxResults: 10 });
    await enqueue(store, [{ job, dedupeKey: `kw:${Date.now()}`, scheduledFor: new Date(Date.now() - 1000).toISOString(), maxAttempts: 1 }]);
    const outcome = await runNextJob(deps(fakeApify(samples("asokeyword-ios-habit-tracker")).apify));
    assert.equal(outcome.status, "succeeded", JSON.stringify(outcome));
    await queue();
    assert.equal((await runNextJob(deps(fakeApify(rows.slice(0, 2)).apify))).status, "partial");
  });

  await t.test("daily limit stops the POST", async () => {
    sql("update private.budget_periods set limit_usd = reserved_usd + spent_usd + 0.01 where period_type='daily'");
    const { jobId } = await queue();
    const fake = fakeApify(rows);
    const outcome = await runNextJob(deps(fake.apify));
    assert.deepEqual([outcome.status, "reason" in outcome && outcome.reason, fake.calls.start], ["retry_scheduled", "daily_budget_exceeded", 0]);
    assert.equal(jobRow(jobId), "queued,1");
  });
});
