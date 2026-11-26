import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildLiveApps, comparableHistory } from "../src/lib/live-catalog.js";
import { displayApp, displayStats, filterApps, formatPrice, parseFilters } from "../src/lib/demo-data.js";
import { getCatalog } from "../src/lib/catalog.server.js";
import { normalizeItem, type Observation } from "../src/poc/normalize.js";
import { PocJournal } from "../src/poc/journal.js";
import { fixtureJob, fixtureRow, fixtureRun, fixtureTime } from "./fixtures.js";

const now = Date.parse("2026-01-02T12:00:00.000Z");
function observation(overrides: Partial<Observation> = {}): Observation {
  const result = normalizeItem(fixtureRow({ ratingCount: 100, developerName: "Sentetik yayıncı" }), fixtureJob(), "SyntheticRun1", fixtureTime);
  if (result.kind !== "valid") throw new Error("fixture_invalid");
  return { ...result.observation, ...overrides };
}

test("gerçek TR/US değerleri ülke katsayısı uygulanmadan aynen korunur", () => {
  const values = [observation({ ratingValue: 4.17, ratingCount: 150, priceAmount: 12.34, currency: "EUR", isFree: false }), observation({ country: "US", name: "US adı", developerName: "US yayıncı", requestedLanguage: "en", ratingValue: 3.98, ratingCount: 240, priceAmount: 6.99, currency: "USD", isFree: false, idempotencyKey: "b".repeat(64) })];
  const apps = buildLiveApps(values, now);
  assert.equal(apps.length, 1);
  const app = apps[0]!;
  assert.equal(displayStats(app, "TR").rating, 4.17);
  assert.equal(displayStats(app, "US").rating, 3.98);
  assert.equal(displayStats(app, "US").ratings, 240);
  assert.equal(displayStats(app, "TR").currency, "EUR");
  assert.ok(formatPrice(app, "TR").includes("12,34"));
  assert.equal(displayApp(app, "US").name, "US adı");
  assert.equal(displayApp(app, "TR").developer, "Sentetik yayıncı");
});

test("olmayan ülke ve eksik fiyat ücretsiz veya sıfır sayılmaz", () => {
  const app = buildLiveApps([observation({ priceAmount: null, currency: null, isFree: null, ratingValue: null, ratingCount: null })], now)[0]!;
  assert.equal(displayStats(app, "US").rating, null);
  assert.equal(displayStats(app, "US").price, null);
  assert.equal(formatPrice(app, "TR"), "Veri yok");
  assert.equal(filterApps([app], parseFilters(new URLSearchParams("country=US"))).length, 0);
  assert.equal(filterApps([app], parseFilters(new URLSearchParams("price=paid"))).length, 0);
  assert.equal(filterApps([app], parseFilters(new URLSearchParams("price=free"))).length, 0);
});

test("geç tamamlanan eski kayıt güncel gözlemi ezmez; mağaza kimlikleri ayrıdır", () => {
  const old = observation({ ratingCount: 10 });
  const newer = observation({ ratingCount: 20, observedAt: "2026-01-02T00:00:00.000Z", collectedAt: "2026-01-02T00:00:00.000Z", idempotencyKey: "b".repeat(64) });
  const play = observation({ store: "play", idempotencyKey: "c".repeat(64) });
  const apps = buildLiveApps([newer, old, play, old], now);
  assert.equal(apps.length, 2);
  const ios = apps.find(app => app.store === "ios")!;
  assert.equal(displayStats(ios, "TR").ratings, 20);
  assert.equal(ios.live?.history.length, 2);
});

test("tek gerçek gözlemden sahte geçmiş üretilmez; farklı kaynak/dil/ülke seriye karışmaz", () => {
  const a = observation();
  const app = buildLiveApps([a], now)[0]!;
  assert.equal(comparableHistory(app, "TR", now).length, 1);
  const b = observation({ observedAt: "2026-01-02T00:00:00.000Z", collectedAt: "2026-01-02T00:00:00.000Z", idempotencyKey: "b".repeat(64) });
  const sameSource = buildLiveApps([a, b], now)[0]!;
  assert.equal(comparableHistory(sameSource, "TR", now).length, 2);
  assert.equal(comparableHistory(sameSource, "TR", now)[0]?.source, "subimpact");
  const aurelix = observation({ source: "aurelix", idempotencyKey: "c".repeat(64) });
  const otherLanguage = observation({ requestedLanguage: "en", idempotencyKey: "d".repeat(64) });
  const us = observation({ country: "US", idempotencyKey: "e".repeat(64) });
  const preferred = buildLiveApps([a, b, aurelix, otherLanguage, us], now)[0]!;
  assert.equal(preferred.live?.observations.TR?.source, "aurelix");
  assert.equal(comparableHistory(preferred, "TR", now).length, 1);
  assert.equal(comparableHistory(preferred, "TR", now)[0]?.source, "aurelix");
});

