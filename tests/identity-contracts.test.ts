import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { canonicalAppIdentity, normalizeItem, ObservationSchema, ReviewObservationSchema, KeywordObservationSchema, PersistedResultSchema } from "../src/poc/normalize.js";
import type { Job } from "../src/poc/plan.js";
import { fixtureJob, fixtureRow, fixtureTime } from "./fixtures.js";

function review(raw: Record<string, unknown> = {}, overrides: Partial<Job> = {}, run = "Run1", collectedAt = fixtureTime) {
  const job = fixtureJob({ provider: "aurelix", store: "ios", country: "US", requestedLanguage: "en", mode: "reviews", context: "123", expectedIds: [], ...overrides });
  const result = normalizeItem({ type: "review", store: job.store === "ios" ? "app_store" : "google_play", app_id: job.store === "ios" ? "123" : "com.example.app", country: job.country.toLowerCase(), review_id: "same-review", rating: 4, date: fixtureTime, scraped_at: fixtureTime, ...raw }, job, run, collectedAt);
  assert.ok(result.kind === "valid_review", JSON.stringify(result));
  return ReviewObservationSchema.parse(result.review);
}

function keyword(raw: Record<string, unknown> = {}, overrides: Partial<Job> = {}, run = "Run1", collectedAt = fixtureTime) {
  const job = fixtureJob({ provider: "asokeyword", store: "ios", country: "US", requestedLanguage: "en", mode: "keywords", context: "habit tracker", expectedIds: [], input: { topN: 10, appIds: [], includePopularity: true, includeSuggestions: false }, ...overrides });
  const result = normalizeItem({ type: "metrics", keyword: job.context, store: job.store === "ios" ? "ios" : "android", country: job.country.toLowerCase(), popularity: 56, popularitySource: "apple", difficulty: 72, measuredAt: null, checkedAt: fixtureTime, ...raw }, job, run, collectedAt);
  assert.ok(result.kind === "valid_keyword", JSON.stringify(result));
  return KeywordObservationSchema.parse(result.keyword);
}

test("review canonical kimliği app ve namespace içerir; run yalnızca gözlemi değiştirir", () => {
  const a = review();
  const replay = review({}, {}, "Run1", "2026-01-02T00:00:00Z");
  const next = review({}, {}, "Run2");
  assert.equal(a.canonicalReviewKey, replay.canonicalReviewKey);
  assert.equal(a.idempotencyKey, replay.idempotencyKey);
  assert.equal(a.canonicalReviewKey, next.canonicalReviewKey);
  assert.notEqual(a.idempotencyKey, next.idempotencyKey);
  assert.notEqual(a.canonicalReviewKey, review({ app_id: "456" }).canonicalReviewKey);
  assert.equal(a.canonicalReviewKey, review({ text: "entirely edited text", rating: 1 }).canonicalReviewKey);
  const embedded = review({}, { store: "play" });
  const dedicated = review({}, { store: "play", provider: "aurelixplayreviews" });
  assert.notEqual(embedded.reviewIdNamespace, dedicated.reviewIdNamespace);
  assert.notEqual(embedded.canonicalReviewKey, dedicated.canonicalReviewKey);
});

test("review ülke, istenen dil ve doğrulanmış dil gözlem bağlamında ayrıdır", () => {
  const a = review();
  const tr = review({}, { country: "TR" });
  const requestedTr = review({}, { requestedLanguage: "tr" });
  assert.equal(a.canonicalReviewKey, tr.canonicalReviewKey);
  assert.equal(a.canonicalReviewKey, requestedTr.canonicalReviewKey);
  assert.equal(new Set([a, tr, requestedTr].map(r => r.idempotencyKey)).size, 3);
  assert.equal(requestedTr.language, null);
  const unknown = review({}, { store: "play" });
  const en = review({ language: "en" }, { store: "play" });
  assert.equal(unknown.canonicalReviewKey, en.canonicalReviewKey);
  assert.notEqual(unknown.idempotencyKey, en.idempotencyKey);
});

