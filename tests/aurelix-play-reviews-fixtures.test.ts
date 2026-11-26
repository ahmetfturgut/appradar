import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { redactedSample } from "../src/poc/journal.js";
import { normalizeItem, ReviewObservationSchema } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";

test("Aurelix Play reviews scraper fixture 20 üstü yorum taşır; metin sanitised, PII yok", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/aurelix-play-reviews-scraper-com-openai-chatgpt.json", import.meta.url), "utf8")) as {
    redactedSamples: Record<string, unknown>[];
    redactedRows: { kind: string; review?: Record<string, unknown> }[];
    run: { usageTotalUsd: number | null; chargedEventCounts?: Record<string, number> };
    stats: { reviewCount: number; reviewedAtMin: string | null; reviewedAtMax: string | null };
  };
  const reviews = fixture.redactedRows.filter(r => r.kind === "valid_review");
  assert.ok(reviews.length > 20);
  assert.equal(reviews.length, 100);
  assert.equal(fixture.stats.reviewCount, 100);
  assert.ok(reviews.every(r => r.review?.storeAppId === "com.openai.chatgpt"));
  assert.ok(reviews.every(r => r.review?.source === "aurelixplayreviews"));
  assert.ok(reviews.every(r => r.review?.country === "US"));
  assert.ok(reviews.every(r => r.review?.language === "en"));
  assert.equal(new Set(reviews.map(r => r.review!.sourceReviewId)).size, 100);
  assert.equal(new Set(reviews.map(r => r.review!.idempotencyKey)).size, 100);
  assert.ok(reviews.every(r => typeof r.review?.text === "string" && String(r.review.text).includes("Sample")));
  assert.ok(fixture.stats.reviewedAtMin && fixture.stats.reviewedAtMax);
  assert.ok(Number(fixture.run.usageTotalUsd) > 0 && Number(fixture.run.usageTotalUsd) <= 0.05);
  for (const sample of fixture.redactedSamples) {
    assert.ok(!("reviewer_name" in sample));
    assert.ok(!("reviewer_avatar_url" in sample));
    assert.ok(!("text" in sample));
  }
  const values = {
    provider: "aurelixplayreviews" as const, store: "play" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "reviews" as const, context: "com.openai.chatgpt", expectedIds: ["com.openai.chatgpt"],
    maxResults: 100, maxChargeUsd: 0.05 as const,
    input: { apps: ["com.openai.chatgpt"], maxReviewsPerApp: 100, sort: "newest", stars: "", language: "en", countries: ["us"], onlyNewReviews: false, proxyConfiguration: { useApifyProxy: true } },
  };
  const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
  for (const sample of fixture.redactedSamples) {
    const raw = {
      type: "review", store: "google_play", app_id: sample.app_id, country: sample.country, language: sample.language,
      review_id: sample.review_id, rating: sample.rating, date: sample.date, app_version: sample.app_version,
      helpful_votes: sample.helpful_votes, text: "Sample Google Play review body for analysis-pipeline fixture tests. Personal identifiers removed.",
    };
    const result = normalizeItem(raw, job, "FixtureRun", "2026-11-26T12:00:00.000Z");
    assert.equal(result.kind, "valid_review");
    if (result.kind === "valid_review") ReviewObservationSchema.parse(result.review);
  }
  const leaked = redactedSample({
    type: "review", store: "google_play", app_id: "com.openai.chatgpt", review_id: "x", rating: 5,
    reviewer_name: "Private Person", text: "secret", date: "2026-11-25T00:00:00.000Z",
  });
  assert.ok(!JSON.stringify(leaked).includes("Private"));
  assert.ok(!("text" in leaked));
});
