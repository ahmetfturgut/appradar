import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import {
  MARKET_THRESHOLDS, ageDistribution, buildMarketView, buildOpportunityTable, checkDate, computeIndicators, developerShares,
  knownRating, median, paidPricesByCurrency, percentile, priceClass, ratingDistribution, type MarketApp,
} from "../src/lib/intel/market.ts";
import { getContextApps, loadMarketPage, loadOpportunities, MARKET_ROW_CAP } from "../src/lib/read/markets.ts";
import { createDemoCatalog } from "../src/lib/ui/demo-catalog.ts";
import { isProtectedPath, safeNextPath } from "../src/lib/auth/paths.ts";
import type { ReadClient } from "../src/lib/read/client.ts";

const NOW = Date.parse("2026-11-26T12:00:00Z");
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
let n = 0;
function app(over: Partial<MarketApp> = {}): MarketApp {
  n++;
  return { appId: `a${n}`, listingId: n, name: `App ${n}`, store: "ios", country: "US", requestedLanguage: "en", category: "Productivity",
    developerId: `d${n}`, developerName: `Dev ${n}`, rating: 4.5, ratingCount: 100, price: { amount: 0, currency: "USD", isFree: true },
    releasedAt: iso(500), storeUpdatedAt: iso(10), lastObservedAt: iso(1), ...over };
}
const many = (count: number, over: (i: number) => Partial<MarketApp> = () => ({})) => Array.from({ length: count }, (_, i) => app(over(i)));

test("median and percentiles use linear interpolation (R-7) and ignore nothing silently", () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(percentile([1, 2, 3, 4], 0.25), 1.75);
  assert.equal(percentile([10, 20, 30, 40, 50], 0.25), 20);
  assert.equal(median([7]), 7);
  assert.equal(median([]), null);
  assert.equal(percentile([3, 1, 2], 0), 1);
  assert.equal(percentile([3, 1, 2], 1), 3);
});

test("dates: unknown stays unknown; unparseable, future and pre-store dates are invalid", () => {
  assert.deepEqual(checkDate(null, NOW), { status: "unknown" });
  assert.deepEqual(checkDate("not a date", NOW), { status: "invalid", reason: "unparseable" });
  assert.deepEqual(checkDate(iso(-3), NOW), { status: "invalid", reason: "future" });
  assert.equal(checkDate(iso(-0.5), NOW).status, "valid", "within the 24h skew tolerance");
  assert.deepEqual(checkDate("2001-01-01T00:00:00Z", NOW), { status: "invalid", reason: "too_early" });
});

test("unknown ratings are not low; unknown prices are not free; conflicts stay unknown", () => {
  assert.equal(knownRating(app({ rating: null })), null);
  assert.equal(knownRating(app({ rating: 3.2, ratingCount: 0 })), null, "zero ratings means no known rating");
  assert.equal(knownRating(app({ rating: 3.2, ratingCount: null })), 3.2);
  assert.equal(priceClass(app({ price: { amount: null, currency: null, isFree: null } })), "unknown");
  assert.equal(priceClass(app({ price: { amount: null, currency: null, isFree: true } })), "free");
  assert.equal(priceClass(app({ price: { amount: 0, currency: "USD", isFree: false } })), "unknown");
  assert.equal(priceClass(app({ price: { amount: 1.99, currency: "USD", isFree: null } })), "paid");
});

test("indicators report numerator, denominator, unknown and invalid counts", () => {
  const apps = [
    ...many(6, i => ({ rating: i < 2 ? 3.5 : 4.6, storeUpdatedAt: i < 3 ? iso(400) : iso(20), releasedAt: i < 1 ? iso(100) : iso(900) })),
    app({ rating: null, storeUpdatedAt: null, releasedAt: null }),
    app({ rating: 4.8, storeUpdatedAt: iso(-30), releasedAt: "garbage" }),
  ];
  const ind = computeIndicators(apps, NOW);
  assert.deepEqual([ind.qualityGap.numerator, ind.qualityGap.denominator, ind.qualityGap.unknown], [2, 7, 1]);
  assert.equal(ind.qualityGap.value, 28.6);
  assert.deepEqual([ind.neglected.numerator, ind.neglected.denominator, ind.neglected.unknown, ind.neglected.invalid], [3, 6, 1, 1], "missing and future dates are not neglect");
  assert.deepEqual([ind.newcomers.numerator, ind.newcomers.denominator, ind.newcomers.unknown, ind.newcomers.invalid], [1, 6, 1, 1]);
  assert.equal(ind.qualityGap.cohortSize, 8);
});

