import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { fieldFreshness, freshness, retainedFreshness } from "../src/lib/read/field-freshness.ts";
import { mapListing, LISTING_SELECT } from "../src/lib/read/shared.ts";
import { toAppViewModel } from "../src/components/core/catalog-mapping.ts";
import { FieldValue, MetricFreshnessSummary } from "../src/components/core/field-freshness.tsx";
import { toMarketApp } from "../src/lib/read/markets.ts";
import { computeIndicators } from "../src/lib/intel/market.ts";
import { proxy } from "../src/proxy.ts";
import { safeNextPath } from "../src/lib/auth/paths.ts";
import RetiredAdminPage from "../src/app/admin/page.tsx";

const now = "2026-01-21T12:00:00Z";
const stamp = (observedAt: string) => ({ source: "aurelix", role: "detail", observedAt, timeBasis: "source", runId: "private-run-id", quality: 3 });
const raw = {
  id: 1, app_id: "de000000-0000-4000-8000-000000000001", store: "ios", country: "US", requested_language: "en",
  name: "B1 fixture", rating_value: 3.5, rating_count: 100, price_amount: 2, currency: "USD", is_free: false,
  last_observed_at: "2026-01-21T11:00:00Z",
  field_provenance: { rating_value: stamp("2026-01-01T00:00:00Z"), rating_count: stamp("2026-01-20T00:00:00Z"), price: stamp("2026-01-02T00:00:00Z") },
  apps: { store_app_id: "111", developer_id: "demo-developer" },
};

test("listing and retained metrics have independent actual observation dates", () => {
  const row = mapListing(raw, now);
  assert.equal(row.freshness.status, "fresh");
  assert.equal(row.fieldFreshness!.rating_value!.status, "stale");
  assert.equal(row.fieldFreshness!.rating_value!.lastObservedAt, "2026-01-01T00:00:00Z");
  assert.equal(row.fieldFreshness!.rating_count!.status, "fresh");
  assert.equal(row.fieldFreshness!.price!.lastObservedAt, "2026-01-02T00:00:00Z");
  assert.equal(row.fieldFreshness!.review_count!.status, "unknown");
  assert.deepEqual(toAppViewModel(row).fieldFreshness, row.fieldFreshness);
  assert.ok(LISTING_SELECT.includes("field_provenance"));
  assert.doesNotMatch(JSON.stringify(row), /private-run-id|quality/);
});

test("unrelated updates do not refresh metrics; missing, malformed and future provenance stays unknown", () => {
  const before = mapListing(raw, now).fieldFreshness;
  const after = mapListing({ ...raw, name: "Changed", last_observed_at: now }, now).fieldFreshness;
  assert.deepEqual(before, after);
  assert.equal(mapListing({ ...raw, field_provenance: {} }, now).fieldFreshness!.rating_value!.status, "unknown");
  for (const observedAt of ["bad", "2027-01-01T00:00:00Z"]) {
    assert.equal(fieldFreshness({ rating_value: stamp(observedAt) }, now).rating_value!.status, "unknown");
  }
  assert.equal(fieldFreshness({ rating_value: { observedAt: now } }, now).rating_value!.status, "unknown");
  assert.equal(freshness("bad", now).status, "unknown");
  assert.equal(freshness("2027-01-01", now).status, "unknown");
  assert.equal(retainedFreshness(before, ["rating_value", "review_count"]).status, "unknown");
});

