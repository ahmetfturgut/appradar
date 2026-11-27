import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import {
  appHistory, compareSnapshots, exclusionReasons, isEligible, pickBaseline, previousComparable, summariseSeries,
  type SnapshotFacts, type SnapshotWithEntries,
} from "../src/lib/intel/ranking.ts";
import { buildAppRankings, buildChartPage, selectSeries, seriesId, snapshotsNeedingEntries } from "../src/lib/intel/views.ts";
import { mapSnapshotFacts } from "../src/lib/read/rankings.ts";
import { createDemoCatalog } from "../src/lib/ui/demo-catalog.ts";

const NOW = Date.parse("2026-11-26T12:00:00Z");
const H = 3_600_000;
let nextId = 1;
function snap(hoursAgo: number, entries: [string, number][], over: Partial<SnapshotFacts> = {}): SnapshotWithEntries {
  return {
    id: nextId++, kind: "chart", source: "aurelix", sourceBuild: "b1", store: "ios", country: "US", requestedLanguage: "en",
    context: "topFree", category: "6007", coverageStatus: "bounded", entryCount: entries.length, observedAt: new Date(NOW - hoursAgo * H).toISOString(),
    observedTimeBasis: "collection", runValidationStatus: "accepted", runTruncated: false, runIncompleteReason: null, runCollectionMode: "charts",
    requestedDepth: entries.length, entries: entries.map(([appId, position]) => ({ appId, position })), ...over,
  };
}
const top3 = (a: string, b: string, c: string): [string, number][] => [[a, 1], [b, 2], [c, 3]];

test("eligibility: only complete, accepted, untruncated snapshots that met a known depth", () => {
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"))), []);
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"), { coverageStatus: "truncated", runTruncated: true, runValidationStatus: "truncated" })), ["truncated", "run_not_accepted"]);
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"), { coverageStatus: "partial" })), ["partial_coverage"]);
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"), { runValidationStatus: null, runTruncated: null })), ["run_unverified"]);
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"), { runIncompleteReason: "coverage_uncertain" })), ["run_incomplete"]);
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"), { requestedDepth: null })), ["depth_unknown"]);
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"), { requestedDepth: 50 })), ["depth_not_met"]);
  assert.deepEqual(exclusionReasons(snap(0, top3("a", "b", "c"), { runCollectionMode: "search" })), ["method_mismatch"]);
});

test("horizons use real elapsed time: adjacent snapshots are not relabelled as daily", () => {
  const latest = snap(0, top3("a", "b", "c"));
  const threeHours = snap(3, top3("b", "a", "c"));
  assert.equal(pickBaseline(latest, [latest, threeHours], "1d"), null, "3 hours is not a 1-day change");
  const twoDays = snap(48, top3("b", "a", "c"));
  assert.equal(pickBaseline(latest, [latest, twoDays], "1d"), null, "a missing day is not filled by an older snapshot");
  const day = snap(24.5, top3("b", "a", "c"));
  const day2 = snap(20, top3("b", "a", "c"));
  assert.equal(pickBaseline(latest, [latest, day, day2], "1d")?.id, day.id, "nearest to 24h inside 18–36h");
  const week = snap(7 * 24 + 5, top3("c", "a", "b"));
  assert.equal(pickBaseline(latest, [latest, week], "7d")?.id, week.id);
  assert.equal(pickBaseline(latest, [latest, week], "30d"), null);
});

test("baselines must share series, depth and eligibility", () => {
  const latest = snap(0, top3("a", "b", "c"));
  const otherDepth = snap(24, [["a", 1], ["b", 2], ["c", 3], ["d", 4]]);
  const truncated = snap(24, top3("a", "b", "c"), { coverageStatus: "truncated", runTruncated: true, runValidationStatus: "truncated" });
  const otherCountry = snap(24, top3("a", "b", "c"), { country: "TR" });
  const otherSource = snap(24, top3("a", "b", "c"), { source: "subimpact" });
  const otherLanguage = snap(24, top3("a", "b", "c"), { requestedLanguage: "es" });
  const otherCategory = snap(24, top3("a", "b", "c"), { category: "6000" });
  for (const candidate of [otherDepth, truncated, otherCountry, otherSource, otherLanguage, otherCategory]) {
    assert.equal(pickBaseline(latest, [latest, candidate], "1d"), null);
  }
});

test("changes: positive is a rise; absence is 'newly observed' or a count, never a drop", () => {
  const latest = snap(0, [["a", 1], ["b", 2], ["new", 3]]);
  const before = snap(24, [["b", 1], ["a", 2], ["gone", 3]]);
  const c = compareSnapshots(latest, before, "1d");
  assert.deepEqual(c.entries.map(e => [e.appId, e.previousPosition, e.change, e.newlyObserved]), [["a", 2, 1, false], ["b", 1, -1, false], ["new", null, null, true]]);
  assert.equal(c.notObservedInLatest, 1);
  assert.ok(!c.entries.some(e => e.appId === "gone"), "an app missing from the latest list is not reported as a ranked drop");
  const none = compareSnapshots(latest, null, "7d");
  assert.equal(none.available, false);
  assert.ok(none.entries.every(e => e.change === null && !e.newlyObserved), "no baseline means unknown, not new");
});

