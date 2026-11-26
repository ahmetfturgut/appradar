import assert from "node:assert/strict";
import { test } from "node:test";
import { ApifyClient } from "../src/poc/apify.js";
import { fixtureJob, fixtureRun } from "./fixtures.js";

test("başlatma asenkron, sabit build ve sunucu maliyet tavanıyla yapılır; token URL'de yoktur", async () => {
  let calls = 0;
  const client = new ApifyClient("synthetic-secret", async (url, init) => {
    calls++;
    const parsed = new URL(String(url));
    assert.ok(parsed.pathname.endsWith("/runs"));
    assert.equal(parsed.searchParams.get("build"), "0.1.1");
    assert.equal(parsed.searchParams.get("maxTotalChargeUsd"), "0.05");
    assert.equal(parsed.searchParams.get("restartOnError"), "false");
    assert.ok(!String(url).includes("synthetic-secret"));
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-secret");
    assert.equal(init?.redirect, "error");
    return Response.json({ data: fixtureRun() });
  });
  assert.equal((await client.start(fixtureJob())).id, "SyntheticRun001");
  assert.equal(calls, 1);
});

test("belirsiz POST veya 5xx ücretli isteği tekrarlamaz ve sırları hata çıktısına taşımaz", async () => {
  for (const networkFailure of [true, false]) {
    let calls = 0;
    const client = new ApifyClient("synthetic-secret", async () => {
      calls++;
      if (networkFailure) throw new Error("synthetic-secret");
      return new Response("synthetic-secret", { status: 503 });
    });
    await assert.rejects(client.start(fixtureJob()), error => error instanceof Error && !error.message.includes("synthetic-secret"));
    assert.equal(calls, 1);
  }
});

test("429 salt okunur istek sınırlı tekrar edilir", async () => {
  let calls = 0;
  const client = new ApifyClient("synthetic", async () => {
    calls++;
    return calls < 3 ? new Response(null, { status: 429, headers: { "retry-after": "0.001" } }) : Response.json({ data: fixtureRun() });
  });
  await client.getRun("SyntheticRun001", fixtureJob());
  assert.equal(calls, 3);
});

test("yanlış actor, build veya doğrulanmayan maliyet tavanı reddedilir", async () => {
  for (const overrides of [{ actId: "OtherActor" }, { buildNumber: "9.9.9" }, { buildId: "OtherBuild" }, { options: {} }, { options: { maxTotalChargeUsd: 50 } }]) {
    const client = new ApifyClient("synthetic", async () => Response.json({ data: fixtureRun(fixtureJob(), overrides) }));
    await assert.rejects(client.start(fixtureJob()));
  }
});

test("dataset sayfalaması ham hata satırlarını atmaz; sağlayıcı limit ihlali reddedilir", async () => {
  const client = new ApifyClient("synthetic", async url => {
    const parsed = new URL(String(url));
    assert.equal(parsed.searchParams.get("offset"), "50");
    assert.equal(parsed.searchParams.get("clean"), "false");
    return Response.json([{ status: "not-found" }]);
  });
  assert.equal((await client.readPage("Dataset1", 50)).length, 1);
  await assert.rejects(client.readPage("../unsafe", 50));
  const oversized = new ApifyClient("synthetic", async () => Response.json(Array.from({ length: 51 }, () => ({}))));
  await assert.rejects(oversized.readPage("Dataset1", 0), /dataset_page_limit_ignored/);
});
