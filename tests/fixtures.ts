import { Job, createPlan, sources, stableHash } from "../src/poc/plan.js";
import type { Run } from "../src/poc/apify.js";

// Tamamı sentetik fixture; gerçek uygulama sonucu veya geçmişi değildir.
export const fixtureTime = "2026-01-01T00:00:00.000Z";
export function fixtureJob(overrides: Partial<Job> = {}): Job {
  const original = createPlan()[0];
  if (!original) throw new Error("plan_empty");
  const values = { ...original, expectedIds: ["9999000011"], ...overrides };
  return Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
}
export function fixtureRow(overrides: Record<string, unknown> = {}) {
  return { store: "ios", appId: "9999000011", appTitle: "Sentetik test kaydı", appUrl: "https://apps.apple.com/tr/app/synthetic/id9999000011", country: "tr", scrapedAt: fixtureTime, rating: 0, ratingCount: 0, price: 0, currency: "TRY", isFree: true, ...overrides };
}
export function fixtureRun(job = fixtureJob(), overrides: Partial<Run> = {}): Run {
  return {
    id: "SyntheticRun001", actId: sources[job.provider].actorId, buildId: sources[job.provider].buildId, buildNumber: sources[job.provider].build,
    defaultDatasetId: "SyntheticDataset001", defaultKeyValueStoreId: "SyntheticStore001", startedAt: fixtureTime,
    finishedAt: fixtureTime, status: "SUCCEEDED", usageTotalUsd: 0.01, options: { maxTotalChargeUsd: 0.05 }, ...overrides,
  };
}