test("series summary: newest excluded run is reported; insufficient history has no horizons", () => {
  const partialLatest = snap(0, top3("a", "b", "c"), { coverageStatus: "partial" });
  const ok = snap(24, top3("a", "b", "c"));
  const ok2 = snap(48, top3("a", "b", "c"));
  const [summary] = summariseSeries([partialLatest, ok, ok2], NOW);
  assert.equal(summary!.latestEligible?.id, ok.id);
  assert.deepEqual(summary!.newerExcluded?.reasons, ["partial_coverage"]);
  assert.equal(summary!.horizons["1d"], true);
  const [fresh] = summariseSeries([snap(0, top3("a", "b", "c"), { context: "topPaid" }), snap(3, top3("a", "b", "c"), { context: "topPaid" })], NOW);
  assert.deepEqual(fresh!.horizons, { "1d": false, "7d": false, "30d": false });
});

test("history keeps gaps: not-observed is null and ineligible snapshots stay flagged", () => {
  const s1 = snap(48, top3("a", "b", "c"));
  const s2 = snap(24, top3("b", "c", "d"), { coverageStatus: "truncated", runTruncated: true });
  const s3 = snap(0, top3("x", "a", "b"));
  const h = appHistory([s3, s1, s2], "a");
  assert.deepEqual(h.map(p => [p.position, p.present, p.eligible]), [[1, true, true], [null, false, false], [2, true, true]]);
  assert.equal(previousComparable(s3, [s1, s2, s3])?.id, s1.id, "the truncated run in between is skipped, not compared");
});

test("SQL row mapping preserves unknown values as null", () => {
  const facts = mapSnapshotFacts({ id: "7", kind: "chart", source: "aurelix", source_build: null, store: "play", country: "US", requested_language: "en", context: "topFree", category: null, coverage_status: "bounded", entry_count: 50, observed_at: "2026-11-26T00:00:00Z", observed_time_basis: "source", run_validation_status: null, run_truncated: null, run_incomplete_reason: null, run_collection_mode: null, requested_depth: null });
  assert.equal(facts.requestedDepth, null);
  assert.equal(facts.runTruncated, null);
  assert.equal(facts.category, null);
  assert.equal(isEligible(facts), false);
});

test("demo scenarios cover rises, falls, entries, gaps, depth changes, truncation and insufficient history", async () => {
  const demo = createDemoCatalog(new Date(NOW));
  const page = (q: object) => demo.getChartPage({ kind: "chart", country: "US", language: "en", horizon: "1d", ...q });
  const iosTop = await page({ store: "ios", chart: "topFree", category: "6007" });
  const v = iosTop.view!;
  assert.equal(v.latest?.depth, 20);
  assert.deepEqual(v.available, { "1d": true, "7d": true, "30d": true });
  assert.ok(v.rows.some(r => (r.change ?? 0) > 0) && v.rows.some(r => (r.change ?? 0) < 0), "rising and falling apps");
  assert.ok(v.excludedSnapshots.some(s => s.reasons.includes("truncated")), "the truncated run is excluded and visible");
  const gap = v.rows[0]!.history;
  assert.equal(gap.filter(p => !p.eligible).length, 1, "one flagged (truncated) point; the missing day has no invented point");
  assert.equal(gap.length, 34);
  const week = await page({ store: "ios", chart: "topFree", category: "6007", horizon: "7d" });
  assert.ok(week.view!.newlyObserved.length > 0, "entries newly observed versus a comparable 7-day baseline");

  const play = await page({ store: "play", chart: "topFree", category: "PRODUCTIVITY", horizon: "30d" });
  assert.equal(play.view!.latest?.depth, 50);
  assert.deepEqual(play.view!.available, { "1d": true, "7d": true, "30d": false }, "depth changed 10 days ago: no 30-day comparison");
  assert.equal(play.view!.rows.every(r => r.change === null), true);

  const paid = await page({ store: "ios", chart: "topPaid" });
  assert.deepEqual(paid.view!.available, { "1d": false, "7d": false, "30d": false }, "two snapshots 3 hours apart");

  const health = await page({ store: "play", category: "HEALTH_AND_FITNESS" });
  assert.deepEqual(health.view!.summary.newerExcluded?.reasons, ["partial_coverage", "run_incomplete", "depth_not_met"]);
  // The newest run is excluded, so the comparison is anchored on the previous eligible day (and says so).
  assert.equal(health.view!.available["1d"], true);
  assert.ok(Date.parse(health.view!.latest!.observedAt) < Date.parse(health.view!.summary.newerExcluded!.observedAt));

  const unverified = await page({ store: "ios", category: "6000" });
  assert.equal(unverified.view!.latest, null);
  assert.ok(unverified.view!.summary.excluded.some(e => e.reason === "run_unverified"));

  const newApps = await demo.getChartPage({ kind: "new_apps", store: "ios", country: "US", language: "en", horizon: "1d" });
  assert.equal(newApps.view!.latest?.depth, 10);
  assert.ok(newApps.view!.rows.every(r => r.listing?.releasedAtPrecision === "date"));
});

