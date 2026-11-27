import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketCheck } from "../src/components/landing/market-check.tsx";
import { dictionaries } from "../src/lib/landing/dictionaries.ts";
import { EXAMPLE_NOW, INDICATOR_KEYS, marketCheck, SCENARIO_IDS } from "../src/lib/landing/market-check-data.ts";
import { computeIndicators, MARKET_THRESHOLDS } from "../src/lib/intel/market.ts";
import { landingAction } from "../src/lib/landing/config.ts";

test("synthetic scenarios are deterministic full cohorts with a bounded same-context comparison", () => {
  const expected = { habits: [24, 26.1, 30.4, 39.1, 52.2, 2340, 77.3], budgets: [18, 11.8, 17.6, 47.1, 70.6, 2000, 62.5], focus: [24, 38.5, 30.8, 30.4, 52.2, 1660, 63.6] };
  for (const id of SCENARIO_IDS) {
    const model = marketCheck(id);
    assert.deepEqual(model, marketCheck(id));
    assert.deepEqual([model.apps.length, ...INDICATOR_KEYS.map(key => model.indicators[key].value)], expected[id]);
    assert.deepEqual(model.indicators, computeIndicators(model.apps, EXAMPLE_NOW));
    assert.equal(model.comparison.length, 3);
    assert.deepEqual(model.comparison, model.apps.slice(0, 3));
    assert.ok(model.apps.every(app => app.appId.startsWith(`synthetic-${id}-`) && app.store === "ios" && app.country === "US" && app.requestedLanguage === "en"));
    assert.equal(model.comparison[0]!.rating, 3.4);
    assert.equal(model.comparison[1]!.ratingCount, 2100);
    assert.equal(model.comparison[2]!.rating, null);
    assert.equal(model.comparison[2]!.ratingCount, null);
    assert.equal(model.comparison[2]!.storeUpdatedAt, null);
    assert.ok(INDICATOR_KEYS.every(key => model.indicators[key].denominator >= MARKET_THRESHOLDS.minSample));
    assert.ok(Object.values(computeIndicators(model.comparison, EXAMPLE_NOW)).every(indicator => indicator.value === null));
    for (const indicator of Object.values(model.indicators)) assert.equal(indicator.denominator + indicator.unknown, model.apps.length);
  }
});

test("limited update evidence withholds only the affected value and never becomes zero", () => {
  for (const id of SCENARIO_IDS) {
    const normal = marketCheck(id), limited = marketCheck(id, true);
    assert.equal(limited.indicators.neglected.denominator, 4);
    assert.equal(limited.indicators.neglected.unknown, normal.apps.length - 4);
    assert.equal(limited.indicators.neglected.status, "insufficient");
    assert.equal(limited.indicators.neglected.value, null);
    assert.equal(limited.indicators.neglected.numerator, null);
    assert.deepEqual(limited.indicators.neglected.supporting, []);
    for (const key of INDICATOR_KEYS.filter(key => key !== "neglected")) assert.deepEqual(limited.indicators[key], normal.indicators[key]);
    assert.deepEqual(marketCheck(id), normal, "interaction must not mutate the normal fixture");
  }
  assert.equal(marketCheck("budgets").indicators.pricing.status, "small_sample");
  assert.equal(marketCheck("focus").indicators.qualityGap.status, "low_coverage");
});

test("localized example exposes accessible controls, sources, limits and known/unknown values", () => {
  for (const locale of ["en", "tr"] as const) {
    const t = dictionaries[locale].market;
    const html = renderToStaticMarkup(createElement(MarketCheck, { text: t, locale }));
    for (const id of SCENARIO_IDS) assert.ok(html.includes(t.scenarios[id]));
    assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 2);
    assert.equal((html.match(/aria-pressed="false"/g) ?? []).length, 4);
    assert.match(html, /type="checkbox"[^>]*aria-controls="market-indicators"/);
    assert.match(html, /role="status" aria-live="polite" aria-atomic="true"/);
    assert.equal((html.match(/<details\b/g) ?? []).length, 6);
    assert.ok(html.includes(t.source)); assert.ok(html.includes(t.synthetic));
    assert.ok(html.includes(t.compare.unavailable));
    for (const key of INDICATOR_KEYS) assert.ok(html.includes(t.metrics[key].limit));
    for (const step of t.compare.steps) assert.ok(html.includes(step));
  }
  assert.deepEqual(landingAction(false), { href: "#market-check", kind: "example" });
  assert.deepEqual(landingAction(true), { href: "/dashboard", kind: "dashboard" });
});

test("public example calculation imports stay independent of catalog, server and provider modules", async () => {
  // This small client graph is intentionally restricted: server/catalog imports would expose or fetch protected data.
  for (const file of ["src/lib/landing/market-check-data.ts", "src/lib/intel/market.ts", "src/lib/read/field-freshness.ts"]) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /\bfetch\s*\(|\bDate\.now\s*\(|Math\.random\s*\(|server-only|supabase|apify|process\.env|from ["'][^"']*(?:catalog|repository|provider|database)/i, file);
  }
});
