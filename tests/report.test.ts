import assert from "node:assert/strict";
import { test } from "node:test";
import { buildReport } from "../src/poc/report.js";
import type { Entry, Journal } from "../src/poc/journal.js";
import { normalizeItem } from "../src/poc/normalize.js";
import { fixtureJob, fixtureRow, fixtureRun, fixtureTime } from "./fixtures.js";

test("canlı veri yokken rapor başarı veya sıfır gerçek maliyet ilan etmez", () => {
  const report = buildReport({ version: 1, entries: {} });
  assert.equal(report.decision, "AWAITING_LIVE_DATA");
  assert.equal(report.detailSuccessRate, null);
  assert.ok(report.jobs.every(j => j.observedUsageUsd === null));
  assert.equal(report.invoiceVerified, false);
});

test("iki çekim teknik olarak geçse de fatura ve ticari kullanım kapısı açıkça doğrulanmamış kalır", () => {
  const first = fixtureJob();
  const second = fixtureJob({ round: 2 });
  const state: Journal = { version: 1, entries: {} };
  for (const [i, job] of [first, second].entries()) {
    const runId = `SyntheticRun${i}`;
    const time = i ? "2026-01-02T00:00:00.000Z" : fixtureTime;
    const entry: Entry = {
      jobId: job.id, reservedUsd: 0.05, status: "complete", startedAt: time,
      run: fixtureRun(job, { id: runId }), nextOffset: 1,
      results: { "0": normalizeItem(fixtureRow({ scrapedAt: time }), job, runId, time) },
      redactedSamples: [], ingestionTruncated: false, lastError: null,
    };
    state.entries[job.id] = entry;
  }
  const report = buildReport(state, [first, second]);
  assert.equal(report.decision, "TECHNICAL_RESULTS_READY_FOR_REVIEW");
  assert.equal(report.detailSuccessRate, 1);
  assert.equal(report.invoiceVerified, false);
  assert.equal(report.productionDataUseVerified, false);
  assert.equal(report.temporalComparisons.pairs[0]?.minGapMs, 86400000);
  const secondEntry = state.entries[second.id];
  assert.ok(secondEntry);
  secondEntry.ingestionTruncated = true;
  assert.equal(buildReport(state, [first, second]).decision, "NO_GO_REVIEW_REQUIRED");
});

test("aynı run veya aynı gözlem zamanı iki farklı tarihsel çekim sayılmaz", () => {
  const first = fixtureJob();
  const second = fixtureJob({ round: 2 });
  const state: Journal = { version: 1, entries: {} };
  for (const job of [first, second]) {
    state.entries[job.id] = {
      jobId: job.id, reservedUsd: 0.05, status: "complete", startedAt: fixtureTime, run: fixtureRun(job), nextOffset: 1,
      results: { "0": normalizeItem(fixtureRow(), job, "SyntheticRun001", fixtureTime) },
      redactedSamples: [], ingestionTruncated: false, lastError: null,
    };
  }
  const report = buildReport(state, [first, second]);
  assert.equal(report.decision, "NO_GO_REVIEW_REQUIRED");
  assert.equal(report.temporalComparisons.allPairsHaveDistinctTimes, false);
  assert.ok(report.jobs[1]?.problems.includes("run_reused_between_jobs"));
});
