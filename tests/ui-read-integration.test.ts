import assert from "node:assert/strict";
import { test } from "node:test";
import { exploreApps, listCategories, getAppDetails, getDashboard, listReviews, ReadError, type AppDetails, type ListingSummary, type ReadClient } from "../src/lib/read/index.ts";
import { contextResetHref, parseExplorer, parseScope, readFailure } from "../src/components/core/catalog-query.ts";
import { toAppViewModel, toDashboardModel, toDetailsModel } from "../src/components/core/catalog-mapping.ts";
import { count, detailsHref, price, safeMediaUrl } from "../src/components/core/view-models.ts";

const appId = "00000000-0000-4000-8000-000000000001";
const now = "2026-11-26T12:00:00.000Z";
function listing(overrides: Partial<ListingSummary> = {}): ListingSummary {
  return { appId, listingId: 1, store: "ios", storeAppId: "123", storeUrl: "https://apps.apple.com/app/id123", country: "GB", requestedLanguage: "en-GB", effectiveLanguage: null, name: null, developerName: null, category: null, version: null, releasedAt: null, releasedAtPrecision: null, storeUpdatedAt: null, storeUpdatedAtPrecision: null, price: { amount: null, currency: null, isFree: null }, rating: null, ratingCount: null, reviewCount: null, installs: { text: null, lowerBound: null, supported: false }, iconUrl: null, firstSeenAt: null, freshness: { lastObservedAt: null, ageHours: null, status: "unknown", staleAfterHours: 72 }, ...overrides };
}
function client(overrides: Partial<ReadClient> = {}): ReadClient {
  return { select: async () => ({ rows: [], total: 0 }), count: async () => 0, rpc: async () => [], now: () => now, ...overrides };
}

test("URL filters preserve country/language, reject unsupported sorts and bound offsets", () => {
  const parsed = parseExplorer({ country: "gb", language: "en-GB", q: "notes", store: "play", page: "3", sort: "price", direction: "asc" });
  assert.equal(parsed.country, "GB"); assert.equal(parsed.language, "en-GB"); assert.equal(parsed.pageSize, 8);
  assert.throws(() => parseExplorer({ sort: "growth" }));
  assert.throws(() => parseExplorer({ page: "1252" }));
  assert.throws(() => parseScope({ language: "en GB" }));
  assert.throws(() => parseScope({ country: ["US", "TR"] }));
  assert.equal(contextResetHref("/explore", { country: "GB", language: "en-GB", sort: "growth" }), "/explore?country=GB&language=en-GB");
});

test("unknown values remain unavailable while real zero remains zero", () => {
  const app = toAppViewModel(listing());
  assert.equal(app.rating, null); assert.equal(app.ratingCount, null); assert.equal(app.observedAt, null);
  assert.equal(count(app.ratingCount), "Not available"); assert.equal(price(app), "Not available");
  assert.equal(count(0), "0"); assert.equal(price({ price: 0, currency: null }), "Not available");
  assert.equal(price({ price: 0, currency: "GBP" }), "Free");
  const link = new URL(detailsHref(app, "/explore?country=GB&language=en-GB&page=3"), "https://local.test");
  assert.equal(link.searchParams.get("country"), "GB"); assert.equal(link.searchParams.get("language"), "en-GB");
  assert.match(link.searchParams.get("back")!, /page=3/);
});

test("explorer delegates search, ordering, filtering, and pagination to the read contract", async () => {
  let seen: Record<string, string> = {};
  const filters = parseExplorer({ country: "GB", language: "en-GB", store: "play", category: "Productivity", q: "notes", page: "3", sort: "price", direction: "asc", price: "paid" });
  const result = await exploreApps(filters, client({ select: async (_table, query, options) => {
    seen = query; assert.equal(options?.count, true); return { rows: [], total: 0 };
  } }));
  assert.equal(seen.offset, "16"); assert.equal(seen.limit, "8"); assert.equal(seen.order, "price_amount.asc.nullslast,id.asc");
  assert.equal(seen.country, "eq.GB"); assert.equal(seen.requested_language, "eq.en-GB"); assert.equal(seen.store, "eq.play");
  assert.equal(seen.category_name, "eq.Productivity"); assert.match(seen.and!, /notes/);
  assert.equal(result.page, 3); assert.equal(result.total, 0); assert.deepEqual(result.items, []);
});