test("small samples are withheld or flagged; low coverage is flagged", () => {
  const four = computeIndicators(many(4), NOW);
  assert.equal(four.qualityGap.status, "insufficient");
  assert.equal(four.qualityGap.value, null);
  assert.deepEqual(four.qualityGap.supporting, []);
  assert.equal(four.incumbentStrength.value, null);
  const ten = computeIndicators(many(10), NOW);
  assert.equal(ten.qualityGap.status, "small_sample");
  assert.equal(ten.qualityGap.value, 0, "zero is a real value, not unknown");
  const sparse = computeIndicators([...many(6), ...many(4, () => ({ rating: null }))], NOW);
  assert.equal(sparse.qualityGap.status, "low_coverage", "6 of 10 known < 70%");
  const big = computeIndicators(many(25), NOW);
  assert.equal(big.qualityGap.status, "ok");
  assert.equal(MARKET_THRESHOLDS.minSample, 5);
});

test("prices are summarised per currency and never mixed", () => {
  const apps = [
    ...many(3, i => ({ price: { amount: 1 + i, currency: "USD", isFree: false } })),
    app({ price: { amount: 99, currency: "EUR", isFree: false } }),
    app({ price: { amount: 5, currency: null, isFree: false } }),
    app({ price: { amount: null, currency: null, isFree: null } }),
  ];
  const { currencies, paidWithoutCurrency } = paidPricesByCurrency(apps);
  assert.deepEqual(currencies.map(c => [c.currency, c.count, c.median, c.max]), [["USD", 3, 2, 3], ["EUR", 1, 99, 99]]);
  assert.equal(paidWithoutCurrency, 1);
  const pricing = computeIndicators([...apps, ...many(3)], NOW).pricing;
  assert.deepEqual([pricing.numerator, pricing.denominator, pricing.unknown], [3, 8, 1], "the unknown price is not counted as free");
  assert.equal(pricing.details.mainCurrency, "USD");
});

test("developer concentration counts tracked apps of identified developers only", () => {
  const apps = [
    ...many(4, () => ({ developerId: "big", developerName: "Big Studio" })),
    ...many(2, () => ({ developerId: "mid", developerName: "Mid Studio" })),
    ...many(3), // three single-app developers
    ...many(3, () => ({ developerId: null, developerName: null })),
  ];
  const c = computeIndicators(apps, NOW).concentration;
  assert.equal(c.denominator, 9);
  assert.equal(c.unknown, 3);
  assert.equal(c.numerator, 7, "4 + 2 + the first single-app developer (deterministic tie order)");
  assert.equal(c.details.distinctDevelopers, 5);
  assert.equal(developerShares(apps)[0]!.sharePercent, 44.4);
});

test("distributions keep unknown and invalid outside the buckets", () => {
  const apps = [app({ rating: 2.5 }), app({ rating: 4.0 }), app({ rating: 5 }), app({ rating: null })];
  const r = ratingDistribution(apps);
  assert.deepEqual(r.buckets.map(b => b.count), [1, 0, 0, 1, 1]);
  assert.equal(r.unknown, 1);
  const a = ageDistribution([iso(10), iso(200), iso(500), iso(1000), iso(3000), null, iso(-10)], NOW);
  assert.deepEqual(a.buckets.map(b => b.count), [1, 1, 1, 1, 1]);
  assert.deepEqual([a.unknown, a.invalid], [1, 1]);
});

test("opportunity table: one row per category, no composite score, uncategorized reported", () => {
  const table = buildOpportunityTable({ store: "ios", country: "US", requestedLanguage: "en" },
    [...many(6, () => ({ category: "Finance" })), ...many(3, () => ({ category: "Books" })), app({ category: null })], { available: 10, truncated: false, missingListings: 0 }, NOW);
  assert.deepEqual(table.rows.map(r => [r.category, r.size]), [["Finance", 6], ["Books", 3]]);
  assert.equal(table.uncategorized, 1);
  assert.equal(table.rows[1]!.indicators.qualityGap.status, "insufficient");
  assert.ok(!("score" in table.rows[0]!), "there is no weighted opportunity score");
});

test("demo categories differ meaningfully and use the same rules", async () => {
  const demo = createDemoCatalog(new Date(NOW));
  const ios = await demo.getOpportunities({ store: "ios", country: "US", language: "en" });
  const play = await demo.getOpportunities({ store: "play", country: "US", language: "en" });
  const row = (t: typeof ios, c: string) => t.rows.find(r => r.category === c)!.indicators;
  assert.equal(row(ios, "Health & Fitness").concentration.value, 100, "three wellness groups own every tracked app");
  assert.ok(row(ios, "Education").qualityGap.value! > row(ios, "Productivity").qualityGap.value!, "lower ratings in Education");
  assert.ok(row(play, "Travel").neglected.value! >= 75, "old, rarely updated Travel apps");
  assert.equal(row(play, "Food & Drink").neglected.status, "low_coverage");
  assert.equal(row(ios, "Food & Drink").neglected.status, "insufficient");
  assert.equal(row(ios, "Finance").concentration.status, "low_coverage");
  assert.equal(row(ios, "Books").neglected.invalid, 1, "future update date excluded");
  assert.equal(row(play, "Books").newcomers.invalid, 1, "future release date excluded");
  assert.ok(row(ios, "Photo & Video").incumbentStrength.value! < row(ios, "Productivity").incumbentStrength.value!);
  const education = await demo.getMarketPage({ store: "ios", country: "US", language: "en", category: "Education" });
  assert.deepEqual(education.view!.pricing.currencies.map(c => c.currency).sort(), ["EUR", "USD"], "currencies stay separate");
});

