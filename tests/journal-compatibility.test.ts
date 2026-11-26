import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { normalizeItem, PersistedResultSchema, type NormalizationResult } from "../src/poc/normalize.js";
import { collectJob } from "../src/poc/runner.js";
import { stableHash, type Job } from "../src/poc/plan.js";
import { fixtureJob, fixtureRow, fixtureRun, fixtureTime } from "./fixtures.js";

// Reproduce the previous on-disk format, including its unsafe identity/time
// semantics. This fixture must stay distinguishable from newly normalized v2.
function legacy(result: NormalizationResult, job: Job) {
  const copy = JSON.parse(JSON.stringify(result));
  const value = copy.observation ?? copy.review ?? copy.keyword;
  assert.ok(value);
  value.schemaVersion = 1;
  if (copy.kind === "valid") {
    value.idempotencyKey = stableHash([job.provider, "Run1", value.storeAppId, job.country, job.requestedLanguage, job.mode, job.context]);
  } else if (copy.kind === "valid_review") {
    value.idempotencyKey = stableHash([value.sourceReviewId, value.store, job.country, job.requestedLanguage]);
    value.observedTimeBasis = value.reviewedAt == null ? "collection" : "source";
    value.reviewedAt ??= value.collectedAt;
  } else {
    value.idempotencyKey = stableHash(["asokeyword", "metrics", value.keyword, value.store, job.country, job.requestedLanguage]);
  }
  for (const key of ["canonicalAppKey", "collectionContext", "releasedAtPrecision", "listingUpdatedAtPrecision", "canonicalReviewKey", "reviewIdNamespace", "keywordContextKey", "measurementMethod", "relevantFilters", "languageInputSupported", "description", "iconUrl", "screenshotUrls"]) delete value[key];
  if (copy.kind !== "valid") delete value.observedAt;
  if (copy.kind === "valid_keyword") delete value.observedTimeBasis;
  assert.equal(PersistedResultSchema.safeParse(copy).success, true);
  return copy;
}

async function temporary(work: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "appradar-compat-"));
  try { await work(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

function entry(job: Job, result: unknown, status = "complete") {
  return { jobId: job.id, reservedUsd: 0.05, status, startedAt: fixtureTime, run: fixtureRun(job, { id: "Run1" }), nextOffset: 1, results: { "0": result }, redactedSamples: [], ingestionTruncated: false, lastError: null };
}

test("v1 app/review/keyword journal anahtarları ve bytes korunur; tamamlanan işe API çağrısı yapılmaz", async () => temporary(async directory => {
  const appJob = fixtureJob();
  const reviewJob = fixtureJob({ provider: "aurelix", mode: "reviews", expectedIds: [] });
  const keywordJob = fixtureJob({ provider: "asokeyword", mode: "keywords", context: "habit", expectedIds: [] });
  const results = [
    normalizeItem(fixtureRow(), appJob, "Run1", fixtureTime),
    normalizeItem({ type: "review", store: "app_store", app_id: "123", country: "tr", review_id: "r1", rating: 4 }, reviewJob, "Run1", fixtureTime),
    normalizeItem({ type: "metrics", keyword: "habit", store: "ios", country: "tr", checkedAt: fixtureTime }, keywordJob, "Run1", fixtureTime),
  ];
  const jobs = [appJob, reviewJob, keywordJob];
  const entries = Object.fromEntries(jobs.map((job, i) => [job.id, entry(job, legacy(results[i]!, job))]));
  const original = JSON.stringify({ version: 1, entries }, null, 2);
  await writeFile(join(directory, "state.json"), original);
  const journal = new PocJournal(directory);
  let calls = 0;
  const client = new ApifyClient("synthetic", async () => { calls++; throw new Error("no_network_allowed"); });
  await journal.exclusive(async () => {
    for (const job of jobs) {
      const saved = await collectJob(job, journal, client, { start: true, limitUsd: 5 });
      assert.equal(saved.jobId, job.id);
      assert.equal(saved.reservedUsd, 0.05);
      assert.equal(saved.run?.id, "Run1");
      assert.deepEqual(saved.results, entries[job.id]!.results);
    }
  });
  assert.equal(calls, 0);
  assert.equal(await readFile(join(directory, "state.json"), "utf8"), original);
  const archivedReview = journal.state.entries[reviewJob.id]!.results["0"];
  assert.ok(archivedReview?.kind === "valid_review");
  assert.equal(archivedReview.review.schemaVersion, 1);
  assert.equal("canonicalReviewKey" in archivedReview.review, false);
}));

test("yarım v1 job checkpoint'ten v2 satırlarla sürer; yeni ücretli run başlatılmaz", async () => temporary(async directory => {
  const job = fixtureJob({ expectedIds: [] });
  const old = legacy(normalizeItem(fixtureRow(), job, "Run1", fixtureTime), job);
  await writeFile(join(directory, "state.json"), JSON.stringify({ version: 1, entries: { [job.id]: entry(job, old, "ingesting") } }));
  const journal = new PocJournal(directory);
  let posts = 0;
  const offsets: number[] = [];
  const client = new ApifyClient("synthetic", async (url, init) => {
    if (init?.method === "POST") { posts++; throw new Error("unexpected_paid_start"); }
    const parsed = new URL(String(url));
    if (parsed.pathname.includes("/datasets/")) {
      offsets.push(Number(parsed.searchParams.get("offset")));
      return Response.json([fixtureRow({ appId: "9999000012", appUrl: "https://apps.apple.com/tr/app/id9999000012" })]);
    }
    return Response.json({ data: fixtureRun(job, { id: "Run1" }) });
  });
  await journal.exclusive(async () => {
    const saved = await collectJob(job, journal, client, { start: true, limitUsd: 5 });
    assert.equal(saved.status, "complete");
    assert.equal(saved.nextOffset, 2);
    assert.deepEqual(saved.results["0"], old);
    const current = saved.results["1"];
    assert.ok(current?.kind === "valid");
    assert.equal(current.observation.schemaVersion, 2);
    assert.equal(current.observation.sourceRunId, "Run1");
    await collectJob(job, journal, client, { start: true, limitUsd: 5 });
  });
  const reopened = new PocJournal(directory);
  await reopened.load();
  assert.equal(reopened.state.entries[job.id]!.nextOffset, 2);
  assert.equal(posts, 0);
  assert.deepEqual(offsets, [1]);
}));

test("bozuk v2 veya bilinmeyen schemaVersion journal'ı boş duruma düşürmez ve run başlatmaz", async () => temporary(async directory => {
  const job = fixtureJob();
  const normalized = normalizeItem(fixtureRow(), job, "Run1", fixtureTime);
  assert.ok(normalized.kind === "valid");
  for (const changes of [{ canonicalAppKey: "0".repeat(64) }, { schemaVersion: 99 }]) {
    const invalid = { ...normalized, observation: { ...normalized.observation, ...changes } };
    await writeFile(join(directory, "state.json"), JSON.stringify({ version: 1, entries: { [job.id]: entry(job, invalid) } }));
    const journal = new PocJournal(directory);
    let calls = 0;
    const client = new ApifyClient("synthetic", async () => { calls++; throw new Error("no_network_allowed"); });
    await assert.rejects(journal.exclusive(async () => collectJob(job, journal, client, { start: true, limitUsd: 5 })), /poc_state_invalid_or_unreadable/);
    assert.equal(calls, 0);
  }
}));
