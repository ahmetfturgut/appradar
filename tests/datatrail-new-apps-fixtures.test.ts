import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { normalizeItem, ObservationSchema } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";

test("DataTrail iOS new-free-apps fixture normalize olur; yayın tarihi korunur, popüler chart değildir", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/datatrail-ios-new-free-apps-6007.json", import.meta.url), "utf8")) as {
    redactedSamples: Record<string, unknown>[];
    redactedRows: { kind: string; observation?: Record<string, unknown> }[];
    run: { usageTotalUsd: number | null; chargedEventCounts?: Record<string, number> };
    stats: { appCount: number; chart: string; chartGenre: string };
  };
  const apps = fixture.redactedRows.filter(r => r.kind === "valid");
  assert.ok(apps.length > 10);
  assert.equal(fixture.stats.chart, "new-free-apps");
  assert.equal(fixture.stats.chartGenre, "6007");
  assert.ok(apps.every(r => r.observation?.source === "datatrail"));
  assert.ok(apps.every(r => r.observation?.observationRole === "discovery"));
  assert.ok(apps.every(r => r.observation?.rankContext === "newFreeApps"));
  assert.ok(apps.every(r => r.observation?.rankCategory === "6007"));
  assert.ok(apps.every(r => typeof r.observation?.releasedAt === "string"));
  assert.ok(apps.every(r => typeof r.observation?.listingUpdatedAt === "string"));
  assert.equal(new Set(apps.map(r => r.observation!.storeAppId)).size, apps.length);
  assert.ok(!apps.some(r => ["6448311069", "389801252", "284882215"].includes(String(r.observation?.storeAppId))));
  assert.equal(fixture.run.usageTotalUsd, 0.04405);
  assert.equal(fixture.run.chargedEventCounts?.app, 24);

  const values = {
    provider: "datatrail" as const, store: "ios" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "charts" as const, context: "newFreeApps", expectedIds: [] as string[], maxResults: 24, maxChargeUsd: 0.05 as const,
    input: { appleCharts: ["new-free-apps"], appleGenres: ["6007"], chartLimit: 10, trackRankChanges: false, countries: ["us"], language: "en", includeDescription: false, proxyConfiguration: { useApifyProxy: true } },
  };
  const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
  for (const sample of fixture.redactedSamples) {
    const result = normalizeItem(sample, job, "FixtureRun", "2026-11-26T12:00:00.000Z");
    assert.equal(result.kind, "valid");
    if (result.kind === "valid") {
      ObservationSchema.parse(result.observation);
      assert.equal(result.observation.releasedAt != null, true);
      assert.notEqual(result.observation.fieldStatus.releasedAt, "unsupported");
    }
  }
});
