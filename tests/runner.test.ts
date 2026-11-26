import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal, redactedSample } from "../src/poc/journal.js";
import { collectJob, requireLiveSettings } from "../src/poc/runner.js";
import { fixtureJob, fixtureRow, fixtureRun } from "./fixtures.js";

async function temporaryJournal(work: (journal: PocJournal) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), "appradar-poc-test-"));
  try { await work(new PocJournal(directory)); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test("anahtar, açık toplama ayarı, kullanım dayanağı ve bütçe olmadan canlı çalışma kapalı", () => {
  const valid = { token: "synthetic", enabled: true, dataUseConfirmed: true, limitUsd: 5 };
  for (const changed of [{ token: "" }, { enabled: false }, { dataUseConfirmed: false }, { limitUsd: 0 }, { limitUsd: 5.01 }, { limitUsd: NaN }]) {
    assert.throws(() => requireLiveSettings({ ...valid, ...changed }), /live_poc_not_configured/);
  }
  assert.doesNotThrow(() => requireLiveSettings(valid));
});

test("bütçe POST'tan önce diske yazılır, tavan dolunca yeni POST başlamaz", async () => temporaryJournal(async journal => {
  let posts = 0;
  const client = new ApifyClient("synthetic", async (url, init) => {
    if (init?.method === "POST") {
      posts++;
      const disk = JSON.parse(await readFile(join(journal.directory, "state.json"), "utf8"));
      assert.equal(disk.entries[fixtureJob().id].reservedUsd, 0.05);
    }
    return String(url).includes("/datasets/") ? Response.json([]) : Response.json({ data: fixtureRun() });
  });
  await journal.exclusive(async () => {
    await collectJob(fixtureJob(), journal, client, { start: true, limitUsd: 0.05 });
    const next = fixtureJob({ context: "other" });
    await assert.rejects(collectJob(next, journal, client, { start: true, limitUsd: 0.05 }), /budget_exhausted/);
  });
  assert.equal(posts, 1);
}));

test("ikinci süreç aynı POC defterine eşzamanlı yazamaz", async () => temporaryJournal(async journal => {
  const another = new PocJournal(journal.directory);
  await journal.exclusive(async () => {
    await assert.rejects(another.exclusive(async () => undefined), /poc_locked/);
  });
  await another.exclusive(async () => undefined);
}));

test("belirsiz başlangıç rezervasyonu korunur ve yeniden ücretli çağrı yapılmaz", async () => temporaryJournal(async journal => {
  let calls = 0;
  const client = new ApifyClient("synthetic", async () => { calls++; throw new Error("network"); });
  await journal.exclusive(async () => {
    await assert.rejects(collectJob(fixtureJob(), journal, client, { start: true, limitUsd: 5 }), /start_result_unknown/);
  });
  const reopened = new PocJournal(journal.directory);
  await reopened.exclusive(async () => {
    assert.equal(reopened.state.entries[fixtureJob().id]?.reservedUsd, 0.05);
    await assert.rejects(collectJob(fixtureJob(), reopened, client, { start: true, limitUsd: 5 }), /attach_verified_run/);
    await assert.rejects(collectJob(fixtureJob({ context: "another" }), reopened, client, { start: true, limitUsd: 5 }), /unfinished_run/);
  });
  assert.equal(calls, 1);
}));

test("kesilen dataset alımı checkpoint'ten sürer; biten run tekrar okunmaz veya başlatılmaz", async () => temporaryJournal(async journal => {
  let posts = 0;
  let failSecondPage = true;
  const offsets: number[] = [];
  const client = new ApifyClient("synthetic", async (url, init) => {
    const parsed = new URL(String(url));
    if (init?.method === "POST") posts++;
    if (parsed.pathname.includes("/datasets/")) {
      const offset = Number(parsed.searchParams.get("offset"));
      offsets.push(offset);
      if (offset === 0) return Response.json(Array.from({ length: 50 }, () => ({ status: "not-found" })));
      if (failSecondPage) return new Response(null, { status: 400 });
      return Response.json([fixtureRow()]);
    }
    return Response.json({ data: fixtureRun() });
  });
  const job = fixtureJob();
  await journal.exclusive(async () => {
    await assert.rejects(collectJob(job, journal, client, { start: true, limitUsd: 5 }));
    assert.equal(journal.state.entries[job.id]?.nextOffset, 50);
  });
  failSecondPage = false;
  const reopened = new PocJournal(journal.directory);
  await reopened.exclusive(async () => {
    const result = await collectJob(job, reopened, client, { start: false, limitUsd: 5 });
    assert.equal(result.status, "complete");
    assert.equal(result.nextOffset, 51);
    assert.equal(Object.keys(result.results).length, 51);
    await collectJob(job, reopened, client, { start: true, limitUsd: 5 });
  });
  assert.equal(posts, 1);
  assert.deepEqual(offsets, [0, 50, 50]);
}));

test("ham örneklerde yorum yazarı, iletişim, açıklama ve bilinmeyen alanlar saklanmaz", () => {
  const raw = { ...fixtureRow(), reviewer_name: "Private", developerEmail: "private@example.com", description: "unneeded", token: "private", nested: { data: "private" } };
  const safe = redactedSample(raw);
  assert.ok(!JSON.stringify(safe).includes("private"));
  assert.ok(!("reviewer_name" in safe));
  const review = redactedSample({ type: "review", store: "google_play", app_id: "com.example", review_id: "r1", rating: 4, reviewer_name: "Private Person", text: "secret body", review_title: "Hi", date: "2026-01-01T00:00:00.000Z" });
  assert.ok(!JSON.stringify(review).includes("Private"));
  assert.ok(!("text" in review));
  assert.equal(review.has_text, true);
  const thewolves = redactedSample({ id: "1", appId: "6448311069", country: "US", date: "2024-02-18T19:48:09-07:00", score: 5, title: "Hi", text: "secret body", userName: "@Private Person", userUrl: "https://itunes.apple.com/us/reviews/id1", version: "1.0" });
  assert.ok(!JSON.stringify(thewolves).includes("Private"));
  assert.ok(!("text" in thewolves));
  assert.ok(!("userName" in thewolves));
  assert.equal(thewolves.has_text, true);
  assert.equal(thewolves.score, 5);
});