test("bilinmeyen yorum tarihi null; gözlem ve toplama tarihleri ayrı kalır", () => {
  const missing = review({ date: null, scraped_at: null });
  assert.equal(missing.reviewedAt, null);
  assert.equal(missing.fieldStatus.reviewedAt, "missing");
  assert.equal(missing.observedAt, fixtureTime);
  assert.equal(missing.observedTimeBasis, "collection");
  const known = review({ date: "2025-06-01T00:00:00Z", scraped_at: "2025-12-31T23:59:00Z" });
  assert.equal(known.reviewedAt, "2025-06-01T00:00:00Z");
  assert.equal(known.observedAt, "2025-12-31T23:59:00Z");
  assert.equal(known.collectedAt, fixtureTime);
  assert.equal(known.observedTimeBasis, "source");
  const wolvesJob = fixtureJob({ provider: "thewolves", store: "ios", mode: "reviews", expectedIds: [] });
  const wolves = normalizeItem({ id: "r1", appId: "123", country: "tr", score: 5 }, wolvesJob, "Run1", fixtureTime);
  assert.ok(wolves.kind === "valid_review");
  assert.equal(wolves.review.reviewedAt, null);
  assert.equal(wolves.review.observedTimeBasis, "collection");
});

test("keyword context sabit kalır; run ve ranking/metrics/suggestion satırları ayrılır", () => {
  const a = keyword();
  const replay = keyword({}, {}, "Run1", "2026-01-02T00:00:00Z");
  const next = keyword({}, {}, "Run2");
  assert.equal(a.keywordContextKey, next.keywordContextKey);
  assert.equal(a.idempotencyKey, replay.idempotencyKey);
  assert.notEqual(a.idempotencyKey, next.idempotencyKey);
  const ranking = keyword({ type: "ranking", appId: "123", rank: 1 });
  const suggestion = keyword({ type: "suggestion", suggestion: "habit tracker free" });
  assert.equal(new Set([a, ranking, suggestion].map(k => k.idempotencyKey)).size, 3);
  assert.notEqual(ranking.idempotencyKey, keyword({ type: "ranking", appId: "456", rank: 2 }).idempotencyKey);
  assert.equal(ranking.idempotencyKey, keyword({ type: "ranking", appId: "123", rank: 2 }).idempotencyKey);
  assert.notEqual(suggestion.idempotencyKey, keyword({ type: "suggestion", suggestion: "habit tracker paid" }).idempotencyKey);
});

test("keyword context yöntem, Apple/proxy kaynağı, ülke, dil isteği ve filtreleri korur", () => {
  const a = keyword();
  const proxy = keyword({ popularity: null, popularityProxy: 42, popularitySource: "proxy" });
  const top20 = keyword({}, { input: { topN: 20, appIds: [], includePopularity: true, includeSuggestions: false } });
  const filtered = keyword({}, { input: { topN: 10, appIds: ["123"], includePopularity: true, includeSuggestions: false } });
  const tr = keyword({}, { country: "TR" });
  const requestedTr = keyword({}, { requestedLanguage: "tr" });
  const android = keyword({ popularitySource: "proxy" }, { store: "play" });
  assert.equal(new Set([a, proxy, top20, filtered, tr, requestedTr, android].map(k => k.keywordContextKey)).size, 7);
  assert.notEqual(a.measurementMethod, proxy.measurementMethod);
  assert.equal(requestedTr.requestedLanguage, "tr");
  assert.equal(requestedTr.language, null);
  assert.equal(requestedTr.languageInputSupported, false);
  const filterA = keyword({}, { input: { appIds: ["456", "123", "123"] } });
  const filterB = keyword({}, { input: { appIds: ["123", "456"] } });
  assert.equal(filterA.keywordContextKey, filterB.keywordContextKey);
});

test("keyword measuredAt, checkedAt ve collectedAt birbirinin yerine kullanılmaz", () => {
  const k = keyword({ measuredAt: "2025-12-01T00:00:00Z", stale: true, checkedAt: "2025-12-31T00:00:00Z" });
  assert.equal(k.measuredAt, "2025-12-01T00:00:00Z");
  assert.equal(k.observedAt, k.checkedAt);
  assert.equal(k.observedTimeBasis, "source");
  assert.equal(k.collectedAt, fixtureTime);
  assert.equal(keyword().measuredAt, null);
  assert.equal(keyword().fieldStatus.measuredAt, "missing");
  const job = fixtureJob({ provider: "asokeyword", mode: "keywords", context: "x" });
  assert.equal(normalizeItem({ type: "metrics", keyword: "x", store: "ios", country: "tr", checkedAt: "2099-01-01T00:00:00Z" }, job, "Run1", fixtureTime).kind, "invalid");
});

