import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { redactedSample } from "../src/poc/journal.js";
import { normalizeItem, ReviewObservationSchema } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";

test("TheWolves iOS yorum fixture satırları normalize olur; sanitised metin taşır, PII taşımaz", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/thewolves-ios-reviews-6448311069.json", import.meta.url), "utf8")) as {
    redactedSamples: Record<string, unknown>[];
    redactedRows: { kind: string; review?: Record<string, unknown> }[];
    run: { usageTotalUsd: number | null; chargedEventCounts?: Record<string, number> };
  };
  const reviews = fixture.redactedRows.filter(r => r.kind === "valid_review");
  assert.equal(reviews.length, 10);
  assert.ok(reviews.every(r => r.review?.storeAppId === "6448311069"));
  assert.ok(reviews.every(r => r.review?.source === "thewolves"));
  assert.ok(reviews.every(r => r.review?.country === "US"));
  assert.equal(new Set(reviews.map(r => r.review!.sourceReviewId)).size, 10);
  assert.equal(new Set(reviews.map(r => r.review!.idempotencyKey)).size, 10);
  assert.ok(reviews.every(r => typeof r.review?.title === "string" && String(r.review.title).includes("Sample")));
  assert.ok(reviews.every(r => typeof r.review?.text === "string" && String(r.review.text).includes("Sample")));
  assert.equal(fixture.run.usageTotalUsd, 0.001);
  assert.equal(fixture.run.chargedEventCounts?.["apify-default-dataset-item"], 10);
  for (const sample of fixture.redactedSamples) {
    assert.ok(!("userName" in sample));
    assert.ok(!("userUrl" in sample));
    assert.ok(!("text" in sample));
    assert.ok(!("title" in sample));
  }
  const values = {
    provider: "thewolves" as const, store: "ios" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "reviews" as const, context: "6448311069", expectedIds: ["6448311069"], maxResults: 10, maxChargeUsd: 0.05 as const,
    input: { appIds: ["6448311069"], country: "us", maxItems: 10 },
  };
  const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
  for (const sample of fixture.redactedSamples) {
    const raw = {
      id: sample.id, appId: sample.appId, country: sample.country, date: sample.date, score: sample.score, version: sample.version,
      title: "Sample App Store review title for fixture tests",
      text: "Sample App Store review body for analysis-pipeline fixture tests. Personal identifiers removed.",
    };
    const result = normalizeItem(raw, job, "FixtureRun", "2026-11-26T00:00:00.000Z");
    assert.equal(result.kind, "valid_review");
    if (result.kind === "valid_review") ReviewObservationSchema.parse(result.review);
  }
  const leaked = redactedSample({
    id: "1", appId: "6448311069", country: "US", date: "2026-11-25T00:00:00.000Z", score: 5,
    title: "Hi", text: "secret", userName: "@Private Person", userUrl: "https://example.invalid/x", version: "1.0",
  });
  assert.ok(!JSON.stringify(leaked).includes("Private"));
  assert.ok(!("text" in leaked));
});
