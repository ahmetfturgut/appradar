import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { Job, stableHash } from "../src/poc/plan.js";
import { collectJob } from "../src/poc/runner.js";
import { assertDevelopmentEnvironment } from "../src/lib/collection/target.js";

// ASO Keyword Intel validation. Caps: $0.05/run, $0.10 total.
// Cheapest meaningful mode: iOS rankings topN=10 + popularity/difficulty (no suggestions).
const VALIDATION_CEILING_USD = 0.10;
const FIXTURE = "tests/fixtures/asokeyword-ios-habit-tracker.json";
const SCOPE = "asokeyword-scope.json";
const KEYWORD = "habit tracker";

function keywordJob(): Job {
  const values = {
    provider: "asokeyword" as const, store: "ios" as const, country: "US" as const, requestedLanguage: "en",
    round: 1 as const, mode: "keywords" as const, context: KEYWORD, expectedIds: [] as string[], maxResults: 20,
    maxChargeUsd: 0.05 as const,
    input: {
      keywords: [KEYWORD], store: "ios", country: "us", appIds: [], topN: 10,
      includeSuggestions: false, includePopularity: true,
    },
  };
  return Job.parse({ ...values, id: stableHash(values).slice(0, 20) });
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute")) throw new Error("usage: data:asokeyword [--execute]");
  const job = keywordJob();
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({ mode: "preview", provider: "asokeyword", jobs: [{ id: job.id, store: job.store, mode: job.mode, context: job.context, topN: job.input.topN, includePopularity: job.input.includePopularity }], maxReservedUsd: VALIDATION_CEILING_USD, note: "Gerçek çekim için --execute; başarılı canlı koşu fixture ile yeniden kullanılabilir." }));
    return;
  }
  const journal = new PocJournal(resolve(".poc"));
  await mkdir(journal.directory, { recursive: true, mode: 0o700 });
  const scopePath = resolve(journal.directory, SCOPE);
  if (existsSync(scopePath) && existsSync(FIXTURE)) {
    const scope = JSON.parse(await readFile(scopePath, "utf8")) as { completedRunId?: string; observedUsageUsd?: number };
    const fixture = JSON.parse(await readFile(FIXTURE, "utf8")) as { redactedRows: unknown[]; run: { usageTotalUsd?: number } };
    console.log(JSON.stringify({
      provider: "asokeyword", reused: true, jobId: job.id, completedRunId: scope.completedRunId ?? null,
      rows: fixture.redactedRows.length, observedUsageUsd: scope.observedUsageUsd ?? fixture.run.usageTotalUsd ?? null,
      note: "Prior successful live validation reused; no new paid run.",
    }, null, 2));
    return;
  }
  // Paid path: refused unless this shell is the declared development project.
  assertDevelopmentEnvironment(process.env);
  const token = process.env.APIFY_TOKEN?.trim() ?? "";
  if (!token) throw new Error("APIFY_TOKEN_missing");
  const limitUsd = Number(process.env.POC_LIMIT_USD);
  if (!Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 5) throw new Error("approved_POC_LIMIT_USD_required_max_5");
  const client = new ApifyClient(token);
  await mkdir(resolve("tests/fixtures"), { recursive: true, mode: 0o700 });
  let spentUsd = 0;
  await journal.exclusive(async () => {
    if (spentUsd >= VALIDATION_CEILING_USD - 1e-9) throw new Error("asokeyword_validation_budget_exhausted");
    let entry = await collectJob(job, journal, client, { start: true, limitUsd });
    const deadline = Date.now() + 300000;
    while (entry.status !== "complete" && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 2500));
      entry = await collectJob(job, journal, client, { start: false, limitUsd });
    }
    for (let i = 0; i < 6 && entry.run && (entry.run.usageTotalUsd == null || entry.run.usageTotalUsd === 0); i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      entry.run = await client.getRun(entry.run.id, job);
      await journal.save();
    }
    const results = Object.values(entry.results);
    const keywords = results.filter(r => r.kind === "valid_keyword");
    spentUsd += entry.run?.usageTotalUsd ?? 0;
    await writeFile(resolve(FIXTURE), `${JSON.stringify({
      job: { id: job.id, provider: job.provider, store: job.store, country: job.country, mode: job.mode, context: job.context, input: job.input },
      run: entry.run ? { id: entry.run.id, status: entry.run.status, buildNumber: entry.run.buildNumber, usageTotalUsd: entry.run.usageTotalUsd, chargedEventCounts: entry.run.chargedEventCounts } : null,
      stats: {
        rankingRows: keywords.filter(r => r.kind === "valid_keyword" && r.keyword.rowType === "ranking").length,
        metricsRows: keywords.filter(r => r.kind === "valid_keyword" && r.keyword.rowType === "metrics").length,
        suggestionRows: keywords.filter(r => r.kind === "valid_keyword" && r.keyword.rowType === "suggestion").length,
        note: "popularity is Apple Search Popularity score 5-100, not monthly search volume",
      },
      redactedRows: results.map(r => {
        if (r.kind !== "valid_keyword") return r;
        const k = r.keyword;
        return { kind: "valid_keyword", keyword: { rowType: k.rowType, keyword: k.keyword, store: k.store, country: k.country, requestedLanguage: k.requestedLanguage, language: k.language, checkedAt: k.checkedAt, rank: k.rank, storeAppId: k.storeAppId, appName: k.appName, developerName: k.developerName, ratingValue: k.ratingValue, suggestion: k.suggestion, popularity: k.popularity, popularityProxy: k.popularityProxy, popularitySource: k.popularitySource, difficulty: k.difficulty, measuredAt: k.measuredAt, stale: k.stale, metricsError: k.metricsError, source: k.source, idempotencyKey: k.idempotencyKey, fieldStatus: k.fieldStatus } };
      }),
      redactedSamples: entry.redactedSamples,
    }, null, 2)}\n`, { mode: 0o600 });
    await writeFile(scopePath, `${JSON.stringify({
      recordedAt: new Date().toISOString(), scope: "asokeyword-validation", provider: "asokeyword",
      jobIds: [job.id], completedRunId: entry.run?.id ?? null, maxReservedUsd: VALIDATION_CEILING_USD,
      observedUsageUsd: entry.run?.usageTotalUsd ?? null, retentionDays: 7,
      reviewedSource: "https://apify.com/petersutarik/aso-keyword-intel",
    }, null, 2)}\n`, { mode: 0o600 });
    if (entry.status !== "complete" || entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || results.some(r => r.kind === "invalid") || keywords.length === 0) {
      throw new Error("asokeyword_validation_failed");
    }
    if (spentUsd > VALIDATION_CEILING_USD + 1e-9) throw new Error("asokeyword_validation_budget_exceeded");
    console.log(JSON.stringify({ provider: "asokeyword", reused: false, spentUsd, rows: keywords.length, runId: entry.run?.id ?? null }, null, 2));
  });
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "asokeyword_collection_validation_failed");
  process.exitCode = 1;
}
