import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeItem, countDelta } from "../src/poc/normalize.js";
import { fixtureJob, fixtureRow, fixtureTime } from "./fixtures.js";

test("eksik sayı null kalır; gerçek sıfır korunur; iOS yükleme verisi üretilmez", () => {
  const result = normalizeItem(fixtureRow({ ratingCount: null, installs: "1,000+", minInstalls: 1000 }), fixtureJob(), "Run1", fixtureTime);
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  assert.equal(result.observation.ratingCount, null);
  assert.equal(result.observation.ratingValue, 0);
  assert.equal(result.observation.fieldStatus.ratingCount, "missing");
  assert.equal(result.observation.installsLowerBound, null);
  assert.equal(result.observation.fieldStatus.installsLowerBound, "unsupported");
  assert.equal(result.observation.language, null);
  assert.equal(result.observation.requestedLanguage, "tr");
});

test("aynı run tekrar işlenince anahtar sabit, yeni run yeni gözlem olur", () => {
  const a = normalizeItem(fixtureRow(), fixtureJob(), "Run1", fixtureTime);
  const b = normalizeItem(fixtureRow(), fixtureJob(), "Run1", "2026-01-02T00:00:00.000Z");
  const c = normalizeItem(fixtureRow(), fixtureJob(), "Run2", fixtureTime);
  assert.ok(a.kind === "valid" && b.kind === "valid" && c.kind === "valid");
  assert.equal(a.observation.idempotencyKey, b.observation.idempotencyKey);
  assert.notEqual(a.observation.idempotencyKey, c.observation.idempotencyKey);
});

for (const [name, overrides] of Object.entries({
  "yanlış ülke": { country: "us" }, "yanlış uygulama": { appId: "1234" },
  "negatif sayı": { ratingCount: -1 }, "güvenli sayı sınırı": { ratingCount: Number.MAX_SAFE_INTEGER + 1 },
  "hatalı puan": { rating: 6 }, "ücretsiz çelişkisi": { price: 5 },
  "para birimsiz fiyat": { currency: null }, "bozuk tarih": { scrapedAt: "yesterday" },
  "gelecek tarih": { scrapedAt: "2099-01-01T00:00:00Z" },
  "yanlış URL ülkesi": { appUrl: "https://apps.apple.com/us/app/id9999000011" },
  "SSRF URL": { appUrl: "https://localhost/app/id9999000011" },
  "URL kullanıcı bilgisi": { appUrl: "https://user:password@apps.apple.com/tr/app/id9999000011" },
})) {
  test(`${name} karantinaya alınır`, () => {
    assert.equal(normalizeItem(fixtureRow(overrides), fixtureJob(), "Run1", fixtureTime).kind, "invalid");
  });
}

test("arama sırası ve kategori listesi bağlamı doğrulanır", () => {
  const search = fixtureJob({ mode: "search", context: "todo" });
  assert.equal(normalizeItem(fixtureRow({ searchRank: 1, searchTerm: "todo" }), search, "Run1", fixtureTime).kind, "valid");
  assert.equal(normalizeItem(fixtureRow({ searchRank: 1, searchTerm: "other" }), search, "Run1", fixtureTime).kind, "invalid");
  const chart = fixtureJob({ mode: "charts", context: "topFree" });
  assert.equal(normalizeItem(fixtureRow({ chartRank: 1, chartCollection: "topFree", chartCategory: "6007" }), chart, "Run1", fixtureTime).kind, "valid");
  assert.equal(normalizeItem(fixtureRow({ chartRank: 1, chartCollection: "topFree" }), chart, "Run1", fixtureTime).kind, "invalid");
});

