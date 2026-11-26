import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import {
  COMPARE_MAX, WATCHLIST_LIMIT, WatchItemInput, addItem, addToSelection, parseCompareCookie, parseCompareIds, parseDemoWatchlist,
  removeItem, serializeCompareCookie, serializeDemoWatchlist, watchKey, type WatchItem,
} from "../src/lib/watchlist/model.ts";
import { buildCompareModel, type CompareInput } from "../src/lib/intel/compare.ts";
import { createDemoCatalog } from "../src/lib/ui/demo-catalog.ts";
import { isProtectedPath, safeNextPath } from "../src/lib/auth/paths.ts";

const NOW = Date.parse("2026-11-26T12:00:00Z");
const id = (n: number) => `de000000-0000-4000-8000-${(n + 1).toString(16).padStart(12, "0")}`;
const demo = createDemoCatalog(new Date(NOW));

// The server modules import "server-only"; alias it to an empty module for these Node tests.
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  return specifier === "server-only" ? { url: "data:text/javascript,export{}", shortCircuit: true } : nextResolve(specifier, context);
} });
test.after(() => hooks.deregister());

/* ------------------------------------------------------------------ comparison selection and URL state */

test("comparison selection: 2–3 unique valid ids; duplicates dropped; invalid or too many rejected", () => {
  assert.deepEqual(parseCompareIds(`${id(0)},${id(1)}`), { ok: true, ids: [id(0), id(1)], duplicatesRemoved: 0 });
  assert.deepEqual(parseCompareIds(`${id(0)},${id(0).toUpperCase()},${id(1)}`), { ok: true, ids: [id(0), id(1)], duplicatesRemoved: 1 });
  assert.deepEqual(parseCompareIds(`${id(0)},not-a-uuid`), { ok: false, error: "invalid_id" });
  assert.deepEqual(parseCompareIds(`${id(0)},${id(1)},${id(2)},${id(3)}`), { ok: false, error: "too_many" });
  assert.deepEqual(parseCompareIds(Array.from({ length: 11 }, () => id(0)).join(",")), { ok: false, error: "too_many" });
  assert.deepEqual(parseCompareIds(""), { ok: true, ids: [], duplicatesRemoved: 0 });
  assert.deepEqual(parseCompareIds(`${id(0)}'); drop table x;--`), { ok: false, error: "invalid_id" });
  assert.equal(COMPARE_MAX, 3);
});

test("adding to a comparison prevents duplicates and enforces the maximum", () => {
  assert.deepEqual(addToSelection([id(0)], id(1)), { ids: [id(0), id(1)], outcome: "added" });
  assert.deepEqual(addToSelection([id(0)], id(0)), { ids: [id(0)], outcome: "duplicate" });
  assert.deepEqual(addToSelection([id(0), id(1), id(2)], id(3)), { ids: [id(0), id(1), id(2)], outcome: "full" });
  const cookie = serializeCompareCookie("US", "en", [id(0), id(1)]);
  assert.deepEqual(parseCompareCookie(cookie), { country: "US", language: "en", ids: [id(0), id(1)] });
  assert.equal(parseCompareCookie("US~en~nope"), null);
  assert.equal(parseCompareCookie("usa~en~"), null);
});

/* ------------------------------------------------------------------ comparison model */

const input = (n: number, country = "US", language = "en"): CompareInput => ({ id: id(n), details: demo.getAppDetails(id(n), { country, language }), rankings: demo.getAppRankings(id(n), country, language) });

test("demo comparison: same store and context overlays compatible history and shared charts", () => {
  const model = buildCompareModel("US", "en", [input(1), input(2)]);
  assert.equal(model.comparable, true);
  assert.equal(model.store, "ios");
  for (const h of model.history) {
    assert.ok(h.overlay, `${h.metric} overlays: same source and role`);
    assert.equal(h.overlay!.role, "detail");
    assert.equal(h.overlay!.series.length, 2);
  }
  assert.ok(model.rankings.shared.length > 0, "both apps appear in the synthetic Top Free chart");
  assert.ok(model.rankings.shared.every(s => s.apps.length >= 2));
});

test("context isolation: different stores are never compared; missing listings and unknown apps are labelled", () => {
  const mixed = buildCompareModel("US", "en", [input(1), input(61)]);
  assert.equal(mixed.storeMismatch, true);
  assert.equal(mixed.comparable, false);
  const unknown = buildCompareModel("US", "en", [input(1), { id: "de000000-0000-4000-8000-0000000fffff", details: null, rankings: null }]);
  assert.equal(unknown.apps[1]!.unknownApp, true);
  assert.equal(unknown.comparable, false);
  const elsewhere = buildCompareModel("GB", "en", [input(1, "GB"), input(2, "GB")]);
  assert.ok(elsewhere.apps.every(a => a.missingListing && !a.listing), "no listing in an uncollected country; nothing substituted");
  assert.equal(elsewhere.comparable, false);
});

