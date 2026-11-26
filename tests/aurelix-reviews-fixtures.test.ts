import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { normalizeItem } from "../src/poc/normalize.js";
import { Job, stableHash } from "../src/poc/plan.js";
import { redactedSample } from "../src/poc/journal.js";

test("Aurelix Play yorum fixture satırları normalize olur ve PII taşımaz", async () => {
  const fixture = JSON.parse(await readFile(new URL("./fixtures/aurelix-play-reviews-com-openai-chatgpt.json", import.meta.url), "utf8")) as {
    redactedSamples: Record<string, unknown>[];
    redactedRows: { kind: string; review?: { storeAppId: string; sourceReviewId: string; rating: number; idempotencyKey: string } }[];
  };
  const reviews = fixture.redactedRows.filter(r => r.kind === "valid_review");
  assert.equal(reviews.length, 10);
  assert.ok(reviews.every(r => r.review?.storeAppId === "com.openai.chatgpt"));
  assert.equal(new Set(reviews.map(r => r.review!.idempotencyKey)).size, 10);
  for (const sample of fixture.redactedSamples) {
    assert.equal(sample.type, "review");
    assert.ok(!("reviewer_name" in sample));
    assert.ok(!("reviewer_url" in sample));
    assert.ok(!("reviewer_avatar_url" in sample));
    assert.ok(!("text" in sample));
    assert.ok(!("review_title" in sample));
    assert.equal(typeof sample.review_id, "string");
    assert.equal(typeof sample.rating, "number");
  }
  const values = {
    provider: "aurelix" as const, store: "play" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "reviews" as const, context: "com.openai.chatgpt", expectedIds: ["com.openai.chatgpt"], maxResults: 10, maxChargeUsd: 0.05 as const,
    input: { apps: ["com.openai.chatgpt"], developers: [], appStoreCharts: [], chartGenre: "", countries: ["us"], language: "en", maxReviewsPerApp: 10, reviewSort: "mostrecent", onlyNewReviews: false, proxyConfiguration: { useApifyProxy: false } },
  };
  const job = Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
  for (const sample of fixture.redactedSamples) {
    // Reconstruct a minimal review row for schema checks without free text / PII.
    const raw = {
      type: "review", store: "google_play", app_id: "com.openai.chatgpt", country: "us", language: "en",
      review_id: sample.review_id, rating: sample.rating, date: sample.date, app_version: sample.app_version ?? null,
      helpful_votes: sample.helpful_votes ?? null, total_votes: sample.total_votes ?? null,
      review_title: sample.has_review_title ? "t" : null, text: sample.has_text ? "body" : null,
      developer_reply: sample.has_developer_reply ? "reply" : null, developer_reply_at: null,
    };
    const result = normalizeItem(raw, job, "FixtureRun1", "2026-11-26T08:10:00.000Z");
    assert.equal(result.kind, "valid_review", JSON.stringify(result));
  }
  const leaked = redactedSample({ type: "review", store: "google_play", app_id: "com.openai.chatgpt", review_id: "x", rating: 5, reviewer_name: "Private Person", text: "secret", review_title: "Hi" });
  assert.ok(!JSON.stringify(leaked).includes("Private"));
  assert.ok(!("text" in leaked));
});
