import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { normalizeItem } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";

test("Aurelix iOS Productivity Top Free fixture satırları normalize olur", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/aurelix-ios-charts-topfree-6007.json", import.meta.url), "utf8")) as {
    redactedSamples: Record<string, unknown>[];
    redactedRows: { kind: string; observation?: { rank: number; rankContext: string; rankCategory: string; country: string; source: string } }[];
  };
  assert.equal(fixture.redactedRows.length, 5);
  assert.ok(fixture.redactedRows.every(row => row.kind === "valid"));
  const values = {
    provider: "aurelix" as const, store: "ios" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "charts" as const, context: "topFree", expectedIds: [] as string[], maxResults: 5, maxChargeUsd: 0.05 as const,
    input: { apps: [], developers: [], appStoreCharts: ["top-free"], chartGenre: "6007", countries: ["us"], language: "en", maxAppsPerList: 5, maxReviewsPerApp: 0, proxyConfiguration: { useApifyProxy: false } },
  };
  const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
  for (const sample of fixture.redactedSamples) {
    const result = normalizeItem(sample, job, "FixtureRun1", "2026-11-26T08:00:00.000Z");
    assert.equal(result.kind, "valid", JSON.stringify(sample));
    if (result.kind !== "valid") continue;
    assert.equal(result.observation.country, "US");
    assert.equal(result.observation.source, "aurelix");
    assert.equal(result.observation.rankContext, "topFree");
    assert.equal(result.observation.rankCategory, "6007");
    assert.ok((result.observation.rank ?? 0) >= 1 && (result.observation.rank ?? 0) <= 5);
  }
  assert.deepEqual(fixture.redactedRows.map(r => r.observation?.rank), [1, 2, 3, 4, 5]);
});