test("incompatible history is not overlaid; missing history and values stay missing", () => {
  const a = input(5), b = input(13); // older demo apps: long synthetic histories with a gap
  const otherSource: CompareInput = { ...b, details: { ...b.details!, history: { ...b.details!.history, series: b.details!.history.series.map(s => ({ ...s, source: "Other provider", role: "detail" as const })) } } };
  const m = buildCompareModel("US", "en", [a, otherSource]);
  for (const h of m.history) {
    assert.equal(h.overlay, null);
    assert.deepEqual(h.separate.map(s => s.reason), ["different_source", "different_source"]);
  }
  const noHistory: CompareInput = { ...b, details: { ...b.details!, history: { ...b.details!.history, series: [] } } };
  const m2 = buildCompareModel("US", "en", [a, noHistory]);
  assert.equal(m2.history[0]!.separate[1]!.reason, "no_history");
  assert.ok(a.details!.history.series[0]!.points.some(p => p.rating == null), "fixture gap");
  assert.ok(m.history[0]!.separate[0]!.series!.points.some(p => p.value == null), "gaps are kept as null, not filled");
});

test("prices in different currencies are flagged, never compared", () => {
  // Demo app 59 is the synthetic EUR-priced listing in US contexts; app 3 is priced in USD.
  const m = buildCompareModel("US", "en", [input(59), input(3)]);
  assert.deepEqual(m.currencies, ["EUR", "USD"]);
  assert.ok(!("winner" in m) && !("score" in m), "no comparison score or winner");
});

test("ranking series are shared only when the exact chart series matches", () => {
  const a = input(1), b = input(2);
  const m = buildCompareModel("US", "en", [a, { ...b, rankings: (b.rankings ?? []).map(s => ({ ...s, id: `${s.id}x` })) }]);
  assert.equal(m.rankings.shared.length, 0, "different series ids are never overlaid");
  assert.ok(m.rankings.single.length >= 2);
});

/* ------------------------------------------------------------------ watchlist rules */

const key = (n: number, country = "US", language = "en") => ({ appId: id(n), country, language });

test("watchlist input validation", () => {
  assert.equal(WatchItemInput.safeParse(key(0)).success, true);
  assert.equal(WatchItemInput.safeParse({ appId: "x", country: "US", language: "en" }).success, false);
  assert.equal(WatchItemInput.safeParse({ ...key(0), country: "USA" }).success, false);
  assert.equal(WatchItemInput.safeParse({ ...key(0), language: "en_US" }).success, false);
  assert.deepEqual(WatchItemInput.parse({ appId: id(0).toUpperCase(), country: "us", language: "en" }), key(0), "ids normalise to lowercase, country to uppercase");
});

test("watchlist duplicates, capacity and removal follow the database rules", () => {
  let items: WatchItem[] = [];
  for (let n = 0; n < WATCHLIST_LIMIT; n++) items = addItem(items, key(n), new Date(NOW + n)).items;
  assert.equal(items.length, 50);
  assert.equal(addItem(items, key(100), new Date(NOW)).outcome, "limit");
  assert.equal(addItem(items, key(0), new Date(NOW)).outcome, "duplicate");
  assert.equal(addItem([], key(0, "TR", "tr"), new Date(NOW)).outcome, "added");
  assert.equal(addItem(addItem([], key(0), new Date(NOW)).items, key(0, "TR", "tr"), new Date(NOW)).outcome, "added", "same app in another context is a separate entry");
  assert.equal(removeItem(items, key(0)).length, 49);
});

test("demo watchlist cookie round-trips and drops tampered, duplicate or excess entries", () => {
  const items = addItem(addItem([], key(1), new Date(NOW)).items, key(2), new Date(NOW)).items;
  assert.deepEqual(parseDemoWatchlist(serializeDemoWatchlist(items)).map(watchKey), items.map(watchKey));
  assert.deepEqual(parseDemoWatchlist(`${id(1)}|US|en|1,${id(1)}|US|en|2,evil|US|en|3,${id(2)}|USA|en|4,${id(3)}|US|en|0`).map(i => i.appId), [id(1)]);
  assert.equal(parseDemoWatchlist(Array.from({ length: 60 }, (_, n) => `${id(n)}|US|en|${n + 1}`).join(",")).length, WATCHLIST_LIMIT);
  assert.deepEqual(parseDemoWatchlist(undefined), []);
});

