import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";
import { createDemoCatalog } from "../src/lib/ui/demo-catalog.ts";
import { isDevelopmentDemo } from "../src/lib/ui/demo-mode.ts";
import { parseExplorer } from "../src/components/core/catalog-query.ts";
import { toDetailsModel, toDashboardModel } from "../src/components/core/catalog-mapping.ts";

const clock = new Date("2026-11-26T12:00:00Z");
const demo = createDemoCatalog(clock);
const scope = { country: "US", language: "en" };
const filters = parseExplorer(scope);
const all = demo.exploreApps({ ...filters, pageSize: 200 }).items;
const app = all.find(row => row.name === "Frame Orchard")!;
const sectionInput = { appId: app.appId, store: app.store, ...scope, tab: "Reviews", reviewPage: 1, reviewSort: "newest" as const, keywordPage: 1 };

test("demo requires exact development opt-in, including when production has the flag", () => {
  for (const NODE_ENV of ["production", "test", "preview", undefined]) {
    assert.equal(isDevelopmentDemo({ ...(NODE_ENV ? { NODE_ENV } : {}), APPRADAR_DEMO_MODE: "true" }), false);
  }
  for (const flag of ["false", "TRUE", "1", " true ", undefined]) {
    assert.equal(isDevelopmentDemo({ NODE_ENV: "development", ...(flag ? { APPRADAR_DEMO_MODE: flag } : {}) }), false);
  }
  assert.equal(isDevelopmentDemo({ NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" }), true);
});

test("fixtures are deterministic and use no external media or store URLs", () => {
  assert.deepEqual(createDemoCatalog(clock).getDashboard(scope), demo.getDashboard(scope));
  assert.ok(all.length >= 100);
  assert.equal(all.length, 120);
  assert.equal(new Set(all.map(row => row.appId)).size, 120);
  assert.equal(new Set(all.map(row => row.name)).size, 120);
  assert.equal(new Set(all.map(row => row.category)).size, 8);
  for (const row of all) {
    assert.match(row.appId, /^de000000-0000-4000-8000-[a-f0-9]{12}$/);
    assert.equal(row.iconUrl, null); assert.equal(row.storeUrl, null);
    assert.match(row.storeAppId!, /^demo\./);
    const details = demo.getAppDetails(row.appId, scope)!;
    assert.equal(details.media.enabled, false); assert.equal(details.listing!.screenshotUrls, null);
    assert.equal(details.developer!.storeUrl, null);
    assert.match(toDetailsModel(details)!.app.description!, /Synthetic demo description/);
    assert.ok(row.price.amount == null || row.price.currency != null);
  }
});

test("server fixtures support combined search, store/category/price filters and pagination", () => {
  const first = demo.exploreApps(filters), second = demo.exploreApps({ ...filters, page: 2 });
  assert.equal(first.total, 120); assert.equal(first.pageCount, 15); assert.equal(first.items.length, 8);
  assert.ok(second.items.every(row => !first.items.some(other => other.listingId === row.listingId)));
  const filtered = demo.exploreApps({ ...filters, q: "frame", store: "play", category: "Photo & Video", price: "paid" });
  assert.equal(filtered.total, 1); assert.equal(filtered.items[0]!.name, "Frame Orchard");
  assert.equal(demo.exploreApps({ ...filters, q: "Demo Studio 0" }).total, 2);
  assert.equal(demo.exploreApps({ ...filters, q: "no such synthetic app" }).total, 0);
  assert.equal(demo.exploreApps({ ...filters, page: 100 }).items.length, 0);
});

test("every supported sort respects direction, nulls-last and stable tie breaks", () => {
  const selectors = {
    name: (r: typeof app) => r.name, rating: (r: typeof app) => r.rating, ratingCount: (r: typeof app) => r.ratingCount,
    reviewCount: (r: typeof app) => r.reviewCount, price: (r: typeof app) => r.price.amount,
    releasedAt: (r: typeof app) => r.releasedAt, updatedAt: (r: typeof app) => r.storeUpdatedAt,
    observedAt: (r: typeof app) => r.freshness.lastObservedAt, installsLowerBound: (r: typeof app) => r.installs.lowerBound,
  };
  for (const sort of Object.keys(selectors) as (keyof typeof selectors)[]) {
    for (const direction of ["asc", "desc"] as const) {
      const rows = demo.exploreApps({ ...filters, sort, direction, pageSize: 200 }).items;
      for (let i = 1; i < rows.length; i++) {
        const a = selectors[sort](rows[i - 1]!), b = selectors[sort](rows[i]!);
        if (b == null) continue;
        assert.notEqual(a, null, `${sort}: nulls must remain last`);
        const difference = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "en");
        assert.ok(direction === "asc" ? difference <= 0 : difference >= 0, `${sort} ${direction}`);
        if (!difference) assert.ok(rows[i - 1]!.listingId < rows[i]!.listingId);
      }
    }
  }
});

test("country/language contexts stay distinct and unsupported contexts remain empty", () => {
  const tr = demo.exploreApps({ ...filters, country: "TR", language: "tr", pageSize: 200 });
  assert.equal(tr.total, 120); assert.ok(tr.items.every(row => row.country === "TR" && row.requestedLanguage === "tr"));
  assert.ok(tr.items.every(row => row.price.currency == null || row.price.currency === "TRY"));
  assert.equal(demo.exploreApps({ ...filters, language: "tr" }).total, 0);
  assert.equal(demo.exploreApps({ ...filters, country: "GB" }).total, 0);
  assert.equal(demo.getAppDetails(app.appId, { country: "GB" })!.listing, null);
  assert.equal(demo.getAppDetails("00000000-0000-4000-8000-000000000001", scope), null);
  const { language, ...allLanguages } = filters;
  assert.equal(language, "en");
  assert.equal(demo.exploreApps({ ...allLanguages, pageSize: 300 }).total, 240);
});

test("dashboard counts, categories, ranking deltas and freshness agree with fixtures", () => {
  const data = demo.getDashboard(scope);
  const model = toDashboardModel(data);
  assert.equal(model.stats.apps, 120); assert.equal(model.stats.listings, 240);
  assert.equal(model.stats.iosApps, 60); assert.equal(model.stats.playApps, 60);
  assert.equal(model.categories.reduce((total, row) => total + row.appCount, 0), 120);
  // Ranking changes now come from the synthetic chart history and the shared comparability rule:
  // four series have a comparable pair; the series without run provenance is excluded.
  assert.equal(model.rankingChanges.length, 4); assert.equal(model.recent.length, 4);
  assert.ok(!model.rankingChanges.some(series => series.category === "6000"));
  const deltas = model.rankingChanges.flatMap(series => series.entries.map(entry => entry.change));
  assert.ok(deltas.some(n => n != null && n > 0)); assert.ok(deltas.some(n => n != null && n < 0));
  assert.ok(deltas.includes(0)); assert.ok(deltas.includes(null));
  assert.deepEqual(new Set(all.map(row => row.freshness.status)), new Set(["fresh", "stale", "unknown"]));
  assert.equal(demo.getDashboard({ country: "GB" }).stats.apps, 0);
  assert.equal(demo.listCategories({ country: "GB" }).length, 0);
});

test("unknown metrics stay null, iOS installs stay unsupported, zero stays zero", () => {
  const unknown = all.find(row => row.name === "Basil Basket")!;
  assert.equal(unknown.rating, null); assert.equal(unknown.ratingCount, null);
  assert.equal(all.find(row => row.name === "Harbor Notes")!.ratingCount, 0);
  assert.ok(all.some(row => row.price.amount == null));
  for (const row of all.filter(row => row.store === "ios")) assert.deepEqual(row.installs, { text: null, lowerBound: null, supported: false });
  assert.ok(all.some(row => row.store === "play" && row.installs.lowerBound != null));
});

test("detail history keeps separate series, real gaps and chronological bounded observations", () => {
  const details = demo.getAppDetails(app.appId, scope)!;
  const model = toDetailsModel(details)!;
  assert.equal(model.series.length, 2);
  assert.notEqual(model.series[0]!.seriesKey, model.series[1]!.seriesKey);
  assert.ok(model.series.every(series => series.comparable));
  for (const series of model.series) {
    assert.ok(series.points.some(point => point.rating == null));
    for (let i = 0; i < series.points.length; i++) {
      const p = series.points[i]!;
      assert.ok(p.observedAt >= details.history.from && p.observedAt <= details.history.to);
      assert.ok(p.observedAt >= details.app.firstSeenAt);
      if (i) assert.ok(p.observedAt > series.points[i - 1]!.observedAt);
    }
  }
});

test("reviews paginate, sort helpful votes and match the rating distribution", () => {
  const data = demo.detailSections(sectionInput);
  assert.equal(data.reviews!.state, "ready"); assert.equal(data.distribution!.state, "ready");
  if (data.reviews!.state !== "ready" || data.distribution!.state !== "ready") return;
  assert.equal(data.reviews!.data.total, 18); assert.equal(data.reviews!.data.pageCount, 3);
  const distribution = data.distribution!.data;
  assert.equal(distribution.total, distribution.buckets.reduce((sum, bucket) => sum + bucket.count, 0));
  const helpful = demo.detailSections({ ...sectionInput, reviewSort: "helpful" });
  assert.equal(helpful.reviews!.state, "ready");
  if (helpful.reviews!.state !== "ready") return;
  assert.ok(helpful.reviews!.data.items[0]!.helpfulVotes! >= helpful.reviews!.data.items[1]!.helpfulVotes!);
  assert.ok(helpful.reviews!.data.items.every(row => row.content?.body?.startsWith("Synthetic review:")));
  const last = demo.detailSections({ ...sectionInput, reviewPage: 3 });
  if (last.reviews!.state === "ready") { assert.equal(last.reviews!.data.items.length, 2); assert.equal(last.reviews!.data.items.at(-1)!.reviewedAt, null); }
});

test("keyword pagination, proxy history and selected snapshot honor their context", () => {
  const input = { ...sectionInput, tab: "Keywords", keyword: "daily planner" };
  const data = demo.detailSections(input);
  assert.equal(data.keywords!.state, "ready");
  if (data.keywords!.state !== "ready") return;
  assert.equal(data.keywords!.data.total, 12); assert.equal(data.keywords!.data.items.length, 8);
  const selected = data.selectedKeyword!;
  if (selected.rankings.state !== "ready" || selected.history.state !== "ready") assert.fail("Expected demo keyword data");
  assert.equal(selected.rankings.data!.rankings.length, 60);
  assert.equal(selected.rankings.data!.metrics[0]!.popularity, null);
  assert.equal(selected.history.data.series[0]!.popularitySource, "proxy");
  assert.equal(selected.history.data.series[0]!.points.length, 4);
  assert.ok(selected.history.data.series[0]!.points.every(point => point.snapshotId > 0));
  const wrongContext = demo.detailSections({ ...input, country: "TR", language: "tr", keywordSnapshot: data.keywords!.data.items[0]!.snapshotId });
  assert.deepEqual(wrongContext.selectedKeyword!.rankings, { state: "ready", data: null });
  const second = demo.detailSections({ ...input, keywordPage: 2 });
  if (second.keywords!.state === "ready") assert.equal(second.keywords!.data.items.length, 4);
});

test("server gateway selects demo without network and never falls back on real-data failures", async () => {
  // Next supplies this marker at bundle time; alias it only inside this Node test.
  const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { url: "data:text/javascript,export{}", shortCircuit: true } : nextResolve(specifier, context);
  } });
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("Network forbidden in demo tests"); };
  try {
    const gateway = await import("../src/lib/ui/catalog.server.ts");
    Object.assign(process.env, { NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" });
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const dashboard = await gateway.dashboardData(scope);
    assert.equal(dashboard.state, "ready");
    if (dashboard.state === "ready") assert.equal(dashboard.data.stats.apps, 120);
    assert.equal((await gateway.explorerData(filters)).state, "ready");
    assert.equal((await gateway.categoryData(scope)).state, "ready");
    assert.equal((await gateway.appData(app.appId, scope)).state, "ready");
    assert.equal((await gateway.detailSections(sectionInput)).reviews!.state, "ready");
    assert.equal(requests, 0);
    // Outside the development demo there is no auth bypass: without a verified Supabase user every
    // catalog read redirects to /login before any data access (and production can never bypass).
    const toLogin = { message: "NEXT_REDIRECT", digest: /^NEXT_REDIRECT;replace;\/login;/ };
    for (const [environment, flag] of [["production", "true"], ["development", "false"], ["test", "true"]]) {
      Object.assign(process.env, { NODE_ENV: environment, APPRADAR_DEMO_MODE: flag });
      await assert.rejects(gateway.dashboardData(scope), toLogin);
      await assert.rejects(gateway.explorerData(filters), toLogin);
      await assert.rejects(gateway.appData(app.appId, scope), toLogin);
      await assert.rejects(gateway.detailSections(sectionInput), toLogin);
    }
    assert.equal(requests, 0);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env); globalThis.fetch = originalFetch; hooks.deregister();
  }
});
