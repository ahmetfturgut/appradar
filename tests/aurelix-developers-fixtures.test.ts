import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { normalizeItem } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";

const cases = [
  { file: "aurelix-ios-developers-570060151.json", store: "ios" as const, developerId: "570060151", url: "https://apps.apple.com/us/developer/duolingo/id570060151" },
  { file: "aurelix-play-developers-6957685454452609502.json", store: "play" as const, developerId: "6957685454452609502", url: "https://play.google.com/store/apps/dev?id=6957685454452609502" },
];

test("Aurelix geliştirici portföyü fixture satırları normalize olur", async () => {
  for (const item of cases) {
    const fixture = JSON.parse(await readFile(new URL(`./fixtures/${item.file}`, import.meta.url), "utf8")) as {
      redactedSamples: Record<string, unknown>[];
      redactedRows: { kind: string; observation?: { developerStoreId: string; observationRole: string; country: string } }[];
    };
    assert.ok(fixture.redactedRows.length >= 1 && fixture.redactedRows.length <= 5);
    assert.ok(fixture.redactedRows.every(row => row.kind === "valid"));
    assert.ok(fixture.redactedRows.every(row => row.observation?.developerStoreId === item.developerId));
    const values = {
      provider: "aurelix" as const, store: item.store, country: "US" as const, requestedLanguage: "en",
      round: 1 as const, mode: "developers" as const, context: item.developerId, expectedIds: [] as string[], maxResults: 5, maxChargeUsd: 0.05 as const,
      input: { apps: [], developers: [item.url], appStoreCharts: [], chartGenre: "", countries: ["us"], language: "en", maxAppsPerList: 5, maxReviewsPerApp: 0, proxyConfiguration: { useApifyProxy: false } },
    };
    const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
    for (const sample of fixture.redactedSamples) {
      const result = normalizeItem(sample, job, "FixtureRun1", "2026-11-26T07:57:05.000Z");
      assert.equal(result.kind, "valid", JSON.stringify(sample));
      if (result.kind !== "valid") continue;
      assert.equal(result.observation.country, "US");
      assert.equal(result.observation.source, "aurelix");
      assert.equal(result.observation.developerStoreId, item.developerId);
      assert.equal(result.observation.observationRole, "discovery");
      assert.equal(result.observation.rankContext, item.developerId);
    }
  }
});