test("a missing category RPC is unavailable and does not manufacture an empty category list", async () => {
  await assert.rejects(listCategories({}, client({ rpc: async () => { throw new ReadError("read_function_unavailable"); } })), error => {
    const failure = readFailure(error); assert.equal(failure.state, "unavailable"); assert.match(failure.message, /T8 migration/); return true;
  });
  assert.equal(readFailure(new ReadError("supabase_not_configured")).state, "unavailable");
  const failure = readFailure(new Error("credential or raw database payload"));
  assert.equal(failure.state, "error"); assert.doesNotMatch(failure.message, /credential or raw database payload/);
});

test("an empty successful dashboard is distinct from a failed dashboard", async () => {
  const empty = await getDashboard({ country: "GB", language: "en-GB" }, client({ rpc: async name => name === "appradar_read_catalog_stats" ? { apps: 0, listings: 0, categories: 0 } : [] }));
  const model = toDashboardModel(empty);
  assert.equal(model.stats.apps, 0); assert.deepEqual(model.recent, []); assert.deepEqual(model.rankingChanges, []);
  await assert.rejects(getDashboard({}, client({ rpc: async () => { throw new ReadError("read_function_unavailable"); } })));
});

test("missing requested listing context is not replaced by another country", async () => {
  const result = await getAppDetails({ appId, country: "GB", language: "en-GB", relatedLimit: 0 }, client({ select: async table => ({ rows: table === "apps" ? [{ id: appId, store: "ios", store_app_id: "123" }] : table === "app_listings" ? [{ id: 1, app_id: appId, country: "US", requested_language: "en", store: "ios" }] : [], total: null }) }));
  assert.ok(result); assert.equal(result.listing, null); assert.equal(toDetailsModel(result), null);
});

test("media is withheld defensively and history series are never merged by the UI mapper", () => {
  const data: AppDetails = {
    app: { id: appId, store: "ios", storeAppId: "123", storeUrl: "https://apps.apple.com/app/id123", firstSeenAt: now, lastSeenAt: now },
    listing: { ...listing({ iconUrl: "https://media.test/icon.png" }), description: "Plain text", screenshotUrls: ["https://media.test/screenshot.png"], provenance: {} },
    contexts: [{ country: "GB", requestedLanguage: "en-GB", lastObservedAt: null }], developer: null, relatedApps: [],
    history: { from: now, to: now, series: [{ seriesKey: "source-a", source: "aurelix", role: "detail", points: [], comparable: false }, { seriesKey: "source-b", source: "subimpact", role: "discovery", points: [], comparable: false }] }, media: { enabled: false },
  };
  const model = toDetailsModel(data)!;
  assert.equal(model.app.iconUrl, null); assert.equal(model.screenshots, null); assert.equal(model.series.length, 2);
  assert.equal(safeMediaUrl("javascript:alert(1)"), null);
  assert.equal(toAppViewModel(listing({ installs: { text: "100+", lowerBound: 100, supported: true } })).installsText, null);
});

test("disabled review content is not requested or returned by the read contract", async () => {
  const previous = process.env.APPRADAR_REVIEW_CONTENT_ENABLED;
  process.env.APPRADAR_REVIEW_CONTENT_ENABLED = "false";
  try {
    const result = await listReviews({ appId, country: "GB", language: "en-GB" }, client({ select: async (_table, query) => {
      assert.doesNotMatch(query.select!, /(?:^|,)(title|body|developer_reply)(?:,|$)/);
      assert.equal(query["review_observations.country"], "eq.GB");
      assert.equal(query["review_observations.requested_language"], "eq.en-GB");
      return { rows: [{ id: 1, rating: 5, body: "Withheld content", title: "Withheld title" }], total: 1 };
    } }));
    assert.equal(result.contentStatus, "disabled"); assert.equal(result.items[0]!.content, null);
  } finally { if (previous === undefined) delete process.env.APPRADAR_REVIEW_CONTENT_ENABLED; else process.env.APPRADAR_REVIEW_CONTENT_ENABLED = previous; }
});