test("Aurelix alanları ayrı şemayla normalize edilir; yorumlar uygulama sayılmaz", () => {
  const job = fixtureJob({ provider: "aurelix", store: "play", expectedIds: ["com.example.synthetic"] });
  const raw = { type: "app", store: "google_play", app_id: "com.example.synthetic", title: "Sentetik test kaydı", url: "https://play.google.com/store/apps/details?id=com.example.synthetic&untrusted=value", country: "tr", ratings_count: 0, rating: 4, language: "tr" };
  const result = normalizeItem(raw, job, "Run1", fixtureTime);
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  assert.equal(result.observation.ratingCount, 0);
  assert.equal(result.observation.reviewCount, null);
  assert.equal(result.observation.observedTimeBasis, "collection");
  assert.ok(!result.observation.storeUrl.includes("untrusted"));
  assert.equal(normalizeItem({ ...raw, type: "review" }, job, "Run1", fixtureTime).kind, "invalid");
  assert.equal(normalizeItem({ ...raw, language: "en" }, job, "Run1", fixtureTime).kind, "invalid");
});

test("Aurelix yorum satırları reviews modunda normalize edilir; kimlik ve tarih korunur", () => {
  const job = fixtureJob({
    provider: "aurelix", store: "ios", country: "US", requestedLanguage: "en", mode: "reviews", context: "570060128", expectedIds: ["570060128"],
    input: { apps: ["570060128"], developers: [], appStoreCharts: [], chartGenre: "", countries: ["us"], language: "en", maxReviewsPerApp: 10, reviewSort: "mostrecent", onlyNewReviews: false, proxyConfiguration: { useApifyProxy: false } },
  });
  const raw = {
    type: "review", store: "app_store", app_id: "570060128", country: "us", language: null,
    review_id: "100200300", rating: 5, review_title: "Great", text: "Works well", date: "2026-01-01T00:00:00.000Z",
    app_version: "7.0.0", helpful_votes: 2, total_votes: 3, developer_reply: null, developer_reply_at: null,
    reviewer_name: "should-not-matter",
  };
  const result = normalizeItem(raw, job, "Run1", fixtureTime);
  assert.equal(result.kind, "valid_review");
  if (result.kind !== "valid_review") return;
  assert.equal(result.review.storeAppId, "570060128");
  assert.equal(result.review.sourceReviewId, "100200300");
  assert.equal(result.review.rating, 5);
  assert.equal(result.review.reviewedAt, "2026-01-01T00:00:00.000Z");
  assert.equal(result.review.hasDeveloperReply, false);
  const again = normalizeItem(raw, job, "Run2", fixtureTime);
  assert.equal(again.kind, "valid_review");
  if (again.kind === "valid_review") {
    assert.equal(again.review.canonicalReviewKey, result.review.canonicalReviewKey);
    assert.notEqual(again.review.idempotencyKey, result.review.idempotencyKey);
  }
  assert.equal(normalizeItem({ ...raw, app_id: "999" }, job, "Run1", fixtureTime).kind, "invalid");
});

test("ASO Keyword Intel metrics satırı popularity skorunu hacim olarak işlemez", () => {
  const job = fixtureJob({
    provider: "asokeyword", store: "ios", country: "US", requestedLanguage: "en", mode: "keywords",
    context: "habit tracker", expectedIds: [], maxResults: 20,
    input: { keywords: ["habit tracker"], store: "ios", country: "us", appIds: [], topN: 10, includeSuggestions: false, includePopularity: true },
  });
  const raw = {
    type: "metrics", keyword: "habit tracker", store: "ios", country: "us",
    popularity: 56, popularityProxy: null, popularitySource: "apple", difficulty: 72,
    measuredAt: "2026-11-26T01:10:04.356Z", stale: false, error: null, checkedAt: "2026-11-26T08:40:17.705Z",
  };
  const result = normalizeItem(raw, job, "Run1", "2026-11-26T12:00:00.000Z");
  assert.equal(result.kind, "valid_keyword");
  if (result.kind !== "valid_keyword") return;
  assert.equal(result.keyword.rowType, "metrics");
  assert.equal(result.keyword.popularity, 56);
  assert.equal(result.keyword.popularitySource, "apple");
  assert.equal(result.keyword.difficulty, 72);
  assert.equal(result.keyword.suggestion, null);
  assert.equal(normalizeItem({ ...raw, type: "ranking", rank: 1, appId: "1", appName: "X", developer: "Y", rating: 4.5 }, job, "Run1", "2026-11-26T12:00:00.000Z").kind, "valid_keyword");
});

