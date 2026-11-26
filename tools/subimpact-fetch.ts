import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ApifyClient } from "../src/poc/apify.js";
import { PocJournal } from "../src/poc/journal.js";
import { Job, stableHash } from "../src/poc/plan.js";
import { collectJob } from "../src/poc/runner.js";

// Subimpact discovery-only subset: keyword search + Play charts. Caps: $0.05/run, $0.15 total.
const VALIDATION_CEILING_USD = 0.15;

function discoveryJobs(): Job[] {
  const jobs: Job[] = [];
  const add = (values: Omit<Job, "id" | "maxChargeUsd"> & { maxChargeUsd?: 0.05 }) => {
    const full = { maxChargeUsd: 0.05 as const, ...values };
    jobs.push(Job.parse({ ...full, id: stableHash(full).slice(0, 20) }));
  };
  add({
    provider: "subimpact", store: "ios", country: "US", requestedLanguage: "en", round: 1, mode: "search",
    context: "Habit Tracker", expectedIds: [], maxResults: 5,
    input: { mode: "search", store: "ios", searchTerms: ["Habit Tracker"], country: "us", language: "en", maxItems: 5, fullDetails: true, proxy: { useApifyProxy: false } },
  });
  add({
    provider: "subimpact", store: "play", country: "US", requestedLanguage: "en", round: 1, mode: "search",
    context: "Habit Tracker", expectedIds: [], maxResults: 5,
    input: { mode: "search", store: "play", searchTerms: ["Habit Tracker"], country: "us", language: "en", maxItems: 5, fullDetails: true, proxy: { useApifyProxy: false } },
  });
  add({
    provider: "subimpact", store: "play", country: "US", requestedLanguage: "en", round: 1, mode: "charts",
    context: "topFree", expectedIds: [], maxResults: 5,
    input: { mode: "charts", store: "play", country: "us", language: "en", chartCollection: "topFree", iosGenreId: "6007", playCategory: "PRODUCTIVITY", maxItems: 5, fullDetails: true, proxy: { useApifyProxy: false } },
  });
  return jobs;
}

async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--execute")) throw new Error("usage: data:subimpact [--execute]");
  const jobs = discoveryJobs();
  if (!args.includes("--execute")) {
    console.log(JSON.stringify({ mode: "preview", provider: "subimpact", jobs: jobs.map(j => ({ id: j.id, store: j.store, mode: j.mode, context: j.context, maxItems: j.input.maxItems })), maxReservedUsd: VALIDATION_CEILING_USD, note: "Gerçek çekim için --execute; sayfa açmak veri çekmez." }));
    return;
  }
  const token = process.env.APIFY_TOKEN?.trim() ?? "";
  if (!token) throw new Error("APIFY_TOKEN_missing");
  const limitUsd = Number(process.env.POC_LIMIT_USD);
  if (!Number.isFinite(limitUsd) || limitUsd <= 0 || limitUsd > 5) throw new Error("approved_POC_LIMIT_USD_required_max_5");
  const journal = new PocJournal(resolve(".poc"));
  const client = new ApifyClient(token);
  const fixtureDir = resolve("tests/fixtures");
  await mkdir(fixtureDir, { recursive: true, mode: 0o700 });
  await mkdir(journal.directory, { recursive: true, mode: 0o700 });
  await writeFile(resolve(journal.directory, "subimpact-scope.json"), JSON.stringify({
    recordedAt: new Date().toISOString(), scope: "subimpact-discovery-validation", provider: "subimpact",
    jobIds: jobs.map(j => j.id), maxReservedUsd: VALIDATION_CEILING_USD, retentionDays: 7,
    reviewedSource: "https://apify.com/subimpact/app-store-scraper",
    fields: "search/chart discovery: identity, rank context, price, ratings when present; no reviews or images",
  }, null, 2) + "\n", { mode: 0o600 });

  let spentUsd = 0;
  const summary: Record<string, unknown>[] = [];
  await journal.exclusive(async () => {
    for (const job of jobs) {
      if (spentUsd >= VALIDATION_CEILING_USD - 1e-9) throw new Error("subimpact_validation_budget_exhausted");
      const existing = journal.state.entries[job.id];
      if (existing?.status === "complete" && existing.run?.status === "SUCCEEDED") {
        const results = Object.values(existing.results);
        summary.push({ reused: true, store: job.store, mode: job.mode, context: job.context, jobId: job.id, valid: results.filter(r => r.kind === "valid").length, invalid: results.filter(r => r.kind === "invalid").length, sourceErrors: results.filter(r => r.kind === "source_error").length, observedUsageUsd: existing.run.usageTotalUsd ?? null });
        spentUsd += existing.run.usageTotalUsd ?? 0;
        continue;
      }
      let entry = await collectJob(job, journal, client, { start: true, limitUsd });
      const deadline = Date.now() + 240000;
      while (entry.status !== "complete" && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        entry = await collectJob(job, journal, client, { start: false, limitUsd });
      }
      const results = Object.values(entry.results);
      const usage = entry.run?.usageTotalUsd ?? 0;
      spentUsd += usage;
      const label = `${job.store}-${job.mode}-${job.context.replace(/\s+/g, "-").toLowerCase()}`;
      await writeFile(resolve(fixtureDir, `subimpact-${label}.json`), `${JSON.stringify({
        job: { id: job.id, provider: job.provider, store: job.store, country: job.country, mode: job.mode, context: job.context, input: job.input },
        run: entry.run ? { id: entry.run.id, status: entry.run.status, buildNumber: entry.run.buildNumber, usageTotalUsd: entry.run.usageTotalUsd } : null,
        redactedRows: results.map(r => r.kind === "valid" ? { kind: "valid", observation: { store: r.observation.store, storeAppId: r.observation.storeAppId, name: r.observation.name, country: r.observation.country, requestedLanguage: r.observation.requestedLanguage, rank: r.observation.rank, rankContext: r.observation.rankContext, rankCategory: r.observation.rankCategory, ratingValue: r.observation.ratingValue, ratingCount: r.observation.ratingCount, priceAmount: r.observation.priceAmount, currency: r.observation.currency, isFree: r.observation.isFree, category: r.observation.category, version: r.observation.version, source: r.observation.source } } : r),
        redactedSamples: entry.redactedSamples,
      }, null, 2)}\n`, { mode: 0o600 });
      summary.push({ reused: false, store: job.store, mode: job.mode, context: job.context, jobId: job.id, runId: entry.run?.id ?? null, status: entry.status, actorStatus: entry.run?.status ?? null, valid: results.filter(r => r.kind === "valid").length, invalid: results.filter(r => r.kind === "invalid").length, sourceErrors: results.filter(r => r.kind === "source_error").length, observedUsageUsd: entry.run?.usageTotalUsd ?? null, spentUsd });
      if (entry.status !== "complete" || entry.run?.status !== "SUCCEEDED" || entry.ingestionTruncated || results.some(r => r.kind === "invalid") || results.every(r => r.kind !== "valid")) {
        throw new Error(`subimpact_validation_failed:${job.store}/${job.mode}/${job.context}`);
      }
      if (spentUsd > VALIDATION_CEILING_USD + 1e-9) throw new Error("subimpact_validation_budget_exceeded");
    }
  });
  console.log(JSON.stringify({ provider: "subimpact", spentUsd, ceilingUsd: VALIDATION_CEILING_USD, jobs: summary }, null, 2));
}

try { await main(); }
catch (error) {
  console.error(error instanceof Error && !error.message.startsWith("[") ? error.message : "subimpact_collection_validation_failed");
  process.exitCode = 1;
}