test("app canonical kimliği adlardan bağımsızdır; store/rol/discovery kategorisi korunur", () => {
  const app = normalizeItem(fixtureRow(), fixtureJob(), "Run1", fixtureTime);
  const renamed = normalizeItem(fixtureRow({ appTitle: "Renamed", developerName: "Other developer" }), fixtureJob(), "Run1", fixtureTime);
  assert.ok(app.kind === "valid" && renamed.kind === "valid");
  ObservationSchema.parse(app.observation);
  assert.equal(app.observation.canonicalAppKey, renamed.observation.canonicalAppKey);
  assert.equal(app.observation.idempotencyKey, renamed.observation.idempotencyKey);
  const otherActor = normalizeItem({ type: "app", store: "app_store", app_id: "9999000011", title: "Different title", url: "https://apps.apple.com/tr/app/id9999000011", country: "tr" }, fixtureJob({ provider: "aurelix" }), "Run1", fixtureTime);
  assert.ok(otherActor.kind === "valid");
  assert.equal(app.observation.canonicalAppKey, otherActor.observation.canonicalAppKey);
  assert.notEqual(app.observation.idempotencyKey, otherActor.observation.idempotencyKey);
  assert.notEqual(canonicalAppIdentity("ios", "same-id"), canonicalAppIdentity("play", "same-id"));
  const charts = ["6007", "6014"].map(category => normalizeItem(fixtureRow({ chartRank: 1, chartCollection: "topFree", chartCategory: category }), fixtureJob({ mode: "charts", context: "topFree", input: { iosGenreId: category } }), "Run1", fixtureTime));
  const [a, b] = charts;
  assert.ok(a?.kind === "valid" && b?.kind === "valid");
  assert.equal(a.observation.canonicalAppKey, b.observation.canonicalAppKey);
  assert.notEqual(a.observation.idempotencyKey, b.observation.idempotencyKey);
  assert.notEqual(a.observation.idempotencyKey, app.observation.idempotencyKey);
  assert.equal(a.observation.observationRole, "discovery");
  assert.equal(a.observation.collectionContext.category, "6007");
});

test("yayın/güncelleme tarihleri uydurulmaz; kaynak gün hassasiyeti açıkça korunur", async () => {
  const app = normalizeItem(fixtureRow({ scrapedAt: null }), fixtureJob(), "Run1", fixtureTime);
  assert.ok(app.kind === "valid");
  assert.equal(app.observation.releasedAt, null);
  assert.equal(app.observation.listingUpdatedAt, null);
  assert.equal(app.observation.releasedAtPrecision, null);
  assert.equal(app.observation.observedTimeBasis, "collection");
  const fixture = JSON.parse(await readFile(new URL("./fixtures/datatrail-ios-new-free-apps-6007.json", import.meta.url), "utf8"));
  const job = fixtureJob({ provider: "datatrail", store: "ios", country: "US", requestedLanguage: "en", mode: "charts", context: "newFreeApps", expectedIds: [], input: fixture.job.input });
  const sample = fixture.redactedSamples[0];
  const r = normalizeItem(sample, job, "Run1", "2026-11-26T12:00:00Z");
  assert.ok(r.kind === "valid");
  assert.equal(r.observation.releasedAtPrecision, "date");
  assert.equal(r.observation.listingUpdatedAtPrecision, "date");
  assert.equal(r.observation.observedTimeBasis, "collection");
  assert.equal(normalizeItem({ ...sample, releaseDate: "2026-02-30" }, job, "Run1", fixtureTime).kind, "invalid");
});

test("v2 şema kimlik-bağlam uyuşmazlığını v1 olarak sessizce kabul etmez", () => {
  const r = review();
  assert.equal(PersistedResultSchema.safeParse({ kind: "valid_review", review: { ...r, canonicalReviewKey: "0".repeat(64) } }).success, false);
  assert.equal(ReviewObservationSchema.safeParse({ ...r, reviewIdNamespace: "verified-store-id" }).success, false);
  const k = keyword();
  assert.equal(KeywordObservationSchema.safeParse({ ...k, country: "TR" }).success, false);
  assert.equal(KeywordObservationSchema.safeParse({ ...k, language: "en" }).success, false);
  assert.equal(KeywordObservationSchema.safeParse({ ...k, popularitySource: "proxy" }).success, false);
  assert.equal(KeywordObservationSchema.safeParse({ ...k, observedAt: "2025-01-01T00:00:00Z" }).success, false);
});