test("Aurelix Play reviews Actor satırları 20 üstü kapasiteyle normalize edilir; actor'lar arası anahtar çakışmaz", () => {
  const shared = {
    type: "review", store: "google_play", app_id: "com.openai.chatgpt", country: "us", language: "en",
    review_id: "aa8417f0-7d26-4049-8be9-548eadec5b89", rating: 4, text: "Works on Android",
    date: "2026-11-22T16:24:20Z", app_version: "1.2.3", helpful_votes: 2, developer_reply: "Thanks",
    developer_reply_at: "2026-11-22T17:00:00Z", reviewer_name: "should-not-matter",
  };
  const dedicated = fixtureJob({
    provider: "aurelixplayreviews", store: "play", country: "US", requestedLanguage: "en", mode: "reviews",
    context: "com.openai.chatgpt", expectedIds: ["com.openai.chatgpt"], maxResults: 100,
    input: { apps: ["com.openai.chatgpt"], maxReviewsPerApp: 100, sort: "newest", stars: "", language: "en", countries: ["us"], onlyNewReviews: false, proxyConfiguration: { useApifyProxy: true } },
  });
  const embedded = fixtureJob({
    provider: "aurelix", store: "play", country: "US", requestedLanguage: "en", mode: "reviews",
    context: "com.openai.chatgpt", expectedIds: ["com.openai.chatgpt"], maxResults: 10,
    input: { apps: ["com.openai.chatgpt"], countries: ["us"], language: "en", maxReviewsPerApp: 10, reviewSort: "mostrecent", onlyNewReviews: false, developers: [], appStoreCharts: [], chartGenre: "", proxyConfiguration: { useApifyProxy: false } },
  });
  const collectedAt = "2026-11-26T00:00:00.000Z";
  const a = normalizeItem(shared, dedicated, "RunA", collectedAt);
  const b = normalizeItem(shared, embedded, "RunB", collectedAt);
  assert.equal(a.kind, "valid_review");
  assert.equal(b.kind, "valid_review");
  if (a.kind !== "valid_review" || b.kind !== "valid_review") return;
  assert.equal(a.review.source, "aurelixplayreviews");
  assert.equal(b.review.source, "aurelix");
  assert.notEqual(a.review.reviewIdNamespace, b.review.reviewIdNamespace);
  assert.notEqual(a.review.canonicalReviewKey, b.review.canonicalReviewKey);
  assert.notEqual(a.review.idempotencyKey, b.review.idempotencyKey);
  assert.equal(a.review.text, "Works on Android");
  assert.equal(a.review.reviewedAt, "2026-11-22T16:24:20Z");
  assert.equal(a.review.fieldStatus.title, "unsupported");
  assert.equal(a.review.hasDeveloperReply, true);
});