test("account store: identity comes from the verified session and every query is scoped to it", async () => {
  const { accountStore } = await import("../src/lib/watchlist/server.ts");
  const calls: { op: string; args: unknown[] }[] = [];
  const builder = (result: { data?: unknown; error: unknown }) => {
    const b: Record<string, unknown> = {};
    for (const op of ["select", "eq", "order", "limit", "insert", "delete"]) b[op] = (...args: unknown[]) => { calls.push({ op, args }); return b; };
    b.then = (resolve: (v: unknown) => unknown) => resolve(result);
    return b;
  };
  let next: { data?: unknown; error: unknown } = { data: [], error: null };
  const store = accountStore({ from: () => builder(next) }, "user-from-session");
  await store.list();
  assert.ok(calls.some(c => c.op === "eq" && c.args[0] === "user_id" && c.args[1] === "user-from-session"));
  calls.length = 0;
  assert.equal(await store.add(key(1)), "added");
  assert.deepEqual(calls.find(c => c.op === "insert")!.args[0], { user_id: "user-from-session", app_id: id(1), country: "US", requested_language: "en" });
  next = { error: { code: "23505", message: "duplicate key" } }; assert.equal(await store.add(key(1)), "duplicate");
  next = { error: { code: "P0001", message: "watchlist_limit_reached" } }; assert.equal(await store.add(key(1)), "limit");
  next = { error: { code: "23503", message: "fk" } }; assert.equal(await store.add(key(1)), "invalid");
  next = { error: { code: "42P01", message: "missing table" } }; assert.equal(await store.add(key(1)), "unavailable");
  next = { error: null }; calls.length = 0;
  await store.remove(key(1));
  assert.deepEqual(calls.filter(c => c.op === "eq").map(c => c.args), [["user_id", "user-from-session"], ["app_id", id(1)], ["country", "US"], ["requested_language", "en"]]);
});

test("watchlist migration SQL declares RLS, ownership, uniqueness and capacity", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261126001000_watchlist.sql", import.meta.url), "utf8").replace(/--[^\n]*/g, "");
  assert.match(sql, /references auth\.users \(id\) on delete cascade/);
  assert.match(sql, /primary key \(user_id, app_id, country, requested_language\)/);
  assert.match(sql, /references public\.app_listings \(app_id, country, requested_language\) on delete cascade/);
  assert.match(sql, /enable row level security/);
  for (const op of ["select", "delete"]) assert.match(sql, new RegExp(`for ${op} to authenticated using \\(user_id = \\(select auth\\.uid\\(\\)\\)\\)`));
  assert.match(sql, /for insert to authenticated with check \(user_id = \(select auth\.uid\(\)\)\)/);
  assert.doesNotMatch(sql, /for update|grant[^;]*update/i, "no update path: ownership cannot be reassigned");
  assert.match(sql, /revoke all on public\.watchlist_items from public, anon, authenticated;/);
  assert.match(sql, /grant select, insert, delete on public\.watchlist_items to authenticated;/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /v_count >= 50/);
  assert.doesNotMatch(sql, /collection_jobs|enqueue/i, "saving never queues collection");
});

/* ------------------------------------------------------------------ routes, gateway, demo isolation */

test("compare and watchlist routes are protected and valid post-login destinations", () => {
  for (const path of ["/compare", "/compare/add", "/watchlist"]) assert.ok(isProtectedPath(path), path);
  assert.equal(safeNextPath(`/compare?apps=${id(0)},${id(1)}&country=US`), `/compare?apps=${id(0)},${id(1)}&country=US`);
});

test("gateway: comparison is demo-only in development and requires sign-in elsewhere", async () => {
  const env = { ...process.env };
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("Network forbidden"); };
  try {
    const gateway = await import("../src/lib/ui/catalog.server.ts");
    Object.assign(process.env, { NODE_ENV: "development", APPRADAR_DEMO_MODE: "true" });
    delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const ready = await gateway.compareData([id(1), id(2)], "US", "en");
    assert.equal(ready.state, "ready");
    assert.equal((await gateway.listingsForContexts([key(1), key(1, "GB")])).size, 1, "only real catalog contexts validate");
    assert.equal(requests, 0, "demo never touches the network or Supabase");
    for (const [environment, flag] of [["production", "true"], ["development", "false"]]) {
      Object.assign(process.env, { NODE_ENV: environment, APPRADAR_DEMO_MODE: flag });
      await assert.rejects(gateway.compareData([id(1), id(2)], "US", "en"), { message: "NEXT_REDIRECT" });
      await assert.rejects(gateway.listingsForContexts([key(1)]), { message: "NEXT_REDIRECT" });
    }
    assert.equal(requests, 0);
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in env)) delete process.env[k];
    Object.assign(process.env, env); globalThis.fetch = originalFetch;
  }
});

test("production with an empty catalog compares nothing and invents nothing", () => {
  const empty = buildCompareModel("US", "en", [{ id: id(1), details: null, rankings: null }, { id: id(2), details: null, rankings: null }]);
  assert.equal(empty.comparable, false);
  assert.ok(empty.apps.every(a => a.unknownApp && a.listing === null));
  assert.deepEqual([empty.rankings.shared, empty.rankings.single, empty.currencies], [[], [], []]);
  assert.ok(empty.history.every(h => h.overlay === null));
});
