import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { z } from "zod";
import { createPlan, planSummary, sources, stableHash } from "../src/poc/plan.js";

test("POC matrisi iki turda 160 detay gözlemi ve onaylı tavan içinde 76 iş içerir", () => {
  const jobs = createPlan();
  assert.equal(new Set(jobs.map(j => j.id)).size, 76);
  assert.equal(planSummary(jobs).detailObservations, 160);
  assert.equal(planSummary(jobs).reservedCeilingUsd, 3.8);
  assert.equal(jobs.filter(j => j.mode === "negative").length, 8);
  assert.ok(jobs.every(j => !Object.keys(j.input).some(k => /token|webhook/i.test(k))));
  assert.deepEqual(jobs, createPlan());
});

test("Aurelix desteklemediği arama ve Google Play listesi için kullanılmaz", () => {
  assert.equal(createPlan().filter(j => j.provider === "aurelix" && (j.mode === "search" || (j.mode === "charts" && j.store === "play"))).length, 0);
});

test("plan girdileri indirilmiş gerçek OpenAPI şemasındaki alan/tip/sınırlarla uyumlu", async () => {
  const schemaCheck = z.object({ type: z.string(), enum: z.array(z.unknown()).optional(), minimum: z.number().optional(), maximum: z.number().optional(), maxItems: z.number().optional(), pattern: z.string().optional() });
  const contract = z.object({ actorId: z.string(), openapi: z.object({ info: z.object({ "x-build-id": z.string() }), components: z.object({ schemas: z.object({ inputSchema: z.object({ properties: z.record(z.string(), z.unknown()) }) }) }) }), taggedBuilds: z.object({ latest: z.object({ buildId: z.string(), buildNumber: z.string() }) }) });
  for (const provider of ["subimpact", "aurelix"] as const) {
    const snapshot = contract.parse(JSON.parse(await readFile(new URL(`../docs/contracts/${provider}.json`, import.meta.url), "utf8")));
    assert.equal(snapshot.actorId, sources[provider].actorId);
    assert.equal(snapshot.taggedBuilds.latest.buildNumber, sources[provider].build);
    assert.equal(snapshot.taggedBuilds.latest.buildId, sources[provider].buildId);
    assert.equal(snapshot.openapi.info["x-build-id"], snapshot.taggedBuilds.latest.buildId);
    for (const job of createPlan().filter(j => j.provider === provider)) {
      for (const [key, value] of Object.entries(job.input)) {
        const spec = schemaCheck.parse(snapshot.openapi.components.schemas.inputSchema.properties[key]);
        assert.equal(Array.isArray(value) ? "array" : typeof value, spec.type === "integer" ? "number" : spec.type, key);
        if (spec.enum) assert.ok(spec.enum.includes(value), key);
        if (typeof value === "number") {
          if (spec.minimum != null) assert.ok(value >= spec.minimum, key);
          if (spec.maximum != null) assert.ok(value <= spec.maximum, key);
        }
        if (Array.isArray(value) && spec.maxItems != null) assert.ok(value.length <= spec.maxItems, key);
        if (typeof value === "string" && spec.pattern) assert.ok(new RegExp(spec.pattern).test(value), key);
      }
    }
  }
  const thewolves = contract.parse(JSON.parse(await readFile(new URL("../docs/contracts/thewolves.json", import.meta.url), "utf8")));
  assert.equal(thewolves.actorId, sources.thewolves.actorId);
  assert.equal(thewolves.taggedBuilds.latest.buildNumber, sources.thewolves.build);
  assert.equal(thewolves.taggedBuilds.latest.buildId, sources.thewolves.buildId);
  assert.equal(createPlan().filter(j => j.provider === "thewolves").length, 0);
  const reviewsInput = { appIds: ["6448311069"], country: "us", maxItems: 10 };
  for (const [key, value] of Object.entries(reviewsInput)) {
    const spec = schemaCheck.parse(thewolves.openapi.components.schemas.inputSchema.properties[key]);
    assert.equal(Array.isArray(value) ? "array" : typeof value, spec.type === "integer" ? "number" : spec.type, key);
    if (spec.enum) assert.ok(spec.enum.includes(value), key);
  }
  const playReviews = contract.parse(JSON.parse(await readFile(new URL("../docs/contracts/aurelix-play-reviews.json", import.meta.url), "utf8")));
  assert.equal(playReviews.actorId, sources.aurelixplayreviews.actorId);
  assert.equal(playReviews.taggedBuilds.latest.buildNumber, sources.aurelixplayreviews.build);
  assert.equal(playReviews.taggedBuilds.latest.buildId, sources.aurelixplayreviews.buildId);
  assert.equal(createPlan().filter(j => j.provider === "aurelixplayreviews").length, 0);
  const playInput = { apps: ["com.openai.chatgpt"], maxReviewsPerApp: 100, sort: "newest", stars: "", language: "en", countries: ["us"], onlyNewReviews: false };
  for (const [key, value] of Object.entries(playInput)) {
    const spec = schemaCheck.parse(playReviews.openapi.components.schemas.inputSchema.properties[key]);
    assert.equal(Array.isArray(value) ? "array" : typeof value, spec.type === "integer" ? "number" : spec.type, key);
    if (spec.enum) assert.ok(spec.enum.includes(value), key);
  }
  const datatrail = contract.parse(JSON.parse(await readFile(new URL("../docs/contracts/datatrail.json", import.meta.url), "utf8")));
  assert.equal(datatrail.actorId, sources.datatrail.actorId);
  assert.equal(datatrail.taggedBuilds.latest.buildNumber, sources.datatrail.build);
  assert.equal(datatrail.taggedBuilds.latest.buildId, sources.datatrail.buildId);
  assert.equal(createPlan().filter(j => j.provider === "datatrail").length, 0);
  const chartItems = z.object({ items: z.object({ enum: z.array(z.string()) }) }).parse(datatrail.openapi.components.schemas.inputSchema.properties.appleCharts);
  assert.ok(chartItems.items.enum.includes("new-free-apps"));
  assert.ok(chartItems.items.enum.includes("new-apps"));
  assert.ok(chartItems.items.enum.includes("new-paid-apps"));
  const playChartItems = z.object({ items: z.object({ enum: z.array(z.string()) }) }).parse(datatrail.openapi.components.schemas.inputSchema.properties.playCharts);
  assert.deepEqual(playChartItems.items.enum, ["top-free", "top-paid", "top-grossing"]);
  const asokeyword = contract.parse(JSON.parse(await readFile(new URL("../docs/contracts/asokeyword.json", import.meta.url), "utf8")));
  assert.equal(asokeyword.actorId, sources.asokeyword.actorId);
  assert.equal(asokeyword.taggedBuilds.latest.buildNumber, sources.asokeyword.build);
  assert.equal(asokeyword.taggedBuilds.latest.buildId, sources.asokeyword.buildId);
  assert.equal(createPlan().filter(j => j.provider === "asokeyword").length, 0);
  const keywordInput = { keywords: ["habit tracker"], store: "ios", country: "us", appIds: [], topN: 10, includeSuggestions: false, includePopularity: true };
  for (const [key, value] of Object.entries(keywordInput)) {
    const spec = schemaCheck.parse(asokeyword.openapi.components.schemas.inputSchema.properties[key]);
    assert.equal(Array.isArray(value) ? "array" : typeof value, spec.type === "integer" ? "number" : spec.type, key);
    if (spec.enum) assert.ok(spec.enum.includes(value), key);
  }
});

test("hash nesne alan sırasından etkilenmez, dizi sırasını korur", () => {
  assert.equal(stableHash({ a: 1, b: { x: 2, y: 3 } }), stableHash({ b: { y: 3, x: 2 }, a: 1 }));
  assert.notEqual(stableHash([1, 2]), stableHash([2, 1]));
});