test("TheWolves iOS yorum satırları reviews modunda normalize edilir; metin ve tarih korunur", () => {
  const job = fixtureJob({
    provider: "thewolves", store: "ios", country: "US", requestedLanguage: "en", mode: "reviews", context: "6448311069", expectedIds: ["6448311069"],
    input: { appIds: ["6448311069"], country: "us", maxItems: 10 },
  });
  const raw = {
    parentId: "10954854441", id: "10954854441", date: "2024-02-18T19:48:09-07:00",
    userName: "@private-user", userUrl: "https://itunes.apple.com/us/reviews/id1",
    version: "1.2.3", score: 4, title: "Useful", text: "Helps with daily tasks",
    url: "https://itunes.apple.com/us/review?id=6448311069&type=Purple%20Software",
    country: "US", appId: "6448311069",
  };
  const result = normalizeItem(raw, job, "Run1", fixtureTime);
  assert.equal(result.kind, "valid_review");
  if (result.kind !== "valid_review") return;
  assert.equal(result.review.source, "thewolves");
  assert.equal(result.review.store, "ios");
  assert.equal(result.review.storeAppId, "6448311069");
  assert.equal(result.review.sourceReviewId, "10954854441");
  assert.equal(result.review.rating, 4);
  assert.equal(result.review.title, "Useful");
  assert.equal(result.review.text, "Helps with daily tasks");
  assert.equal(result.review.reviewedAt, "2024-02-18T19:48:09-07:00");
  assert.equal(result.review.appVersion, "1.2.3");
  assert.equal(result.review.fieldStatus.helpfulVotes, "unsupported");
  assert.equal(result.review.fieldStatus.developerReply, "unsupported");
  const again = normalizeItem(raw, job, "Run2", fixtureTime);
  assert.equal(again.kind, "valid_review");
  if (again.kind === "valid_review") {
    assert.equal(again.review.canonicalReviewKey, result.review.canonicalReviewKey);
    assert.notEqual(again.review.idempotencyKey, result.review.idempotencyKey);
  }
  assert.equal(normalizeItem({ ...raw, appId: "999" }, job, "Run1", fixtureTime).kind, "invalid");
});

test("Aurelix geliştirici portföyü developer_id ve keşif rolünü korur", () => {
  const job = fixtureJob({
    provider: "aurelix", store: "ios", country: "US", requestedLanguage: "en", mode: "developers", context: "570060151", expectedIds: [],
    input: { apps: [], developers: ["https://apps.apple.com/us/developer/duolingo/id570060151"], appStoreCharts: [], chartGenre: "", countries: ["us"], language: "en", maxAppsPerList: 5, maxReviewsPerApp: 0, proxyConfiguration: { useApifyProxy: false } },
  });
  const raw = {
    type: "app", store: "app_store", app_id: "570060128", title: "Duolingo: Learn Languages",
    url: "https://apps.apple.com/us/app/id570060128", country: "us", developer: "Duolingo", developer_id: "570060151",
    developer_url: "https://apps.apple.com/us/developer/duolingo/id570060151", found_via: "developer",
    price: 0, currency: "USD", is_free: true, rating: 4.7, ratings_count: 100,
  };
  const result = normalizeItem(raw, job, "Run1", fixtureTime);
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  assert.equal(result.observation.developerStoreId, "570060151");
  assert.equal(result.observation.observationRole, "discovery");
  assert.equal(result.observation.rankContext, "570060151");
  assert.equal(normalizeItem({ ...raw, developer_id: "999" }, job, "Run1", fixtureTime).kind, "invalid");
});

test("Aurelix iOS liste satırında chart_genre etiketi genre_id ile kategori bağlamını bozmaz", () => {
  const job = fixtureJob({
    provider: "aurelix", store: "ios", country: "US", requestedLanguage: "en", mode: "charts", context: "topFree", expectedIds: [],
    input: { apps: [], developers: [], appStoreCharts: ["top-free"], chartGenre: "6007", countries: ["us"], language: "en", maxAppsPerList: 5, maxReviewsPerApp: 0, proxyConfiguration: { useApifyProxy: false } },
  });
  const raw = {
    type: "app", store: "app_store", app_id: "6448311069", title: "Sentetik Chart App",
    url: "https://apps.apple.com/us/app/id6448311069", country: "us", genre: "Productivity", genre_id: "6007",
    chart: "top-free", chart_genre: "iTunes Store: Top Free Productivity Apps", chart_rank: 2,
    price: 0, currency: "USD", is_free: true, rating: 4.5, ratings_count: 10,
  };
  const result = normalizeItem(raw, job, "Run1", fixtureTime);
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  assert.equal(result.observation.rank, 2);
  assert.equal(result.observation.rankContext, "topFree");
  assert.equal(result.observation.rankCategory, "6007");
  assert.equal(result.observation.country, "US");
  assert.equal(normalizeItem({ ...raw, genre_id: "6014" }, job, "Run1", fixtureTime).kind, "invalid");
});