test("selection, ids and entry loading stay scoped to one series", async () => {
  const a = snap(0, top3("a", "b", "c"));
  const b = snap(0, top3("a", "b", "c"), { store: "play", context: "topFree" });
  const series = summariseSeries([a, b], NOW);
  assert.equal(new Set(series.map(s => seriesId(s.key))).size, 2);
  const picked = selectSeries(series, { store: "play", horizon: "1d" });
  assert.equal(picked?.store, "play");
  assert.deepEqual(snapshotsNeedingEntries([a, b], picked), [b.id]);
  const model = buildChartPage("chart", [a, b], [a, b], { series: seriesId(series[0]!.key), horizon: "1d" }, new Map(), NOW);
  assert.equal(model.view?.summary.key, series[0]!.key);
  const ranks = buildAppRankings([snap(24, top3("a", "b", "c")), snap(0, top3("b", "a", "c"))], "a", NOW);
  assert.equal(ranks[0]!.change1d, -1);
});

test("release dates keep precision and only tracked apps are listed; Play has no new-app chart", async () => {
  const demo = createDemoCatalog(new Date(NOW));
  const ios = demo.getRecentReleases({ store: "ios", country: "US", language: "en", days: 30, page: 1, pageSize: 50 });
  assert.ok(ios.items.length > 0 && ios.items.every(r => r.releasedAtPrecision === "date" && Date.parse(r.releasedAt!) >= Date.parse(ios.since)));
  const play = demo.getRecentReleases({ store: "play", country: "US", language: "en", days: 30, page: 1, pageSize: 50 });
  assert.ok(play.items.length > 0 && play.items.every(r => r.store === "play"));
  const playNewApps = await demo.getChartPage({ kind: "new_apps", store: "play", country: "US", horizon: "1d" });
  assert.equal(playNewApps.view, null, "no Play new-app chart is fabricated");
});

test("gateway: ranking data is demo-only in development and requires sign-in everywhere else", async () => {
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
    delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.equal((await gateway.trendingData({ country: "US", horizon: "1d" })).state, "ready");
    assert.equal((await gateway.newAppChartData({ country: "US", horizon: "1d" })).state, "ready");
    assert.equal((await gateway.knownReleasesData({ store: "play", country: "US", days: 30, page: 1, pageSize: 10 })).state, "ready");
    assert.equal((await gateway.appRankingsData("de000000-0000-4000-8000-000000000001", "US", "en")).state, "ready");
    assert.equal(requests, 0, "the demo never touches the network or Supabase");
    for (const [environment, flag] of [["production", "true"], ["development", "false"]]) {
      Object.assign(process.env, { NODE_ENV: environment, APPRADAR_DEMO_MODE: flag });
      await assert.rejects(gateway.trendingData({ country: "US", horizon: "1d" }), { message: "NEXT_REDIRECT" });
      await assert.rejects(gateway.appRankingsData("de000000-0000-4000-8000-000000000001", "US"), { message: "NEXT_REDIRECT" });
    }
    assert.equal(requests, 0);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env); globalThis.fetch = originalFetch; hooks.deregister();
  }
});

test("demo new-app lists never contain an app before its release date", async () => {
  const demo = createDemoCatalog(new Date(NOW));
  const page = await demo.getChartPage({ kind: "new_apps", store: "ios", country: "US", language: "en", horizon: "1d" });
  for (const row of page.view!.rows) {
    const released = Date.parse(row.listing!.releasedAt!);
    for (const point of row.history.filter(p => p.present)) assert.ok(Date.parse(point.observedAt) >= released - 86_400_000, `${row.appId} listed before release`);
  }
});

test("no observations produce an honest empty model, never fallback data", async () => {
  const empty = buildChartPage("chart", [], [], { horizon: "1d" }, new Map(), NOW);
  assert.deepEqual([empty.series.length, empty.view], [0, null]);
  const { loadChartPage } = await import("../src/lib/read/rankings.ts");
  let entryCalls = 0;
  const model = await loadChartPage({ kind: "chart", country: "US", horizon: "7d" }, {
    facts: async () => [], entries: async ids => { entryCalls += ids.length; return new Map(); }, listings: async () => new Map(), now: () => NOW,
  });
  assert.equal(model.view, null);
  assert.equal(entryCalls, 0);
});
