import assert from "node:assert/strict";
import { test } from "node:test";
import { persistAppObservations } from "../src/lib/persistence/apps.ts";
import { persistDiscovery } from "../src/lib/persistence/discovery.ts";
import type { Rpc } from "../src/lib/persistence/rpc.ts";
import { normalizeItem, ObservationSchema } from "../src/poc/normalize.ts";
import { Job } from "../src/poc/plan.ts";

const time = "2026-01-01T00:00:00Z";
const options = { expiresAt: "2026-01-02T00:00:00Z" };

function chartRow(appId: string, rank: number, extra: Record<string, unknown> = {}) {
  const job = Job.parse({ id: "a".repeat(20), provider: "datatrail", store: "ios", country: "US", requestedLanguage: "en", round: 1,
    mode: "charts", context: "newFreeApps", expectedIds: [], maxResults: 10, maxChargeUsd: 0.05, input: { appleGenres: ["6007"] } });
  const result = normalizeItem({ store: "appStore", appId, title: "Synthetic", url: `https://apps.apple.com/us/app/id${appId}`,
    country: "us", source: "chart", chart: "new-free-apps", chartGenre: "6007", chartRank: rank, ...extra }, job, "Run1", time);
  assert.ok(result.kind === "valid", JSON.stringify(result));
  return ObservationSchema.parse(result.observation);
}

test("presentation metadata is optional and a bad value does not reject the row", () => {
  const good = chartRow("1", 1, { description: "Text", iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple/i.png", screenshots: ["https://play-lh.googleusercontent.com/s.png"] });
  assert.equal(good.iconUrl, "https://is1-ssl.mzstatic.com/image/thumb/Purple/i.png");
  assert.deepEqual(good.screenshotUrls, ["https://play-lh.googleusercontent.com/s.png"]);
  const bad = chartRow("1", 1, { iconUrl: "http://is1-ssl.mzstatic.com/i.png", screenshots: [] });
  assert.equal(bad.iconUrl, null);
  assert.equal(bad.screenshotUrls, null);
  const untrusted = chartRow("1", 1, { iconUrl: "https://evil.example/i.png", screenshots: ["https://evil.example/s.png"] });
  assert.equal(untrusted.iconUrl, null);
  assert.equal(untrusted.screenshotUrls, null);
  assert.equal(bad.fieldStatus.description, "missing");
  assert.equal(bad.idempotencyKey, good.idempotencyKey);
});

test("one run becomes one discovery snapshot; invalid input never reaches the database", async () => {
  const calls: Record<string, unknown>[] = [];
  const rpc: Rpc = async (_name, args) => { calls.push(args); return { inserted: 1, duplicates: 0, conflicts: 0 }; };
  await persistDiscovery(rpc, [chartRow("2", 2), chartRow("1", 1), chartRow("1", 3)], options);
  const [snapshot] = calls[0]!.p_snapshots as { kind: string; entries: { storeAppId: string; position: number }[] }[];
  assert.equal(snapshot!.kind, "new_apps");
  assert.deepEqual(snapshot!.entries.map(e => [e.storeAppId, e.position]), [["1", 1], ["2", 2]]);
  await assert.rejects(persistAppObservations(rpc, [{ ...chartRow("1", 1), schemaVersion: 1 }], options), /observation_contract_invalid/);
  await assert.rejects(persistAppObservations(rpc, [chartRow("1", 1)], { expiresAt: "" }), /expires_at_required/);
  assert.equal(calls.length, 1);
});