test("stale and unknown field indicators are visible, including aggregate metrics", () => {
  const fields = mapListing(raw, now).fieldFreshness;
  const stale = renderToStaticMarkup(createElement(FieldValue, { fields, field: "rating_value" }, "3.5"));
  assert.match(stale, /Stale metric/); assert.match(stale, /2026-01-01T00:00:00Z/);
  const unknown = renderToStaticMarkup(createElement(FieldValue, { field: "rating_count" }, "100"));
  assert.match(unknown, /Metric freshness unknown/); assert.doesNotMatch(unknown, /Metric observed/);
  const apps = Array.from({ length: 6 }, (_, i) => toMarketApp({ ...raw, id: i + 1, app_id: `fixture-${i}` }, now));
  const indicators = computeIndicators(apps, Date.parse(now));
  assert.equal(indicators.qualityGap.value, 100);
  assert.equal(indicators.qualityGap.freshness!.stale, 6);
  assert.equal(indicators.incumbentStrength.freshness!.stale, 0);
  assert.equal(indicators.pricing.freshness!.stale, 6);
  assert.equal(indicators.concentration.freshness!.unknown, 6, "identity freshness cannot be borrowed from developer name");
  const html = renderToStaticMarkup(createElement(MetricFreshnessSummary, { value: indicators.pricing.freshness }));
  assert.match(html, /6 stale/); assert.match(html, /Listing observations do not refresh retained metrics/);
});

test("legacy admin is unavailable before auth or demo and no obsolete post-login target remains", async () => {
  const previous = { ...process.env };
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error("Network forbidden"); };
  try {
    for (const NODE_ENV of ["production", "development"]) for (const demo of ["true", "false"]) {
      Object.assign(process.env, { NODE_ENV, APPRADAR_DEMO_MODE: demo, NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture" });
      for (const path of ["/admin", "/admin/nested"]) {
        const response = await proxy(new NextRequest(`http://localhost:3000${path}`, { headers: { cookie: "sb-fixture-auth-token=fake-authenticated-session" } }));
        assert.equal(response.status, 404); assert.equal(await response.text(), "");
        assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      }
    }
    assert.equal(requests, 0);
    assert.equal(safeNextPath("/admin"), "/dashboard");
    assert.throws(() => RetiredAdminPage(), /NEXT_HTTP_ERROR_FALLBACK;404/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous); globalThis.fetch = originalFetch;
  }
});

test("forward migration over existing snapshots: field ordering, atomic price, replay and immutability", { skip: !process.env.B1_PGLITE_PATH && "Set B1_PGLITE_PATH to an existing local PGlite module; no dependencies are installed." }, async () => {
  const { PGlite } = await import(pathToFileURL(process.env.B1_PGLITE_PATH!).href);
  const db = new PGlite();
  try {
    await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;");
    const directory = new URL("../supabase/migrations/", import.meta.url);
    const names = (await readdir(directory)).filter(name => name.endsWith(".sql")).sort();
    const forward = "20261126001100_field_freshness.sql";
    assert.equal(names.at(-1), forward);
    for (const name of names.filter(n => n !== forward)) await db.exec(await readFile(new URL(name, directory), "utf8"));
    const sql = await readFile(new URL("../supabase/tests/field-freshness.sql", import.meta.url), "utf8");
    const [before, after] = sql.split("-- APPLY B1 HERE");
    assert.ok(before && after, "B1 fixture must have an upgrade marker");
    await db.exec(before);
    const snapshotSql = "select to_jsonb(s)::text as data from public.app_snapshots s order by id";
    const saved = await db.query(snapshotSql);
    const listingSql = "select to_jsonb(l)::text as data from public.app_listings l order by id";
    const listingBefore = await db.query(listingSql);
    await db.exec(await readFile(new URL(forward, directory), "utf8"));
    assert.deepEqual((await db.query(snapshotSql)).rows, saved.rows, "migration cannot rewrite immutable snapshots");
    assert.deepEqual((await db.query(listingSql)).rows, listingBefore.rows, "no hidden data backfill");
    const results = await db.exec(after);
    const assertions = results.flatMap((r: { rows: Record<string, unknown>[] }) => r.rows.filter(row => typeof row.passed === "string"));
    assert.equal(assertions.length, (after.match(/as passed;/g) ?? []).length);
    assert.equal((await db.query("select count(*)::integer as n from public.apps")).rows[0].n, 0, "fixtures rolled back");
  } finally { await db.close(); }
});
