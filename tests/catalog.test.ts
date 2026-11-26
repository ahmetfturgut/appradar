import assert from "node:assert/strict";
import { test } from "node:test";
import { demoApps, displayStats, filterApps, formatPrice, parseFilters } from "../src/lib/demo-data.js";

test("Türkçe kategori araması aksansız yazımla da çalışır", () => {
  const results = filterApps(demoApps, { ...parseFilters(new URLSearchParams()), query: "saglik" });
  assert.ok(results.length > 0);
  assert.ok(results.every(app => app.category === "Sağlık ve fitness"));
});
test("eksik puan ve değerlendirme sıralamada sona gider; veri sıfıra çevrilmez", () => {
  for (const sort of ["rating", "ratings"] as const) {
    const results = filterApps(demoApps, { ...parseFilters(new URLSearchParams()), sort });
    assert.equal(results.at(-1)?.rating, null);
    assert.equal(displayStats(results.at(-1)!, "TR").ratings, null);
  }
});
test("mağaza, kategori ve fiyat filtreleri birlikte uygulanır", () => {
  const results = filterApps(demoApps, parseFilters(new URLSearchParams("store=ios&category=Üretkenlik&price=paid")));
  assert.equal(results.length, 1);
  assert.equal(results[0]?.name, "Focus Forest");
  assert.equal(results[0]?.store, "ios");
});
test("tanımsız URL filtreleri güvenli varsayılana döner ve arama sınırlanır", () => {
  const result = parseFilters(new URLSearchParams({ country: "XX", store: "unknown", sort: "script", category: "invalid", price: "invalid", q: "x".repeat(200) }));
  assert.equal(result.country, "TR");
  assert.equal(result.store, "all");
  assert.equal(result.category, "all");
  assert.equal(result.price, "all");
  assert.equal(result.sort, "rating");
  assert.equal(result.query.length, 100);
});
test("fiyat ülkenin doğru para birimi ve tutarıyla gösterilir", () => {
  const paid = demoApps.find(app => !app.free)!;
  assert.equal(displayStats(paid, "TR").currency, "TRY");
  assert.equal(displayStats(paid, "US").currency, "USD");
  assert.equal(displayStats(paid, "US").price, paid.price.US);
  assert.ok(formatPrice(paid, "TR").includes("129,99"));
  assert.ok(formatPrice(paid, "US").includes("3,99"));
});
test("filtreleme kaynak katalog sırasını değiştirmez; eşleşmeyen arama boş sonuç verir", () => {
  const original = demoApps.map(app => app.id);
  filterApps(demoApps, { ...parseFilters(new URLSearchParams()), sort: "name" });
  assert.deepEqual(demoApps.map(app => app.id), original);
  assert.equal(filterApps(demoApps, { ...parseFilters(new URLSearchParams()), query: "bulunmayan-ornek-123" }).length, 0);
});
