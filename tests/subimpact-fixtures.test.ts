import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { normalizeItem } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";

function discoveryJob(overrides: Partial<Job> & Pick<Job, "store" | "mode" | "context" | "input">): Job {
  const values = {
    provider: "subimpact" as const, country: "US" as const, requestedLanguage: "en", round: 1 as const,
    expectedIds: [] as string[], maxResults: 5, maxChargeUsd: 0.05 as const, ...overrides,
  };
  return Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
}

test("Subimpact fixture satırları arama ve Play liste bağlamıyla normalize olur", async () => {
  const cases = [
    { file: "subimpact-ios-search-habit-tracker.json", store: "ios" as const, mode: "search" as const, context: "Habit Tracker", input: { mode: "search", store: "ios", searchTerms: ["Habit Tracker"], country: "us", language: "en", maxItems: 5, fullDetails: true, proxy: { useApifyProxy: false } } },
    { file: "subimpact-play-search-habit-tracker.json", store: "play" as const, mode: "search" as const, context: "Habit Tracker", input: { mode: "search", store: "play", searchTerms: ["Habit Tracker"], country: "us", language: "en", maxItems: 5, fullDetails: true, proxy: { useApifyProxy: false } } },
    { file: "subimpact-play-charts-topfree.json", store: "play" as const, mode: "charts" as const, context: "topFree", input: { mode: "charts", store: "play", country: "us", language: "en", chartCollection: "topFree", iosGenreId: "6007", playCategory: "PRODUCTIVITY", maxItems: 5, fullDetails: true, proxy: { useApifyProxy: false } } },
  ];
  for (const item of cases) {
    const fixture = JSON.parse(await readFile(new URL(`./fixtures/${item.file}`, import.meta.url), "utf8")) as { redactedSamples: Record<string, unknown>[]; redactedRows: { kind: string }[] };
    assert.equal(fixture.redactedRows.length, 5);
    assert.ok(fixture.redactedRows.every(row => row.kind === "valid"));
    const job = discoveryJob(item);
    for (const sample of fixture.redactedSamples) {
      const result = normalizeItem(sample, job, "FixtureRun1", "2026-11-26T07:16:49.926Z");
      assert.equal(result.kind, "valid", JSON.stringify(sample));
      if (result.kind !== "valid") continue;
      assert.equal(result.observation.country, "US");
      assert.equal(result.observation.source, "subimpact");
      assert.equal(result.observation.rankContext, item.context);
      assert.ok((result.observation.rank ?? 0) >= 1);
      if (item.mode === "charts") assert.equal(result.observation.rankCategory, "PRODUCTIVITY");
    }
  }
});