test("market page supports category and chart cohorts; ineligible charts are not offered", async () => {
  const demo = createDemoCatalog(new Date(NOW));
  const category = await demo.getMarketPage({ store: "ios", country: "US", language: "en" });
  assert.equal(category.view!.definition.kind, "category");
  assert.equal(category.view!.definition.category, category.categories[0]!.name);
  assert.ok(category.charts.every(c => c.category !== "6000"), "the unverified chart series has no comparable snapshot");
  const chart = await demo.getMarketPage({ store: "ios", country: "US", language: "en", cohort: "chart", series: category.charts.find(c => c.context === "topFree" && c.category === "6007")!.id });
  assert.equal(chart.view!.definition.kind, "chart");
  assert.equal(chart.view!.size, 20);
  assert.equal(chart.view!.leading[0]!.position, 1, "chart cohorts lead by position");
  assert.equal(chart.view!.coverage.missingListings, 0);
  const view = buildMarketView({ kind: "category", store: "ios", country: "US", requestedLanguage: "en", category: "X" }, [], { available: 0, truncated: false, missingListings: 0 }, NOW);
  assert.equal(view.indicators.qualityGap.status, "insufficient");
});

test("production without observations shows empty, never fallback data", async () => {
  const empty = { contextApps: async () => ({ apps: [], available: 0, truncated: false }), categories: async () => [], chartFacts: async () => [],
    entries: async () => new Map(), marketApps: async () => new Map(), now: () => NOW };
  const page = await loadMarketPage({ store: "ios", country: "US", language: "en" }, empty);
  assert.deepEqual([page.view, page.categories, page.charts], [null, [], []]);
  const table = await loadOpportunities({ store: "play", country: "US", language: "en" }, empty);
  assert.deepEqual([table.rows, table.uncategorized], [[], 0]);
});

test("context reads are bounded and report truncation", async () => {
  let calls = 0;
  const client: ReadClient = {
    now: () => new Date(NOW).toISOString(), rpc: async () => [], count: async () => 0,
    select: async (_table, query) => { calls++; const limit = Number(query.limit); return { rows: Array.from({ length: limit }, (_, i) => ({ id: Number(query.offset) + i, app_id: `x${i}`, store: "ios", country: "US", requested_language: "en", apps: { developer_id: null } })), total: 7000 }; },
  };
  const result = await getContextApps({ store: "ios", country: "US", language: "en" }, client);
  assert.equal(result.apps.length, MARKET_ROW_CAP);
  assert.equal(calls, MARKET_ROW_CAP / 1000);
  assert.deepEqual([result.available, result.truncated], [7000, true]);
});

test("research routes are protected and allowed as post-login destinations", () => {
  for (const path of ["/markets", "/opportunities"]) assert.ok(isProtectedPath(path));
  assert.equal(safeNextPath("/markets?country=US&store=play"), "/markets?country=US&store=play");
});

test("gateway: market data is demo-only in development and requires sign-in elsewhere", async () => {
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { url: "data:text/javascript,export{}", shortCircuit: true } : nextResolve(specifier, context);
  } });
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("Network forbidden"); };
  try {
    const gateway = await import("../src/lib/ui/catalog.server.ts");
    Object.assign(process.env, { NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" });
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal((await gateway.marketData({ store: "ios", country: "US", language: "en" })).state, "ready");
    assert.equal((await gateway.opportunityData({ store: "play", country: "US", language: "en" })).state, "ready");
    assert.equal(requests, 0);
    for (const [environment, flag] of [["production", "true"], ["development", "false"]]) {
      Object.assign(process.env, { NODE_ENV: environment, APPRADAR_DEMO_MODE: flag });
      await assert.rejects(gateway.marketData({ store: "ios", country: "US", language: "en" }), { message: "NEXT_REDIRECT" });
      await assert.rejects(gateway.opportunityData({ store: "ios", country: "US", language: "en" }), { message: "NEXT_REDIRECT" });
    }
    assert.equal(requests, 0);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env); globalThis.fetch = originalFetch; hooks.deregister();
  }
});