test("Subimpact keşif özeti Aurelix detayını ezmez; mükerrer anahtar tek kayıt kalır", () => {
  const detail = observation({ source: "aurelix", name: "Aurelix Detay", ratingCount: 500, version: "9.0.0", observationRole: "detail", observedAt: "2026-01-01T00:00:00.000Z", collectedAt: "2026-01-01T00:00:00.000Z", idempotencyKey: "a".repeat(64) });
  const discovery = observation({ source: "subimpact", name: "Keşif Özeti", ratingCount: 1, version: "1.0.0", rank: 3, rankContext: "Habit Tracker", observationRole: "discovery", observedAt: "2026-01-02T00:00:00.000Z", collectedAt: "2026-01-02T00:00:00.000Z", idempotencyKey: "b".repeat(64) });
  const duplicate = { ...discovery };
  const app = buildLiveApps([discovery, detail, duplicate], now)[0]!;
  assert.equal(app.live?.observations.TR?.source, "aurelix");
  assert.equal(app.live?.observations.TR?.name, "Aurelix Detay");
  assert.equal(app.live?.observations.TR?.version, "9.0.0");
  assert.equal(app.live?.history.length, 2);
  assert.equal(displayStats(app, "TR").ratings, 500);
});

test("DataTrail yeni-app keşfi daha yeni olsa bile Aurelix detayını ezmez", () => {
  const detail = observation({ source: "aurelix", name: "Detay", observationRole: "detail", version: "3.0.0", observedAt: "2026-01-01T00:00:00.000Z", collectedAt: "2026-01-01T00:00:00.000Z", idempotencyKey: "a".repeat(64) });
  const discovery = observation({ source: "datatrail", name: "Yeni Chart", observationRole: "discovery", rank: 1, rankContext: "newFreeApps", rankCategory: "6007", releasedAt: "2026-11-25T00:00:00.000Z", listingUpdatedAt: "2026-11-25T00:00:00.000Z", version: "0.1.0", observedAt: "2026-01-02T12:00:00.000Z", collectedAt: "2026-01-02T12:00:00.000Z", idempotencyKey: "d".repeat(64) });
  const app = buildLiveApps([detail, discovery], now)[0]!;
  assert.equal(app.live?.observations.TR?.source, "aurelix");
  assert.equal(app.live?.observations.TR?.name, "Detay");
  assert.equal(app.live?.observations.TR?.version, "3.0.0");
});

test("Aurelix geliştirici keşfi daha yeni olsa bile detay kaydını ezmez", () => {
  const detail = observation({ source: "aurelix", name: "Detay", observationRole: "detail", version: "3.0.0", observedAt: "2026-01-01T00:00:00.000Z", collectedAt: "2026-01-01T00:00:00.000Z", idempotencyKey: "a".repeat(64) });
  const portfolio = observation({ source: "aurelix", name: "Portföy", observationRole: "discovery", developerStoreId: "570060151", rankContext: "570060151", version: "9.9.9", observedAt: "2026-01-02T12:00:00.000Z", collectedAt: "2026-01-02T12:00:00.000Z", idempotencyKey: "b".repeat(64) });
  const app = buildLiveApps([portfolio, detail], now)[0]!;
  assert.equal(app.live?.observations.TR?.name, "Detay");
  assert.equal(app.live?.observations.TR?.version, "3.0.0");
  assert.equal(app.live?.history.length, 2);
});

test("yedi gün saklama penceresi dolan veriler katalogda gösterilmez", () => {
  assert.equal(buildLiveApps([observation()], Date.parse(fixtureTime) + 8 * 86400000).length, 0);
});

test("gerçek kaynak kategorileri normalize edilir ve URL filtresinde kabul edilir", () => {
  const app = buildLiveApps([observation({ category: "Verimlilik" })], now)[0]!;
  assert.equal(app.category, "Üretkenlik");
  const unknown = buildLiveApps([observation({ category: "Unmapped source category" })], now)[0]!;
  assert.equal(unknown.category, "Unmapped source category");
  const filters = parseFilters(new URLSearchParams("category=Unmapped+source+category"), [unknown.category]);
  assert.equal(filterApps([unknown], filters).length, 1);
});

test("gerçek veri başladıktan sonra eksik veya bozuk dosya demo sayılarına dönmez", async () => {
  const directory = await mkdtemp(join(tmpdir(), "appradar-live-test-"));
  try {
    assert.equal((await getCatalog(directory, now)).mode, "demo");
    await mkdir(join(directory, ".poc"));
    await writeFile(join(directory, ".poc", "local-scope.json"), "{}");
    assert.equal((await getCatalog(directory, now)).mode, "unavailable");
    await writeFile(join(directory, ".poc", "state.json"), "broken json");
    const broken = await getCatalog(directory, now);
    assert.equal(broken.mode, "unavailable");
    assert.deepEqual(broken.apps, []);
    assert.ok(broken.error);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("tamamlanmış doğrulanmış sonuçlar sunucu kataloğuna alınır; bilinmeyen maliyet null kalır", async () => {
  const directory = await mkdtemp(join(tmpdir(), "appradar-live-test-"));
  try {
    const journal = new PocJournal(join(directory, ".poc"));
    const job = fixtureJob();
    journal.state.entries[job.id] = { jobId: job.id, reservedUsd: 0.05, status: "complete", startedAt: fixtureTime, run: fixtureRun(job, { usageTotalUsd: null }), nextOffset: 1, results: { "0": { kind: "valid", observation: observation() } }, redactedSamples: [], ingestionTruncated: false, lastError: null };
    await journal.save();
    const catalog = await getCatalog(directory, now);
    assert.equal(catalog.mode, "live");
    assert.equal(catalog.apps.length, 1);
    assert.equal(catalog.observedUsageUsd, null);
    assert.equal(catalog.observationCount, 1);
    assert.equal((await getCatalog(directory, now + 8 * 86400000)).mode, "unavailable");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