test("Aurelix description, released_at and updated_at map from verified pilot field names", () => {
  const job = fixtureJob({
    provider: "aurelix", store: "ios", country: "US", requestedLanguage: "en", mode: "details", context: "sample",
    expectedIds: ["1232780281"],
    input: { apps: ["1232780281"], countries: ["us"], language: "en", maxReviewsPerApp: 0, developers: [], appStoreCharts: [], onlyNewReviews: false, proxyConfiguration: { useApifyProxy: false } },
  });
  const raw = {
    type: "app", store: "app_store", app_id: "1232780281", title: "Notion: Notes, Tasks, AI",
    url: "https://apps.apple.com/us/app/id1232780281", country: "us", language: "en",
    developer: "Notion Labs, Incorporated", genre: "Productivity",
    price: 0, currency: "USD", is_free: true, rating: 4.77, ratings_count: 90_797,
    description: "Notion is an AI-powered all-in-one workspace.",
    icon_url: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ea/1b/48/icon.png",
    screenshots: ["https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/aa/bb/cc/shot.png"],
    released_at: "2017-09-14T19:07:31Z", updated_at: "2026-11-20T17:58:35Z",
  };
  const collectedAt = "2026-11-27T14:07:33.536Z";
  const result = normalizeItem(raw, job, "Run1", collectedAt);
  assert.equal(result.kind, "valid");
  if (result.kind !== "valid") return;
  assert.equal(result.observation.description, "Notion is an AI-powered all-in-one workspace.");
  assert.equal(result.observation.fieldStatus.description, "available");
  assert.equal(result.observation.releasedAt, "2017-09-14T19:07:31Z");
  assert.equal(result.observation.listingUpdatedAt, "2026-11-20T17:58:35Z");
  assert.equal(result.observation.releasedAtPrecision, "datetime");
  assert.equal(result.observation.listingUpdatedAtPrecision, "datetime");
  assert.equal(result.observation.fieldStatus.releasedAt, "available");
  assert.equal(result.observation.fieldStatus.listingUpdatedAt, "available");
  assert.equal(normalizeItem({ ...raw, released_at: "not-a-date" }, job, "Run1", collectedAt).kind, "invalid");
  assert.equal(normalizeItem({ ...raw, updated_at: "32/13/2020" }, job, "Run1", collectedAt).kind, "invalid");
  assert.equal(normalizeItem({ ...raw, released_at: "2099-01-01T00:00:00Z" }, job, "Run1", collectedAt).kind, "invalid");
  assert.equal(normalizeItem({ ...raw, updated_at: "2099-06-01T00:00:00Z" }, job, "Run1", collectedAt).kind, "invalid");
  const missingDates = normalizeItem({ ...raw, released_at: null, updated_at: null, description: null }, job, "Run1", collectedAt);
  assert.equal(missingDates.kind, "valid");
  if (missingDates.kind !== "valid") return;
  assert.equal(missingDates.observation.releasedAt, null);
  assert.equal(missingDates.observation.fieldStatus.releasedAt, "missing");
  assert.equal(missingDates.observation.fieldStatus.description, "missing");
});

test("sağlayıcı hatası geçerli uygulama olarak sayılmaz", () => {
  assert.deepEqual(normalizeItem({ status: "not-found", error: "provider body" }, fixtureJob(), "Run1", fixtureTime), { kind: "source_error", status: "not-found" });
  assert.equal(countDelta(null, 100), null);
  assert.equal(countDelta(100, 90), -10);
});
