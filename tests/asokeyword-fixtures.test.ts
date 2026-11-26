import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { normalizeItem, KeywordObservationSchema } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";

test("ASO Keyword Intel fixture ranking+metrics normalize olur; popularity hacim değildir", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/asokeyword-ios-habit-tracker.json", import.meta.url), "utf8")) as {
    redactedSamples: Record<string, unknown>[];
    redactedRows: { kind: string; keyword?: Record<string, unknown> }[];
    run: { usageTotalUsd: number | null; chargedEventCounts?: Record<string, number> };
    stats: { rankingRows: number; metricsRows: number; suggestionRows: number };
  };
  const rows = fixture.redactedRows.filter(r => r.kind === "valid_keyword");
  assert.equal(rows.length, 11);
  assert.equal(fixture.stats.rankingRows, 10);
  assert.equal(fixture.stats.metricsRows, 1);
  assert.equal(fixture.stats.suggestionRows, 0);
  assert.ok(rows.every(r => r.keyword?.source === "asokeyword"));
  assert.ok(rows.every(r => r.keyword?.keyword === "habit tracker"));
  assert.ok(rows.every(r => r.keyword?.store === "ios" && r.keyword?.country === "US"));
  assert.equal(new Set(rows.map(r => r.keyword!.idempotencyKey)).size, 11);
  const metrics = rows.find(r => r.keyword?.rowType === "metrics")!.keyword!;
  assert.equal(metrics.popularitySource, "apple");
  assert.equal(typeof metrics.popularity, "number");
  assert.ok(Number(metrics.popularity) >= 5 && Number(metrics.popularity) <= 100);
  assert.equal(typeof metrics.difficulty, "number");
  assert.equal(fixture.run.usageTotalUsd, 0.04);
  assert.equal(fixture.run.chargedEventCounts?.["ranking-row"], 10);
  assert.equal(fixture.run.chargedEventCounts?.["metrics-row"], 1);

  const values = {
    provider: "asokeyword" as const, store: "ios" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "keywords" as const, context: "habit tracker", expectedIds: [] as string[],
    maxResults: 20, maxChargeUsd: 0.05 as const,
    input: { keywords: ["habit tracker"], store: "ios", country: "us", appIds: [], topN: 10, includeSuggestions: false, includePopularity: true },
  };
  const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
  for (const sample of fixture.redactedSamples) {
    const result = normalizeItem(sample, job, "FixtureRun", "2026-11-26T12:00:00.000Z");
    assert.equal(result.kind, "valid_keyword");
    if (result.kind === "valid_keyword") KeywordObservationSchema.parse(result.keyword);
  }
  // The context is stable, while a new run is a new historical observation.
  const metricsRaw = fixture.redactedSamples.find(s => s.type === "metrics");
  assert.ok(metricsRaw);
  const a = normalizeItem(metricsRaw, job, "RunA", "2026-11-26T12:00:00.000Z");
  const b = normalizeItem(metricsRaw, job, "RunB", "2026-11-26T12:00:00.000Z");
  assert.equal(a.kind, "valid_keyword");
  assert.equal(b.kind, "valid_keyword");
  assert.ok(a.kind === "valid_keyword" && b.kind === "valid_keyword");
  assert.equal(a.keyword.keywordContextKey, b.keyword.keywordContextKey);
  assert.notEqual(a.keyword.idempotencyKey, b.keyword.idempotencyKey);
  const replay = normalizeItem(metricsRaw, job, "RunA", "2026-11-26T13:00:00.000Z");
  assert.ok(replay.kind === "valid_keyword");
  assert.equal(replay.keyword.idempotencyKey, a.keyword.idempotencyKey);
});
